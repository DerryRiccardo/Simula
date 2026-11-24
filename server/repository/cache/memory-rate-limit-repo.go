package cache

import (
	"context"
	"sync"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

const memoryRateLimitPruneThreshold = 1024

type rateWindow struct {
	count     int
	expiresAt time.Time
}

type memoryRateLimitRepo struct {
	mu      sync.Mutex
	entries map[string]rateWindow
	now     func() time.Time
}

// InitMemoryRateLimitRepo membuat rate limiter fixed window di memori proses server.
func InitMemoryRateLimitRepo() coreRepo.RateLimiter {
	return &memoryRateLimitRepo{
		entries: make(map[string]rateWindow),
		now:     func() time.Time { return time.Now().UTC() },
	}
}

// Allow menaikkan penghitung kunci; jendela waktu dimulai pada percobaan pertama.
func (r *memoryRateLimitRepo) Allow(_ context.Context, key string, limit entity.RateLimit) (bool, error) {
	now := r.now()

	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.entries) >= memoryRateLimitPruneThreshold {
		for k, entry := range r.entries {
			if !now.Before(entry.expiresAt) {
				delete(r.entries, k)
			}
		}
	}

	entry, ok := r.entries[key]
	if !ok || !now.Before(entry.expiresAt) {
		r.entries[key] = rateWindow{
			count:     1,
			expiresAt: now.Add(limit.Window),
		}
		return 1 <= limit.Limit, nil
	}

	entry.count++
	r.entries[key] = entry
	return entry.count <= limit.Limit, nil
}
