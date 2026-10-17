# Simula — Server

Backend REST untuk Simula (Go + Gin).

## Stack

Go · Gin · GORM + Supabase PostgreSQL · Asynq + Redis · Cloudflare R2 · Midtrans · Resend · Claude API · zerolog · envconfig · testify

## Prasyarat

- Go 1.26 atau lebih baru
- Docker (untuk Redis lokal)
- Project Supabase (connection string pooler port 6543 dan 5432)

## Menjalankan

```bash
cp .env.example .env              # lalu isi DATABASE_URL dan MIGRATION_DATABASE_URL
docker compose up -d redis
go run ./scripts/migrate up
go run .
```

Server berjalan di http://localhost:8080. Cek dengan:

```bash
curl http://localhost:8080/api/health/ready
```

`APP_MODE` menentukan peran proses: `all` (default lokal: API + worker), `server` (API saja), atau `worker` (Asynq saja). `.env` dibaca otomatis saat lokal; di server, env var diisi platform deploy.

## Perintah

`make` tersedia di Mac/Linux dan CI. Di Windows tanpa `make`, pakai perintah di kolom kanan.

| Make | Tanpa make |
| --- | --- |
| `make run` | `go run .` |
| `make run-server` | `APP_MODE=server go run .` |
| `make run-worker` | `APP_MODE=worker go run .` |
| `make test` | `go test ./... -race -count=1` |
| `make lint` | `gofmt -l .` lalu `go vet ./...` |
| `make migrate-up` | `go run ./scripts/migrate up` |
| `make migrate-down` | `go run ./scripts/migrate down` |
| `make migrate-status` | `go run ./scripts/migrate status` |
| `make redis-up` | `docker compose up -d redis` |

Catatan Windows: `go test -race` butuh compiler C (cgo). Bila belum ada, jalankan `go test ./...` tanpa `-race`; CI tetap menjalankan versi dengan `-race`.

## Endpoint

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/health` | Publik | Liveness |
| GET | `/api/health/ready` | Publik | Readiness: database dan Redis (503 bila ada yang mati) |

Kontrak lengkap: [`docs/openapi.yaml`](docs/openapi.yaml).

## Struktur

```
main.go         entrypoint: load config, pilih APP_MODE
app/            wiring dependency per domain
config/         env var (envconfig)
initializers/   logger, database, Redis, Asynq, HTTP server
core/           entity, errors, interface repository, use case
repository/     implementasi GORM (db) dan Redis (cache)
handler/        handler Gin + DTO
router/         daftar route dan grup aksesnya
middleware/     request ID, logger, recovery, CORS, body limit, error
task/           task Asynq dan registry
pkg/            apperror, response, pagination, wrapper layanan eksternal
migrations/     SQL migrasi
scripts/migrate runner migrasi
docs/           openapi.yaml
```
