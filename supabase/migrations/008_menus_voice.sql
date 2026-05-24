-- ============================================================
-- Migration 008: Weekly Menus + Voice Announcements
-- ============================================================

-- ── Weekly menus table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menus (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id     UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  day         TEXT NOT NULL CHECK (day IN ('sunday','monday','tuesday','wednesday','thursday','friday','saturday')),
  meal        TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  items       TEXT NOT NULL,
  note        TEXT,
  is_special  BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES profiles(id),
  updated_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menus_mess ON menus(mess_id);
CREATE INDEX IF NOT EXISTS idx_menus_mess_day ON menus(mess_id, day);

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menus_select" ON menus FOR SELECT
  USING (mess_id IN (SELECT mess_id FROM mess_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "menus_insert" ON menus FOR INSERT
  WITH CHECK (mess_id IN (
    SELECT mess_id FROM mess_members
    WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner','admin','manager')
  ));

CREATE POLICY "menus_update" ON menus FOR UPDATE
  USING (mess_id IN (
    SELECT mess_id FROM mess_members
    WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner','admin','manager')
  ));

CREATE POLICY "menus_delete" ON menus FOR DELETE
  USING (mess_id IN (
    SELECT mess_id FROM mess_members
    WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner','admin','manager')
  ));

-- ── Voice announcements column on messages ────────────────────
-- Add audio_url to mess_messages for voice announcements
ALTER TABLE mess_messages ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- ── Triggers ──────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
