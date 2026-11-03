package student

import (
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
)

// Kontrak halaman hasil: client/src/types/result.ts.

// ShareConsentRequest adalah body persetujuan berbagi profil.
type ShareConsentRequest struct {
	IsGranted bool `json:"isGranted"`
}

// CriterionScoreResponse adalah ICriterionScore.
type CriterionScoreResponse struct {
	Name   string `json:"name"`
	Weight int    `json:"weight"`
	Level  int    `json:"level"`
	Reason string `json:"reason"`
}

// ReviewFeedbackResponse adalah IReviewFeedback.
type ReviewFeedbackResponse struct {
	Strengths    []string `json:"strengths"`
	Improvements []string `json:"improvements"`
	NextSteps    []string `json:"nextSteps"`
}

// ReviewResultResponse adalah IReviewResult.
type ReviewResultResponse struct {
	TotalScore    int                      `json:"totalScore"`
	PassingScore  int                      `json:"passingScore"`
	IsPassed      bool                     `json:"isPassed"`
	Criteria      []CriterionScoreResponse `json:"criteria"`
	Feedback      ReviewFeedbackResponse   `json:"feedback"`
	ReviewerRole  string                   `json:"reviewerRole"`
	ReviewedAt    time.Time                `json:"reviewedAt"`
	IsRecommended bool                     `json:"isRecommended"`
}

// CaseResultResponse adalah ICaseResult.
type CaseResultResponse struct {
	CaseInfo     CaseDetailResponse        `json:"caseInfo"`
	Enrollment   *EnrollmentResponse       `json:"enrollment"`
	Review       *ReviewResultResponse     `json:"review"`
	Certificate  *CertificateResponse      `json:"certificate"`
	Submission   *SubmissionRecordResponse `json:"submission"`
	Slots        []SlotResponse            `json:"slots"`
	ShareConsent *string                   `json:"shareConsent"`
	CanRetry     bool                      `json:"canRetry"`
}

// MapCaseResultToResponse memetakan halaman hasil.
func MapCaseResultToResponse(r studentModule.CaseResult) CaseResultResponse {
	response := CaseResultResponse{
		CaseInfo: mapCaseInfo(r.Case, r.Enrollment),
		Slots:    []SlotResponse{},
		CanRetry: r.CanRetry,
	}
	if r.Enrollment != nil {
		enrollment := MapEnrollment(r.Enrollment)
		response.Enrollment = &enrollment
		if r.Enrollment.Certificate != nil {
			certificate := MapCertificate(*r.Enrollment.Certificate)
			response.Certificate = &certificate
		}
		response.ShareConsent = r.Enrollment.ShareConsent
	}
	if !r.CanViewBrief {
		return response
	}
	response.Slots = mapSlots(r.Case.Slots)
	response.Submission = mapSubmissionRecord(r.Submission)
	if r.Review != nil {
		review := MapReviewResult(*r.Review)
		response.Review = &review
	}
	return response
}

// MapReviewResult memetakan hasil penilaian beserta skor per kriteria, urut rubrik.
func MapReviewResult(review entity.Review) ReviewResultResponse {
	criteria := make([]CriterionScoreResponse, 0, len(review.Scores))
	for _, score := range review.Scores {
		criteria = append(criteria, CriterionScoreResponse{Name: score.Name, Weight: score.Weight, Level: score.Level, Reason: score.Reason})
	}
	return ReviewResultResponse{
		TotalScore:   review.TotalScore,
		PassingScore: review.PassingScore,
		IsPassed:     review.IsPassed,
		Criteria:     criteria,
		Feedback: ReviewFeedbackResponse{
			Strengths:    nonNil(review.Strengths),
			Improvements: nonNil(review.Improvements),
			NextSteps:    nonNil(review.NextSteps),
		},
		ReviewerRole:  review.ReviewerRole,
		ReviewedAt:    review.ReviewedAt.UTC(),
		IsRecommended: review.IsRecommended,
	}
}
