// Package reviewer berisi use case portal reviewer mitra (CONTEXT.md 4.10). Kandidat selalu anonim:
// use case ini tidak pernah memuat nama atau email peserta.
package reviewer

import (
	"context"
	"errors"
	"fmt"
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
	msgSubmissionNotFound = "Submission tidak ditemukan di antreanmu."
	msgAlreadyDecided     = "Submission ini sudah diputuskan sebelumnya."
	msgLevelRequired      = "Pilih level 1 sampai 5."
	msgInvalidDecision    = "Keputusan tidak dikenal."
	msgReasonRequired     = "Pilih salah satu alasan."
	msgDraftTooLong       = "Isian terlalu panjang."
)

var (
	msgRevisionLimit = fmt.Sprintf("Batas revisi (%d kali) sudah habis. Nilai submission ini.", entity.MaxRevisions)
	msgReasonLength  = fmt.Sprintf("Tulis alasan minimal %d karakter.", entity.ReviewReasonMinRunes)
	msgNoteLength    = fmt.Sprintf("Tulis catatan minimal %d karakter.", entity.ReviewReasonMinRunes)
	msgTooLong       = fmt.Sprintf("Maksimal %d karakter.", entity.ReviewReasonMaxRunes)
	msgFeedbackItems = fmt.Sprintf("Tulis 1 sampai %d poin, masing-masing maksimal %d karakter.",
		entity.ReviewerFeedbackMaxItems, entity.ReviewerFeedbackItemMaxRunes)
)

// draftTextMaxRunes membatasi setiap teks di draft (feedback mentah masih banyak baris).
const draftTextMaxRunes = entity.ReviewerFeedbackMaxItems * entity.ReviewerFeedbackItemMaxRunes

// Queue adalah antrean reviewer (IReviewerQueue di client).
type Queue struct {
	// Pending urut dari tenggat review paling dekat.
	Pending []entity.ReviewQueueEntry
	// History urut dari keputusan terbaru.
	History []entity.ReviewQueueEntry
}

// SubmissionDetail adalah isi halaman review satu submission.
type SubmissionDetail struct {
	Entry        entity.ReviewQueueEntry
	Case         entity.Case
	LastRevision *entity.RevisionRequest
	Draft        *entity.ReviewDraft
	// DownloadURLs adalah link unduh sementara per fileId; berkas yang gagal ditandatangani dilewati.
	DownloadURLs map[string]string
}

// GradeCriterionInput adalah penilaian satu kriteria dari reviewer.
type GradeCriterionInput struct {
	Name   string
	Level  int
	Reason string
}

// GradeInput adalah isi form "Nilai".
type GradeInput struct {
	Criteria      []GradeCriterionInput
	Feedback      entity.ReviewFeedback
	IsRecommended bool
}

// ReviewUseCase melayani portal reviewer.
type ReviewUseCase interface {
	GetQueue(ctx context.Context) (Queue, error)
	GetSubmission(ctx context.Context, enrollmentID string) (SubmissionDetail, error)
	SaveDraft(ctx context.Context, enrollmentID string, patch entity.ReviewDraftPatch) (entity.ReviewDraft, error)
	Grade(ctx context.Context, enrollmentID string, input GradeInput) (entity.ReviewQueueEntry, error)
	RequestRevision(ctx context.Context, enrollmentID, reason, note string) (entity.ReviewQueueEntry, error)
}

// ReviewDeps adalah dependency use case reviewer.
type ReviewDeps struct {
	Reviewers coreRepo.ReviewerRepository
	Cases     coreRepo.CaseRepository
	Files     coreRepo.FileRepository
	Storage   coreRepo.Storage
	// OnReviewed memfinalkan penilaian (hook.OnReviewed), sama dengan penilaian AI.
	OnReviewed func(ctx context.Context, outcome entity.ReviewOutcome) error
	Now        func() time.Time
}

type reviewUseCase struct {
	ReviewDeps
}

// InitReviewUseCase membuat use case portal reviewer.
func InitReviewUseCase(deps ReviewDeps) ReviewUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &reviewUseCase{ReviewDeps: deps}
}

func (uc *reviewUseCase) GetQueue(ctx context.Context) (Queue, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return Queue{}, apperror.Unauthenticated("")
	}
	entries, err := uc.Reviewers.ListQueue(ctx, current.ID, entity.ReviewQueueLimit)
	if err != nil {
		return Queue{}, apperror.Internal(err)
	}
	queue := Queue{Pending: []entity.ReviewQueueEntry{}, History: []entity.ReviewQueueEntry{}}
	for _, entry := range entries {
		if entry.Enrollment.Status == entity.EnrollmentInReview {
			queue.Pending = append(queue.Pending, entry)
		} else {
			queue.History = append(queue.History, entry)
		}
	}
	sort.SliceStable(queue.Pending, func(i, j int) bool {
		return timeOrMax(queue.Pending[i].Enrollment.ReviewDueAt).Before(timeOrMax(queue.Pending[j].Enrollment.ReviewDueAt))
	})
	sort.SliceStable(queue.History, func(i, j int) bool {
		return timeOrZero(queue.History[i].DecidedAt()).After(timeOrZero(queue.History[j].DecidedAt()))
	})
	return queue, nil
}

func (uc *reviewUseCase) GetSubmission(ctx context.Context, enrollmentID string) (SubmissionDetail, error) {
	current, entry, err := uc.loadEntry(ctx, enrollmentID)
	if err != nil {
		return SubmissionDetail{}, err
	}
	c, err := uc.Cases.GetWithBriefByID(ctx, entry.Enrollment.CaseID)
	if err != nil {
		return SubmissionDetail{}, apperror.Internal(err)
	}
	lastRevision, err := uc.Reviewers.LastRevision(ctx, entry.Enrollment.ID)
	if err != nil {
		return SubmissionDetail{}, apperror.Internal(err)
	}
	detail := SubmissionDetail{Entry: entry, Case: c, LastRevision: lastRevision, DownloadURLs: map[string]string{}}
	if entry.Enrollment.Status == entity.EnrollmentInReview && entry.Submission != nil {
		draft, err := uc.Reviewers.GetDraft(ctx, entry.Submission.ID)
		switch {
		case err == nil && draft.ReviewerID == current.ID:
			detail.Draft = &draft
		case err != nil && !errors.Is(err, coreErrors.ErrReviewDraftNotFound):
			return SubmissionDetail{}, apperror.Internal(err)
		}
	}
	if entry.Submission != nil {
		detail.DownloadURLs = uc.downloadURLs(ctx, entry.Enrollment.UserID, entry.Submission.SlotValues)
	}
	return detail, nil
}

// downloadURLs menandatangani link unduh untuk setiap berkas submission. Bucket private, jadi
// reviewer hanya bisa membuka berkas lewat link sementara ini.
func (uc *reviewUseCase) downloadURLs(ctx context.Context, ownerID string, values entity.SlotValues) map[string]string {
	urls := map[string]string{}
	ids := values.FileIDs()
	if len(ids) == 0 {
		return urls
	}
	files, err := uc.Files.ListByIDs(ctx, ownerID, ids)
	if err != nil {
		log.Warn().Err(err).Msg("failed to load submission files for review")
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

func (uc *reviewUseCase) SaveDraft(ctx context.Context, enrollmentID string, patch entity.ReviewDraftPatch) (entity.ReviewDraft, error) {
	current, entry, err := uc.loadPending(ctx, enrollmentID)
	if err != nil {
		return entity.ReviewDraft{}, err
	}
	if fields := validateDraftPatch(patch); len(fields) > 0 {
		return entity.ReviewDraft{}, apperror.Validation(fields...)
	}
	draft, err := uc.Reviewers.GetDraft(ctx, entry.Submission.ID)
	if errors.Is(err, coreErrors.ErrReviewDraftNotFound) || (err == nil && draft.ReviewerID != current.ID) {
		draft = entity.ReviewDraft{SubmissionID: entry.Submission.ID, Decision: entity.ReviewDecisionGrade}
	} else if err != nil {
		return entity.ReviewDraft{}, apperror.Internal(err)
	}
	patch.Apply(&draft)
	draft.ReviewerID = current.ID
	draft.SavedAt = uc.Now()

	err = uc.Reviewers.SaveDraft(ctx, entry.Enrollment.ID, &draft)
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return entity.ReviewDraft{}, apperror.Conflict(msgAlreadyDecided)
	}
	if err != nil {
		return entity.ReviewDraft{}, apperror.Internal(err)
	}
	return draft, nil
}

func (uc *reviewUseCase) Grade(ctx context.Context, enrollmentID string, input GradeInput) (entity.ReviewQueueEntry, error) {
	current, entry, err := uc.loadPending(ctx, enrollmentID)
	if err != nil {
		return entity.ReviewQueueEntry{}, err
	}
	c, err := uc.Cases.GetWithBriefByID(ctx, entry.Enrollment.CaseID)
	if err != nil {
		return entity.ReviewQueueEntry{}, apperror.Internal(err)
	}
	scores, fields := buildScores(c.Rubric, input.Criteria)
	feedback, feedbackFields := normalizeFeedback(input.Feedback)
	fields = append(fields, feedbackFields...)
	if len(fields) > 0 {
		return entity.ReviewQueueEntry{}, apperror.Validation(fields...)
	}

	reviewerID := current.ID
	err = uc.OnReviewed(ctx, entity.ReviewOutcome{
		EnrollmentID:  entry.Enrollment.ID,
		SubmissionID:  entry.Submission.ID,
		ReviewerType:  entity.ReviewerHuman,
		ReviewerID:    &reviewerID,
		ReviewerRole:  entity.ReviewerRoleFor(&c),
		Scores:        scores,
		Feedback:      feedback,
		IsRecommended: input.IsRecommended,
	})
	if err != nil {
		return entity.ReviewQueueEntry{}, apperror.Internal(err)
	}
	return uc.reloadDecided(ctx, current.ID, entry.Enrollment.ID, func(e entity.ReviewQueueEntry) bool {
		review := e.Submission.Review
		return review != nil && review.ReviewerID != nil && *review.ReviewerID == current.ID
	})
}

func (uc *reviewUseCase) RequestRevision(ctx context.Context, enrollmentID, reason, note string) (entity.ReviewQueueEntry, error) {
	current, entry, err := uc.loadPending(ctx, enrollmentID)
	if err != nil {
		return entity.ReviewQueueEntry{}, err
	}
	if !entry.CanRequestRevision() {
		return entity.ReviewQueueEntry{}, apperror.Conflict(msgRevisionLimit)
	}
	note = strings.TrimSpace(note)
	var fields []apperror.FieldError
	if !entity.IsRevisionReason(reason) {
		fields = append(fields, apperror.FieldError{Field: "reason", Message: msgReasonRequired})
	}
	if message := reasonLengthError(note, msgNoteLength); message != "" {
		fields = append(fields, apperror.FieldError{Field: "note", Message: message})
	}
	if len(fields) > 0 {
		return entity.ReviewQueueEntry{}, apperror.Validation(fields...)
	}

	now := uc.Now()
	err = uc.Reviewers.RequestRevision(ctx, entity.RevisionDecision{
		EnrollmentID: entry.Enrollment.ID,
		SubmissionID: entry.Submission.ID,
		ReviewerID:   current.ID,
		Reason:       reason,
		Note:         note,
		DeadlineAt:   now.AddDate(0, 0, entity.RevisionExtraDays),
		At:           now,
	})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return entity.ReviewQueueEntry{}, apperror.Conflict(msgAlreadyDecided)
	}
	if err != nil {
		return entity.ReviewQueueEntry{}, apperror.Internal(err)
	}
	return uc.reloadDecided(ctx, current.ID, entry.Enrollment.ID, func(e entity.ReviewQueueEntry) bool {
		return e.Enrollment.Status == entity.EnrollmentRevisionRequested
	})
}

// reloadDecided memuat ulang submission setelah keputusan. Bila keputusan reviewer ini tidak
// tercatat (reviewer lain atau request lain memutuskan lebih dulu), kembalikan konflik.
func (uc *reviewUseCase) reloadDecided(ctx context.Context, reviewerID, enrollmentID string, isMine func(entity.ReviewQueueEntry) bool) (entity.ReviewQueueEntry, error) {
	entry, err := uc.Reviewers.GetEntry(ctx, reviewerID, enrollmentID)
	if errors.Is(err, coreErrors.ErrEnrollmentNotFound) {
		return entity.ReviewQueueEntry{}, apperror.Conflict(msgAlreadyDecided)
	}
	if err != nil {
		return entity.ReviewQueueEntry{}, apperror.Internal(err)
	}
	if entry.Submission == nil || !isMine(entry) {
		return entity.ReviewQueueEntry{}, apperror.Conflict(msgAlreadyDecided)
	}
	return entry, nil
}

func (uc *reviewUseCase) loadEntry(ctx context.Context, enrollmentID string) (authctx.User, entity.ReviewQueueEntry, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return authctx.User{}, entity.ReviewQueueEntry{}, apperror.Unauthenticated("")
	}
	if _, err := uuid.Parse(enrollmentID); err != nil {
		return authctx.User{}, entity.ReviewQueueEntry{}, apperror.NotFound(msgSubmissionNotFound)
	}
	entry, err := uc.Reviewers.GetEntry(ctx, current.ID, enrollmentID)
	if errors.Is(err, coreErrors.ErrEnrollmentNotFound) {
		return authctx.User{}, entity.ReviewQueueEntry{}, apperror.NotFound(msgSubmissionNotFound)
	}
	if err != nil {
		return authctx.User{}, entity.ReviewQueueEntry{}, apperror.Internal(err)
	}
	return current, entry, nil
}

// loadPending memuat submission yang masih menunggu keputusan.
func (uc *reviewUseCase) loadPending(ctx context.Context, enrollmentID string) (authctx.User, entity.ReviewQueueEntry, error) {
	current, entry, err := uc.loadEntry(ctx, enrollmentID)
	if err != nil {
		return authctx.User{}, entity.ReviewQueueEntry{}, err
	}
	if entry.Enrollment.Status != entity.EnrollmentInReview || entry.Submission == nil ||
		entry.Submission.Status != entity.SubmissionSubmitted {
		return authctx.User{}, entity.ReviewQueueEntry{}, apperror.Conflict(msgAlreadyDecided)
	}
	return current, entry, nil
}

// buildScores mencocokkan penilaian dengan rubrik per nama, supaya urutan dari client tidak
// berpengaruh. Nama dan bobot disalin dari rubrik.
func buildScores(rubric []entity.RubricCriterion, inputs []GradeCriterionInput) ([]entity.ReviewCriterionScore, []apperror.FieldError) {
	byName := make(map[string]GradeCriterionInput, len(inputs))
	for _, input := range inputs {
		byName[input.Name] = input
	}
	scores := make([]entity.ReviewCriterionScore, 0, len(rubric))
	var fields []apperror.FieldError
	for i, criterion := range rubric {
		input, ok := byName[criterion.Name]
		field := fmt.Sprintf("criteria.%d", i)
		if !ok || input.Level < entity.CriterionLevelMin || input.Level > entity.CriterionLevelMax {
			fields = append(fields, apperror.FieldError{Field: field + ".level", Message: msgLevelRequired})
		}
		reason := strings.TrimSpace(input.Reason)
		if message := reasonLengthError(reason, msgReasonLength); message != "" {
			fields = append(fields, apperror.FieldError{Field: field + ".reason", Message: message})
		}
		position := criterion.Position
		if position == 0 {
			position = i + 1
		}
		scores = append(scores, entity.ReviewCriterionScore{
			Position: position, Name: criterion.Name, Weight: criterion.Weight, Level: input.Level, Reason: reason,
		})
	}
	return scores, fields
}

// normalizeFeedback merapikan feedback 3 bagian: poin kosong dibuang, lalu jumlah dan panjangnya
// diperiksa.
func normalizeFeedback(feedback entity.ReviewFeedback) (entity.ReviewFeedback, []apperror.FieldError) {
	var fields []apperror.FieldError
	clean := func(field string, items []string) []string {
		result := make([]string, 0, len(items))
		for _, item := range items {
			if item = strings.TrimSpace(item); item != "" {
				result = append(result, item)
			}
		}
		tooLong := false
		for _, item := range result {
			if utf8.RuneCountInString(item) > entity.ReviewerFeedbackItemMaxRunes {
				tooLong = true
			}
		}
		if len(result) == 0 || len(result) > entity.ReviewerFeedbackMaxItems || tooLong {
			fields = append(fields, apperror.FieldError{Field: "feedback." + field, Message: msgFeedbackItems})
		}
		return result
	}
	normalized := entity.ReviewFeedback{
		Strengths:    clean("strengths", feedback.Strengths),
		Improvements: clean("improvements", feedback.Improvements),
		NextSteps:    clean("nextSteps", feedback.NextSteps),
	}
	return normalized, fields
}

func reasonLengthError(text, tooShort string) string {
	length := utf8.RuneCountInString(text)
	if length < entity.ReviewReasonMinRunes {
		return tooShort
	}
	if length > entity.ReviewReasonMaxRunes {
		return msgTooLong
	}
	return ""
}

// validateDraftPatch hanya membatasi ukuran; isi draft boleh belum lengkap.
func validateDraftPatch(patch entity.ReviewDraftPatch) []apperror.FieldError {
	var fields []apperror.FieldError
	if patch.Decision != nil && !patch.Decision.IsValid() {
		fields = append(fields, apperror.FieldError{Field: "decision", Message: msgInvalidDecision})
	}
	tooLong := func(text string) bool { return utf8.RuneCountInString(text) > draftTextMaxRunes }
	if grade := patch.Grade; grade != nil {
		if len(grade.Criteria) > entity.ReviewQueueLimit || tooLong(grade.Strengths) || tooLong(grade.Improvements) || tooLong(grade.NextSteps) {
			fields = append(fields, apperror.FieldError{Field: "grade", Message: msgDraftTooLong})
		}
		for _, criterion := range grade.Criteria {
			if tooLong(criterion.Reason) || utf8.RuneCountInString(criterion.Name) > entity.ReviewReasonMaxRunes {
				fields = append(fields, apperror.FieldError{Field: "grade", Message: msgDraftTooLong})
				break
			}
		}
	}
	if revision := patch.Revision; revision != nil && (tooLong(revision.Note) || tooLong(revision.Reason)) {
		fields = append(fields, apperror.FieldError{Field: "revision", Message: msgDraftTooLong})
	}
	return fields
}

func timeOrMax(t *time.Time) time.Time {
	if t == nil {
		return time.Unix(1<<40, 0)
	}
	return *t
}

func timeOrZero(t *time.Time) time.Time {
	if t == nil {
		return time.Time{}
	}
	return *t
}
