package initializers

import (
	"context"
	"crypto/tls"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/config"
)

const redisConnectTimeout = 5 * time.Second

// NewRedisClient membuka koneksi Redis untuk health check dan cache, lalu memastikan Redis bisa
// dijangkau.
func NewRedisClient(ctx context.Context, cfg *config.Config) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:      cfg.RedisAddr,
		Password:  cfg.RedisPassword,
		DB:        cfg.RedisDB,
		TLSConfig: redisTLSConfig(cfg),
	})

	pingCtx, cancel := context.WithTimeout(ctx, redisConnectTimeout)
	defer cancel()
	if err := rdb.Ping(pingCtx).Err(); err != nil {
		_ = rdb.Close()
		return nil, fmt.Errorf("failed to ping redis: %w", err)
	}
	return rdb, nil
}

// CloseRedis menutup koneksi Redis. Error hanya dicatat karena dipanggil saat shutdown.
func CloseRedis(rdb *redis.Client) {
	if err := rdb.Close(); err != nil {
		log.Error().Err(err).Msg("failed to close redis")
	}
}

// AsynqRedisOpt memakai koneksi Redis yang sama untuk Asynq.
func AsynqRedisOpt(cfg *config.Config) asynq.RedisClientOpt {
	return asynq.RedisClientOpt{
		Addr:      cfg.RedisAddr,
		Password:  cfg.RedisPassword,
		DB:        cfg.RedisDB,
		TLSConfig: redisTLSConfig(cfg),
	}
}

func redisTLSConfig(cfg *config.Config) *tls.Config {
	if !cfg.RedisTLS {
		return nil
	}
	return &tls.Config{MinVersion: tls.VersionTLS12}
}
