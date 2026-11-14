package repository

import (
	"context"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// CaseSave adalah semua perubahan saat admin menyimpan case.
type CaseSave struct {
	// Case beserta Tasks, Slots, Rubric, dan Materials pengganti (ID dan posisi sudah diisi).
	Case  *entity.Case
	IsNew bool
	// AttachFileIDs adalah berkas materi baru yang dipakai case ini (pending → attached).
	AttachFileIDs []string
}

// AdminCaseRepository melayani pembuat case.
type AdminCaseRepository interface {
	// ListCases mengembalikan semua case (draft dan terbit), urut update terbaru.
	ListCases(ctx context.Context, limit int) ([]entity.AdminCaseSummary, error)
	// EnrollmentCounts menghitung enrollment case: semua, dan yang membuat struktur terkunci.
	EnrollmentCounts(ctx context.Context, caseID string) (total, started int, err error)
	// SlugTaken bernilai true bila slug sudah dipakai case lain.
	SlugTaken(ctx context.Context, slug string) (bool, error)
	// MaterialFiles mengembalikan berkas materi (purpose material) dengan ID tersebut.
	MaterialFiles(ctx context.Context, ids []string) ([]entity.File, error)
	// Save menyimpan case dan mengganti seluruh tugas, slot, rubrik, dan materinya dalam satu
	// transaksi. Bila mitra case B2B berubah (atau case menjadi tanpa mitra), penugasan reviewer
	// dari mitra lain dilepas; mengembalikan coreErrors.ErrStatusConflict (dengan jumlahnya) bila
	// reviewer itu masih memegang submission menunggu di case ini.
	Save(ctx context.Context, save CaseSave) (blocked int, err error)
}
