package entity

import "time"

// Aturan panel admin untuk menu Reviewer & Mitra dan Penilaian (CONTEXT.md 4.13). Nilainya sama
// dengan mocks/adminPartnerApi.ts dan mocks/adminReviewApi.ts di client.
const (
	// ReminderCooldown adalah jeda minimal antar-pengingat ke reviewer.
	ReminderCooldown = 24 * time.Hour
	// FlagNoteMinRunes adalah panjang minimal catatan "Tandai bermasalah".
	FlagNoteMinRunes = 10
	// FlagNoteMaxRunes membatasi catatan "Tandai bermasalah".
	FlagNoteMaxRunes = 2000
	// AdminReviewListLimit membatasi daftar Penilaian yang dimuat sekali jalan.
	AdminReviewListLimit = 500
	// AdminMemberListLimit membatasi daftar Member yang dimuat sekali jalan.
	AdminMemberListLimit = 500
	// AdminOrderListLimit membatasi daftar Order yang dimuat sekali jalan.
	AdminOrderListLimit = 500
	// AdminTalentPoolLimit membatasi daftar kandidat Talent pool yang dimuat sekali jalan.
	AdminTalentPoolLimit = 500
	// AdminActivityLimit adalah jumlah aktivitas terbaru di Dashboard admin.
	AdminActivityLimit = 8
	// AdminDraftStaleDays adalah umur draft yang dianggap lama belum disunting.
	AdminDraftStaleDays = 14
	// AdminPaymentExpiringWindow adalah sisa waktu order menunggu yang ditampilkan di Perlu tindakan.
	AdminPaymentExpiringWindow = 24 * time.Hour
	// AdminRevenueDays adalah jendela perhitungan pendapatan di Dashboard admin.
	AdminRevenueDays = 30
	// TemporaryPasswordLength adalah panjang password sementara akun reviewer baru.
	TemporaryPasswordLength = 12
)

// AdminActiveStatuses adalah status case yang dihitung sebagai "sedang berjalan" di Dashboard dan
// menu Member (sama dengan ACTIVE_STATUSES di mocks/adminMemberApi.ts).
var AdminActiveStatuses = []EnrollmentStatus{
	EnrollmentInProgress, EnrollmentAIGrading, EnrollmentInReview, EnrollmentRevisionRequested,
}

// AdminActionKind adalah jenis butir "Perlu tindakan" di Dashboard admin (TAdminActionKind di client).
type AdminActionKind string

const (
	AdminActionReviewOverdue       AdminActionKind = "review_overdue"
	AdminActionReviewDueSoon       AdminActionKind = "review_due_soon"
	AdminActionCaseWithoutReviewer AdminActionKind = "case_without_reviewer"
	AdminActionPaymentExpiring     AdminActionKind = "payment_expiring"
	AdminActionDraftStale          AdminActionKind = "draft_stale"
)

// AdminActionItem adalah satu butir "Perlu tindakan" di Dashboard admin (IAdminActionItem di client).
type AdminActionItem struct {
	ID           string
	Kind         AdminActionKind
	EnrollmentID *string
	CaseID       string
	CaseTitle    string
	MemberName   *string
	At           time.Time
	PartnerName  *string
}

// AdminActivityType adalah jenis aktivitas di Dashboard admin (TAdminActivityType di client).
type AdminActivityType string

const (
	AdminActivitySubmitted         AdminActivityType = "submitted"
	AdminActivityRevisionRequested AdminActivityType = "revision_requested"
	AdminActivityReviewed          AdminActivityType = "reviewed"
	AdminActivityPaid              AdminActivityType = "paid"
	AdminActivityCertificateIssued AdminActivityType = "certificate_issued"
)

// AdminActivity adalah satu peristiwa di aktivitas terbaru Dashboard admin (IAdminActivity di client).
type AdminActivity struct {
	ID         string
	Type       AdminActivityType
	MemberName string
	CaseID     string
	CaseTitle  string
	Tier       Tier
	At         time.Time
}

// AdminOverviewStats adalah angka utama Dashboard admin (IAdminOverviewStats di client).
type AdminOverviewStats struct {
	MemberCount              int
	ActiveMemberCount        int
	PublishedCaseCount       int
	AICaseCount              int
	B2BCaseCount             int
	DraftCaseCount           int
	PendingReviewCount       int
	OverdueReviewCount       int
	RevenueLast30Days        int
	PaidOrderCountLast30Days int
	AwaitingPaymentCount     int
	AIGradedCount            int
	AIPassedCount            int
}

// AdminOverview adalah isi Dashboard admin (IAdminOverview di client).
type AdminOverview struct {
	Stats       AdminOverviewStats
	ActionItems []AdminActionItem
	Activities  []AdminActivity
}

// AdminMemberSummary adalah ringkasan satu mahasiswa di menu Member (IAdminMemberSummary di client).
type AdminMemberSummary struct {
	ID               string
	Name             string
	Email            string
	StudentStatus    *StudentStatus
	Major            *string
	FieldKeys        []string
	JoinedAt         time.Time
	LastActiveAt     *time.Time
	AICaseCount      int
	B2BCaseCount     int
	ActiveCaseCount  int
	CertificateCount int
	TotalSpent       int
}

// AdminMemberEnrollment adalah satu baris riwayat case di halaman detail member.
type AdminMemberEnrollment struct {
	ID          string
	CaseID      string
	CaseTitle   string
	Tier        Tier
	PartnerName *string
	Status      EnrollmentStatus
	Score       *int
	UpdatedAt   time.Time
	HasReview   bool
}

// AdminMemberCertificate adalah satu sertifikat di halaman detail member.
type AdminMemberCertificate struct {
	ID           string
	EnrollmentID string
	CaseTitle    string
	Tier         Tier
	Score        int
	IssuedAt     time.Time
}

// AdminOrder adalah satu transaksi di menu Order dan detail member (IAdminOrder di client).
type AdminOrder struct {
	Order       Order
	MemberName  string
	MemberEmail string
	CaseTitle   string
	PartnerName *string
}

// EffectiveStatus mengembalikan status order pada waktu now: order menunggu yang sudah lewat batas
// bayar ditampilkan sebagai kedaluwarsa.
func (o *AdminOrder) EffectiveStatus(now time.Time) OrderStatus {
	if o.Order.IsOverdue(now) {
		return OrderExpired
	}
	return o.Order.Status
}

// AdminMemberDetail adalah isi halaman detail member (IAdminMemberDetail di client).
type AdminMemberDetail struct {
	Summary      AdminMemberSummary
	Institution  *string
	LinkedinURL  *string
	ShareDefault ShareDefault
	Enrollments  []AdminMemberEnrollment
	Orders       []AdminOrder
	Certificates []AdminMemberCertificate
}

// AdminPendingReview adalah submission B2B yang menunggu review untuk perhitungan Dashboard.
type AdminPendingReview struct {
	EnrollmentID string
	CaseID       string
	CaseTitle    string
	PartnerName  *string
	MemberName   string
	ReviewDueAt  time.Time
}

// AdminUncoveredCase adalah B2B case terbit yang belum punya reviewer aktif.
type AdminUncoveredCase struct {
	ID          string
	Title       string
	PartnerName *string
	UpdatedAt   time.Time
}

// AdminStaleDraft adalah case draft yang sudah lama tidak disunting.
type AdminStaleDraft struct {
	ID        string
	Title     string
	UpdatedAt time.Time
}

// AdminAwaitingOrder adalah order B2B yang masih menunggu pembayaran untuk Dashboard admin.
type AdminAwaitingOrder struct {
	ID         string
	CaseID     string
	CaseTitle  string
	MemberName string
	ExpiresAt  time.Time
}

// AdminOverviewData adalah bahan mentah dari database untuk merakit AdminOverview di use case.
type AdminOverviewData struct {
	Stats          AdminOverviewStats
	PendingReviews []AdminPendingReview
	UncoveredCases []AdminUncoveredCase
	AwaitingOrders []AdminAwaitingOrder
	StaleDrafts    []AdminStaleDraft
	Activities     []AdminActivity
}

// TalentCandidate adalah kandidat B2B yang direkomendasikan reviewer di menu Talent pool
// (ITalentCandidate di client).
type TalentCandidate struct {
	ID            string
	MemberID      string
	MemberName    string
	MemberEmail   string
	FieldKeys     []string
	CaseID        string
	CaseTitle     string
	PartnerID     *string
	PartnerName   *string
	ReviewerName  *string
	ReviewerRole  string
	Score         int
	RecommendedAt time.Time
	Consent       string
	SharedAt      *time.Time
}

// HasAdminReview bernilai true bila status enrollment punya halaman detail penilaian.
func HasAdminReview(status EnrollmentStatus) bool {
	return containsStatus(AdminReviewStatuses, status)
}

// AdminReviewStatuses adalah status yang tampil di menu Penilaian: sudah submit, sedang atau sudah
// dinilai (TAdminReviewStatus di client).
var AdminReviewStatuses = []EnrollmentStatus{
	EnrollmentAIGrading, EnrollmentInReview, EnrollmentRevisionRequested, EnrollmentPassed, EnrollmentFailed,
}

// ReviewerProfile adalah baris tabel reviewer_profiles: mitra asal dan jabatan reviewer.
type ReviewerProfile struct {
	UserID    string `gorm:"primaryKey"`
	PartnerID string
	JobTitle  string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// ReviewFlag adalah baris tabel review_flags: tanda "bermasalah" dari admin.
type ReviewFlag struct {
	EnrollmentID string `gorm:"primaryKey"`
	Note         string
	FlaggedBy    string
	FlaggedAt    time.Time
}

// PartnerStat adalah mitra beserta ringkasannya di menu Reviewer & Mitra.
type PartnerStat struct {
	Partner             Partner
	CaseCount           int
	ActiveReviewerCount int
	PendingReviewCount  int
}

// DecisionSpan adalah satu keputusan reviewer: dari submit sampai diputuskan.
type DecisionSpan struct {
	SubmittedAt time.Time
	DecidedAt   time.Time
}

// ReviewerStat adalah reviewer beserta beban kerja dan riwayatnya.
type ReviewerStat struct {
	ID           string
	Name         string
	Email        string
	IsActive     bool
	PartnerID    string
	PartnerName  string
	JobTitle     string
	CaseIDs      []string
	PendingCount int
	Decisions    []DecisionSpan
}

// AverageReviewDays adalah rata-rata hari kerja dari submit sampai diputuskan, dibulatkan satu
// desimal, atau nil bila belum ada keputusan.
func (r *ReviewerStat) AverageReviewDays() *float64 {
	if len(r.Decisions) == 0 {
		return nil
	}
	total := 0
	for _, decision := range r.Decisions {
		total += BusinessDaysBetween(decision.SubmittedAt, decision.DecidedAt)
	}
	average := float64(int(float64(total)/float64(len(r.Decisions))*10+0.5)) / 10
	return &average
}

// PartnerCase adalah B2B case sebagai pilihan penugasan reviewer.
type PartnerCase struct {
	ID                  string
	Title               string
	FieldKey            string
	PartnerID           *string
	Status              CaseStatus
	Price               *int
	PendingReviewCount  int
	ActiveReviewerCount int
}

// PartnerDirectory adalah isi menu Reviewer & Mitra.
type PartnerDirectory struct {
	Partners  []PartnerStat
	Reviewers []ReviewerStat
	Cases     []PartnerCase
}

// ReviewerSummary adalah reviewer pemegang yang tampil di menu Penilaian.
type ReviewerSummary struct {
	ID       string
	Name     string
	JobTitle string
}

// AdminReviewRow adalah satu enrollment di menu Penilaian. Admin melihat identitas peserta;
// anonimitas hanya berlaku di portal reviewer.
type AdminReviewRow struct {
	// Enrollment beserta Case (ringkasan dan Partner) dan Certificate.
	Enrollment  Enrollment
	MemberName  string
	MemberEmail string
	// Holder diisi untuk B2B yang sudah punya pemegang.
	Holder *ReviewerSummary
	// Submission terkirim terakhir beserta Review dan RevisionRequest-nya, atau nil.
	Submission *Submission
	Flag       *ReviewFlag
}

// DecidedAt adalah waktu keputusan terakhir (dinilai AI atau reviewer, atau dikembalikan).
func (r *AdminReviewRow) DecidedAt() *time.Time {
	entry := ReviewQueueEntry{Enrollment: r.Enrollment, Submission: r.Submission}
	if r.Enrollment.Status == EnrollmentAIGrading {
		return nil
	}
	return entry.DecidedAt()
}

// CanRegrade: hanya AI case yang belum lulus. Yang lulus sudah punya sertifikat, dan sertifikat
// yang terbit tidak bisa dicabut (CONTEXT.md bagian 7).
func (r *AdminReviewRow) CanRegrade() bool {
	return r.Enrollment.Tier() == TierAI && r.Enrollment.Status == EnrollmentFailed && r.Submission != nil
}

// CanRemind: B2B yang menunggu review, punya pemegang, dan belum diingatkan dalam 24 jam.
func (r *AdminReviewRow) CanRemind(now time.Time) bool {
	if r.Enrollment.Tier() != TierB2B || r.Enrollment.Status != EnrollmentInReview || r.Holder == nil {
		return false
	}
	last := r.Enrollment.LastReminderAt
	return last == nil || !now.Before(last.Add(ReminderCooldown))
}

// BusinessDaysBetween menghitung hari kerja (Senin–Jumat, WIB) dari from sampai to. Nol bila to
// tidak setelah from.
func BusinessDaysBetween(from, to time.Time) int {
	if !to.After(from) {
		return 0
	}
	days := 0
	for day := from.In(jakarta); ; {
		day = day.AddDate(0, 0, 1)
		if day.After(to.In(jakarta)) {
			break
		}
		if weekday := day.Weekday(); weekday != time.Saturday && weekday != time.Sunday {
			days++
		}
	}
	return days
}

// ReviewActionKind mengelompokkan batas SLA review B2B ke butir "Perlu tindakan": review_overdue
// bila sudah lewat, review_due_soon bila tersisa maksimal 1 hari kerja, atau kosong bila masih
// longgar.
func ReviewActionKind(reviewDueAt, now time.Time) (AdminActionKind, bool) {
	if now.After(reviewDueAt) {
		return AdminActionReviewOverdue, true
	}
	if BusinessDaysBetween(now, reviewDueAt) <= 1 {
		return AdminActionReviewDueSoon, true
	}
	return "", false
}

// IsPaymentExpiringSoon bernilai true bila order masih belum melewati batas bayar dan sisa waktunya
// tidak lebih dari AdminPaymentExpiringWindow.
func IsPaymentExpiringSoon(expiresAt, now time.Time) bool {
	if expiresAt.Before(now) {
		return false
	}
	return expiresAt.Sub(now) <= AdminPaymentExpiringWindow
}
