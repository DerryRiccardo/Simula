package entity

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"
	"unicode/utf8"
)

// SubmissionStatus adalah status satu percobaan submission.
type SubmissionStatus string

const (
	SubmissionDraft             SubmissionStatus = "draft"
	SubmissionSubmitted         SubmissionStatus = "submitted"
	SubmissionRevisionRequested SubmissionStatus = "revision_requested"
	SubmissionReviewed          SubmissionStatus = "reviewed"
)

// Batas isian submission.
const (
	SubmissionNoteMaxLength = 1000
	// TextSlotMaxLength dipakai bila slot teks tidak menentukan panjang maksimal.
	TextSlotMaxLength = 20000
	LinkMaxLength     = 2000
)

// FileRef adalah berkas yang dipilih untuk satu slot. Nama dan ukuran disalin dari tabel files.
type FileRef struct {
	FileID    string
	FileName  string
	SizeBytes int64
}

// SlotValue adalah isian satu slot: teks (isian teks atau tautan) atau berkas. Nilai kosong berarti
// slot belum diisi.
type SlotValue struct {
	Text string
	File *FileRef
}

// IsEmpty bernilai true bila slot belum diisi.
func (v SlotValue) IsEmpty() bool {
	return v.File == nil && strings.TrimSpace(v.Text) == ""
}

// SlotValues adalah kolom jsonb slot_values: isian per slot_key. Bentuk tersimpannya sama dengan
// TSlotValue di client: string, objek berkas, atau null.
type SlotValues map[string]SlotValue

type storedFileRef struct {
	FileID    string `json:"fileId"`
	FileName  string `json:"fileName"`
	SizeBytes int64  `json:"sizeBytes"`
}

// Value mengimplementasikan driver.Valuer.
func (v SlotValues) Value() (driver.Value, error) {
	stored := make(map[string]any, len(v))
	for key, value := range v {
		switch {
		case value.File != nil:
			stored[key] = storedFileRef{FileID: value.File.FileID, FileName: value.File.FileName, SizeBytes: value.File.SizeBytes}
		case value.Text != "":
			stored[key] = value.Text
		default:
			stored[key] = nil
		}
	}
	raw, err := json.Marshal(stored)
	if err != nil {
		return nil, fmt.Errorf("failed to encode slot values: %w", err)
	}
	return string(raw), nil
}

// Scan mengimplementasikan sql.Scanner.
func (v *SlotValues) Scan(value any) error {
	var raw []byte
	switch typed := value.(type) {
	case nil:
		*v = SlotValues{}
		return nil
	case []byte:
		raw = typed
	case string:
		raw = []byte(typed)
	default:
		return fmt.Errorf("unsupported type %T for SlotValues", value)
	}
	var stored map[string]json.RawMessage
	if err := json.Unmarshal(raw, &stored); err != nil {
		return fmt.Errorf("failed to decode slot values: %w", err)
	}
	values := make(SlotValues, len(stored))
	for key, item := range stored {
		var text string
		if err := json.Unmarshal(item, &text); err == nil {
			values[key] = SlotValue{Text: text}
			continue
		}
		var file *storedFileRef
		if err := json.Unmarshal(item, &file); err != nil {
			return fmt.Errorf("failed to decode slot value %s: %w", key, err)
		}
		if file == nil {
			values[key] = SlotValue{}
			continue
		}
		values[key] = SlotValue{File: &FileRef{FileID: file.FileID, FileName: file.FileName, SizeBytes: file.SizeBytes}}
	}
	*v = values
	return nil
}

// FileIDs mengembalikan ID berkas yang dipakai, urut sesuai slot_key agar hasilnya stabil.
func (v SlotValues) FileIDs() []string {
	keys := make([]string, 0, len(v))
	for key := range v {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	ids := make([]string, 0, len(keys))
	for _, key := range keys {
		if file := v[key].File; file != nil {
			ids = append(ids, file.FileID)
		}
	}
	return ids
}

// SubmissionContent adalah isian form submission (ISubmissionContent di client).
type SubmissionContent struct {
	SlotValues   SlotValues
	Note         string
	IsLinkPublic bool
	IsOwnWork    bool
}

// Submission adalah baris tabel submissions: satu percobaan, dari draft sampai diputuskan.
type Submission struct {
	ID           string
	EnrollmentID string
	Attempt      int
	Status       SubmissionStatus
	SubmissionContent
	SavedAt     time.Time
	SubmittedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time

	RevisionRequest *RevisionRequest `gorm:"foreignKey:SubmissionID"`
}

// RevisionRequest adalah keputusan reviewer mengembalikan submission untuk diperbaiki.
type RevisionRequest struct {
	SubmissionID string `gorm:"primaryKey"`
	ReviewerID   string
	Reason       string
	Note         string
	CreatedAt    time.Time
}

// SubmissionHistory memisahkan draft yang sedang dikerjakan dari submission terkirim terakhir.
type SubmissionHistory struct {
	Draft  *Submission
	Latest *Submission
}

// SplitSubmissions mengelompokkan semua submission satu enrollment.
func SplitSubmissions(submissions []Submission) SubmissionHistory {
	var history SubmissionHistory
	for i := range submissions {
		item := &submissions[i]
		if item.Status == SubmissionDraft {
			history.Draft = item
			continue
		}
		if history.Latest == nil || item.Attempt > history.Latest.Attempt {
			history.Latest = item
		}
	}
	return history
}

// ValidateSlotValue memeriksa isian satu slot. strict dipakai saat submit (slot wajib dan panjang
// minimal); draft hanya memeriksa bentuk dan batas atas. Mengembalikan pesan untuk user atau
// string kosong.
func ValidateSlotValue(slot CaseSlot, value SlotValue, strict bool) string {
	if value.IsEmpty() {
		if strict && slot.IsRequired {
			return "Wajib diisi"
		}
		return ""
	}
	switch slot.Kind {
	case SlotKindFile:
		if value.File == nil {
			return "Unggah berkas untuk slot ini"
		}
	case SlotKindLink:
		if value.File != nil {
			return "Slot ini berisi tautan, bukan berkas"
		}
		return validateLink(value.Text, strict)
	case SlotKindText, SlotKindCode:
		if value.File != nil {
			return "Slot ini berisi teks, bukan berkas"
		}
		return validateText(slot, value.Text, strict)
	}
	return ""
}

func validateLink(link string, strict bool) string {
	link = strings.TrimSpace(link)
	if utf8.RuneCountInString(link) > LinkMaxLength {
		return fmt.Sprintf("Tautan maksimal %d karakter", LinkMaxLength)
	}
	if !strict {
		return ""
	}
	parsed, err := url.Parse(link)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return "Masukkan tautan yang valid, diawali https://"
	}
	return ""
}

func validateText(slot CaseSlot, text string, strict bool) string {
	length := utf8.RuneCountInString(strings.TrimSpace(text))
	if maxLength := slot.TextMaxLength(); length > maxLength {
		return fmt.Sprintf("Maksimal %d karakter", maxLength)
	}
	if strict && slot.MinLength != nil && length < *slot.MinLength {
		return fmt.Sprintf("Minimal %d karakter", *slot.MinLength)
	}
	return ""
}

// HasLinkValue bernilai true bila ada slot tautan yang diisi, sehingga pernyataan "tautan dapat
// diakses publik" wajib dicentang.
func HasLinkValue(slots []CaseSlot, values SlotValues) bool {
	for _, slot := range slots {
		if slot.Kind == SlotKindLink && !values[slot.SlotKey].IsEmpty() {
			return true
		}
	}
	return false
}

// StatusEventType adalah peristiwa di timeline halaman status (TStatusEventType di client).
type StatusEventType string

const (
	StatusEventPaid              StatusEventType = "paid"
	StatusEventStarted           StatusEventType = "started"
	StatusEventSubmitted         StatusEventType = "submitted"
	StatusEventRevisionRequested StatusEventType = "revision_requested"
	StatusEventReviewed          StatusEventType = "reviewed"
	StatusEventRetried           StatusEventType = "retried"
)

// StatusEvent adalah satu peristiwa di timeline. Attempt hanya untuk submitted.
type StatusEvent struct {
	Type    StatusEventType
	At      time.Time
	Attempt *int
}

// BuildStatusEvents menyusun timeline dari enrollment dan submission terkirim, urut dari yang
// paling lama.
func BuildStatusEvents(enrollment Enrollment, submissions []Submission) []StatusEvent {
	events := make([]StatusEvent, 0, len(submissions)*2+2)
	if enrollment.StartedAt != nil {
		events = append(events, StatusEvent{Type: StatusEventStarted, At: *enrollment.StartedAt})
	}
	for _, item := range submissions {
		if item.Status == SubmissionDraft || item.SubmittedAt == nil {
			continue
		}
		attempt := item.Attempt
		events = append(events, StatusEvent{Type: StatusEventSubmitted, At: *item.SubmittedAt, Attempt: &attempt})
		if item.RevisionRequest != nil {
			events = append(events, StatusEvent{Type: StatusEventRevisionRequested, At: item.RevisionRequest.CreatedAt})
		}
	}
	if enrollment.LastRetriedAt != nil {
		events = append(events, StatusEvent{Type: StatusEventRetried, At: *enrollment.LastRetriedAt})
	}
	sort.SliceStable(events, func(i, j int) bool { return events[i].At.Before(events[j].At) })
	return events
}

// AIGradingEstimatePerCriterion dipakai menampilkan perkiraan selesai penilaian AI.
const AIGradingEstimatePerCriterion = 30 * time.Second

// AIGradingProgress adalah progres penilaian AI di halaman status.
type AIGradingProgress struct {
	StartedAt       time.Time
	EstimatedDoneAt time.Time
	CheckedCriteria int
}

// EstimateAIGrading memperkirakan progres penilaian AI yang dimulai saat submit.
func EstimateAIGrading(submittedAt time.Time, criteriaCount int) AIGradingProgress {
	return AIGradingProgress{
		StartedAt:       submittedAt,
		EstimatedDoneAt: submittedAt.Add(time.Duration(criteriaCount) * AIGradingEstimatePerCriterion),
	}
}
