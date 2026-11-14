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
