// Package errors berisi sentinel error yang dikembalikan repository. Use case memeriksanya dengan
// errors.Is lalu menerjemahkannya ke apperror.
package errors

import "errors"

var (
	ErrUserNotFound          = errors.New("user not found")
	ErrEmailTaken            = errors.New("email already registered")
	ErrRefreshTokenNotFound  = errors.New("refresh token not found")
	ErrRefreshTokenRotated   = errors.New("refresh token already rotated")
	ErrInvalidAccessToken    = errors.New("invalid access token")
	ErrGoogleIdentityInvalid = errors.New("invalid google identity")
	ErrCaseNotFound          = errors.New("case not found")
	ErrEnrollmentNotFound    = errors.New("enrollment not found")
	ErrEnrollmentExists      = errors.New("enrollment already exists")
	ErrCandidateNumberTaken  = errors.New("candidate number already used")
	// ErrStatusConflict berarti status sudah berubah oleh request lain sebelum update ini.
	ErrStatusConflict  = errors.New("status changed concurrently")
	ErrObjectNotFound  = errors.New("storage object not found")
	ErrStorageDisabled = errors.New("storage is not configured")
)
