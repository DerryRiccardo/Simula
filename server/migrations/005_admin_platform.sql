-- +migrate Up

-- Waktu admin meneruskan profil kandidat yang direkomendasikan ke mitra.
ALTER TABLE enrollments ADD COLUMN profile_shared_at timestamptz;

-- Bidang nonaktif tidak bisa dipilih untuk case atau onboarding baru tanpa menghapus riwayat lama.
ALTER TABLE fields ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Pengaturan platform. Batas nilai sama dengan platformSettings.ts.
CREATE TABLE platform_settings (
    id                       boolean PRIMARY KEY DEFAULT true CHECK (id),
    review_sla_days          smallint NOT NULL DEFAULT 5 CHECK (review_sla_days BETWEEN 1 AND 15),
    max_revisions            smallint NOT NULL DEFAULT 2 CHECK (max_revisions BETWEEN 0 AND 5),
    revision_extra_days      smallint NOT NULL DEFAULT 3 CHECK (revision_extra_days BETWEEN 1 AND 14),
    recommendation_threshold smallint NOT NULL DEFAULT 80 CHECK (recommendation_threshold BETWEEN 50 AND 100),
    passing_score_ai         smallint NOT NULL DEFAULT 60 CHECK (passing_score_ai BETWEEN 1 AND 100),
    passing_score_b2b        smallint NOT NULL DEFAULT 70 CHECK (passing_score_b2b BETWEEN 1 AND 100),
    b2b_start_window_days    smallint NOT NULL DEFAULT 30 CHECK (b2b_start_window_days BETWEEN 7 AND 180),
    payment_window_hours     smallint NOT NULL DEFAULT 24 CHECK (payment_window_hours BETWEEN 1 AND 72),
    whatsapp_number          text NOT NULL DEFAULT '6281234567890' CHECK (whatsapp_number ~ '^62[0-9]{8,13}$'),
    updated_at               timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO platform_settings DEFAULT VALUES;

-- Riwayat perubahan pengaturan platform (siapa, kapan, serta daftar perubahan nilai lama -> baru).
CREATE TABLE platform_settings_logs (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id   uuid NOT NULL REFERENCES users (id),
    changes    jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(changes) = 'array'),
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE platform_settings_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX platform_settings_logs_created_at_idx ON platform_settings_logs (created_at DESC);

-- rollback

DROP TABLE platform_settings_logs;
DROP TABLE platform_settings;
ALTER TABLE fields DROP COLUMN is_active;
ALTER TABLE enrollments DROP COLUMN profile_shared_at;
