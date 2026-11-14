package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

func reviewerWithTemporaryPassword() entity.User {
	user := passwordUser("reviewer-1", "andika@sagara.co.id", "sementara1")
	user.Role = entity.RoleReviewer
	user.MustChangePassword = true
	return user
}

func TestChangePassword(t *testing.T) {
	t.Run("replaces the temporary password and clears the flag", func(t *testing.T) {
		env := newTestEnv(reviewerWithTemporaryPassword())

		user, err := env.uc.ChangePassword(ctxAs("reviewer-1", entity.RoleReviewer), ChangePasswordInput{
			CurrentPassword: "sementara1", NewPassword: "rahasiaBaru9",
		})

		require.NoError(t, err)
		assert.False(t, user.MustChangePassword)
		require.NotNil(t, user.PasswordHash)
		assert.Equal(t, "hashed:rahasiaBaru9", *user.PasswordHash)
	})

	tests := []struct {
		name      string
		input     ChangePasswordInput
		wantField string
	}{
		{name: "wrong current password", input: ChangePasswordInput{CurrentPassword: "salah123", NewPassword: "rahasiaBaru9"}, wantField: "currentPassword"},
		{name: "weak new password", input: ChangePasswordInput{CurrentPassword: "sementara1", NewPassword: "pendek"}, wantField: "newPassword"},
		{name: "same as before", input: ChangePasswordInput{CurrentPassword: "sementara1", NewPassword: "sementara1"}, wantField: "newPassword"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			env := newTestEnv(reviewerWithTemporaryPassword())

			_, err := env.uc.ChangePassword(ctxAs("reviewer-1", entity.RoleReviewer), tc.input)

			appErr := requireAppError(t, err, apperror.KindValidation)
			require.Len(t, appErr.Fields, 1)
			assert.Equal(t, tc.wantField, appErr.Fields[0].Field)
			stored, _ := env.users.GetByID(t.Context(), "reviewer-1")
			assert.True(t, stored.MustChangePassword, "nothing changes on validation errors")
		})
	}

	t.Run("google-only account", func(t *testing.T) {
		user := reviewerWithTemporaryPassword()
		user.PasswordHash = nil
		env := newTestEnv(user)

		_, err := env.uc.ChangePassword(ctxAs("reviewer-1", entity.RoleReviewer), ChangePasswordInput{CurrentPassword: "x", NewPassword: "rahasiaBaru9"})

		requireAppError(t, err, apperror.KindValidation)
	})

	t.Run("requires a session", func(t *testing.T) {
		env := newTestEnv()
		_, err := env.uc.ChangePassword(t.Context(), ChangePasswordInput{})
		requireAppError(t, err, apperror.KindUnauthenticated)
	})
}
