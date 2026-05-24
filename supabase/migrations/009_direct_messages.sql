-- ============================================================
-- DIRECT MESSAGES (Manager ↔ Member DM)
-- Migration: 009_direct_messages.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS direct_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id       UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT NOT NULL CHECK (char_length(content) >= 1),
  is_read       BOOLEAN NOT NULL DEFAULT false,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dm_mess_id        ON direct_messages(mess_id);
CREATE INDEX idx_dm_sender         ON direct_messages(sender_id);
CREATE INDEX idx_dm_recipient      ON direct_messages(recipient_id);
CREATE INDEX idx_dm_created_at     ON direct_messages(created_at DESC);
CREATE INDEX idx_dm_conversation   ON direct_messages(mess_id, sender_id, recipient_id);

-- RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Members can read their own messages (sent or received within same mess)
CREATE POLICY "dm_select_own"
  ON direct_messages FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
  );

-- Members can send DMs within their mess
CREATE POLICY "dm_insert_member"
  ON direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM mess_members
      WHERE mess_id = direct_messages.mess_id
        AND user_id = auth.uid()
        AND status != 'removed'
    )
  );

-- Recipient can mark as read
CREATE POLICY "dm_update_read"
  ON direct_messages FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Sender can delete their own messages
CREATE POLICY "dm_delete_own"
  ON direct_messages FOR DELETE
  USING (auth.uid() = sender_id);
