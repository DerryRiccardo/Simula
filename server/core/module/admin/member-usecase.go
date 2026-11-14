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

const msgMemberNotFound = "Member tidak ditemukan."

// MemberUseCase melayani menu Member panel admin.
type MemberUseCase interface {
	ListMembers(ctx context.Context) ([]entity.AdminMemberSummary, error)
	GetMember(ctx context.Context, memberID string) (entity.AdminMemberDetail, error)
}

// MemberDeps adalah dependency use case Member admin.
type MemberDeps struct {
	Members coreRepo.AdminMemberRepository
	Now     func() time.Time
}

type memberUseCase struct {
	MemberDeps
}

// InitMemberUseCase membuat use case Member admin.
func InitMemberUseCase(deps MemberDeps) MemberUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &memberUseCase{MemberDeps: deps}
}

func (uc *memberUseCase) ListMembers(ctx context.Context) ([]entity.AdminMemberSummary, error) {
	members, err := uc.Members.ListMembers(ctx, entity.AdminMemberListLimit)
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return members, nil
}

func (uc *memberUseCase) GetMember(ctx context.Context, memberID string) (entity.AdminMemberDetail, error) {
	if _, err := uuid.Parse(memberID); err != nil {
		return entity.AdminMemberDetail{}, apperror.NotFound(msgMemberNotFound)
	}
	detail, err := uc.Members.GetMember(ctx, memberID)
	if errors.Is(err, coreErrors.ErrUserNotFound) {
		return entity.AdminMemberDetail{}, apperror.NotFound(msgMemberNotFound)
	}
	if err != nil {
		return entity.AdminMemberDetail{}, apperror.Internal(err)
	}
	now := uc.Now()
	for i := range detail.Orders {
		detail.Orders[i].Order.Status = detail.Orders[i].EffectiveStatus(now)
	}
	return detail, nil
}
