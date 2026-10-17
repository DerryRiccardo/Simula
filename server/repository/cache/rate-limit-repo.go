package cache

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type rateLimitRepo struct {
	rdb *redis.Client
}

// InitRateLimitRepo membuat rate limiter fixed window berbasis Redis.
func InitRateLimitRepo(rdb *redis.Client) coreRepo.RateLimiter {
	return &rateLimitRepo{rdb: rdb}
}

// Allow menaikkan penghitung kunci; jendela waktu dimulai pada percobaan pertama.
func (r *rateLimitRepo) Allow(ctx context.Context, key string, limit entity.RateLimit) (bool, error) {
	pipe := r.rdb.TxPipeline()
	count := pipe.Incr(ctx, key)
	pipe.ExpireNX(ctx, key, limit.Window)
	if _, err := pipe.Exec(ctx); err != nil {
		return false, fmt.Errorf("failed to count rate limit: %w", err)
	}
	return count.Val() <= int64(limit.Limit), nil
}
