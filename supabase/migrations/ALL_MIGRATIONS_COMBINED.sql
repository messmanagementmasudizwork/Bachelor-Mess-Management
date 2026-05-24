-- ============================================================
-- BACHELOR MESS MANAGEMENT PLATFORM
-- Migration: 001_initial_schema
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE mess_type AS ENUM ('student', 'job_holder', 'family', 'hostel');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'manager', 'assistant_manager', 'member', 'guest');
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'on_leave', 'removed');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE deposit_status AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE payment_method AS ENUM ('cash', 'bkash', 'nagad', 'rocket', 'bank_transfer', 'other');
CREATE TYPE split_type AS ENUM ('equal', 'by_meal', 'custom');
CREATE TYPE notification_type AS ENUM (
  'meal_reminder', 'due_reminder', 'expense_added', 'expense_approved',
  'deposit_confirmed', 'manager_changed', 'member_joined', 'member_removed',
  'month_closed', 'low_balance', 'rule_violation', 'vacation_announced', 'system'
);

-- ============================================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT UNIQUE,
  email       TEXT UNIQUE,
  avatar_url  TEXT,
  profession  TEXT,
  blood_group TEXT,
  emergency_contact TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'bn' CHECK (preferred_language IN ('bn', 'en')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;

-- ============================================================
-- MESSES
-- ============================================================

CREATE TABLE messes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  address         TEXT,
  mess_type       mess_type NOT NULL DEFAULT 'student',
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  invite_code     TEXT NOT NULL UNIQUE,
  seat_capacity   INTEGER CHECK (seat_capacity > 0 AND seat_capacity <= 200),
  description     TEXT,
  avatar_url      TEXT,
  settings        JSONB NOT NULL DEFAULT '{
    "meal_cutoff_breakfast": "08:00",
    "meal_cutoff_lunch": "10:00",
    "meal_cutoff_dinner": "16:00",
    "late_meal_penalty": 0,
    "guest_meal_charge": 0,
    "auto_manager_rotation": false,
    "manager_rotation_type": "monthly",
    "currency": "BDT",
    "timezone": "Asia/Dhaka",
    "show_meal_count_to_members": true,
    "allow_guest_meals": true,
    "require_expense_approval": false,
    "min_deposit_amount": 100,
    "notifications_enabled": true
  }'::jsonb,
  current_month   TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM'),
  is_month_closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_messes_owner ON messes(owner_id);
CREATE INDEX idx_messes_invite_code ON messes(invite_code);
CREATE INDEX idx_messes_status ON messes(status);

-- ============================================================
-- MESS MEMBERS
-- ============================================================

CREATE TABLE mess_members (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id                 UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role                    member_role NOT NULL DEFAULT 'member',
  status                  member_status NOT NULL DEFAULT 'active',
  seat_number             INTEGER,
  joining_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  leave_start             DATE,
  leave_end               DATE,
  meal_default_breakfast  BOOLEAN NOT NULL DEFAULT TRUE,
  meal_default_lunch      BOOLEAN NOT NULL DEFAULT TRUE,
  meal_default_dinner     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mess_id, user_id),
  CONSTRAINT valid_leave CHECK (leave_end IS NULL OR leave_end >= leave_start)
);

CREATE INDEX idx_mess_members_mess ON mess_members(mess_id);
CREATE INDEX idx_mess_members_user ON mess_members(user_id);
CREATE INDEX idx_mess_members_status ON mess_members(mess_id, status);
CREATE INDEX idx_mess_members_role ON mess_members(mess_id, role);

-- ============================================================
-- MEAL ENTRIES
-- ============================================================

CREATE TABLE meals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id         UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES mess_members(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  breakfast       BOOLEAN NOT NULL DEFAULT TRUE,
  lunch           BOOLEAN NOT NULL DEFAULT TRUE,
  dinner          BOOLEAN NOT NULL DEFAULT TRUE,
  guest_breakfast INTEGER NOT NULL DEFAULT 0 CHECK (guest_breakfast >= 0 AND guest_breakfast <= 20),
  guest_lunch     INTEGER NOT NULL DEFAULT 0 CHECK (guest_lunch >= 0 AND guest_lunch <= 20),
  guest_dinner    INTEGER NOT NULL DEFAULT 0 CHECK (guest_dinner >= 0 AND guest_dinner <= 20),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(mess_id, member_id, date)
);

CREATE INDEX idx_meals_mess_date ON meals(mess_id, date);
CREATE INDEX idx_meals_member ON meals(member_id);
CREATE INDEX idx_meals_mess_member_month ON meals(mess_id, member_id, TO_CHAR(date, 'YYYY-MM'));

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id     UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  title       TEXT NOT NULL,
  note        TEXT,
  receipt_url TEXT,
  date        DATE NOT NULL,
  status      expense_status NOT NULL DEFAULT 'approved',
  split_type  split_type NOT NULL DEFAULT 'equal',
  is_variable BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  month       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_expenses_mess_month ON expenses(mess_id, month);
CREATE INDEX idx_expenses_status ON expenses(mess_id, status);
CREATE INDEX idx_expenses_date ON expenses(mess_id, date);
CREATE INDEX idx_expenses_category ON expenses(mess_id, category);

-- ============================================================
-- BAZAAR ENTRIES
-- ============================================================

CREATE TABLE bazaar_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id     UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  note        TEXT,
  shop_name   TEXT,
  receipt_url TEXT,
  items       JSONB NOT NULL DEFAULT '[]'::jsonb,
  month       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_bazaar_mess_month ON bazaar_entries(mess_id, month);
CREATE INDEX idx_bazaar_date ON bazaar_entries(mess_id, date);

-- ============================================================
-- DEPOSITS
-- ============================================================

CREATE TABLE deposits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id         UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES mess_members(id) ON DELETE CASCADE,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method  payment_method NOT NULL DEFAULT 'cash',
  transaction_ref TEXT,
  note            TEXT,
  date            DATE NOT NULL,
  status          deposit_status NOT NULL DEFAULT 'confirmed',
  confirmed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  confirmed_at    TIMESTAMPTZ,
  month           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_deposits_mess_month ON deposits(mess_id, month);
CREATE INDEX idx_deposits_member ON deposits(member_id);
CREATE INDEX idx_deposits_status ON deposits(mess_id, status);

-- ============================================================
-- MANAGER HISTORY
-- ============================================================

CREATE TABLE manager_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id       UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES mess_members(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE,
  is_current    BOOLEAN NOT NULL DEFAULT TRUE,
  handover_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_manager_history_mess ON manager_history(mess_id);
CREATE INDEX idx_manager_history_current ON manager_history(mess_id, is_current) WHERE is_current = TRUE;

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE inventory (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id       UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  item_name     TEXT NOT NULL,
  category      TEXT NOT NULL,
  quantity      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit          TEXT NOT NULL,
  min_threshold NUMERIC(10, 2) NOT NULL DEFAULT 0,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_mess ON inventory(mess_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mess_id     UUID REFERENCES messes(id) ON DELETE CASCADE,
  type        notification_type NOT NULL DEFAULT 'system',
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  action_url  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_mess ON notifications(mess_id) WHERE mess_id IS NOT NULL;
CREATE INDEX idx_notifications_created ON notifications(user_id, created_at DESC);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id     UUID REFERENCES messes(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2025 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE INDEX idx_audit_mess ON audit_logs(mess_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mess_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazaar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get user's role in a mess
CREATE OR REPLACE FUNCTION get_user_role_in_mess(p_mess_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
  SELECT role::TEXT FROM mess_members
  WHERE mess_id = p_mess_id AND user_id = p_user_id AND status != 'removed'
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is member of mess
CREATE OR REPLACE FUNCTION is_mess_member(p_mess_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM mess_members
    WHERE mess_id = p_mess_id AND user_id = p_user_id AND status NOT IN ('removed', 'inactive')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is admin or owner of mess
CREATE OR REPLACE FUNCTION is_mess_admin(p_mess_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM mess_members
    WHERE mess_id = p_mess_id AND user_id = p_user_id
      AND role IN ('owner', 'admin') AND status = 'active'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is manager or above
CREATE OR REPLACE FUNCTION is_mess_manager(p_mess_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM mess_members
    WHERE mess_id = p_mess_id AND user_id = p_user_id
      AND role IN ('owner', 'admin', 'manager') AND status = 'active'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_mess_members" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mess_members mm1
      JOIN mess_members mm2 ON mm1.mess_id = mm2.mess_id
      WHERE mm1.user_id = auth.uid()
        AND mm2.user_id = profiles.id
        AND mm1.status != 'removed'
    )
  );

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- MESSES POLICIES
-- ============================================================

-- SELECT: owner can always see their own mess; members can see their mess.
-- Critical: owner_id check is needed so that INSERT + .select() works
-- before the owner is added to mess_members.
CREATE POLICY "messes_select_members" ON messes
  FOR SELECT USING (
    owner_id = auth.uid()
    OR is_mess_member(id, auth.uid())
  );

CREATE POLICY "messes_insert_authenticated" ON messes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND owner_id = auth.uid()
  );

CREATE POLICY "messes_update_admin" ON messes
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR is_mess_admin(id, auth.uid())
  );

-- DELETE: only the owner can delete their mess
CREATE POLICY "messes_delete_owner" ON messes
  FOR DELETE USING (
    owner_id = auth.uid()
  );

-- ============================================================
-- MESS MEMBERS POLICIES
-- ============================================================

CREATE POLICY "mess_members_select_members" ON mess_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mess_members mm
      WHERE mm.mess_id = mess_members.mess_id
        AND mm.user_id = auth.uid()
        AND mm.status != 'removed'
    )
  );

CREATE POLICY "mess_members_insert_admin" ON mess_members
  FOR INSERT WITH CHECK (
    is_mess_admin(mess_id, auth.uid()) OR
    user_id = auth.uid()
  );

CREATE POLICY "mess_members_update_admin" ON mess_members
  FOR UPDATE USING (
    is_mess_admin(mess_id, auth.uid()) OR user_id = auth.uid()
  );

-- ============================================================
-- MEALS POLICIES
-- ============================================================

CREATE POLICY "meals_select_members" ON meals
  FOR SELECT USING (
    is_mess_member(mess_id, auth.uid())
  );

CREATE POLICY "meals_insert_members" ON meals
  FOR INSERT WITH CHECK (
    is_mess_member(mess_id, auth.uid()) AND (
      member_id IN (SELECT id FROM mess_members WHERE user_id = auth.uid()) OR
      is_mess_manager(mess_id, auth.uid())
    )
  );

CREATE POLICY "meals_update_own_or_manager" ON meals
  FOR UPDATE USING (
    member_id IN (SELECT id FROM mess_members WHERE user_id = auth.uid()) OR
    is_mess_manager(mess_id, auth.uid())
  );

-- ============================================================
-- EXPENSES POLICIES
-- ============================================================

CREATE POLICY "expenses_select_members" ON expenses
  FOR SELECT USING (
    is_mess_member(mess_id, auth.uid())
  );

CREATE POLICY "expenses_insert_manager" ON expenses
  FOR INSERT WITH CHECK (
    is_mess_manager(mess_id, auth.uid())
  );

CREATE POLICY "expenses_update_admin" ON expenses
  FOR UPDATE USING (
    is_mess_admin(mess_id, auth.uid()) OR
    (created_by = auth.uid() AND status = 'pending')
  );

-- ============================================================
-- BAZAAR ENTRIES POLICIES
-- ============================================================

CREATE POLICY "bazaar_select_members" ON bazaar_entries
  FOR SELECT USING (is_mess_member(mess_id, auth.uid()));

CREATE POLICY "bazaar_insert_manager" ON bazaar_entries
  FOR INSERT WITH CHECK (is_mess_manager(mess_id, auth.uid()));

CREATE POLICY "bazaar_update_admin" ON bazaar_entries
  FOR UPDATE USING (is_mess_admin(mess_id, auth.uid()));

-- ============================================================
-- DEPOSITS POLICIES
-- ============================================================

CREATE POLICY "deposits_select_members" ON deposits
  FOR SELECT USING (is_mess_member(mess_id, auth.uid()));

CREATE POLICY "deposits_insert_manager" ON deposits
  FOR INSERT WITH CHECK (
    is_mess_manager(mess_id, auth.uid()) OR
    member_id IN (SELECT id FROM mess_members WHERE user_id = auth.uid())
  );

CREATE POLICY "deposits_update_admin" ON deposits
  FOR UPDATE USING (is_mess_admin(mess_id, auth.uid()));

-- ============================================================
-- MANAGER HISTORY POLICIES
-- ============================================================

CREATE POLICY "manager_history_select_members" ON manager_history
  FOR SELECT USING (is_mess_member(mess_id, auth.uid()));

CREATE POLICY "manager_history_insert_admin" ON manager_history
  FOR INSERT WITH CHECK (is_mess_admin(mess_id, auth.uid()));

CREATE POLICY "manager_history_update_admin" ON manager_history
  FOR UPDATE USING (is_mess_admin(mess_id, auth.uid()));

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_by_manager" ON notifications
  FOR INSERT WITH CHECK (
    (mess_id IS NULL AND user_id = auth.uid())
    OR is_mess_manager(mess_id, auth.uid())
  );

-- ============================================================
-- INVENTORY POLICIES
-- ============================================================

CREATE POLICY "inventory_select_members" ON inventory
  FOR SELECT USING (is_mess_member(mess_id, auth.uid()));

CREATE POLICY "inventory_insert_manager" ON inventory
  FOR INSERT WITH CHECK (is_mess_manager(mess_id, auth.uid()));

CREATE POLICY "inventory_update_manager" ON inventory
  FOR UPDATE USING (is_mess_manager(mess_id, auth.uid()));

-- ============================================================
-- AUDIT LOGS POLICIES
-- ============================================================

CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (
    user_id = auth.uid() OR
    (mess_id IS NOT NULL AND is_mess_admin(mess_id, auth.uid()))
  );

CREATE POLICY "audit_logs_insert_authenticated" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- ============================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- ============================================================

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER messes_updated_at BEFORE UPDATE ON messes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER mess_members_updated_at BEFORE UPDATE ON mess_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER meals_updated_at BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deposits_updated_at BEFORE UPDATE ON deposits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- GENERATE INVITE CODE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate invite code for new messes
CREATE OR REPLACE FUNCTION auto_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    LOOP
      NEW.invite_code := generate_invite_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM messes WHERE invite_code = NEW.invite_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messes_auto_invite_code BEFORE INSERT ON messes
  FOR EACH ROW EXECUTE FUNCTION auto_invite_code();

-- ============================================================
-- JOIN MESS BY INVITE CODE
-- ============================================================

CREATE OR REPLACE FUNCTION join_mess_by_invite(
  p_invite_code TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_mess_id UUID;
  v_existing UUID;
BEGIN
  -- Find mess by invite code
  SELECT id INTO v_mess_id
  FROM messes
  WHERE invite_code = UPPER(p_invite_code) AND status = 'active';

  IF v_mess_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code or mess not found';
  END IF;

  -- Check if already a member
  SELECT id INTO v_existing
  FROM mess_members
  WHERE mess_id = v_mess_id AND user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    -- Reactivate if removed
    UPDATE mess_members
    SET status = 'active', updated_at = NOW()
    WHERE id = v_existing AND status = 'removed';
    RETURN v_mess_id;
  END IF;

  -- Add as new member
  INSERT INTO mess_members (mess_id, user_id, role, status, joining_date)
  VALUES (v_mess_id, p_user_id, 'member', 'active', CURRENT_DATE);

  -- Create notification
  INSERT INTO notifications (user_id, mess_id, type, title, body)
  VALUES (
    p_user_id, v_mess_id, 'member_joined',
    'মেসে যোগ দিয়েছেন',
    'আপনি সফলভাবে মেসে যোগ দিয়েছেন'
  );

  RETURN v_mess_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CALCULATE MEAL RATE
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_meal_rate(
  p_mess_id UUID,
  p_month TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_total_variable NUMERIC;
  v_total_meals INTEGER;
  v_rate NUMERIC;
BEGIN
  -- Get total variable expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_total_variable
  FROM expenses
  WHERE mess_id = p_mess_id AND month = p_month
    AND is_variable = TRUE AND status = 'approved';

  -- Get total meals
  SELECT COALESCE(
    SUM(
      (CASE WHEN breakfast THEN 1 ELSE 0 END) +
      (CASE WHEN lunch THEN 1 ELSE 0 END) +
      (CASE WHEN dinner THEN 1 ELSE 0 END) +
      guest_breakfast + guest_lunch + guest_dinner
    ), 0
  ) INTO v_total_meals
  FROM meals m
  JOIN mess_members mm ON m.member_id = mm.id
  WHERE mm.mess_id = p_mess_id
    AND TO_CHAR(m.date, 'YYYY-MM') = p_month;

  IF v_total_meals = 0 THEN
    RETURN 0;
  END IF;

  v_rate := ROUND(v_total_variable / v_total_meals, 2);
  RETURN v_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- GET MEMBER BALANCE
-- ============================================================

CREATE OR REPLACE FUNCTION get_member_balance(
  p_member_id UUID,
  p_mess_id UUID,
  p_month TEXT
)
RETURNS TABLE(
  total_deposited NUMERIC,
  total_meal_cost NUMERIC,
  total_fixed_share NUMERIC,
  total_cost NUMERIC,
  balance NUMERIC,
  due_amount NUMERIC,
  advance_amount NUMERIC
) AS $$
DECLARE
  v_meal_rate NUMERIC;
  v_total_meals INTEGER;
  v_meal_cost NUMERIC;
  v_total_deposited NUMERIC;
  v_total_fixed NUMERIC;
  v_active_members INTEGER;
  v_fixed_share NUMERIC;
  v_balance NUMERIC;
BEGIN
  -- Get meal rate
  v_meal_rate := calculate_meal_rate(p_mess_id, p_month);

  -- Get member's total meals
  SELECT COALESCE(SUM(
    (CASE WHEN breakfast THEN 1 ELSE 0 END) +
    (CASE WHEN lunch THEN 1 ELSE 0 END) +
    (CASE WHEN dinner THEN 1 ELSE 0 END) +
    guest_breakfast + guest_lunch + guest_dinner
  ), 0) INTO v_total_meals
  FROM meals
  WHERE member_id = p_member_id AND TO_CHAR(date, 'YYYY-MM') = p_month;

  v_meal_cost := ROUND(v_total_meals * v_meal_rate, 2);

  -- Get total deposits
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposited
  FROM deposits
  WHERE member_id = p_member_id AND month = p_month AND status = 'confirmed';

  -- Get fixed expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_total_fixed
  FROM expenses
  WHERE mess_id = p_mess_id AND month = p_month
    AND is_variable = FALSE AND status = 'approved';

  -- Count active members
  SELECT COUNT(*) INTO v_active_members
  FROM mess_members
  WHERE mess_id = p_mess_id AND status = 'active';

  IF v_active_members > 0 THEN
    v_fixed_share := ROUND(v_total_fixed / v_active_members, 2);
  ELSE
    v_fixed_share := 0;
  END IF;

  v_balance := v_total_deposited - (v_meal_cost + v_fixed_share);

  RETURN QUERY SELECT
    v_total_deposited,
    v_meal_cost,
    v_fixed_share,
    ROUND(v_meal_cost + v_fixed_share, 2),
    ROUND(v_balance, 2),
    CASE WHEN v_balance < 0 THEN ROUND(ABS(v_balance), 2) ELSE 0 END,
    CASE WHEN v_balance > 0 THEN ROUND(v_balance, 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- VIEWS
-- ============================================================

-- Daily meal summary view
CREATE OR REPLACE VIEW daily_meal_summary AS
SELECT
  mm.mess_id,
  m.date,
  COUNT(*) FILTER (WHERE m.breakfast) AS total_breakfast,
  COUNT(*) FILTER (WHERE m.lunch) AS total_lunch,
  COUNT(*) FILTER (WHERE m.dinner) AS total_dinner,
  SUM(m.guest_breakfast + m.guest_lunch + m.guest_dinner) AS total_guest,
  COUNT(*) FILTER (WHERE m.breakfast) +
  COUNT(*) FILTER (WHERE m.lunch) +
  COUNT(*) FILTER (WHERE m.dinner) +
  SUM(m.guest_breakfast + m.guest_lunch + m.guest_dinner) AS total_meals
FROM meals m
JOIN mess_members mm ON m.member_id = mm.id
GROUP BY mm.mess_id, m.date;

-- Monthly expense summary view
CREATE OR REPLACE VIEW monthly_expense_summary AS
SELECT
  mess_id,
  month,
  SUM(amount) FILTER (WHERE is_variable AND status = 'approved') AS total_variable,
  SUM(amount) FILTER (WHERE NOT is_variable AND status = 'approved') AS total_fixed,
  SUM(amount) FILTER (WHERE status = 'approved') AS total_expense
FROM expenses
GROUP BY mess_id, month;

-- ============================================================
-- CLOSE MONTH FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION close_month(
  p_mess_id UUID,
  p_month TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_next_month TEXT;
BEGIN
  -- Verify caller is admin
  IF NOT is_mess_admin(p_mess_id, p_user_id) THEN
    RAISE EXCEPTION 'Only admins can close a month';
  END IF;

  -- Update mess current month
  v_next_month := TO_CHAR(
    TO_DATE(p_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month',
    'YYYY-MM'
  );

  UPDATE messes
  SET
    is_month_closed = TRUE,
    current_month = v_next_month,
    updated_at = NOW()
  WHERE id = p_mess_id AND current_month = p_month;

  -- Log to audit
  INSERT INTO audit_logs (mess_id, user_id, action, entity_type, entity_id)
  VALUES (p_mess_id, p_user_id, 'month_closed', 'mess', p_mess_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- AUDIT LOG TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to financial tables
CREATE TRIGGER expenses_audit AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER deposits_audit AFTER INSERT OR UPDATE OR DELETE ON deposits
  FOR EACH ROW EXECUTE FUNCTION log_audit();
