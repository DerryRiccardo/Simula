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
	IsActive bool   `json:"isActive"`
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
	return PartnerResponse{ID: p.ID, Name: p.Name, Industry: p.Industry, About: p.About, IsActive: p.IsActive}
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

// --- Dashboard (Ringkasan) ---

// OverviewStatsResponse adalah IAdminOverviewStats.
type OverviewStatsResponse struct {
	MemberCount              int `json:"memberCount"`
	ActiveMemberCount        int `json:"activeMemberCount"`
	PublishedCaseCount       int `json:"publishedCaseCount"`
	AICaseCount              int `json:"aiCaseCount"`
	B2BCaseCount             int `json:"b2bCaseCount"`
	DraftCaseCount           int `json:"draftCaseCount"`
	PendingReviewCount       int `json:"pendingReviewCount"`
	OverdueReviewCount       int `json:"overdueReviewCount"`
	RevenueLast30Days        int `json:"revenueLast30Days"`
	PaidOrderCountLast30Days int `json:"paidOrderCountLast30Days"`
	AwaitingPaymentCount     int `json:"awaitingPaymentCount"`
	AIGradedCount            int `json:"aiGradedCount"`
	AIPassedCount            int `json:"aiPassedCount"`
}

// ActionItemResponse adalah IAdminActionItem.
type ActionItemResponse struct {
	ID           string    `json:"id"`
	Kind         string    `json:"kind"`
	EnrollmentID *string   `json:"enrollmentId"`
	CaseID       string    `json:"caseId"`
	CaseTitle    string    `json:"caseTitle"`
	MemberName   *string   `json:"memberName"`
	At           time.Time `json:"at"`
	PartnerName  *string   `json:"partnerName"`
}

// ActivityResponse adalah IAdminActivity.
type ActivityResponse struct {
	ID         string    `json:"id"`
	Type       string    `json:"type"`
	MemberName string    `json:"memberName"`
	CaseID     string    `json:"caseId"`
	CaseTitle  string    `json:"caseTitle"`
	Tier       string    `json:"tier"`
	At         time.Time `json:"at"`
}

// OverviewResponse adalah IAdminOverview.
type OverviewResponse struct {
	Stats       OverviewStatsResponse `json:"stats"`
	ActionItems []ActionItemResponse  `json:"actionItems"`
	Activities  []ActivityResponse    `json:"activities"`
}

// MapOverviewToResponse memetakan menu Dashboard (Ringkasan).
func MapOverviewToResponse(o entity.AdminOverview) OverviewResponse {
	res := OverviewResponse{
		Stats:       OverviewStatsResponse(o.Stats),
		ActionItems: make([]ActionItemResponse, 0, len(o.ActionItems)),
		Activities:  make([]ActivityResponse, 0, len(o.Activities)),
	}
	for _, item := range o.ActionItems {
		res.ActionItems = append(res.ActionItems, ActionItemResponse{
			ID: item.ID, Kind: string(item.Kind), EnrollmentID: item.EnrollmentID,
			CaseID: item.CaseID, CaseTitle: item.CaseTitle, MemberName: item.MemberName,
			At: item.At.UTC(), PartnerName: item.PartnerName,
		})
	}
	for _, act := range o.Activities {
		res.Activities = append(res.Activities, ActivityResponse{
			ID: act.ID, Type: string(act.Type), MemberName: act.MemberName,
			CaseID: act.CaseID, CaseTitle: act.CaseTitle, Tier: string(act.Tier),
			At: act.At.UTC(),
		})
	}
	return res
}

// --- Member & Order ---

// MemberSummaryResponse adalah IAdminMemberSummary.
type MemberSummaryResponse struct {
	ID               string     `json:"id"`
	Name             string     `json:"name"`
	Email            string     `json:"email"`
	StudentStatus    *string    `json:"studentStatus"`
	Major            *string    `json:"major"`
	FieldKeys        []string   `json:"fieldKeys"`
	JoinedAt         time.Time  `json:"joinedAt"`
	LastActiveAt     *time.Time `json:"lastActiveAt"`
	AICaseCount      int        `json:"aiCaseCount"`
	B2BCaseCount     int        `json:"b2bCaseCount"`
	ActiveCaseCount  int        `json:"activeCaseCount"`
	CertificateCount int        `json:"certificateCount"`
	TotalSpent       int        `json:"totalSpent"`
}

// MemberProfileResponse adalah IAdminMemberDetail["member"].
type MemberProfileResponse struct {
	MemberSummaryResponse
	Institution  *string `json:"institution"`
	LinkedinURL  *string `json:"linkedinUrl"`
	ShareDefault string  `json:"shareDefault"`
}

// MemberEnrollmentResponse adalah IAdminMemberEnrollment.
type MemberEnrollmentResponse struct {
	ID          string    `json:"id"`
	CaseID      string    `json:"caseId"`
	CaseTitle   string    `json:"caseTitle"`
	Tier        string    `json:"tier"`
	PartnerName *string   `json:"partnerName"`
	Status      string    `json:"status"`
	Score       *int      `json:"score"`
	UpdatedAt   time.Time `json:"updatedAt"`
	HasReview   bool      `json:"hasReview"`
}

// MemberCertificateResponse adalah IAdminMemberCertificate.
type MemberCertificateResponse struct {
	ID           string    `json:"id"`
	EnrollmentID string    `json:"enrollmentId"`
	CaseTitle    string    `json:"caseTitle"`
	Tier         string    `json:"tier"`
	Score        int       `json:"score"`
	IssuedAt     time.Time `json:"issuedAt"`
}

// AdminOrderResponse adalah IAdminOrder.
type AdminOrderResponse struct {
	ID            string     `json:"id"`
	InvoiceNumber string     `json:"invoiceNumber"`
	MemberID      string     `json:"memberId"`
	MemberName    string     `json:"memberName"`
	MemberEmail   string     `json:"memberEmail"`
	CaseID        string     `json:"caseId"`
	CaseTitle     string     `json:"caseTitle"`
	PartnerName   *string    `json:"partnerName"`
	Method        string     `json:"method"`
	Status        string     `json:"status"`
	Subtotal      int        `json:"subtotal"`
	AdminFee      int        `json:"adminFee"`
	Total         int        `json:"total"`
	CreatedAt     time.Time  `json:"createdAt"`
	ExpiresAt     time.Time  `json:"expiresAt"`
	PaidAt        *time.Time `json:"paidAt"`
	VANumber      *string    `json:"vaNumber"`
}

// MemberDetailResponse adalah IAdminMemberDetail.
type MemberDetailResponse struct {
	Member       MemberProfileResponse       `json:"member"`
	Enrollments  []MemberEnrollmentResponse  `json:"enrollments"`
	Orders       []AdminOrderResponse        `json:"orders"`
	Certificates []MemberCertificateResponse `json:"certificates"`
}

// MapMemberSummaries memetakan daftar member.
func MapMemberSummaries(items []entity.AdminMemberSummary) []MemberSummaryResponse {
	res := make([]MemberSummaryResponse, 0, len(items))
	for _, item := range items {
		res = append(res, MapMemberSummary(item))
	}
	return res
}

// MapMemberSummary memetakan satu ringkasan member.
func MapMemberSummary(m entity.AdminMemberSummary) MemberSummaryResponse {
	fieldKeys := make([]string, 0, len(m.FieldKeys))
	fieldKeys = append(fieldKeys, m.FieldKeys...)
	var studentStatus *string
	if m.StudentStatus != nil {
		status := string(*m.StudentStatus)
		studentStatus = &status
	}
	return MemberSummaryResponse{
		ID: m.ID, Name: m.Name, Email: m.Email, StudentStatus: studentStatus,
		Major: m.Major, FieldKeys: fieldKeys, JoinedAt: m.JoinedAt.UTC(),
		LastActiveAt: utcPtr(m.LastActiveAt), AICaseCount: m.AICaseCount,
		B2BCaseCount: m.B2BCaseCount, ActiveCaseCount: m.ActiveCaseCount,
		CertificateCount: m.CertificateCount, TotalSpent: m.TotalSpent,
	}
}

// MapMemberDetailToResponse memetakan halaman detail member.
func MapMemberDetailToResponse(d entity.AdminMemberDetail) MemberDetailResponse {
	shareDefault := string(d.ShareDefault)
	if shareDefault == "" {
		shareDefault = string(entity.ShareDefaultAsk)
	}
	res := MemberDetailResponse{
		Member: MemberProfileResponse{
			MemberSummaryResponse: MapMemberSummary(d.Summary),
			Institution:           d.Institution,
			LinkedinURL:           d.LinkedinURL,
			ShareDefault:          shareDefault,
		},
		Enrollments:  make([]MemberEnrollmentResponse, 0, len(d.Enrollments)),
		Orders:       MapAdminOrders(d.Orders),
		Certificates: make([]MemberCertificateResponse, 0, len(d.Certificates)),
	}
	for _, e := range d.Enrollments {
		res.Enrollments = append(res.Enrollments, MemberEnrollmentResponse{
			ID: e.ID, CaseID: e.CaseID, CaseTitle: e.CaseTitle, Tier: string(e.Tier),
			PartnerName: e.PartnerName, Status: string(e.Status), Score: e.Score,
			UpdatedAt: e.UpdatedAt.UTC(), HasReview: e.HasReview,
		})
	}
	for _, c := range d.Certificates {
		res.Certificates = append(res.Certificates, MemberCertificateResponse{
			ID: c.ID, EnrollmentID: c.EnrollmentID, CaseTitle: c.CaseTitle,
			Tier: string(c.Tier), Score: c.Score, IssuedAt: c.IssuedAt.UTC(),
		})
	}
	return res
}

// MapAdminOrders memetakan daftar order admin.
func MapAdminOrders(items []entity.AdminOrder) []AdminOrderResponse {
	res := make([]AdminOrderResponse, 0, len(items))
	for _, item := range items {
		mapped := studentDto.MapOrder(item.Order)
		res = append(res, AdminOrderResponse{
			ID: mapped.ID, InvoiceNumber: mapped.InvoiceNumber, MemberID: item.Order.UserID,
			MemberName: item.MemberName, MemberEmail: item.MemberEmail,
			CaseID: mapped.CaseID, CaseTitle: item.CaseTitle, PartnerName: item.PartnerName,
			Method: mapped.Method, Status: mapped.Status, Subtotal: mapped.Subtotal,
			AdminFee: mapped.AdminFee, Total: mapped.Total, CreatedAt: mapped.CreatedAt,
			ExpiresAt: mapped.ExpiresAt, PaidAt: mapped.PaidAt, VANumber: mapped.VANumber,
		})
	}
	return res
}

// --- Talent pool ---

// TalentCandidateResponse adalah ITalentCandidate.
type TalentCandidateResponse struct {
	ID            string     `json:"id"`
	MemberID      string     `json:"memberId"`
	MemberName    string     `json:"memberName"`
	MemberEmail   string     `json:"memberEmail"`
	FieldKeys     []string   `json:"fieldKeys"`
	CaseID        string     `json:"caseId"`
	CaseTitle     string     `json:"caseTitle"`
	PartnerID     *string    `json:"partnerId"`
	PartnerName   *string    `json:"partnerName"`
	ReviewerName  *string    `json:"reviewerName"`
	ReviewerRole  string     `json:"reviewerRole"`
	Score         int        `json:"score"`
	RecommendedAt time.Time  `json:"recommendedAt"`
	Consent       string     `json:"consent"`
	SharedAt      *time.Time `json:"sharedAt"`
}

// MapTalentCandidate memetakan satu kandidat talent pool.
func MapTalentCandidate(c entity.TalentCandidate) TalentCandidateResponse {
	fieldKeys := make([]string, 0, len(c.FieldKeys))
	fieldKeys = append(fieldKeys, c.FieldKeys...)
	return TalentCandidateResponse{
		ID:            c.ID,
		MemberID:      c.MemberID,
		MemberName:    c.MemberName,
		MemberEmail:   c.MemberEmail,
		FieldKeys:     fieldKeys,
		CaseID:        c.CaseID,
		CaseTitle:     c.CaseTitle,
		PartnerID:     c.PartnerID,
		PartnerName:   c.PartnerName,
		ReviewerName:  c.ReviewerName,
		ReviewerRole:  c.ReviewerRole,
		Score:         c.Score,
		RecommendedAt: c.RecommendedAt.UTC(),
		Consent:       c.Consent,
		SharedAt:      utcPtr(c.SharedAt),
	}
}

// MapTalentCandidates memetakan daftar kandidat talent pool.
func MapTalentCandidates(items []entity.TalentCandidate) []TalentCandidateResponse {
	res := make([]TalentCandidateResponse, 0, len(items))
	for _, item := range items {
		res = append(res, MapTalentCandidate(item))
	}
	return res
}

// --- Bidang studi ---

// FieldRequest adalah IAdminFieldInput.
type FieldRequest struct {
	Label       string `json:"label"`
	Description string `json:"description"`
}

// FieldStatusRequest adalah body PUT /api/admin/fields/:key/status.
type FieldStatusRequest struct {
	IsActive bool `json:"isActive"`
}

// FieldMoveRequest adalah body POST /api/admin/fields/:key/move.
type FieldMoveRequest struct {
	Direction int `json:"direction"`
}

// AdminFieldResponse adalah IAdminField.
type AdminFieldResponse struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
	IsActive    bool   `json:"isActive"`
	Order       int    `json:"order"`
	CaseCount   int    `json:"caseCount"`
	MemberCount int    `json:"memberCount"`
}

// MapFieldReqToInput memetakan body tambah/ubah bidang.
func MapFieldReqToInput(req FieldRequest) entity.AdminFieldInput {
	return entity.AdminFieldInput{Label: req.Label, Description: req.Description}
}

// MapAdminField memetakan satu bidang studi.
func MapAdminField(f entity.AdminField) AdminFieldResponse {
	return AdminFieldResponse{
		Key:         f.Key,
		Label:       f.Label,
		Description: f.Description,
		IsActive:    f.IsActive,
		Order:       int(f.SortOrder),
		CaseCount:   f.CaseCount,
		MemberCount: f.MemberCount,
	}
}

// MapAdminFields memetakan daftar bidang studi.
func MapAdminFields(items []entity.AdminField) []AdminFieldResponse {
	res := make([]AdminFieldResponse, 0, len(items))
	for _, item := range items {
		res = append(res, MapAdminField(item))
	}
	return res
}

// --- Pengaturan ---

// PlatformSettingsPayload adalah IPlatformSettings.
type PlatformSettingsPayload struct {
	ReviewSlaDays           int    `json:"reviewSlaDays"`
	MaxRevisions            int    `json:"maxRevisions"`
	RevisionExtraDays       int    `json:"revisionExtraDays"`
	RecommendationThreshold int    `json:"recommendationThreshold"`
	PassingScoreAI          int    `json:"passingScoreAi"`
	PassingScoreB2B         int    `json:"passingScoreB2b"`
	B2BStartWindowDays      int    `json:"b2bStartWindowDays"`
	PaymentWindowHours      int    `json:"paymentWindowHours"`
	WhatsappNumber          string `json:"whatsappNumber"`
}

// SettingChangeResponse adalah ISettingsChange.
type SettingChangeResponse struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	From  string `json:"from"`
	To    string `json:"to"`
}

// SettingsLogEntryResponse adalah ISettingsLogEntry.
type SettingsLogEntryResponse struct {
	ID        string                  `json:"id"`
	At        time.Time               `json:"at"`
	ActorName string                  `json:"actorName"`
	Changes   []SettingChangeResponse `json:"changes"`
}

// AdminSettingsResponse adalah IAdminSettings.
type AdminSettingsResponse struct {
	Values   PlatformSettingsPayload    `json:"values"`
	Defaults PlatformSettingsPayload    `json:"defaults"`
	Log      []SettingsLogEntryResponse `json:"log"`
}

// MapSettingsReqToEntity memetakan body PUT /api/admin/settings.
func MapSettingsReqToEntity(req PlatformSettingsPayload) entity.PlatformSettings {
	return entity.PlatformSettings{
		ID:                      true,
		ReviewSlaDays:           req.ReviewSlaDays,
		MaxRevisions:            req.MaxRevisions,
		RevisionExtraDays:       req.RevisionExtraDays,
		RecommendationThreshold: req.RecommendationThreshold,
		PassingScoreAI:          req.PassingScoreAI,
		PassingScoreB2B:         req.PassingScoreB2B,
		B2BStartWindowDays:      req.B2BStartWindowDays,
		PaymentWindowHours:      req.PaymentWindowHours,
		WhatsappNumber:          req.WhatsappNumber,
	}
}

// MapPlatformSettings memetakan nilai pengaturan platform.
func MapPlatformSettings(s entity.PlatformSettings) PlatformSettingsPayload {
	return PlatformSettingsPayload{
		ReviewSlaDays:           s.ReviewSlaDays,
		MaxRevisions:            s.MaxRevisions,
		RevisionExtraDays:       s.RevisionExtraDays,
		RecommendationThreshold: s.RecommendationThreshold,
		PassingScoreAI:          s.PassingScoreAI,
		PassingScoreB2B:         s.PassingScoreB2B,
		B2BStartWindowDays:      s.B2BStartWindowDays,
		PaymentWindowHours:      s.PaymentWindowHours,
		WhatsappNumber:          s.WhatsappNumber,
	}
}

// MapAdminSettingsToResponse memetakan isi halaman Pengaturan.
func MapAdminSettingsToResponse(s entity.AdminSettings) AdminSettingsResponse {
	logs := make([]SettingsLogEntryResponse, 0, len(s.Log))
	for _, entry := range s.Log {
		changes := make([]SettingChangeResponse, 0, len(entry.Changes))
		for _, ch := range entry.Changes {
			changes = append(changes, SettingChangeResponse(ch))
		}
		logs = append(logs, SettingsLogEntryResponse{
			ID:        entry.ID,
			At:        entry.At.UTC(),
			ActorName: entry.ActorName,
			Changes:   changes,
		})
	}
	return AdminSettingsResponse{
		Values:   MapPlatformSettings(s.Values),
		Defaults: MapPlatformSettings(s.Defaults),
		Log:      logs,
	}
}
