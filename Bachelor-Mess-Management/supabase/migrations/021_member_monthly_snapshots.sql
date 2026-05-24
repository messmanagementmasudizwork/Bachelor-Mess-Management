-- ============================================================
-- Member Monthly Snapshots
-- প্রতিটি সদস্যের মাসিক রিপোর্টের স্ন্যাপশট সংরক্ষণ করে
-- ============================================================

CREATE TABLE IF NOT EXISTS member_monthly_snapshots (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id           UUID        NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  member_id         UUID        NOT NULL REFERENCES mess_members(id) ON DELETE CASCADE,
  month             VARCHAR(7)  NOT NULL,   -- format: 'YYYY-MM'

  -- Meal breakdown
  total_meals       INTEGER     NOT NULL DEFAULT 0,
  total_breakfast   INTEGER     NOT NULL DEFAULT 0,
  total_lunch       INTEGER     NOT NULL DEFAULT 0,
  total_dinner      INTEGER     NOT NULL DEFAULT 0,
  total_guest_meals INTEGER     NOT NULL DEFAULT 0,

  -- Financial
  meal_rate         NUMERIC(10,2) NOT NULL DEFAULT 0,
  meal_cost         NUMERIC(10,2) NOT NULL DEFAULT 0,
  fixed_share       NUMERIC(10,2) NOT NULL DEFAULT 0,
  guest_charges     NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_deposited   NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance           NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            VARCHAR(10)   NOT NULL DEFAULT 'clear', -- advance | due | clear

  -- Metadata
  is_final          BOOLEAN     NOT NULL DEFAULT FALSE,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(mess_id, member_id, month)
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE member_monthly_snapshots ENABLE ROW LEVEL SECURITY;

-- নিজের snapshot দেখতে পারবে
CREATE POLICY "snapshots_own_select" ON member_monthly_snapshots
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM mess_members
      WHERE user_id = auth.uid() AND mess_id = member_monthly_snapshots.mess_id
    )
  );

-- Admin / manager / owner সব সদস্যের snapshot দেখতে পারবে
CREATE POLICY "snapshots_admin_select" ON member_monthly_snapshots
  FOR SELECT USING (
    mess_id IN (
      SELECT mess_id FROM mess_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager', 'assistant_manager')
    )
  );

-- যে কোনো সদস্য নিজের snapshot save করতে পারবে
CREATE POLICY "snapshots_own_insert" ON member_monthly_snapshots
  FOR INSERT WITH CHECK (
    member_id IN (
      SELECT id FROM mess_members
      WHERE user_id = auth.uid() AND mess_id = member_monthly_snapshots.mess_id
    )
  );

CREATE POLICY "snapshots_own_update" ON member_monthly_snapshots
  FOR UPDATE USING (
    member_id IN (
      SELECT id FROM mess_members
      WHERE user_id = auth.uid() AND mess_id = member_monthly_snapshots.mess_id
    )
  );

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_snapshots_member_month
  ON member_monthly_snapshots(member_id, month DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_mess_month
  ON member_monthly_snapshots(mess_id, month DESC);
