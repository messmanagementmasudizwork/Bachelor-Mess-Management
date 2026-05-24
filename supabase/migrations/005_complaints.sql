-- ============================================================
-- COMPLAINT & MAINTENANCE SYSTEM
-- Migration: 005_complaints.sql
-- ============================================================

CREATE TYPE complaint_category AS ENUM ('food', 'cleaning', 'maintenance', 'member', 'billing', 'other');
CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'rejected');

CREATE TABLE IF NOT EXISTS complaints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id         UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  submitted_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  category        complaint_category NOT NULL DEFAULT 'other',
  priority        complaint_priority NOT NULL DEFAULT 'medium',
  status          complaint_status NOT NULL DEFAULT 'open',
  resolution_note TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaints_mess_id      ON complaints(mess_id);
CREATE INDEX idx_complaints_submitted_by ON complaints(submitted_by);
CREATE INDEX idx_complaints_status       ON complaints(status);
CREATE INDEX idx_complaints_priority     ON complaints(priority);
CREATE INDEX idx_complaints_category     ON complaints(category);

CREATE TRIGGER set_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Members can see complaints in their mess
CREATE POLICY "complaints_select" ON complaints
  FOR SELECT USING (is_mess_member(mess_id, auth.uid()));

-- Any member can submit a complaint
CREATE POLICY "complaints_insert" ON complaints
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid() AND is_mess_member(mess_id, auth.uid())
  );

-- Submitter can update their own open complaint; admin can update any
CREATE POLICY "complaints_update" ON complaints
  FOR UPDATE USING (
    submitted_by = auth.uid() OR is_mess_admin(mess_id, auth.uid()) OR is_mess_manager(mess_id, auth.uid())
  );

-- Admin can delete
CREATE POLICY "complaints_delete" ON complaints
  FOR DELETE USING (is_mess_admin(mess_id, auth.uid()));
