package main

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// reviewerPartners memetakan akun reviewer contoh ke mitranya. Reviewer hanya ditugaskan ke case
// milik mitranya; Sagara Commerce punya dua reviewer agar pembagian antrean otomatis bisa dicoba.
var reviewerPartners = map[string]string{
	"reviewer@simula.test":         "Sagara Commerce",
	"reviewer2@simula.test":        "Sagara Commerce",
	"reviewer.samudra@simula.test": "Samudra Logistik",
	"reviewer.kirana@simula.test":  "Kirana Retail",
	"reviewer.bentala@simula.test": "Bentala Finance",
}

// seedReviewerAssignments menugaskan setiap reviewer contoh ke semua B2B case mitranya.
func seedReviewerAssignments(ctx context.Context, db *gorm.DB) error {
	for email, partner := range reviewerPartners {
		result := db.WithContext(ctx).Exec(`
			INSERT INTO reviewer_assignments (case_id, reviewer_id)
			SELECT c.id, u.id FROM cases c
			JOIN partners p ON p.id = c.partner_id
			JOIN users u ON u.email = ? AND u.role = 'reviewer'
			WHERE c.tier = 'b2b' AND p.name = ?
			ON CONFLICT (case_id, reviewer_id) DO NOTHING`, email, partner)
		if result.Error != nil {
			return fmt.Errorf("failed to assign %s: %w", email, result.Error)
		}
		fmt.Printf("assigned  %-28s %d case(s) of %s\n", email, result.RowsAffected, partner)
	}
	return nil
}
