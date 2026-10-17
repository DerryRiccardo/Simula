# Migrasi

Nama file: `NNN_snake_case.sql`, nomor tiga digit berurutan mulai dari `001`. Desain skema ada di [`../docs/database.md`](../docs/database.md).

Aturan:

- File yang sudah dijalankan tidak boleh diedit; perubahan skema selalu lewat file baru.
- Setiap `CREATE TABLE` disertai `ENABLE ROW LEVEL SECURITY` agar tabel tidak terbuka lewat Data API Supabase.
- Penanda `-- +migrate Up` dan `-- rollback` ditulis persis seperti contoh; runner membaca bagian di antara keduanya.
- Migrasi dijalankan manual dengan `MIGRATION_DATABASE_URL` (koneksi langsung atau pooler mode session, port 5432).

```sql
-- +migrate Up
CREATE TABLE contoh (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contoh ENABLE ROW LEVEL SECURITY;
-- rollback
DROP TABLE contoh;
```

Jalankan dari folder `server`:

```bash
go run ./scripts/migrate status
go run ./scripts/migrate up
go run ./scripts/migrate down
```
