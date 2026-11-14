-- +migrate Up

-- Profil reviewer (CONTEXT.md 4.13): mitra asal dan jabatan. Reviewer hanya bisa ditugaskan ke
-- B2B case milik mitranya, dan jabatannya tampil ke peserta sebagai peran penilai.
CREATE TABLE reviewer_profiles (
    user_id    uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    partner_id uuid NOT NULL REFERENCES partners (id),
    job_title  text NOT NULL CHECK (length(btrim(job_title)) BETWEEN 2 AND 120),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reviewer_profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX reviewer_profiles_partner_id_idx ON reviewer_profiles (partner_id);

-- Akun yang dibuat admin memakai password sementara dan wajib menggantinya saat pertama masuk.
ALTER TABLE users ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;

-- Pengingat terakhir ke reviewer pemegang (maksimal sekali per 24 jam).
ALTER TABLE enrollments ADD COLUMN last_reminder_at timestamptz;

-- Tanda "bermasalah" dari admin untuk evaluasi prompt dan rubrik; tidak terlihat peserta.
CREATE TABLE review_flags (
    enrollment_id uuid PRIMARY KEY REFERENCES enrollments (id) ON DELETE CASCADE,
    note          text NOT NULL CHECK (length(btrim(note)) BETWEEN 10 AND 2000),
    flagged_by    uuid NOT NULL REFERENCES users (id),
    flagged_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE review_flags ENABLE ROW LEVEL SECURITY;

-- rollback

DROP TABLE review_flags;
ALTER TABLE enrollments DROP COLUMN last_reminder_at;
ALTER TABLE users DROP COLUMN must_change_password;
DROP TABLE reviewer_profiles;
