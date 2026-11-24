-- +migrate Up

-- Menghapus batas waktu dan label durasi pengerjaan case (seluruh case bersifat self-paced).
ALTER TABLE cases DROP CONSTRAINT cases_ai_has_no_commercial;
ALTER TABLE cases ADD CONSTRAINT cases_ai_has_no_commercial CHECK (
    tier = 'b2b' OR (price IS NULL AND partner_id IS NULL AND reviewer_role IS NULL)
);
ALTER TABLE cases DROP COLUMN duration_label;
ALTER TABLE cases DROP COLUMN deadline_days;
ALTER TABLE enrollments DROP COLUMN deadline_at;

-- Menambahkan bidang baru agar sesuai dengan kebutuhan 10 perusahaan mitra, serta memperbarui
-- nama bidang Product Management.
UPDATE fields
SET
    label = 'Product Management',
    description = 'Prioritas fitur, PRD, timeline, koordinasi tim'
WHERE key = 'product';

INSERT INTO fields (key, label, description, sort_order)
SELECT
    v.key,
    v.label,
    v.description,
    COALESCE((SELECT MAX(sort_order) FROM fields), 12) + v.offset_order
FROM (
    VALUES
        ('business-development', 'Business Development', 'Kemitraan, penjualan, ekspansi pasar', 1),
        ('qa', 'Quality Assurance', 'Pengujian sistem, test case, bug tracking', 2),
        ('devops', 'DevOps', 'CI/CD, cloud, infrastruktur, otomasi', 3),
        ('cyber-security', 'Cyber Security', 'Keamanan jaringan, audit, proteksi data', 4)
) AS v(key, label, description, offset_order)
ON CONFLICT (key) DO NOTHING;

-- rollback

DELETE FROM fields WHERE key IN (
    'business-development',
    'qa',
    'devops',
    'cyber-security'
);

UPDATE fields
SET
    label = 'Product',
    description = 'Prioritas fitur, PRD, metrik'
WHERE key = 'product';

ALTER TABLE enrollments ADD COLUMN deadline_at timestamptz;
ALTER TABLE cases ADD COLUMN deadline_days smallint CHECK (deadline_days > 0);
ALTER TABLE cases ADD COLUMN duration_label text NOT NULL DEFAULT '';
ALTER TABLE cases DROP CONSTRAINT cases_ai_has_no_commercial;
ALTER TABLE cases ADD CONSTRAINT cases_ai_has_no_commercial CHECK (
    tier = 'b2b' OR (price IS NULL AND partner_id IS NULL AND deadline_days IS NULL AND reviewer_role IS NULL)
);
