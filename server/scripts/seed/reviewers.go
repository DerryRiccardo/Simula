package main

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

// seedReviewer adalah akun reviewer mitra beserta perusahaan, jabatan, dan bidang utamanya.
type seedReviewer struct {
	name     string
	email    string
	partner  string
	jobTitle string
	field    string
}

// seedReviewers memastikan seluruh 10 mitra dan seluruh 16 bidang studi memiliki reviewer.
var seedReviewers = []seedReviewer{
	// 4 reviewer utama (sesuai foto/profil di landing page)
	{
		name:     "Raditya Wilson",
		email:    "raditya.wilson@gmail.com",
		partner:  "Belibeli",
		jobTitle: "Senior Backend Engineer",
		field:    "backend",
	},
	{
		name:     "Drian Chang",
		email:    "drian.chang@gmail.com",
		partner:  "Travelokal",
		jobTitle: "Lead Data Analyst",
		field:    "data",
	},
	{
		name:     "Laras Wibowo",
		email:    "laras.wibowo@gmail.com",
		partner:  "Univeler",
		jobTitle: "Head of Growth Marketing",
		field:    "marketing",
	},
	{
		name:     "Amba Pratama",
		email:    "amba.pratama@gmail.com",
		partner:  "Danah",
		jobTitle: "Finance Manager",
		field:    "finance",
	},

	// Reviewer tambahan agar semua 10 mitra & semua 16 bidang terwakili
	{
		name:     "Nadia Kusuma",
		email:    "nadia.kusuma@gmail.com",
		partner:  "Belibeli",
		jobTitle: "Frontend Engineering Lead",
		field:    "frontend",
	},
	{
		name:     "Bima Santoso",
		email:    "bima.santoso@gmail.com",
		partner:  "Halodek",
		jobTitle: "Mobile Engineering Lead",
		field:    "mobile",
	},
	{
		name:     "Clarissa Tan",
		email:    "clarissa.tan@gmail.com",
		partner:  "Halodek",
		jobTitle: "Principal Product Designer",
		field:    "uiux",
	},
	{
		name:     "Raka Mahendra",
		email:    "raka.mahendra@gmail.com",
		partner:  "Travelokal",
		jobTitle: "Senior Product Manager",
		field:    "product",
	},
	{
		name:     "Dewi Anggraini",
		email:    "dewi.anggraini@gmail.com",
		partner:  "BCAA",
		jobTitle: "Accounting & Tax Lead",
		field:    "accounting",
	},
	{
		name:     "Tania Hartono",
		email:    "tania.hartono@gmail.com",
		partner:  "BCAA",
		jobTitle: "QA Engineering Lead",
		field:    "qa",
	},
	{
		name:     "Reza Pahlevi",
		email:    "reza.pahlevi@gmail.com",
		partner:  "BCAA",
		jobTitle: "Cyber Security Lead",
		field:    "cyber-security",
	},
	{
		name:     "Arif Setiawan",
		email:    "arif.setiawan@gmail.com",
		partner:  "Danah",
		jobTitle: "Staff DevOps Engineer",
		field:    "devops",
	},
	{
		name:     "Fajar Nugraha",
		email:    "fajar.nugraha@gmail.com",
		partner:  "Paragone Corp",
		jobTitle: "HR Business Partner",
		field:    "hr",
	},
	{
		name:     "Maya Kartika",
		email:    "maya.kartika@gmail.com",
		partner:  "Paragone Corp",
		jobTitle: "Brand Marketing Manager",
		field:    "marketing",
	},
	{
		name:     "Hendra Wijaya",
		email:    "hendra.wijaya@gmail.com",
		partner:  "Sayap",
		jobTitle: "Supply Chain Manager",
		field:    "supply-chain",
	},
	{
		name:     "Siti Rahmawati",
		email:    "siti.rahmawati@gmail.com",
		partner:  "Astral",
		jobTitle: "Corporate Legal Counsel",
		field:    "legal",
	},
	{
		name:     "Putri Permata",
		email:    "putri.permata@gmail.com",
		partner:  "Astral",
		jobTitle: "IT Project Manager",
		field:    "product",
	},
	{
		name:     "Kevin Gunawan",
		email:    "kevin.gunawan@gmail.com",
		partner:  "Kopi Memory",
		jobTitle: "Business Development Lead",
		field:    "business-development",
	},
}

// seedReviewerAccounts membuat akun reviewer beserta profil mitranya.
func seedReviewerAccounts(ctx context.Context, db *gorm.DB, users coreRepo.UserRepository, hash string) error {
	for _, reviewer := range seedReviewers {
		created, err := seedUser(ctx, users, seedAccount{
			name:  reviewer.name,
			email: reviewer.email,
			role:  entity.RoleReviewer,
		}, hash)
		if err != nil {
			return fmt.Errorf("failed to seed reviewer %s: %w", reviewer.email, err)
		}
		status := "skipped (already exists)"
		if created {
			status = "created"
		}
		fmt.Printf("reviewer  %-28s %s (%s - %s)\n", reviewer.email, status, reviewer.partner, reviewer.field)

		err = db.WithContext(ctx).Exec(`
			INSERT INTO reviewer_profiles (user_id, partner_id, job_title)
			SELECT u.id, p.id, ? FROM users u JOIN partners p ON p.name = ?
			WHERE u.email = ? AND u.role = 'reviewer'
			ON CONFLICT (user_id) DO NOTHING`, reviewer.jobTitle, reviewer.partner, reviewer.email).Error
		if err != nil {
			return fmt.Errorf("failed to create profile for %s: %w", reviewer.email, err)
		}
	}
	return nil
}

// seedReviewerAssignments menugaskan reviewer ke B2B case milik mitranya sesuai bidangnya.
// Dijalankan setelah case di-seed; penugasan yang sudah ada dibiarkan.
func seedReviewerAssignments(ctx context.Context, db *gorm.DB) error {
	for _, reviewer := range seedReviewers {
		err := db.WithContext(ctx).Exec(`
			INSERT INTO reviewer_assignments (case_id, reviewer_id)
			SELECT c.id, u.id FROM cases c
			JOIN partners p ON p.id = c.partner_id
			JOIN users u ON u.email = ? AND u.role = 'reviewer'
			WHERE c.tier = 'b2b' AND p.name = ? AND c.field_key = ?
			ON CONFLICT (case_id, reviewer_id) DO NOTHING`, reviewer.email, reviewer.partner, reviewer.field).Error
		if err != nil {
			return fmt.Errorf("failed to assign %s: %w", reviewer.email, err)
		}
	}
	return nil
}
