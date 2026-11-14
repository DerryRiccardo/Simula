package admin

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

const (
	msgReviewNotFound    = "Penilaian tidak ditemukan."
	msgCannotRegrade     = "Hanya AI case yang belum lulus bisa dinilai ulang. Hasil yang lulus sudah menerbitkan sertifikat."
	msgGradingDisabled   = "Penilaian AI sedang nonaktif."
	msgReminderCooldown  = "Pengingat sudah dikirim dalam 24 jam terakhir."
	msgReassignNotOption = "Reviewer tidak tersedia untuk case ini."
	msgNotPending        = "Submission ini sudah tidak menunggu review."
)

var msgFlagNote = fmt.Sprintf("Tulis minimal %d karakter.", entity.FlagNoteMinRunes)

// CaseGradingStat adalah ringkasan per AI case (IAdminCaseGradingStat di client).
type CaseGradingStat struct {
	CaseID       string
	CaseTitle    string
	GradedCount  int
	PassedCount  int
	AverageScore *int
	FlaggedCount int
}

// ReviewList adalah isi menu Penilaian.
type ReviewList struct {
	Rows        []entity.AdminReviewRow
	AICaseStats []CaseGradingStat
}

// ReassignOption adalah pilihan di dialog Ganti reviewer.
type ReassignOption struct {
	ID               string
	Name             string
	JobTitle         string
	PendingCount     int
	IsAssignedToCase bool
}

// ReviewDetail adalah halaman detail penilaian.
type ReviewDetail struct {
	Row             entity.AdminReviewRow
	Case            entity.Case
	LastRevision    *entity.RevisionRequest
	Events          []entity.StatusEvent
	DownloadURLs    map[string]string
	ReassignOptions []ReassignOption
	CanRemind       bool
}

// ReviewUseCase melayani menu Penilaian.
type ReviewUseCase interface {
	ListReviews(ctx context.Context) (ReviewList, error)
	GetReview(ctx context.Context, enrollmentID string) (ReviewDetail, error)
	Regrade(ctx context.Context, enrollmentID string) (ReviewDetail, error)
	SetFlag(ctx context.Context, enrollmentID string, isFlagged bool, note string) (ReviewDetail, error)
	RemindReviewer(ctx context.Context, enrollmentID string) (ReviewDetail, error)
	ReassignReviewer(ctx context.Context, enrollmentID, reviewerID string) (ReviewDetail, error)
}

// ReviewDeps adalah dependency use case Penilaian.
type ReviewDeps struct {
	Reviews     coreRepo.AdminReviewRepository
	Partners    coreRepo.AdminPartnerRepository
	Cases       coreRepo.CaseRepository
	Submissions coreRepo.SubmissionRepository
	Files       coreRepo.FileRepository
	Storage     coreRepo.Storage
	// GradingQueue nil berarti penilaian AI nonaktif, jadi Nilai ulang ditolak.
	GradingQueue coreRepo.GradingQueue
	GradingModel string
	Now          func() time.Time
}

type reviewUseCase struct {
	ReviewDeps
}

// InitReviewUseCase membuat use case Penilaian.
func InitReviewUseCase(deps ReviewDeps) ReviewUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &reviewUseCase{ReviewDeps: deps}
}

func (uc *reviewUseCase) ListReviews(ctx context.Context) (ReviewList, error) {
	rows, err := uc.Reviews.ListRows(ctx, entity.AdminReviewListLimit)
	if err != nil {
		return ReviewList{}, apperror.Internal(err)
	}
	sort.SliceStable(rows, func(i, j int) bool { return SubmittedAt(rows[i]).After(SubmittedAt(rows[j])) })
	return ReviewList{Rows: rows, AICaseStats: aiCaseStats(rows)}, nil
}

func (uc *reviewUseCase) GetReview(ctx context.Context, enrollmentID string) (ReviewDetail, error) {
	row, err := uc.loadRow(ctx, enrollmentID)
	if err != nil {
		return ReviewDetail{}, err
	}
	return uc.buildDetail(ctx, row)
}

func (uc *reviewUseCase) Regrade(ctx context.Context, enrollmentID string) (ReviewDetail, error) {
	row, err := uc.loadRow(ctx, enrollmentID)
	if err != nil {
		return ReviewDetail{}, err
	}
	if !row.CanRegrade() {
		return ReviewDetail{}, apperror.Conflict(msgCannotRegrade)
	}
	if uc.GradingQueue == nil {
		return ReviewDetail{}, apperror.Conflict(msgGradingDisabled)
	}
	count, err := uc.Cases.CountRubricCriteria(ctx, row.Enrollment.CaseID)
	if err != nil {
		return ReviewDetail{}, apperror.Internal(err)
	}
	if count == 0 {
		return ReviewDetail{}, apperror.Internal(fmt.Errorf("case %s has no rubric criteria", row.Enrollment.CaseID))
	}
	criterionIDs := make([]string, 0, count)
	for range count {
		criterionIDs = append(criterionIDs, uuid.NewString())
	}
	now := uc.Now()
	run := entity.NewAIGradingRun(uuid.NewString(), row.Submission.ID, uc.GradingModel, criterionIDs, now)
	err = uc.Reviews.Regrade(ctx, row.Enrollment.ID, row.Submission.ID, &run, now)
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return ReviewDetail{}, apperror.Conflict(msgCannotRegrade)
	}
	if err != nil {
		return ReviewDetail{}, apperror.Internal(err)
	}
	if err := uc.GradingQueue.EnqueueCriterion(ctx, run.ID, 1); err != nil {
		// Run sudah tersimpan; task grading:resume_stalled melanjutkannya.
		log.Warn().Err(err).Str("run_id", run.ID).Msg("failed to enqueue regrade")
	}
	return uc.GetReview(ctx, row.Enrollment.ID)
}

func (uc *reviewUseCase) SetFlag(ctx context.Context, enrollmentID string, isFlagged bool, note string) (ReviewDetail, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return ReviewDetail{}, apperror.Unauthenticated("")
	}
	row, err := uc.loadRow(ctx, enrollmentID)
	if err != nil {
		return ReviewDetail{}, err
	}
	if !isFlagged {
		err = uc.Reviews.ClearFlag(ctx, row.Enrollment.ID)
	} else {
		note = strings.TrimSpace(note)
		length := utf8.RuneCountInString(note)
		if length < entity.FlagNoteMinRunes || length > entity.FlagNoteMaxRunes {
			return ReviewDetail{}, apperror.Validation(apperror.FieldError{Field: "note", Message: msgFlagNote})
		}
		err = uc.Reviews.SetFlag(ctx, entity.ReviewFlag{
			EnrollmentID: row.Enrollment.ID, Note: note, FlaggedBy: current.ID, FlaggedAt: uc.Now(),
		})
	}
	if err != nil {
		return ReviewDetail{}, apperror.Internal(err)
	}
	return uc.GetReview(ctx, row.Enrollment.ID)
}

func (uc *reviewUseCase) RemindReviewer(ctx context.Context, enrollmentID string) (ReviewDetail, error) {
	row, err := uc.loadRow(ctx, enrollmentID)
	if err != nil {
		return ReviewDetail{}, err
	}
	now := uc.Now()
	if !row.CanRemind(now) {
		return ReviewDetail{}, apperror.Conflict(msgReminderCooldown)
	}
	err = uc.Reviews.MarkReminded(ctx, row.Enrollment.ID, now)
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return ReviewDetail{}, apperror.Conflict(msgReminderCooldown)
	}
	if err != nil {
		return ReviewDetail{}, apperror.Internal(err)
	}
	// Email dan notifikasi in-app ke reviewer menyusul bersama integrasi Resend.
	log.Info().Str("enrollment_id", row.Enrollment.ID).Str("reviewer_id", row.Holder.ID).Msg("reviewer reminded")
	return uc.GetReview(ctx, row.Enrollment.ID)
}

func (uc *reviewUseCase) ReassignReviewer(ctx context.Context, enrollmentID, reviewerID string) (ReviewDetail, error) {
	row, err := uc.loadRow(ctx, enrollmentID)
	if err != nil {
		return ReviewDetail{}, err
	}
	options, err := uc.reassignOptions(ctx, row)
	if err != nil {
		return ReviewDetail{}, err
	}
	if !slices.ContainsFunc(options, func(o ReassignOption) bool { return o.ID == reviewerID }) {
		return ReviewDetail{}, apperror.Validation(apperror.FieldError{Field: "reviewerId", Message: msgReassignNotOption})
	}
	err = uc.Reviews.Reassign(ctx, row.Enrollment.ID, row.Enrollment.CaseID, reviewerID, uc.Now())
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return ReviewDetail{}, apperror.Conflict(msgNotPending)
	}
	if err != nil {
		return ReviewDetail{}, apperror.Internal(err)
	}
	return uc.GetReview(ctx, row.Enrollment.ID)
}

func (uc *reviewUseCase) loadRow(ctx context.Context, enrollmentID string) (entity.AdminReviewRow, error) {
	if _, err := uuid.Parse(enrollmentID); err != nil {
		return entity.AdminReviewRow{}, apperror.NotFound(msgReviewNotFound)
	}
	row, err := uc.Reviews.GetRow(ctx, enrollmentID)
	if errors.Is(err, coreErrors.ErrEnrollmentNotFound) {
		return entity.AdminReviewRow{}, apperror.NotFound(msgReviewNotFound)
	}
	if err != nil {
		return entity.AdminReviewRow{}, apperror.Internal(err)
	}
	return row, nil
}

func (uc *reviewUseCase) buildDetail(ctx context.Context, row entity.AdminReviewRow) (ReviewDetail, error) {
	c, err := uc.Cases.GetWithBriefByID(ctx, row.Enrollment.CaseID)
	if err != nil {
		return ReviewDetail{}, apperror.Internal(err)
	}
	submissions, err := uc.Submissions.ListByEnrollment(ctx, row.Enrollment.ID)
	if err != nil {
		return ReviewDetail{}, apperror.Internal(err)
	}
	options, err := uc.reassignOptions(ctx, row)
	if err != nil {
		return ReviewDetail{}, err
	}
	detail := ReviewDetail{
		Row:             row,
		Case:            c,
		LastRevision:    lastRevision(submissions),
		Events:          entity.BuildStatusEvents(row.Enrollment, submissions),
		DownloadURLs:    map[string]string{},
		ReassignOptions: options,
		CanRemind:       row.CanRemind(uc.Now()),
	}
	if row.Submission != nil {
		detail.DownloadURLs = uc.downloadURLs(ctx, row.Enrollment.UserID, row.Submission.SlotValues)
	}
	return detail, nil
}

// reassignOptions: reviewer aktif dari mitra pemilik case selain pemegang sekarang, urut antrean
// paling sedikit. Hanya untuk B2B yang menunggu review.
func (uc *reviewUseCase) reassignOptions(ctx context.Context, row entity.AdminReviewRow) ([]ReassignOption, error) {
	options := []ReassignOption{}
	c := row.Enrollment.Case
	if c == nil || c.Tier != entity.TierB2B || c.PartnerID == nil || row.Enrollment.Status != entity.EnrollmentInReview {
		return options, nil
	}
	reviewers, err := uc.Partners.ListReviewers(ctx)
	if err != nil {
		return nil, apperror.Internal(err)
	}
	for _, reviewer := range reviewers {
		if !reviewer.IsActive || reviewer.PartnerID != *c.PartnerID || (row.Holder != nil && reviewer.ID == row.Holder.ID) {
			continue
		}
		options = append(options, ReassignOption{
			ID: reviewer.ID, Name: reviewer.Name, JobTitle: reviewer.JobTitle,
			PendingCount: reviewer.PendingCount, IsAssignedToCase: slices.Contains(reviewer.CaseIDs, c.ID),
		})
	}
	sort.SliceStable(options, func(i, j int) bool {
		if options[i].PendingCount != options[j].PendingCount {
			return options[i].PendingCount < options[j].PendingCount
		}
		return options[i].Name < options[j].Name
	})
	return options, nil
}

func (uc *reviewUseCase) downloadURLs(ctx context.Context, ownerID string, values entity.SlotValues) map[string]string {
	urls := map[string]string{}
	ids := values.FileIDs()
	if len(ids) == 0 {
		return urls
	}
	files, err := uc.Files.ListByIDs(ctx, ownerID, ids)
	if err != nil {
		log.Warn().Err(err).Msg("failed to load submission files for admin")
		return urls
	}
	for _, file := range files {
		url, err := uc.Storage.PresignDownload(ctx, file.ObjectKey, file.FileName, entity.ReviewDownloadTTL)
		if err != nil {
			log.Warn().Err(err).Str("file_id", file.ID).Msg("failed to presign submission download")
			continue
		}
		urls[file.ID] = url
	}
	return urls
}

// SubmittedAt adalah waktu submit percobaan terakhir, atau waktu update enrollment bila belum ada.
func SubmittedAt(row entity.AdminReviewRow) time.Time {
	if row.Submission != nil && row.Submission.SubmittedAt != nil {
		return *row.Submission.SubmittedAt
	}
	return row.Enrollment.UpdatedAt
}

func lastRevision(submissions []entity.Submission) *entity.RevisionRequest {
	var latest *entity.RevisionRequest
	for i := range submissions {
		request := submissions[i].RevisionRequest
		if request != nil && (latest == nil || request.CreatedAt.After(latest.CreatedAt)) {
			latest = request
		}
	}
	return latest
}

// aiCaseStats meringkas AI case yang sudah dinilai: bahan mengecek apakah case atau rubriknya
// terlalu sulit atau terlalu mudah.
func aiCaseStats(rows []entity.AdminReviewRow) []CaseGradingStat {
	byCase := map[string]*CaseGradingStat{}
	scoreTotal := map[string]int{}
	scoreCount := map[string]int{}
	for _, row := range rows {
		e := row.Enrollment
		if e.Tier() != entity.TierAI || e.Status == entity.EnrollmentAIGrading {
			continue
		}
		stat := byCase[e.CaseID]
		if stat == nil {
			stat = &CaseGradingStat{CaseID: e.CaseID, CaseTitle: e.Case.Title}
			byCase[e.CaseID] = stat
		}
		stat.GradedCount++
		if e.Status == entity.EnrollmentPassed {
			stat.PassedCount++
		}
		if row.Flag != nil {
			stat.FlaggedCount++
		}
		if e.Score != nil {
			scoreTotal[e.CaseID] += *e.Score
			scoreCount[e.CaseID]++
		}
	}
	stats := make([]CaseGradingStat, 0, len(byCase))
	for id, stat := range byCase {
		if n := scoreCount[id]; n > 0 {
			average := (scoreTotal[id] + n/2) / n
			stat.AverageScore = &average
		}
		stats = append(stats, *stat)
	}
	sort.SliceStable(stats, func(i, j int) bool {
		if stats[i].GradedCount != stats[j].GradedCount {
			return stats[i].GradedCount > stats[j].GradedCount
		}
		return stats[i].CaseTitle < stats[j].CaseTitle
	})
	return stats
}
