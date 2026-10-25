package entity

import "time"

// Tier adalah jenis produk case. Nilainya sama dengan TTier di client.
type Tier string

const (
	TierAI  Tier = "ai"
	TierB2B Tier = "b2b"
)

// IsValid memeriksa apakah tier dikenal.
func (t Tier) IsValid() bool {
	return t == TierAI || t == TierB2B
}

// CaseLevel adalah tingkat kesulitan case.
type CaseLevel string

const (
	CaseLevelBeginner     CaseLevel = "beginner"
	CaseLevelIntermediate CaseLevel = "intermediate"
	CaseLevelAdvanced     CaseLevel = "advanced"
)

// IsValid memeriksa apakah level dikenal.
func (l CaseLevel) IsValid() bool {
	return l == CaseLevelBeginner || l == CaseLevelIntermediate || l == CaseLevelAdvanced
}

// CaseStatus adalah status penerbitan case oleh admin.
type CaseStatus string

const (
	CaseStatusDraft     CaseStatus = "draft"
	CaseStatusPublished CaseStatus = "published"
)

// SearchMaxLength adalah panjang maksimal kata kunci pencarian katalog dan Case Saya.
const SearchMaxLength = 100

// UnpaginatedListLimit membatasi daftar milik satu user yang tidak memakai pagination (Case Saya,
// Sertifikat Saya).
const UnpaginatedListLimit = 500

// CaseSort adalah urutan katalog. Nilainya sama dengan TCaseSort di client.
type CaseSort string

const (
	CaseSortRelevance CaseSort = "relevance"
	CaseSortPopular   CaseSort = "popular"
	CaseSortRating    CaseSort = "rating"
	CaseSortPriceLow  CaseSort = "price_low"
)

// IsValid memeriksa apakah urutan dikenal.
func (s CaseSort) IsValid() bool {
	switch s {
	case CaseSortRelevance, CaseSortPopular, CaseSortRating, CaseSortPriceLow:
		return true
	}
	return false
}

// Partner adalah perusahaan mitra B2B (tabel partners).
type Partner struct {
	ID         string
	Name       string
	Industry   string
	About      string
	LogoFileID *string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// Case adalah baris tabel cases beserta relasinya. Field bertanda gorm:"->" dihitung saat query
// (lihat repository/db) dan tidak pernah ditulis.
type Case struct {
	ID            string
	Slug          string
	Tier          Tier
	Status        CaseStatus
	Title         string
	Summary       string
	FieldKey      string
	Level         CaseLevel
	DurationLabel string
	About         string
	Activities    StringList
	Skills        StringList
	Prerequisites StringList
	Context       StringList
	PassingScore  int
	Price         *int
	DeadlineDays  *int
	PartnerID     *string
	ReviewerRole  *string
	CreatedBy     *string
	PublishedAt   *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time

	Partner   *Partner
	Tasks     []CaseTask        `gorm:"foreignKey:CaseID"`
	Slots     []CaseSlot        `gorm:"foreignKey:CaseID"`
	Rubric    []RubricCriterion `gorm:"foreignKey:CaseID"`
	Materials []CaseMaterial    `gorm:"foreignKey:CaseID"`

	// DeliverableCount adalah jumlah slot submission.
	DeliverableCount int `gorm:"->;-:migration"`
	// ParticipantCount tidak menghitung order yang belum dibayar.
	ParticipantCount int `gorm:"->;-:migration"`
	// Rating adalah rata-rata case_ratings, 0 bila belum ada.
	Rating float64 `gorm:"->;-:migration"`
}

// IsPublished bernilai true bila case tampil di katalog.
func (c *Case) IsPublished() bool {
	return c.Status == CaseStatusPublished
}

// PartnerName mengembalikan nama mitra, atau nil untuk AI case.
func (c *Case) PartnerName() *string {
	if c.Partner == nil {
		return nil
	}
	name := c.Partner.Name
	return &name
}

// SlotByKey mencari slot submission berdasarkan slot_key.
func (c *Case) SlotByKey(key string) (CaseSlot, bool) {
	for _, slot := range c.Slots {
		if slot.SlotKey == key {
			return slot, true
		}
	}
	return CaseSlot{}, false
}

// CaseTask adalah satu tugas di brief lengkap.
type CaseTask struct {
	ID          string
	CaseID      string
	Position    int
	Title       string
	Description string
}

// SlotKind adalah jenis slot submission.
type SlotKind string

const (
	SlotKindText SlotKind = "text"
	SlotKindFile SlotKind = "file"
	SlotKindLink SlotKind = "link"
	SlotKindCode SlotKind = "code"
)

// CaseSlot adalah slot deliverable submission. SlotKey dipakai client sebagai id slot.
type CaseSlot struct {
	ID          string
	CaseID      string
	SlotKey     string
	Position    int
	Title       string
	Description string
	Kind        SlotKind
	IsRequired  bool
	Formats     StringList
	MaxSizeMb   *int
	LinkHint    string
	MinLength   *int
	MaxLength   *int
}

// AllowedFormats mengembalikan ekstensi yang diterima slot berkas.
func (s CaseSlot) AllowedFormats() []string {
	if len(s.Formats) == 0 {
		return DefaultSlotFormats
	}
	return s.Formats
}

// MaxSizeMB mengembalikan ukuran maksimal berkas slot dalam MB.
func (s CaseSlot) MaxSizeMB() int {
	if s.MaxSizeMb == nil || *s.MaxSizeMb <= 0 {
		return DefaultSlotMaxSizeMB
	}
	return *s.MaxSizeMb
}

// TextMaxLength mengembalikan panjang maksimal isian teks slot.
func (s CaseSlot) TextMaxLength() int {
	if s.MaxLength == nil || *s.MaxLength <= 0 {
		return TextSlotMaxLength
	}
	return *s.MaxLength
}

// CaseMaterial adalah materi pendukung yang bisa diunduh peserta yang sudah mulai atau membayar.
type CaseMaterial struct {
	ID          string
	CaseID      string
	Position    int
	Name        string
	Description string
	FileID      string
	File        *File
}

// RubricCriterion adalah satu kriteria rubrik. LevelDescriptions kosong atau berisi 5 deskripsi.
type RubricCriterion struct {
	ID                string
	CaseID            string
	Position          int
	Name              string
	Weight            int
	Description       string
	LevelDescriptions StringList
}

// TableName mengikuti nama tabel di migrasi; pluralisasi GORM menghasilkan "rubric_criterions".
func (RubricCriterion) TableName() string {
	return "rubric_criteria"
}
