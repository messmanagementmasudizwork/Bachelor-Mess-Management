/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import type { Permission, MemberPermission, MessRolePermission, RolePermissionPreset } from "@/lib/types";

function getDb(table: string) {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase not configured");
  return (supabase as any).from(table);
}

export const permissionService = {
  // ============================================================
  // LAYER 1 — Per-member overrides
  // ============================================================

  async getMemberPermissions(messId: string, userId: string): Promise<MemberPermission[]> {
    const { data, error } = await getDb("member_permissions")
      .select("*")
      .eq("mess_id", messId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]) as MemberPermission[];
  },

  async setPermissionOverride(
    messId: string,
    userId: string,
    permissionKey: Permission,
    allowed: boolean
  ): Promise<void> {
    const { error } = await getDb("member_permissions").upsert(
      { mess_id: messId, user_id: userId, permission_key: permissionKey, allowed },
      { onConflict: "mess_id,user_id,permission_key" }
    );
    if (error) throw new Error(error.message);
  },

  async removePermissionOverride(
    messId: string,
    userId: string,
    permissionKey: Permission
  ): Promise<void> {
    const { error } = await getDb("member_permissions")
      .delete()
      .eq("mess_id", messId)
      .eq("user_id", userId)
      .eq("permission_key", permissionKey);
    if (error) throw new Error(error.message);
  },

  async clearAllOverrides(messId: string, userId: string): Promise<void> {
    const { error } = await getDb("member_permissions")
      .delete()
      .eq("mess_id", messId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  // ============================================================
  // LAYER 2 — Per-mess role overrides
  // ============================================================

  async getMessRolePermissions(messId: string): Promise<MessRolePermission[]> {
    const { data, error } = await getDb("mess_role_permissions")
      .select("*")
      .eq("mess_id", messId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]) as MessRolePermission[];
  },

  async setMessRolePermission(
    messId: string,
    role: string,
    permissionKey: Permission,
    allowed: boolean,
    updatedBy: string
  ): Promise<void> {
    const { error } = await getDb("mess_role_permissions").upsert(
      {
        mess_id: messId,
        role,
        permission_key: permissionKey,
        allowed,
        updated_by: updatedBy,
      },
      { onConflict: "mess_id,role,permission_key" }
    );
    if (error) throw new Error(error.message);
  },

  async resetMessRolePermission(
    messId: string,
    role: string,
    permissionKey: Permission
  ): Promise<void> {
    const { error } = await getDb("mess_role_permissions")
      .delete()
      .eq("mess_id", messId)
      .eq("role", role)
      .eq("permission_key", permissionKey);
    if (error) throw new Error(error.message);
  },

  async resetAllMessRolePermissionsForRole(
    messId: string,
    role: string
  ): Promise<void> {
    const { error } = await getDb("mess_role_permissions")
      .delete()
      .eq("mess_id", messId)
      .eq("role", role);
    if (error) throw new Error(error.message);
  },

  async resetAllMessRolePermissions(messId: string): Promise<void> {
    const { error } = await getDb("mess_role_permissions")
      .delete()
      .eq("mess_id", messId);
    if (error) throw new Error(error.message);
  },

  // ============================================================
  // LAYER 3 — Global presets (read-only)
  // ============================================================

  async getGlobalPresets(): Promise<RolePermissionPreset[]> {
    const { data, error } = await getDb("role_permission_presets").select("*");
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]) as RolePermissionPreset[];
  },
};
