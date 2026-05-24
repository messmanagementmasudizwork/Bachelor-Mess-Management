-- ============================================================
-- MIGRATION: 017_fix_member_perms_rls
-- Tighten RLS on member_permissions:
--   Before: any mess member could SELECT all other members' overrides
--   After:  members see only their own; admin/owner sees all in their mess
-- ============================================================

-- Drop the broad existing SELECT policy
DROP POLICY IF EXISTS "member_perms_select" ON member_permissions;

-- New tighter SELECT policy:
--   - A member can always read their own overrides (user_id = auth.uid())
--   - An admin/owner of the same mess can read all overrides in that mess
CREATE POLICY "member_perms_select"
  ON member_permissions FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_mess_admin(mess_id, auth.uid())
  );
