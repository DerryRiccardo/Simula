package admin

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

const (
	msgTalentNotFound      = "Kandidat tidak ditemukan di talent pool."
	msgTalentNotConsented  = "Kandidat belum menyetujui profilnya dibagikan ke mitra."
	msgTalentAlreadyShared = "Profil kandidat ini sudah diteruskan ke mitra."
)

// TalentPoolUseCase melayani menu Talent pool panel admin.
type TalentPoolUseCase interface {
	ListTalentPool(ctx context.Context) ([]entity.TalentCandidate, error)
	ShareTalent(ctx context.Context, enrollmentID string) (entity.TalentCandidate, error)
}

// TalentPoolDeps adalah dependency use case Talent pool admin.
type TalentPoolDeps struct {
	TalentPool coreRepo.AdminTalentPoolRepository
	Now        func() time.Time
}

type talentPoolUseCase struct {
	TalentPoolDeps
}

// InitTalentPoolUseCase membuat use case Talent pool admin.
func InitTalentPoolUseCase(deps TalentPoolDeps) TalentPoolUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &talentPoolUseCase{TalentPoolDeps: deps}
}

func (uc *talentPoolUseCase) ListTalentPool(ctx context.Context) ([]entity.TalentCandidate, error) {
	candidates, err := uc.TalentPool.ListCandidates(ctx, entity.AdminTalentPoolLimit)
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return candidates, nil
}

func (uc *talentPoolUseCase) ShareTalent(
	ctx context.Context, enrollmentID string,
) (entity.TalentCandidate, error) {
	if _, err := uuid.Parse(enrollmentID); err != nil {
		return entity.TalentCandidate{}, apperror.NotFound(msgTalentNotFound)
	}
	candidate, err := uc.TalentPool.GetCandidate(ctx, enrollmentID)
	if errors.Is(err, coreErrors.ErrEnrollmentNotFound) {
		return entity.TalentCandidate{}, apperror.NotFound(msgTalentNotFound)
	}
	if err != nil {
		return entity.TalentCandidate{}, apperror.Internal(err)
	}
	if candidate.Consent != "granted" {
		return entity.TalentCandidate{}, apperror.Conflict(msgTalentNotConsented)
	}
	if candidate.SharedAt != nil {
		return entity.TalentCandidate{}, apperror.Conflict(msgTalentAlreadyShared)
	}

	now := uc.Now()
	err = uc.TalentPool.ShareCandidate(ctx, enrollmentID, now)
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return entity.TalentCandidate{}, apperror.Conflict(msgTalentAlreadyShared)
	}
	if err != nil {
		return entity.TalentCandidate{}, apperror.Internal(err)
	}
	candidate.SharedAt = &now
	return candidate, nil
}
