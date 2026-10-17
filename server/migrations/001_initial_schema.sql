-- +migrate Up

-- ============================================================================
-- Pengguna dan sesi
-- ============================================================================

CREATE TABLE fields (
    key         text PRIMARY KEY,
    label       text NOT NULL,
    description text NOT NULL,
    sort_order  smallint NOT NULL UNIQUE
);
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;

INSERT INTO fields (key, label, description, sort_order) VALUES
    ('backend', 'Back-End', 'API, database, performa sistem', 1),
    ('frontend', 'Front-End', 'Antarmuka web, aksesibilitas', 2),
    ('mobile', 'Mobile', 'Aplikasi Android & iOS', 3),
    ('data', 'Data', 'SQL, dashboard, insight bisnis', 4),
    ('uiux', 'UI/UX Design', 'Riset pengguna, alur, prototipe', 5),
    ('product', 'Product', 'Prioritas fitur, PRD, metrik', 6),
    ('marketing', 'Marketing', 'Kampanye, kanal, KPI', 7),
    ('finance', 'Keuangan', 'Laporan, anggaran, proyeksi', 8),
    ('accounting', 'Akuntansi', 'Pencatatan, audit, pajak', 9),
    ('hr', 'Human Resources', 'Rekrutmen, kebijakan, engagement', 10),
    ('supply-chain', 'Supply Chain', 'Inventori, distribusi, vendor', 11),
    ('legal', 'Legal', 'Kontrak, kepatuhan, regulasi', 12);

CREATE TABLE users (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name           text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
    email          text NOT NULL UNIQUE CHECK (email = lower(email)),
    password_hash  text,
    google_sub     text UNIQUE,
    role           text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'reviewer', 'admin')),
    is_active      boolean NOT NULL DEFAULT true,
    is_onboarded   boolean NOT NULL DEFAULT false,
    student_status text CHECK (student_status IN ('final_year', 'fresh_graduate')),
    major          text,
    institution    text,
    linkedin_url   text,
    share_default  text NOT NULL DEFAULT 'ask' CHECK (share_default IN ('ask', 'always', 'never')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_has_login_method CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL)
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE TABLE user_fields (
    user_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    field_key text NOT NULL REFERENCES fields (key),
    position  smallint NOT NULL CHECK (position >= 1),
    PRIMARY KEY (user_id, field_key),
    UNIQUE (user_id, position)
);
ALTER TABLE user_fields ENABLE ROW LEVEL SECURITY;

CREATE TABLE refresh_tokens (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    family_id      uuid NOT NULL,
    token_hash     text NOT NULL UNIQUE,
    expires_at     timestamptz NOT NULL,
    revoked_at     timestamptz,
    replaced_by_id uuid REFERENCES refresh_tokens (id) ON DELETE SET NULL,
    user_agent     text NOT NULL DEFAULT '',
    ip_address     text NOT NULL DEFAULT '',
    created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_id_idx ON refresh_tokens (family_id);

-- ============================================================================
-- Berkas di Cloudflare R2
-- ============================================================================

CREATE TABLE files (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by  uuid NOT NULL REFERENCES users (id),
    purpose      text NOT NULL CHECK (purpose IN ('submission', 'material', 'partner_logo')),
    object_key   text NOT NULL UNIQUE,
    file_name    text NOT NULL,
    content_type text NOT NULL,
    size_bytes   bigint NOT NULL CHECK (size_bytes > 0),
    status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'attached')),
    created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE INDEX files_uploaded_by_idx ON files (uploaded_by, created_at DESC);
CREATE INDEX files_pending_created_at_idx ON files (created_at) WHERE status = 'pending';

-- ============================================================================
-- Case (dibuat admin)
-- ============================================================================

CREATE TABLE partners (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name         text NOT NULL UNIQUE,
    industry     text NOT NULL DEFAULT '',
    about        text NOT NULL DEFAULT '',
    logo_file_id uuid REFERENCES files (id),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE TABLE cases (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    tier           text NOT NULL CHECK (tier IN ('ai', 'b2b')),
    status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    title          text NOT NULL,
    summary        text NOT NULL DEFAULT '',
    field_key      text NOT NULL REFERENCES fields (key),
    level          text NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    duration_label text NOT NULL DEFAULT '',
    about          text NOT NULL DEFAULT '',
    activities     jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(activities) = 'array'),
    skills         jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(skills) = 'array'),
    prerequisites  jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(prerequisites) = 'array'),
    context        jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(context) = 'array'),
    passing_score  smallint NOT NULL CHECK (passing_score BETWEEN 0 AND 100),
    price          integer CHECK (price > 0),
    deadline_days  smallint CHECK (deadline_days > 0),
    partner_id     uuid REFERENCES partners (id),
    reviewer_role  text,
    created_by     uuid REFERENCES users (id),
    published_at   timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT cases_ai_has_no_commercial CHECK (
        tier = 'b2b' OR (price IS NULL AND partner_id IS NULL AND deadline_days IS NULL AND reviewer_role IS NULL)
    )
);
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
CREATE INDEX cases_catalog_idx ON cases (status, tier, field_key);

CREATE TABLE case_tasks (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    position    smallint NOT NULL CHECK (position >= 1),
    title       text NOT NULL,
    description text NOT NULL DEFAULT '',
    UNIQUE (case_id, position)
);
ALTER TABLE case_tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE case_materials (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    position    smallint NOT NULL CHECK (position >= 1),
    name        text NOT NULL,
    description text NOT NULL DEFAULT '',
    file_id     uuid NOT NULL REFERENCES files (id),
    UNIQUE (case_id, position)
);
ALTER TABLE case_materials ENABLE ROW LEVEL SECURITY;

CREATE TABLE case_slots (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    slot_key    text NOT NULL CHECK (slot_key ~ '^[a-z][a-z0-9_]*$'),
    position    smallint NOT NULL CHECK (position >= 1),
    title       text NOT NULL,
    description text NOT NULL DEFAULT '',
    kind        text NOT NULL CHECK (kind IN ('text', 'file', 'link', 'code')),
    is_required boolean NOT NULL DEFAULT true,
    formats     jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(formats) = 'array'),
    max_size_mb integer CHECK (max_size_mb > 0),
    link_hint   text NOT NULL DEFAULT '',
    min_length  integer CHECK (min_length >= 0),
    max_length  integer CHECK (max_length > 0),
    UNIQUE (case_id, slot_key),
    UNIQUE (case_id, position),
    CONSTRAINT case_slots_length_range CHECK (min_length IS NULL OR max_length IS NULL OR min_length <= max_length)
);
ALTER TABLE case_slots ENABLE ROW LEVEL SECURITY;

CREATE TABLE rubric_criteria (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id            uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    position           smallint NOT NULL CHECK (position >= 1),
    name               text NOT NULL,
    weight             smallint NOT NULL CHECK (weight BETWEEN 1 AND 100),
    description        text NOT NULL DEFAULT '',
    level_descriptions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
        jsonb_typeof(level_descriptions) = 'array' AND jsonb_array_length(level_descriptions) IN (0, 5)
    ),
    UNIQUE (case_id, position)
);
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;

CREATE TABLE reviewer_assignments (
    case_id     uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    reviewer_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (case_id, reviewer_id)
);
ALTER TABLE reviewer_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX reviewer_assignments_reviewer_id_idx ON reviewer_assignments (reviewer_id);

-- ============================================================================
-- Pengerjaan dan penilaian
-- ============================================================================

CREATE TABLE enrollments (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL REFERENCES users (id),
    case_id          uuid NOT NULL REFERENCES cases (id),
    status           text NOT NULL CHECK (status IN (
        'pending_payment', 'not_started', 'in_progress', 'ai_grading',
        'in_review', 'revision_requested', 'passed', 'failed'
    )),
    candidate_number integer NOT NULL CHECK (candidate_number BETWEEN 1000 AND 999999),
    deadline_at      timestamptz,
    started_at       timestamptz,
    review_due_at    timestamptz,
    last_retried_at  timestamptz,
    score            smallint CHECK (score BETWEEN 0 AND 100),
    revision_count   smallint NOT NULL DEFAULT 0 CHECK (revision_count >= 0),
    retry_count      smallint NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    share_consent    text CHECK (share_consent IN ('pending', 'granted', 'declined')),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, case_id),
    UNIQUE (case_id, candidate_number)
);
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE INDEX enrollments_user_id_updated_at_idx ON enrollments (user_id, updated_at DESC);
CREATE INDEX enrollments_case_id_status_idx ON enrollments (case_id, status);
CREATE INDEX enrollments_review_queue_idx ON enrollments (review_due_at) WHERE status = 'in_review';
CREATE INDEX enrollments_deadline_idx ON enrollments (deadline_at)
    WHERE status IN ('pending_payment', 'not_started', 'in_progress', 'revision_requested');

-- Satu baris = satu attempt, dari draft sampai diputuskan.
CREATE TABLE submissions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id  uuid NOT NULL REFERENCES enrollments (id) ON DELETE CASCADE,
    attempt        smallint NOT NULL CHECK (attempt >= 1),
    status         text NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'revision_requested', 'reviewed'
    )),
    slot_values    jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(slot_values) = 'object'),
    note           text NOT NULL DEFAULT '',
    is_link_public boolean NOT NULL DEFAULT false,
    is_own_work    boolean NOT NULL DEFAULT false,
    saved_at       timestamptz NOT NULL DEFAULT now(),
    submitted_at   timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (enrollment_id, attempt),
    CONSTRAINT submissions_sent_is_complete CHECK (
        status = 'draft' OR (submitted_at IS NOT NULL AND is_own_work)
    )
);
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX submissions_one_draft_idx ON submissions (enrollment_id) WHERE status = 'draft';
CREATE UNIQUE INDEX submissions_one_pending_idx ON submissions (enrollment_id) WHERE status = 'submitted';

-- Keputusan reviewer mengembalikan satu submission (belum dinilai).
CREATE TABLE revision_requests (
    submission_id uuid PRIMARY KEY REFERENCES submissions (id) ON DELETE CASCADE,
    reviewer_id   uuid NOT NULL REFERENCES users (id),
    reason        text NOT NULL,
    note          text NOT NULL DEFAULT '',
    created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE revision_requests ENABLE ROW LEVEL SECURITY;

-- Isian form reviewer yang tersimpan otomatis; dihapus saat keputusan dikirim.
CREATE TABLE review_drafts (
    submission_id uuid PRIMARY KEY REFERENCES submissions (id) ON DELETE CASCADE,
    reviewer_id   uuid NOT NULL REFERENCES users (id),
    decision      text NOT NULL CHECK (decision IN ('grade', 'revision')),
    grade         jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(grade) = 'object'),
    revision      jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(revision) = 'object'),
    saved_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE review_drafts ENABLE ROW LEVEL SECURITY;

-- Hasil penilaian final (AI atau reviewer manusia); selalu lengkap.
CREATE TABLE reviews (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id  uuid NOT NULL UNIQUE REFERENCES submissions (id) ON DELETE CASCADE,
    reviewer_type  text NOT NULL CHECK (reviewer_type IN ('ai', 'human')),
    reviewer_id    uuid REFERENCES users (id),
    reviewer_role  text NOT NULL,
    total_score    smallint NOT NULL CHECK (total_score BETWEEN 0 AND 100),
    passing_score  smallint NOT NULL CHECK (passing_score BETWEEN 0 AND 100),
    is_passed      boolean NOT NULL,
    strengths      jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(strengths) = 'array'),
    improvements   jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(improvements) = 'array'),
    next_steps     jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(next_steps) = 'array'),
    is_recommended boolean NOT NULL DEFAULT false,
    reviewed_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reviews_reviewer_matches_type CHECK (
        (reviewer_type = 'ai' AND reviewer_id IS NULL) OR (reviewer_type = 'human' AND reviewer_id IS NOT NULL)
    ),
    CONSTRAINT reviews_recommend_only_passed CHECK (NOT is_recommended OR is_passed)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX reviews_reviewer_id_idx ON reviews (reviewer_id, reviewed_at DESC) WHERE reviewer_id IS NOT NULL;

CREATE TABLE review_criterion_scores (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL REFERENCES reviews (id) ON DELETE CASCADE,
    position  smallint NOT NULL CHECK (position >= 1),
    name      text NOT NULL,
    weight    smallint NOT NULL CHECK (weight BETWEEN 1 AND 100),
    level     smallint NOT NULL CHECK (level BETWEEN 1 AND 5),
    reason    text NOT NULL,
    UNIQUE (review_id, position)
);
ALTER TABLE review_criterion_scores ENABLE ROW LEVEL SECURITY;

CREATE TABLE ai_grading_runs (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id     uuid NOT NULL UNIQUE REFERENCES submissions (id) ON DELETE CASCADE,
    status            text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
    model             text NOT NULL,
    started_at        timestamptz NOT NULL DEFAULT now(),
    estimated_done_at timestamptz NOT NULL,
    completed_at      timestamptz,
    error_message     text NOT NULL DEFAULT ''
);
ALTER TABLE ai_grading_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE ai_grading_criteria (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id             uuid NOT NULL REFERENCES ai_grading_runs (id) ON DELETE CASCADE,
    criterion_position smallint NOT NULL CHECK (criterion_position >= 1),
    status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
    level              smallint CHECK (level BETWEEN 1 AND 5),
    reason             text NOT NULL DEFAULT '',
    attempts           smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    input_tokens       integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens      integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    completed_at       timestamptz,
    UNIQUE (run_id, criterion_position),
    CONSTRAINT ai_grading_criteria_done_has_result CHECK (status <> 'done' OR (level IS NOT NULL AND reason <> ''))
);
ALTER TABLE ai_grading_criteria ENABLE ROW LEVEL SECURITY;

CREATE TABLE certificates (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id      text NOT NULL UNIQUE CHECK (public_id ~ '^[A-Z0-9-]{8,32}$'),
    enrollment_id  uuid NOT NULL UNIQUE REFERENCES enrollments (id),
    user_id        uuid NOT NULL REFERENCES users (id),
    case_id        uuid NOT NULL REFERENCES cases (id),
    tier           text NOT NULL CHECK (tier IN ('ai', 'b2b')),
    recipient_name text NOT NULL,
    case_title     text NOT NULL,
    field_key      text NOT NULL REFERENCES fields (key),
    partner_name   text,
    score          smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
    issued_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE INDEX certificates_user_id_idx ON certificates (user_id, issued_at DESC);

CREATE TABLE case_ratings (
    enrollment_id uuid PRIMARY KEY REFERENCES enrollments (id) ON DELETE CASCADE,
    case_id       uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    rating        smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       text NOT NULL DEFAULT '',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE case_ratings ENABLE ROW LEVEL SECURITY;
CREATE INDEX case_ratings_case_id_idx ON case_ratings (case_id);

-- ============================================================================
-- Pembayaran
-- ============================================================================

-- Nomor urut invoice; format INV/YYYY/MM/NNNN disusun aplikasi.
CREATE SEQUENCE invoice_number_seq;

CREATE TABLE orders (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number         text NOT NULL UNIQUE,
    user_id                uuid NOT NULL REFERENCES users (id),
    case_id                uuid NOT NULL REFERENCES cases (id),
    enrollment_id          uuid REFERENCES enrollments (id) ON DELETE SET NULL,
    method                 text NOT NULL CHECK (method IN ('va_bca', 'va_mandiri', 'va_bni', 'qris', 'gopay')),
    status                 text NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN (
        'awaiting_payment', 'paid', 'failed', 'expired', 'cancelled'
    )),
    subtotal               integer NOT NULL CHECK (subtotal > 0),
    admin_fee              integer NOT NULL DEFAULT 0 CHECK (admin_fee >= 0),
    total                  integer NOT NULL,
    expires_at             timestamptz NOT NULL,
    paid_at                timestamptz,
    gateway_transaction_id text UNIQUE,
    gateway_status         text NOT NULL DEFAULT '',
    -- Instruksi bayar dari Midtrans, bentuknya berbeda per metode:
    -- VA {vaNumber}, Mandiri {billerCode, billKey}, QRIS {qrUrl}, GoPay {deeplinkUrl, qrUrl}.
    payment_details        jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payment_details) = 'object'),
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT orders_total_matches CHECK (total = subtotal + admin_fee),
    CONSTRAINT orders_paid_has_time CHECK (status <> 'paid' OR paid_at IS NOT NULL)
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX orders_user_id_case_id_idx ON orders (user_id, case_id, created_at DESC);
CREATE UNIQUE INDEX orders_one_awaiting_per_case_idx ON orders (user_id, case_id) WHERE status = 'awaiting_payment';

CREATE TABLE payment_notifications (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id           uuid REFERENCES orders (id) ON DELETE SET NULL,
    gateway_order_id   text NOT NULL,
    transaction_status text NOT NULL,
    status_code        text NOT NULL,
    gross_amount       text NOT NULL,
    is_signature_valid boolean NOT NULL,
    payload            jsonb NOT NULL,
    received_at        timestamptz NOT NULL DEFAULT now(),
    processed_at       timestamptz
);
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX payment_notifications_gateway_order_id_idx ON payment_notifications (gateway_order_id, received_at);

-- rollback

DROP TABLE payment_notifications;
DROP TABLE orders;
DROP SEQUENCE invoice_number_seq;
DROP TABLE case_ratings;
DROP TABLE certificates;
DROP TABLE ai_grading_criteria;
DROP TABLE ai_grading_runs;
DROP TABLE review_criterion_scores;
DROP TABLE reviews;
DROP TABLE review_drafts;
DROP TABLE revision_requests;
DROP TABLE submissions;
DROP TABLE enrollments;
DROP TABLE reviewer_assignments;
DROP TABLE rubric_criteria;
DROP TABLE case_slots;
DROP TABLE case_materials;
DROP TABLE case_tasks;
DROP TABLE cases;
DROP TABLE partners;
DROP TABLE files;
DROP TABLE refresh_tokens;
DROP TABLE user_fields;
DROP TABLE users;
DROP TABLE fields;
