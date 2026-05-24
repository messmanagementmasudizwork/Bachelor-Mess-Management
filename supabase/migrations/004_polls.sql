-- ============================================================
-- POLLS & VOTING SYSTEM
-- Migration: 004_polls.sql
-- ============================================================

-- Poll type enum
CREATE TYPE poll_type AS ENUM ('menu_vote', 'manager_selection', 'rule_change', 'general');

-- Poll status enum
CREATE TYPE poll_status AS ENUM ('active', 'closed');

-- ============================================================
-- polls table
-- ============================================================
CREATE TABLE IF NOT EXISTS polls (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id         UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  poll_type       poll_type NOT NULL DEFAULT 'general',
  is_anonymous    BOOLEAN NOT NULL DEFAULT false,
  options         JSONB NOT NULL DEFAULT '[]',
  closes_at       TIMESTAMPTZ,
  status          poll_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- poll_votes table
-- ============================================================
CREATE TABLE IF NOT EXISTS poll_votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  mess_id     UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poll_id, voter_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_polls_mess_id       ON polls(mess_id);
CREATE INDEX idx_polls_status        ON polls(status);
CREATE INDEX idx_polls_created_by    ON polls(created_by);
CREATE INDEX idx_poll_votes_poll_id  ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_voter_id ON poll_votes(voter_id);
CREATE INDEX idx_poll_votes_mess_id  ON poll_votes(mess_id);

-- ============================================================
-- Auto-update updated_at
-- ============================================================
CREATE TRIGGER set_polls_updated_at
  BEFORE UPDATE ON polls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Auto-close expired polls (helper function)
-- ============================================================
CREATE OR REPLACE FUNCTION auto_close_expired_polls()
RETURNS void AS $$
  UPDATE polls
  SET status = 'closed', updated_at = NOW()
  WHERE status = 'active'
    AND closes_at IS NOT NULL
    AND closes_at < NOW();
$$ LANGUAGE SQL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- polls: mess members can read
CREATE POLICY "polls_select" ON polls
  FOR SELECT USING (is_mess_member(mess_id, auth.uid()));

-- polls: admin/manager can insert
CREATE POLICY "polls_insert" ON polls
  FOR INSERT WITH CHECK (
    is_mess_admin(mess_id, auth.uid()) OR is_mess_manager(mess_id, auth.uid())
  );

-- polls: creator or admin can update (close)
CREATE POLICY "polls_update" ON polls
  FOR UPDATE USING (
    created_by = auth.uid() OR is_mess_admin(mess_id, auth.uid())
  );

-- polls: admin can delete
CREATE POLICY "polls_delete" ON polls
  FOR DELETE USING (is_mess_admin(mess_id, auth.uid()));

-- poll_votes: members can read votes for their mess
CREATE POLICY "poll_votes_select" ON poll_votes
  FOR SELECT USING (is_mess_member(mess_id, auth.uid()));

-- poll_votes: active members can vote
CREATE POLICY "poll_votes_insert" ON poll_votes
  FOR INSERT WITH CHECK (
    voter_id = auth.uid() AND is_mess_member(mess_id, auth.uid())
  );

-- poll_votes: voter can change their vote
CREATE POLICY "poll_votes_delete" ON poll_votes
  FOR DELETE USING (voter_id = auth.uid());
