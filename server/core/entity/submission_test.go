package entity

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAddBusinessDays(t *testing.T) {
	tests := []struct {
		name string
		from time.Time
		days int
		want time.Time
	}{
		// 23 Oktober 2026 hari Jumat. Jam 10.00 UTC = 17.00 WIB.
		{name: "friday skips the weekend", from: time.Date(2026, 10, 23, 10, 0, 0, 0, time.UTC), days: 5,
			want: time.Date(2026, 10, 30, 10, 0, 0, 0, time.UTC)},
		{name: "saturday counts from monday", from: time.Date(2026, 10, 24, 10, 0, 0, 0, time.UTC), days: 1,
			want: time.Date(2026, 10, 26, 10, 0, 0, 0, time.UTC)},
		// Jumat 20.00 UTC sudah Sabtu 03.00 WIB, jadi hari kerja dihitung di zona Jakarta.
		{name: "uses Jakarta date, not UTC", from: time.Date(2026, 10, 23, 20, 0, 0, 0, time.UTC), days: 1,
			want: time.Date(2026, 10, 25, 20, 0, 0, 0, time.UTC)},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, AddBusinessDays(tc.from, tc.days))
		})
	}
}

func TestWorkDeadlineAndPastDeadline(t *testing.T) {
	start := time.Date(2026, 10, 24, 10, 0, 0, 0, time.UTC)
	days := 7

	deadline := WorkDeadline(start, &days)
	require.NotNil(t, deadline)
	assert.Equal(t, time.Date(2026, 10, 31, 10, 0, 0, 0, time.UTC), *deadline, "calendar days, weekends included")
	assert.Nil(t, WorkDeadline(start, nil), "AI case has no deadline")

	enrollment := Enrollment{DeadlineAt: deadline}
	assert.False(t, enrollment.IsPastDeadline(deadline.Add(-time.Second)))
	assert.True(t, enrollment.IsPastDeadline(*deadline))
}

func TestSlotValues_RoundTrip(t *testing.T) {
	values := SlotValues{
		"memo":   {Text: "Isi memo"},
		"design": {File: &FileRef{FileID: "f-1", FileName: "design.pdf", SizeBytes: 2048}},
		"kosong": {},
	}

	raw, err := values.Value()
	require.NoError(t, err)
	assert.JSONEq(t, `{"memo":"Isi memo","design":{"fileId":"f-1","fileName":"design.pdf","sizeBytes":2048},"kosong":null}`, raw.(string))

	var decoded SlotValues
	require.NoError(t, decoded.Scan([]byte(raw.(string))))
	assert.Equal(t, values, decoded)
	assert.Equal(t, []string{"f-1"}, decoded.FileIDs())
}

func TestValidateSlotValue(t *testing.T) {
	minLength, maxLength := 5, 10
	textSlot := CaseSlot{SlotKey: "memo", Kind: SlotKindText, IsRequired: true, MinLength: &minLength, MaxLength: &maxLength}
	linkSlot := CaseSlot{SlotKey: "repo", Kind: SlotKindLink, IsRequired: true}
	fileSlot := CaseSlot{SlotKey: "doc", Kind: SlotKindFile}
	file := &FileRef{FileID: "f-1"}

	tests := []struct {
		name    string
		slot    CaseSlot
		value   SlotValue
		strict  bool
		wantErr bool
	}{
		{name: "empty required slot is fine in a draft", slot: textSlot, value: SlotValue{}},
		{name: "empty required slot fails on submit", slot: textSlot, value: SlotValue{}, strict: true, wantErr: true},
		{name: "short text is fine in a draft", slot: textSlot, value: SlotValue{Text: "abc"}},
		{name: "short text fails on submit", slot: textSlot, value: SlotValue{Text: "abc"}, strict: true, wantErr: true},
		{name: "text over the limit fails even in a draft", slot: textSlot, value: SlotValue{Text: "lebih dari sepuluh"}, wantErr: true},
		{name: "valid link", slot: linkSlot, value: SlotValue{Text: "https://github.com/a/b"}, strict: true},
		{name: "link without scheme", slot: linkSlot, value: SlotValue{Text: "github.com/a/b"}, strict: true, wantErr: true},
		{name: "file in a link slot", slot: linkSlot, value: SlotValue{File: file}, wantErr: true},
		{name: "text in a file slot", slot: fileSlot, value: SlotValue{Text: "x"}, wantErr: true},
		{name: "optional file slot left empty", slot: fileSlot, value: SlotValue{}, strict: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			msg := ValidateSlotValue(tc.slot, tc.value, tc.strict)
			assert.Equal(t, tc.wantErr, msg != "", msg)
		})
	}
}

func TestSplitSubmissions(t *testing.T) {
	empty := SplitSubmissions(nil)
	assert.Nil(t, empty.Draft)
	assert.Nil(t, empty.Latest)

	history := SplitSubmissions([]Submission{
		{ID: "a1", Attempt: 1, Status: SubmissionRevisionRequested},
		{ID: "a2", Attempt: 2, Status: SubmissionDraft},
	})
	assert.Equal(t, "a2", history.Draft.ID)
	assert.Equal(t, "a1", history.Latest.ID, "the latest sent attempt, not the open draft")
}

func TestFileRules(t *testing.T) {
	key := SubmissionObjectKey("enr-1", 2, "design_doc", "file-1", "pdf")
	assert.Equal(t, "submissions/enr-1/2/design_doc/file-1.pdf", key)

	file := File{Purpose: FilePurposeSubmission, ObjectKey: key}
	assert.True(t, file.BelongsToSlot("enr-1", "design_doc"))
	assert.False(t, file.BelongsToSlot("enr-2", "design_doc"), "another enrollment")
	assert.False(t, file.BelongsToSlot("enr-1", "repo"), "another slot")

	maxSize := 1
	slot := CaseSlot{Kind: SlotKindFile, Formats: StringList{"pdf"}, MaxSizeMb: &maxSize}
	assert.Empty(t, ValidateUploadForSlot(slot, "Laporan.PDF", 1024))
	assert.NotEmpty(t, ValidateUploadForSlot(slot, "laporan.docx", 1024))
	assert.NotEmpty(t, ValidateUploadForSlot(slot, "laporan.pdf", 2*1024*1024))
	assert.NotEmpty(t, ValidateUploadFileName("README"))
	assert.Equal(t, "application/zip", ContentTypeForExtension("zip"))
	assert.True(t, SameContentType("text/csv; charset=utf-8", "text/csv"))
	assert.False(t, SameContentType("application/pdf", "application/zip"))
}
