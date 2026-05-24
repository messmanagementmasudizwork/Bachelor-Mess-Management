-- ============================================================
-- MIGRATION: 013_super_admin
-- Super Admin Panel — Platform-level administration
-- ============================================================

-- ============================================================
-- Add super admin & ban fields to profiles
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_banned      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_reason  TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_super_admin ON profiles(is_super_admin) WHERE is_super_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_banned       ON profiles(is_banned)      WHERE is_banned = TRUE;

-- ============================================================
-- HELPER: check if current user is super admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1),
    FALSE
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- RLS POLICIES — Super admin can read/write everything
-- ============================================================

-- messes: super admin can see ALL messes
CREATE POLICY "super_admin_select_messes"
  ON messes FOR SELECT
  USING (is_super_admin());

CREATE POLICY "super_admin_update_messes"
  ON messes FOR UPDATE
  USING (is_super_admin());

CREATE POLICY "super_admin_delete_messes"
  ON messes FOR DELETE
  USING (is_super_admin());

-- profiles: super admin can see ALL users
CREATE POLICY "super_admin_select_profiles"
  ON profiles FOR SELECT
  USING (is_super_admin());

CREATE POLICY "super_admin_update_profiles"
  ON profiles FOR UPDATE
  USING (is_super_admin());

-- mess_members: super admin can see ALL members
CREATE POLICY "super_admin_select_members"
  ON mess_members FOR SELECT
  USING (is_super_admin());

-- meals: super admin aggregate access
CREATE POLICY "super_admin_select_meals"
  ON meals FOR SELECT
  USING (is_super_admin());

-- expenses: super admin access
CREATE POLICY "super_admin_select_expenses"
  ON expenses FOR SELECT
  USING (is_super_admin());

-- deposits: super admin access
CREATE POLICY "super_admin_select_deposits"
  ON deposits FOR SELECT
  USING (is_super_admin());

-- audit_logs: super admin can see ALL audit logs
CREATE POLICY "super_admin_select_audit"
  ON audit_logs FOR SELECT
  USING (is_super_admin());

-- role_permission_presets: super admin can UPDATE global defaults
CREATE POLICY "super_admin_update_presets"
  ON role_permission_presets FOR UPDATE
  USING (is_super_admin());

-- notifications: super admin can INSERT (for broadcasts)
CREATE POLICY "super_admin_insert_notifications"
  ON notifications FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "super_admin_select_notifications"
  ON notifications FOR SELECT
  USING (is_super_admin());

-- ============================================================
-- TABLE: platform_announcements
-- Super admin broadcasts to users/messes
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_announcements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'mess', 'role')),
  target_id   UUID,            -- mess_id if target_type = 'mess'
  target_role TEXT,            -- role if target_type = 'role'
  sent_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select_all"
  ON platform_announcements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "announcements_insert_super_admin"
  ON platform_announcements FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "announcements_update_super_admin"
  ON platform_announcements FOR UPDATE
  USING (is_super_admin());
