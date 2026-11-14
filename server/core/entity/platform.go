package entity

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"regexp"
	"time"
)

// Batas input menu Bidang studi dan Pengaturan panel admin (CONTEXT.md 4.13).
const (
	FieldKeyMaxLength     = 50
	FieldLabelMinRunes    = 2
	FieldLabelMaxRunes    = 80
	FieldDescMinRunes     = 5
	FieldDescMaxRunes     = 200
	AdminSettingsLogLimit = 50
	DefaultWhatsappNumber = "6281234567890"
)

var whatsappNumberPattern = regexp.MustCompile(`^62[0-9]{8,13}$`)

// ValidateWhatsappNumber memeriksa apakah nomor WhatsApp sesuai format internasional 62xxxxxxxxxx.
func ValidateWhatsappNumber(raw string) bool {
	return whatsappNumberPattern.MatchString(raw)
}

// Field adalah baris tabel fields (taksonomi bidang studi).
type Field struct {
	Key         string `gorm:"primaryKey"`
	Label       string
	Description string
	IsActive    bool
	SortOrder   int16 `gorm:"column:sort_order"`
}

// AdminField adalah bidang studi beserta jumlah case dan member-nya (IAdminField di client).
type AdminField struct {
	Field
	CaseCount   int
	MemberCount int
}

// AdminFieldInput adalah isian form tambah/ubah bidang studi (IAdminFieldInput di client).
type AdminFieldInput struct {
	Label       string
	Description string
}

// PlatformSettings adalah baris tunggal tabel platform_settings (IPlatformSettings di client).
type PlatformSettings struct {
	ID                      bool      `gorm:"primaryKey;column:id"`
	ReviewSlaDays           int       `gorm:"column:review_sla_days"`
	MaxRevisions            int       `gorm:"column:max_revisions"`
	RevisionExtraDays       int       `gorm:"column:revision_extra_days"`
	RecommendationThreshold int       `gorm:"column:recommendation_threshold"`
	PassingScoreAI          int       `gorm:"column:passing_score_ai"`
	PassingScoreB2B         int       `gorm:"column:passing_score_b2b"`
	B2BStartWindowDays      int       `gorm:"column:b2b_start_window_days"`
	PaymentWindowHours      int       `gorm:"column:payment_window_hours"`
	WhatsappNumber          string    `gorm:"column:whatsapp_number"`
	UpdatedAt               time.Time `gorm:"column:updated_at"`
}

// TableName mengarahkan GORM ke tabel platform_settings.
func (PlatformSettings) TableName() string {
	return "platform_settings"
}

// DefaultPlatformSettings mengembalikan nilai bawaan platform (DEFAULT_PLATFORM_SETTINGS di client).
func DefaultPlatformSettings() PlatformSettings {
	return PlatformSettings{
		ID:                      true,
		ReviewSlaDays:           ReviewSLABusinessDays,
		MaxRevisions:            2,
		RevisionExtraDays:       3,
		RecommendationThreshold: 80,
		PassingScoreAI:          60,
		PassingScoreB2B:         70,
		B2BStartWindowDays:      30,
		PaymentWindowHours:      24,
		WhatsappNumber:          DefaultWhatsappNumber,
	}
}

// SettingChange adalah satu perubahan nilai pengaturan (ISettingsChange di client).
type SettingChange struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	From  string `json:"from"`
	To    string `json:"to"`
}

// SettingChangeList adalah kolom jsonb changes di tabel platform_settings_logs.
type SettingChangeList []SettingChange

// Value mengimplementasikan driver.Valuer untuk jsonb.
func (l SettingChangeList) Value() (driver.Value, error) {
	if l == nil {
		return "[]", nil
	}
	raw, err := json.Marshal([]SettingChange(l))
	if err != nil {
		return nil, fmt.Errorf("failed to marshal setting changes: %w", err)
	}
	return string(raw), nil
}

// Scan mengimplementasikan sql.Scanner untuk jsonb.
func (l *SettingChangeList) Scan(value any) error {
	var raw []byte
	switch typed := value.(type) {
	case nil:
		*l = SettingChangeList{}
		return nil
	case []byte:
		raw = typed
	case string:
		raw = []byte(typed)
	default:
		return fmt.Errorf("unsupported type %T for SettingChangeList", value)
	}
	var items []SettingChange
	if err := json.Unmarshal(raw, &items); err != nil {
		return fmt.Errorf("failed to unmarshal setting changes: %w", err)
	}
	if items == nil {
		items = []SettingChange{}
	}
	*l = items
	return nil
}

// PlatformSettingsLog adalah baris tabel platform_settings_logs.
type PlatformSettingsLog struct {
	ID        string            `gorm:"primaryKey"`
	ActorID   string            `gorm:"column:actor_id"`
	Changes   SettingChangeList `gorm:"column:changes;type:jsonb"`
	CreatedAt time.Time         `gorm:"column:created_at"`
}

// TableName mengarahkan GORM ke tabel platform_settings_logs.
func (PlatformSettingsLog) TableName() string {
	return "platform_settings_logs"
}

// SettingsLogEntry adalah satu entri riwayat perubahan pengaturan (ISettingsLogEntry di client).
type SettingsLogEntry struct {
	ID        string
	At        time.Time
	ActorName string
	Changes   []SettingChange
}

// AdminSettings adalah isi halaman Pengaturan panel admin (IAdminSettings di client).
type AdminSettings struct {
	Values   PlatformSettings
	Defaults PlatformSettings
	Log      []SettingsLogEntry
}

// DiffPlatformSettings membandingkan nilai lama dan baru dengan label dan satuan yang sama dengan
// client/src/constants/platformSettings.ts.
func DiffPlatformSettings(current, next PlatformSettings) []SettingChange {
	type intSpec struct {
		key   string
		label string
		unit  string
		from  int
		to    int
	}
	specs := []intSpec{
		{"reviewSlaDays", "SLA review", "hari kerja", current.ReviewSlaDays, next.ReviewSlaDays},
		{"maxRevisions", "Batas pengembalian revisi", "kali", current.MaxRevisions, next.MaxRevisions},
		{"revisionExtraDays", "Tambahan tenggat revisi", "hari", current.RevisionExtraDays, next.RevisionExtraDays},
		{"recommendationThreshold", "Saran skor rekomendasi interview", "poin", current.RecommendationThreshold, next.RecommendationThreshold},
		{"passingScoreAi", "Ambang lulus AI case", "poin", current.PassingScoreAI, next.PassingScoreAI},
		{"passingScoreB2b", "Ambang lulus B2B case", "poin", current.PassingScoreB2B, next.PassingScoreB2B},
		{"b2bStartWindowDays", "Batas mulai B2B setelah dibeli", "hari", current.B2BStartWindowDays, next.B2BStartWindowDays},
		{"paymentWindowHours", "Batas waktu bayar", "jam", current.PaymentWindowHours, next.PaymentWindowHours},
	}

	changes := make([]SettingChange, 0)
	for _, spec := range specs {
		if spec.from != spec.to {
			changes = append(changes, SettingChange{
				Key:   spec.key,
				Label: spec.label,
				From:  fmt.Sprintf("%d %s", spec.from, spec.unit),
				To:    fmt.Sprintf("%d %s", spec.to, spec.unit),
			})
		}
	}
	if current.WhatsappNumber != next.WhatsappNumber {
		changes = append(changes, SettingChange{
			Key:   "whatsappNumber",
			Label: "Nomor WhatsApp Bantuan",
			From:  "+" + current.WhatsappNumber,
			To:    "+" + next.WhatsappNumber,
		})
	}
	return changes
}
