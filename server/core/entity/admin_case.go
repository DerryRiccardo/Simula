package entity

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

// Aturan pembuat case (CONTEXT.md 4.11). Nilainya sama dengan app/admin/cases/_schema.ts di client.
const (
	CaseTitleMinRunes   = 5
	CaseTitleMaxRunes   = 200
	CaseSummaryMinRunes = 20
	CaseAboutMinRunes   = 20
	CaseContextMinRunes = 40
	CaseTextMaxRunes    = 20000
	CaseItemMinRunes    = 2
	CaseItemMaxRunes    = 2000
	CaseListMaxItems    = 30
	CaseMinPriceB2B     = 10000
	SlotMaxSizeMBLimit  = 100
	MaterialMaxSizeMB   = 50
	// MaterialDownloadTTL adalah masa berlaku link unduh materi untuk peserta.
	MaterialDownloadTTL    = 30 * time.Minute
	CaseSlugMaxLength      = 80
	AdminCaseListLimit     = 500
	materialObjectKeyRoot  = "materials"
	defaultSlotKeyFallback = "slot"
)

// MaterialFormats adalah ekstensi yang boleh diunggah sebagai materi pendukung.
var MaterialFormats = []string{"pdf", "docx", "xlsx", "pptx", "csv", "zip", "txt", "md", "png", "jpg", "jpeg"}

// StructureLockStatuses: begitu ada peserta dengan status ini, struktur slot dan rubrik dikunci
// karena draft dan penilaian yang berjalan memakai slot dan rubrik tersebut.
var StructureLockStatuses = []EnrollmentStatus{
	EnrollmentInProgress, EnrollmentAIGrading, EnrollmentInReview,
	EnrollmentRevisionRequested, EnrollmentPassed, EnrollmentFailed,
}

// AdminCaseTask adalah satu tugas di pembuat case.
type AdminCaseTask struct {
	Title       string
	Description string
}

// AdminCaseMaterial adalah satu materi pendukung. FileID wajib: berkas diunggah lebih dulu lewat
// POST /api/admin/uploads.
type AdminCaseMaterial struct {
	Name        string
	Description string
	FileID      string
}

// AdminCaseSlot adalah satu slot deliverable. Formats dipisah koma, mis. "pdf, docx".
type AdminCaseSlot struct {
	Title       string
	Description string
	Kind        SlotKind
	IsRequired  bool
	Formats     string
	MaxSizeMb   int
}

// AdminCaseCriterion adalah satu kriteria rubrik.
type AdminCaseCriterion struct {
	Name        string
	Weight      int
	Description string
}

// AdminCaseInput adalah isi pembuat case (IAdminCaseInput di client). Daftar teks memakai satu
// poin per baris (activities, prerequisites), skill dipisah koma, dan paragraf konteks dipisah
// baris kosong.
type AdminCaseInput struct {
	Tier          Tier
	Title         string
	FieldKey      string
	Level         CaseLevel
	DurationLabel string
	Summary       string
	About         string
	Activities    string
	Skills        string
	Prerequisites string
	Context       string
	Tasks         []AdminCaseTask
	Materials     []AdminCaseMaterial
	Slots         []AdminCaseSlot
	Rubric        []AdminCaseCriterion
	PassingScore  int
	Price         int
	DeadlineDays  int
	PartnerID     string
	ReviewerRole  string
}

// AdminCaseSummary adalah satu baris daftar case di panel admin.
type AdminCaseSummary struct {
	ID                 string
	Title              string
	Tier               Tier
	FieldKey           string
	Level              CaseLevel
	Status             CaseStatus
	PartnerName        *string
	ParticipantCount   int
	PendingReviewCount int
	UpdatedAt          time.Time
}

// AdminCaseDetail adalah case lengkap untuk pembuat case.
type AdminCaseDetail struct {
	Case Case
	// IsStructureLocked: struktur slot dan rubrik tidak bisa diubah (StructureLockStatuses).
	IsStructureLocked bool
	// HasEnrollments: jenis case (AI/B2B) tidak bisa diubah begitu ada enrollment apa pun.
	HasEnrollments bool
}

// MaterialObjectKey menyusun key object R2 untuk materi pendukung.
func MaterialObjectKey(fileID, ext string) string {
	return fmt.Sprintf("%s/%s.%s", materialObjectKeyRoot, fileID, ext)
}

// ValidateMaterialUpload memeriksa format dan ukuran berkas materi.
func ValidateMaterialUpload(fileName string, sizeBytes int64) string {
	if msg := ValidateUploadFileName(fileName); msg != "" {
		return msg
	}
	if !containsString(MaterialFormats, FileExtension(fileName)) {
		return "Format harus " + strings.ToUpper(strings.Join(MaterialFormats, ", "))
	}
	if sizeBytes <= 0 {
		return "Berkas kosong"
	}
	if sizeBytes > int64(MaterialMaxSizeMB)*bytesPerMB {
		return fmt.Sprintf("Ukuran berkas maksimal %d MB", MaterialMaxSizeMB)
	}
	return ""
}

var (
	nonSlugChars    = regexp.MustCompile(`[^a-z0-9]+`)
	paragraphBreaks = regexp.MustCompile(`\n\s*\n`)
)

// Slugify menyusun bagian URL dari teks: huruf kecil ASCII dan angka, dipisah tanda hubung.
// Karakter lain (termasuk huruf beraksen) menjadi pemisah.
func Slugify(text string, maxLength int) string {
	slug := strings.Trim(nonSlugChars.ReplaceAllString(strings.ToLower(text), "-"), "-")
	if len(slug) > maxLength {
		slug = strings.TrimRight(slug[:maxLength], "-")
	}
	return slug
}

// SlotKeys membuat key slot dari judulnya: huruf kecil dengan garis bawah, diawali huruf, dan unik
// dalam satu case (sesuai CHECK slot_key). Judul kosong memakai "slot_N".
func SlotKeys(titles []string) []string {
	keys := make([]string, 0, len(titles))
	used := make(map[string]bool, len(titles))
	for i, title := range titles {
		base := strings.ReplaceAll(Slugify(title, 40), "-", "_")
		if base == "" || base[0] < 'a' || base[0] > 'z' {
			base = fmt.Sprintf("%s_%d", defaultSlotKeyFallback, i+1)
		}
		key := base
		for n := 2; used[key]; n++ {
			key = fmt.Sprintf("%s_%d", base, n)
		}
		used[key] = true
		keys = append(keys, key)
	}
	return keys
}

// SplitLines memecah teks menjadi poin per baris; baris kosong dan penanda daftar ("-", "•")
// dibuang.
func SplitLines(text string) StringList {
	items := StringList{}
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(strings.TrimLeft(strings.TrimSpace(line), "-•*"))
		if line != "" {
			items = append(items, line)
		}
	}
	return items
}

// SplitParagraphs memecah teks menjadi paragraf yang dipisah baris kosong.
func SplitParagraphs(text string) StringList {
	paragraphs := StringList{}
	for _, block := range paragraphBreaks.Split(strings.ReplaceAll(text, "\r\n", "\n"), -1) {
		if block = strings.TrimSpace(block); block != "" {
			paragraphs = append(paragraphs, block)
		}
	}
	return paragraphs
}

// SplitComma memecah teks dipisah koma (skill, format berkas); hasilnya unik dan tanpa spasi.
func SplitComma(text string, lower bool) StringList {
	items := StringList{}
	seen := map[string]bool{}
	for _, part := range strings.Split(text, ",") {
		part = strings.TrimPrefix(strings.TrimSpace(part), ".")
		if lower {
			part = strings.ToLower(part)
		}
		if part != "" && !seen[part] {
			seen[part] = true
			items = append(items, part)
		}
	}
	return items
}
