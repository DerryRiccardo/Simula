# Simula

Platform pengalaman kerja tersimulasi untuk mahasiswa tingkat akhir dan fresh graduate di Indonesia. Peserta mengerjakan case study yang dirancang dari kebutuhan industri, mendapat skor dan feedback per kriteria, lalu menerima sertifikat yang bisa diverifikasi recruiter.

Dokumen lengkap produk (alur pengguna, peta halaman, keputusan bisnis) ada di [`../prototype/CONTEXT.md`](../prototype/CONTEXT.md). README ini hanya ringkasannya.

## Masalah yang diselesaikan

Lulusan baru sering punya pendidikan formal tetapi belum punya pengalaman kerja yang diminta perusahaan. Solusi yang ada (magang, program pemerintah, platform global) terbatas kuotanya, prosesnya lambat, atau kontennya tidak spesifik untuk pasar kerja Indonesia.

## Produk: dua tier case study

|             | AI Case Study                   | B2B Case Study                                         |
| ----------- | ------------------------------- | ------------------------------------------------------ |
| Harga       | Gratis                          | Berbayar (dibayar mahasiswa)                           |
| Sumber case | Disusun tim internal            | Brief dari perusahaan mitra, dikemas admin             |
| Penilai     | AI, mengikuti rubrik dari admin | Praktisi perusahaan mitra, mengikuti rubrik dari admin |
| Durasi      | 2-4 jam, sekali submit          | 3-7 hari, bisa dicicil                                 |
| Sertifikat  | Dari Simula                     | Berlogo perusahaan mitra                               |
| Tujuan      | Belajar dan mengenali skill gap | Validasi kompetensi dan **kesempatan** masuk rekrutmen |

"AI" berarti siapa yang menilai, bukan siapa yang membuat soal. Semua case dan rubrik dibuat admin.

Kedua tier membentuk satu funnel: mulai gratis di AI Case Study, lalu lanjut ke B2B Case Study di bidang yang sama untuk divalidasi praktisi.

## Peran

| Peran     | Fungsi utama                                                                        |
| --------- | ----------------------------------------------------------------------------------- |
| Mahasiswa | Mengerjakan AI case, membeli dan mengerjakan B2B case, melihat hasil dan sertifikat |
| Reviewer  | Praktisi mitra yang menilai submission B2B, atau mengembalikannya untuk revisi      |
| Admin     | Membuat case, menyusun rubrik, menugaskan reviewer                                  |

## Alur utama

- **AI Case Study:** jelajahi case, klik Mulai, kerjakan brief, submit, AI menilai, lalu halaman hasil. Lulus langsung mendapat sertifikat; belum lulus boleh coba lagi tanpa batas.
- **B2B Case Study:** detail case, checkout (bayar), mulai mengerjakan (tenggat dihitung sejak ini), submit, menunggu review (SLA 5 hari kerja), lalu hasil. Reviewer bisa mengembalikan untuk revisi (belum dinilai, tidak mengurangi skor). Lulus mendapat sertifikat berlogo mitra; reviewer bisa merekomendasikan ke daftar prioritas interview, dan profil baru dibagikan setelah peserta setuju.

## Keputusan penting

- Membeli B2B case **tidak menjamin** panggilan interview. Disclaimer ini wajib tampil di detail case, checkout, FAQ, dan halaman hasil.
- Tidak ada gamifikasi atau leaderboard; tujuannya membantu belajar.
- Tidak ada pre-screening otomatis. Penggantinya validasi ketat di form submission dan opsi "kembalikan untuk revisi" oleh reviewer.
- Brief ditampilkan langsung di halaman, bukan PDF. Kandidat anonim di mata reviewer.
- Cakupan bidang studi luas sejak awal, bukan hanya teknologi.

Keputusan yang masih terbuka (ambang lulus, batas revisi, tenggat tambahan, dan lainnya) tercatat di CONTEXT.md bagian 7.

## Isi folder

```
website/
├── client/   # Front-end Next.js + TypeScript (prototype end-to-end dengan data tiruan)
└── server/   # Backend Go (belum dimulai)
```

Front-end dibangun lebih dulu dengan data tiruan di balik service layer yang sama dengan versi produksi. Saat backend Go siap, front-end cukup diarahkan ke API asli. Kontrak API (endpoint, payload, bentuk respons) didokumentasikan di [`client/README.md`](client/README.md) dan tipe di `client/src/types/`.

## Mulai cepat

```bash
cd client
npm install
cp .env.example .env.local
npm run dev
```

Buka http://localhost:3000, lalu masuk dengan tombol demo **Mahasiswa** di halaman login. Detail lengkap ada di [`client/README.md`](client/README.md).
