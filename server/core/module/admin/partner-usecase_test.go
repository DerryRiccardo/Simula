package admin

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

var testNow = time.Date(2026, 11, 4, 10, 0, 0, 0, time.UTC)

const (
	partnerID   = "11111111-1111-1111-1111-111111111111"
	otherID     = "22222222-2222-2222-2222-222222222222"
	reviewerID  = "33333333-3333-3333-3333-333333333333"
	caseOwned   = "44444444-4444-4444-4444-444444444444"
	caseForeign = "55555555-5555-5555-5555-555555555555"
)

type mockPartnerRepo struct {
	mock.Mock
}

func (m *mockPartnerRepo) ListPartners(ctx context.Context) ([]entity.PartnerStat, error) {
	args := m.Called(ctx)
	return args.Get(0).([]entity.PartnerStat), args.Error(1)
}

func (m *mockPartnerRepo) ListReviewers(ctx context.Context) ([]entity.ReviewerStat, error) {
	args := m.Called(ctx)
	return args.Get(0).([]entity.ReviewerStat), args.Error(1)
}

func (m *mockPartnerRepo) ListB2BCases(ctx context.Context) ([]entity.PartnerCase, error) {
	args := m.Called(ctx)
	return args.Get(0).([]entity.PartnerCase), args.Error(1)
}

func (m *mockPartnerRepo) GetPartner(ctx context.Context, id string) (entity.Partner, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.Partner), args.Error(1)
}

func (m *mockPartnerRepo) PartnerNameTaken(ctx context.Context, name, exceptID string) (bool, error) {
	args := m.Called(ctx, name, exceptID)
	return args.Bool(0), args.Error(1)
}

func (m *mockPartnerRepo) SavePartner(ctx context.Context, partner *entity.Partner) error {
	return m.Called(ctx, partner).Error(0)
}

func (m *mockPartnerRepo) CreateReviewer(ctx context.Context, user *entity.User, profile *entity.ReviewerProfile) error {
	return m.Called(ctx, user, profile).Error(0)
}

func (m *mockPartnerRepo) GetReviewerProfile(ctx context.Context, id string) (entity.ReviewerProfile, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.ReviewerProfile), args.Error(1)
}

func (m *mockPartnerRepo) ReplaceAssignments(ctx context.Context, id string, caseIDs []string, now time.Time) (int, error) {
	args := m.Called(ctx, id, caseIDs, now)
	return args.Int(0), args.Error(1)
}

func (m *mockPartnerRepo) SetReviewerActive(ctx context.Context, id string, isActive bool, now time.Time) (int, error) {
	args := m.Called(ctx, id, isActive, now)
	return args.Int(0), args.Error(1)
}

type fakeHasher struct{}

func (fakeHasher) Hash(password string) (string, error) { return "hashed:" + password, nil }
func (fakeHasher) Compare(hash, password string) bool   { return hash == "hashed:"+password }

func newPartnerEnv() (PartnerUseCase, *mockPartnerRepo) {
	repo := &mockPartnerRepo{}
	uc := InitPartnerUseCase(PartnerDeps{
		Partners: repo, Hasher: fakeHasher{},
		RandomBytes: func(n int) ([]byte, error) {
			b := make([]byte, n)
			for i := range b {
				b[i] = byte(i * 7)
			}
			return b, nil
		},
		Now: func() time.Time { return testNow },
	})
	return uc, repo
}

func sagaraReviewer() entity.ReviewerStat {
	return entity.ReviewerStat{ID: reviewerID, Name: "Andika", Email: "andika@sagara.co.id", IsActive: true, PartnerID: partnerID, JobTitle: "Senior Backend Engineer"}
}

func TestCreatePartner(t *testing.T) {
	t.Run("saves trimmed input", func(t *testing.T) {
		uc, repo := newPartnerEnv()
		repo.On("PartnerNameTaken", mock.Anything, "Sagara Commerce", "").Return(false, nil)
		repo.On("SavePartner", mock.Anything, mock.MatchedBy(func(p *entity.Partner) bool {
			return p.Name == "Sagara Commerce" && p.ID != "" && p.CreatedAt.Equal(testNow)
		})).Return(nil)

		partner, err := uc.CreatePartner(context.Background(), PartnerInput{
			Name: "  Sagara Commerce ", Industry: "E-commerce", About: "Marketplace untuk UMKM di seluruh Indonesia.",
		})

		require.NoError(t, err)
		assert.Equal(t, "Sagara Commerce", partner.Name)
	})

	t.Run("validation and duplicate name", func(t *testing.T) {
		uc, repo := newPartnerEnv()
		_, err := uc.CreatePartner(context.Background(), PartnerInput{Name: "S", Industry: "", About: "pendek"})
		appErr := requireKind(t, err, apperror.KindValidation)
		assert.ElementsMatch(t, []string{"name", "industry", "about"}, fieldNames(appErr))

		repo.On("PartnerNameTaken", mock.Anything, "Sagara Commerce", "").Return(true, nil)
		_, err = uc.CreatePartner(context.Background(), PartnerInput{Name: "Sagara Commerce", Industry: "E-commerce", About: "Marketplace untuk UMKM di seluruh Indonesia."})
		appErr = requireKind(t, err, apperror.KindValidation)
		assert.Equal(t, []string{"name"}, fieldNames(appErr))
	})
}

func TestCreateReviewer(t *testing.T) {
	t.Run("creates a reviewer and returns the temporary password once", func(t *testing.T) {
		uc, repo := newPartnerEnv()
		repo.On("GetPartner", mock.Anything, partnerID).Return(entity.Partner{ID: partnerID}, nil)
		var user entity.User
		var hash string
		repo.On("CreateReviewer", mock.Anything, mock.Anything, mock.MatchedBy(func(p *entity.ReviewerProfile) bool {
			return p.PartnerID == partnerID && p.JobTitle == "Senior Backend Engineer"
		})).Run(func(args mock.Arguments) {
			created := args.Get(1).(*entity.User)
			created.ID = reviewerID // supaya cocok dengan daftar reviewer palsu
			user = *created
			hash = *created.PasswordHash
		}).Return(nil)
		repo.On("ListReviewers", mock.Anything).Return([]entity.ReviewerStat{sagaraReviewer()}, nil)

		created, err := uc.CreateReviewer(context.Background(), ReviewerInput{
			Name: "Andika Pratama", Email: " Andika@Sagara.co.id ", PartnerID: partnerID, JobTitle: "Senior Backend Engineer",
		})

		require.NoError(t, err)
		assert.Equal(t, reviewerID, created.Reviewer.ID)
		assert.Equal(t, "andika@sagara.co.id", user.Email)
		assert.Equal(t, entity.RoleReviewer, user.Role)
		assert.True(t, user.MustChangePassword)
		assert.True(t, user.IsActive)
		assert.Regexp(t, regexp.MustCompile(`^[a-z][A-Za-z0-9]{10}[2-9]$`), created.TemporaryPassword)
		assert.Empty(t, entity.ValidatePassword(created.TemporaryPassword))
		assert.Equal(t, "hashed:"+created.TemporaryPassword, hash, "only the hash is stored")
	})

	t.Run("validation", func(t *testing.T) {
		uc, repo := newPartnerEnv()
		repo.On("GetPartner", mock.Anything, partnerID).Return(entity.Partner{}, coreErrors.ErrPartnerNotFound)

		_, err := uc.CreateReviewer(context.Background(), ReviewerInput{Name: "A", Email: "bukan-email", PartnerID: partnerID, JobTitle: ""})

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.ElementsMatch(t, []string{"name", "email", "jobTitle", "partnerId"}, fieldNames(appErr))
	})

	t.Run("email taken", func(t *testing.T) {
		uc, repo := newPartnerEnv()
		repo.On("GetPartner", mock.Anything, partnerID).Return(entity.Partner{ID: partnerID}, nil)
		repo.On("CreateReviewer", mock.Anything, mock.Anything, mock.Anything).Return(coreErrors.ErrEmailTaken)

		_, err := uc.CreateReviewer(context.Background(), ReviewerInput{Name: "Andika", Email: "andika@sagara.co.id", PartnerID: partnerID, JobTitle: "Engineer"})

		appErr := requireKind(t, err, apperror.KindValidation)
		assert.Equal(t, []string{"email"}, fieldNames(appErr))
	})
}

func TestSetReviewerCases(t *testing.T) {
	owned, foreign := partnerID, otherID
	cases := []entity.PartnerCase{{ID: caseOwned, PartnerID: &owned}, {ID: caseForeign, PartnerID: &foreign}}

	t.Run("only cases of the reviewer's partner", func(t *testing.T) {
		uc, repo := newPartnerEnv()
		repo.On("GetReviewerProfile", mock.Anything, reviewerID).Return(entity.ReviewerProfile{UserID: reviewerID, PartnerID: partnerID}, nil)
		repo.On("ListB2BCases", mock.Anything).Return(cases, nil)

		_, err := uc.SetReviewerCases(context.Background(), reviewerID, []string{caseOwned, caseForeign})

		requireKind(t, err, apperror.KindValidation)
		repo.AssertNotCalled(t, "ReplaceAssignments", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("dedupes and saves", func(t *testing.T) {
		uc, repo := newPartnerEnv()
		repo.On("GetReviewerProfile", mock.Anything, reviewerID).Return(entity.ReviewerProfile{UserID: reviewerID, PartnerID: partnerID}, nil)
		repo.On("ListB2BCases", mock.Anything).Return(cases, nil)
		repo.On("ReplaceAssignments", mock.Anything, reviewerID, []string{caseOwned}, testNow).Return(0, nil)
		repo.On("ListReviewers", mock.Anything).Return([]entity.ReviewerStat{sagaraReviewer()}, nil)

		reviewer, err := uc.SetReviewerCases(context.Background(), reviewerID, []string{caseOwned, caseOwned})

		require.NoError(t, err)
		assert.Equal(t, reviewerID, reviewer.ID)
	})

	t.Run("blocked while holding pending submissions", func(t *testing.T) {
		uc, repo := newPartnerEnv()
		repo.On("GetReviewerProfile", mock.Anything, reviewerID).Return(entity.ReviewerProfile{UserID: reviewerID, PartnerID: partnerID}, nil)
		repo.On("ListB2BCases", mock.Anything).Return(cases, nil)
		repo.On("ReplaceAssignments", mock.Anything, reviewerID, []string{}, testNow).Return(2, coreErrors.ErrStatusConflict)

		_, err := uc.SetReviewerCases(context.Background(), reviewerID, []string{})

		appErr := requireKind(t, err, apperror.KindConflict)
		assert.Contains(t, appErr.Message, "2 submission")
	})
}

func TestSetReviewerStatus(t *testing.T) {
	uc, repo := newPartnerEnv()
	repo.On("GetReviewerProfile", mock.Anything, reviewerID).Return(entity.ReviewerProfile{UserID: reviewerID, PartnerID: partnerID}, nil)
	repo.On("SetReviewerActive", mock.Anything, reviewerID, false, testNow).Return(3, coreErrors.ErrStatusConflict)

	_, err := uc.SetReviewerStatus(context.Background(), reviewerID, false)

	appErr := requireKind(t, err, apperror.KindConflict)
	assert.Contains(t, appErr.Message, "3 submission")

	uc2, repo2 := newPartnerEnv()
	repo2.On("GetReviewerProfile", mock.Anything, reviewerID).Return(entity.ReviewerProfile{}, coreErrors.ErrReviewerNotFound)
	_, err = uc2.SetReviewerStatus(context.Background(), reviewerID, true)
	requireKind(t, err, apperror.KindNotFound)
}

func requireKind(t *testing.T, err error, kind apperror.Kind) *apperror.Error {
	t.Helper()
	var appErr *apperror.Error
	require.ErrorAs(t, err, &appErr)
	require.Equal(t, kind, appErr.Kind, appErr.Message)
	return appErr
}

func fieldNames(err *apperror.Error) []string {
	names := make([]string, 0, len(err.Fields))
	for _, field := range err.Fields {
		names = append(names, field.Field)
	}
	return names
}
