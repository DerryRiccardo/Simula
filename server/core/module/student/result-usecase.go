package student

import (
	"context"
	"errors"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

const (
	msgRetryUnavailable = "Kesempatan mencoba lagi untuk case ini sudah habis."
	msgNotFailed        = "Case ini belum bisa dicoba lagi."
)

// CaseResult adalah isi halaman hasil (ICaseResult di client). Review, submission, dan slot hanya
// boleh dikirim bila CanViewBrief.
type CaseResult struct {
	Case         entity.Case
	Enrollment   *entity.Enrollment
	CanViewBrief bool
	Submission   *entity.Submission
	Review       *entity.Review
	CanRetry     bool
}

// ResultUseCase melayani halaman hasil dan "Coba lagi".
type ResultUseCase interface {
	GetResult(ctx context.Context, slug string) (CaseResult, error)
	// Retry membuka percobaan baru setelah belum lulus: AI tanpa batas, B2B satu kali.
	Retry(ctx context.Context, enrollmentID string) (entity.Enrollment, error)
}

// ResultDeps adalah dependency use case hasil.
type ResultDeps struct {
	Cases       coreRepo.CaseRepository
	Enrollments coreRepo.EnrollmentRepository
	Submissions coreRepo.SubmissionRepository
	Reviews     coreRepo.ReviewRepository
	Now         func() time.Time
}

type resultUseCase struct {
	ResultDeps
}

// InitResultUseCase membuat use case hasil.
func InitResultUseCase(deps ResultDeps) ResultUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &resultUseCase{ResultDeps: deps}
}

func (uc *resultUseCase) GetResult(ctx context.Context, slug string) (CaseResult, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return CaseResult{}, apperror.Unauthenticated("")
	}
	c, enrollment, err := findCaseWithEnrollment(ctx, uc.Cases, uc.Enrollments, current.ID, slug)
	if err != nil {
		return CaseResult{}, err
	}
	result := CaseResult{Case: c, Enrollment: enrollment}
	if enrollment == nil || !enrollment.CanViewBrief() {
		return result, nil
	}

	submissions, err := uc.Submissions.ListByEnrollment(ctx, enrollment.ID)
	if err != nil {
		return CaseResult{}, apperror.Internal(err)
	}
	latest := latestReviewed(submissions)
	result.CanViewBrief = true
	result.CanRetry = enrollment.CanRetry(c.Tier)
	if latest == nil {
		result.Submission = entity.SplitSubmissions(submissions).Latest
		return result, nil
	}
	review, err := uc.Reviews.GetBySubmission(ctx, latest.ID)
	if err != nil && !errors.Is(err, coreErrors.ErrReviewNotFound) {
		return CaseResult{}, apperror.Internal(err)
	}
	if err == nil {
		result.Review = &review
	}
	result.Submission = latest
	return result, nil
}

func (uc *resultUseCase) Retry(ctx context.Context, enrollmentID string) (entity.Enrollment, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.Enrollment{}, apperror.Unauthenticated("")
	}
	enrollment, err := getOwnedEnrollment(ctx, uc.Enrollments, current.ID, enrollmentID)
	if err != nil {
		return entity.Enrollment{}, err
	}
	c, err := uc.Cases.GetByID(ctx, enrollment.CaseID)
	if err != nil {
		return entity.Enrollment{}, apperror.Internal(err)
	}
	if enrollment.Status != entity.EnrollmentFailed {
		return entity.Enrollment{}, apperror.Conflict(msgNotFailed)
	}
	if !enrollment.CanRetry(c.Tier) {
		return entity.Enrollment{}, apperror.Conflict(msgRetryUnavailable)
	}

	now := uc.Now()
	err = uc.Enrollments.Retry(ctx, enrollment.ID, entity.RetryDeadline(c.Tier, now), now)
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return entity.Enrollment{}, apperror.Conflict(msgNotFailed)
	}
	if err != nil {
		return entity.Enrollment{}, apperror.Internal(err)
	}
	return reloadEnrollment(ctx, uc.Enrollments, current.ID, enrollment.ID)
}

// latestReviewed mengembalikan percobaan terakhir yang sudah dinilai, atau nil.
func latestReviewed(submissions []entity.Submission) *entity.Submission {
	var latest *entity.Submission
	for i := range submissions {
		item := &submissions[i]
		if item.Review != nil && (latest == nil || item.Attempt > latest.Attempt) {
			latest = item
		}
	}
	return latest
}
