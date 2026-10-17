// Package config memuat seluruh pengaturan service dari environment variable.
package config

import (
	"fmt"
	"time"

	"github.com/kelseyhightower/envconfig"
)

// Mode proses yang didukung APP_MODE.
const (
	AppModeServer = "server"
	AppModeWorker = "worker"
	AppModeAll    = "all"
)

// Lingkungan yang didukung APP_ENV.
const (
	AppEnvDevelopment = "development"
	AppEnvProduction  = "production"
)

// Config berisi semua setting service. Fitur opsional defaultnya kosong (nonaktif); hanya field
// required yang menggagalkan startup bila tidak diisi.
type Config struct {
	AppMode string `envconfig:"APP_MODE" default:"all"`
	AppEnv  string `envconfig:"APP_ENV" default:"development"`

	LogLevel  string `envconfig:"LOG_LEVEL" default:"info"`
	LogFormat string `envconfig:"LOG_FORMAT" default:"json"`

	HTTPPort        int           `envconfig:"PORT" default:"8080"`
	FrontendURL     string        `envconfig:"FRONTEND_URL" default:"http://localhost:3000"`
	BodyLimitBytes  int64         `envconfig:"BODY_LIMIT_BYTES" default:"1048576"`
	ReadTimeout     time.Duration `envconfig:"HTTP_READ_TIMEOUT" default:"15s"`
	WriteTimeout    time.Duration `envconfig:"HTTP_WRITE_TIMEOUT" default:"30s"`
	ShutdownTimeout time.Duration `envconfig:"SHUTDOWN_TIMEOUT" default:"20s"`
	TrustedProxies  []string      `envconfig:"TRUSTED_PROXIES"`

	// DatabaseURL dipakai aplikasi: pooler Supabase mode transaction (port 6543).
	DatabaseURL       string        `envconfig:"DATABASE_URL" required:"true"`
	DBMaxOpenConns    int           `envconfig:"DB_MAX_OPEN_CONNS" default:"10"`
	DBMaxIdleConns    int           `envconfig:"DB_MAX_IDLE_CONNS" default:"5"`
	DBConnMaxLifetime time.Duration `envconfig:"DB_CONN_MAX_LIFETIME" default:"30m"`
	DBSlowQuery       time.Duration `envconfig:"DB_SLOW_QUERY" default:"500ms"`

	RedisAddr     string `envconfig:"REDIS_ADDR" default:"localhost:6379"`
	RedisPassword string `envconfig:"REDIS_PASSWORD"`
	RedisDB       int    `envconfig:"REDIS_DB" default:"0"`
	RedisTLS      bool   `envconfig:"REDIS_TLS" default:"false"`

	QueueName         string `envconfig:"QUEUE_NAME" default:"simula-queue"`
	WorkerConcurrency int    `envconfig:"WORKER_CONCURRENCY" default:"5"`

	HealthCheckTimeout time.Duration `envconfig:"HEALTH_CHECK_TIMEOUT" default:"2s"`
}

// Load membaca environment variable ke Config lalu memvalidasi nilainya.
func Load() (*Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, fmt.Errorf("failed to read env: %w", err)
	}
	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return &cfg, nil
}

// IsProduction bernilai true bila APP_ENV=production.
func (c *Config) IsProduction() bool {
	return c.AppEnv == AppEnvProduction
}

func (c *Config) validate() error {
	switch c.AppMode {
	case AppModeServer, AppModeWorker, AppModeAll:
	default:
		return fmt.Errorf("invalid APP_MODE %q: must be server, worker, or all", c.AppMode)
	}
	switch c.AppEnv {
	case AppEnvDevelopment, AppEnvProduction:
	default:
		return fmt.Errorf("invalid APP_ENV %q: must be development or production", c.AppEnv)
	}
	if c.LogFormat != "json" && c.LogFormat != "console" {
		return fmt.Errorf("invalid LOG_FORMAT %q: must be json or console", c.LogFormat)
	}
	if c.HTTPPort <= 0 || c.HTTPPort > 65535 {
		return fmt.Errorf("invalid PORT %d", c.HTTPPort)
	}
	if c.BodyLimitBytes <= 0 {
		return fmt.Errorf("invalid BODY_LIMIT_BYTES %d", c.BodyLimitBytes)
	}
	if c.WorkerConcurrency <= 0 {
		return fmt.Errorf("invalid WORKER_CONCURRENCY %d", c.WorkerConcurrency)
	}
	if c.QueueName == "" {
		return fmt.Errorf("QUEUE_NAME must not be empty")
	}
	return nil
}
