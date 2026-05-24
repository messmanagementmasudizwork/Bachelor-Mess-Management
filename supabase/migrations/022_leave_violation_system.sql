-- ============================================================
-- LEAVE VIOLATION & ACCOUNT STATUS SYSTEM
-- Migration: 022_leave_violation_system.sql
-- ============================================================

-- ── 1. Add columns to mess_members ───────────────────────────
ALTER TABLE mess_members
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active'
    CONSTRAINT chk_account_status CHECK (account_status IN ('active','frozen','banned','closed')),
  ADD COLUMN IF NOT EXISTS open_leave_started  DATE,
  ADD COLUMN IF NOT EXISTS leave_violation_since DATE;

-- ── 2. reactivation_requests table ──────────────────────────
CREATE TABLE IF NOT EXISTS reactivation_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id         UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES mess_members(id) ON DELETE CASCADE,
  proof_text      TEXT,
  proof_file_url  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT chk_reactivation_status CHECK (status IN ('pending','approved','rejected')),
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  reviewer_notes  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reactivation_mess    ON reactivation_requests(mess_id);
CREATE INDEX IF NOT EXISTS idx_reactivation_member  ON reactivation_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_reactivation_status  ON reactivation_requests(status);

-- ── 3. RLS ───────────────────────────────────────────────────
ALTER TABLE reactivation_requests ENABLE ROW LEVEL SECURITY;

-- Member sees their own requests
CREATE POLICY "reactivation_select_own" ON reactivation_requests
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM mess_members WHERE user_id = auth.uid()
    )
  );

-- Owner / admin / manager see all requests for their mess
CREATE POLICY "reactivation_select_admin" ON reactivation_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mess_members mm
      WHERE mm.mess_id = reactivation_requests.mess_id
        AND mm.user_id = auth.uid()
        AND mm.role IN ('owner','admin','manager')
    )
  );

-- Member submits their own request
CREATE POLICY "reactivation_insert" ON reactivation_requests
  FOR INSERT WITH CHECK (
    member_id IN (
      SELECT id FROM mess_members WHERE user_id = auth.uid()
    )
  );

-- Owner / admin / manager review (update status)
CREATE POLICY "reactivation_update_admin" ON reactivation_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM mess_members mm
      WHERE mm.mess_id = reactivation_requests.mess_id
        AND mm.user_id = auth.uid()
        AND mm.role IN ('owner','admin','manager')
    )
  );

-- ── 4. mess_members RLS for account_status updates ──────────
-- Allow owner/admin/manager to update account_status
-- (closed → anything is blocked at application layer)
CREATE POLICY "members_update_account_status" ON mess_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM mess_members mm
      WHERE mm.mess_id = mess_members.mess_id
        AND mm.user_id = auth.uid()
        AND mm.role IN ('owner','admin','manager')
    )
  );

-- Allow member to update own open_leave_started / leave_violation_since
CREATE POLICY "members_update_own_leave_fields" ON mess_members
  FOR UPDATE USING (user_id = auth.uid());

-- ── 5. Storage bucket for reactivation proof files ───────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reactivation-proofs',
  'reactivation-proofs',
  false,
  20971520,
  ARRAY['image/jpeg','image/png','image/webp','image/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "proof_upload_member" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reactivation-proofs' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "proof_read_member" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reactivation-proofs' AND
    auth.uid() IS NOT NULL
  );

-- updated_at trigger
CREATE OR REPLACE TRIGGER reactivation_requests_updated_at
  BEFORE UPDATE ON reactivation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
