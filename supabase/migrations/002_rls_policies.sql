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

-- Allow managers/admins/owners to insert notifications for members of their mess.
-- Also allows inserting global (mess_id IS NULL) notifications for own user.
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
