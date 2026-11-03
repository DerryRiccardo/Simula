// Package hook berisi efek samping setelah perubahan domain yang dipakai beberapa alur (worker AI
// dan portal reviewer). Logika ini sengaja tidak diduplikasi di pemanggilnya.
package hook

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

// ReviewHookDeps adalah dependency ReviewHook.
type ReviewHookDeps struct {
	Enrollments coreRepo.EnrollmentRepository
	Users       coreRepo.UserRepository
	Reviews     coreRepo.ReviewRepository
	// RandomBytes dipakai membuat ID verifikasi sertifikat yang tidak bisa ditebak.
	RandomBytes func(n int) ([]byte, error)
	Now         func() time.Time
}

// ReviewHook memfinalkan penilaian.
type ReviewHook struct {
	ReviewHookDeps
}

// NewReviewHook membuat ReviewHook.
func NewReviewHook(deps ReviewHookDeps) *ReviewHook {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &ReviewHook{ReviewHookDeps: deps}
}

// OnReviewed dipanggil setelah skor per kriteria final, baik dari worker AI maupun reviewer. Skor
// total dihitung di sini (bukan oleh penilai), status menjadi passed/failed, dan sertifikat terbit
// otomatis bila lulus. Idempoten: penilaian yang sudah difinalkan diabaikan.
func (h *ReviewHook) OnReviewed(ctx context.Context, outcome entity.ReviewOutcome) error {
	enrollment, err := h.Enrollments.GetByIDWithCase(ctx, outcome.EnrollmentID)
	if err != nil {
		return fmt.Errorf("failed to load enrollment %s for review: %w", outcome.EnrollmentID, err)
	}
	c := enrollment.Case
	now := h.Now()

	scores := make([]entity.ReviewCriterionScore, 0, len(outcome.Scores))
	for _, score := range outcome.Scores {
		score.ID = uuid.NewString()
		scores = append(scores, score)
	}
	total := entity.CalculateScore(scores)
	passed := entity.IsPassed(total, c.PassingScore)
	review := entity.Review{
		ID:            uuid.NewString(),
		SubmissionID:  outcome.SubmissionID,
		ReviewerType:  outcome.ReviewerType,
		ReviewerID:    outcome.ReviewerID,
		ReviewerRole:  outcome.ReviewerRole,
		TotalScore:    total,
		PassingScore:  c.PassingScore,
		IsPassed:      passed,
		Strengths:     outcome.Feedback.Strengths,
		Improvements:  outcome.Feedback.Improvements,
		NextSteps:     outcome.Feedback.NextSteps,
		IsRecommended: passed && outcome.IsRecommended,
		ReviewedAt:    now,
		Scores:        scores,
	}

	finalization := entity.ReviewFinalization{
		Review:       review,
		EnrollmentID: enrollment.ID,
		From:         []entity.EnrollmentStatus{entity.StatusAfterSubmit(c.Tier)},
		To:           entity.EnrollmentFailed,
		GradingRunID: outcome.GradingRunID,
		At:           now,
	}
	if passed {
		finalization.To = entity.EnrollmentPassed
		certificate, err := h.newCertificate(ctx, enrollment, total, now)
		if err != nil {
			return err
		}
		finalization.Certificate = &certificate
	}

	err = h.Reviews.Finalize(ctx, finalization)
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		log.Info().Str("enrollment_id", enrollment.ID).Msg("review already finalized")
		return nil
	}
	if err != nil {
		return err
	}
	// Notifikasi email hasil menyusul bersama integrasi Resend (task email:send).
	log.Info().Str("enrollment_id", enrollment.ID).Int("score", total).Bool("passed", passed).Msg("review finalized")
	return nil
}

func (h *ReviewHook) newCertificate(ctx context.Context, enrollment entity.Enrollment, score int, now time.Time) (entity.Certificate, error) {
	user, err := h.Users.GetByID(ctx, enrollment.UserID)
	if err != nil {
		return entity.Certificate{}, fmt.Errorf("failed to load recipient %s: %w", enrollment.UserID, err)
	}
	random, err := h.RandomBytes(entity.CertificatePublicIDLength)
	if err != nil {
		return entity.Certificate{}, err
	}
	c := enrollment.Case
	return entity.Certificate{
		ID:            uuid.NewString(),
		PublicID:      entity.CertificatePublicID(random),
		EnrollmentID:  enrollment.ID,
		UserID:        enrollment.UserID,
		CaseID:        c.ID,
		Tier:          c.Tier,
		RecipientName: user.Name,
		CaseTitle:     c.Title,
		FieldKey:      c.FieldKey,
		PartnerName:   c.PartnerName(),
		Score:         score,
		IssuedAt:      now,
	}, nil
}
