package admin

import (
	"strings"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	adminModule "github.com/DerryRiccardo/Simula/server/core/module/admin"
)

// Kontrak pembuat case: client/src/types/admin.ts (IAdminCaseInput, IAdminCase, IAdminCaseSummary).

// CaseStatusRequest adalah body PUT /api/admin/cases/:id/status.
type CaseStatusRequest struct {
	Status string `json:"status"`
}

// CaseTaskPayload adalah satu tugas.
type CaseTaskPayload struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// CaseMaterialPayload adalah satu materi. fileName dan sizeBytes hanya untuk tampilan; server memakai
// data dari tabel files.
type CaseMaterialPayload struct {
	Name        string  `json:"name"`
	Format      string  `json:"format"`
	Description string  `json:"description"`
	FileID      *string `json:"fileId"`
	FileName    *string `json:"fileName"`
	SizeBytes   *int64  `json:"sizeBytes"`
}

// CaseSlotPayload adalah IAdminSlotInput.
type CaseSlotPayload struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Kind        string `json:"kind"`
	IsRequired  bool   `json:"isRequired"`
	Formats     string `json:"formats"`
	MaxSizeMb   int    `json:"maxSizeMb"`
}

// CaseCriterionPayload adalah satu kriteria rubrik.
type CaseCriterionPayload struct {
	Name        string `json:"name"`
	Weight      int    `json:"weight"`
	Description string `json:"description"`
}

// CaseInputPayload adalah IAdminCaseInput.
type CaseInputPayload struct {
	Tier          string                 `json:"tier"`
	Title         string                 `json:"title"`
	FieldKey      string                 `json:"fieldKey"`
	Level         string                 `json:"level"`
	Summary       string                 `json:"summary"`
	About         string                 `json:"about"`
	Activities    string                 `json:"activities"`
	Skills        string                 `json:"skills"`
	Prerequisites string                 `json:"prerequisites"`
	Context       string                 `json:"context"`
	Tasks         []CaseTaskPayload      `json:"tasks"`
	Materials     []CaseMaterialPayload  `json:"materials"`
	Slots         []CaseSlotPayload      `json:"slots"`
	Rubric        []CaseCriterionPayload `json:"rubric"`
	PassingScore  int                    `json:"passingScore"`
	Price         int                    `json:"price"`
	PartnerID     string                 `json:"partnerId"`
	ReviewerRole  string                 `json:"reviewerRole"`
}

// CaseSaveRequest adalah IAdminCaseSavePayload.
type CaseSaveRequest struct {
	Input     CaseInputPayload `json:"input"`
	IsPublish bool             `json:"isPublish"`
}

// MaterialUploadRequest adalah body POST /api/admin/uploads.
type MaterialUploadRequest struct {
	FileName  string `json:"fileName"`
	SizeBytes int64  `json:"sizeBytes"`
}

// AdminCaseResponse adalah IAdminCase.
type AdminCaseResponse struct {
	CaseInputPayload
	ID                string    `json:"id"`
	Slug              string    `json:"slug"`
	Status            string    `json:"status"`
	UpdatedAt         time.Time `json:"updatedAt"`
	IsStructureLocked bool      `json:"isStructureLocked"`
	HasEnrollments    bool      `json:"hasEnrollments"`
}

// AdminCaseSummaryResponse adalah IAdminCaseSummary.
type AdminCaseSummaryResponse struct {
	ID                 string    `json:"id"`
	Title              string    `json:"title"`
	Tier               string    `json:"tier"`
	FieldKey           string    `json:"fieldKey"`
	Level              string    `json:"level"`
	Status             string    `json:"status"`
	PartnerName        *string   `json:"partnerName"`
	ParticipantCount   int       `json:"participantCount"`
	PendingReviewCount int       `json:"pendingReviewCount"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// UploadTicketResponse adalah IUploadTicket.
type UploadTicketResponse struct {
	FileID    string            `json:"fileId"`
	FileName  string            `json:"fileName"`
	SizeBytes int64             `json:"sizeBytes"`
	UploadURL string            `json:"uploadUrl"`
	Method    string            `json:"method"`
	Headers   map[string]string `json:"headers"`
	ExpiresAt time.Time         `json:"expiresAt"`
}

// MapCaseReqToInput memetakan isi pembuat case.
func MapCaseReqToInput(req CaseInputPayload) entity.AdminCaseInput {
	in := entity.AdminCaseInput{
		Tier: entity.Tier(req.Tier), Title: req.Title, FieldKey: req.FieldKey, Level: entity.CaseLevel(req.Level),
		Summary: req.Summary, About: req.About, Activities: req.Activities,
		Skills: req.Skills, Prerequisites: req.Prerequisites, Context: req.Context, PassingScore: req.PassingScore,
		Price: req.Price, PartnerID: req.PartnerID, ReviewerRole: req.ReviewerRole,
	}
	for _, task := range req.Tasks {
		in.Tasks = append(in.Tasks, entity.AdminCaseTask{Title: task.Title, Description: task.Description})
	}
	for _, material := range req.Materials {
		fileID := ""
		if material.FileID != nil {
			fileID = *material.FileID
		}
		in.Materials = append(in.Materials, entity.AdminCaseMaterial{Name: material.Name, Description: material.Description, FileID: fileID})
	}
	for _, slot := range req.Slots {
		in.Slots = append(in.Slots, entity.AdminCaseSlot{
			Title: slot.Title, Description: slot.Description, Kind: entity.SlotKind(slot.Kind),
			IsRequired: slot.IsRequired, Formats: slot.Formats, MaxSizeMb: slot.MaxSizeMb,
		})
	}
	for _, criterion := range req.Rubric {
		in.Rubric = append(in.Rubric, entity.AdminCaseCriterion{Name: criterion.Name, Weight: criterion.Weight, Description: criterion.Description})
	}
	return in
}

// MapCaseSummaries memetakan daftar case.
func MapCaseSummaries(items []entity.AdminCaseSummary) []AdminCaseSummaryResponse {
	result := make([]AdminCaseSummaryResponse, 0, len(items))
	for _, item := range items {
		result = append(result, AdminCaseSummaryResponse{
			ID: item.ID, Title: item.Title, Tier: string(item.Tier), FieldKey: item.FieldKey, Level: string(item.Level),
			Status: string(item.Status), PartnerName: item.PartnerName, ParticipantCount: item.ParticipantCount,
			PendingReviewCount: item.PendingReviewCount, UpdatedAt: item.UpdatedAt.UTC(),
		})
	}
	return result
}

// MapAdminCase memetakan case ke isian pembuat case. Daftar teks dikembalikan dalam bentuk form:
// satu poin per baris, skill dipisah koma, paragraf konteks dipisah baris kosong.
func MapAdminCase(d entity.AdminCaseDetail) AdminCaseResponse {
	c := d.Case
	input := CaseInputPayload{
		Tier: string(c.Tier), Title: c.Title, FieldKey: c.FieldKey, Level: string(c.Level),
		Summary: c.Summary, About: c.About,
		Activities: strings.Join(c.Activities, "\n"), Skills: strings.Join(c.Skills, ", "),
		Prerequisites: strings.Join(c.Prerequisites, "\n"), Context: strings.Join(c.Context, "\n\n"),
		Tasks: make([]CaseTaskPayload, 0, len(c.Tasks)), Materials: make([]CaseMaterialPayload, 0, len(c.Materials)),
		Slots: make([]CaseSlotPayload, 0, len(c.Slots)), Rubric: make([]CaseCriterionPayload, 0, len(c.Rubric)),
		PassingScore: c.PassingScore, Price: deref(c.Price),
		PartnerID: derefString(c.PartnerID), ReviewerRole: derefString(c.ReviewerRole),
	}
	for _, task := range c.Tasks {
		input.Tasks = append(input.Tasks, CaseTaskPayload{Title: task.Title, Description: task.Description})
	}
	for _, material := range c.Materials {
		item := CaseMaterialPayload{Name: material.Name, Description: material.Description}
		fileID := material.FileID
		item.FileID = &fileID
		if material.File != nil {
			item.Format = strings.ToUpper(entity.FileExtension(material.File.FileName))
			name, size := material.File.FileName, material.File.SizeBytes
			item.FileName, item.SizeBytes = &name, &size
		}
		input.Materials = append(input.Materials, item)
	}
	for _, slot := range c.Slots {
		maxSize := entity.DefaultSlotMaxSizeMB
		if slot.MaxSizeMb != nil {
			maxSize = *slot.MaxSizeMb
		}
		input.Slots = append(input.Slots, CaseSlotPayload{
			Title: slot.Title, Description: slot.Description, Kind: string(slot.Kind), IsRequired: slot.IsRequired,
			Formats: strings.Join(slot.Formats, ", "), MaxSizeMb: maxSize,
		})
	}
	for _, criterion := range c.Rubric {
		input.Rubric = append(input.Rubric, CaseCriterionPayload{Name: criterion.Name, Weight: criterion.Weight, Description: criterion.Description})
	}
	return AdminCaseResponse{
		CaseInputPayload: input, ID: c.ID, Slug: c.Slug, Status: string(c.Status), UpdatedAt: c.UpdatedAt.UTC(),
		IsStructureLocked: d.IsStructureLocked, HasEnrollments: d.HasEnrollments,
	}
}

// MapMaterialUpload memetakan tiket unggah materi.
func MapMaterialUpload(u adminModule.MaterialUpload) UploadTicketResponse {
	return UploadTicketResponse{
		FileID: u.File.ID, FileName: u.File.FileName, SizeBytes: u.File.SizeBytes, UploadURL: u.Upload.URL,
		Method: "PUT", Headers: u.Upload.Headers, ExpiresAt: u.Upload.ExpiresAt.UTC(),
	}
}

func deref(value *int) int {
	if value == nil {
		return 0
	}
	return *value
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
