package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

const (
	msgGoogleOnly       = "Akun ini masuk lewat Google, jadi tidak memakai kata sandi."
	msgWrongPassword    = "Kata sandi saat ini salah."
	msgSamePassword     = "Gunakan kata sandi yang berbeda dari sebelumnya."
	changePasswordLimit = 10
)

// ChangePasswordInput adalah isi form ganti kata sandi.
type ChangePasswordInput struct {
	CurrentPassword string
	NewPassword     string
}

// ChangePassword mengganti kata sandi user yang sedang masuk dan mematikan tanda wajib ganti
// (akun reviewer baru memakai kata sandi sementara dari admin). Sesi yang ada tetap berlaku.
func (uc *authUseCase) ChangePassword(ctx context.Context, in ChangePasswordInput) (entity.User, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.User{}, apperror.Unauthenticated("")
	}
	limit := entity.RateLimit{Limit: changePasswordLimit, Window: entity.LoginRateLimit.Window}
	if err := uc.checkRateLimit(ctx, "change_password:"+current.ID, limit); err != nil {
		return entity.User{}, err
	}
	user, err := uc.Users.GetByID(ctx, current.ID)
	if errors.Is(err, coreErrors.ErrUserNotFound) {
		return entity.User{}, apperror.Unauthenticated("")
	}
	if err != nil {
		return entity.User{}, apperror.Internal(fmt.Errorf("failed to get user: %w", err))
	}
	if user.PasswordHash == nil {
		return entity.User{}, apperror.Validation(apperror.FieldError{Field: "currentPassword", Message: msgGoogleOnly})
	}
	if !uc.Hasher.Compare(*user.PasswordHash, in.CurrentPassword) {
		return entity.User{}, apperror.Validation(apperror.FieldError{Field: "currentPassword", Message: msgWrongPassword})
	}
	if msg := entity.ValidatePassword(in.NewPassword); msg != "" {
		return entity.User{}, apperror.Validation(apperror.FieldError{Field: "newPassword", Message: msg})
	}
	if in.NewPassword == in.CurrentPassword {
		return entity.User{}, apperror.Validation(apperror.FieldError{Field: "newPassword", Message: msgSamePassword})
	}

	hash, err := uc.Hasher.Hash(in.NewPassword)
	if err != nil {
		return entity.User{}, apperror.Internal(err)
	}
	if err := uc.Users.UpdatePassword(ctx, user.ID, hash, uc.Now()); err != nil {
		return entity.User{}, apperror.Internal(err)
	}
	return uc.Me(ctx)
}
