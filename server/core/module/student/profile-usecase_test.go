package student

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/authctx"
)

type mockProfileRepo struct {
	mock.Mock
}

func (m *mockProfileRepo) GetProfile(ctx context.Context, userID string) (entity.StudentProfile, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(entity.StudentProfile), args.Error(1)
}

func (m *mockProfileRepo) UpdateDetails(
	ctx context.Context, userID string, in entity.ProfileDetailsUpdate, now time.Time,
) error {
	return m.Called(ctx, userID, in, now).Error(0)
}

func (m *mockProfileRepo) UpdateShareDefault(
	ctx context.Context, userID string, shareDefault entity.ShareDefault, now time.Time,
) error {
	return m.Called(ctx, userID, shareDefault, now).Error(0)
}

type mockFieldRepo struct {
	mock.Mock
}

func (m *mockFieldRepo) ExistingKeys(ctx context.Context, keys []string) ([]string, error) {
	args := m.Called(ctx, keys)
	return args.Get(0).([]string), args.Error(1)
}

func authedStudentCtx() context.Context {
	return authctx.WithUser(context.Background(), authctx.User{ID: studentID, Role: studentCtx})
}

func TestProfileUseCase_UpdateDetails_ValidatesAndSaves(t *testing.T) {
	tooLong := strings.Repeat("a", 101)
	badLinkedin := "https://instagram.com/budi"
	goodLinkedin := "  https://linkedin.com/in/budi-santoso  "
	inst := "  Universitas Bina Nusantara  "
	major := "  Sistem Informasi  "

	tests := []struct {
		name      string
		in        ProfileDetailsInput
		setup     func(*mockProfileRepo, *mockFieldRepo)
		wantField string
	}{
		{
			name: "short name rejected",
			in: ProfileDetailsInput{
				Name:          "Ab",
				StudentStatus: "final_year",
				FieldKeys:     []string{"marketing"},
			},
			setup:     func(*mockProfileRepo, *mockFieldRepo) {},
			wantField: "name",
		},
		{
			name: "institution over 100 runes rejected",
			in: ProfileDetailsInput{
				Name:          "Budi Santoso",
				Institution:   &tooLong,
				StudentStatus: "final_year",
				FieldKeys:     []string{"marketing"},
			},
			setup:     func(*mockProfileRepo, *mockFieldRepo) {},
			wantField: "institution",
		},
		{
			name: "invalid linkedin URL rejected",
			in: ProfileDetailsInput{
				Name:          "Budi Santoso",
				StudentStatus: "final_year",
				LinkedinURL:   &badLinkedin,
				FieldKeys:     []string{"marketing"},
			},
			setup:     func(*mockProfileRepo, *mockFieldRepo) {},
			wantField: "linkedinUrl",
		},
		{
			name: "unknown field key rejected",
			in: ProfileDetailsInput{
				Name:          "Budi Santoso",
				StudentStatus: "final_year",
				FieldKeys:     []string{"unknown"},
			},
			setup: func(_ *mockProfileRepo, fields *mockFieldRepo) {
				fields.On("ExistingKeys", mock.Anything, []string{"unknown"}).Return([]string{}, nil)
			},
			wantField: "fieldKeys",
		},
		{
			name: "valid details trimmed and saved",
			in: ProfileDetailsInput{
				Name:          "  Budi Santoso  ",
				Institution:   &inst,
				Major:         &major,
				StudentStatus: "final_year",
				LinkedinURL:   &goodLinkedin,
				FieldKeys:     []string{"marketing", "data", "marketing"},
			},
			setup: func(profiles *mockProfileRepo, fields *mockFieldRepo) {
				fields.On("ExistingKeys", mock.Anything, []string{"marketing", "data"}).
					Return([]string{"marketing", "data"}, nil)
				trimmedInst := "Universitas Bina Nusantara"
				trimmedMajor := "Sistem Informasi"
				trimmedLinkedin := "https://linkedin.com/in/budi-santoso"
				profiles.On("UpdateDetails", mock.Anything, studentID, entity.ProfileDetailsUpdate{
					Name:          "Budi Santoso",
					Institution:   &trimmedInst,
					Major:         &trimmedMajor,
					StudentStatus: entity.StudentStatusFinalYear,
					LinkedinURL:   &trimmedLinkedin,
					FieldKeys:     []string{"marketing", "data"},
				}, testNow).Return(nil)
				profiles.On("GetProfile", mock.Anything, studentID).Return(entity.StudentProfile{
					User: entity.User{
						ID:           studentID,
						Name:         "Budi Santoso",
						ShareDefault: entity.ShareDefaultAsk,
					},
				}, nil)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			profiles := &mockProfileRepo{}
			fields := &mockFieldRepo{}
			tc.setup(profiles, fields)
			uc := InitProfileUseCase(ProfileDeps{
				Profiles: profiles,
				Fields:   fields,
				Now:      func() time.Time { return testNow },
			})

			got, err := uc.UpdateDetails(authedStudentCtx(), tc.in)
			if tc.wantField != "" {
				var appErr *apperror.Error
				require.ErrorAs(t, err, &appErr)
				assert.Equal(t, apperror.KindValidation, appErr.Kind)
				require.NotEmpty(t, appErr.Fields)
				assert.Equal(t, tc.wantField, appErr.Fields[0].Field)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, "Budi Santoso", got.User.Name)
		})
	}
}

func TestProfileUseCase_UpdateShareDefault(t *testing.T) {
	profiles := &mockProfileRepo{}
	uc := InitProfileUseCase(ProfileDeps{
		Profiles: profiles,
		Fields:   &mockFieldRepo{},
		Now:      func() time.Time { return testNow },
	})

	_, err := uc.UpdateShareDefault(authedStudentCtx(), "invalid")
	var appErr *apperror.Error
	require.ErrorAs(t, err, &appErr)
	assert.Equal(t, apperror.KindValidation, appErr.Kind)

	profiles.On("UpdateShareDefault", mock.Anything, studentID, entity.ShareDefaultAlways, testNow).Return(nil)
	profiles.On("GetProfile", mock.Anything, studentID).Return(entity.StudentProfile{
		User: entity.User{ID: studentID, ShareDefault: entity.ShareDefaultAlways},
	}, nil)

	got, err := uc.UpdateShareDefault(authedStudentCtx(), "always")
	require.NoError(t, err)
	assert.Equal(t, entity.ShareDefaultAlways, got.User.ShareDefault)
}
