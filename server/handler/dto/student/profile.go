package student

import (
	"github.com/DerryRiccardo/Simula/server/core/entity"
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	authDto "github.com/DerryRiccardo/Simula/server/handler/dto/auth"
)

// ProfileDetailsRequest adalah body PATCH /api/users/me/profile (IProfileDetailsPayload).
type ProfileDetailsRequest struct {
	Name          string   `json:"name"`
	Institution   *string  `json:"institution"`
	Major         *string  `json:"major"`
	StudentStatus string   `json:"studentStatus"`
	LinkedinURL   *string  `json:"linkedinUrl"`
	FieldKeys     []string `json:"fieldKeys"`
}

// DataSharingRequest adalah body PUT /api/users/me/data-sharing (IDataSharingPayload).
type DataSharingRequest struct {
	ShareDefault string `json:"shareDefault"`
}

// SharedProfileResponse adalah ISharedProfile di client.
type SharedProfileResponse struct {
	EnrollmentID string `json:"enrollmentId"`
	CaseTitle    string `json:"caseTitle"`
	PartnerName  string `json:"partnerName"`
	Consent      string `json:"consent"`
}

// ProfileResponse adalah IProfile di client.
type ProfileResponse struct {
	User           authDto.UserResponse    `json:"user"`
	Institution    *string                 `json:"institution"`
	LinkedinURL    *string                 `json:"linkedinUrl"`
	ShareDefault   string                  `json:"shareDefault"`
	SharedProfiles []SharedProfileResponse `json:"sharedProfiles"`
}

// MapProfileDetailsReqToInput memetakan body PATCH /api/users/me/profile ke input use case.
func MapProfileDetailsReqToInput(req ProfileDetailsRequest) studentModule.ProfileDetailsInput {
	return studentModule.ProfileDetailsInput{
		Name:          req.Name,
		Institution:   req.Institution,
		Major:         req.Major,
		StudentStatus: req.StudentStatus,
		LinkedinURL:   req.LinkedinURL,
		FieldKeys:     req.FieldKeys,
	}
}

// MapProfileToResponse memetakan StudentProfile ke IProfile.
func MapProfileToResponse(p entity.StudentProfile) ProfileResponse {
	shareDefault := string(p.User.ShareDefault)
	if !p.User.ShareDefault.IsValid() {
		shareDefault = string(entity.ShareDefaultAsk)
	}
	shared := make([]SharedProfileResponse, 0, len(p.SharedProfiles))
	for _, item := range p.SharedProfiles {
		shared = append(shared, SharedProfileResponse{
			EnrollmentID: item.EnrollmentID,
			CaseTitle:    item.CaseTitle,
			PartnerName:  item.PartnerName,
			Consent:      item.Consent,
		})
	}
	return ProfileResponse{
		User:           authDto.MapUserToResponse(p.User),
		Institution:    p.User.Institution,
		LinkedinURL:    p.User.LinkedinURL,
		ShareDefault:   shareDefault,
		SharedProfiles: shared,
	}
}
