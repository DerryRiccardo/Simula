-- +migrate Up

-- Menandai apakah user sudah melihat spotlight tour dashboard (sekali per akun).
ALTER TABLE users ADD COLUMN has_seen_tour boolean NOT NULL DEFAULT false;

-- Mengizinkan admin mengarsipkan case ('archived') tanpa menghapus riwayat enrollment.
ALTER TABLE cases DROP CONSTRAINT cases_status_check;
ALTER TABLE cases ADD CONSTRAINT cases_status_check CHECK (status IN ('draft', 'published', 'archived'));

-- Mitra nonaktif tidak bisa dipilih untuk case/reviewer baru, tapi riwayat lama tetap utuh.
ALTER TABLE partners ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- rollback

ALTER TABLE partners DROP COLUMN is_active;
ALTER TABLE cases DROP CONSTRAINT cases_status_check;
ALTER TABLE cases ADD CONSTRAINT cases_status_check CHECK (status IN ('draft', 'published'));
ALTER TABLE users DROP COLUMN has_seen_tour;
