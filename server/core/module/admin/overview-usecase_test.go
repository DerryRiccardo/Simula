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
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
)

type mockOverviewRepo struct {
	mock.Mock
}

func (m *mockOverviewRepo) LoadOverview(ctx context.Context, now time.Time) (entity.AdminOverviewData, error) {
	args := m.Called(ctx, now)
	return args.Get(0).(entity.AdminOverviewData), args.Error(1)
}

type mockMemberRepo struct {
	mock.Mock
}

func (m *mockMemberRepo) ListMembers(ctx context.Context, limit int) ([]entity.AdminMemberSummary, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]entity.AdminMemberSummary), args.Error(1)
}

func (m *mockMemberRepo) GetMember(ctx context.Context, id string) (entity.AdminMemberDetail, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(entity.AdminMemberDetail), args.Error(1)
}

type mockOrderRepo struct {
	mock.Mock
}

func (m *mockOrderRepo) ListOrders(ctx context.Context, limit int) ([]entity.AdminOrder, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]entity.AdminOrder), args.Error(1)
}

func TestOverviewUseCase_GetOverview_PrioritizesAndSortsActionItems(t *testing.T) {
	repo := &mockOverviewRepo{}
	uc := InitOverviewUseCase(OverviewDeps{
		Overview: repo,
		Now:      func() time.Time { return testNow },
	})

	partnerName := "Tokopedia"
	repo.On("LoadOverview", mock.Anything, testNow).Return(entity.AdminOverviewData{
		Stats: entity.AdminOverviewStats{
			MemberCount:        20,
			ActiveMemberCount:  12,
			PublishedCaseCount: 8,
			RevenueLast30Days:  450000,
		},
		PendingReviews: []entity.AdminPendingReview{
			// Overdue: due 2 days ago
			{
				EnrollmentID: "enr-overdue-2",
				CaseID:       "case-b",
				CaseTitle:    "Audit Kasus B",
				MemberName:   "Siti",
				ReviewDueAt:  testNow.AddDate(0, 0, -2),
			},
			// Overdue earlier: due 4 days ago
			{
				EnrollmentID: "enr-overdue-1",
				CaseID:       "case-a",
				CaseTitle:    "Audit Kasus A",
				MemberName:   "Budi",
				ReviewDueAt:  testNow.AddDate(0, 0, -4),
			},
			// Due soon: due in 6 hours (<= 1 business day left)
			{
				EnrollmentID: "enr-due-soon",
				CaseID:       "case-c",
				CaseTitle:    "Audit Kasus C",
				MemberName:   "Rina",
				ReviewDueAt:  testNow.Add(6 * time.Hour),
			},
			// Safe: due in 4 days -> ignored
			{
				EnrollmentID: "enr-safe",
				CaseID:       "case-d",
				CaseTitle:    "Audit Kasus D",
				MemberName:   "Andi",
				ReviewDueAt:  testNow.AddDate(0, 0, 4),
			},
		},
		UncoveredCases: []entity.AdminUncoveredCase{
			{
				ID:          "case-uncovered",
				Title:       "Strategi B2B",
				PartnerName: &partnerName,
				UpdatedAt:   testNow.AddDate(0, 0, -3),
			},
		},
		StaleDrafts: []entity.AdminStaleDraft{
			{
				ID:        "case-draft",
				Title:     "Draft Lama",
				UpdatedAt: testNow.AddDate(0, 0, -20),
			},
		},
		AwaitingOrders: []entity.AdminAwaitingOrder{
			// Expiring soon (in 12h, after enr-due-soon at +6h)
			{
				ID:         "ord-expiring",
				CaseID:     "case-paid",
				CaseTitle:  "Kasus Berbayar",
				MemberName: "Dina",
				ExpiresAt:  testNow.Add(12 * time.Hour),
			},
			// Already expired -> ignored
			{
				ID:         "ord-expired",
				CaseID:     "case-exp",
				CaseTitle:  "Kasus Kedaluwarsa",
				MemberName: "Eko",
				ExpiresAt:  testNow.Add(-6 * time.Hour),
			},
		},
		Activities: []entity.AdminActivity{
			{
				ID:         "act-1",
				Type:       entity.AdminActivitySubmitted,
				MemberName: "Budi",
				CaseID:     "case-a",
				CaseTitle:  "Audit Kasus A",
				Tier:       entity.TierB2B,
				At:         testNow.Add(-time.Hour),
			},
		},
	}, nil)

	got, err := uc.GetOverview(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 450000, got.Stats.RevenueLast30Days)
	assert.Equal(t, 4, got.Stats.PendingReviewCount)
	assert.Equal(t, 2, got.Stats.OverdueReviewCount)
	require.Len(t, got.Activities, 1)

	// Order expected:
	// 1. review_overdue sorted by At asc (enr-overdue-1, then enr-overdue-2)
	// 2. case_without_reviewer (case-uncovered)
	// 3. dueSoon: review_due_soon (+6h) then payment_expiring (+12h) sorted by At asc
	// 4. draft_stale (case-draft)
	require.Len(t, got.ActionItems, 6)
	assert.Equal(t, entity.AdminActionReviewOverdue, got.ActionItems[0].Kind)
	assert.Equal(t, "review-enr-overdue-1", got.ActionItems[0].ID)
	assert.Equal(t, entity.AdminActionReviewOverdue, got.ActionItems[1].Kind)
	assert.Equal(t, "review-enr-overdue-2", got.ActionItems[1].ID)
	assert.Equal(t, entity.AdminActionCaseWithoutReviewer, got.ActionItems[2].Kind)
	assert.Equal(t, "uncovered-case-uncovered", got.ActionItems[2].ID)
	assert.Equal(t, entity.AdminActionReviewDueSoon, got.ActionItems[3].Kind)
	assert.Equal(t, "review-enr-due-soon", got.ActionItems[3].ID)
	assert.Equal(t, entity.AdminActionPaymentExpiring, got.ActionItems[4].Kind)
	assert.Equal(t, "payment-ord-expiring", got.ActionItems[4].ID)
	assert.Equal(t, entity.AdminActionDraftStale, got.ActionItems[5].Kind)
	assert.Equal(t, "draft-case-draft", got.ActionItems[5].ID)
}

func TestMemberUseCase_GetMember(t *testing.T) {
	tests := []struct {
		name     string
		id       string
		setup    func(*mockMemberRepo)
		wantKind apperror.Kind
	}{
		{
			name:     "non-UUID id returns 404",
			id:       "not-a-uuid",
			setup:    func(*mockMemberRepo) {},
			wantKind: apperror.KindNotFound,
		},
		{
			name: "missing student returns 404",
			id:   partnerID,
			setup: func(r *mockMemberRepo) {
				r.On("GetMember", mock.Anything, partnerID).Return(entity.AdminMemberDetail{}, coreErrors.ErrUserNotFound)
			},
			wantKind: apperror.KindNotFound,
		},
		{
			name: "found student maps overdue awaiting_payment order to expired",
			id:   partnerID,
			setup: func(r *mockMemberRepo) {
				r.On("GetMember", mock.Anything, partnerID).Return(entity.AdminMemberDetail{
					Summary: entity.AdminMemberSummary{
						ID:   partnerID,
						Name: "Budi",
					},
					Orders: []entity.AdminOrder{
						{
							Order: entity.Order{
								ID:        "ord-1",
								Status:    entity.OrderAwaitingPayment,
								ExpiresAt: testNow.Add(-time.Minute),
							},
						},
						{
							Order: entity.Order{
								ID:        "ord-2",
								Status:    entity.OrderAwaitingPayment,
								ExpiresAt: testNow.Add(time.Hour),
							},
						},
					},
				}, nil)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &mockMemberRepo{}
			tc.setup(repo)
			uc := InitMemberUseCase(MemberDeps{
				Members: repo,
				Now:     func() time.Time { return testNow },
			})

			got, err := uc.GetMember(context.Background(), tc.id)
			if tc.wantKind != "" {
				requireKind(t, err, tc.wantKind)
				return
			}
			require.NoError(t, err)
			require.Len(t, got.Orders, 2)
			assert.Equal(t, entity.OrderExpired, got.Orders[0].Order.Status)
			assert.Equal(t, entity.OrderAwaitingPayment, got.Orders[1].Order.Status)
		})
	}
}

func TestOrderUseCase_ListOrders_AppliesEffectiveStatus(t *testing.T) {
	repo := &mockOrderRepo{}
	repo.On("ListOrders", mock.Anything, entity.AdminOrderListLimit).Return([]entity.AdminOrder{
		{
			Order: entity.Order{
				ID:        "ord-overdue",
				Status:    entity.OrderAwaitingPayment,
				ExpiresAt: testNow,
			},
		},
		{
			Order: entity.Order{
				ID:        "ord-active",
				Status:    entity.OrderAwaitingPayment,
				ExpiresAt: testNow.Add(5 * time.Minute),
			},
		},
		{
			Order: entity.Order{
				ID:        "ord-paid",
				Status:    entity.OrderPaid,
				ExpiresAt: testNow.Add(-24 * time.Hour),
			},
		},
	}, nil)

	uc := InitOrderUseCase(OrderDeps{
		Orders: repo,
		Now:    func() time.Time { return testNow },
	})

	orders, err := uc.ListOrders(context.Background())
	require.NoError(t, err)
	require.Len(t, orders, 3)
	assert.Equal(t, entity.OrderExpired, orders[0].Order.Status)
	assert.Equal(t, entity.OrderAwaitingPayment, orders[1].Order.Status)
	assert.Equal(t, entity.OrderPaid, orders[2].Order.Status)
}

type mockTalentPoolRepo struct {
	mock.Mock
}

func (m *mockTalentPoolRepo) ListCandidates(ctx context.Context, limit int) ([]entity.TalentCandidate, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]entity.TalentCandidate), args.Error(1)
}

func (m *mockTalentPoolRepo) GetCandidate(ctx context.Context, enrollmentID string) (entity.TalentCandidate, error) {
	args := m.Called(ctx, enrollmentID)
	return args.Get(0).(entity.TalentCandidate), args.Error(1)
}

func (m *mockTalentPoolRepo) ShareCandidate(ctx context.Context, enrollmentID string, now time.Time) error {
	return m.Called(ctx, enrollmentID, now).Error(0)
}

func TestTalentPoolUseCase_ShareTalent(t *testing.T) {
	alreadySharedAt := testNow.Add(-time.Hour)
	tests := []struct {
		name     string
		id       string
		setup    func(*mockTalentPoolRepo)
		wantKind apperror.Kind
	}{
		{
			name:     "non-UUID enrollment returns 404",
			id:       "not-a-uuid",
			setup:    func(*mockTalentPoolRepo) {},
			wantKind: apperror.KindNotFound,
		},
		{
			name: "missing candidate returns 404",
			id:   enrollmentID,
			setup: func(r *mockTalentPoolRepo) {
				r.On("GetCandidate", mock.Anything, enrollmentID).
					Return(entity.TalentCandidate{}, coreErrors.ErrEnrollmentNotFound)
			},
			wantKind: apperror.KindNotFound,
		},
		{
			name: "pending consent returns 409",
			id:   enrollmentID,
			setup: func(r *mockTalentPoolRepo) {
				r.On("GetCandidate", mock.Anything, enrollmentID).Return(entity.TalentCandidate{
					ID:      enrollmentID,
					Consent: "pending",
				}, nil)
			},
			wantKind: apperror.KindConflict,
		},
		{
			name: "already shared candidate returns 409",
			id:   enrollmentID,
			setup: func(r *mockTalentPoolRepo) {
				r.On("GetCandidate", mock.Anything, enrollmentID).Return(entity.TalentCandidate{
					ID:       enrollmentID,
					Consent:  "granted",
					SharedAt: &alreadySharedAt,
				}, nil)
			},
			wantKind: apperror.KindConflict,
		},
		{
			name: "granted and unshared candidate sets SharedAt",
			id:   enrollmentID,
			setup: func(r *mockTalentPoolRepo) {
				r.On("GetCandidate", mock.Anything, enrollmentID).Return(entity.TalentCandidate{
					ID:         enrollmentID,
					MemberName: "Budi",
					Consent:    "granted",
				}, nil)
				r.On("ShareCandidate", mock.Anything, enrollmentID, testNow).Return(nil)
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &mockTalentPoolRepo{}
			tc.setup(repo)
			uc := InitTalentPoolUseCase(TalentPoolDeps{
				TalentPool: repo,
				Now:        func() time.Time { return testNow },
			})

			got, err := uc.ShareTalent(context.Background(), tc.id)
			if tc.wantKind != "" {
				requireKind(t, err, tc.wantKind)
				return
			}
			require.NoError(t, err)
			require.NotNil(t, got.SharedAt)
			assert.Equal(t, testNow, *got.SharedAt)
		})
	}
}

type mockAdminFieldRepo struct {
	mock.Mock
}

func (m *mockAdminFieldRepo) ListFields(ctx context.Context) ([]entity.AdminField, error) {
	args := m.Called(ctx)
	return args.Get(0).([]entity.AdminField), args.Error(1)
}

func (m *mockAdminFieldRepo) GetField(ctx context.Context, key string) (entity.Field, error) {
	args := m.Called(ctx, key)
	return args.Get(0).(entity.Field), args.Error(1)
}

func (m *mockAdminFieldRepo) KeyTaken(ctx context.Context, key string) (bool, error) {
	args := m.Called(ctx, key)
	return args.Bool(0), args.Error(1)
}

func (m *mockAdminFieldRepo) LabelTaken(ctx context.Context, label, exceptKey string) (bool, error) {
	args := m.Called(ctx, label, exceptKey)
	return args.Bool(0), args.Error(1)
}

func (m *mockAdminFieldRepo) CreateField(
	ctx context.Context, key, label, description string,
) (entity.AdminField, error) {
	args := m.Called(ctx, key, label, description)
	return args.Get(0).(entity.AdminField), args.Error(1)
}

func (m *mockAdminFieldRepo) UpdateField(ctx context.Context, key, label, description string) error {
	return m.Called(ctx, key, label, description).Error(0)
}

func (m *mockAdminFieldRepo) SetFieldActive(ctx context.Context, key string, isActive bool) error {
	return m.Called(ctx, key, isActive).Error(0)
}

func (m *mockAdminFieldRepo) MoveField(ctx context.Context, key string, direction int) error {
	return m.Called(ctx, key, direction).Error(0)
}

func TestFieldUseCase_CreateAndStatus(t *testing.T) {
	repo := &mockAdminFieldRepo{}
	uc := InitFieldUseCase(FieldDeps{Fields: repo})

	// Duplicate label rejected with 422
	repo.On("LabelTaken", mock.Anything, "Data", "").Return(true, nil).Once()
	_, err := uc.CreateField(context.Background(), entity.AdminFieldInput{
		Label:       "Data",
		Description: "SQL dan analisis bisnis",
	})
	requireKind(t, err, apperror.KindValidation)

	// Slug collision appends -2
	repo.On("LabelTaken", mock.Anything, "Cyber Security", "").Return(false, nil).Once()
	repo.On("KeyTaken", mock.Anything, "cyber-security").Return(true, nil).Once()
	repo.On("KeyTaken", mock.Anything, "cyber-security-2").Return(false, nil).Once()
	repo.On("CreateField", mock.Anything, "cyber-security-2", "Cyber Security", "Keamanan aplikasi dan jaringan").
		Return(entity.AdminField{
			Field: entity.Field{
				Key:         "cyber-security-2",
				Label:       "Cyber Security",
				Description: "Keamanan aplikasi dan jaringan",
				IsActive:    true,
				SortOrder:   13,
			},
		}, nil).Once()

	created, err := uc.CreateField(context.Background(), entity.AdminFieldInput{
		Label:       "  Cyber Security  ",
		Description: "  Keamanan aplikasi dan jaringan  ",
	})
	require.NoError(t, err)
	assert.Equal(t, "cyber-security-2", created.Key)

	// Last active field cannot be deactivated -> 409
	repo.On("SetFieldActive", mock.Anything, "backend", false).Return(coreErrors.ErrStatusConflict).Once()
	_, err = uc.SetFieldActive(context.Background(), "backend", false)
	requireKind(t, err, apperror.KindConflict)
}

type mockAdminSettingsRepo struct {
	mock.Mock
}

func (m *mockAdminSettingsRepo) GetSettings(ctx context.Context) (entity.PlatformSettings, error) {
	args := m.Called(ctx)
	return args.Get(0).(entity.PlatformSettings), args.Error(1)
}

func (m *mockAdminSettingsRepo) ListLogs(ctx context.Context, limit int) ([]entity.SettingsLogEntry, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]entity.SettingsLogEntry), args.Error(1)
}

func (m *mockAdminSettingsRepo) SaveSettings(
	ctx context.Context, settings entity.PlatformSettings, logEntry *entity.PlatformSettingsLog,
) error {
	return m.Called(ctx, settings, logEntry).Error(0)
}

func TestSettingsUseCase_SaveSettings(t *testing.T) {
	repo := &mockAdminSettingsRepo{}
	uc := InitSettingsUseCase(SettingsDeps{
		Settings: repo,
		Now:      func() time.Time { return testNow },
	})

	defaults := entity.DefaultPlatformSettings()

	// Invalid range rejected with 422
	bad := defaults
	bad.ReviewSlaDays = 20
	_, err := uc.SaveSettings(asAdmin(), bad)
	requireKind(t, err, apperror.KindValidation)

	// Unchanged values rejected with 409
	repo.On("GetSettings", mock.Anything).Return(defaults, nil).Once()
	_, err = uc.SaveSettings(asAdmin(), defaults)
	requireKind(t, err, apperror.KindConflict)

	// Changed values saved with formatted diff log
	next := defaults
	next.ReviewSlaDays = 7
	next.WhatsappNumber = "  628999888777  "
	repo.On("GetSettings", mock.Anything).Return(defaults, nil).Once()
	repo.On("SaveSettings", mock.Anything, mock.MatchedBy(func(s entity.PlatformSettings) bool {
		return s.ReviewSlaDays == 7 && s.WhatsappNumber == "628999888777"
	}), mock.MatchedBy(func(l *entity.PlatformSettingsLog) bool {
		return len(l.Changes) == 2 &&
			l.Changes[0].Key == "reviewSlaDays" &&
			l.Changes[0].From == "5 hari kerja" &&
			l.Changes[0].To == "7 hari kerja" &&
			l.Changes[1].Key == "whatsappNumber" &&
			l.Changes[1].From == "+6281234567890" &&
			l.Changes[1].To == "+628999888777"
	})).Return(nil).Once()
	repo.On("GetSettings", mock.Anything).Return(next, nil).Once()
	repo.On("ListLogs", mock.Anything, entity.AdminSettingsLogLimit).Return([]entity.SettingsLogEntry{}, nil).Once()

	saved, err := uc.SaveSettings(asAdmin(), next)
	require.NoError(t, err)
	assert.Equal(t, 7, saved.Values.ReviewSlaDays)
}
