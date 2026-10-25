// Package student berisi DTO area mahasiswa. Bentuknya mengikuti client/src/types/case.ts.
package student

import (
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	paginationPkg "github.com/DerryRiccardo/Simula/server/pkg/pagination"
)

// CaseListQuery adalah query GET /api/cases (ICaseListParams).
type CaseListQuery struct {
	Tier            string `form:"tier"`
	Field           string `form:"field"`
	Level           string `form:"level"`
	Sort            string `form:"sort"`
	Search          string `form:"search"`
	ExcludeEnrolled bool   `form:"excludeEnrolled"`
	Page            int    `form:"page"`
	Limit           int    `form:"limit"`
}

// EnrollmentListQuery adalah query GET /api/me/enrollments (IEnrollmentListParams).
type EnrollmentListQuery struct {
	Tier   string `form:"tier"`
	Status string `form:"status"`
	Field  string `form:"field"`
	Search string `form:"search"`
	Sort   string `form:"sort"`
}

// CertificateListQuery adalah query GET /api/me/certificates.
type CertificateListQuery struct {
	Tier string `form:"tier"`
}

// StartCaseRequest adalah body POST /api/me/enrollments.
type StartCaseRequest struct {
	CaseID string `json:"caseId"`
}

// CaseSummaryResponse adalah ICaseSummary.
type CaseSummaryResponse struct {
	ID               string  `json:"id"`
	Slug             string  `json:"slug"`
	Title            string  `json:"title"`
	Summary          string  `json:"summary"`
	Tier             string  `json:"tier"`
	FieldKey         string  `json:"fieldKey"`
	Level            string  `json:"level"`
	DurationLabel    string  `json:"durationLabel"`
	DeliverableCount int     `json:"deliverableCount"`
	PartnerName      *string `json:"partnerName"`
	Price            *int    `json:"price"`
	ParticipantCount int     `json:"participantCount"`
	Rating           float64 `json:"rating"`
}

// DeliverableResponse adalah ICaseDeliverable.
type DeliverableResponse struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// CriterionResponse adalah ICaseCriterion.
type CriterionResponse struct {
	Name   string `json:"name"`
	Weight int    `json:"weight"`
}

// PartnerResponse adalah ICasePartner.
type PartnerResponse struct {
	Name     string `json:"name"`
	Industry string `json:"industry"`
	About    string `json:"about"`
}

// MyEnrollmentResponse adalah status enrollment user di halaman detail.
type MyEnrollmentResponse struct {
	Status string `json:"status"`
}

// CaseDetailResponse adalah ICaseDetail.
type CaseDetailResponse struct {
	CaseSummaryResponse
	About         string                `json:"about"`
	Activities    []string              `json:"activities"`
	Deliverables  []DeliverableResponse `json:"deliverables"`
	Skills        []string              `json:"skills"`
	Prerequisites []string              `json:"prerequisites"`
	Criteria      []CriterionResponse   `json:"criteria"`
	ReviewerRole  *string               `json:"reviewerRole"`
	Partner       *PartnerResponse      `json:"partner"`
	MyEnrollment  *MyEnrollmentResponse `json:"myEnrollment"`
}

// EnrollmentResponse adalah IEnrollment.
type EnrollmentResponse struct {
	ID            string              `json:"id"`
	CaseSummary   CaseSummaryResponse `json:"caseSummary"`
	Status        string              `json:"status"`
	DeadlineAt    *time.Time          `json:"deadlineAt"`
	UpdatedAt     time.Time           `json:"updatedAt"`
	Score         *int                `json:"score"`
	CertificateID *string             `json:"certificateId"`
}

// CertificateResponse adalah ICertificate.
type CertificateResponse struct {
	ID            string    `json:"id"`
	CaseTitle     string    `json:"caseTitle"`
	Tier          string    `json:"tier"`
	FieldKey      string    `json:"fieldKey"`
	RecipientName string    `json:"recipientName"`
	PartnerName   *string   `json:"partnerName"`
	Score         int       `json:"score"`
	IssuedAt      time.Time `json:"issuedAt"`
}

// DashboardStatsResponse adalah IDashboardSummary.stats.
type DashboardStatsResponse struct {
	TotalCount       int            `json:"totalCount"`
	StatusCounts     map[string]int `json:"statusCounts"`
	ActiveCount      int            `json:"activeCount"`
	InReviewCount    int            `json:"inReviewCount"`
	RevisionCount    int            `json:"revisionCount"`
	CertificateCount int            `json:"certificateCount"`
}

// DashboardResponse adalah IDashboardSummary.
type DashboardResponse struct {
	Stats            DashboardStatsResponse `json:"stats"`
	ActionItems      []EnrollmentResponse   `json:"actionItems"`
	Recommendations  []CaseSummaryResponse  `json:"recommendations"`
	HasPassedAICase  bool                   `json:"hasPassedAiCase"`
	HasPassedB2BCase bool                   `json:"hasPassedB2bCase"`
}

// MapCaseListQueryToInput memetakan query ke input use case.
func MapCaseListQueryToInput(q CaseListQuery) studentModule.CaseListInput {
	return studentModule.CaseListInput{
		Tier: q.Tier, Field: q.Field, Level: q.Level, Sort: q.Sort, Search: q.Search,
		ExcludeEnrolled: q.ExcludeEnrolled, Page: q.Page, Limit: q.Limit,
	}
}

// MapEnrollmentListQueryToInput memetakan query ke input use case.
func MapEnrollmentListQueryToInput(q EnrollmentListQuery) studentModule.EnrollmentListInput {
	return studentModule.EnrollmentListInput{Tier: q.Tier, Status: q.Status, Field: q.Field, Search: q.Search, Sort: q.Sort}
}

// MapCasePageToResponse memetakan satu halaman katalog.
func MapCasePageToResponse(page studentModule.CasePage) paginationPkg.Page[CaseSummaryResponse] {
	return paginationPkg.Page[CaseSummaryResponse]{Data: MapCaseSummaries(page.Cases), Metadata: page.Meta}
}

// MapCaseSummaries memetakan daftar ringkasan case. Hasilnya tidak pernah nil.
func MapCaseSummaries(cases []entity.Case) []CaseSummaryResponse {
	result := make([]CaseSummaryResponse, 0, len(cases))
	for i := range cases {
		result = append(result, MapCaseSummary(&cases[i]))
	}
	return result
}

// MapCaseSummary memetakan satu case ke kartu katalog.
func MapCaseSummary(c *entity.Case) CaseSummaryResponse {
	return CaseSummaryResponse{
		ID:               c.ID,
		Slug:             c.Slug,
		Title:            c.Title,
		Summary:          c.Summary,
		Tier:             string(c.Tier),
		FieldKey:         c.FieldKey,
		Level:            string(c.Level),
		DurationLabel:    c.DurationLabel,
		DeliverableCount: c.DeliverableCount,
		PartnerName:      c.PartnerName(),
		Price:            c.Price,
		ParticipantCount: c.ParticipantCount,
		Rating:           c.Rating,
	}
}

// MapCaseDetailToResponse memetakan detail case. Deliverable diambil dari slot submission dan
// kriteria tanpa deskripsi level, karena brief lengkap baru terbuka setelah mulai atau membayar.
func MapCaseDetailToResponse(result studentModule.CaseDetailResult) CaseDetailResponse {
	detail := &result.Detail
	response := CaseDetailResponse{
		CaseSummaryResponse: MapCaseSummary(detail),
		About:               detail.About,
		Activities:          nonNil(detail.Activities),
		Deliverables:        make([]DeliverableResponse, 0, len(detail.Slots)),
		Skills:              nonNil(detail.Skills),
		Prerequisites:       nonNil(detail.Prerequisites),
		Criteria:            make([]CriterionResponse, 0, len(detail.Rubric)),
		ReviewerRole:        detail.ReviewerRole,
	}
	for _, slot := range detail.Slots {
		response.Deliverables = append(response.Deliverables, DeliverableResponse{Title: slot.Title, Description: slot.Description})
	}
	for _, criterion := range detail.Rubric {
		response.Criteria = append(response.Criteria, CriterionResponse{Name: criterion.Name, Weight: criterion.Weight})
	}
	if detail.Partner != nil {
		response.Partner = &PartnerResponse{Name: detail.Partner.Name, Industry: detail.Partner.Industry, About: detail.Partner.About}
	}
	if result.MyEnrollmentStatus != nil {
		response.MyEnrollment = &MyEnrollmentResponse{Status: string(*result.MyEnrollmentStatus)}
	}
	return response
}

// MapEnrollments memetakan daftar enrollment. Hasilnya tidak pernah nil.
func MapEnrollments(enrollments []entity.Enrollment) []EnrollmentResponse {
	result := make([]EnrollmentResponse, 0, len(enrollments))
	for i := range enrollments {
		result = append(result, MapEnrollment(&enrollments[i]))
	}
	return result
}

// MapEnrollment memetakan satu enrollment. Case wajib sudah dimuat repository.
func MapEnrollment(e *entity.Enrollment) EnrollmentResponse {
	var summary CaseSummaryResponse
	if e.Case != nil {
		summary = MapCaseSummary(e.Case)
	}
	return EnrollmentResponse{
		ID:            e.ID,
		CaseSummary:   summary,
		Status:        string(e.Status),
		DeadlineAt:    utcPtr(e.DeadlineAt),
		UpdatedAt:     e.UpdatedAt.UTC(),
		Score:         e.Score,
		CertificateID: e.CertificatePublicID(),
	}
}

// MapCertificates memetakan daftar sertifikat. ID yang dikirim adalah public_id untuk tautan
// verifikasi. Hasilnya tidak pernah nil.
func MapCertificates(certificates []entity.Certificate) []CertificateResponse {
	result := make([]CertificateResponse, 0, len(certificates))
	for _, c := range certificates {
		result = append(result, CertificateResponse{
			ID:            c.PublicID,
			CaseTitle:     c.CaseTitle,
			Tier:          string(c.Tier),
			FieldKey:      c.FieldKey,
			RecipientName: c.RecipientName,
			PartnerName:   c.PartnerName,
			Score:         c.Score,
			IssuedAt:      c.IssuedAt.UTC(),
		})
	}
	return result
}

// MapDashboardToResponse memetakan dashboard.
func MapDashboardToResponse(d studentModule.Dashboard) DashboardResponse {
	counts := make(map[string]int, len(d.Stats.StatusCounts))
	for status, count := range d.Stats.StatusCounts {
		counts[string(status)] = count
	}
	return DashboardResponse{
		Stats: DashboardStatsResponse{
			TotalCount:       d.Stats.TotalCount,
			StatusCounts:     counts,
			ActiveCount:      d.Stats.ActiveCount,
			InReviewCount:    d.Stats.InReviewCount,
			RevisionCount:    d.Stats.RevisionCount,
			CertificateCount: d.Stats.CertificateCount,
		},
		ActionItems:      MapEnrollments(d.ActionItems),
		Recommendations:  MapCaseSummaries(d.Recommendations),
		HasPassedAICase:  d.HasPassedAICase,
		HasPassedB2BCase: d.HasPassedB2BCase,
	}
}

func nonNil(items []string) []string {
	if items == nil {
		return []string{}
	}
	return items
}

func utcPtr(t *time.Time) *time.Time {
	if t == nil {
		return nil
	}
	utc := t.UTC()
	return &utc
}
