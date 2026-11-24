package admin

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

const (
	adminCaseID = "77777777-7777-7777-7777-777777777777"
	materialID  = "88888888-8888-8888-8888-888888888888"
)

type mockAdminCaseRepo struct {
	mock.Mock
}

func (m *mockAdminCaseRepo) ListCases(ctx context.Context, limit int) ([]entity.AdminCaseSummary, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]entity.AdminCaseSummary), args.Error(1)
}

func (m *mockAdminCaseRepo) EnrollmentCounts(ctx context.Context, caseID string) (int, int, error) {
	args := m.Called(ctx, caseID)
	return args.Int(0), args.Int(1), args.Error(2)
}

func (m *mockAdminCaseRepo) SlugTaken(ctx context.Context, slug string) (bool, error) {
	args := m.Called(ctx, slug)
	return args.Bool(0), args.Error(1)
}

func (m *mockAdminCaseRepo) MaterialFiles(ctx context.Context, ids []string) ([]entity.File, error) {
	args := m.Called(ctx, ids)
	return args.Get(0).([]entity.File), args.Error(1)
}

func (m *mockAdminCaseRepo) Save(ctx context.Context, save coreRepo.CaseSave) (int, error) {
	args := m.Called(ctx, save)
	return args.Int(0), args.Error(1)
}

func (m *mockAdminCaseRepo) SetStatus(ctx context.Context, id string, status entity.CaseStatus, publishedAt *time.Time, now time.Time) error {
	return m.Called(ctx, id, status, publishedAt, now).Error(0)
}

type mockFieldRepo struct {
	mock.Mock
}

func (m *mockFieldRepo) ExistingKeys(ctx context.Context, keys []string) ([]string, error) {
	args := m.Called(ctx, keys)
	return args.Get(0).([]string), args.Error(1)
}

type mockFileRepo struct {
	coreRepo.FileRepository
	mock.Mock
}

func (m *mockFileRepo) Create(ctx context.Context, file *entity.File) error {
	return m.Called(ctx, file).Error(0)
}

type mockStorage struct {
	coreRepo.Storage
	mock.Mock
}

func (m *mockStorage) PresignUpload(ctx context.Context, key, contentType string, size int64, ttl time.Duration) (entity.PresignedUpload, error) {
	args := m.Called(ctx, key, contentType, size, ttl)
	return args.Get(0).(entity.PresignedUpload), args.Error(1)
}

func (m *mockStorage) HeadObject(ctx context.Context, key string) (entity.StoredObject, error) {
	args := m.Called(ctx, key)
	return args.Get(0).(entity.StoredObject), args.Error(1)
}

type caseEnv struct {
	uc       CaseUseCase
	repo     *mockAdminCaseRepo
	cases    *mockCaseRepo
	fields   *mockFieldRepo
	partners *mockPartnerRepo
	files    *mockFileRepo
	storage  *mockStorage
}

func newCaseEnv() *caseEnv {
	env := &caseEnv{
		repo: &mockAdminCaseRepo{}, cases: &mockCaseRepo{}, fields: &mockFieldRepo{},
		partners: &mockPartnerRepo{}, files: &mockFileRepo{}, storage: &mockStorage{},
	}
	env.uc = InitCaseUseCase(CaseDeps{
		AdminCases: env.repo, Cases: env.cases, Fields: env.fields, Partners: env.partners,
		Files: env.files, Storage: env.storage, UploadURLTTL: 15 * time.Minute,
		Now: func() time.Time { return testNow },
	})
	env.fields.On("ExistingKeys", mock.Anything, []string{"backend"}).Return([]string{"backend"}, nil).Maybe()
	env.repo.On("MaterialFiles", mock.Anything, []string{}).Return([]entity.File{}, nil).Maybe()
	return env
}

// expectStored menyiapkan case tersimpan beserta jumlah enrollment-nya.
func (env *caseEnv) expectStored(c entity.Case, total, started int) {
	env.cases.On("GetWithBriefByID", mock.Anything, c.ID).Return(c, nil)
	env.repo.On("EnrollmentCounts", mock.Anything, c.ID).Return(total, started, nil)
}

func completeAIInput() entity.AdminCaseInput {
	return entity.AdminCaseInput{
		Tier: entity.TierAI, Title: "  Optimasi API Endpoint  ", FieldKey: "backend", Level: entity.CaseLevelBeginner,
		Summary: "Endpoint katalog produk melambat saat traffic naik.",
		About:   "Kamu bergabung sebagai backend engineer di tim katalog.", Activities: "Profiling query\nRefactor endpoint",
		Skills: "SQL, Go", Context: "Endpoint GET /api/products butuh 3-5 detik saat traffic naik di jam sibuk.",
		Tasks: []entity.AdminCaseTask{{Title: "Cari akar masalah", Description: "Profil query lambat."}},
		Slots: []entity.AdminCaseSlot{{Title: "Kode sumber", Kind: entity.SlotKindFile, IsRequired: true, Formats: "zip", MaxSizeMb: 20}},
		Rubric: []entity.AdminCaseCriterion{
			{Name: "Pemahaman masalah", Weight: 40, Description: "Akar masalah tepat."},
			{Name: "Eksekusi", Weight: 60, Description: "Kode rapi."},
		},
		PassingScore: 60,
	}
}

func storedAICase(status entity.CaseStatus) entity.Case {
	size := 20
	return entity.Case{
		ID: adminCaseID, Slug: "optimasi-api-endpoint", Tier: entity.TierAI, Status: status, Title: "Optimasi API Endpoint",
		Slots: []entity.CaseSlot{{SlotKey: "kode_sumber", Kind: entity.SlotKindFile, IsRequired: true, Formats: entity.StringList{"zip"}, MaxSizeMb: &size}},
		Rubric: []entity.RubricCriterion{
			{Name: "Pemahaman masalah", Weight: 40, LevelDescriptions: entity.StringList{"l1", "l2", "l3", "l4", "l5"}},
			{Name: "Eksekusi", Weight: 60},
		},
	}
}

func TestSaveCase_DraftOnlyNeedsBasics(t *testing.T) {
	env := newCaseEnv()
	env.repo.On("SlugTaken", mock.Anything, "case-baru").Return(true, nil)
	env.repo.On("SlugTaken", mock.Anything, "case-baru-2").Return(false, nil)
	var saved coreRepo.CaseSave
	env.repo.On("Save", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		saved = args.Get(1).(coreRepo.CaseSave)
		env.expectStored(*saved.Case, 0, 0)
	}).Return(0, nil)

	draft := entity.AdminCaseInput{Tier: entity.TierAI, Title: "Case baru", FieldKey: "backend", Level: entity.CaseLevelBeginner, PassingScore: 60}
	detail, err := env.uc.SaveCase(asAdmin(), "", draft, false)

	require.NoError(t, err)
	assert.True(t, saved.IsNew)
	assert.Equal(t, "case-baru-2", saved.Case.Slug, "slug dibuat unik")
	assert.Equal(t, entity.CaseStatusDraft, saved.Case.Status)
	assert.Nil(t, saved.Case.PublishedAt)
	require.NotNil(t, saved.Case.CreatedBy)
	assert.Equal(t, "admin-1", *saved.Case.CreatedBy)
	assert.Equal(t, saved.Case.ID, detail.Case.ID)
}

func TestSaveCase_PublishValidatesFully(t *testing.T) {
	env := newCaseEnv()
	in := completeAIInput()
	in.About, in.Skills = "", " , "
	in.Rubric[1].Weight = 50

	_, err := env.uc.SaveCase(asAdmin(), "", in, true)

	appErr := requireKind(t, err, apperror.KindValidation)
	assert.ElementsMatch(t, []string{"about", "skills", "rubric"}, fieldNames(appErr))
	env.repo.AssertNotCalled(t, "Save", mock.Anything, mock.Anything)
}

func TestSaveCase_PublishBuildsCase(t *testing.T) {
	env := newCaseEnv()
	env.repo.On("SlugTaken", mock.Anything, "optimasi-api-endpoint").Return(false, nil)
	var saved coreRepo.CaseSave
	env.repo.On("Save", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		saved = args.Get(1).(coreRepo.CaseSave)
		env.expectStored(*saved.Case, 0, 0)
	}).Return(0, nil)

	in := completeAIInput()
	in.Price, in.PartnerID = 50000, partnerID // diabaikan untuk AI case
	_, err := env.uc.SaveCase(asAdmin(), "", in, true)

	require.NoError(t, err)
	c := saved.Case
	assert.Equal(t, "Optimasi API Endpoint", c.Title, "isian dirapikan")
	assert.Equal(t, entity.CaseStatusPublished, c.Status)
	require.NotNil(t, c.PublishedAt)
	assert.Nil(t, c.Price)
	assert.Nil(t, c.PartnerID)
	assert.Equal(t, entity.StringList{"Profiling query", "Refactor endpoint"}, c.Activities)
	assert.Equal(t, entity.StringList{"SQL", "Go"}, c.Skills)
	require.Len(t, c.Slots, 1)
	assert.Equal(t, "kode_sumber", c.Slots[0].SlotKey)
	assert.Equal(t, entity.StringList{"zip"}, c.Slots[0].Formats)
}

func TestSaveCase_CannotUnpublish(t *testing.T) {
	env := newCaseEnv()
	env.expectStored(storedAICase(entity.CaseStatusPublished), 0, 0)

	_, err := env.uc.SaveCase(asAdmin(), adminCaseID, completeAIInput(), false)

	requireKind(t, err, apperror.KindConflict)
}

func TestSaveCase_StructureLock(t *testing.T) {
	t.Run("struktur berubah ditolak", func(t *testing.T) {
		env := newCaseEnv()
		env.expectStored(storedAICase(entity.CaseStatusPublished), 3, 1)
		in := completeAIInput()
		in.Tier = entity.TierB2B
		in.Slots[0].MaxSizeMb = 30
		in.Rubric = in.Rubric[:1]

		_, err := env.uc.SaveCase(asAdmin(), adminCaseID, in, true)

		appErr := requireKind(t, err, apperror.KindValidation)
		names := fieldNames(appErr)
		assert.Contains(t, names, "tier")
		assert.Contains(t, names, "slots")
		assert.Contains(t, names, "rubric")
	})

	t.Run("judul boleh berubah, key slot dan level rubrik dibawa", func(t *testing.T) {
		env := newCaseEnv()
		stored := storedAICase(entity.CaseStatusPublished)
		env.cases.On("GetWithBriefByID", mock.Anything, adminCaseID).Return(stored, nil)
		env.repo.On("EnrollmentCounts", mock.Anything, adminCaseID).Return(3, 1, nil)
		var saved coreRepo.CaseSave
		env.repo.On("Save", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
			saved = args.Get(1).(coreRepo.CaseSave)
		}).Return(0, nil)
		in := completeAIInput()
		in.Slots[0].Title = "Arsip kode"
		in.Rubric[0].Name = "Analisis masalah"

		_, err := env.uc.SaveCase(asAdmin(), adminCaseID, in, true)

		require.NoError(t, err)
		assert.False(t, saved.IsNew)
		assert.Equal(t, "optimasi-api-endpoint", saved.Case.Slug, "slug tidak berubah")
		assert.Equal(t, "kode_sumber", saved.Case.Slots[0].SlotKey, "key mengikuti posisi saat terkunci")
		assert.Len(t, saved.Case.Rubric[0].LevelDescriptions, 5)
	})

	t.Run("slot lama tanpa batas ukuran dianggap ukuran bawaan", func(t *testing.T) {
		env := newCaseEnv()
		stored := storedAICase(entity.CaseStatusPublished)
		stored.Slots[0].MaxSizeMb = nil
		env.cases.On("GetWithBriefByID", mock.Anything, adminCaseID).Return(stored, nil)
		env.repo.On("EnrollmentCounts", mock.Anything, adminCaseID).Return(1, 1, nil)
		env.repo.On("Save", mock.Anything, mock.Anything).Return(0, nil)
		in := completeAIInput()
		in.Slots[0].MaxSizeMb = entity.DefaultSlotMaxSizeMB

		_, err := env.uc.SaveCase(asAdmin(), adminCaseID, in, true)

		require.NoError(t, err)
	})
}

func TestSaveCase_B2BReferencesAndPartnerConflict(t *testing.T) {
	b2bInput := func() entity.AdminCaseInput {
		in := completeAIInput()
		in.Tier, in.Price, in.PartnerID, in.ReviewerRole = entity.TierB2B, 150000, partnerID, "Senior Backend Engineer"
		return in
	}

	t.Run("mitra tidak ada", func(t *testing.T) {
		env := newCaseEnv()
		env.partners.On("GetPartner", mock.Anything, partnerID).Return(entity.Partner{}, coreErrors.ErrPartnerNotFound)

		_, err := env.uc.SaveCase(asAdmin(), "", b2bInput(), true)

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.Equal(t, []string{"partnerId"}, fieldNames(appErr))
	})

	t.Run("reviewer mitra lama masih memegang submission", func(t *testing.T) {
		env := newCaseEnv()
		stored := storedAICase(entity.CaseStatusPublished)
		stored.Tier = entity.TierB2B
		env.expectStored(stored, 2, 2)
		env.partners.On("GetPartner", mock.Anything, partnerID).Return(entity.Partner{ID: partnerID, IsActive: true}, nil)
		env.repo.On("Save", mock.Anything, mock.Anything).Return(2, coreErrors.ErrStatusConflict)

		_, err := env.uc.SaveCase(asAdmin(), adminCaseID, b2bInput(), true)

		appErr := requireKind(t, err, apperror.KindConflict)
		assert.Contains(t, appErr.Message, "2 submission")
	})
}

func TestSaveCase_Materials(t *testing.T) {
	material := entity.File{
		ID: materialID, Purpose: entity.FilePurposeMaterial, FileName: "data.csv", ContentType: "text/csv",
		SizeBytes: 2048, Status: entity.FileStatusPending, ObjectKey: "materials/" + materialID + ".csv",
	}
	withMaterial := func(fileID string) entity.AdminCaseInput {
		in := completeAIInput()
		in.Materials = []entity.AdminCaseMaterial{{Name: "Data transaksi", FileID: fileID}}
		return in
	}

	t.Run("tanpa berkas ditolak", func(t *testing.T) {
		env := newCaseEnv()
		_, err := env.uc.SaveCase(asAdmin(), "", withMaterial(""), false)
		appErr := requireKind(t, err, apperror.KindValidation)
		assert.Equal(t, []string{"materials.0.fileId"}, fieldNames(appErr))
	})

	t.Run("belum benar-benar terunggah", func(t *testing.T) {
		env := newCaseEnv()
		env.repo.On("MaterialFiles", mock.Anything, []string{materialID}).Return([]entity.File{material}, nil)
		env.storage.On("HeadObject", mock.Anything, material.ObjectKey).Return(entity.StoredObject{}, coreErrors.ErrObjectNotFound)

		_, err := env.uc.SaveCase(asAdmin(), "", withMaterial(materialID), false)

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.Equal(t, []string{"materials.0.fileId"}, fieldNames(appErr))
	})

	t.Run("berkas pending dilampirkan", func(t *testing.T) {
		env := newCaseEnv()
		env.repo.On("MaterialFiles", mock.Anything, []string{materialID}).Return([]entity.File{material}, nil)
		env.storage.On("HeadObject", mock.Anything, material.ObjectKey).Return(entity.StoredObject{SizeBytes: 2048, ContentType: "text/csv"}, nil)
		env.repo.On("SlugTaken", mock.Anything, mock.Anything).Return(false, nil)
		var saved coreRepo.CaseSave
		env.repo.On("Save", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
			saved = args.Get(1).(coreRepo.CaseSave)
			env.expectStored(*saved.Case, 0, 0)
		}).Return(0, nil)

		_, err := env.uc.SaveCase(asAdmin(), "", withMaterial(materialID), false)

		require.NoError(t, err)
		assert.Equal(t, []string{materialID}, saved.AttachFileIDs)
		require.Len(t, saved.Case.Materials, 1)
		assert.Equal(t, materialID, saved.Case.Materials[0].FileID)
	})
}

func TestCreateMaterialUpload(t *testing.T) {
	env := newCaseEnv()
	_, err := env.uc.CreateMaterialUpload(asAdmin(), "virus.exe", 100)
	requireKind(t, err, apperror.KindValidation)

	env.storage.On("PresignUpload", mock.Anything, mock.MatchedBy(func(key string) bool {
		return len(key) > len("materials/") && key[:len("materials/")] == "materials/"
	}), "text/csv", int64(2048), 15*time.Minute).Return(entity.PresignedUpload{URL: "https://r2.example/put"}, nil)
	env.files.On("Create", mock.Anything, mock.Anything).Return(nil)

	upload, err := env.uc.CreateMaterialUpload(asAdmin(), `C:\data\transaksi.csv`, 2048)

	require.NoError(t, err)
	assert.Equal(t, "transaksi.csv", upload.File.FileName, "path lokal dibuang")
	assert.Equal(t, entity.FilePurposeMaterial, upload.File.Purpose)
	assert.Equal(t, entity.FileStatusPending, upload.File.Status)
}

func TestGetCase_LockFlags(t *testing.T) {
	env := newCaseEnv()
	env.expectStored(storedAICase(entity.CaseStatusPublished), 2, 0)

	detail, err := env.uc.GetCase(asAdmin(), adminCaseID)

	require.NoError(t, err)
	assert.True(t, detail.HasEnrollments)
	assert.False(t, detail.IsStructureLocked, "enrollment pending_payment/not_started tidak mengunci struktur")

	_, err = env.uc.GetCase(asAdmin(), "bukan-uuid")
	requireKind(t, err, apperror.KindNotFound)
}
