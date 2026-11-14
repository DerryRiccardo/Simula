package main

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// seedReviewer adalah reviewer contoh: mitra asal dan jabatannya.
type seedReviewer struct {
	email    string
	partner  string
	jobTitle string
}

// seedReviewers memetakan akun reviewer contoh ke mitranya. Reviewer hanya ditugaskan ke case milik
// mitranya; Sagara Commerce punya dua reviewer agar pembagian antrean otomatis bisa dicoba.
var seedReviewers = []seedReviewer{
	{email: "reviewer.sagara@simula.test", partner: "Sagara Commerce", jobTitle: "Senior Backend Engineer"},
	{email: "reviewer.sagara2@simula.test", partner: "Sagara Commerce", jobTitle: "Backend Engineering Lead"},
	{email: "reviewer.samudra@simula.test", partner: "Samudra Logistik", jobTitle: "Lead Data Analyst"},
	{email: "reviewer.kirana@simula.test", partner: "Kirana Retail", jobTitle: "Product Design Lead"},
	{email: "reviewer.bentala@simula.test", partner: "Bentala Finance", jobTitle: "Senior Financial Analyst"},
}

// seedReviewerAssignments membuat profil reviewer contoh lalu menugaskannya ke semua B2B case mitranya.
func seedReviewerAssignments(ctx context.Context, db *gorm.DB) error {
	for _, reviewer := range seedReviewers {
		err := db.WithContext(ctx).Exec(`
			INSERT INTO reviewer_profiles (user_id, partner_id, job_title)
			SELECT u.id, p.id, ? FROM users u JOIN partners p ON p.name = ?
			WHERE u.email = ? AND u.role = 'reviewer'
			ON CONFLICT (user_id) DO NOTHING`, reviewer.jobTitle, reviewer.partner, reviewer.email).Error
		if err != nil {
			return fmt.Errorf("failed to create profile for %s: %w", reviewer.email, err)
		}
		result := db.WithContext(ctx).Exec(`
			INSERT INTO reviewer_assignments (case_id, reviewer_id)
			SELECT c.id, u.id FROM cases c
			JOIN partners p ON p.id = c.partner_id
			JOIN users u ON u.email = ? AND u.role = 'reviewer'
			WHERE c.tier = 'b2b' AND p.name = ?
			ON CONFLICT (case_id, reviewer_id) DO NOTHING`, reviewer.email, reviewer.partner)
		if result.Error != nil {
			return fmt.Errorf("failed to assign %s: %w", reviewer.email, result.Error)
		}
		fmt.Printf("assigned  %-28s %d case(s) of %s\n", reviewer.email, result.RowsAffected, reviewer.partner)
	}
	return nil
}
