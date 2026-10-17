package system

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockHealthProbe struct {
	mock.Mock
	name string
}

func (m *mockHealthProbe) Name() string {
	return m.name
}

func (m *mockHealthProbe) Ping(ctx context.Context) error {
	return m.Called(ctx).Error(0)
}

func TestHealthUseCase_Readiness(t *testing.T) {
	tests := []struct {
		name       string
		dbErr      error
		redisErr   error
		wantReady  bool
		wantChecks []Check
	}{
		{
			name:      "all dependencies up",
			wantReady: true,
			wantChecks: []Check{
				{Name: "database", Status: CheckStatusUp},
				{Name: "redis", Status: CheckStatusUp},
			},
		},
		{
			name:      "database down",
			dbErr:     errors.New("connection refused"),
			wantReady: false,
			wantChecks: []Check{
				{Name: "database", Status: CheckStatusDown},
				{Name: "redis", Status: CheckStatusUp},
			},
		},
		{
			name:      "redis down",
			redisErr:  errors.New("timeout"),
			wantReady: false,
			wantChecks: []Check{
				{Name: "database", Status: CheckStatusUp},
				{Name: "redis", Status: CheckStatusDown},
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			dbProbe := &mockHealthProbe{name: "database"}
			dbProbe.On("Ping", mock.Anything).Return(tc.dbErr)
			redisProbe := &mockHealthProbe{name: "redis"}
			redisProbe.On("Ping", mock.Anything).Return(tc.redisErr)

			uc := InitHealthUseCase(time.Second, dbProbe, redisProbe)
			got := uc.Readiness(context.Background())

			assert.Equal(t, tc.wantReady, got.IsReady)
			assert.Equal(t, tc.wantChecks, got.Checks)
			dbProbe.AssertExpectations(t)
			redisProbe.AssertExpectations(t)
		})
	}
}

func TestHealthUseCase_ReadinessAppliesTimeout(t *testing.T) {
	probe := &mockHealthProbe{name: "database"}
	probe.On("Ping", mock.MatchedBy(func(ctx context.Context) bool {
		_, hasDeadline := ctx.Deadline()
		return hasDeadline
	})).Return(nil)

	uc := InitHealthUseCase(50*time.Millisecond, probe)
	got := uc.Readiness(context.Background())

	assert.True(t, got.IsReady)
	probe.AssertExpectations(t)
}
