package main

import (
	"context"
	"errors"
	"fmt"
	"math/rand/v2"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	dbRepo "github.com/DerryRiccardo/Simula/server/repository/db"
)

// demoB2BCaseSlug adalah case B2B yang langsung "sudah dibayar" untuk akun mahasiswa, supaya alur
// mulai mengerjakan dan submit B2B bisa dicoba sebelum checkout tersedia di backend.
const demoB2BCaseSlug = "mencegah-overselling-flash-sale"

// seedDemoEnrollment membuat enrollment B2B berstatus not_started bila belum ada.
func seedDemoEnrollment(ctx context.Context, db *gorm.DB, studentEmail string) error {
	var student entity.User
	if err := db.WithContext(ctx).Select("id").Where("email = ?", studentEmail).Take(&student).Error; err != nil {
		return fmt.Errorf("failed to find %s: %w", studentEmail, err)
	}
	var demoCase entity.Case
	if err := db.WithContext(ctx).Select("id").Where("slug = ?", demoB2BCaseSlug).Take(&demoCase).Error; err != nil {
		return fmt.Errorf("failed to find case %s: %w", demoB2BCaseSlug, err)
	}

	enrollments := dbRepo.InitEnrollmentRepo(db)
	now := time.Now().UTC()
	for attempt := 0; attempt < entity.CandidateNumberAttempts; attempt++ {
		enrollment := entity.Enrollment{
			ID:              uuid.NewString(),
			UserID:          student.ID,
			CaseID:          demoCase.ID,
			Status:          entity.EnrollmentNotStarted,
			CandidateNumber: entity.CandidateNumberMin + rand.IntN(entity.CandidateNumberMax-entity.CandidateNumberMin+1),
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		err := enrollments.Create(ctx, &enrollment)
		switch {
		case err == nil:
			fmt.Printf("enrollment %-42s created (B2B, paid, not started)\n", demoB2BCaseSlug)
			return nil
		case errors.Is(err, coreErrors.ErrEnrollmentExists):
			fmt.Printf("enrollment %-42s skipped (already exists)\n", demoB2BCaseSlug)
			return nil
		case errors.Is(err, coreErrors.ErrCandidateNumberTaken):
			continue
		default:
			return err
		}
	}
	return errors.New("failed to allocate candidate number for demo enrollment")
}
