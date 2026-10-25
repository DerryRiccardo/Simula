package student

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

const (
	enrollmentID = "55555555-5555-5555-5555-555555555555"
	designFileID = "66666666-6666-6666-6666-666666666666"
	otherFileID  = "77777777-7777-7777-7777-777777777777"
)

type workspaceEnv struct {
	uc          WorkspaceUseCase
	upload      UploadUseCase
	cases       *mockCaseRepo
	enrollments *mockEnrollmentRepo
	submissions *mockSubmissionRepo
	files       *mockFileRepo
	storage     *mockStorage
}

func newWorkspaceEnv() *workspaceEnv {
	env := &workspaceEnv{
		cases:       &mockCaseRepo{},
		enrollments: &mockEnrollmentRepo{},
		submissions: &mockSubmissionRepo{},
		files:       &mockFileRepo{},
		storage:     &mockStorage{},
	}
	now := func() time.Time { return testNow }
	env.uc = InitWorkspaceUseCase(WorkspaceDeps{
		Cases: env.cases, Enrollments: env.enrollments, Submissions: env.submissions,
		Files: env.files, Storage: env.storage, Now: now,
	})
	env.upload = InitUploadUseCase(UploadDeps{
		Cases: env.cases, Enrollments: env.enrollments, Submissions: env.submissions,
		Files: env.files, Storage: env.storage, UploadURLTTL: 15 * time.Minute, Now: now,
	})
	return env
}

func (env *workspaceEnv) assertExpectations(t *testing.T) {
	t.Helper()
	env.cases.AssertExpectations(t)
	env.enrollments.AssertExpectations(t)
	env.submissions.AssertExpectations(t)
	env.files.AssertExpectations(t)
	env.storage.AssertExpectations(t)
}

func intPtr(v int) *int { return &v }

// b2bBrief: slot berkas wajib, tautan wajib, dan catatan teks opsional maksimal 50 karakter.
func b2bBrief() entity.Case {
	return entity.Case{
		ID: b2bCaseID, Slug: "overselling", Tier: entity.TierB2B, Status: entity.CaseStatusPublished,
		DeadlineDays: intPtr(7),
		Slots: []entity.CaseSlot{
			{SlotKey: "design_doc", Kind: entity.SlotKindFile, IsRequired: true, Formats: entity.StringList{"pdf"}, MaxSizeMb: intPtr(5)},
			{SlotKey: "repo", Kind: entity.SlotKindLink, IsRequired: true},
			{SlotKey: "catatan", Kind: entity.SlotKindText, MaxLength: intPtr(50)},
		},
		Rubric: []entity.RubricCriterion{{Name: "Desain", Weight: 60}, {Name: "Kode", Weight: 40}},
	}
}

func aiBrief() entity.Case {
	return entity.Case{
		ID: aiCaseID, Slug: "optimasi-api", Tier: entity.TierAI, Status: entity.CaseStatusPublished,
		Slots: []entity.CaseSlot{{SlotKey: "analisis", Kind: entity.SlotKindText, IsRequired: true, MinLength: intPtr(10)}},
		Rubric: []entity.RubricCriterion{
			{Name: "Analisis", Weight: 50}, {Name: "Perbaikan", Weight: 30}, {Name: "Dokumentasi", Weight: 20},
		},
	}
}

func enrollmentWith(c entity.Case, status entity.EnrollmentStatus) entity.Enrollment {
	return entity.Enrollment{
		ID: enrollmentID, UserID: studentID, CaseID: c.ID, Status: status,
		Case: &entity.Case{ID: c.ID, Slug: c.Slug, Tier: c.Tier, DeadlineDays: c.DeadlineDays},
	}
}

// expectEditable menyiapkan enrollment yang masih bisa dikerjakan beserta brief case-nya.
func (env *workspaceEnv) expectEditable(c entity.Case, status entity.EnrollmentStatus) {
	env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).Return(enrollmentWith(c, status), nil)
	env.cases.On("GetWithSlotsByID", mock.Anything, c.ID).Return(c, nil)
}

func designFile() entity.File {
	return entity.File{
		ID: designFileID, UploadedBy: studentID, Purpose: entity.FilePurposeSubmission,
		ObjectKey: entity.SubmissionObjectKey(enrollmentID, 1, "design_doc", designFileID, "pdf"),
		FileName:  "design.pdf", ContentType: "application/pdf", SizeBytes: 2048, Status: entity.FileStatusPending,
	}
}

func completeB2BContent() entity.SubmissionContent {
	return entity.SubmissionContent{
		SlotValues: entity.SlotValues{
			// Nama dan ukuran dari client sengaja salah: server menyalin dari tabel files.
			"design_doc": {File: &entity.FileRef{FileID: designFileID, FileName: "palsu.exe", SizeBytes: 1}},
			"repo":       {Text: "  https://github.com/rahma/overselling  "},
		},
		IsLinkPublic: true,
		IsOwnWork:    true,
	}
}

func fieldNames(err *apperror.Error) []string {
	names := make([]string, 0, len(err.Fields))
	for _, field := range err.Fields {
		names = append(names, field.Field)
	}
	return names
}

func TestGetWorkspace(t *testing.T) {
	draft := entity.Submission{ID: "draft-2", Attempt: 2, Status: entity.SubmissionDraft}
	revision := &entity.RevisionRequest{Reason: "Tautan tidak bisa dibuka"}
	submitted := entity.Submission{ID: "sub-1", Attempt: 1, Status: entity.SubmissionRevisionRequested, RevisionRequest: revision}

	tests := []struct {
		name          string
		caseStatus    entity.CaseStatus
		enrollment    *entity.Enrollment
		submissions   []entity.Submission
		wantKind      apperror.Kind
		wantBrief     bool
		wantRevision  bool
		wantDraftID   string
		wantLatestID  string
		wantNoListing bool
	}{
		{name: "not enrolled sees no brief", caseStatus: entity.CaseStatusPublished, wantNoListing: true},
		{name: "unpublished case is hidden from outsiders", caseStatus: entity.CaseStatusDraft, wantKind: apperror.KindNotFound, wantNoListing: true},
		{name: "unpaid B2B sees no brief", caseStatus: entity.CaseStatusPublished,
			enrollment: ptrEnrollment(entity.EnrollmentPendingPayment), wantNoListing: true},
		{name: "revision shows draft, last submission, and reviewer note", caseStatus: entity.CaseStatusPublished,
			enrollment: ptrEnrollment(entity.EnrollmentRevisionRequested), submissions: []entity.Submission{submitted, draft},
			wantBrief: true, wantRevision: true, wantDraftID: "draft-2", wantLatestID: "sub-1"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			env := newWorkspaceEnv()
			c := b2bBrief()
			c.Status = tc.caseStatus
			env.cases.On("GetWithBriefBySlug", mock.Anything, "overselling").Return(c, nil)
			if tc.enrollment == nil {
				env.enrollments.On("FindWithCertificate", mock.Anything, studentID, b2bCaseID).Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound)
			} else {
				env.enrollments.On("FindWithCertificate", mock.Anything, studentID, b2bCaseID).Return(*tc.enrollment, nil)
			}
			if !tc.wantNoListing {
				env.submissions.On("ListByEnrollment", mock.Anything, enrollmentID).Return(tc.submissions, nil)
			}

			workspace, err := env.uc.GetWorkspace(asStudent(), "overselling")

			if tc.wantKind != "" {
				requireKind(t, err, tc.wantKind)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantBrief, workspace.CanViewBrief)
			if tc.enrollment != nil {
				assert.Equal(t, c.ID, workspace.Enrollment.Case.ID, "the loaded case is reused as the enrollment summary")
			}
			assert.Equal(t, tc.wantRevision, workspace.Revision != nil)
			if tc.wantDraftID != "" {
				assert.Equal(t, tc.wantDraftID, workspace.Draft.ID)
				assert.Equal(t, tc.wantLatestID, workspace.Submission.ID)
			}
			env.assertExpectations(t)
		})
	}
}

func ptrEnrollment(status entity.EnrollmentStatus) *entity.Enrollment {
	enrollment := enrollmentWith(b2bBrief(), status)
	return &enrollment
}

func TestStartWork(t *testing.T) {
	tests := []struct {
		name     string
		status   entity.EnrollmentStatus
		startErr error
		wantKind apperror.Kind
	}{
		{name: "starts paid B2B with calendar-day deadline", status: entity.EnrollmentNotStarted},
		{name: "already started", status: entity.EnrollmentInProgress, wantKind: apperror.KindConflict},
		{name: "unpaid", status: entity.EnrollmentPendingPayment, wantKind: apperror.KindConflict},
		{name: "concurrent start", status: entity.EnrollmentNotStarted, startErr: coreErrors.ErrStatusConflict, wantKind: apperror.KindConflict},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			env := newWorkspaceEnv()
			env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).
				Return(enrollmentWith(b2bBrief(), tc.status), nil)
			if tc.status == entity.EnrollmentNotStarted {
				env.cases.On("GetByID", mock.Anything, b2bCaseID).Return(b2bBrief(), nil)
				wantDeadline := testNow.AddDate(0, 0, 7)
				env.enrollments.On("Start", mock.Anything, enrollmentID, testNow, &wantDeadline).Return(tc.startErr)
			}
			if tc.wantKind == "" {
				env.enrollments.On("GetForUser", mock.Anything, studentID, enrollmentID).
					Return(enrollmentWith(b2bBrief(), entity.EnrollmentInProgress), nil)
			}

			enrollment, err := env.uc.StartWork(asStudent(), enrollmentID)

			if tc.wantKind != "" {
				requireKind(t, err, tc.wantKind)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, entity.EnrollmentInProgress, enrollment.Status)
			env.assertExpectations(t)
		})
	}

	t.Run("someone else's enrollment is not found", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).Return(entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound)

		_, err := env.uc.StartWork(asStudent(), enrollmentID)

		requireKind(t, err, apperror.KindNotFound)
	})
}

func TestSaveDraft(t *testing.T) {
	t.Run("copies file metadata from the server and attaches new files", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(b2bBrief(), entity.EnrollmentInProgress)
		env.files.On("ListByIDs", mock.Anything, studentID, []string{designFileID}).Return([]entity.File{designFile()}, nil)
		env.submissions.On("SaveDraft", mock.Anything, mock.MatchedBy(func(draft *entity.Submission) bool {
			file := draft.SlotValues["design_doc"].File
			return draft.Status == entity.SubmissionDraft &&
				file.FileName == "design.pdf" && file.SizeBytes == 2048 &&
				draft.SlotValues["repo"].Text == "https://github.com/rahma/overselling"
		}), []string{designFileID}).Return(nil)

		draft, err := env.uc.SaveDraft(asStudent(), enrollmentID, completeB2BContent())

		require.NoError(t, err)
		assert.Equal(t, testNow, draft.SavedAt)
		env.assertExpectations(t)
	})

	t.Run("draft does not require every slot", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(b2bBrief(), entity.EnrollmentInProgress)
		env.files.On("ListByIDs", mock.Anything, studentID, []string{}).Return([]entity.File{}, nil)
		env.submissions.On("SaveDraft", mock.Anything, mock.Anything, []string{}).Return(nil)

		_, err := env.uc.SaveDraft(asStudent(), enrollmentID, entity.SubmissionContent{SlotValues: entity.SlotValues{}})

		require.NoError(t, err)
	})

	t.Run("rejects invalid shape before touching files", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(b2bBrief(), entity.EnrollmentInProgress)

		_, err := env.uc.SaveDraft(asStudent(), enrollmentID, entity.SubmissionContent{SlotValues: entity.SlotValues{
			"design_doc":  {File: &entity.FileRef{FileID: "bukan-uuid"}},
			"catatan":     {Text: "Catatan ini sengaja dibuat lebih panjang dari lima puluh karakter."},
			"tak_dikenal": {Text: "x"},
		}})

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.ElementsMatch(t, []string{"values.design_doc", "values.catatan", "values.tak_dikenal"}, fieldNames(appErr))
		// fileId yang bukan UUID tidak boleh sampai ke query database (Postgres menolaknya → 500).
		env.files.AssertNotCalled(t, "ListByIDs", mock.Anything, mock.Anything, mock.Anything)
		env.submissions.AssertNotCalled(t, "SaveDraft", mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("rejects a file uploaded for another slot", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(b2bBrief(), entity.EnrollmentInProgress)
		misplaced := designFile()
		misplaced.ID = otherFileID
		misplaced.ObjectKey = entity.SubmissionObjectKey(enrollmentID, 1, "repo", otherFileID, "pdf")
		env.files.On("ListByIDs", mock.Anything, studentID, []string{otherFileID}).Return([]entity.File{misplaced}, nil)

		_, err := env.uc.SaveDraft(asStudent(), enrollmentID, entity.SubmissionContent{SlotValues: entity.SlotValues{
			"design_doc": {File: &entity.FileRef{FileID: otherFileID}},
		}})

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.Equal(t, []string{"values.design_doc"}, fieldNames(appErr))
	})

	t.Run("submission locked while the draft was being saved", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(b2bBrief(), entity.EnrollmentInProgress)
		env.files.On("ListByIDs", mock.Anything, studentID, []string{}).Return([]entity.File{}, nil)
		env.submissions.On("SaveDraft", mock.Anything, mock.Anything, []string{}).Return(coreErrors.ErrStatusConflict)

		_, err := env.uc.SaveDraft(asStudent(), enrollmentID, entity.SubmissionContent{SlotValues: entity.SlotValues{}})

		appErr := requireKind(t, err, apperror.KindConflict)
		assert.Equal(t, msgNotEditable, appErr.Message)
	})

	t.Run("submitted work is locked", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).Return(enrollmentWith(b2bBrief(), entity.EnrollmentInReview), nil)

		_, err := env.uc.SaveDraft(asStudent(), enrollmentID, entity.SubmissionContent{})

		requireKind(t, err, apperror.KindConflict)
	})

	t.Run("past the deadline", func(t *testing.T) {
		env := newWorkspaceEnv()
		late := enrollmentWith(b2bBrief(), entity.EnrollmentInProgress)
		deadline := testNow.Add(-time.Minute)
		late.DeadlineAt = &deadline
		env.enrollments.On("GetByIDForUser", mock.Anything, studentID, enrollmentID).Return(late, nil)

		_, err := env.uc.SaveDraft(asStudent(), enrollmentID, entity.SubmissionContent{})

		appErr := requireKind(t, err, apperror.KindConflict)
		assert.Equal(t, msgDeadlinePassed, appErr.Message)
	})
}

func TestSubmit(t *testing.T) {
	t.Run("B2B goes to review with a 5 business day SLA", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(b2bBrief(), entity.EnrollmentInProgress)
		file := designFile()
		file.Status = entity.FileStatusAttached
		env.files.On("ListByIDs", mock.Anything, studentID, []string{designFileID}).Return([]entity.File{file}, nil)
		env.storage.On("HeadObject", mock.Anything, file.ObjectKey).
			Return(entity.StoredObject{SizeBytes: 2048, ContentType: "application/pdf"}, nil)
		// Sabtu 24 Oktober 2026 + 5 hari kerja = Jumat 30 Oktober, jam yang sama.
		wantDue := time.Date(2026, 10, 30, 10, 0, 0, 0, time.UTC)
		env.submissions.On("Submit", mock.Anything,
			mock.MatchedBy(func(s *entity.Submission) bool {
				return s.Status == entity.SubmissionSubmitted && s.SubmittedAt != nil
			}),
			[]string{}, // berkas sudah attached saat draft disimpan
			mock.MatchedBy(func(change entity.EnrollmentStatusChange) bool {
				return change.To == entity.EnrollmentInReview && change.ReviewDueAt != nil && change.ReviewDueAt.Equal(wantDue)
			}),
		).Return(nil)
		env.enrollments.On("GetForUser", mock.Anything, studentID, enrollmentID).
			Return(enrollmentWith(b2bBrief(), entity.EnrollmentInReview), nil)

		enrollment, err := env.uc.Submit(asStudent(), enrollmentID, completeB2BContent())

		require.NoError(t, err)
		assert.Equal(t, entity.EnrollmentInReview, enrollment.Status)
		env.assertExpectations(t)
	})

	t.Run("AI goes to grading without an SLA", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(aiBrief(), entity.EnrollmentInProgress)
		env.files.On("ListByIDs", mock.Anything, studentID, []string{}).Return([]entity.File{}, nil)
		env.submissions.On("Submit", mock.Anything, mock.Anything, []string{},
			mock.MatchedBy(func(change entity.EnrollmentStatusChange) bool {
				return change.To == entity.EnrollmentAIGrading && change.ReviewDueAt == nil
			}),
		).Return(nil)
		env.enrollments.On("GetForUser", mock.Anything, studentID, enrollmentID).
			Return(enrollmentWith(aiBrief(), entity.EnrollmentAIGrading), nil)

		_, err := env.uc.Submit(asStudent(), enrollmentID, entity.SubmissionContent{
			SlotValues: entity.SlotValues{"analisis": {Text: "Akar masalahnya N+1 query."}},
			IsOwnWork:  true,
		})

		require.NoError(t, err)
		env.assertExpectations(t)
	})

	t.Run("requires every mandatory slot and both statements", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(b2bBrief(), entity.EnrollmentInProgress)
		env.files.On("ListByIDs", mock.Anything, studentID, []string{}).Return([]entity.File{}, nil)

		_, err := env.uc.Submit(asStudent(), enrollmentID, entity.SubmissionContent{
			SlotValues: entity.SlotValues{"repo": {Text: "bukan-url"}},
		})

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.ElementsMatch(t, []string{"values.design_doc", "values.repo", "isOwnWork", "isLinkPublic"}, fieldNames(appErr))
	})

	t.Run("file that never reached storage", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(b2bBrief(), entity.EnrollmentInProgress)
		file := designFile()
		env.files.On("ListByIDs", mock.Anything, studentID, []string{designFileID}).Return([]entity.File{file}, nil)
		env.storage.On("HeadObject", mock.Anything, file.ObjectKey).Return(entity.StoredObject{}, coreErrors.ErrObjectNotFound)

		_, err := env.uc.Submit(asStudent(), enrollmentID, completeB2BContent())

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.Equal(t, []string{"values.design_doc"}, fieldNames(appErr))
		env.submissions.AssertNotCalled(t, "Submit", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("object with a different content type", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(b2bBrief(), entity.EnrollmentInProgress)
		file := designFile()
		env.files.On("ListByIDs", mock.Anything, studentID, []string{designFileID}).Return([]entity.File{file}, nil)
		env.storage.On("HeadObject", mock.Anything, file.ObjectKey).
			Return(entity.StoredObject{SizeBytes: 2048, ContentType: "application/x-msdownload"}, nil)

		_, err := env.uc.Submit(asStudent(), enrollmentID, completeB2BContent())

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.Equal(t, []string{"values.design_doc"}, fieldNames(appErr))
	})

	t.Run("double submit", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(aiBrief(), entity.EnrollmentInProgress)
		env.files.On("ListByIDs", mock.Anything, studentID, []string{}).Return([]entity.File{}, nil)
		env.submissions.On("Submit", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(coreErrors.ErrStatusConflict)

		_, err := env.uc.Submit(asStudent(), enrollmentID, entity.SubmissionContent{
			SlotValues: entity.SlotValues{"analisis": {Text: "Akar masalahnya N+1 query."}},
			IsOwnWork:  true,
		})

		requireKind(t, err, apperror.KindConflict)
	})
}

func TestGetStatus(t *testing.T) {
	env := newWorkspaceEnv()
	c := aiBrief()
	env.cases.On("GetWithBriefBySlug", mock.Anything, "optimasi-api").Return(c, nil)
	grading := enrollmentWith(c, entity.EnrollmentAIGrading)
	startedAt := testNow.Add(-time.Hour)
	grading.StartedAt = &startedAt
	env.enrollments.On("FindWithCertificate", mock.Anything, studentID, aiCaseID).Return(grading, nil)
	submittedAt := testNow.Add(-time.Minute)
	env.submissions.On("ListByEnrollment", mock.Anything, enrollmentID).Return([]entity.Submission{
		{ID: "sub-1", Attempt: 1, Status: entity.SubmissionSubmitted, SubmittedAt: &submittedAt},
	}, nil)

	status, err := env.uc.GetStatus(asStudent(), "optimasi-api")

	require.NoError(t, err)
	require.Len(t, status.Events, 2)
	assert.Equal(t, entity.StatusEventStarted, status.Events[0].Type)
	assert.Equal(t, entity.StatusEventSubmitted, status.Events[1].Type)
	require.NotNil(t, status.AIGrading)
	assert.Equal(t, submittedAt.Add(3*entity.AIGradingEstimatePerCriterion), status.AIGrading.EstimatedDoneAt)
	assert.Equal(t, "sub-1", status.Submission.ID)
}

func TestCreateUpload(t *testing.T) {
	t.Run("signs a key under the enrollment, attempt, and slot", func(t *testing.T) {
		env := newWorkspaceEnv()
		env.expectEditable(b2bBrief(), entity.EnrollmentRevisionRequested)
		env.submissions.On("NextAttempt", mock.Anything, enrollmentID).Return(2, nil)
		upload := entity.PresignedUpload{URL: "https://r2.example/upload", ExpiresAt: testNow.Add(15 * time.Minute)}
		env.storage.On("PresignUpload", mock.Anything,
			mock.MatchedBy(func(key string) bool {
				return len(key) > 0 && key[:len("submissions/"+enrollmentID+"/2/design_doc/")] == "submissions/"+enrollmentID+"/2/design_doc/"
			}),
			"application/pdf", int64(2048), 15*time.Minute,
		).Return(upload, nil)
		env.files.On("Create", mock.Anything, mock.MatchedBy(func(file *entity.File) bool {
			return file.Status == entity.FileStatusPending && file.FileName == "design.pdf" && file.UploadedBy == studentID
		})).Return(nil)

		ticket, err := env.upload.CreateUpload(asStudent(), UploadInput{
			EnrollmentID: enrollmentID, SlotKey: "design_doc", FileName: `C:\fakepath\design.pdf`, SizeBytes: 2048,
		})

		require.NoError(t, err)
		assert.Equal(t, upload.URL, ticket.Upload.URL)
		assert.True(t, ticket.File.BelongsToSlot(enrollmentID, "design_doc"))
		env.assertExpectations(t)
	})

	tests := []struct {
		name      string
		input     UploadInput
		wantField string
	}{
		{name: "wrong format", input: UploadInput{SlotKey: "design_doc", FileName: "design.docx", SizeBytes: 10}, wantField: "file"},
		{name: "too large", input: UploadInput{SlotKey: "design_doc", FileName: "design.pdf", SizeBytes: 6 * 1024 * 1024}, wantField: "file"},
		{name: "link slot takes no file", input: UploadInput{SlotKey: "repo", FileName: "repo.pdf", SizeBytes: 10}, wantField: "file"},
		{name: "unknown slot", input: UploadInput{SlotKey: "lainnya", FileName: "a.pdf", SizeBytes: 10}, wantField: "slotId"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			env := newWorkspaceEnv()
			env.expectEditable(b2bBrief(), entity.EnrollmentInProgress)
			tc.input.EnrollmentID = enrollmentID

			_, err := env.upload.CreateUpload(asStudent(), tc.input)

			appErr := requireKind(t, err, apperror.KindValidation)
			assert.Equal(t, []string{tc.wantField}, fieldNames(appErr))
			env.storage.AssertNotCalled(t, "PresignUpload", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
		})
	}

	t.Run("file name without extension is rejected before any lookup", func(t *testing.T) {
		env := newWorkspaceEnv()

		_, err := env.upload.CreateUpload(asStudent(), UploadInput{EnrollmentID: enrollmentID, SlotKey: "design_doc", FileName: "README", SizeBytes: 10})

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.Equal(t, []string{"fileName"}, fieldNames(appErr))
	})
}

func TestCleanupPendingFiles(t *testing.T) {
	env := newWorkspaceEnv()
	kept, removed := designFile(), designFile()
	removed.ID, removed.ObjectKey = otherFileID, "submissions/x/1/design_doc/other.pdf"
	env.files.On("ListPendingBefore", mock.Anything, testNow.Add(-entity.PendingFileRetention), entity.PendingFileCleanupBatch).
		Return([]entity.File{kept, removed}, nil)
	env.storage.On("DeleteObject", mock.Anything, kept.ObjectKey).Return(assert.AnError)
	env.storage.On("DeleteObject", mock.Anything, removed.ObjectKey).Return(nil)
	env.files.On("DeletePending", mock.Anything, []string{otherFileID}).Return(int64(1), nil)

	deleted, err := env.upload.CleanupPendingFiles(context.Background())

	require.NoError(t, err)
	assert.Equal(t, int64(1), deleted, "a file whose object failed to delete is retried next run")
	env.assertExpectations(t)
}
