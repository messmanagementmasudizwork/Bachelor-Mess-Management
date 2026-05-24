-- ============================================================
-- 024: Dedicated mess_settings table
--      Moves all settings out of messes.settings (JSONB)
--      into a typed, constraint-enforced 1:1 table.
-- ============================================================

CREATE TABLE mess_settings (
  mess_id                    UUID PRIMARY KEY REFERENCES messes(id) ON DELETE CASCADE,

  -- Meal Cutoff (stored as "HH:MM" text to match HTML time input format)
  meal_cutoff_breakfast      TEXT NOT NULL DEFAULT '08:00'
                               CHECK (meal_cutoff_breakfast ~ '^\d{2}:\d{2}$'),
  meal_cutoff_lunch          TEXT NOT NULL DEFAULT '10:00'
                               CHECK (meal_cutoff_lunch ~ '^\d{2}:\d{2}$'),
  meal_cutoff_dinner         TEXT NOT NULL DEFAULT '16:00'
                               CHECK (meal_cutoff_dinner ~ '^\d{2}:\d{2}$'),
  cutoff_days_before         SMALLINT NOT NULL DEFAULT 0
                               CHECK (cutoff_days_before BETWEEN 0 AND 2),
  cutoff_advance_time        TEXT NOT NULL DEFAULT '22:00'
                               CHECK (cutoff_advance_time ~ '^\d{2}:\d{2}$'),

  -- Financial Rules
  min_deposit_amount         NUMERIC(10,2) NOT NULL DEFAULT 100
                               CHECK (min_deposit_amount >= 0),
  guest_meal_charge          NUMERIC(10,2) NOT NULL DEFAULT 0
                               CHECK (guest_meal_charge >= 0),
  late_meal_penalty          NUMERIC(10,2) NOT NULL DEFAULT 0
                               CHECK (late_meal_penalty >= 0),
  weekly_menu_budget         NUMERIC(10,2) NOT NULL DEFAULT 0
                               CHECK (weekly_menu_budget >= 0),

  -- Permissions
  allow_guest_meals          BOOLEAN NOT NULL DEFAULT true,
  require_expense_approval   BOOLEAN NOT NULL DEFAULT false,
  auto_manager_rotation      BOOLEAN NOT NULL DEFAULT false,
  manager_rotation_type      TEXT NOT NULL DEFAULT 'monthly'
                               CHECK (manager_rotation_type IN ('weekly','monthly','manual')),
  notifications_enabled      BOOLEAN NOT NULL DEFAULT true,

  -- Leave Rules
  max_meal_leave_days        SMALLINT NOT NULL DEFAULT 90
                               CHECK (max_meal_leave_days BETWEEN 7 AND 90),
  allow_open_leave_presets   BOOLEAN NOT NULL DEFAULT true,

  -- System
  currency                   TEXT NOT NULL DEFAULT 'BDT',
  timezone                   TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  show_meal_count_to_members BOOLEAN NOT NULL DEFAULT true,

  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Trigger ──────────────────────────────────────────────────
CREATE TRIGGER update_mess_settings_updated_at
  BEFORE UPDATE ON mess_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Migrate existing JSONB data ───────────────────────────────
INSERT INTO mess_settings (
  mess_id,
  meal_cutoff_breakfast,
  meal_cutoff_lunch,
  meal_cutoff_dinner,
  cutoff_days_before,
  cutoff_advance_time,
  min_deposit_amount,
  guest_meal_charge,
  late_meal_penalty,
  weekly_menu_budget,
  allow_guest_meals,
  require_expense_approval,
  auto_manager_rotation,
  manager_rotation_type,
  notifications_enabled,
  max_meal_leave_days,
  allow_open_leave_presets,
  currency,
  timezone,
  show_meal_count_to_members
)
SELECT
  id,
  COALESCE(settings->>'meal_cutoff_breakfast', '08:00'),
  COALESCE(settings->>'meal_cutoff_lunch',     '10:00'),
  COALESCE(settings->>'meal_cutoff_dinner',    '16:00'),
  COALESCE((settings->>'cutoff_days_before')::SMALLINT, 0),
  COALESCE(settings->>'cutoff_advance_time',   '22:00'),
  COALESCE((settings->>'min_deposit_amount')::NUMERIC, 100),
  COALESCE((settings->>'guest_meal_charge')::NUMERIC,  0),
  COALESCE((settings->>'late_meal_penalty')::NUMERIC,  0),
  COALESCE((settings->>'weekly_menu_budget')::NUMERIC, 0),
  COALESCE((settings->>'allow_guest_meals')::BOOLEAN,          true),
  COALESCE((settings->>'require_expense_approval')::BOOLEAN,   false),
  COALESCE((settings->>'auto_manager_rotation')::BOOLEAN,      false),
  COALESCE(settings->>'manager_rotation_type', 'monthly'),
  COALESCE((settings->>'notifications_enabled')::BOOLEAN,      true),
  COALESCE((settings->>'max_meal_leave_days')::SMALLINT, 90),
  COALESCE((settings->>'allow_open_leave_presets')::BOOLEAN,   true),
  COALESCE(settings->>'currency',  'BDT'),
  COALESCE(settings->>'timezone',  'Asia/Dhaka'),
  COALESCE((settings->>'show_meal_count_to_members')::BOOLEAN, true)
FROM messes
ON CONFLICT (mess_id) DO NOTHING;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE mess_settings ENABLE ROW LEVEL SECURITY;

-- Any active member of the mess can read settings
CREATE POLICY "mess_members_select_settings"
  ON mess_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mess_members mm
      WHERE mm.mess_id = mess_settings.mess_id
        AND mm.user_id = auth.uid()
        AND mm.status != 'removed'
    )
  );

-- Only owner / admin can update
CREATE POLICY "owner_admin_update_settings"
  ON mess_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM mess_members mm
      WHERE mm.mess_id = mess_settings.mess_id
        AND mm.user_id = auth.uid()
        AND mm.role IN ('owner', 'admin')
        AND mm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mess_members mm
      WHERE mm.mess_id = mess_settings.mess_id
        AND mm.user_id = auth.uid()
        AND mm.role IN ('owner', 'admin')
        AND mm.status = 'active'
    )
  );

-- Only the mess owner can insert (fires on createMess)
CREATE POLICY "owner_insert_settings"
  ON mess_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messes m
      WHERE m.id = mess_settings.mess_id
        AND m.owner_id = auth.uid()
    )
  );
