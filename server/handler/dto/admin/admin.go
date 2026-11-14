// Package admin berisi DTO panel admin. Kontrak: client/src/types/partner.ts dan admin.ts.
package admin

import (
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	adminModule "github.com/DerryRiccardo/Simula/server/core/module/admin"
	studentDto "github.com/DerryRiccardo/Simula/server/handler/dto/student"
)

// --- Reviewer & Mitra ---

// PartnerRequest adalah IAdminPartnerInput.
type PartnerRequest struct {
	Name     string `json:"name"`
	Industry string `json:"industry"`
	About    string `json:"about"`
}

// ReviewerRequest adalah IAdminReviewerInput.
type ReviewerRequest struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	PartnerID string `json:"partnerId"`
	JobTitle  string `json:"jobTitle"`
}

// AssignmentRequest adalah IAdminReviewerAssignmentPayload.
type AssignmentRequest struct {
	CaseIDs []string `json:"caseIds"`
}

// StatusRequest adalah IAdminReviewerStatusPayload.
type StatusRequest struct {
	IsActive bool `json:"isActive"`
}

// PartnerResponse adalah IPartner.
type PartnerResponse struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Industry string `json:"industry"`
	About    string `json:"about"`
}

// AdminPartnerResponse adalah IAdminPartner.
type AdminPartnerResponse struct {
	PartnerResponse
	CaseCount           int `json:"caseCount"`
	ActiveReviewerCount int `json:"activeReviewerCount"`
	PendingReviewCount  int `json:"pendingReviewCount"`
}

// ReviewerResponse adalah IAdminReviewer. temporaryPassword hanya terisi saat reviewer baru dibuat.
type ReviewerResponse struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Email             string   `json:"email"`
	PartnerID         string   `json:"partnerId"`
	PartnerName       string   `json:"partnerName"`
	JobTitle          string   `json:"jobTitle"`
	IsActive          bool     `json:"isActive"`
	CaseIDs           []string `json:"caseIds"`
	PendingCount      int      `json:"pendingCount"`
	DecidedCount      int      `json:"decidedCount"`
	AverageReviewDays *float64 `json:"averageReviewDays"`
	TemporaryPassword *string  `json:"temporaryPassword"`
}

// PartnerCaseResponse adalah IAdminPartnerCase.
type PartnerCaseResponse struct {
	ID                  string  `json:"id"`
	Title               string  `json:"title"`
	FieldKey            string  `json:"fieldKey"`
	PartnerID           *string `json:"partnerId"`
	Status              string  `json:"status"`
	Price               int     `json:"price"`
	PendingReviewCount  int     `json:"pendingReviewCount"`
	ActiveReviewerCount int     `json:"activeReviewerCount"`
}

// PartnerDirectoryResponse adalah IAdminPartnerDirectory.
type PartnerDirectoryResponse struct {
	Partners  []AdminPartnerResponse `json:"partners"`
	Reviewers []ReviewerResponse     `json:"reviewers"`
	Cases     []PartnerCaseResponse  `json:"cases"`
}

// MapPartnerReqToInput memetakan form mitra.
func MapPartnerReqToInput(req PartnerRequest) adminModule.PartnerInput {
	return adminModule.PartnerInput{Name: req.Name, Industry: req.Industry, About: req.About}
}

// MapReviewerReqToInput memetakan form reviewer.
func MapReviewerReqToInput(req ReviewerRequest) adminModule.ReviewerInput {
	return adminModule.ReviewerInput{Name: req.Name, Email: req.Email, PartnerID: req.PartnerID, JobTitle: req.JobTitle}
}

// MapPartner memetakan mitra.
func MapPartner(p entity.Partner) PartnerResponse {
	return PartnerResponse{ID: p.ID, Name: p.Name, Industry: p.Industry, About: p.About}
}

// MapReviewer memetakan reviewer.
func MapReviewer(r entity.ReviewerStat) ReviewerResponse {
	caseIDs := make([]string, 0, len(r.CaseIDs))
	caseIDs = append(caseIDs, r.CaseIDs...)
	return ReviewerResponse{
		ID: r.ID, Name: r.Name, Email: r.Email, PartnerID: r.PartnerID, PartnerName: r.PartnerName,
		JobTitle: r.JobTitle, IsActive: r.IsActive, CaseIDs: caseIDs, PendingCount: r.PendingCount,
		DecidedCount: len(r.Decisions), AverageReviewDays: r.AverageReviewDays(),
	}
}

// MapCreatedReviewer memetakan reviewer baru beserta password sementaranya.
func MapCreatedReviewer(c adminModule.CreatedReviewer) ReviewerResponse {
	response := MapReviewer(c.Reviewer)
	response.TemporaryPassword = &c.TemporaryPassword
	return response
}

// MapDirectoryToResponse memetakan menu Reviewer & Mitra.
func MapDirectoryToResponse(d entity.PartnerDirectory) PartnerDirectoryResponse {
	response := PartnerDirectoryResponse{
		Partners:  make([]AdminPartnerResponse, 0, len(d.Partners)),
		Reviewers: make([]ReviewerResponse, 0, len(d.Reviewers)),
		Cases:     make([]PartnerCaseResponse, 0, len(d.Cases)),
	}
	for _, p := range d.Partners {
		response.Partners = append(response.Partners, AdminPartnerResponse{
			PartnerResponse: MapPartner(p.Partner), CaseCount: p.CaseCount,
			ActiveReviewerCount: p.ActiveReviewerCount, PendingReviewCount: p.PendingReviewCount,
		})
	}
	for _, r := range d.Reviewers {
		response.Reviewers = append(response.Reviewers, MapReviewer(r))
	}
	for _, c := range d.Cases {
		price := 0
		if c.Price != nil {
			price = *c.Price
		}
		response.Cases = append(response.Cases, PartnerCaseResponse{
			ID: c.ID, Title: c.Title, FieldKey: c.FieldKey, PartnerID: c.PartnerID, Status: string(c.Status),
			Price: price, PendingReviewCount: c.PendingReviewCount, ActiveReviewerCount: c.ActiveReviewerCount,
		})
	}
	return response
}

// --- Penilaian ---

// FlagRequest adalah IAdminFlagPayload.
type FlagRequest struct {
	IsFlagged bool   `json:"isFlagged"`
	Note      string `json:"note"`
}

// ReassignRequest adalah IAdminReassignPayload.
type ReassignRequest struct {
	ReviewerID string `json:"reviewerId"`
}

// ReviewItemResponse adalah IAdminReviewItem.
type ReviewItemResponse struct {
	ID             string     `json:"id"`
	Tier           string     `json:"tier"`
	MemberID       string     `json:"memberId"`
	MemberName     string     `json:"memberName"`
	MemberEmail    string     `json:"memberEmail"`
	CaseID         string     `json:"caseId"`
	CaseTitle      string     `json:"caseTitle"`
	PartnerName    *string    `json:"partnerName"`
	ReviewerID     *string    `json:"reviewerId"`
	ReviewerName   *string    `json:"reviewerName"`
	ReviewerRole   *string    `json:"reviewerRole"`
	Status         string     `json:"status"`
	Attempt        int        `json:"attempt"`
	SubmittedAt    time.Time  `json:"submittedAt"`
	ReviewDueAt    *time.Time `json:"reviewDueAt"`
	DecidedAt      *time.Time `json:"decidedAt"`
	Score          *int       `json:"score"`
	PassingScore   int        `json:"passingScore"`
	CertificateID  *string    `json:"certificateId"`
	IsFlagged      bool       `json:"isFlagged"`
	LastReminderAt *time.Time `json:"lastReminderAt"`
	IsRecommended  bool       `json:"isRecommended"`
}

// CaseGradingStatResponse adalah IAdminCaseGradingStat.
type CaseGradingStatResponse struct {
	CaseID       string `json:"caseId"`
	CaseTitle    string `json:"caseTitle"`
	GradedCount  int    `json:"gradedCount"`
	PassedCount  int    `json:"passedCount"`
	AverageScore *int   `json:"averageScore"`
	FlaggedCount int    `json:"flaggedCount"`
}

// ReviewListResponse adalah IAdminReviewList.
type ReviewListResponse struct {
	Items       []ReviewItemResponse      `json:"items"`
	AICaseStats []CaseGradingStatResponse `json:"aiCaseStats"`
}

// FlagResponse adalah IAdminFlag.
type FlagResponse struct {
	Note      string    `json:"note"`
	FlaggedAt time.Time `json:"flaggedAt"`
}

// ReassignOptionResponse adalah IAdminReassignOption.
type ReassignOptionResponse struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	JobTitle         string `json:"jobTitle"`
	PendingCount     int    `json:"pendingCount"`
	IsAssignedToCase bool   `json:"isAssignedToCase"`
}

// StatusEventResponse adalah IStatusEvent.
type StatusEventResponse struct {
	Type    string    `json:"type"`
	At      time.Time `json:"at"`
	Attempt *int      `json:"attempt"`
}

// ReviewDetailResponse adalah IAdminReviewDetail.
type ReviewDetailResponse struct {
	Item            ReviewItemResponse                   `json:"item"`
	CaseInfo        studentDto.CaseDetailResponse        `json:"caseInfo"`
	Brief           studentDto.CaseBriefResponse         `json:"brief"`
	Submission      *studentDto.SubmissionRecordResponse `json:"submission"`
	LastRevision    *studentDto.RevisionResponse         `json:"lastRevision"`
	Review          *studentDto.ReviewResultResponse     `json:"review"`
	Events          []StatusEventResponse                `json:"events"`
	Flag            *FlagResponse                        `json:"flag"`
	CanRegrade      bool                                 `json:"canRegrade"`
	CanRemind       bool                                 `json:"canRemind"`
	ReassignOptions []ReassignOptionResponse             `json:"reassignOptions"`
}

// MapReviewListToResponse memetakan menu Penilaian.
func MapReviewListToResponse(list adminModule.ReviewList) ReviewListResponse {
	response := ReviewListResponse{
		Items:       make([]ReviewItemResponse, 0, len(list.Rows)),
		AICaseStats: make([]CaseGradingStatResponse, 0, len(list.AICaseStats)),
	}
	for _, row := range list.Rows {
		response.Items = append(response.Items, MapReviewItem(row))
	}
	for _, stat := range list.AICaseStats {
		response.AICaseStats = append(response.AICaseStats, CaseGradingStatResponse(stat))
	}
	return response
}

// MapReviewItem memetakan satu baris Penilaian.
func MapReviewItem(row entity.AdminReviewRow) ReviewItemResponse {
	e := row.Enrollment
	item := ReviewItemResponse{
		ID: e.ID, Tier: string(e.Tier()), MemberID: e.UserID, MemberName: row.MemberName, MemberEmail: row.MemberEmail,
		CaseID: e.CaseID, Status: string(e.Status), Attempt: 1, SubmittedAt: adminModule.SubmittedAt(row).UTC(),
		DecidedAt: utcPtr(row.DecidedAt()), Score: e.Score, IsFlagged: row.Flag != nil,
		LastReminderAt: utcPtr(e.LastReminderAt), CertificateID: e.CertificatePublicID(),
	}
	if c := e.Case; c != nil {
		item.CaseTitle = c.Title
		item.PassingScore = c.PassingScore
		item.PartnerName = c.PartnerName()
	}
	if s := row.Submission; s != nil {
		item.Attempt = s.Attempt
		if s.Review != nil {
			item.IsRecommended = s.Review.IsRecommended
		}
	}
	if e.Tier() == entity.TierB2B {
		if e.Status == entity.EnrollmentInReview {
			item.ReviewDueAt = utcPtr(e.ReviewDueAt)
		}
		if row.Holder != nil {
			item.ReviewerID = &row.Holder.ID
			item.ReviewerName = &row.Holder.Name
		}
		role := reviewerRole(row)
		item.ReviewerRole = &role
	}
	return item
}

// reviewerRole: peran di hasil yang sudah dinilai, lalu jabatan pemegang, lalu peran penilai case.
func reviewerRole(row entity.AdminReviewRow) string {
	if s := row.Submission; s != nil && s.Review != nil && s.Review.ReviewerRole != "" {
		return s.Review.ReviewerRole
	}
	if row.Holder != nil && row.Holder.JobTitle != "" {
		return row.Holder.JobTitle
	}
	if row.Enrollment.Case != nil {
		return entity.ReviewerRoleFor(row.Enrollment.Case)
	}
	return entity.FallbackReviewerRole
}

// MapReviewDetailToResponse memetakan halaman detail penilaian.
func MapReviewDetailToResponse(d adminModule.ReviewDetail) ReviewDetailResponse {
	row := d.Row
	response := ReviewDetailResponse{
		Item:            MapReviewItem(row),
		CaseInfo:        studentDto.MapCaseInfo(d.Case, nil),
		Brief:           studentDto.MapBrief(d.Case),
		Events:          make([]StatusEventResponse, 0, len(d.Events)),
		CanRegrade:      row.CanRegrade(),
		CanRemind:       d.CanRemind,
		ReassignOptions: make([]ReassignOptionResponse, 0, len(d.ReassignOptions)),
	}
	if row.Submission != nil {
		response.Submission = studentDto.MapSubmissionRecord(row.Submission, d.DownloadURLs)
		if row.Submission.Review != nil {
			review := studentDto.MapReviewResult(*row.Submission.Review)
			response.Review = &review
		}
	}
	if d.LastRevision != nil {
		revision := studentDto.MapRevision(*d.LastRevision, reviewerRole(row))
		response.LastRevision = &revision
	}
	for _, event := range d.Events {
		response.Events = append(response.Events, StatusEventResponse{Type: string(event.Type), At: event.At.UTC(), Attempt: event.Attempt})
	}
	if row.Flag != nil {
		response.Flag = &FlagResponse{Note: row.Flag.Note, FlaggedAt: row.Flag.FlaggedAt.UTC()}
	}
	for _, option := range d.ReassignOptions {
		response.ReassignOptions = append(response.ReassignOptions, ReassignOptionResponse(option))
	}
	return response
}

func utcPtr(t *time.Time) *time.Time {
	if t == nil {
		return nil
	}
	utc := t.UTC()
	return &utc
}
