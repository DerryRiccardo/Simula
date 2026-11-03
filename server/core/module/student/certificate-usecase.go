package student

import (
	"context"
	"errors"
	"strings"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

const (
	msgCertificateNotFound = "Sertifikat tidak ditemukan."
	// certificateIDMaxLength sama dengan CHECK public_id di tabel certificates.
	certificateIDMaxLength = 32
)

// CertificateVerification adalah isi halaman verifikasi publik (ICertificateVerification di client).
type CertificateVerification struct {
	Certificate  entity.Certificate
	Case         entity.Case
	ReviewerRole string
	IsOwner      bool
}

// CertificateUseCase melayani verifikasi sertifikat untuk recruiter (tanpa login).
type CertificateUseCase interface {
	Verify(ctx context.Context, publicID string) (CertificateVerification, error)
}

// CertificateDeps adalah dependency use case sertifikat.
type CertificateDeps struct {
	Certificates coreRepo.CertificateRepository
	Cases        coreRepo.CaseRepository
}

type certificateUseCase struct {
	CertificateDeps
}

// InitCertificateUseCase membuat use case sertifikat.
func InitCertificateUseCase(deps CertificateDeps) CertificateUseCase {
	return &certificateUseCase{CertificateDeps: deps}
}

func (uc *certificateUseCase) Verify(ctx context.Context, publicID string) (CertificateVerification, error) {
	publicID = strings.ToUpper(strings.TrimSpace(publicID))
	if publicID == "" || len(publicID) > certificateIDMaxLength {
		return CertificateVerification{}, apperror.NotFound(msgCertificateNotFound)
	}
	certificate, err := uc.Certificates.GetByPublicID(ctx, publicID)
	if errors.Is(err, coreErrors.ErrCertificateNotFound) {
		return CertificateVerification{}, apperror.NotFound(msgCertificateNotFound)
	}
	if err != nil {
		return CertificateVerification{}, apperror.Internal(err)
	}
	c, err := uc.Cases.GetWithBriefByID(ctx, certificate.CaseID)
	if err != nil {
		return CertificateVerification{}, apperror.Internal(err)
	}

	verification := CertificateVerification{
		Certificate:  certificate,
		Case:         c,
		ReviewerRole: entity.ReviewerRoleFor(&c),
	}
	if current, ok := authctx.UserFrom(ctx); ok {
		verification.IsOwner = current.ID == certificate.UserID
	}
	return verification, nil
}
