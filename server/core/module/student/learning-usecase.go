// Package student berisi use case area mahasiswa: katalog, dashboard, Case Saya, dan sertifikat.
package student

import (
	"context"
	"errors"
	"fmt"
	"math/rand/v2"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
	paginationPkg "github.com/DerryRiccardo/Simula/server/pkg/pagination"
)

const (
	msgCaseNotFound     = "Case tidak ditemukan."
	msgB2BNeedsCheckout = "B2B Case Study harus dibayar lewat checkout."
)

var msgSearchTooLong = fmt.Sprintf("Maksimal %d karakter", entity.SearchMaxLength)

// CaseListInput adalah query katalog (ICaseListParams di client).
type CaseListInput struct {
	Tier            string
	Field           string
	Level           string
	Sort            string
	Search          string
	ExcludeEnrolled bool
	Page            int
	Limit           int
}

// EnrollmentListInput adalah query Case Saya (IEnrollmentListParams di client).
type EnrollmentListInput struct {
	Tier   string
	Status string
	Field  string
	Search string
	Sort   string
}

// CasePage adalah satu halaman katalog.
type CasePage struct {
	Cases []entity.Case
	Meta  paginationPkg.Meta
}

// CaseDetailResult adalah detail case beserta status enrollment user yang sedang login.
type CaseDetailResult struct {
	Detail             entity.Case
	MyEnrollmentStatus *entity.EnrollmentStatus
}

// Dashboard adalah isi dashboard mahasiswa (IDashboardSummary di client).
type Dashboard struct {
	Stats            entity.DashboardStats
	ActionItems      []entity.Enrollment
	Recommendations  []entity.Case
	HasPassedAICase  bool
	HasPassedB2BCase bool
}

// LearningUseCase melayani katalog, dashboard, Case Saya, dan Sertifikat Saya.
type LearningUseCase interface {
	// ListCases bisa dipanggil tamu; bila login, urutan relevance memakai bidang pilihan user.
	ListCases(ctx context.Context, in CaseListInput) (CasePage, error)
	GetCase(ctx context.Context, slug string) (CaseDetailResult, error)
	Dashboard(ctx context.Context) (Dashboard, error)
	ListEnrollments(ctx context.Context, in EnrollmentListInput) ([]entity.Enrollment, error)
	// StartCase memulai AI case gratis. Idempoten: memanggil ulang mengembalikan enrollment yang sama.
	StartCase(ctx context.Context, caseID string) (entity.Enrollment, error)
	ListCertificates(ctx context.Context, tier string) ([]entity.Certificate, error)
}

// LearningDeps adalah dependency use case learning.
type LearningDeps struct {
	Users        coreRepo.UserRepository
	Cases        coreRepo.CaseRepository
	Enrollments  coreRepo.EnrollmentRepository
	Certificates coreRepo.CertificateRepository
	Now          func() time.Time
	// CandidateNumber membuat nomor kandidat anonim; default acak dalam rentang entity.CandidateNumber*.
	CandidateNumber func() int
}

type learningUseCase struct {
	LearningDeps
}

// InitLearningUseCase membuat use case learning.
func InitLearningUseCase(deps LearningDeps) LearningUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	if deps.CandidateNumber == nil {
		deps.CandidateNumber = func() int {
			return entity.CandidateNumberMin + rand.IntN(entity.CandidateNumberMax-entity.CandidateNumberMin+1)
		}
	}
	return &learningUseCase{LearningDeps: deps}
}

func (uc *learningUseCase) ListCases(ctx context.Context, in CaseListInput) (CasePage, error) {
	filter := coreRepo.CaseFilter{
		Tier:     entity.Tier(in.Tier),
		FieldKey: strings.TrimSpace(in.Field),
		Level:    entity.CaseLevel(in.Level),
		Sort:     entity.CaseSort(in.Sort),
		Search:   strings.TrimSpace(in.Search),
	}
	if filter.Sort == "" {
		filter.Sort = entity.CaseSortRelevance
	}
	if fields := validateCaseFilter(filter); len(fields) > 0 {
		return CasePage{}, apperror.Validation(fields...)
	}

	if current, ok := authctx.UserFrom(ctx); ok {
		user, err := uc.Users.GetByID(ctx, current.ID)
		if err != nil && !errors.Is(err, coreErrors.ErrUserNotFound) {
			return CasePage{}, apperror.Internal(err)
		}
		filter.UserFields = user.FieldKeys()
		if in.ExcludeEnrolled {
			filter.ExcludeUserID = current.ID
		}
	}

	p := paginationPkg.New(in.Page, in.Limit)
	cases, total, err := uc.Cases.ListPublished(ctx, filter, p)
	if err != nil {
		return CasePage{}, apperror.Internal(err)
	}
	return CasePage{Cases: cases, Meta: p.Meta(total)}, nil
}

func (uc *learningUseCase) GetCase(ctx context.Context, slug string) (CaseDetailResult, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return CaseDetailResult{}, apperror.NotFound(msgCaseNotFound)
	}
	detail, err := uc.Cases.GetPublishedBySlug(ctx, slug)
	if errors.Is(err, coreErrors.ErrCaseNotFound) {
		return CaseDetailResult{}, apperror.NotFound(msgCaseNotFound)
	}
	if err != nil {
		return CaseDetailResult{}, apperror.Internal(err)
	}

	result := CaseDetailResult{Detail: detail}
	if current, ok := authctx.UserFrom(ctx); ok {
		enrollment, err := uc.Enrollments.FindByUserAndCase(ctx, current.ID, detail.ID)
		if err != nil && !errors.Is(err, coreErrors.ErrEnrollmentNotFound) {
			return CaseDetailResult{}, apperror.Internal(err)
		}
		if err == nil {
			status := enrollment.Status
			result.MyEnrollmentStatus = &status
		}
	}
	return result, nil
}

func (uc *learningUseCase) Dashboard(ctx context.Context) (Dashboard, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return Dashboard{}, apperror.Unauthenticated("")
	}
	user, err := uc.Users.GetByID(ctx, current.ID)
	if errors.Is(err, coreErrors.ErrUserNotFound) {
		return Dashboard{}, apperror.Unauthenticated("")
	}
	if err != nil {
		return Dashboard{}, apperror.Internal(err)
	}

	enrollments, err := uc.Enrollments.ListByUser(ctx, current.ID, coreRepo.EnrollmentFilter{Sort: entity.EnrollmentSortRecent})
	if err != nil {
		return Dashboard{}, apperror.Internal(err)
	}
	certificates, err := uc.Certificates.ListByUser(ctx, current.ID, "")
	if err != nil {
		return Dashboard{}, apperror.Internal(err)
	}

	hasPassedAI := entity.HasPassedTier(enrollments, entity.TierAI)
	candidates, _, err := uc.Cases.ListPublished(ctx,
		coreRepo.CaseFilter{ExcludeUserID: current.ID, Sort: entity.CaseSortPopular},
		paginationPkg.New(1, entity.RecommendationCandidatePool),
	)
	if err != nil {
		return Dashboard{}, apperror.Internal(err)
	}

	return Dashboard{
		Stats:       entity.BuildDashboardStats(enrollments, len(certificates)),
		ActionItems: entity.ActionItems(enrollments),
		Recommendations: entity.RankRecommendations(
			candidates, user.FieldKeys(), entity.RecommendedTier(hasPassedAI), entity.RecommendationLimit,
		),
		HasPassedAICase:  hasPassedAI,
		HasPassedB2BCase: entity.HasPassedTier(enrollments, entity.TierB2B),
	}, nil
}

func (uc *learningUseCase) ListEnrollments(ctx context.Context, in EnrollmentListInput) ([]entity.Enrollment, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return nil, apperror.Unauthenticated("")
	}
	filter := coreRepo.EnrollmentFilter{
		Tier:     entity.Tier(in.Tier),
		Status:   entity.EnrollmentStatus(in.Status),
		FieldKey: strings.TrimSpace(in.Field),
		Search:   strings.TrimSpace(in.Search),
		Sort:     entity.EnrollmentSort(in.Sort),
	}
	if filter.Sort == "" {
		filter.Sort = entity.EnrollmentSortRecent
	}
	if fields := validateEnrollmentFilter(filter); len(fields) > 0 {
		return nil, apperror.Validation(fields...)
	}

	enrollments, err := uc.Enrollments.ListByUser(ctx, current.ID, filter)
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return enrollments, nil
}

func (uc *learningUseCase) StartCase(ctx context.Context, caseID string) (entity.Enrollment, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.Enrollment{}, apperror.Unauthenticated("")
	}
	caseID = strings.TrimSpace(caseID)
	if _, err := uuid.Parse(caseID); err != nil {
		return entity.Enrollment{}, apperror.NotFound(msgCaseNotFound)
	}

	target, err := uc.Cases.GetByID(ctx, caseID)
	if errors.Is(err, coreErrors.ErrCaseNotFound) || (err == nil && !target.IsPublished()) {
		return entity.Enrollment{}, apperror.NotFound(msgCaseNotFound)
	}
	if err != nil {
		return entity.Enrollment{}, apperror.Internal(err)
	}
	if target.Tier != entity.TierAI {
		return entity.Enrollment{}, apperror.Conflict(msgB2BNeedsCheckout)
	}

	enrollmentID, err := uc.findOrCreateEnrollment(ctx, current.ID, caseID)
	if err != nil {
		return entity.Enrollment{}, err
	}
	enrollment, err := uc.Enrollments.GetForUser(ctx, current.ID, enrollmentID)
	if err != nil {
		return entity.Enrollment{}, apperror.Internal(err)
	}
	return enrollment, nil
}

// findOrCreateEnrollment memakai enrollment yang sudah ada, atau membuat yang baru dengan nomor
// kandidat acak (dicoba ulang bila bentrok).
func (uc *learningUseCase) findOrCreateEnrollment(ctx context.Context, userID, caseID string) (string, error) {
	existing, err := uc.Enrollments.FindByUserAndCase(ctx, userID, caseID)
	if err == nil {
		return existing.ID, nil
	}
	if !errors.Is(err, coreErrors.ErrEnrollmentNotFound) {
		return "", apperror.Internal(err)
	}

	now := uc.Now()
	for attempt := 0; attempt < entity.CandidateNumberAttempts; attempt++ {
		enrollment := entity.Enrollment{
			ID:              uuid.NewString(),
			UserID:          userID,
			CaseID:          caseID,
			Status:          entity.EnrollmentInProgress,
			CandidateNumber: uc.CandidateNumber(),
			StartedAt:       &now,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		err := uc.Enrollments.Create(ctx, &enrollment)
		switch {
		case err == nil:
			return enrollment.ID, nil
		case errors.Is(err, coreErrors.ErrCandidateNumberTaken):
			continue
		case errors.Is(err, coreErrors.ErrEnrollmentExists):
			// Request lain baru saja membuat enrollment yang sama.
			existing, findErr := uc.Enrollments.FindByUserAndCase(ctx, userID, caseID)
			if findErr != nil {
				return "", apperror.Internal(findErr)
			}
			return existing.ID, nil
		default:
			return "", apperror.Internal(err)
		}
	}
	return "", apperror.Internal(fmt.Errorf("failed to allocate candidate number after %d tries", entity.CandidateNumberAttempts))
}

func (uc *learningUseCase) ListCertificates(ctx context.Context, tier string) ([]entity.Certificate, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return nil, apperror.Unauthenticated("")
	}
	t := entity.Tier(tier)
	if t != "" && !t.IsValid() {
		return nil, apperror.Validation(apperror.FieldError{Field: "tier", Message: "Harus salah satu dari: ai, b2b"})
	}
	certificates, err := uc.Certificates.ListByUser(ctx, current.ID, t)
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return certificates, nil
}

func validateCaseFilter(f coreRepo.CaseFilter) []apperror.FieldError {
	var fields []apperror.FieldError
	if f.Tier != "" && !f.Tier.IsValid() {
		fields = append(fields, apperror.FieldError{Field: "tier", Message: "Harus salah satu dari: ai, b2b"})
	}
	if f.Level != "" && !f.Level.IsValid() {
		fields = append(fields, apperror.FieldError{Field: "level", Message: "Harus salah satu dari: beginner, intermediate, advanced"})
	}
	if !f.Sort.IsValid() {
		fields = append(fields, apperror.FieldError{Field: "sort", Message: "Harus salah satu dari: relevance, popular, rating, price_low"})
	}
	if utf8.RuneCountInString(f.Search) > entity.SearchMaxLength {
		fields = append(fields, apperror.FieldError{Field: "search", Message: msgSearchTooLong})
	}
	return fields
}

func validateEnrollmentFilter(f coreRepo.EnrollmentFilter) []apperror.FieldError {
	var fields []apperror.FieldError
	if f.Tier != "" && !f.Tier.IsValid() {
		fields = append(fields, apperror.FieldError{Field: "tier", Message: "Harus salah satu dari: ai, b2b"})
	}
	if f.Status != "" && !f.Status.IsValid() {
		fields = append(fields, apperror.FieldError{Field: "status", Message: "Status tidak dikenal"})
	}
	if !f.Sort.IsValid() {
		fields = append(fields, apperror.FieldError{Field: "sort", Message: "Harus salah satu dari: recent, deadline, title"})
	}
	if utf8.RuneCountInString(f.Search) > entity.SearchMaxLength {
		fields = append(fields, apperror.FieldError{Field: "search", Message: msgSearchTooLong})
	}
	return fields
}
