package db

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type certificateRepo struct {
	db *gorm.DB
}

// InitCertificateRepo membuat repository sertifikat.
func InitCertificateRepo(db *gorm.DB) coreRepo.CertificateRepository {
	return &certificateRepo{db: db}
}

func (r *certificateRepo) ListByUser(ctx context.Context, userID string, tier entity.Tier) ([]entity.Certificate, error) {
	query := r.db.WithContext(ctx).Where("user_id = ?", userID)
	if tier != "" {
		query = query.Where("tier = ?", tier)
	}
	certificates := make([]entity.Certificate, 0)
	if err := query.Order("issued_at DESC").Limit(entity.UnpaginatedListLimit).Find(&certificates).Error; err != nil {
		return nil, fmt.Errorf("failed to list certificates: %w", err)
	}
	return certificates, nil
}

func (r *certificateRepo) GetByPublicID(ctx context.Context, publicID string) (entity.Certificate, error) {
	var certificate entity.Certificate
	err := r.db.WithContext(ctx).Where("public_id = ?", publicID).Take(&certificate).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.Certificate{}, coreErrors.ErrCertificateNotFound
	}
	if err != nil {
		return entity.Certificate{}, fmt.Errorf("failed to get certificate %s: %w", publicID, err)
	}
	return certificate, nil
}
