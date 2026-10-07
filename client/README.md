# Simula — Client

Front-end Next.js untuk Simula, platform simulasi kerja dengan dua tier: AI Case Study (gratis) dan B2B Case Study (berbayar, direview praktisi mitra). Ringkasan produk ada di [`../README.md`](../README.md); konteks lengkap, alur pengguna, dan peta halaman ada di [`../../prototype/CONTEXT.md`](../../prototype/CONTEXT.md). Aturan penulisan kode ada di [`CLAUDE.md`](CLAUDE.md).

Saat ini client berjalan sebagai **prototype end-to-end dengan data tiruan** (tanpa backend). Semua data lewat service layer yang sama dengan versi produksi, jadi saat backend Go siap cukup ganti environment variable.

## Stack

| Kebutuhan      | Library                                                                        |
| -------------- | ------------------------------------------------------------------------------ |
| Framework      | Next.js 16 (App Router) + React 19 + TypeScript (strict)                       |
| Styling        | Tailwind CSS v4, `clsx`, `tailwind-merge`, `class-variance-authority`          |
| Komponen dasar | shadcn/ui (Radix), ikon `lucide-react`                                         |
| Data           | `axios` + `@tanstack/react-query`                                              |
| Form           | `react-hook-form` + `zod` + `@hookform/resolvers`                              |
| Feedback       | `sonner` (toast, pojok kanan bawah)                                            |
| Lainnya        | `date-fns`, `framer-motion`, `@paper-design/shaders-react` (latar panel login) |
| Mock API       | `msw` (Mock Service Worker) + mock langsung di `src/mocks/`                    |
| Kualitas kode  | ESLint, Prettier (+ plugin Tailwind)                                           |

## Menjalankan

Butuh Node.js 20 atau lebih baru.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka http://localhost:3000, lalu masuk lewat tombol demo **Mahasiswa** di halaman login.

## Environment variable

| Variabel                  | Keterangan                                                  |
| ------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`    | URL publik website, dipakai untuk metadata, sitemap, robots |
| `NEXT_PUBLIC_API_URL`     | Base URL API backend Go (default `/api/v1`)                 |
| `NEXT_PUBLIC_API_MOCKING` | `enabled` = pakai data tiruan tanpa backend                 |

Semua variabel `NEXT_PUBLIC_*` ikut ke bundle browser, jadi jangan isi dengan secret.

## Halaman

| Route                           | Halaman                                                             | Akses     |
| ------------------------------- | ------------------------------------------------------------------- | --------- |
| `/`                             | Landing page                                                        | Publik    |
| `/login`, `/register`           | Masuk dan daftar (form + Google tiruan)                             | Tamu      |
| `/onboarding`                   | Pilih bidang dan status (sekali, akun baru)                         | Mahasiswa |
| `/dashboard`                    | Ringkasan progres, case yang perlu tindakan, rekomendasi            | Mahasiswa |
| `/cases`, `/cases/[slug]`       | Jelajahi Case (tab AI / B2B) dan detail case                        | Mahasiswa |
| `/cases/[slug]/checkout`        | Checkout B2B: metode bayar, virtual account, gateway tiruan         | Mahasiswa |
| `/cases/[slug]/work`            | Pengerjaan: brief, materi, rubrik, form submission (draft otomatis) | Mahasiswa |
| `/cases/[slug]/status`          | Sedang dinilai AI (progres per kriteria) atau menunggu review       | Mahasiswa |
| `/cases/[slug]/result`          | Hasil: skor per kriteria, feedback, sertifikat, izin berbagi profil | Mahasiswa |
| `/my-cases`, `/my-certificates` | Case Saya dan Sertifikat Saya                                       | Mahasiswa |
| `/profile`                      | Data diri, bidang, notifikasi, persetujuan berbagi data             | Mahasiswa |
| `/certificates/[id]`            | Verifikasi sertifikat publik (unduh PDF, tambahkan ke LinkedIn)     | Publik    |
| `/reviewer`, `/admin/cases`     | Placeholder portal reviewer dan panel admin                         | Per peran |

Belum dibuat: portal reviewer dan panel admin. Halaman produk `/products/*` sengaja ditunda; tombol di section Products dan footer diarahkan ke tab katalog (`/cases?tier=ai` / `?tier=b2b`).

## Mode mock (front-end tanpa backend)

Komponen tidak pernah memanggil data langsung. Alurnya selalu `komponen → hook (React Query) → service (src/services/)`. Saat `NEXT_PUBLIC_API_MOCKING=enabled`, service memanggil logika mock di `src/mocks/*Api.ts` secara langsung, tanpa request jaringan. Saat mock dimatikan, service yang sama memanggil backend lewat axios.

Handler MSW di `src/mocks/handlers/` memakai logika mock yang sama dan menjadi **dokumentasi kontrak API** untuk backend (path, payload, bentuk respons). Service sengaja tidak bergantung pada service worker MSW, karena browser bisa menghentikannya saat tab lama tidak aktif, dan request lalu lolos ke server (404).

Saat backend Go siap:

1. Isi `NEXT_PUBLIC_API_URL` dengan URL backend.
2. Kosongkan `NEXT_PUBLIC_API_MOCKING`.

Tidak ada kode komponen yang perlu diubah. Tipe di `src/types/` menjadi kontrak data dengan backend. Error mock memakai `ApiResponseError` (`src/lib/apiError.ts`) agar pesan dan error per field terbaca sama seperti error dari axios.

Catatan: saat mock aktif, halaman baru dirender setelah service worker MSW siap, sehingga konten tidak ikut di HTML awal. Ini hanya berlaku di mode mock.

### Data dan akun demo

Data tiruan disimpan di `localStorage` browser dengan kunci `ws-mock-db-v6`, jadi akun dan progres tetap ada setelah reload. Hapus kunci itu untuk kembali ke data awal. Naikkan versi kunci di `src/mocks/db.ts` bila bentuk data berubah.

Akun bawaan ada di `src/mocks/demoAccounts.ts`, dan halaman login menyediakan tombol masuk cepat:

| Peran     | Tujuan setelah masuk |
| --------- | -------------------- |
| Mahasiswa | `/dashboard`         |
| Reviewer  | `/reviewer`          |
| Admin     | `/admin/cases`       |

Akun Mahasiswa sudah punya contoh enrollment untuk hampir setiap status (perlu revisi, menunggu review, menunggu pembayaran, belum dimulai, sedang dikerjakan, lulus, belum lulus), plus dua sertifikat, agar semua tampilan bisa didemokan. Tombol "Lanjutkan dengan Google" disimulasikan.

### Panel simulasi untuk presentasi

Bagian bertanda "Simulasi prototype" menggantikan sistem yang belum ada dan tidak muncul di produksi:

- **Checkout:** "Pembayaran masuk" / "Lewati batas waktu" (pengganti webhook payment gateway), serta gateway tiruan untuk QRIS dan GoPay.
- **Status review:** "Nilai lulus", "Nilai belum lulus", "Kembalikan untuk revisi" (pengganti portal reviewer).
- **Sedang dinilai AI:** "Selesaikan sebagai lulus" / "Selesaikan sebagai belum lulus". Tanpa panel ini, penilaian AI tiruan selesai sendiri sebagai lulus sekitar 3 detik per kriteria rubrik, lalu halaman pindah otomatis ke hasil.

## Kontrak API

Respons memakai `IApiResponse<T>` (`{ success, message, data }`); error validasi dikirim sebagai `errors: [{ field, message }]` dan ditampilkan langsung di field form.

### Auth

Didefinisikan di `src/mocks/handlers/auth.ts` (logika di `src/mocks/authApi.ts`) dan `src/types/auth.ts`: `POST /auth/login`, `POST /auth/register`, `POST /auth/google`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`, `PATCH /users/me/onboarding`. Di produksi sesi memakai cookie httpOnly.

### Pembelajaran (dashboard mahasiswa)

Didefinisikan di `src/mocks/handlers/learning.ts` dan `src/types/case.ts`:

| Endpoint                                                             | Keterangan                                                                                                                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /cases?tier&field&level&sort&search&excludeEnrolled&page&limit` | Katalog case (paginated); bidang pilihan pengguna diurutkan lebih dulu. `excludeEnrolled=true` (dikirim saat login) menyembunyikan case yang sudah diambil pengguna |
| `GET /cases/:slug`                                                   | Info umum case untuk halaman detail (tanpa brief lengkap); 404 jika tidak ada                                                                                       |
| `GET /me/dashboard`                                                  | Statistik (termasuk `totalCount` dan `statusCounts` untuk angka di sidebar), case yang perlu tindakan, rekomendasi                                                  |
| `GET /me/enrollments?tier&status&field&search&sort`                  | Case Saya                                                                                                                                                           |
| `POST /me/enrollments` `{ caseId }`                                  | Mulai AI case gratis (B2B dibuat lewat checkout)                                                                                                                    |
| `GET /me/certificates?tier`                                          | Sertifikat Saya                                                                                                                                                     |

### Checkout B2B

Didefinisikan di `src/mocks/handlers/checkout.ts` dan `src/types/checkout.ts`:

| Endpoint                                  | Keterangan                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET /cases/:slug/checkout`               | Info case, enrollment pengguna, dan order terakhir (menunggu/gagal/kedaluwarsa)          |
| `POST /orders` `{ caseId, method }`       | Buat order. VA → order menunggu + enrollment `pending_payment` dengan batas bayar 24 jam |
| `POST /orders/:id/cancel`                 | Batalkan order yang masih menunggu (ganti metode)                                        |
| `POST /orders/:id/simulate` `{ outcome }` | **Khusus prototype.** Di produksi diganti webhook payment gateway                        |

Order lunas mengubah enrollment menjadi `not_started`; gagal atau kedaluwarsa melepas enrollment `pending_payment` sehingga pengguna bisa bayar ulang.

### Pengerjaan

Didefinisikan di `src/mocks/handlers/workspace.ts` dan `src/types/workspace.ts`:

| Endpoint                          | Keterangan                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `GET /cases/:slug/workspace`      | Brief lengkap, slot submission, enrollment, draft, submission, dan catatan revisi |
| `POST /me/enrollments/:id/start`  | B2B "Belum dimulai" → "Sedang dikerjakan"; tenggat dihitung sejak saat ini        |
| `PUT /me/enrollments/:id/draft`   | Simpan draft (dipanggil otomatis berkala)                                         |
| `POST /me/enrollments/:id/submit` | Kirim submission: B2B → `in_review`, AI → `ai_grading`                            |

Backend wajib memvalidasi ulang slot wajib, format, ukuran berkas, dan URL. Di prototype, berkas tidak diunggah; hanya nama dan ukurannya yang disimpan.

### Status review

Didefinisikan di `src/mocks/handlers/reviewStatus.ts` dan `src/types/reviewStatus.ts`:

| Endpoint                                                 | Keterangan                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /cases/:slug/status`                                | Enrollment, submission terakhir, rubrik, ambang lulus, batas SLA review, riwayat peristiwa, dan `aiGrading` (progres penilaian AI: `startedAt`, `estimatedDoneAt`, `checkedCriteria`). Klien memeriksa ulang tiap 1,5 detik selama `ai_grading` |
| `POST /me/enrollments/:id/simulate-review` `{ outcome }` | **Khusus prototype.** Keputusan reviewer tiruan (`revision`, `passed`, `failed`), atau mempercepat penilaian AI (`passed`, `failed`); di produksi datang dari portal reviewer dan layanan AI                                                    |

`reviewDueAt` = waktu submit terakhir + 5 hari kerja (SLA review). `events` berisi `paid`, `started`, `submitted` (dengan `attempt`), `revision_requested`, `reviewed`, dan `retried`, urut dari yang paling lama, untuk timeline progres.

### Hasil

Didefinisikan di `src/mocks/handlers/result.ts` dan `src/types/result.ts`:

| Endpoint                                                 | Keterangan                                                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GET /cases/:slug/result`                                | Skor total, skor + level + alasan per kriteria, feedback tiga bagian, sertifikat, status persetujuan berbagi profil, dan `canRetry` |
| `POST /me/enrollments/:id/share-consent` `{ isGranted }` | Persetujuan berbagi profil ke mitra, hanya bila reviewer merekomendasikan ke daftar prioritas interview                             |
| `POST /me/enrollments/:id/retry`                         | Belum lulus → `in_progress` lagi. AI tanpa batas; B2B sekali (tenggat 3 hari)                                                       |

Poin per kriteria = level ÷ 5 × bobot, total dibulatkan (lihat `src/lib/score.ts`). Lulus bila skor ≥ `passingScore`; sertifikat terbit otomatis tanpa tombol klaim. Rekomendasi interview adalah keputusan reviewer; simulasi demo memakai saran skor ≥ 80.

### Verifikasi sertifikat

Didefinisikan di `src/mocks/handlers/certificate.ts` dan `src/types/certificate.ts`:

| Endpoint                | Keterangan                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /certificates/:id` | **Publik, tanpa login.** Data sertifikat, skill, penilai, mitra, ambang lulus, dan `isOwner` (aksi bagikan hanya untuk pemilik). 404 bila ID tidak terdaftar |

Halaman `/certificates/[id]` tidak diindeks mesin pencari karena berisi nama penerima. "Unduh PDF" memakai dialog cetak browser dengan gaya cetak khusus (`@media print` di `globals.css`), sehingga hanya dokumen sertifikat yang tercetak. Pratinjau di Sertifikat Saya dan dokumen di halaman verifikasi memakai komponen yang sama (`CertificatePaper`).

### Profil

Didefinisikan di `src/mocks/handlers/profile.ts` dan `src/types/profile.ts`:

| Endpoint                                        | Keterangan                                                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /users/me/profile`                         | Data pengguna, kampus, LinkedIn, preferensi notifikasi, pengaturan berbagi data, dan daftar rekomendasi interview beserta status izinnya |
| `PATCH /users/me/profile`                       | Data diri + bidang (`IProfileDetailsPayload`). Validasi ulang nama, 1-3 bidang, dan format URL LinkedIn                                  |
| `PUT /users/me/notifications`                   | Preferensi per jenis notifikasi (`payment`, `deadline`, `revision`, `result`, `interview`) × kanal (`email`, `inApp`)                    |
| `PUT /users/me/data-sharing` `{ shareDefault }` | `ask` / `always` / `never`; menentukan status awal izin saat reviewer merekomendasikan berikutnya                                        |

Izin per mitra memakai `POST /me/enrollments/:id/share-consent` yang sama dengan halaman hasil.

## Script

| Perintah                          | Fungsi                                                             |
| --------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                     | Dev server                                                         |
| `npm run build` / `npm start`     | Build dan jalankan versi produksi                                  |
| `npm run lint`                    | ESLint                                                             |
| `npm run type-check`              | Pemeriksaan TypeScript                                             |
| `npm run format` / `format:check` | Prettier                                                           |
| `npm run verify`                  | Lint + type-check + build (wajib lolos sebelum menyatakan selesai) |

## Struktur folder

```
public/
└── brand/               # Logo dan simbol Simula (versi latar terang dan gelap)
src/
├── app/                 # Route (App Router), layout, globals.css (design token), icon.svg (favicon)
│   ├── (marketing)/     # Landing dan verifikasi sertifikat publik
│   ├── (auth)/          # Login dan daftar
│   ├── (student)/       # Area mahasiswa: dashboard, case, checkout, pengerjaan, status, hasil, profil
│   └── onboarding/
├── components/
│   ├── ui/              # Primitive shadcn/ui (button, dialog, switch, dsb.)
│   ├── layout/          # Navbar, Footer, Logo
│   ├── landing/         # Section landing page
│   ├── student/         # Komponen area mahasiswa yang dipakai ulang (shell, kartu, sertifikat)
│   ├── animated/        # Komponen animasi ('use client')
│   └── providers/       # React Query, Toaster, MSW
├── constants/           # PATHS (semua URL halaman), SITE, BRAND_ASSETS, status, pembayaran
├── hooks/               # Hook umum dan use<Fitur>
├── lib/                 # utils (cn), env, seo, formatters, score, apiError, authRedirect
├── mocks/               # Data tiruan, logika mock per fitur (*Api.ts), handler MSW
├── services/            # axios instance + service per fitur
└── types/               # Tipe API dan domain (kontrak dengan backend)
```

Folder `mocks/` dan `components/providers/` tidak ada di struktur CLAUDE.md. Keduanya ditambahkan karena front-end dibangun lebih dulu dengan data tiruan, dan provider client perlu dipisah dari `layout.tsx` agar layout tetap Server Component.

## Brand

Nama brand: **Simula**. Aset ada di `public/brand/` dan didaftarkan di `src/constants/brand.ts`:

| File                      | Dipakai untuk                                                    |
| ------------------------- | ---------------------------------------------------------------- |
| `simula-logo-light.svg`   | Logo utama di latar terang (navbar, sidebar, footer, sertifikat) |
| `simula-logo-dark.svg`    | Logo di latar gelap (panel biru halaman login dan daftar)        |
| `simula-symbol-light.svg` | Simbol saja; juga dipakai sebagai favicon (`src/app/icon.svg`)   |
| `simula-symbol-dark.svg`  | Simbol saja untuk latar gelap                                    |

Pakai komponen `Logo` (dengan tautan ke beranda) atau `BrandLogo` (tanpa tautan) dari `src/components/layout/Logo.tsx`. Nama situs diambil dari `SITE.name` di `src/constants/site.ts`.

## Design token

Didefinisikan di `src/app/globals.css`. Font: Geist, dengan Geist Mono untuk angka dan metadata (tanggal, ID, skor). Putih dominan, biru sebagai warna brand, dan dua warna tier sebagai penanda yang wajib dipakai konsisten:

| Token                                                               | Dipakai untuk                                     |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| `brand`, `brand-hover`, `brand-soft`, `brand-muted`, `brand-deep`   | Warna utama (tombol utama, link aktif, penekanan) |
| `ai`, `ai-soft`, `ai-hover` (hijau)                                 | Penanda AI Case Study (gratis) dan status lulus   |
| `b2b`, `b2b-soft`, `b2b-hover` (biru, sama dengan brand)            | Penanda B2B Case Study (berbayar)                 |
| `ink`, `ink-muted`, `ink-subtle`, `surface`, `surface-soft`, `line` | Netral                                            |
| `rounded-card` (12px), `rounded-control` (8px), `rounded-tag` (6px) | Skala sudut area aplikasi; tombol tetap pill      |
| `shadow-lift`                                                       | Bayangan bernuansa biru tua, bukan hitam          |
| `text-page-title`                                                   | Judul halaman aplikasi                            |

Tombol: `<Button>` (biru), `<Button variant="ai">`, `<Button variant="b2b">`, `<Button variant="inverse">` (putih, untuk di atas blok biru); ukuran pill `size="pill"` / `size="pill-lg"`.

Situs hanya punya tema terang. Varian `dark:` di komponen shadcn hanya aktif jika ada kelas `.dark`, jadi tidak terpengaruh mode gelap sistem operasi.

## Animasi

Komponen di `src/components/animated/` memakai framer-motion dan menghormati `prefers-reduced-motion`: `Reveal` (muncul saat di-scroll), `Float` (kartu mengambang), `GrowBar` dan `ScoreRing` (progres). Marquee bidang studi memakai animasi CSS dan berhenti saat di-hover. Latar panel login dan daftar memakai shader grain dari `@paper-design/shaders-react` dan berhenti bergerak saat reduced motion aktif.

## Deploy

Belum ditentukan. Pilihan: Vercel, atau Docker dengan `output: 'standalone'` di `next.config.ts`.
