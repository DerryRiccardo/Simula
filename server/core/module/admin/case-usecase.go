package admin

import (
	"context"
	"errors"
	"fmt"
	"path"
	"slices"
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
	msgCaseNotFound      = "Case tidak ditemukan."
	msgCannotUnpublish   = "Case terbit tidak bisa dikembalikan ke draft."
	msgTierLocked        = "Jenis case tidak bisa diubah setelah ada peserta."
	msgSlotsLocked       = "Struktur slot dikunci karena sudah ada peserta yang mulai mengerjakan. Hanya judul dan deskripsi yang bisa diubah."
	msgRubricLocked      = "Struktur rubrik dikunci karena sudah ada peserta yang mulai mengerjakan. Hanya nama dan deskripsi yang bisa diubah."
	msgChooseField       = "Pilih bidang."
	msgChooseLevel       = "Pilih level."
	msgChooseTier        = "Pilih jenis case."
	msgChooseKind        = "Pilih jenis slot."
	msgUploadMaterial    = "Unggah berkas materi."
	msgMaterialMissing   = "Berkas materi tidak ditemukan. Unggah ulang."
	msgMaterialNotUpload = "Berkas materi belum selesai diunggah. Unggah ulang."
	msgPartnerMissing    = "Pilih mitra dari daftar."
	msgPassingScore      = "Antara 1 dan 100."
	msgWeight            = "Antara 1 dan 100."
	msgMinTask           = "Tambahkan minimal satu tugas."
	msgMinSlot           = "Tambahkan minimal satu slot deliverable."
	msgMinCriterion      = "Tambahkan minimal satu kriteria."
	msgMinActivity       = "Tulis minimal satu poin."
	msgMinSkill          = "Tulis minimal satu skill."
	msgUnknownFormat     = "Format tidak dikenal."
)

// MaterialUpload adalah tiket unggah materi pendukung (IUploadTicket di client).
type MaterialUpload struct {
	File   entity.File
	Upload entity.PresignedUpload
}

// CaseUseCase melayani pembuat case.
type CaseUseCase interface {
	ListCases(ctx context.Context) ([]entity.AdminCaseSummary, error)
	GetCase(ctx context.Context, id string) (entity.AdminCaseDetail, error)
	// SaveCase membuat (id kosong) atau memperbarui case. isPublish memakai validasi penuh; draft
	// cukup berjudul dan memenuhi aturan dasar database.
	SaveCase(ctx context.Context, id string, input entity.AdminCaseInput, isPublish bool) (entity.AdminCaseDetail, error)
	SetCaseStatus(ctx context.Context, id string, status entity.CaseStatus) (entity.AdminCaseDetail, error)
	CreateMaterialUpload(ctx context.Context, fileName string, sizeBytes int64) (MaterialUpload, error)
}

// CaseDeps adalah dependency use case pembuat case.
type CaseDeps struct {
	AdminCases   coreRepo.AdminCaseRepository
	Cases        coreRepo.CaseRepository
	Fields       coreRepo.FieldRepository
	Partners     coreRepo.AdminPartnerRepository
	Files        coreRepo.FileRepository
	Storage      coreRepo.Storage
	UploadURLTTL time.Duration
	Now          func() time.Time
}

type caseUseCase struct {
	CaseDeps
}

// InitCaseUseCase membuat use case pembuat case.
func InitCaseUseCase(deps CaseDeps) CaseUseCase {
	if deps.Now == nil {
		deps.Now = func() time.Time { return time.Now().UTC() }
	}
	return &caseUseCase{CaseDeps: deps}
}

func (uc *caseUseCase) ListCases(ctx context.Context) ([]entity.AdminCaseSummary, error) {
	cases, err := uc.AdminCases.ListCases(ctx, entity.AdminCaseListLimit)
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return cases, nil
}

func (uc *caseUseCase) GetCase(ctx context.Context, id string) (entity.AdminCaseDetail, error) {
	if _, err := uuid.Parse(id); err != nil {
		return entity.AdminCaseDetail{}, apperror.NotFound(msgCaseNotFound)
	}
	c, err := uc.Cases.GetWithBriefByID(ctx, id)
	if errors.Is(err, coreErrors.ErrCaseNotFound) {
		return entity.AdminCaseDetail{}, apperror.NotFound(msgCaseNotFound)
	}
	if err != nil {
		return entity.AdminCaseDetail{}, apperror.Internal(err)
	}
	total, started, err := uc.AdminCases.EnrollmentCounts(ctx, id)
	if err != nil {
		return entity.AdminCaseDetail{}, apperror.Internal(err)
	}
	return entity.AdminCaseDetail{Case: c, IsStructureLocked: started > 0, HasEnrollments: total > 0}, nil
}

func (uc *caseUseCase) SaveCase(ctx context.Context, id string, input entity.AdminCaseInput, isPublish bool) (entity.AdminCaseDetail, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return entity.AdminCaseDetail{}, apperror.Unauthenticated("")
	}
	input = normalizeInput(input)

	var existing *entity.AdminCaseDetail
	if id != "" {
		detail, err := uc.GetCase(ctx, id)
		if err != nil {
			return entity.AdminCaseDetail{}, err
		}
		existing = &detail
		if detail.Case.IsArchived() {
			return entity.AdminCaseDetail{}, apperror.Conflict("Case yang diarsipkan harus dipulihkan terlebih dahulu sebelum diubah.")
		}
		if detail.Case.IsPublished() && !isPublish {
			return entity.AdminCaseDetail{}, apperror.Conflict(msgCannotUnpublish)
		}
	}

	fields := validateBasics(input)
	if isPublish {
		fields = append(fields, validateForPublish(input)...)
	}
	if existing != nil {
		fields = append(fields, validateLocks(*existing, input)...)
	}
	refFields, err := uc.validateReferences(ctx, existing, input)
	if err != nil {
		return entity.AdminCaseDetail{}, err
	}
	fields = append(fields, refFields...)
	files, fileFields, err := uc.resolveMaterialFiles(ctx, input.Materials)
	if err != nil {
		return entity.AdminCaseDetail{}, err
	}
	fields = append(fields, fileFields...)
	if len(fields) > 0 {
		return entity.AdminCaseDetail{}, apperror.Validation(dedupeFields(fields)...)
	}

	now := uc.Now()
	c, err := uc.buildCase(ctx, existing, input, isPublish, current.ID, now)
	if err != nil {
		return entity.AdminCaseDetail{}, err
	}
	attach := make([]string, 0, len(files))
	for _, file := range files {
		if file.Status == entity.FileStatusPending {
			attach = append(attach, file.ID)
		}
	}

	blocked, err := uc.AdminCases.Save(ctx, coreRepo.CaseSave{Case: &c, IsNew: existing == nil, AttachFileIDs: attach})
	if errors.Is(err, coreErrors.ErrStatusConflict) {
		return entity.AdminCaseDetail{}, apperror.Conflict(fmt.Sprintf(
			"%d submission masih dipegang reviewer mitra lama. Pindahkan dulu lewat Ganti reviewer.", blocked))
	}
	if errors.Is(err, coreErrors.ErrCaseNotFound) {
		return entity.AdminCaseDetail{}, apperror.NotFound(msgCaseNotFound)
	}
	if err != nil {
		return entity.AdminCaseDetail{}, apperror.Internal(err)
	}
	return uc.GetCase(ctx, c.ID)
}

func (uc *caseUseCase) SetCaseStatus(ctx context.Context, id string, status entity.CaseStatus) (entity.AdminCaseDetail, error) {
	if status != entity.CaseStatusPublished && status != entity.CaseStatusArchived {
		return entity.AdminCaseDetail{}, apperror.Validation(apperror.FieldError{Field: "status", Message: "Status tidak valid."})
	}
	detail, err := uc.GetCase(ctx, id)
	if err != nil {
		return entity.AdminCaseDetail{}, err
	}
	if detail.Case.Status == entity.CaseStatusDraft {
		if status == entity.CaseStatusArchived {
			return entity.AdminCaseDetail{}, apperror.Conflict("Hanya case terbit yang bisa diarsipkan.")
		}
		return entity.AdminCaseDetail{}, apperror.Conflict("Gunakan Simpan & Terbitkan untuk menerbitkan draft.")
	}
	now := uc.Now()
	var publishedAt *time.Time
	if status == entity.CaseStatusPublished && detail.Case.PublishedAt == nil {
		publishedAt = &now
	}
	if err := uc.AdminCases.SetStatus(ctx, detail.Case.ID, status, publishedAt, now); err != nil {
		if errors.Is(err, coreErrors.ErrCaseNotFound) {
			return entity.AdminCaseDetail{}, apperror.NotFound(msgCaseNotFound)
		}
		return entity.AdminCaseDetail{}, apperror.Internal(err)
	}
	return uc.GetCase(ctx, detail.Case.ID)
}

func (uc *caseUseCase) CreateMaterialUpload(ctx context.Context, fileName string, sizeBytes int64) (MaterialUpload, error) {
	current, ok := authctx.UserFrom(ctx)
	if !ok {
		return MaterialUpload{}, apperror.Unauthenticated("")
	}
	fileName = path.Base(strings.ReplaceAll(strings.TrimSpace(fileName), `\`, "/"))
	if msg := entity.ValidateMaterialUpload(fileName, sizeBytes); msg != "" {
		return MaterialUpload{}, apperror.Validation(apperror.FieldError{Field: "file", Message: msg})
	}
	ext := entity.FileExtension(fileName)
	file := entity.File{
		ID: uuid.NewString(), UploadedBy: current.ID, Purpose: entity.FilePurposeMaterial, FileName: fileName,
		ContentType: entity.ContentTypeForExtension(ext), SizeBytes: sizeBytes, Status: entity.FileStatusPending,
		CreatedAt: uc.Now(),
	}
	file.ObjectKey = entity.MaterialObjectKey(file.ID, ext)
	upload, err := uc.Storage.PresignUpload(ctx, file.ObjectKey, file.ContentType, file.SizeBytes, uc.UploadURLTTL)
	if err != nil {
		return MaterialUpload{}, apperror.Internal(err)
	}
	if err := uc.Files.Create(ctx, &file); err != nil {
		return MaterialUpload{}, apperror.Internal(err)
	}
	return MaterialUpload{File: file, Upload: upload}, nil
}

// buildCase menyusun baris cases beserta anaknya. Slug, pembuat, dan waktu dibuat dipertahankan saat
// memperbarui; key slot dan isian yang belum ada di form (batas panjang teks, petunjuk tautan,
// deskripsi level rubrik) dibawa dari versi sebelumnya.
func (uc *caseUseCase) buildCase(ctx context.Context, existing *entity.AdminCaseDetail, in entity.AdminCaseInput, isPublish bool, adminID string, now time.Time) (entity.Case, error) {
	c := entity.Case{ID: uuid.NewString(), CreatedBy: &adminID, CreatedAt: now}
	var old entity.Case
	locked := false
	if existing != nil {
		old = existing.Case
		locked = existing.IsStructureLocked
		c.ID, c.Slug, c.CreatedBy, c.CreatedAt, c.PublishedAt = old.ID, old.Slug, old.CreatedBy, old.CreatedAt, old.PublishedAt
	} else {
		slug, err := uc.uniqueSlug(ctx, in.Title)
		if err != nil {
			return entity.Case{}, err
		}
		c.Slug = slug
	}

	c.Tier, c.Title, c.FieldKey, c.Level = in.Tier, in.Title, in.FieldKey, in.Level
	c.DurationLabel, c.Summary, c.About = in.DurationLabel, in.Summary, in.About
	c.Activities = entity.SplitLines(in.Activities)
	c.Skills = entity.SplitComma(in.Skills, false)
	c.Prerequisites = entity.SplitLines(in.Prerequisites)
	c.Context = entity.SplitParagraphs(in.Context)
	c.PassingScore = in.PassingScore
	c.UpdatedAt = now
	c.Status = entity.CaseStatusDraft
	if isPublish {
		c.Status = entity.CaseStatusPublished
		if c.PublishedAt == nil {
			c.PublishedAt = &now
		}
	}
	// AI case dinilai AI: tanpa harga, tenggat, mitra, dan peran penilai (CHECK di tabel cases).
	if in.Tier == entity.TierB2B {
		c.Price = positive(in.Price)
		c.DeadlineDays = positive(in.DeadlineDays)
		if in.PartnerID != "" {
			c.PartnerID = &in.PartnerID
		}
		if in.ReviewerRole != "" {
			c.ReviewerRole = &in.ReviewerRole
		}
	}

	for i, task := range in.Tasks {
		c.Tasks = append(c.Tasks, entity.CaseTask{ID: uuid.NewString(), CaseID: c.ID, Position: i + 1, Title: task.Title, Description: task.Description})
	}
	for i, material := range in.Materials {
		c.Materials = append(c.Materials, entity.CaseMaterial{
			ID: uuid.NewString(), CaseID: c.ID, Position: i + 1, Name: material.Name, Description: material.Description, FileID: material.FileID,
		})
	}
	c.Slots = buildSlots(c.ID, in.Slots, old.Slots, locked)
	c.Rubric = buildRubric(c.ID, in.Rubric, old.Rubric, locked)
	return c, nil
}

func buildSlots(caseID string, inputs []entity.AdminCaseSlot, oldSlots []entity.CaseSlot, locked bool) []entity.CaseSlot {
	titles := make([]string, 0, len(inputs))
	for _, slot := range inputs {
		titles = append(titles, slot.Title)
	}
	keys := entity.SlotKeys(titles)
	oldByKey := make(map[string]entity.CaseSlot, len(oldSlots))
	for _, slot := range oldSlots {
		oldByKey[slot.SlotKey] = slot
	}
	slots := make([]entity.CaseSlot, 0, len(inputs))
	for i, in := range inputs {
		slot := entity.CaseSlot{
			ID: uuid.NewString(), CaseID: caseID, SlotKey: keys[i], Position: i + 1, Title: in.Title,
			Description: in.Description, Kind: in.Kind, IsRequired: in.IsRequired, Formats: entity.StringList{},
		}
		// Struktur terkunci: key tetap mengikuti posisi agar draft dan submission peserta tetap cocok.
		if locked && i < len(oldSlots) {
			slot.SlotKey = oldSlots[i].SlotKey
		}
		if in.Kind == entity.SlotKindFile {
			slot.Formats = entity.SplitComma(in.Formats, true)
			size := in.MaxSizeMb
			slot.MaxSizeMb = &size
		}
		if previous, ok := oldByKey[slot.SlotKey]; ok && previous.Kind == slot.Kind {
			slot.LinkHint, slot.MinLength, slot.MaxLength = previous.LinkHint, previous.MinLength, previous.MaxLength
		}
		slots = append(slots, slot)
	}
	return slots
}

func buildRubric(caseID string, inputs []entity.AdminCaseCriterion, oldRubric []entity.RubricCriterion, locked bool) []entity.RubricCriterion {
	oldByName := make(map[string]entity.RubricCriterion, len(oldRubric))
	for _, criterion := range oldRubric {
		oldByName[strings.ToLower(criterion.Name)] = criterion
	}
	rubric := make([]entity.RubricCriterion, 0, len(inputs))
	for i, in := range inputs {
		criterion := entity.RubricCriterion{
			ID: uuid.NewString(), CaseID: caseID, Position: i + 1, Name: in.Name, Weight: in.Weight,
			Description: in.Description, LevelDescriptions: entity.StringList{},
		}
		previous, ok := oldByName[strings.ToLower(in.Name)]
		if !ok && locked && i < len(oldRubric) {
			previous, ok = oldRubric[i], true
		}
		if ok {
			criterion.LevelDescriptions = previous.LevelDescriptions
		}
		rubric = append(rubric, criterion)
	}
	return rubric
}

func (uc *caseUseCase) uniqueSlug(ctx context.Context, title string) (string, error) {
	base := entity.Slugify(title, entity.CaseSlugMaxLength)
	if base == "" {
		base = "case"
	}
	slug := base
	for n := 2; ; n++ {
		taken, err := uc.AdminCases.SlugTaken(ctx, slug)
		if err != nil {
			return "", apperror.Internal(err)
		}
		if !taken {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%d", base, n)
	}
}

// validateReferences memeriksa bidang dan mitra yang dipilih benar-benar ada.
func (uc *caseUseCase) validateReferences(
	ctx context.Context, existing *entity.AdminCaseDetail, in entity.AdminCaseInput,
) ([]apperror.FieldError, error) {
	var fields []apperror.FieldError
	keepField := existing != nil && existing.Case.FieldKey == in.FieldKey
	if in.FieldKey != "" && !keepField {
		keys, err := uc.Fields.ExistingKeys(ctx, []string{in.FieldKey})
		if err != nil {
			return nil, apperror.Internal(err)
		}
		if len(keys) == 0 {
			fields = append(fields, apperror.FieldError{Field: "fieldKey", Message: msgChooseField})
		}
	}
	if in.Tier == entity.TierB2B && in.PartnerID != "" {
		missing := apperror.FieldError{Field: "partnerId", Message: msgPartnerMissing}
		keepPartner := existing != nil && existing.Case.PartnerID != nil && *existing.Case.PartnerID == in.PartnerID
		if _, err := uuid.Parse(in.PartnerID); err != nil {
			fields = append(fields, missing)
		} else if partner, err := uc.Partners.GetPartner(ctx, in.PartnerID); errors.Is(err, coreErrors.ErrPartnerNotFound) {
			fields = append(fields, missing)
		} else if err != nil {
			return nil, apperror.Internal(err)
		} else if !keepPartner && !partner.IsActive {
			fields = append(fields, apperror.FieldError{Field: "partnerId", Message: "Mitra sedang nonaktif."})
		}
	}
	return fields, nil
}

// resolveMaterialFiles memastikan setiap materi menunjuk berkas materi yang sudah terunggah ke R2.
func (uc *caseUseCase) resolveMaterialFiles(ctx context.Context, materials []entity.AdminCaseMaterial) ([]entity.File, []apperror.FieldError, error) {
	var fields []apperror.FieldError
	ids := make([]string, 0, len(materials))
	for i, material := range materials {
		if _, err := uuid.Parse(material.FileID); err != nil {
			fields = append(fields, apperror.FieldError{Field: fmt.Sprintf("materials.%d.fileId", i), Message: msgUploadMaterial})
			continue
		}
		ids = append(ids, material.FileID)
	}
	files, err := uc.AdminCases.MaterialFiles(ctx, ids)
	if err != nil {
		return nil, nil, apperror.Internal(err)
	}
	byID := make(map[string]entity.File, len(files))
	for _, file := range files {
		byID[file.ID] = file
	}
	for i, material := range materials {
		if _, err := uuid.Parse(material.FileID); err != nil {
			continue // sudah dilaporkan di atas
		}
		file, ok := byID[material.FileID]
		field := fmt.Sprintf("materials.%d.fileId", i)
		if !ok {
			fields = append(fields, apperror.FieldError{Field: field, Message: msgMaterialMissing})
			continue
		}
		if file.Status != entity.FileStatusPending {
			continue
		}
		object, err := uc.Storage.HeadObject(ctx, file.ObjectKey)
		if errors.Is(err, coreErrors.ErrObjectNotFound) || (err == nil && (object.SizeBytes != file.SizeBytes || !entity.SameContentType(object.ContentType, file.ContentType))) {
			fields = append(fields, apperror.FieldError{Field: field, Message: msgMaterialNotUpload})
			continue
		}
		if err != nil {
			return nil, nil, apperror.Internal(err)
		}
	}
	return files, fields, nil
}

func normalizeInput(in entity.AdminCaseInput) entity.AdminCaseInput {
	trim := strings.TrimSpace
	in.Title, in.FieldKey, in.DurationLabel = trim(in.Title), trim(in.FieldKey), trim(in.DurationLabel)
	in.Summary, in.About, in.Context = trim(in.Summary), trim(in.About), trim(in.Context)
	in.PartnerID, in.ReviewerRole = trim(in.PartnerID), trim(in.ReviewerRole)
	for i := range in.Tasks {
		in.Tasks[i].Title, in.Tasks[i].Description = trim(in.Tasks[i].Title), trim(in.Tasks[i].Description)
	}
	for i := range in.Materials {
		in.Materials[i].Name, in.Materials[i].Description = trim(in.Materials[i].Name), trim(in.Materials[i].Description)
		in.Materials[i].FileID = trim(in.Materials[i].FileID)
	}
	for i := range in.Slots {
		in.Slots[i].Title, in.Slots[i].Description = trim(in.Slots[i].Title), trim(in.Slots[i].Description)
	}
	for i := range in.Rubric {
		in.Rubric[i].Name, in.Rubric[i].Description = trim(in.Rubric[i].Name), trim(in.Rubric[i].Description)
	}
	return in
}

// validateBasics berlaku untuk draft maupun terbit: aturan yang dijaga constraint database.
func validateBasics(in entity.AdminCaseInput) []apperror.FieldError {
	var fields []apperror.FieldError
	add := func(field, message string) {
		fields = append(fields, apperror.FieldError{Field: field, Message: message})
	}
	if in.Tier != entity.TierAI && in.Tier != entity.TierB2B {
		add("tier", msgChooseTier)
	}
	if n := utf8.RuneCountInString(in.Title); n < entity.CaseTitleMinRunes || n > entity.CaseTitleMaxRunes {
		add("title", fmt.Sprintf("Tulis judul %d sampai %d karakter.", entity.CaseTitleMinRunes, entity.CaseTitleMaxRunes))
	}
	if in.FieldKey == "" {
		add("fieldKey", msgChooseField)
	}
	if !in.Level.IsValid() {
		add("level", msgChooseLevel)
	}
	if in.PassingScore < 1 || in.PassingScore > 100 {
		add("passingScore", msgPassingScore)
	}
	for _, long := range []struct{ field, value string }{
		{"durationLabel", in.DurationLabel}, {"summary", in.Summary}, {"about", in.About}, {"activities", in.Activities},
		{"skills", in.Skills}, {"prerequisites", in.Prerequisites}, {"context", in.Context}, {"reviewerRole", in.ReviewerRole},
	} {
		if utf8.RuneCountInString(long.value) > entity.CaseTextMaxRunes {
			add(long.field, fmt.Sprintf("Maksimal %d karakter.", entity.CaseTextMaxRunes))
		}
	}
	for _, list := range []struct {
		field string
		count int
	}{{"tasks", len(in.Tasks)}, {"materials", len(in.Materials)}, {"slots", len(in.Slots)}, {"rubric", len(in.Rubric)}} {
		if list.count > entity.CaseListMaxItems {
			add(list.field, fmt.Sprintf("Maksimal %d butir.", entity.CaseListMaxItems))
		}
	}
	for i, slot := range in.Slots {
		switch slot.Kind {
		case entity.SlotKindFile:
			if slot.MaxSizeMb < 1 || slot.MaxSizeMb > entity.SlotMaxSizeMBLimit {
				add(fmt.Sprintf("slots.%d.maxSizeMb", i), fmt.Sprintf("Antara 1 dan %d MB.", entity.SlotMaxSizeMBLimit))
			}
			for _, format := range entity.SplitComma(slot.Formats, true) {
				if entity.ContentTypeForExtension(format) == "application/octet-stream" {
					add(fmt.Sprintf("slots.%d.formats", i), msgUnknownFormat)
					break
				}
			}
		case entity.SlotKindLink, entity.SlotKindText:
		default:
			add(fmt.Sprintf("slots.%d.kind", i), msgChooseKind)
		}
	}
	for i, criterion := range in.Rubric {
		if criterion.Weight < 1 || criterion.Weight > 100 {
			add(fmt.Sprintf("rubric.%d.weight", i), msgWeight)
		}
	}
	if in.Price < 0 {
		add("price", "Harga tidak boleh negatif.")
	}
	if in.DeadlineDays < 0 {
		add("deadlineDays", "Tenggat tidak boleh negatif.")
	}
	return fields
}

// validateForPublish: case terbit harus lengkap (aturan sama dengan _schema.ts di client).
func validateForPublish(in entity.AdminCaseInput) []apperror.FieldError {
	var fields []apperror.FieldError
	minText := func(field, value string, min int) {
		if utf8.RuneCountInString(value) < min {
			fields = append(fields, apperror.FieldError{Field: field, Message: fmt.Sprintf("Tulis minimal %d karakter.", min)})
		}
	}
	minText("durationLabel", in.DurationLabel, entity.CaseItemMinRunes)
	minText("summary", in.Summary, entity.CaseSummaryMinRunes)
	minText("about", in.About, entity.CaseAboutMinRunes)
	minText("context", in.Context, entity.CaseContextMinRunes)
	if len(entity.SplitLines(in.Activities)) == 0 {
		fields = append(fields, apperror.FieldError{Field: "activities", Message: msgMinActivity})
	}
	if len(entity.SplitComma(in.Skills, false)) == 0 {
		fields = append(fields, apperror.FieldError{Field: "skills", Message: msgMinSkill})
	}
	if len(in.Tasks) == 0 {
		fields = append(fields, apperror.FieldError{Field: "tasks", Message: msgMinTask})
	}
	for i, task := range in.Tasks {
		minText(fmt.Sprintf("tasks.%d.title", i), task.Title, entity.CaseItemMinRunes)
		minText(fmt.Sprintf("tasks.%d.description", i), task.Description, entity.CaseItemMinRunes)
	}
	for i, material := range in.Materials {
		minText(fmt.Sprintf("materials.%d.name", i), material.Name, entity.CaseItemMinRunes)
	}
	if len(in.Slots) == 0 {
		fields = append(fields, apperror.FieldError{Field: "slots", Message: msgMinSlot})
	}
	for i, slot := range in.Slots {
		minText(fmt.Sprintf("slots.%d.title", i), slot.Title, entity.CaseItemMinRunes)
	}
	if len(in.Rubric) == 0 {
		fields = append(fields, apperror.FieldError{Field: "rubric", Message: msgMinCriterion})
	}
	total := 0
	for i, criterion := range in.Rubric {
		minText(fmt.Sprintf("rubric.%d.name", i), criterion.Name, entity.CaseItemMinRunes)
		minText(fmt.Sprintf("rubric.%d.description", i), criterion.Description, entity.CaseItemMinRunes)
		total += criterion.Weight
	}
	if len(in.Rubric) > 0 && total != 100 {
		fields = append(fields, apperror.FieldError{Field: "rubric", Message: fmt.Sprintf("Total bobot %d%%, harus tepat 100%%.", total)})
	}
	if in.Tier == entity.TierB2B {
		if in.Price < entity.CaseMinPriceB2B {
			fields = append(fields, apperror.FieldError{Field: "price", Message: "Harga minimal Rp10.000."})
		}
		if in.DeadlineDays < 1 {
			fields = append(fields, apperror.FieldError{Field: "deadlineDays", Message: "Tenggat minimal 1 hari."})
		}
		if in.PartnerID == "" {
			fields = append(fields, apperror.FieldError{Field: "partnerId", Message: "Pilih mitra."})
		}
		minText("reviewerRole", in.ReviewerRole, entity.CaseItemMinRunes)
	}
	return fields
}

// validateLocks menjaga struktur yang dipakai peserta: jenis case setelah ada enrollment, serta
// slot dan rubrik setelah ada yang mulai mengerjakan.
func validateLocks(existing entity.AdminCaseDetail, in entity.AdminCaseInput) []apperror.FieldError {
	var fields []apperror.FieldError
	old := existing.Case
	if existing.HasEnrollments && in.Tier != old.Tier {
		fields = append(fields, apperror.FieldError{Field: "tier", Message: msgTierLocked})
	}
	if !existing.IsStructureLocked {
		return fields
	}
	slotsChanged := len(in.Slots) != len(old.Slots)
	for i := 0; !slotsChanged && i < len(in.Slots); i++ {
		in, prev := in.Slots[i], old.Slots[i]
		slotsChanged = in.Kind != prev.Kind || in.IsRequired != prev.IsRequired
		if !slotsChanged && in.Kind == entity.SlotKindFile {
			// Slot lama tanpa batas ukuran tampil di form dengan nilai bawaan.
			prevSize := entity.DefaultSlotMaxSizeMB
			if prev.MaxSizeMb != nil {
				prevSize = *prev.MaxSizeMb
			}
			slotsChanged = !slices.Equal(entity.SplitComma(in.Formats, true), []string(prev.Formats)) || in.MaxSizeMb != prevSize
		}
	}
	if slotsChanged {
		fields = append(fields, apperror.FieldError{Field: "slots", Message: msgSlotsLocked})
	}
	rubricChanged := len(in.Rubric) != len(old.Rubric)
	for i := 0; !rubricChanged && i < len(in.Rubric); i++ {
		rubricChanged = in.Rubric[i].Weight != old.Rubric[i].Weight
	}
	if rubricChanged {
		fields = append(fields, apperror.FieldError{Field: "rubric", Message: msgRubricLocked})
	}
	return fields
}

// dedupeFields menyisakan error pertama per field (mis. rubrik terkunci dan total bobot).
func dedupeFields(fields []apperror.FieldError) []apperror.FieldError {
	seen := map[string]bool{}
	unique := make([]apperror.FieldError, 0, len(fields))
	for _, field := range fields {
		if !seen[field.Field] {
			seen[field.Field] = true
			unique = append(unique, field)
		}
	}
	return unique
}

func positive(value int) *int {
	if value <= 0 {
		return nil
	}
	return &value
}
