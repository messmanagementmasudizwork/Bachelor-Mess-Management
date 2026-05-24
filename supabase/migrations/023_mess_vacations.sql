-- Migration 023: Mess Vacation / Full Closure System
-- Allows mess owner/admin/manager to declare vacation periods (Eid, Puja, etc.)

CREATE TABLE IF NOT EXISTS mess_vacations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id     UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_mess_vacations_mess_id   ON mess_vacations(mess_id);
CREATE INDEX IF NOT EXISTS idx_mess_vacations_dates     ON mess_vacations(mess_id, start_date, end_date);

ALTER TABLE mess_vacations ENABLE ROW LEVEL SECURITY;

-- All mess members can read vacations
CREATE POLICY "mess_members_read_vacations"
  ON mess_vacations FOR SELECT
  USING (is_mess_member(mess_id, auth.uid()));

-- Owner / admin / manager can insert
CREATE POLICY "mess_managers_insert_vacations"
  ON mess_vacations FOR INSERT
  WITH CHECK (is_mess_manager(mess_id, auth.uid()));

-- Owner / admin / manager can delete
CREATE POLICY "mess_managers_delete_vacations"
  ON mess_vacations FOR DELETE
  USING (is_mess_manager(mess_id, auth.uid()));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_mess_vacations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mess_vacations_updated_at
  BEFORE UPDATE ON mess_vacations
  FOR EACH ROW EXECUTE FUNCTION update_mess_vacations_updated_at();
