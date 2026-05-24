import type { MemberRole, Permission, MemberPermission, MessRolePermission, RolePermissionPreset } from "@/lib/types";
import { ROLE_PERMISSIONS } from "@/lib/types";
import { getT } from "@/lib/i18n/get-t";

/**
 * Layer 3 fallback: check DB preset for a role + permission.
 * Falls back to hardcoded ROLE_PERMISSIONS if presets not yet loaded.
 */
export function roleHasPermission(
  role: MemberRole,
  permission: Permission,
  presets: RolePermissionPreset[] = []
): boolean {
  if (presets.length > 0) {
    const preset = presets.find(
      (p) => p.role === role && p.permission_key === permission
    );
    if (preset !== undefined) return preset.allowed;
    // Key not in DB yet → fall back to hardcoded defaults
  }
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Layer 2+3 resolver: checks mess-level role override first,
 * then falls back to DB presets (or hardcoded if presets not loaded).
 */
export function resolveRolePermission(
  role: MemberRole | string,
  permission: Permission,
  messRoleOverrides: MessRolePermission[] = [],
  presets: RolePermissionPreset[] = []
): boolean {
  // Layer 2: per-mess role override
  const override = messRoleOverrides.find(
    (o) => o.role === role && o.permission_key === permission
  );
  if (override !== undefined) return override.allowed;

  // Layer 3: DB presets (live from Supabase)
  if (presets.length > 0) {
    const preset = presets.find(
      (p) => p.role === role && p.permission_key === permission
    );
    if (preset !== undefined) return preset.allowed;
    // Key not in DB yet → fall back to hardcoded defaults
  }

  // Hardcoded fallback
  return ROLE_PERMISSIONS[role as MemberRole]?.includes(permission) ?? false;
}

/**
 * Full 3-layer resolver: member override → mess role override → DB preset.
 * Use this when you have all three layers of data available.
 */
export function resolvePermission(
  role: MemberRole | string,
  permission: Permission,
  memberOverrides: MemberPermission[] = [],
  messRoleOverrides: MessRolePermission[] = [],
  presets: RolePermissionPreset[] = []
): boolean {
  // Layer 1: per-member override
  const memberOverride = memberOverrides.find(
    (p) => p.permission_key === permission
  );
  if (memberOverride !== undefined) return memberOverride.allowed;

  // Layer 2: per-mess role override
  const roleOverride = messRoleOverrides.find(
    (o) => o.role === role && o.permission_key === permission
  );
  if (roleOverride !== undefined) return roleOverride.allowed;

  // Layer 3: DB presets (live from Supabase)
  if (presets.length > 0) {
    const preset = presets.find(
      (p) => p.role === role && p.permission_key === permission
    );
    if (preset !== undefined) return preset.allowed;
    // Key not in DB yet → fall back to hardcoded defaults
  }

  // Hardcoded fallback
  return ROLE_PERMISSIONS[role as MemberRole]?.includes(permission) ?? false;
}

/**
 * Legacy helper — checks member override then preset (no mess-level).
 * Kept for backward compatibility. Prefer resolvePermission() for new code.
 */
export function hasPermission(
  role: MemberRole,
  permission: Permission,
  customPermissions: MemberPermission[] = []
): boolean {
  const custom = customPermissions.find(
    (p) => p.permission_key === permission
  );
  if (custom !== undefined) return custom.allowed;
  return roleHasPermission(role, permission);
}

/**
 * Check if role is admin-level (owner or admin)
 */
export function isAdminRole(role: MemberRole): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Check if role is manager-level or above
 */
export function isManagerOrAbove(role: MemberRole): boolean {
  return ["owner", "admin", "manager"].includes(role);
}

/**
 * Get role display name in current language
 */
export function getRoleDisplayNameBn(role: MemberRole): string {
  const roles = getT().permissions.roles;
  const names: Record<string, string> = {
    owner: roles.owner,
    admin: roles.admin,
    manager: roles.manager,
    assistant_manager: roles.assistant_manager,
    member: roles.member,
    guest: roles.guest,
  };
  return names[role] ?? role;
}

/**
 * Get role display name in English
 */
export function getRoleDisplayName(role: MemberRole): string {
  const names: Record<MemberRole, string> = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    assistant_manager: "Asst. Manager",
    member: "Member",
    guest: "Guest",
  };
  return names[role] ?? role;
}

/**
 * Get role badge color (Tailwind classes)
 */
export function getRoleBadgeColor(role: MemberRole): string {
  const colors: Record<MemberRole, string> = {
    owner:             "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    admin:             "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    manager:           "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    assistant_manager: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
    member:            "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    guest:             "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  };
  return colors[role] ?? colors.member;
}
