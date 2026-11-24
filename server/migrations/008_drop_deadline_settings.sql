-- +migrate Up

-- Semua case self-paced: tidak ada lagi tambahan tenggat revisi maupun batas mulai B2B, jadi
-- kedua pengaturan ini dihapus. Riwayat di platform_settings_logs tetap disimpan apa adanya.
ALTER TABLE platform_settings DROP COLUMN revision_extra_days;
ALTER TABLE platform_settings DROP COLUMN b2b_start_window_days;

-- rollback

ALTER TABLE platform_settings
    ADD COLUMN b2b_start_window_days smallint NOT NULL DEFAULT 30 CHECK (b2b_start_window_days BETWEEN 7 AND 180);
ALTER TABLE platform_settings
    ADD COLUMN revision_extra_days smallint NOT NULL DEFAULT 3 CHECK (revision_extra_days BETWEEN 1 AND 14);
