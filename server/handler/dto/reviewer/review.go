// Package reviewer berisi DTO portal reviewer. Kontrak: client/src/types/reviewer.ts. Kandidat
// selalu anonim: tidak ada nama, email, atau ID user yang dikirim.
package reviewer

import (
	"bytes"
	"encoding/json"
	"fmt"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	reviewerModule "github.com/DerryRiccardo/Simula/server/core/module/reviewer"
	studentDto "github.com/DerryRiccardo/Simula/server/handler/dto/student"
)

// ReviewQueueItemResponse adalah IReviewQueueItem.
type ReviewQueueItemResponse struct {
	ID             string                         `json:"id"`
	CandidateLabel string                         `json:"candidateLabel"`
	CaseSummary    studentDto.CaseSummaryResponse `json:"caseSummary"`
	Status         string                         `json:"status"`
	Attempt        int                            `json:"attempt"`
	SubmittedAt    time.Time                      `json:"submittedAt"`
	ReviewDueAt    time.Time                      `json:"reviewDueAt"`
	RevisionCount  int                            `json:"revisionCount"`
	DecidedAt      *time.Time                     `json:"decidedAt"`
	Score          *int                           `json:"score"`
	IsRecommended  bool                           `json:"isRecommended"`
}

// ReviewerQueueResponse adalah IReviewerQueue.
type ReviewerQueueResponse struct {
	Pending []ReviewQueueItemResponse `json:"pending"`
	History []ReviewQueueItemResponse `json:"history"`
}

// DraftGradeResponse adalah IReviewDraftGrade.
type DraftGradeResponse struct {
	Criteria      []DraftCriterionResponse `json:"criteria"`
	Strengths     string                   `json:"strengths"`
	Improvements  string                   `json:"improvements"`
	NextSteps     string                   `json:"nextSteps"`
	IsRecommended bool                     `json:"isRecommended"`
}

// DraftCriterionResponse adalah isian satu kriteria di draft.
type DraftCriterionResponse struct {
	Name   string `json:"name"`
	Level  int    `json:"level"`
	Reason string `json:"reason"`
}

// RevisionPayload adalah IRevisionRequestPayload (request dan isi draft).
type RevisionPayload struct {
	Reason string `json:"reason"`
	Note   string `json:"note"`
}

// ReviewDraftResponse adalah IReviewDraft.
type ReviewDraftResponse struct {
	Decision string              `json:"decision"`
	Grade    *DraftGradeResponse `json:"grade"`
	Revision *RevisionPayload    `json:"revision"`
	SavedAt  time.Time           `json:"savedAt"`
}

// ReviewSubmissionDetailResponse adalah IReviewSubmissionDetail.
type ReviewSubmissionDetailResponse struct {
	Item                    ReviewQueueItemResponse              `json:"item"`
	CaseInfo                studentDto.CaseDetailResponse        `json:"caseInfo"`
	Brief                   studentDto.CaseBriefResponse         `json:"brief"`
	Submission              *studentDto.SubmissionRecordResponse `json:"submission"`
	LastRevision            *studentDto.RevisionResponse         `json:"lastRevision"`
	Draft                   *ReviewDraftResponse                 `json:"draft"`
	Review                  *studentDto.ReviewResultResponse     `json:"review"`
	MaxRevisions            int                                  `json:"maxRevisions"`
	CanRequestRevision      bool                                 `json:"canRequestRevision"`
	RecommendationThreshold int                                  `json:"recommendationThreshold"`
}

// DraftRequest adalah TReviewDraftPayload: hanya bagian yang dikirim yang menimpa draft. grade dan
// revision boleh null untuk mengosongkan bagian itu.
type DraftRequest struct {
	Decision *string         `json:"decision"`
	Grade    json.RawMessage `json:"grade"`
	Revision json.RawMessage `json:"revision"`
}

// GradeRequest adalah IGradeSubmissionPayload.
type GradeRequest struct {
	Criteria []DraftCriterionResponse `json:"criteria"`
	Feedback struct {
		Strengths    []string `json:"strengths"`
		Improvements []string `json:"improvements"`
		NextSteps    []string `json:"nextSteps"`
	} `json:"feedback"`
	IsRecommended bool `json:"isRecommended"`
}

// MapDraftReqToPatch mengubah request draft menjadi patch. grade/revision yang tidak dikirim tidak
// diubah; null mengosongkannya.
func MapDraftReqToPatch(req DraftRequest) (entity.ReviewDraftPatch, error) {
	var patch entity.ReviewDraftPatch
	if req.Decision != nil {
		decision := entity.ReviewDecision(*req.Decision)
		patch.Decision = &decision
	}
	if req.Grade != nil {
		patch.HasGrade = true
		if !isNull(req.Grade) {
			var grade entity.DraftGrade
			if err := json.Unmarshal(req.Grade, &grade); err != nil {
				return patch, fmt.Errorf("invalid grade: %w", err)
			}
			patch.Grade = &grade
		}
	}
	if req.Revision != nil {
		patch.HasRevision = true
		if !isNull(req.Revision) {
			var revision entity.DraftRevision
			if err := json.Unmarshal(req.Revision, &revision); err != nil {
				return patch, fmt.Errorf("invalid revision: %w", err)
			}
			patch.Revision = &revision
		}
	}
	return patch, nil
}

func isNull(raw json.RawMessage) bool {
	return bytes.Equal(bytes.TrimSpace(raw), []byte("null"))
}

// MapGradeReqToInput mengubah request penilaian menjadi input use case.
func MapGradeReqToInput(req GradeRequest) reviewerModule.GradeInput {
	criteria := make([]reviewerModule.GradeCriterionInput, 0, len(req.Criteria))
	for _, item := range req.Criteria {
		criteria = append(criteria, reviewerModule.GradeCriterionInput{Name: item.Name, Level: item.Level, Reason: item.Reason})
	}
	return reviewerModule.GradeInput{
		Criteria: criteria,
		Feedback: entity.ReviewFeedback{
			Strengths:    req.Feedback.Strengths,
			Improvements: req.Feedback.Improvements,
			NextSteps:    req.Feedback.NextSteps,
		},
		IsRecommended: req.IsRecommended,
	}
}

// MapQueueToResponse memetakan antrean dan riwayat.
func MapQueueToResponse(q reviewerModule.Queue) ReviewerQueueResponse {
	return ReviewerQueueResponse{Pending: mapItems(q.Pending), History: mapItems(q.History)}
}

func mapItems(entries []entity.ReviewQueueEntry) []ReviewQueueItemResponse {
	items := make([]ReviewQueueItemResponse, 0, len(entries))
	for i := range entries {
		items = append(items, MapQueueItem(entries[i]))
	}
	return items
}

// MapQueueItem memetakan satu submission di antrean.
func MapQueueItem(e entity.ReviewQueueEntry) ReviewQueueItemResponse {
	enrollment := e.Enrollment
	item := ReviewQueueItemResponse{
		ID:             enrollment.ID,
		CandidateLabel: fmt.Sprintf("Kandidat #%d", enrollment.CandidateNumber),
		Status:         string(enrollment.Status),
		Attempt:        1,
		SubmittedAt:    enrollment.UpdatedAt.UTC(),
		RevisionCount:  enrollment.RevisionCount,
		DecidedAt:      utcPtr(e.DecidedAt()),
		Score:          enrollment.Score,
	}
	if enrollment.Case != nil {
		item.CaseSummary = studentDto.MapCaseSummary(enrollment.Case)
	}
	if s := e.Submission; s != nil {
		item.Attempt = s.Attempt
		if s.SubmittedAt != nil {
			item.SubmittedAt = s.SubmittedAt.UTC()
		}
		if s.Review != nil {
			item.IsRecommended = s.Review.IsRecommended
		}
	}
	// Setelah diputuskan, review_due_at dikosongkan; riwayat tetap menampilkan SLA dari waktu submit.
	if enrollment.ReviewDueAt != nil {
		item.ReviewDueAt = enrollment.ReviewDueAt.UTC()
	} else {
		item.ReviewDueAt = entity.AddBusinessDays(item.SubmittedAt, entity.ReviewSLABusinessDays)
	}
	return item
}

// MapDetailToResponse memetakan halaman review.
func MapDetailToResponse(d reviewerModule.SubmissionDetail) ReviewSubmissionDetailResponse {
	entry := d.Entry
	response := ReviewSubmissionDetailResponse{
		Item:                    MapQueueItem(entry),
		CaseInfo:                studentDto.MapCaseInfo(d.Case, nil),
		Brief:                   studentDto.MapBrief(d.Case),
		MaxRevisions:            entity.MaxRevisions,
		CanRequestRevision:      entry.CanRequestRevision(),
		RecommendationThreshold: entity.RecommendationThreshold,
	}
	if entry.Submission != nil {
		response.Submission = studentDto.MapSubmissionRecord(entry.Submission, d.DownloadURLs)
		if entry.Submission.Review != nil {
			review := studentDto.MapReviewResult(*entry.Submission.Review)
			response.Review = &review
		}
	}
	if d.LastRevision != nil {
		revision := studentDto.MapRevision(*d.LastRevision, entity.ReviewerRoleFor(&d.Case))
		response.LastRevision = &revision
	}
	if d.Draft != nil {
		draft := MapDraft(*d.Draft)
		response.Draft = &draft
	}
	return response
}

// MapDraft memetakan draft penilaian.
func MapDraft(d entity.ReviewDraft) ReviewDraftResponse {
	response := ReviewDraftResponse{Decision: string(d.Decision), SavedAt: d.SavedAt.UTC()}
	if grade := d.Grade.Grade; grade != nil {
		criteria := make([]DraftCriterionResponse, 0, len(grade.Criteria))
		for _, c := range grade.Criteria {
			criteria = append(criteria, DraftCriterionResponse(c))
		}
		response.Grade = &DraftGradeResponse{
			Criteria: criteria, Strengths: grade.Strengths, Improvements: grade.Improvements,
			NextSteps: grade.NextSteps, IsRecommended: grade.IsRecommended,
		}
	}
	if revision := d.Revision.Revision; revision != nil {
		response.Revision = &RevisionPayload{Reason: revision.Reason, Note: revision.Note}
	}
	return response
}

func utcPtr(t *time.Time) *time.Time {
	if t == nil {
		return nil
	}
	utc := t.UTC()
	return &utc
}
