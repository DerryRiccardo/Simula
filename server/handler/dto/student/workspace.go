package student

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
)

// Kontrak halaman pengerjaan dan status: client/src/types/workspace.ts dan reviewStatus.ts.

// SlotValueRequest adalah TSlotValue: string (teks atau tautan), objek berkas, atau null.
type SlotValueRequest struct {
	Text string
	File *FileRefRequest
}

// FileRefRequest adalah IFileMeta. Nama dan ukuran hanya untuk tampilan; server memakai data dari
// tabel files.
type FileRefRequest struct {
	FileID    string `json:"fileId"`
	FileName  string `json:"fileName"`
	SizeBytes int64  `json:"sizeBytes"`
}

var errInvalidSlotValue = errors.New("slot value must be a string, a file object, or null")

// UnmarshalJSON menerima ketiga bentuk TSlotValue.
func (v *SlotValueRequest) UnmarshalJSON(data []byte) error {
	trimmed := bytes.TrimSpace(data)
	switch {
	case bytes.Equal(trimmed, []byte("null")):
		*v = SlotValueRequest{}
		return nil
	case len(trimmed) > 0 && trimmed[0] == '"':
		return json.Unmarshal(trimmed, &v.Text)
	case len(trimmed) > 0 && trimmed[0] == '{':
		var file FileRefRequest
		if err := json.Unmarshal(trimmed, &file); err != nil {
			return err
		}
		v.File = &file
		return nil
	}
	return errInvalidSlotValue
}

// SubmissionContentRequest adalah body PUT /me/enrollments/:id/draft dan POST .../submit
// (ISubmissionContent).
type SubmissionContentRequest struct {
	Values       map[string]SlotValueRequest `json:"values"`
	Note         string                      `json:"note"`
	IsLinkPublic bool                        `json:"isLinkPublic"`
	IsOwnWork    bool                        `json:"isOwnWork"`
}

// UploadRequest adalah body POST /api/uploads.
type UploadRequest struct {
	EnrollmentID string `json:"enrollmentId"`
	SlotID       string `json:"slotId"`
	FileName     string `json:"fileName"`
	SizeBytes    int64  `json:"sizeBytes"`
}

// SlotValueResponse mengirim TSlotValue: string, objek berkas, atau null.
type SlotValueResponse struct {
	value entity.SlotValue
}

// MarshalJSON mengimplementasikan json.Marshaler.
func (v SlotValueResponse) MarshalJSON() ([]byte, error) {
	switch {
	case v.value.File != nil:
		return json.Marshal(FileRefRequest{
			FileID:    v.value.File.FileID,
			FileName:  v.value.File.FileName,
			SizeBytes: v.value.File.SizeBytes,
		})
	case v.value.Text != "":
		return json.Marshal(v.value.Text)
	default:
		return []byte("null"), nil
	}
}

// SubmissionDraftResponse adalah ISubmissionDraft.
type SubmissionDraftResponse struct {
	Values       map[string]SlotValueResponse `json:"values"`
	Note         string                       `json:"note"`
	IsLinkPublic bool                         `json:"isLinkPublic"`
	IsOwnWork    bool                         `json:"isOwnWork"`
	SavedAt      time.Time                    `json:"savedAt"`
}

// SubmissionRecordResponse adalah ISubmissionRecord.
type SubmissionRecordResponse struct {
	Values       map[string]SlotValueResponse `json:"values"`
	Note         string                       `json:"note"`
	IsLinkPublic bool                         `json:"isLinkPublic"`
	IsOwnWork    bool                         `json:"isOwnWork"`
	SubmittedAt  time.Time                    `json:"submittedAt"`
	Attempt      int                          `json:"attempt"`
}

// RevisionResponse adalah IRevisionRequest.
type RevisionResponse struct {
	Reason       string    `json:"reason"`
	Note         string    `json:"note"`
	ReviewerRole string    `json:"reviewerRole"`
	RequestedAt  time.Time `json:"requestedAt"`
}

// TaskResponse adalah ICaseTask.
type TaskResponse struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// MaterialResponse adalah ICaseMaterial.
type MaterialResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Format      string `json:"format"`
	SizeLabel   string `json:"sizeLabel"`
	Description string `json:"description"`
}

// RubricCriterionResponse adalah IRubricCriterion.
type RubricCriterionResponse struct {
	Name        string `json:"name"`
	Weight      int    `json:"weight"`
	Description string `json:"description"`
}

// SlotResponse adalah ISubmissionSlot. id berisi slot_key. minLength dan maxLength hanya untuk slot
// teks; null berarti tanpa batas minimal atau memakai batas maksimal bawaan.
type SlotResponse struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Kind        string   `json:"kind"`
	IsRequired  bool     `json:"isRequired"`
	Formats     []string `json:"formats"`
	MaxSizeMb   *int     `json:"maxSizeMb"`
	LinkHint    string   `json:"linkHint"`
	MinLength   *int     `json:"minLength"`
	MaxLength   *int     `json:"maxLength"`
}

// CaseBriefResponse adalah ICaseBrief.
type CaseBriefResponse struct {
	Context      []string                  `json:"context"`
	Tasks        []TaskResponse            `json:"tasks"`
	Materials    []MaterialResponse        `json:"materials"`
	Rubric       []RubricCriterionResponse `json:"rubric"`
	Slots        []SlotResponse            `json:"slots"`
	PassingScore int                       `json:"passingScore"`
	DeadlineDays *int                      `json:"deadlineDays"`
}

// WorkspaceResponse adalah ICaseWorkspace. brief null bila peserta belum mulai atau membayar.
type WorkspaceResponse struct {
	CaseInfo   CaseDetailResponse        `json:"caseInfo"`
	Brief      *CaseBriefResponse        `json:"brief"`
	Enrollment *EnrollmentResponse       `json:"enrollment"`
	Draft      *SubmissionDraftResponse  `json:"draft"`
	Submission *SubmissionRecordResponse `json:"submission"`
	Revision   *RevisionResponse         `json:"revision"`
}

// StatusEventResponse adalah IStatusEvent. attempt hanya terisi untuk submitted.
type StatusEventResponse struct {
	Type    string    `json:"type"`
	At      time.Time `json:"at"`
	Attempt *int      `json:"attempt"`
}

// AIGradingResponse adalah IAiGradingProgress.
type AIGradingResponse struct {
	StartedAt       time.Time `json:"startedAt"`
	EstimatedDoneAt time.Time `json:"estimatedDoneAt"`
	CheckedCriteria int       `json:"checkedCriteria"`
}

// CaseStatusResponse adalah ICaseStatus.
type CaseStatusResponse struct {
	CaseInfo     CaseDetailResponse        `json:"caseInfo"`
	Enrollment   *EnrollmentResponse       `json:"enrollment"`
	Submission   *SubmissionRecordResponse `json:"submission"`
	Slots        []SlotResponse            `json:"slots"`
	Rubric       []RubricCriterionResponse `json:"rubric"`
	PassingScore int                       `json:"passingScore"`
	ReviewDueAt  *time.Time                `json:"reviewDueAt"`
	Events       []StatusEventResponse     `json:"events"`
	AIGrading    *AIGradingResponse        `json:"aiGrading"`
}

// UploadTicketResponse adalah IUploadTicket: URL unggah langsung ke R2.
type UploadTicketResponse struct {
	FileID    string            `json:"fileId"`
	FileName  string            `json:"fileName"`
	SizeBytes int64             `json:"sizeBytes"`
	UploadURL string            `json:"uploadUrl"`
	Method    string            `json:"method"`
	Headers   map[string]string `json:"headers"`
	ExpiresAt time.Time         `json:"expiresAt"`
}

// MapSubmissionContentReqToInput memetakan body draft dan submit ke isian submission.
func MapSubmissionContentReqToInput(req SubmissionContentRequest) entity.SubmissionContent {
	values := make(entity.SlotValues, len(req.Values))
	for key, value := range req.Values {
		if value.File != nil {
			values[key] = entity.SlotValue{File: &entity.FileRef{FileID: strings.TrimSpace(value.File.FileID)}}
			continue
		}
		values[key] = entity.SlotValue{Text: value.Text}
	}
	return entity.SubmissionContent{
		SlotValues:   values,
		Note:         req.Note,
		IsLinkPublic: req.IsLinkPublic,
		IsOwnWork:    req.IsOwnWork,
	}
}

// MapUploadReqToInput memetakan body unggah ke input use case.
func MapUploadReqToInput(req UploadRequest) studentModule.UploadInput {
	return studentModule.UploadInput{
		EnrollmentID: strings.TrimSpace(req.EnrollmentID),
		SlotKey:      req.SlotID,
		FileName:     req.FileName,
		SizeBytes:    req.SizeBytes,
	}
}

// MapWorkspaceToResponse memetakan halaman pengerjaan.
func MapWorkspaceToResponse(w studentModule.Workspace) WorkspaceResponse {
	response := WorkspaceResponse{CaseInfo: mapCaseInfo(w.Case, w.Enrollment)}
	if w.Enrollment != nil {
		enrollment := MapEnrollment(w.Enrollment)
		response.Enrollment = &enrollment
	}
	if !w.CanViewBrief {
		return response
	}
	brief := mapBrief(w.Case)
	response.Brief = &brief
	if w.Draft != nil {
		response.Draft = &SubmissionDraftResponse{
			Values:       mapSlotValues(w.Draft.SlotValues),
			Note:         w.Draft.Note,
			IsLinkPublic: w.Draft.IsLinkPublic,
			IsOwnWork:    w.Draft.IsOwnWork,
			SavedAt:      w.Draft.SavedAt.UTC(),
		}
	}
	response.Submission = mapSubmissionRecord(w.Submission)
	if w.Revision != nil {
		response.Revision = &RevisionResponse{
			Reason:       w.Revision.Reason,
			Note:         w.Revision.Note,
			ReviewerRole: derefString(w.Case.ReviewerRole),
			RequestedAt:  w.Revision.CreatedAt.UTC(),
		}
	}
	return response
}

// MapDraftToResponse memetakan draft yang baru disimpan.
func MapDraftToResponse(draft entity.Submission) SubmissionDraftResponse {
	return SubmissionDraftResponse{
		Values:       mapSlotValues(draft.SlotValues),
		Note:         draft.Note,
		IsLinkPublic: draft.IsLinkPublic,
		IsOwnWork:    draft.IsOwnWork,
		SavedAt:      draft.SavedAt.UTC(),
	}
}

// MapCaseStatusToResponse memetakan halaman status.
func MapCaseStatusToResponse(s studentModule.CaseStatus) CaseStatusResponse {
	response := CaseStatusResponse{
		CaseInfo:     mapCaseInfo(s.Case, s.Enrollment),
		Slots:        []SlotResponse{},
		Rubric:       []RubricCriterionResponse{},
		PassingScore: s.Case.PassingScore,
		Events:       make([]StatusEventResponse, 0, len(s.Events)),
	}
	if s.Enrollment != nil {
		enrollment := MapEnrollment(s.Enrollment)
		response.Enrollment = &enrollment
		response.ReviewDueAt = utcPtr(s.Enrollment.ReviewDueAt)
	}
	if !s.CanViewBrief {
		return response
	}
	response.Slots = mapSlots(s.Case.Slots)
	response.Rubric = mapRubric(s.Case.Rubric)
	response.Submission = mapSubmissionRecord(s.Submission)
	for _, event := range s.Events {
		response.Events = append(response.Events, StatusEventResponse{Type: string(event.Type), At: event.At.UTC(), Attempt: event.Attempt})
	}
	if s.AIGrading != nil {
		response.AIGrading = &AIGradingResponse{
			StartedAt:       s.AIGrading.StartedAt.UTC(),
			EstimatedDoneAt: s.AIGrading.EstimatedDoneAt.UTC(),
			CheckedCriteria: s.AIGrading.CheckedCriteria,
		}
	}
	return response
}

// MapUploadTicketToResponse memetakan URL unggah.
func MapUploadTicketToResponse(ticket studentModule.UploadTicket) UploadTicketResponse {
	return UploadTicketResponse{
		FileID:    ticket.File.ID,
		FileName:  ticket.File.FileName,
		SizeBytes: ticket.File.SizeBytes,
		UploadURL: ticket.Upload.URL,
		Method:    "PUT",
		Headers:   ticket.Upload.Headers,
		ExpiresAt: ticket.Upload.ExpiresAt.UTC(),
	}
}

func mapCaseInfo(c entity.Case, enrollment *entity.Enrollment) CaseDetailResponse {
	result := studentModule.CaseDetailResult{Detail: c}
	if enrollment != nil {
		status := enrollment.Status
		result.MyEnrollmentStatus = &status
	}
	return MapCaseDetailToResponse(result)
}

func mapBrief(c entity.Case) CaseBriefResponse {
	brief := CaseBriefResponse{
		Context:      nonNil(c.Context),
		Tasks:        make([]TaskResponse, 0, len(c.Tasks)),
		Materials:    make([]MaterialResponse, 0, len(c.Materials)),
		Rubric:       mapRubric(c.Rubric),
		Slots:        mapSlots(c.Slots),
		PassingScore: c.PassingScore,
		DeadlineDays: c.DeadlineDays,
	}
	for _, task := range c.Tasks {
		brief.Tasks = append(brief.Tasks, TaskResponse{Title: task.Title, Description: task.Description})
	}
	for _, material := range c.Materials {
		if material.File == nil {
			continue
		}
		brief.Materials = append(brief.Materials, MaterialResponse{
			ID:          material.ID,
			Name:        material.Name,
			Format:      strings.ToUpper(entity.FileExtension(material.File.FileName)),
			SizeLabel:   formatFileSize(material.File.SizeBytes),
			Description: material.Description,
		})
	}
	return brief
}

func mapSlots(slots []entity.CaseSlot) []SlotResponse {
	result := make([]SlotResponse, 0, len(slots))
	for _, slot := range slots {
		result = append(result, SlotResponse{
			ID:          slot.SlotKey,
			Title:       slot.Title,
			Description: slot.Description,
			Kind:        string(slot.Kind),
			IsRequired:  slot.IsRequired,
			Formats:     nonNil(slot.Formats),
			MaxSizeMb:   slot.MaxSizeMb,
			LinkHint:    slot.LinkHint,
			MinLength:   slot.MinLength,
			MaxLength:   slot.MaxLength,
		})
	}
	return result
}

func mapRubric(criteria []entity.RubricCriterion) []RubricCriterionResponse {
	result := make([]RubricCriterionResponse, 0, len(criteria))
	for _, criterion := range criteria {
		result = append(result, RubricCriterionResponse{Name: criterion.Name, Weight: criterion.Weight, Description: criterion.Description})
	}
	return result
}

func mapSubmissionRecord(s *entity.Submission) *SubmissionRecordResponse {
	if s == nil || s.SubmittedAt == nil {
		return nil
	}
	return &SubmissionRecordResponse{
		Values:       mapSlotValues(s.SlotValues),
		Note:         s.Note,
		IsLinkPublic: s.IsLinkPublic,
		IsOwnWork:    s.IsOwnWork,
		SubmittedAt:  s.SubmittedAt.UTC(),
		Attempt:      s.Attempt,
	}
}

func mapSlotValues(values entity.SlotValues) map[string]SlotValueResponse {
	result := make(map[string]SlotValueResponse, len(values))
	for key, value := range values {
		result[key] = SlotValueResponse{value: value}
	}
	return result
}

// formatFileSize menulis ukuran dengan koma desimal seperti di client ("1,8 MB", "86 KB").
func formatFileSize(sizeBytes int64) string {
	const kb, mb = 1024, 1024 * 1024
	if sizeBytes >= mb {
		return strings.Replace(fmt.Sprintf("%.1f MB", float64(sizeBytes)/mb), ".", ",", 1)
	}
	return fmt.Sprintf("%d KB", max(1, (sizeBytes+kb-1)/kb))
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
