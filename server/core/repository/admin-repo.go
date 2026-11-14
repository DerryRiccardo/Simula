package repository

import (
	"context"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// AdminPartnerRepository melayani menu Reviewer & Mitra.
type AdminPartnerRepository interface {
	ListPartners(ctx context.Context) ([]entity.PartnerStat, error)
	ListReviewers(ctx context.Context) ([]entity.ReviewerStat, error)
	ListB2BCases(ctx context.Context) ([]entity.PartnerCase, error)
	// GetPartner mengembalikan coreErrors.ErrPartnerNotFound bila tidak ada.
	GetPartner(ctx context.Context, id string) (entity.Partner, error)
	// PartnerNameTaken bernilai true bila nama (tanpa beda huruf besar/kecil) dipakai mitra lain.
	PartnerNameTaken(ctx context.Context, name, exceptID string) (bool, error)
	// SavePartner membuat atau memperbarui mitra. Mengembalikan coreErrors.ErrPartnerNameTaken bila
	// nama bentrok.
	SavePartner(ctx context.Context, partner *entity.Partner) error
	// CreateReviewer membuat akun reviewer dan profilnya dalam satu transaksi. Mengembalikan
	// coreErrors.ErrEmailTaken bila email sudah dipakai.
	CreateReviewer(ctx context.Context, user *entity.User, profile *entity.ReviewerProfile) error
	// GetReviewerProfile mengembalikan coreErrors.ErrReviewerNotFound bila user bukan reviewer
	// atau belum punya profil.
	GetReviewerProfile(ctx context.Context, userID string) (entity.ReviewerProfile, error)
	// ReplaceAssignments mengganti seluruh penugasan case reviewer. Mengembalikan
	// coreErrors.ErrStatusConflict (dengan jumlahnya) bila case yang dilepas masih punya submission
	// menunggu yang dipegang reviewer ini.
	ReplaceAssignments(ctx context.Context, reviewerID string, caseIDs []string, now time.Time) (blocked int, err error)
	// SetReviewerActive mengaktifkan atau menonaktifkan reviewer. Menonaktifkan ditolak
	// (coreErrors.ErrStatusConflict, dengan jumlahnya) bila masih ada submission menunggu.
	SetReviewerActive(ctx context.Context, reviewerID string, isActive bool, now time.Time) (pending int, err error)
}

// AdminReviewRepository melayani menu Penilaian.
type AdminReviewRepository interface {
	// ListRows mengembalikan enrollment berstatus AdminReviewStatuses, urut submit terbaru.
	ListRows(ctx context.Context, limit int) ([]entity.AdminReviewRow, error)
	// GetRow mengembalikan coreErrors.ErrEnrollmentNotFound bila tidak ada atau belum submit.
	GetRow(ctx context.Context, enrollmentID string) (entity.AdminReviewRow, error)
	SetFlag(ctx context.Context, flag entity.ReviewFlag) error
	ClearFlag(ctx context.Context, enrollmentID string) error
	// MarkReminded mencatat pengingat bila jeda sejak pengingat terakhir sudah lewat. Mengembalikan
	// coreErrors.ErrStatusConflict bila tidak (atau submission sudah tidak menunggu).
	MarkReminded(ctx context.Context, enrollmentID string, now time.Time) error
	// Reassign memindahkan submission yang menunggu ke reviewer lain, menambahkan penugasan case
	// bila belum ada, membuang draft reviewer lama, dan mengosongkan pengingat. Mengembalikan
	// coreErrors.ErrStatusConflict bila submission sudah tidak menunggu.
	Reassign(ctx context.Context, enrollmentID, caseID, reviewerID string, now time.Time) error
	// Regrade menghapus hasil AI lama yang belum lulus dan memulai run penilaian baru dalam satu
	// transaksi. Mengembalikan coreErrors.ErrStatusConflict bila status sudah bukan failed.
	Regrade(ctx context.Context, enrollmentID, submissionID string, run *entity.AIGradingRun, now time.Time) error
}

// AdminOverviewRepository melayani menu Dashboard (Ringkasan) panel admin.
type AdminOverviewRepository interface {
	LoadOverview(ctx context.Context, now time.Time) (entity.AdminOverviewData, error)
}

// AdminMemberRepository melayani menu Member panel admin.
type AdminMemberRepository interface {
	ListMembers(ctx context.Context, limit int) ([]entity.AdminMemberSummary, error)
	// GetMember mengembalikan coreErrors.ErrUserNotFound bila user tidak ada atau bukan mahasiswa.
	GetMember(ctx context.Context, memberID string) (entity.AdminMemberDetail, error)
}

// AdminOrderRepository melayani menu Order panel admin.
type AdminOrderRepository interface {
	ListOrders(ctx context.Context, limit int) ([]entity.AdminOrder, error)
}

// AdminTalentPoolRepository melayani menu Talent pool panel admin.
type AdminTalentPoolRepository interface {
	ListCandidates(ctx context.Context, limit int) ([]entity.TalentCandidate, error)
	// GetCandidate mengembalikan coreErrors.ErrEnrollmentNotFound bila enrollment tidak masuk
	// talent pool.
	GetCandidate(ctx context.Context, enrollmentID string) (entity.TalentCandidate, error)
	// ShareCandidate mencatat waktu profil diteruskan ke mitra bila mahasiswa sudah menyetujui dan
	// belum pernah diteruskan. Mengembalikan coreErrors.ErrStatusConflict bila syarat tidak
	// terpenuhi.
	ShareCandidate(ctx context.Context, enrollmentID string, now time.Time) error
}

// AdminFieldRepository melayani menu Bidang studi panel admin.
type AdminFieldRepository interface {
	ListFields(ctx context.Context) ([]entity.AdminField, error)
	GetField(ctx context.Context, key string) (entity.Field, error)
	KeyTaken(ctx context.Context, key string) (bool, error)
	LabelTaken(ctx context.Context, label, exceptKey string) (bool, error)
	// CreateField menyimpan bidang baru di urutan paling bawah.
	CreateField(ctx context.Context, key, label, description string) (entity.AdminField, error)
	// UpdateField mengubah label dan deskripsi bidang. Mengembalikan coreErrors.ErrFieldNotFound bila
	// key tidak ada.
	UpdateField(ctx context.Context, key, label, description string) error
	// SetFieldActive mengubah status aktif bidang. Bila menonaktifkan bidang aktif terakhir,
	// mengembalikan coreErrors.ErrStatusConflict. Bila key tidak ada, mengembalikan
	// coreErrors.ErrFieldNotFound.
	SetFieldActive(ctx context.Context, key string, isActive bool) error
	// MoveField menukar urutan bidang dengan tetangga di arah direction (-1 ke atas, 1 ke bawah).
	// Mengembalikan coreErrors.ErrFieldNotFound bila key tidak ada.
	MoveField(ctx context.Context, key string, direction int) error
}

// AdminSettingsRepository melayani menu Pengaturan panel admin.
type AdminSettingsRepository interface {
	GetSettings(ctx context.Context) (entity.PlatformSettings, error)
	ListLogs(ctx context.Context, limit int) ([]entity.SettingsLogEntry, error)
	SaveSettings(ctx context.Context, settings entity.PlatformSettings, logEntry *entity.PlatformSettingsLog) error
}
