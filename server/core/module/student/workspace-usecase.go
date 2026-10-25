package student

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

const (
	msgEnrollmentNotFound = "Case tidak ditemukan di akunmu."
	msgNotEditable        = "Submission ini sudah terkirim dan tidak bisa diubah."
	msgDeadlinePassed     = "Tenggat pengerjaan sudah lewat."
	msgAlreadyStarted     = "Case ini sudah dimulai."
	msgPaymentRequired    = "Selesaikan pembayaran sebelum mulai mengerjakan."
	msgFileMissing        = "Berkas tidak ditemukan. Unggah ulang."
	msgFileNotUploaded    = "Berkas belum selesai diunggah. Unggah ulang."
)

// Workspace adalah isi halaman pengerjaan (ICaseWorkspace di client). Case sudah memuat brief
// lengkap, tetapi brief hanya boleh dikirim bila CanViewBrief.
type Workspace struct {
	Case         entity.Case
	Enrollment   *entity.Enrollment
	CanViewBrief bool
	Draft        *entity.Submission
	Submission   *entity.Submission
	Revision     *entity.RevisionRequest
}

// CaseStatus adalah isi halaman status (ICaseStatus di client). Slot dan rubrik hanya boleh dikirim
// bila CanViewBrief.
type CaseStatus struct {
	Case         entity.Case
	Enrollment   *entity.Enrollment
	CanViewBrief bool
	Submission   *entity.Submission
	Events       []entity.StatusEvent
	AIGrading    *entity.AIGradingProgress
}

// WorkspaceUseCase melayani halaman pengerjaan dan halaman status peserta.
type WorkspaceUseCase interface {
	GetWorkspace(ctx context.Context, slug string) (Workspace, error)
	// StartWork memulai case B2B yang sudah dibayar; tenggat dihitung sejak saat ini.
	StartWork(ctx context.Context, enrollmentID string) (entity.Enrollment, error)
	SaveDraft(ctx context.Context, enrollmentID string, content entity.SubmissionContent) (entity.Submission, error)
	// Submit mengirim submission: AI menjadi ai_grading, B2B menjadi in_review.
	Submit(ctx context.Context, enrollmentID string, content entity.SubmissionContent) (entity.Enrollment, error)
	GetStatus(ctx context.Context, slug string) (CaseStatus, error)
}

// WorkspaceDeps adalah dependency use case workspace.
type WorkspaceDeps struct {
	Cases       coreRepo.CaseRepository
	Enrollments coreRepo.EnrollmentRepository
	Submissions coreRepo.SubmissionRepository
	Files       coreRepo.FileRepository
	Storage     coreRepo.Storage
	Now         func() time.Time
}

type workspaceUseCase struct {
	WorkspaceDeps
}

// InitWorkspaceUseCase membuat use case workspace.
func InitWorkspaceUseCase(deps WorkspaceDeps) WorkspaceUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &workspaceUseCase{WorkspaceDeps: deps}
}

func (uc *workspaceUseCase) GetWorkspace(ctx context.Context, slug string) (Workspace, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return Workspace{}, apperror.Unauthenticated("")
	}
	c, enrollment, err := findCaseWithEnrollment(ctx, uc.Cases, uc.Enrollments, current.ID, slug)
	if err != nil {
		return Workspace{}, err
	}
	workspace := Workspace{Case: c, Enrollment: enrollment}
	if enrollment == nil || !enrollment.CanViewBrief() {
		return workspace, nil
	}

	submissions, err := uc.Submissions.ListByEnrollment(ctx, enrollment.ID)
	if err != nil {
		return Workspace{}, apperror.Internal(err)
	}
	history := entity.SplitSubmissions(submissions)
	workspace.CanViewBrief = true
	workspace.Draft = history.Draft
	workspace.Submission = history.Latest
	if enrollment.Status == entity.EnrollmentRevisionRequested && history.Latest != nil {
		workspace.Revision = history.Latest.RevisionRequest
	}
	return workspace, nil
}

func (uc *workspaceUseCase) StartWork(ctx context.Context, enrollmentID string) (entity.Enrollment, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.Enrollment{}, apperror.Unauthenticated("")
	}
	enrollment, err := getOwnedEnrollment(ctx, uc.Enrollments, current.ID, enrollmentID)
	if err != nil {
		return entity.Enrollment{}, err
	}
	if enrollment.Status == entity.EnrollmentPendingPayment {
		return entity.Enrollment{}, apperror.Conflict(msgPaymentRequired)
	}
	if !enrollment.CanStart() {
		return entity.Enrollment{}, apperror.Conflict(msgAlreadyStarted)
	}

	c, err := uc.Cases.GetByID(ctx, enrollment.CaseID)
	if err != nil {
		return entity.Enrollment{}, apperror.Internal(err)
	}
	now := uc.Now()
	err = uc.Enrollments.Start(ctx, enrollment.ID, now, entity.WorkDeadline(now, c.DeadlineDays))
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return entity.Enrollment{}, apperror.Conflict(msgAlreadyStarted)
	}
	if err != nil {
		return entity.Enrollment{}, apperror.Internal(err)
	}
	return reloadEnrollment(ctx, uc.Enrollments, current.ID, enrollment.ID)
}

func (uc *workspaceUseCase) SaveDraft(ctx context.Context, enrollmentID string, content entity.SubmissionContent) (entity.Submission, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.Submission{}, apperror.Unauthenticated("")
	}
	now := uc.Now()
	enrollment, c, err := loadEditableWork(ctx, uc.Enrollments, uc.Cases, current.ID, enrollmentID, now)
	if err != nil {
		return entity.Submission{}, err
	}
	content = normalizeContent(content)
	if fields := validateContent(c.Slots, content, false); len(fields) > 0 {
		return entity.Submission{}, apperror.Validation(fields...)
	}
	resolved, files, fileFields, err := uc.resolveFiles(ctx, current.ID, enrollment.ID, content.SlotValues)
	if err != nil {
		return entity.Submission{}, err
	}
	if len(fileFields) > 0 {
		return entity.Submission{}, apperror.Validation(fileFields...)
	}
	content.SlotValues = resolved

	// ID dipakai bila draft baru dibuat; nomor percobaan ditentukan repository.
	draft := entity.Submission{
		ID:                uuid.NewString(),
		EnrollmentID:      enrollment.ID,
		Status:            entity.SubmissionDraft,
		SubmissionContent: content,
		SavedAt:           now,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	err = uc.Submissions.SaveDraft(ctx, &draft, pendingFileIDs(files))
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return entity.Submission{}, apperror.Conflict(msgNotEditable)
	}
	if err != nil {
		return entity.Submission{}, apperror.Internal(err)
	}
	return draft, nil
}

func (uc *workspaceUseCase) Submit(ctx context.Context, enrollmentID string, content entity.SubmissionContent) (entity.Enrollment, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.Enrollment{}, apperror.Unauthenticated("")
	}
	now := uc.Now()
	enrollment, c, err := loadEditableWork(ctx, uc.Enrollments, uc.Cases, current.ID, enrollmentID, now)
	if err != nil {
		return entity.Enrollment{}, err
	}
	content = normalizeContent(content)
	if fields := validateContent(c.Slots, content, true); len(fields) > 0 {
		return entity.Enrollment{}, apperror.Validation(fields...)
	}
	resolved, files, fileFields, err := uc.resolveFiles(ctx, current.ID, enrollment.ID, content.SlotValues)
	if err != nil {
		return entity.Enrollment{}, err
	}
	if len(fileFields) > 0 {
		return entity.Enrollment{}, apperror.Validation(fileFields...)
	}
	content.SlotValues = resolved
	uploadFields, err := uc.verifyUploads(ctx, files, resolved)
	if err != nil {
		return entity.Enrollment{}, err
	}
	if len(uploadFields) > 0 {
		return entity.Enrollment{}, apperror.Validation(uploadFields...)
	}

	// Draft yang terbuka diubah menjadi terkirim; ID ini hanya dipakai bila belum ada draft.
	submission := entity.Submission{
		ID:                uuid.NewString(),
		EnrollmentID:      enrollment.ID,
		Status:            entity.SubmissionSubmitted,
		SubmissionContent: content,
		SavedAt:           now,
		SubmittedAt:       &now,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	change := entity.EnrollmentStatusChange{
		EnrollmentID: enrollment.ID,
		From:         entity.EditableStatuses,
		To:           entity.StatusAfterSubmit(c.Tier),
		ChangedAt:    now,
	}
	if change.To == entity.EnrollmentInReview {
		dueAt := entity.AddBusinessDays(now, entity.ReviewSLABusinessDays)
		change.ReviewDueAt = &dueAt
	}

	err = uc.Submissions.Submit(ctx, &submission, pendingFileIDs(files), change)
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return entity.Enrollment{}, apperror.Conflict(msgNotEditable)
	}
	if err != nil {
		return entity.Enrollment{}, apperror.Internal(err)
	}
	return reloadEnrollment(ctx, uc.Enrollments, current.ID, enrollment.ID)
}

func (uc *workspaceUseCase) GetStatus(ctx context.Context, slug string) (CaseStatus, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return CaseStatus{}, apperror.Unauthenticated("")
	}
	c, enrollment, err := findCaseWithEnrollment(ctx, uc.Cases, uc.Enrollments, current.ID, slug)
	if err != nil {
		return CaseStatus{}, err
	}
	status := CaseStatus{Case: c, Enrollment: enrollment, Events: []entity.StatusEvent{}}
	if enrollment == nil || !enrollment.CanViewBrief() {
		return status, nil
	}

	submissions, err := uc.Submissions.ListByEnrollment(ctx, enrollment.ID)
	if err != nil {
		return CaseStatus{}, apperror.Internal(err)
	}
	latest := entity.SplitSubmissions(submissions).Latest
	status.CanViewBrief = true
	status.Submission = latest
	status.Events = entity.BuildStatusEvents(*enrollment, submissions)
	if enrollment.Status == entity.EnrollmentAIGrading && latest != nil && latest.SubmittedAt != nil {
		progress := entity.EstimateAIGrading(*latest.SubmittedAt, len(c.Rubric))
		status.AIGrading = &progress
	}
	return status, nil
}

// resolveFiles memastikan setiap berkas yang dipilih milik user dan diunggah untuk slot yang sama,
// lalu menyalin nama dan ukuran dari tabel files (data dari client tidak dipercaya). Berkas yang
// valid dikembalikan per ID. Dipanggil setelah validateContent, jadi setiap fileId sudah UUID.
func (uc *workspaceUseCase) resolveFiles(ctx context.Context, userID, enrollmentID string, values entity.SlotValues) (entity.SlotValues, map[string]entity.File, []apperror.FieldError, error) {
	files, err := uc.Files.ListByIDs(ctx, userID, values.FileIDs())
	if err != nil {
		return nil, nil, nil, apperror.Internal(err)
	}
	byID := make(map[string]entity.File, len(files))
	for _, file := range files {
		byID[file.ID] = file
	}

	resolved := make(entity.SlotValues, len(values))
	var fields []apperror.FieldError
	for _, key := range sortedKeys(values) {
		value := values[key]
		if value.File == nil {
			resolved[key] = value
			continue
		}
		file, ok := byID[value.File.FileID]
		if !ok || !file.BelongsToSlot(enrollmentID, key) {
			fields = append(fields, apperror.FieldError{Field: slotField(key), Message: msgFileMissing})
			continue
		}
		resolved[key] = entity.SlotValue{File: &entity.FileRef{FileID: file.ID, FileName: file.FileName, SizeBytes: file.SizeBytes}}
	}
	return resolved, byID, fields, nil
}

// verifyUploads memeriksa setiap berkas benar-benar ada di R2 dengan ukuran dan tipe yang
// ditandatangani saat presign.
func (uc *workspaceUseCase) verifyUploads(ctx context.Context, files map[string]entity.File, values entity.SlotValues) ([]apperror.FieldError, error) {
	var fields []apperror.FieldError
	for _, key := range sortedKeys(values) {
		ref := values[key].File
		if ref == nil {
			continue
		}
		file := files[ref.FileID]
		object, err := uc.Storage.HeadObject(ctx, file.ObjectKey)
		if errors.Is(err, coreErrors.ErrObjectNotFound) {
			fields = append(fields, apperror.FieldError{Field: slotField(key), Message: msgFileNotUploaded})
			continue
		}
		if err != nil {
			return nil, apperror.Internal(fmt.Errorf("failed to verify upload %s: %w", file.ID, err))
		}
		if object.SizeBytes != file.SizeBytes || !entity.SameContentType(object.ContentType, file.ContentType) {
			fields = append(fields, apperror.FieldError{Field: slotField(key), Message: msgFileNotUploaded})
		}
	}
	return fields, nil
}

// findCaseWithEnrollment mencari case beserta enrollment user. Case yang belum atau tidak lagi
// terbit hanya terlihat oleh peserta yang sudah mengambilnya.
func findCaseWithEnrollment(ctx context.Context, cases coreRepo.CaseRepository, enrollments coreRepo.EnrollmentRepository, userID, slug string) (entity.Case, *entity.Enrollment, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return entity.Case{}, nil, apperror.NotFound(msgCaseNotFound)
	}
	c, err := cases.GetWithBriefBySlug(ctx, slug)
	if errors.Is(err, coreErrors.ErrCaseNotFound) {
		return entity.Case{}, nil, apperror.NotFound(msgCaseNotFound)
	}
	if err != nil {
		return entity.Case{}, nil, apperror.Internal(err)
	}

	enrollment, err := enrollments.FindWithCertificate(ctx, userID, c.ID)
	if errors.Is(err, coreErrors.ErrEnrollmentNotFound) {
		if !c.IsPublished() {
			return entity.Case{}, nil, apperror.NotFound(msgCaseNotFound)
		}
		return c, nil, nil
	}
	if err != nil {
		return entity.Case{}, nil, apperror.Internal(err)
	}
	// Case dengan kolom terhitung sudah dimuat untuk brief, jadi dipakai ulang sebagai ringkasan.
	enrollment.Case = &c
	return c, &enrollment, nil
}

// getOwnedEnrollment memuat baris enrollment milik user tanpa relasi. Enrollment orang lain
// dianggap tidak ada.
func getOwnedEnrollment(ctx context.Context, enrollments coreRepo.EnrollmentRepository, userID, enrollmentID string) (entity.Enrollment, error) {
	if _, err := uuid.Parse(enrollmentID); err != nil {
		return entity.Enrollment{}, apperror.NotFound(msgEnrollmentNotFound)
	}
	enrollment, err := enrollments.GetByIDForUser(ctx, userID, enrollmentID)
	if errors.Is(err, coreErrors.ErrEnrollmentNotFound) {
		return entity.Enrollment{}, apperror.NotFound(msgEnrollmentNotFound)
	}
	if err != nil {
		return entity.Enrollment{}, apperror.Internal(err)
	}
	return enrollment, nil
}

func reloadEnrollment(ctx context.Context, enrollments coreRepo.EnrollmentRepository, userID, enrollmentID string) (entity.Enrollment, error) {
	enrollment, err := enrollments.GetForUser(ctx, userID, enrollmentID)
	if err != nil {
		return entity.Enrollment{}, apperror.Internal(err)
	}
	return enrollment, nil
}

// loadEditableWork memuat enrollment yang masih bisa dikerjakan beserta aturan slot case-nya.
func loadEditableWork(ctx context.Context, enrollments coreRepo.EnrollmentRepository, cases coreRepo.CaseRepository, userID, enrollmentID string, now time.Time) (entity.Enrollment, entity.Case, error) {
	enrollment, err := getOwnedEnrollment(ctx, enrollments, userID, enrollmentID)
	if err != nil {
		return entity.Enrollment{}, entity.Case{}, err
	}
	if !enrollment.IsEditable() {
		return entity.Enrollment{}, entity.Case{}, apperror.Conflict(msgNotEditable)
	}
	if enrollment.IsPastDeadline(now) {
		return entity.Enrollment{}, entity.Case{}, apperror.Conflict(msgDeadlinePassed)
	}
	c, err := cases.GetWithSlotsByID(ctx, enrollment.CaseID)
	if err != nil {
		return entity.Enrollment{}, entity.Case{}, apperror.Internal(err)
	}
	return enrollment, c, nil
}

func normalizeContent(content entity.SubmissionContent) entity.SubmissionContent {
	values := make(entity.SlotValues, len(content.SlotValues))
	for key, value := range content.SlotValues {
		if value.File == nil {
			value.Text = strings.TrimSpace(value.Text)
		}
		values[key] = value
	}
	content.SlotValues = values
	content.Note = strings.TrimSpace(content.Note)
	return content
}

// validateContent memeriksa isian terhadap slot case. strict dipakai saat submit.
func validateContent(slots []entity.CaseSlot, content entity.SubmissionContent, strict bool) []apperror.FieldError {
	var fields []apperror.FieldError
	known := make(map[string]bool, len(slots))
	for _, slot := range slots {
		known[slot.SlotKey] = true
		value := content.SlotValues[slot.SlotKey]
		if value.File != nil {
			if _, err := uuid.Parse(value.File.FileID); err != nil {
				fields = append(fields, apperror.FieldError{Field: slotField(slot.SlotKey), Message: msgFileMissing})
				continue
			}
		}
		if msg := entity.ValidateSlotValue(slot, value, strict); msg != "" {
			fields = append(fields, apperror.FieldError{Field: slotField(slot.SlotKey), Message: msg})
		}
	}
	for _, key := range sortedKeys(content.SlotValues) {
		if !known[key] {
			fields = append(fields, apperror.FieldError{Field: slotField(key), Message: "Slot tidak dikenal"})
		}
	}
	if utf8.RuneCountInString(content.Note) > entity.SubmissionNoteMaxLength {
		fields = append(fields, apperror.FieldError{Field: "note", Message: fmt.Sprintf("Maksimal %d karakter", entity.SubmissionNoteMaxLength)})
	}
	if !strict {
		return fields
	}
	if !content.IsOwnWork {
		fields = append(fields, apperror.FieldError{Field: "isOwnWork", Message: "Centang pernyataan ini sebelum submit."})
	}
	if entity.HasLinkValue(slots, content.SlotValues) && !content.IsLinkPublic {
		fields = append(fields, apperror.FieldError{Field: "isLinkPublic", Message: "Pastikan tautan bisa dibuka publik, lalu centang pernyataan ini."})
	}
	return fields
}

// pendingFileIDs mengembalikan berkas yang belum pernah dipakai, sehingga perlu ditandai attached.
func pendingFileIDs(files map[string]entity.File) []string {
	ids := make([]string, 0, len(files))
	for id, file := range files {
		if file.Status == entity.FileStatusPending {
			ids = append(ids, id)
		}
	}
	sort.Strings(ids)
	return ids
}

// slotField adalah nama field form client untuk satu slot.
func slotField(key string) string {
	return "values." + key
}

func sortedKeys(values entity.SlotValues) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
