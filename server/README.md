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
cp .env.example .env              # isi DATABASE_URL, MIGRATION_DATABASE_URL, JWT_SECRET
docker compose up -d redis
go run ./scripts/migrate up
go run ./scripts/seed             # opsional: akun development, butuh SEED_PASSWORD di .env
go run .
```

Seed membuat akun development (password = `SEED_PASSWORD`): `mahasiswa@simula.test`, `reviewer@simula.test`, `admin@simula.test`, serta 12 case contoh (7 AI, 5 B2B, beserta mitra, tugas, slot, dan rubrik) dari `scripts/seed/data/cases.json`. Slug-nya sama dengan data tiruan client. Seed ditolak bila `APP_ENV=production` dan melewati akun atau case yang sudah ada. Setelah `cases.json` diubah, jalankan `go run ./scripts/seed -refresh-cases` untuk mengganti isi case contoh yang belum punya enrollment atau order.

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
| POST | `/api/auth/register` | Publik | Daftar (selalu peran mahasiswa), langsung masuk |
| POST | `/api/auth/login` | Publik | Masuk dengan email dan password |
| POST | `/api/auth/refresh` | Publik | Rotasi refresh token, access token baru |
| POST | `/api/auth/logout` | Publik | Cabut sesi perangkat ini, hapus cookie |
| GET | `/api/auth/google` | Publik | Redirect ke login Google (`?next=/path`) |
| GET | `/api/auth/google/callback` | Publik | Callback Google, redirect ke front-end |
| GET | `/api/auth/me` | Login | User yang sedang masuk |
| PATCH | `/api/users/me/onboarding` | Mahasiswa | Bidang (1–3), status, jurusan |
| GET | `/api/cases` | Publik (personal bila login) | Katalog: filter tier, bidang, level, pencarian; sort relevance, popular, rating, price_low; pagination |
| GET | `/api/cases/:slug` | Publik (personal bila login) | Info umum case + status enrollment user |
| GET | `/api/me/dashboard` | Mahasiswa | Statistik, case yang perlu tindakan, 3 rekomendasi |
| GET | `/api/me/enrollments` | Mahasiswa | Case Saya (filter tier, status, bidang, pencarian; sort) |
| POST | `/api/me/enrollments` | Mahasiswa | Mulai AI case gratis (idempoten); B2B ditolak 409 |
| GET | `/api/me/certificates` | Mahasiswa | Sertifikat Saya |

Kontrak lengkap: [`docs/openapi.yaml`](docs/openapi.yaml).

## Auth

- **Sesi** memakai dua cookie `HttpOnly`, `SameSite=Lax`: `access_token` (JWT 30 menit, `Path=/api`) dan `refresh_token` (acak 30 hari, `Path=/api/auth`). Hanya hash SHA-256 refresh token yang disimpan di database.
- **Rotasi**: setiap refresh menerbitkan pasangan token baru dan mencabut yang lama. Token lama yang dipakai lagi setelah 30 detik dianggap dicuri, sehingga semua sesi dari login yang sama dicabut. Dalam 30 detik masih diterima, untuk tab yang me-refresh bersamaan.
- **Rate limit** (Redis): login 5 kali per 15 menit per email + IP, daftar 10 kali per jam per IP, refresh 30 kali per menit per IP. Bila Redis bermasalah, request tetap dilayani.
- **Login Google**: Authorization Code + PKCE. Akun dengan email Google yang sama ditautkan otomatis. Gagal → redirect ke `/login?error=google` (atau `account_disabled`).
- **Grup akses** ada di `router/router.go`: publik, login (peran apa pun), dan per peran (`student`, `reviewer`, `admin`).
- Refresh token yang sudah kedaluwarsa lebih dari 7 hari dihapus task worker setiap hari pukul 03.00 WIB.

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
pkg/            apperror, response, jwt, password, sessioncookie, google, wrapper lain
migrations/     SQL migrasi
scripts/        migrate (runner migrasi), seed (akun development)
docs/           openapi.yaml, database.md
```
