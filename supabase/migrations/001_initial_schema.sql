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
CREATE INDEX idx_meals_mess_member_month ON meals(mess_id, member_id, date);

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
  id          UUID NOT NULL DEFAULT uuid_generate_v4(),
  mess_id     UUID,
  user_id     UUID NOT NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2025 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE INDEX idx_audit_mess ON audit_logs(mess_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
