# Simula — Server

Backend REST untuk Simula (Go + Gin).

## Stack

Go · Gin · GORM + Supabase PostgreSQL · Asynq + Redis · Cloudflare R2 · Midtrans · Resend · Gemini API · zerolog · envconfig · testify

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

Seed membuat akun development (password = `SEED_PASSWORD`): `mahasiswa@simula.test`, `reviewer@simula.test`, `admin@simula.test`, serta 12 case contoh (7 AI, 5 B2B, beserta mitra, tugas, slot, dan rubrik) dari `scripts/seed/data/cases.json`. Slug-nya sama dengan data tiruan client. Seed ditolak bila `APP_ENV=production` dan melewati akun atau case yang sudah ada. Setelah `cases.json` diubah, jalankan `go run ./scripts/seed -refresh-cases` untuk mengganti isi case contoh yang belum punya enrollment atau order. Seed juga memberi akun mahasiswa satu B2B case berstatus "Belum dimulai" (`mencegah-overselling-flash-sale`, dianggap sudah dibayar) untuk mencoba alur B2B sebelum checkout tersedia.

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
| GET | `/api/cases/:slug/workspace` | Mahasiswa | Halaman pengerjaan: brief lengkap, draft, submission terakhir, catatan revisi |
| GET | `/api/cases/:slug/status` | Mahasiswa | Halaman status: timeline, batas review, progres penilaian AI |
| POST | `/api/me/enrollments/:id/start` | Mahasiswa | Mulai B2B yang sudah dibayar; tenggat dalam hari kalender |
| PUT | `/api/me/enrollments/:id/draft` | Mahasiswa | Simpan draft |
| POST | `/api/me/enrollments/:id/submit` | Mahasiswa | Kirim submission (AI → dinilai AI, B2B → menunggu review, SLA 5 hari kerja); ditolak setelah tenggat |
| POST | `/api/uploads` | Mahasiswa | URL unggah berkas langsung ke R2 |
| GET | `/api/cases/:slug/result` | Mahasiswa | Halaman hasil: skor per kriteria, feedback, sertifikat, boleh coba lagi |
| POST | `/api/me/enrollments/:id/retry` | Mahasiswa | Coba lagi setelah tidak lulus (AI tanpa batas, B2B sekali dengan tenggat 3 hari) |
| GET | `/api/certificates/:id` | Publik (isOwner bila login) | Verifikasi sertifikat untuk recruiter |
| GET | `/api/cases/:slug/checkout` | Mahasiswa | Halaman checkout: case, enrollment, order terakhir yang belum lunas |
| POST | `/api/orders` | Mahasiswa | Buat order B2B (VA menunggu 24 jam, QRIS/GoPay langsung) |
| POST | `/api/orders/:id/cancel` | Mahasiswa | Batalkan order yang menunggu (ganti metode) |
| POST | `/api/orders/:id/simulate` | Mahasiswa | Simulasi hasil bayar, hanya dengan `PAYMENT_PROVIDER=fake` |
| POST | `/api/webhooks/midtrans` | Webhook (signature) | HTTP notification Midtrans |

Kontrak lengkap: [`docs/openapi.yaml`](docs/openapi.yaml).

## Unggah berkas (Cloudflare R2)

- Isi `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, dan `R2_BUCKET` di `.env`. Tanpa nilai ini server tetap berjalan, tetapi unggah dan submit berkas gagal.
- Bucket private. CORS bucket harus mengizinkan `PUT` dari origin front-end dengan header `content-type`.
- Alur: client meminta URL ke `POST /api/uploads`, mengunggah langsung ke R2 dengan `PUT`, lalu menyimpan `fileId` di isian slot. Saat submit, server memeriksa setiap berkas di R2 (ada dan ukurannya sama).
- Key object: `submissions/{enrollmentId}/{attempt}/{slotId}/{fileId}.{ext}`. Nama berkas asli hanya disimpan di database.
- Berkas yang tidak pernah dipakai di draft atau submission dihapus task worker setiap jam setelah 24 jam.

## Penilaian AI

- `LLM_PROVIDER=fake` memakai penilai palsu yang deterministik (isi yang sama selalu mendapat skor yang sama) dengan jeda `FAKE_LLM_DELAY` per langkah agar progres di halaman status terlihat. Ditolak saat `APP_ENV=production`. Integrasi Gemini menyusul.
- `LLM_PROVIDER` kosong: penilaian AI nonaktif. Submit AI tetap tersimpan dan berhenti di status `ai_grading`; begitu worker menyala dengan penilai aktif, submission itu dinilai otomatis.
- Alur: submit membuat run di `ai_grading_runs`, lalu worker menilai satu kriteria per task (`grading:evaluate_criterion`), menyusun feedback (`grading:compose_feedback`), dan memfinalkan lewat `hook.OnReviewed`: skor total dihitung server, status menjadi `passed`/`failed`, dan sertifikat terbit bila lulus.
- Setiap langkah diulang hingga 3 kali. Bila tetap gagal, run ditandai gagal, submission kembali menjadi draft, dan peserta bisa submit ulang tanpa dihitung sebagai percobaan. Task `grading:resume_stalled` (saat worker menyala lalu setiap 5 menit) melanjutkan run yang macet lebih dari 10 menit dan membuatkan run untuk submission yang belum punya.
- Server API dan worker harus memakai `LLM_PROVIDER` yang sama.

## Checkout B2B

- `PAYMENT_PROVIDER=fake` memakai gateway palsu yang meniru Midtrans Core API: nomor VA, status transaksi, dan signature notifikasi dengan format yang sama. Ditolak saat `APP_ENV=production`. Kosong: checkout ditolak. Midtrans asli menyusul.
- Alur: `POST /api/orders` membuat order (harga dari server) dan menjadwalkan `order:expire` di batas bayar (24 jam). VA langsung masuk Case Saya sebagai "Menunggu pembayaran".
- Status pembayaran hanya berubah lewat notifikasi webhook: dicatat di `payment_notifications`, signature diperiksa, lalu status dikonfirmasi ke gateway. Panel demo di halaman checkout (`POST /api/orders/:id/simulate`) membuat notifikasi bertanda tangan seperti simulator sandbox Midtrans dan memprosesnya lewat jalur yang sama.
- Lunas: `hook.OnOrderPaid` memindahkan case ke "Belum dimulai" dengan batas mulai 30 hari. Gagal, kedaluwarsa, atau dibatalkan: enrollment "Menunggu pembayaran" dilepas dan peserta bisa bayar ulang.
- Gateway palsu menyimpan status transaksi di memori proses server, jadi status simulasi hilang saat server restart (order yang tidak dikenal dianggap masih menunggu).

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
