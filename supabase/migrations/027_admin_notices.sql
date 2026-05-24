-- ============================================================
-- Migration 027: Admin Notices Table
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_notices (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id         UUID        NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  notice_type     TEXT        NOT NULL DEFAULT 'notice'
                              CHECK (notice_type IN ('notice', 'meeting')),
  publish_at      TIMESTAMPTZ,        -- NULL = published immediately; future = scheduled
  is_published    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by      UUID        NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notices_mess_id     ON admin_notices(mess_id);
CREATE INDEX IF NOT EXISTS idx_admin_notices_publish_at  ON admin_notices(mess_id, publish_at);

ALTER TABLE admin_notices ENABLE ROW LEVEL SECURITY;

-- Active members can read published+active notices for their mess
CREATE POLICY "admin_notices_select"
  ON admin_notices FOR SELECT
  USING (
    mess_id IN (
      SELECT mess_id FROM mess_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND is_published = TRUE
  );

-- Owner, admin, manager can insert
CREATE POLICY "admin_notices_insert"
  ON admin_notices FOR INSERT
  WITH CHECK (
    mess_id IN (
      SELECT mess_id FROM mess_members
      WHERE user_id = auth.uid()
        AND status  = 'active'
        AND role    IN ('owner', 'admin', 'manager')
    )
    AND created_by = auth.uid()
  );

-- Owner, admin, manager can update their own notices
CREATE POLICY "admin_notices_update"
  ON admin_notices FOR UPDATE
  USING (
    created_by = auth.uid()
    AND mess_id IN (
      SELECT mess_id FROM mess_members
      WHERE user_id = auth.uid()
        AND status  = 'active'
        AND role    IN ('owner', 'admin', 'manager')
    )
  );

-- Owner, admin, manager can delete notices in their mess
CREATE POLICY "admin_notices_delete"
  ON admin_notices FOR DELETE
  USING (
    mess_id IN (
      SELECT mess_id FROM mess_members
      WHERE user_id = auth.uid()
        AND status  = 'active'
        AND role    IN ('owner', 'admin', 'manager')
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_notices_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER admin_notices_updated_at
  BEFORE UPDATE ON admin_notices
  FOR EACH ROW EXECUTE FUNCTION update_admin_notices_updated_at();
