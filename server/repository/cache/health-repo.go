// Package cache berisi implementasi repository dengan Redis.
package cache

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"

	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

type healthRepo struct {
	rdb *redis.Client
}

// InitHealthRepo membuat probe untuk Redis.
func InitHealthRepo(rdb *redis.Client) coreRepo.HealthProbe {
	return &healthRepo{rdb: rdb}
}

func (r *healthRepo) Name() string {
	return "redis"
}

func (r *healthRepo) Ping(ctx context.Context) error {
	if err := r.rdb.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to ping redis: %w", err)
	}
	return nil
}
