package entity

import (
	"fmt"
	"path"
	"strings"
	"time"
	"unicode/utf8"
)

// FilePurpose adalah kegunaan berkas di R2.
type FilePurpose string

const (
	FilePurposeSubmission  FilePurpose = "submission"
	FilePurposeMaterial    FilePurpose = "material"
	FilePurposePartnerLogo FilePurpose = "partner_logo"
)

// FileStatus menandai apakah berkas sudah dipakai. Berkas pending yang lama tidak dipakai dihapus
// task pembersihan.
type FileStatus string

const (
	FileStatusPending  FileStatus = "pending"
	FileStatusAttached FileStatus = "attached"
)

// Batas unggahan berkas submission.
const (
	FileNameMaxLength = 200
	// DefaultSlotMaxSizeMB dipakai bila slot tidak menentukan ukuran maksimal.
	DefaultSlotMaxSizeMB = 10
	// PendingFileRetention adalah umur berkas pending sebelum dihapus task pembersihan.
	PendingFileRetention = 24 * time.Hour
	// PendingFileCleanupBatch membatasi jumlah berkas yang dihapus dalam satu kali task.
	PendingFileCleanupBatch = 200
	bytesPerMB              = 1024 * 1024
)

// DefaultSlotFormats dipakai bila slot berkas tidak menentukan format.
var DefaultSlotFormats = []string{"pdf", "docx", "xlsx", "pptx", "zip"}

// contentTypes memetakan ekstensi ke content type yang ditandatangani di URL unggah. Content type
// ditentukan server, bukan dari client.
var contentTypes = map[string]string{
	"pdf":  "application/pdf",
	"doc":  "application/msword",
	"docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"xls":  "application/vnd.ms-excel",
	"xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"ppt":  "application/vnd.ms-powerpoint",
	"pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"csv":  "text/csv",
	"txt":  "text/plain",
	"md":   "text/markdown",
	"zip":  "application/zip",
	"png":  "image/png",
	"jpg":  "image/jpeg",
	"jpeg": "image/jpeg",
}

// File adalah baris tabel files: metadata satu berkas di R2.
type File struct {
	ID          string
	UploadedBy  string
	Purpose     FilePurpose
	ObjectKey   string
	FileName    string
	ContentType string
	SizeBytes   int64
	Status      FileStatus
	CreatedAt   time.Time
}

// PresignedUpload adalah URL unggah langsung ke R2 beserta header yang wajib dikirim browser.
type PresignedUpload struct {
	URL       string
	Headers   map[string]string
	ExpiresAt time.Time
}

// StoredObject adalah metadata object yang benar-benar ada di R2.
type StoredObject struct {
	SizeBytes   int64
	ContentType string
}

// FileExtension mengembalikan ekstensi berkas tanpa titik, huruf kecil.
func FileExtension(fileName string) string {
	return strings.ToLower(strings.TrimPrefix(path.Ext(fileName), "."))
}

// ContentTypeForExtension mengembalikan content type untuk ekstensi yang dikenal, atau
// application/octet-stream.
func ContentTypeForExtension(ext string) string {
	if contentType, ok := contentTypes[ext]; ok {
		return contentType
	}
	return "application/octet-stream"
}

// SameContentType membandingkan content type tanpa parameter seperti charset.
func SameContentType(a, b string) bool {
	return strings.EqualFold(mediaType(a), mediaType(b))
}

func mediaType(contentType string) string {
	base, _, _ := strings.Cut(contentType, ";")
	return strings.TrimSpace(base)
}

// SubmissionObjectKey menyusun key object R2 untuk berkas submission (RULES §12). Nama berkas asli
// tidak dipakai di key.
func SubmissionObjectKey(enrollmentID string, attempt int, slotKey, fileID, ext string) string {
	return fmt.Sprintf("submissions/%s/%d/%s/%s.%s", enrollmentID, attempt, slotKey, fileID, ext)
}

// BelongsToSlot bernilai true bila berkas diunggah untuk slot ini di enrollment ini (percobaan
// mana pun).
func (f *File) BelongsToSlot(enrollmentID, slotKey string) bool {
	parts := strings.Split(f.ObjectKey, "/")
	return f.Purpose == FilePurposeSubmission && len(parts) == 5 &&
		parts[0] == "submissions" && parts[1] == enrollmentID && parts[3] == slotKey
}

// ValidateUploadFileName memeriksa nama berkas yang diunggah. Mengembalikan pesan untuk user, atau
// string kosong bila valid.
func ValidateUploadFileName(fileName string) string {
	switch {
	case fileName == "":
		return "Nama berkas wajib diisi"
	case utf8.RuneCountInString(fileName) > FileNameMaxLength:
		return fmt.Sprintf("Nama berkas maksimal %d karakter", FileNameMaxLength)
	case FileExtension(fileName) == "":
		return "Nama berkas harus memiliki ekstensi, misalnya laporan.pdf"
	}
	return ""
}

// ValidateUploadForSlot memeriksa format dan ukuran berkas terhadap aturan slot.
func ValidateUploadForSlot(slot CaseSlot, fileName string, sizeBytes int64) string {
	if slot.Kind != SlotKindFile {
		return "Slot ini tidak menerima berkas"
	}
	formats := slot.AllowedFormats()
	ext := FileExtension(fileName)
	if !containsString(formats, ext) {
		return "Format harus " + strings.ToUpper(strings.Join(formats, ", "))
	}
	if sizeBytes <= 0 {
		return "Berkas kosong"
	}
	if maxMB := slot.MaxSizeMB(); sizeBytes > int64(maxMB)*bytesPerMB {
		return fmt.Sprintf("Ukuran berkas maksimal %d MB", maxMB)
	}
	return ""
}

func containsString(items []string, item string) bool {
	for _, candidate := range items {
		if candidate == item {
			return true
		}
	}
	return false
}
