// Package entity berisi struct GORM dan aturan domain murni. Fungsi di sini tidak menyentuh
// database, jaringan, atau jam sistem; waktu selalu diterima sebagai parameter.
package entity

import (
	"sort"
	"time"
)

// Role adalah peran user. Nilainya sama dengan TRole di client.
type Role string

const (
	RoleStudent  Role = "student"
	RoleReviewer Role = "reviewer"
	RoleAdmin    Role = "admin"
)

// StudentStatus adalah status mahasiswa yang dipilih saat onboarding.
type StudentStatus string

const (
	StudentStatusFinalYear     StudentStatus = "final_year"
	StudentStatusFreshGraduate StudentStatus = "fresh_graduate"
)

// IsValid memeriksa apakah status dikenal.
func (s StudentStatus) IsValid() bool {
	return s == StudentStatusFinalYear || s == StudentStatusFreshGraduate
}

// ShareDefault adalah sikap bawaan user saat reviewer merekomendasikannya ke mitra.
type ShareDefault string

const (
	ShareDefaultAsk    ShareDefault = "ask"
	ShareDefaultAlways ShareDefault = "always"
	ShareDefaultNever  ShareDefault = "never"
)

// User adalah akun untuk semua peran.
type User struct {
	ID            string
	Name          string
	Email         string
	PasswordHash  *string
	GoogleSub     *string
	Role          Role
	IsActive      bool
	IsOnboarded   bool
	StudentStatus *StudentStatus
	Major         *string
	Institution   *string
	LinkedinURL   *string `gorm:"column:linkedin_url"`
	ShareDefault  ShareDefault
	Fields        []UserField `gorm:"foreignKey:UserID"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// UserField adalah satu bidang pilihan user beserta urutannya.
type UserField struct {
	UserID   string `gorm:"primaryKey"`
	FieldKey string `gorm:"primaryKey"`
	Position int16
}

// FieldKeys mengembalikan bidang pilihan user, urut sesuai pilihan.
func (u *User) FieldKeys() []string {
	fields := make([]UserField, len(u.Fields))
	copy(fields, u.Fields)
	sort.Slice(fields, func(i, j int) bool { return fields[i].Position < fields[j].Position })

	keys := make([]string, 0, len(fields))
	for _, field := range fields {
		keys = append(keys, field.FieldKey)
	}
	return keys
}

// HasPassword bernilai true bila user bisa masuk dengan email dan password.
func (u *User) HasPassword() bool {
	return u.PasswordHash != nil && *u.PasswordHash != ""
}

// NeedsOnboarding bernilai true bila mahasiswa belum memilih bidang.
func (u *User) NeedsOnboarding() bool {
	return u.Role == RoleStudent && !u.IsOnboarded
}
