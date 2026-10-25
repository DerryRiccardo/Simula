package student

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

// UploadInput adalah permintaan URL unggah untuk satu slot berkas.
type UploadInput struct {
	EnrollmentID string
	SlotKey      string
	FileName     string
	SizeBytes    int64
}

// UploadTicket adalah berkas yang dicatat (status pending) beserta URL unggah langsung ke R2.
type UploadTicket struct {
	File   entity.File
	Upload entity.PresignedUpload
}

// UploadUseCase melayani unggah berkas submission lewat presigned URL.
type UploadUseCase interface {
	// CreateUpload memvalidasi slot, format, dan ukuran, lalu membuat URL unggah. Browser
	// mengunggah langsung ke R2; berkas baru dipercaya setelah diperiksa saat submit.
	CreateUpload(ctx context.Context, in UploadInput) (UploadTicket, error)
	// CleanupPendingFiles menghapus berkas yang diunggah tetapi tidak pernah dipakai. Dipanggil task.
	CleanupPendingFiles(ctx context.Context) (int64, error)
}

// UploadDeps adalah dependency use case unggah.
type UploadDeps struct {
	Cases       coreRepo.CaseRepository
	Enrollments coreRepo.EnrollmentRepository
	Submissions coreRepo.SubmissionRepository
	Files       coreRepo.FileRepository
	Storage     coreRepo.Storage
	// UploadURLTTL adalah masa berlaku URL unggah.
	UploadURLTTL time.Duration
	Now          func() time.Time
}

type uploadUseCase struct {
	UploadDeps
}

// InitUploadUseCase membuat use case unggah.
func InitUploadUseCase(deps UploadDeps) UploadUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &uploadUseCase{UploadDeps: deps}
}

func (uc *uploadUseCase) CreateUpload(ctx context.Context, in UploadInput) (UploadTicket, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return UploadTicket{}, apperror.Unauthenticated("")
	}
	in.SlotKey = strings.TrimSpace(in.SlotKey)
	in.FileName = baseName(in.FileName)
	if fields := validateUploadInput(in); len(fields) > 0 {
		return UploadTicket{}, apperror.Validation(fields...)
	}

	now := uc.Now()
	enrollment, c, err := loadEditableWork(ctx, uc.Enrollments, uc.Cases, current.ID, in.EnrollmentID, now)
	if err != nil {
		return UploadTicket{}, err
	}
	slot, ok := c.SlotByKey(in.SlotKey)
	if !ok {
		return UploadTicket{}, apperror.Validation(apperror.FieldError{Field: "slotId", Message: "Slot tidak ditemukan"})
	}
	if msg := entity.ValidateUploadForSlot(slot, in.FileName, in.SizeBytes); msg != "" {
		return UploadTicket{}, apperror.Validation(apperror.FieldError{Field: "file", Message: msg})
	}

	attempt, err := uc.Submissions.NextAttempt(ctx, enrollment.ID)
	if err != nil {
		return UploadTicket{}, apperror.Internal(err)
	}
	ext := entity.FileExtension(in.FileName)
	file := entity.File{
		ID:          uuid.NewString(),
		UploadedBy:  current.ID,
		Purpose:     entity.FilePurposeSubmission,
		FileName:    in.FileName,
		ContentType: entity.ContentTypeForExtension(ext),
		SizeBytes:   in.SizeBytes,
		Status:      entity.FileStatusPending,
		CreatedAt:   now,
	}
	file.ObjectKey = entity.SubmissionObjectKey(enrollment.ID, attempt, slot.SlotKey, file.ID, ext)

	upload, err := uc.Storage.PresignUpload(ctx, file.ObjectKey, file.ContentType, file.SizeBytes, uc.UploadURLTTL)
	if err != nil {
		return UploadTicket{}, apperror.Internal(err)
	}
	if err := uc.Files.Create(ctx, &file); err != nil {
		return UploadTicket{}, apperror.Internal(err)
	}
	return UploadTicket{File: file, Upload: upload}, nil
}

func (uc *uploadUseCase) CleanupPendingFiles(ctx context.Context) (int64, error) {
	files, err := uc.Files.ListPendingBefore(ctx, uc.Now().Add(-entity.PendingFileRetention), entity.PendingFileCleanupBatch)
	if err != nil {
		return 0, fmt.Errorf("failed to list pending files: %w", err)
	}
	removable := make([]string, 0, len(files))
	for _, file := range files {
		err := uc.Storage.DeleteObject(ctx, file.ObjectKey)
		if errors.Is(err, coreErrors.ErrStorageDisabled) {
			return 0, nil
		}
		if err != nil {
			// Object yang gagal dihapus dicoba lagi pada run berikutnya.
			log.Warn().Err(err).Str("file_id", file.ID).Msg("failed to delete pending upload")
			continue
		}
		removable = append(removable, file.ID)
	}
	deleted, err := uc.Files.DeletePending(ctx, removable)
	if err != nil {
		return 0, fmt.Errorf("failed to delete pending files: %w", err)
	}
	return deleted, nil
}

func validateUploadInput(in UploadInput) []apperror.FieldError {
	var fields []apperror.FieldError
	if in.SlotKey == "" {
		fields = append(fields, apperror.FieldError{Field: "slotId", Message: "Slot wajib diisi"})
	}
	if msg := entity.ValidateUploadFileName(in.FileName); msg != "" {
		fields = append(fields, apperror.FieldError{Field: "fileName", Message: msg})
	}
	if in.SizeBytes <= 0 {
		fields = append(fields, apperror.FieldError{Field: "sizeBytes", Message: "Berkas kosong"})
	}
	return fields
}

// baseName membuang path yang mungkin ikut terkirim dari browser lama (mis. C:\fakepath\a.pdf).
func baseName(fileName string) string {
	fileName = strings.TrimSpace(fileName)
	if i := strings.LastIndexAny(fileName, `/\`); i >= 0 {
		fileName = fileName[i+1:]
	}
	return fileName
}
