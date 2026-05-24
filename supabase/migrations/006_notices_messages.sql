-- ============================================================
-- NOTICE BOARD & GROUP CHAT
-- Migration: 006_notices_messages.sql
-- ============================================================

-- ============================================================
-- notices table
-- ============================================================
CREATE TABLE IF NOT EXISTS notices (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id     UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  is_pinned   BOOLEAN NOT NULL DEFAULT false,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notices_mess_id    ON notices(mess_id);
CREATE INDEX idx_notices_is_pinned  ON notices(is_pinned);
CREATE INDEX idx_notices_created_by ON notices(created_by);

CREATE TRIGGER set_notices_updated_at
  BEFORE UPDATE ON notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notices_select" ON notices
  FOR SELECT USING (is_mess_member(mess_id, auth.uid()));

CREATE POLICY "notices_insert" ON notices
  FOR INSERT WITH CHECK (
    is_mess_admin(mess_id, auth.uid()) OR is_mess_manager(mess_id, auth.uid())
  );

CREATE POLICY "notices_update" ON notices
  FOR UPDATE USING (
    created_by = auth.uid() OR is_mess_admin(mess_id, auth.uid())
  );

CREATE POLICY "notices_delete" ON notices
  FOR DELETE USING (
    created_by = auth.uid() OR is_mess_admin(mess_id, auth.uid())
  );

-- ============================================================
-- messages table (group chat)
-- ============================================================
CREATE TYPE message_type AS ENUM ('text', 'announcement', 'event');

CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id      UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  reply_to     UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_mess_id   ON messages(mess_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (is_mess_member(mess_id, auth.uid()));

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND is_mess_member(mess_id, auth.uid())
  );

CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (
    sender_id = auth.uid() OR is_mess_admin(mess_id, auth.uid())
  );

-- ============================================================
-- events table
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id     UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  event_date  TIMESTAMPTZ NOT NULL,
  location    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_mess_id   ON events(mess_id);
CREATE INDEX idx_events_event_date ON events(event_date);

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select" ON events
  FOR SELECT USING (is_mess_member(mess_id, auth.uid()));

CREATE POLICY "events_insert" ON events
  FOR INSERT WITH CHECK (
    is_mess_admin(mess_id, auth.uid()) OR is_mess_manager(mess_id, auth.uid())
  );

CREATE POLICY "events_update" ON events
  FOR UPDATE USING (
    created_by = auth.uid() OR is_mess_admin(mess_id, auth.uid())
  );

CREATE POLICY "events_delete" ON events
  FOR DELETE USING (
    created_by = auth.uid() OR is_mess_admin(mess_id, auth.uid())
  );
