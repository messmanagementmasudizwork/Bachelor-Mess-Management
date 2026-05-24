-- ============================================================
-- MIGRATION: 012_permission_presets
-- 3-Layer Permission Architecture:
--   Layer 1: member_permissions      (per-user override)
--   Layer 2: mess_role_permissions   (per-mess role override)  ← NEW
--   Layer 3: role_permission_presets (global system default)   ← NEW
-- ============================================================

-- ============================================================
-- TABLE: role_permission_presets
-- Global system defaults — seeded once, never edited by users
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permission_presets (
  role            TEXT NOT NULL,
  permission_key  TEXT NOT NULL,
  allowed         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role, permission_key)
);

-- ============================================================
-- SEED: role_permission_presets
-- Mirrors current hardcoded ROLE_PERMISSIONS from lib/types
-- ============================================================
INSERT INTO role_permission_presets (role, permission_key, allowed) VALUES
  -- owner: all permissions allowed
  ('owner', 'meals.manage_others',  true),
  ('owner', 'expenses.create',      true),
  ('owner', 'expenses.approve',     true),
  ('owner', 'expenses.delete',      true),
  ('owner', 'bazaar.create',        true),
  ('owner', 'bazaar.approve',       true),
  ('owner', 'members.invite',       true),
  ('owner', 'members.remove',       true),
  ('owner', 'members.manage_roles', true),
  ('owner', 'deposits.add',         true),
  ('owner', 'deposits.approve',     true),
  ('owner', 'reports.view',         true),
  ('owner', 'reports.export',       true),
  ('owner', 'settings.manage',      true),
  ('owner', 'mess.close_month',     true),
  ('owner', 'inventory.manage',     true),
  ('owner', 'menu.manage',          true),
  ('owner', 'notifications.send',   true),

  -- admin: all permissions allowed (same as owner)
  ('admin', 'meals.manage_others',  true),
  ('admin', 'expenses.create',      true),
  ('admin', 'expenses.approve',     true),
  ('admin', 'expenses.delete',      true),
  ('admin', 'bazaar.create',        true),
  ('admin', 'bazaar.approve',       true),
  ('admin', 'members.invite',       true),
  ('admin', 'members.remove',       true),
  ('admin', 'members.manage_roles', true),
  ('admin', 'deposits.add',         true),
  ('admin', 'deposits.approve',     true),
  ('admin', 'reports.view',         true),
  ('admin', 'reports.export',       true),
  ('admin', 'settings.manage',      true),
  ('admin', 'mess.close_month',     true),
  ('admin', 'inventory.manage',     true),
  ('admin', 'menu.manage',          true),
  ('admin', 'notifications.send',   true),

  -- manager: limited permissions
  ('manager', 'meals.manage_others',  true),
  ('manager', 'expenses.create',      true),
  ('manager', 'expenses.approve',     false),
  ('manager', 'expenses.delete',      false),
  ('manager', 'bazaar.create',        true),
  ('manager', 'bazaar.approve',       false),
  ('manager', 'members.invite',       true),
  ('manager', 'members.remove',       false),
  ('manager', 'members.manage_roles', false),
  ('manager', 'deposits.add',         true),
  ('manager', 'deposits.approve',     false),
  ('manager', 'reports.view',         true),
  ('manager', 'reports.export',       true),
  ('manager', 'settings.manage',      false),
  ('manager', 'mess.close_month',     false),
  ('manager', 'inventory.manage',     true),
  ('manager', 'menu.manage',          true),
  ('manager', 'notifications.send',   true),

  -- assistant_manager: very limited
  ('assistant_manager', 'meals.manage_others',  true),
  ('assistant_manager', 'expenses.create',      false),
  ('assistant_manager', 'expenses.approve',     false),
  ('assistant_manager', 'expenses.delete',      false),
  ('assistant_manager', 'bazaar.create',        true),
  ('assistant_manager', 'bazaar.approve',       false),
  ('assistant_manager', 'members.invite',       false),
  ('assistant_manager', 'members.remove',       false),
  ('assistant_manager', 'members.manage_roles', false),
  ('assistant_manager', 'deposits.add',         false),
  ('assistant_manager', 'deposits.approve',     false),
  ('assistant_manager', 'reports.view',         true),
  ('assistant_manager', 'reports.export',       false),
  ('assistant_manager', 'settings.manage',      false),
  ('assistant_manager', 'mess.close_month',     false),
  ('assistant_manager', 'inventory.manage',     false),
  ('assistant_manager', 'menu.manage',          true),
  ('assistant_manager', 'notifications.send',   false),

  -- member: read-only
  ('member', 'meals.manage_others',  false),
  ('member', 'expenses.create',      false),
  ('member', 'expenses.approve',     false),
  ('member', 'expenses.delete',      false),
  ('member', 'bazaar.create',        false),
  ('member', 'bazaar.approve',       false),
  ('member', 'members.invite',       false),
  ('member', 'members.remove',       false),
  ('member', 'members.manage_roles', false),
  ('member', 'deposits.add',         false),
  ('member', 'deposits.approve',     false),
  ('member', 'reports.view',         true),
  ('member', 'reports.export',       false),
  ('member', 'settings.manage',      false),
  ('member', 'mess.close_month',     false),
  ('member', 'inventory.manage',     false),
  ('member', 'menu.manage',          false),
  ('member', 'notifications.send',   false),

  -- guest: no permissions
  ('guest', 'meals.manage_others',  false),
  ('guest', 'expenses.create',      false),
  ('guest', 'expenses.approve',     false),
  ('guest', 'expenses.delete',      false),
  ('guest', 'bazaar.create',        false),
  ('guest', 'bazaar.approve',       false),
  ('guest', 'members.invite',       false),
  ('guest', 'members.remove',       false),
  ('guest', 'members.manage_roles', false),
  ('guest', 'deposits.add',         false),
  ('guest', 'deposits.approve',     false),
  ('guest', 'reports.view',         false),
  ('guest', 'reports.export',       false),
  ('guest', 'settings.manage',      false),
  ('guest', 'mess.close_month',     false),
  ('guest', 'inventory.manage',     false),
  ('guest', 'menu.manage',          false),
  ('guest', 'notifications.send',   false)
ON CONFLICT (role, permission_key) DO NOTHING;

-- ============================================================
-- TABLE: mess_role_permissions
-- Per-mess role overrides — only affects that specific mess
-- ============================================================
CREATE TABLE IF NOT EXISTS mess_role_permissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id         UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  permission_key  TEXT NOT NULL,
  allowed         BOOLEAN NOT NULL,
  updated_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mess_id, role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_mess_role_perms_mess    ON mess_role_permissions(mess_id);
CREATE INDEX IF NOT EXISTS idx_mess_role_perms_role    ON mess_role_permissions(mess_id, role);
CREATE INDEX IF NOT EXISTS idx_mess_role_perms_lookup  ON mess_role_permissions(mess_id, role, permission_key);

-- ============================================================
-- TABLE: member_permissions (ensure exists with proper structure)
-- Per-member overrides — already used in app, now formalized
-- ============================================================
CREATE TABLE IF NOT EXISTS member_permissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mess_id         UUID NOT NULL REFERENCES messes(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_key  TEXT NOT NULL,
  allowed         BOOLEAN NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mess_id, user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_member_perms_mess_user  ON member_permissions(mess_id, user_id);
CREATE INDEX IF NOT EXISTS idx_member_perms_lookup     ON member_permissions(mess_id, user_id, permission_key);

-- ============================================================
-- RLS: role_permission_presets
-- All authenticated users can read, nobody can write via client
-- ============================================================
ALTER TABLE role_permission_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presets_select_authenticated"
  ON role_permission_presets FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- RLS: mess_role_permissions
-- Mess members can read, only owner/admin can write
-- ============================================================
ALTER TABLE mess_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mess_role_perms_select"
  ON mess_role_permissions FOR SELECT
  USING (is_mess_member(mess_id, auth.uid()));

CREATE POLICY "mess_role_perms_insert"
  ON mess_role_permissions FOR INSERT
  WITH CHECK (is_mess_admin(mess_id, auth.uid()));

CREATE POLICY "mess_role_perms_update"
  ON mess_role_permissions FOR UPDATE
  USING (is_mess_admin(mess_id, auth.uid()));

CREATE POLICY "mess_role_perms_delete"
  ON mess_role_permissions FOR DELETE
  USING (is_mess_admin(mess_id, auth.uid()));

-- ============================================================
-- RLS: member_permissions (formalize policies if not exists)
-- ============================================================
ALTER TABLE member_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_perms_select" ON member_permissions;
DROP POLICY IF EXISTS "member_perms_insert" ON member_permissions;
DROP POLICY IF EXISTS "member_perms_update" ON member_permissions;
DROP POLICY IF EXISTS "member_perms_delete" ON member_permissions;

CREATE POLICY "member_perms_select"
  ON member_permissions FOR SELECT
  USING (is_mess_member(mess_id, auth.uid()));

CREATE POLICY "member_perms_insert"
  ON member_permissions FOR INSERT
  WITH CHECK (is_mess_admin(mess_id, auth.uid()));

CREATE POLICY "member_perms_update"
  ON member_permissions FOR UPDATE
  USING (is_mess_admin(mess_id, auth.uid()));

CREATE POLICY "member_perms_delete"
  ON member_permissions FOR DELETE
  USING (is_mess_admin(mess_id, auth.uid()));

-- ============================================================
-- FUNCTION: resolve_permission (3-layer waterfall)
-- Layer 1: member_permissions (user-specific)
-- Layer 2: mess_role_permissions (mess-level role override)
-- Layer 3: role_permission_presets (global system default)
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_permission(
  p_mess_id       UUID,
  p_user_id       UUID,
  p_role          TEXT,
  p_permission_key TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  -- Layer 1: per-member override
  SELECT allowed INTO v_result
  FROM member_permissions
  WHERE mess_id = p_mess_id
    AND user_id = p_user_id
    AND permission_key = p_permission_key
  LIMIT 1;
  IF FOUND THEN RETURN v_result; END IF;

  -- Layer 2: per-mess role override
  SELECT allowed INTO v_result
  FROM mess_role_permissions
  WHERE mess_id = p_mess_id
    AND role = p_role
    AND permission_key = p_permission_key
  LIMIT 1;
  IF FOUND THEN RETURN v_result; END IF;

  -- Layer 3: global preset fallback
  SELECT allowed INTO v_result
  FROM role_permission_presets
  WHERE role = p_role
    AND permission_key = p_permission_key
  LIMIT 1;
  IF FOUND THEN RETURN v_result; END IF;

  -- Default deny
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- FUNCTION: get_member_effective_permissions
-- Returns all 18 permissions resolved for a user in a mess
-- ============================================================
CREATE OR REPLACE FUNCTION get_member_effective_permissions(
  p_mess_id UUID,
  p_user_id UUID
) RETURNS TABLE(permission_key TEXT, allowed BOOLEAN, source TEXT) AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role::TEXT INTO v_role
  FROM mess_members
  WHERE mess_id = p_mess_id AND user_id = p_user_id AND status != 'removed'
  LIMIT 1;

  IF v_role IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    rpp.permission_key,
    COALESCE(
      mp.allowed,
      mrp.allowed,
      rpp.allowed
    ) AS allowed,
    CASE
      WHEN mp.allowed IS NOT NULL THEN 'member_override'
      WHEN mrp.allowed IS NOT NULL THEN 'role_override'
      ELSE 'preset'
    END AS source
  FROM role_permission_presets rpp
  LEFT JOIN member_permissions mp
    ON mp.mess_id = p_mess_id AND mp.user_id = p_user_id AND mp.permission_key = rpp.permission_key
  LEFT JOIN mess_role_permissions mrp
    ON mrp.mess_id = p_mess_id AND mrp.role = v_role AND mrp.permission_key = rpp.permission_key
  WHERE rpp.role = v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- TRIGGER: updated_at on mess_role_permissions
-- ============================================================
CREATE OR REPLACE FUNCTION update_mess_role_perms_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mess_role_permissions_updated_at
  BEFORE UPDATE ON mess_role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_mess_role_perms_timestamp();
