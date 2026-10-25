package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// cases.json berisi case contoh untuk development. Slug-nya sama dengan data tiruan client
// (src/mocks/data); mitra dan angkanya fiktif. Nama key mengikuti field entity.Case (camelCase),
// jadi file ini langsung dibaca sebagai []entity.Case. Materi pendukung yang disebut di brief tidak
// ikut karena butuh berkas di R2.
//
//go:embed data/cases.json
var casesJSON []byte

type seedResult string

const (
	seedCreated   seedResult = "created"
	seedRefreshed seedResult = "refreshed"
	seedSkipped   seedResult = "skipped (already exists)"
	seedInUse     seedResult = "skipped (has enrollments or orders)"
)

// seedCases memasukkan case contoh yang belum ada (dicocokkan lewat slug) sebagai case terbit. Bila
// refresh bernilai true, case contoh yang sudah ada diganti isinya.
func seedCases(ctx context.Context, db *gorm.DB, refresh bool) error {
	var cases []entity.Case
	if err := json.Unmarshal(casesJSON, &cases); err != nil {
		return fmt.Errorf("failed to read seed cases: %w", err)
	}
	for i := range cases {
		c := &cases[i]
		result, err := seedCase(ctx, db, c, refresh)
		if err != nil {
			return fmt.Errorf("failed to seed case %s: %w", c.Slug, err)
		}
		fmt.Printf("case %-4s %-42s %s\n", c.Tier, c.Slug, result)
	}
	return nil
}

func seedCase(ctx context.Context, db *gorm.DB, c *entity.Case, refresh bool) (seedResult, error) {
	var existing entity.Case
	err := db.WithContext(ctx).Select("id").Where("slug = ?", c.Slug).Take(&existing).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", err
	}
	found := err == nil
	if found && !refresh {
		return seedSkipped, nil
	}
	if found {
		inUse, err := caseInUse(ctx, db, existing.ID)
		if err != nil {
			return "", err
		}
		if inUse {
			return seedInUse, nil
		}
	}

	now := time.Now().UTC()
	prepareSeedCase(c, now)
	err = db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if found {
			// Tugas, slot, rubrik, dan penugasan reviewer ikut terhapus lewat ON DELETE CASCADE.
			c.ID = existing.ID
			if err := tx.Delete(&entity.Case{}, "id = ?", existing.ID).Error; err != nil {
				return err
			}
		}
		if c.Partner != nil {
			partnerID, err := seedPartnerID(tx, c.Partner, now)
			if err != nil {
				return err
			}
			c.PartnerID = &partnerID
			c.Partner = nil
		}
		// Tasks, Slots, dan Rubric ikut tersimpan sebagai asosiasi.
		return tx.Create(c).Error
	})
	if err != nil {
		return "", err
	}
	if found {
		return seedRefreshed, nil
	}
	return seedCreated, nil
}

// caseInUse bernilai true bila case sudah dipakai peserta, sehingga isinya tidak boleh diganti seed.
func caseInUse(ctx context.Context, db *gorm.DB, caseID string) (bool, error) {
	var count int64
	err := db.WithContext(ctx).Raw(
		"SELECT (SELECT count(*) FROM enrollments WHERE case_id = ?) + (SELECT count(*) FROM orders WHERE case_id = ?)",
		caseID, caseID,
	).Scan(&count).Error
	return count > 0, err
}

// prepareSeedCase mengisi ID, urutan, dan waktu yang tidak ada di cases.json.
func prepareSeedCase(c *entity.Case, now time.Time) {
	c.ID = uuid.NewString()
	c.Status = entity.CaseStatusPublished
	c.PublishedAt = &now
	c.CreatedAt = now
	c.UpdatedAt = now
	for i := range c.Tasks {
		c.Tasks[i].ID = uuid.NewString()
		c.Tasks[i].Position = i + 1
	}
	for i := range c.Slots {
		c.Slots[i].ID = uuid.NewString()
		c.Slots[i].Position = i + 1
	}
	for i := range c.Rubric {
		c.Rubric[i].ID = uuid.NewString()
		c.Rubric[i].Position = i + 1
	}
}

// seedPartnerID memakai mitra yang sudah ada (dicocokkan lewat nama) atau membuat yang baru.
func seedPartnerID(tx *gorm.DB, partner *entity.Partner, now time.Time) (string, error) {
	var existing entity.Partner
	err := tx.Select("id").Where("name = ?", partner.Name).Take(&existing).Error
	if err == nil {
		return existing.ID, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", err
	}
	partner.ID = uuid.NewString()
	partner.CreatedAt = now
	partner.UpdatedAt = now
	if err := tx.Create(partner).Error; err != nil {
		return "", err
	}
	return partner.ID, nil
}
