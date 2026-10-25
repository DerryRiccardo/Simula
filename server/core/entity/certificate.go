package entity

import "time"

// Certificate adalah baris tabel certificates. PublicID dipakai di URL verifikasi; nama case,
// mitra, dan penerima disalin saat terbit agar sertifikat tidak berubah bila case diubah.
type Certificate struct {
	ID            string
	PublicID      string
	EnrollmentID  string
	UserID        string
	CaseID        string
	Tier          Tier
	RecipientName string
	CaseTitle     string
	FieldKey      string
	PartnerName   *string
	Score         int
	IssuedAt      time.Time
}
