-- +migrate Up

-- Reviewer pemegang submission B2B (CONTEXT.md 4.13). Satu case boleh punya beberapa reviewer dari
-- mitra yang sama, tetapi setiap submission dipegang satu reviewer: diisi saat submit (reviewer
-- aktif dengan antrean paling sedikit), dipakai lagi saat submit ulang setelah revisi, dan diubah
-- admin lewat "Ganti reviewer".
ALTER TABLE enrollments ADD COLUMN assigned_reviewer_id uuid REFERENCES users (id);
CREATE INDEX enrollments_assigned_reviewer_idx ON enrollments (assigned_reviewer_id, status)
    WHERE assigned_reviewer_id IS NOT NULL;

-- rollback

DROP INDEX enrollments_assigned_reviewer_idx;
ALTER TABLE enrollments DROP COLUMN assigned_reviewer_id;
