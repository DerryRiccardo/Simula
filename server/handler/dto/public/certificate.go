package public

import (
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	studentDto "github.com/DerryRiccardo/Simula/server/handler/dto/student"
)

// CertificateVerificationResponse adalah ICertificateVerification (client/src/types/certificate.ts).
type CertificateVerificationResponse struct {
	Certificate  studentDto.CertificateResponse `json:"certificate"`
	CaseSlug     string                         `json:"caseSlug"`
	Skills       []string                       `json:"skills"`
	ReviewerRole string                         `json:"reviewerRole"`
	Partner      *studentDto.PartnerResponse    `json:"partner"`
	PassingScore int                            `json:"passingScore"`
	IsOwner      bool                           `json:"isOwner"`
}

// MapCertificateVerificationToResponse memetakan halaman verifikasi. AI case tidak punya mitra
// (sertifikat diterbitkan platform).
func MapCertificateVerificationToResponse(v studentModule.CertificateVerification) CertificateVerificationResponse {
	skills := make([]string, 0, len(v.Case.Skills))
	skills = append(skills, v.Case.Skills...)
	response := CertificateVerificationResponse{
		Certificate:  studentDto.MapCertificate(v.Certificate),
		CaseSlug:     v.Case.Slug,
		Skills:       skills,
		ReviewerRole: v.ReviewerRole,
		PassingScore: v.Case.PassingScore,
		IsOwner:      v.IsOwner,
	}
	if v.Case.Partner != nil {
		response.Partner = &studentDto.PartnerResponse{
			Name:     v.Case.Partner.Name,
			Industry: v.Case.Partner.Industry,
			About:    v.Case.Partner.About,
		}
	}
	return response
}
