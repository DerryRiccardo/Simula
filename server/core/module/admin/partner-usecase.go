// Package admin berisi use case panel admin (CONTEXT.md 4.13). Admin melihat identitas peserta;
// anonimitas hanya berlaku di portal reviewer.
package admin

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

const (
	msgPartnerNotFound   = "Mitra tidak ditemukan."
	msgPartnerNameTaken  = "Mitra dengan nama ini sudah ada."
	msgReviewerNotFound  = "Reviewer tidak ditemukan."
	msgChoosePartner     = "Pilih mitra."
	msgEmailTaken        = "Email ini sudah terdaftar."
	msgCaseNotOfPartner  = "Reviewer hanya bisa ditugaskan ke case milik mitranya."
	partnerNameMinRunes  = 2
	partnerAboutMinRunes = 20
	reviewerNameMinRunes = 3
	jobTitleMinRunes     = 3
	// jobTitleMaxRunes sama dengan CHECK job_title di tabel reviewer_profiles.
	jobTitleMaxRunes = 120
	textMaxRunes     = 2000
)

// passwordAlphabet tanpa karakter yang mudah tertukar (0/O, 1/l/I).
const passwordAlphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// PartnerInput adalah isi form mitra.
type PartnerInput struct {
	Name     string
	Industry string
	About    string
}

// ReviewerInput adalah isi form "Tambah reviewer".
type ReviewerInput struct {
	Name      string
	Email     string
	PartnerID string
	JobTitle  string
}

// CreatedReviewer adalah reviewer baru beserta password sementaranya. Password hanya dikirim sekali
// ke admin; yang disimpan hanya hash-nya.
type CreatedReviewer struct {
	Reviewer          entity.ReviewerStat
	TemporaryPassword string
}

// PartnerUseCase melayani menu Reviewer & Mitra.
type PartnerUseCase interface {
	GetDirectory(ctx context.Context) (entity.PartnerDirectory, error)
	CreatePartner(ctx context.Context, input PartnerInput) (entity.Partner, error)
	UpdatePartner(ctx context.Context, id string, input PartnerInput) (entity.Partner, error)
	SetPartnerStatus(ctx context.Context, id string, isActive bool) (entity.Partner, error)
	CreateReviewer(ctx context.Context, input ReviewerInput) (CreatedReviewer, error)
	SetReviewerCases(ctx context.Context, reviewerID string, caseIDs []string) (entity.ReviewerStat, error)
	SetReviewerStatus(ctx context.Context, reviewerID string, isActive bool) (entity.ReviewerStat, error)
}

// PartnerDeps adalah dependency use case Reviewer & Mitra.
type PartnerDeps struct {
	Partners    coreRepo.AdminPartnerRepository
	Hasher      coreRepo.PasswordHasher
	RandomBytes func(n int) ([]byte, error)
	Now         func() time.Time
}

type partnerUseCase struct {
	PartnerDeps
}

// InitPartnerUseCase membuat use case Reviewer & Mitra.
func InitPartnerUseCase(deps PartnerDeps) PartnerUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &partnerUseCase{PartnerDeps: deps}
}

func (uc *partnerUseCase) GetDirectory(ctx context.Context) (entity.PartnerDirectory, error) {
	partners, err := uc.Partners.ListPartners(ctx)
	if err != nil {
		return entity.PartnerDirectory{}, apperror.Internal(err)
	}
	reviewers, err := uc.Partners.ListReviewers(ctx)
	if err != nil {
		return entity.PartnerDirectory{}, apperror.Internal(err)
	}
	cases, err := uc.Partners.ListB2BCases(ctx)
	if err != nil {
		return entity.PartnerDirectory{}, apperror.Internal(err)
	}
	return entity.PartnerDirectory{Partners: partners, Reviewers: reviewers, Cases: cases}, nil
}

func (uc *partnerUseCase) CreatePartner(ctx context.Context, input PartnerInput) (entity.Partner, error) {
	now := uc.Now()
	partner := entity.Partner{ID: uuid.NewString(), IsActive: true, CreatedAt: now}
	return uc.savePartner(ctx, partner, input, "")
}

func (uc *partnerUseCase) UpdatePartner(ctx context.Context, id string, input PartnerInput) (entity.Partner, error) {
	if _, err := uuid.Parse(id); err != nil {
		return entity.Partner{}, apperror.NotFound(msgPartnerNotFound)
	}
	partner, err := uc.Partners.GetPartner(ctx, id)
	if errors.Is(err, coreErrors.ErrPartnerNotFound) {
		return entity.Partner{}, apperror.NotFound(msgPartnerNotFound)
	}
	if err != nil {
		return entity.Partner{}, apperror.Internal(err)
	}
	return uc.savePartner(ctx, partner, input, partner.ID)
}

func (uc *partnerUseCase) SetPartnerStatus(ctx context.Context, id string, isActive bool) (entity.Partner, error) {
	if _, err := uuid.Parse(id); err != nil {
		return entity.Partner{}, apperror.NotFound(msgPartnerNotFound)
	}
	if err := uc.Partners.SetPartnerActive(ctx, id, isActive, uc.Now()); errors.Is(err, coreErrors.ErrPartnerNotFound) {
		return entity.Partner{}, apperror.NotFound(msgPartnerNotFound)
	} else if err != nil {
		return entity.Partner{}, apperror.Internal(err)
	}
	partner, err := uc.Partners.GetPartner(ctx, id)
	if errors.Is(err, coreErrors.ErrPartnerNotFound) {
		return entity.Partner{}, apperror.NotFound(msgPartnerNotFound)
	}
	if err != nil {
		return entity.Partner{}, apperror.Internal(err)
	}
	return partner, nil
}

func (uc *partnerUseCase) savePartner(ctx context.Context, partner entity.Partner, input PartnerInput, exceptID string) (entity.Partner, error) {
	partner.Name = strings.TrimSpace(input.Name)
	partner.Industry = strings.TrimSpace(input.Industry)
	partner.About = strings.TrimSpace(input.About)
	partner.UpdatedAt = uc.Now()

	fields := validateLength(nil, "name", partner.Name, partnerNameMinRunes)
	fields = validateLength(fields, "industry", partner.Industry, partnerNameMinRunes)
	fields = validateLength(fields, "about", partner.About, partnerAboutMinRunes)
	if len(fields) == 0 {
		taken, err := uc.Partners.PartnerNameTaken(ctx, partner.Name, exceptID)
		if err != nil {
			return entity.Partner{}, apperror.Internal(err)
		}
		if taken {
			fields = append(fields, apperror.FieldError{Field: "name", Message: msgPartnerNameTaken})
		}
	}
	if len(fields) > 0 {
		return entity.Partner{}, apperror.Validation(fields...)
	}

	err := uc.Partners.SavePartner(ctx, &partner)
	if errors.Is(err, coreErrors.ErrPartnerNameTaken) {
		return entity.Partner{}, apperror.Validation(apperror.FieldError{Field: "name", Message: msgPartnerNameTaken})
	}
	if err != nil {
		return entity.Partner{}, apperror.Internal(err)
	}
	return partner, nil
}

func (uc *partnerUseCase) CreateReviewer(ctx context.Context, input ReviewerInput) (CreatedReviewer, error) {
	name := strings.TrimSpace(input.Name)
	email := entity.NormalizeEmail(input.Email)
	jobTitle := strings.TrimSpace(input.JobTitle)
	fields := validateLength(nil, "name", name, reviewerNameMinRunes)
	if msg := entity.ValidateEmail(email); msg != "" {
		fields = append(fields, apperror.FieldError{Field: "email", Message: msg})
	}
	fields = validateLength(fields, "jobTitle", jobTitle, jobTitleMinRunes)
	if utf8.RuneCountInString(jobTitle) > jobTitleMaxRunes {
		fields = append(fields, apperror.FieldError{Field: "jobTitle", Message: fmt.Sprintf("Maksimal %d karakter.", jobTitleMaxRunes)})
	}
	if _, err := uuid.Parse(input.PartnerID); err != nil {
		fields = append(fields, apperror.FieldError{Field: "partnerId", Message: msgChoosePartner})
	} else if partner, err := uc.Partners.GetPartner(ctx, input.PartnerID); errors.Is(err, coreErrors.ErrPartnerNotFound) {
		fields = append(fields, apperror.FieldError{Field: "partnerId", Message: msgChoosePartner})
	} else if err != nil {
		return CreatedReviewer{}, apperror.Internal(err)
	} else if !partner.IsActive {
		fields = append(fields, apperror.FieldError{Field: "partnerId", Message: "Mitra sedang nonaktif."})
	}
	if len(fields) > 0 {
		return CreatedReviewer{}, apperror.Validation(fields...)
	}

	temporary, err := uc.temporaryPassword()
	if err != nil {
		return CreatedReviewer{}, apperror.Internal(err)
	}
	hash, err := uc.Hasher.Hash(temporary)
	if err != nil {
		return CreatedReviewer{}, apperror.Internal(err)
	}
	now := uc.Now()
	user := entity.User{
		ID: uuid.NewString(), Name: name, Email: email, PasswordHash: &hash, Role: entity.RoleReviewer,
		IsActive: true, IsOnboarded: true, MustChangePassword: true, ShareDefault: entity.ShareDefaultAsk,
		CreatedAt: now, UpdatedAt: now,
	}
	profile := entity.ReviewerProfile{UserID: user.ID, PartnerID: input.PartnerID, JobTitle: jobTitle, CreatedAt: now, UpdatedAt: now}
	err = uc.Partners.CreateReviewer(ctx, &user, &profile)
	if errors.Is(err, coreErrors.ErrEmailTaken) {
		return CreatedReviewer{}, apperror.Validation(apperror.FieldError{Field: "email", Message: msgEmailTaken})
	}
	if err != nil {
		return CreatedReviewer{}, apperror.Internal(err)
	}
	reviewer, err := uc.findReviewer(ctx, user.ID)
	if err != nil {
		return CreatedReviewer{}, err
	}
	return CreatedReviewer{Reviewer: reviewer, TemporaryPassword: temporary}, nil
}

// temporaryPassword membuat password acak yang memenuhi entity.ValidatePassword: diawali huruf dan
// diakhiri angka.
func (uc *partnerUseCase) temporaryPassword() (string, error) {
	random, err := uc.RandomBytes(entity.TemporaryPasswordLength)
	if err != nil {
		return "", err
	}
	const letters, digits = "abcdefghjkmnpqrstuvwxyz", "23456789"
	var b strings.Builder
	for i, value := range random {
		switch i {
		case 0:
			b.WriteByte(letters[int(value)%len(letters)])
		case len(random) - 1:
			b.WriteByte(digits[int(value)%len(digits)])
		default:
			b.WriteByte(passwordAlphabet[int(value)%len(passwordAlphabet)])
		}
	}
	return b.String(), nil
}

func (uc *partnerUseCase) SetReviewerCases(ctx context.Context, reviewerID string, caseIDs []string) (entity.ReviewerStat, error) {
	profile, err := uc.loadProfile(ctx, reviewerID)
	if err != nil {
		return entity.ReviewerStat{}, err
	}
	cases, err := uc.Partners.ListB2BCases(ctx)
	if err != nil {
		return entity.ReviewerStat{}, apperror.Internal(err)
	}
	allowed := make(map[string]bool, len(cases))
	for _, c := range cases {
		if c.PartnerID != nil && *c.PartnerID == profile.PartnerID {
			allowed[c.ID] = true
		}
	}
	unique := make([]string, 0, len(caseIDs))
	for _, id := range caseIDs {
		if !allowed[id] {
			return entity.ReviewerStat{}, apperror.Validation(apperror.FieldError{Field: "caseIds", Message: msgCaseNotOfPartner})
		}
		if !slices.Contains(unique, id) {
			unique = append(unique, id)
		}
	}

	blocked, err := uc.Partners.ReplaceAssignments(ctx, profile.UserID, unique, uc.Now())
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return entity.ReviewerStat{}, apperror.Conflict(fmt.Sprintf(
			"%d submission di case yang dilepas masih menunggu reviewer ini. Pindahkan dulu lewat Ganti reviewer.", blocked))
	}
	if err != nil {
		return entity.ReviewerStat{}, apperror.Internal(err)
	}
	return uc.findReviewer(ctx, profile.UserID)
}

func (uc *partnerUseCase) SetReviewerStatus(ctx context.Context, reviewerID string, isActive bool) (entity.ReviewerStat, error) {
	profile, err := uc.loadProfile(ctx, reviewerID)
	if err != nil {
		return entity.ReviewerStat{}, err
	}
	pending, err := uc.Partners.SetReviewerActive(ctx, profile.UserID, isActive, uc.Now())
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return entity.ReviewerStat{}, apperror.Conflict(fmt.Sprintf(
			"Masih ada %d submission menunggu reviewer ini. Pindahkan dulu lewat Ganti reviewer.", pending))
	}
	if errors.Is(err, coreErrors.ErrReviewerNotFound) {
		return entity.ReviewerStat{}, apperror.NotFound(msgReviewerNotFound)
	}
	if err != nil {
		return entity.ReviewerStat{}, apperror.Internal(err)
	}
	return uc.findReviewer(ctx, profile.UserID)
}

func (uc *partnerUseCase) loadProfile(ctx context.Context, reviewerID string) (entity.ReviewerProfile, error) {
	if _, err := uuid.Parse(reviewerID); err != nil {
		return entity.ReviewerProfile{}, apperror.NotFound(msgReviewerNotFound)
	}
	profile, err := uc.Partners.GetReviewerProfile(ctx, reviewerID)
	if errors.Is(err, coreErrors.ErrReviewerNotFound) {
		return entity.ReviewerProfile{}, apperror.NotFound(msgReviewerNotFound)
	}
	if err != nil {
		return entity.ReviewerProfile{}, apperror.Internal(err)
	}
	return profile, nil
}

func (uc *partnerUseCase) findReviewer(ctx context.Context, id string) (entity.ReviewerStat, error) {
	reviewers, err := uc.Partners.ListReviewers(ctx)
	if err != nil {
		return entity.ReviewerStat{}, apperror.Internal(err)
	}
	for _, reviewer := range reviewers {
		if reviewer.ID == id {
			return reviewer, nil
		}
	}
	return entity.ReviewerStat{}, apperror.NotFound(msgReviewerNotFound)
}

func validateLength(fields []apperror.FieldError, field, value string, minRunes int) []apperror.FieldError {
	length := utf8.RuneCountInString(value)
	switch {
	case length < minRunes:
		return append(fields, apperror.FieldError{Field: field, Message: fmt.Sprintf("Tulis minimal %d karakter.", minRunes)})
	case length > textMaxRunes:
		return append(fields, apperror.FieldError{Field: field, Message: fmt.Sprintf("Maksimal %d karakter.", textMaxRunes)})
	}
	return fields
}
