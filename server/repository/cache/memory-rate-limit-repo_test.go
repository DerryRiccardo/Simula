package cache

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

func TestMemoryRateLimitRepo_FixedWindow(t *testing.T) {
	now := time.Date(2026, 11, 24, 12, 0, 0, 0, time.UTC)
	repo := &memoryRateLimitRepo{
		entries: make(map[string]rateWindow),
		now:     func() time.Time { return now },
	}
	limit := entity.RateLimit{Limit: 2, Window: time.Minute}

	allowed, err := repo.Allow(context.Background(), "login:ip1", limit)
	require.NoError(t, err)
	assert.True(t, allowed)

	allowed, err = repo.Allow(context.Background(), "login:ip1", limit)
	require.NoError(t, err)
	assert.True(t, allowed)

	allowed, err = repo.Allow(context.Background(), "login:ip1", limit)
	require.NoError(t, err)
	assert.False(t, allowed)

	// Setelah jendela waktu berlalu, penghitung kembali dari 1.
	now = now.Add(time.Minute)
	allowed, err = repo.Allow(context.Background(), "login:ip1", limit)
	require.NoError(t, err)
	assert.True(t, allowed)
}
