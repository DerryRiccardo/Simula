package repository

import (
	"context"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	paginationPkg "github.com/DerryRiccardo/Simula/server/pkg/pagination"
)

// CaseFilter menyaring katalog. Field kosong berarti tidak disaring.
type CaseFilter struct {
	Tier     entity.Tier
	FieldKey string
	Level    entity.CaseLevel
	Search   string
	// ExcludeUserID menyembunyikan case yang sudah diambil user ini.
	ExcludeUserID string
	Sort          entity.CaseSort
	// UserFields dipakai urutan relevance: bidang pilihan user lebih dulu.
	UserFields []string
}

// CaseRepository membaca case yang sudah terbit untuk katalog dan halaman detail.
type CaseRepository interface {
	// ListPublished mengisi kolom ringkasan, kolom terhitung, dan Partner.
	ListPublished(ctx context.Context, filter CaseFilter, p *paginationPkg.Pagination) ([]entity.Case, int64, error)
	// GetPublishedBySlug mengisi semua kolom, Partner, Slots, dan Rubric. Mengembalikan
	// coreErrors.ErrCaseNotFound bila tidak ada atau belum terbit.
	GetPublishedBySlug(ctx context.Context, slug string) (entity.Case, error)
	// GetByID hanya mengisi ID, Tier, dan Status. Mengembalikan coreErrors.ErrCaseNotFound bila
	// tidak ada.
	GetByID(ctx context.Context, id string) (entity.Case, error)
}

// EnrollmentFilter menyaring Case Saya. Field kosong berarti tidak disaring.
type EnrollmentFilter struct {
	Tier     entity.Tier
	Status   entity.EnrollmentStatus
	FieldKey string
	Search   string
	Sort     entity.EnrollmentSort
}

// EnrollmentRepository menyimpan case milik peserta.
type EnrollmentRepository interface {
	// ListByUser mengisi Case (ringkasan + Partner) dan Certificate.
	ListByUser(ctx context.Context, userID string, filter EnrollmentFilter) ([]entity.Enrollment, error)
	// GetForUser mengisi relasi seperti ListByUser. Mengembalikan coreErrors.ErrEnrollmentNotFound
	// bila tidak ada atau bukan milik user.
	GetForUser(ctx context.Context, userID, enrollmentID string) (entity.Enrollment, error)
	// FindByUserAndCase mengembalikan coreErrors.ErrEnrollmentNotFound bila user belum mengambil case.
	FindByUserAndCase(ctx context.Context, userID, caseID string) (entity.Enrollment, error)
	// Create mengembalikan coreErrors.ErrEnrollmentExists bila user sudah mengambil case ini, atau
	// coreErrors.ErrCandidateNumberTaken bila nomor kandidat bentrok (coba lagi dengan nomor lain).
	Create(ctx context.Context, enrollment *entity.Enrollment) error
}

// CertificateRepository membaca sertifikat peserta.
type CertificateRepository interface {
	// ListByUser mengembalikan sertifikat milik user, terbaru dulu. tier kosong = semua.
	ListByUser(ctx context.Context, userID string, tier entity.Tier) ([]entity.Certificate, error)
}
