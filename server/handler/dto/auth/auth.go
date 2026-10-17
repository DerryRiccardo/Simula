// Package auth berisi DTO untuk endpoint auth dan onboarding. Bentuknya mengikuti
// client/src/types/auth.ts.
package auth

import (
	"github.com/DerryRiccardo/Simula/server/core/entity"
	authModule "github.com/DerryRiccardo/Simula/server/core/module/auth"
)

// RegisterRequest adalah body POST /api/auth/register (IRegisterPayload).
type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginRequest adalah body POST /api/auth/login (ILoginPayload).
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// OnboardingRequest adalah body PATCH /api/users/me/onboarding (IOnboardingPayload).
type OnboardingRequest struct {
	FieldKeys     []string `json:"fieldKeys"`
	StudentStatus string   `json:"studentStatus"`
	Major         *string  `json:"major"`
}

// UserResponse adalah IUser di client.
type UserResponse struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Email         string   `json:"email"`
	Role          string   `json:"role"`
	IsOnboarded   bool     `json:"isOnboarded"`
	FieldKeys     []string `json:"fieldKeys"`
	StudentStatus *string  `json:"studentStatus"`
	Major         *string  `json:"major"`
}

// MapRegisterReqToInput memetakan request ke input use case.
func MapRegisterReqToInput(req RegisterRequest) authModule.RegisterInput {
	return authModule.RegisterInput{Name: req.Name, Email: req.Email, Password: req.Password}
}

// MapLoginReqToInput memetakan request ke input use case.
func MapLoginReqToInput(req LoginRequest) authModule.LoginInput {
	return authModule.LoginInput{Email: req.Email, Password: req.Password}
}

// MapOnboardingReqToInput memetakan request ke input use case.
func MapOnboardingReqToInput(req OnboardingRequest) authModule.OnboardingInput {
	return authModule.OnboardingInput{FieldKeys: req.FieldKeys, StudentStatus: req.StudentStatus, Major: req.Major}
}

// MapUserToResponse memetakan entity ke IUser.
func MapUserToResponse(user entity.User) UserResponse {
	var status *string
	if user.StudentStatus != nil {
		value := string(*user.StudentStatus)
		status = &value
	}
	return UserResponse{
		ID:            user.ID,
		Name:          user.Name,
		Email:         user.Email,
		Role:          string(user.Role),
		IsOnboarded:   user.IsOnboarded,
		FieldKeys:     user.FieldKeys(),
		StudentStatus: status,
		Major:         user.Major,
	}
}
