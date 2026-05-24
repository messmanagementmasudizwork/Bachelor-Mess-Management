"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { permissionService } from "@/lib/services/permission.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuth } from "./use-auth";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";
import { resolvePermission } from "@/lib/utils/permissions";
import type { Permission } from "@/lib/types";

export const PERM_KEYS = {
  all: ["permissions"] as const,
  member: (messId: string, userId: string) =>
    [...PERM_KEYS.all, "member", messId, userId] as const,
  messRole: (messId: string) =>
    [...PERM_KEYS.all, "mess_role", messId] as const,
  presets: () =>
    [...PERM_KEYS.all, "presets"] as const,
};

export function useMemberPermissions(userId: string) {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: PERM_KEYS.member(activeMess?.id!, userId),
    queryFn: () => permissionService.getMemberPermissions(activeMess!.id, userId),
    enabled: !!activeMess?.id && !!userId,
    staleTime: 30_000,
  });
}

export function useSetPermissionOverride(userId: string) {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ permission, allowed }: { permission: Permission; allowed: boolean }) =>
      permissionService.setPermissionOverride(activeMess!.id, userId, permission, allowed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERM_KEYS.member(activeMess?.id!, userId) });
      toast.success(getT().toasts.permissionUpdated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemovePermissionOverride(userId: string) {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permission: Permission) =>
      permissionService.removePermissionOverride(activeMess!.id, userId, permission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERM_KEYS.member(activeMess?.id!, userId) });
      toast.success(getT().toasts.permissionReset);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useClearPermissionOverrides(userId: string) {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => permissionService.clearAllOverrides(activeMess!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERM_KEYS.member(activeMess?.id!, userId) });
      toast.success(getT().toasts.allPermissionsReset);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMessRolePermissions() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: PERM_KEYS.messRole(activeMess?.id!),
    queryFn: () => permissionService.getMessRolePermissions(activeMess!.id),
    enabled: !!activeMess?.id,
    staleTime: 60_000,
  });
}

export function useSetMessRolePermission() {
  const { activeMess } = useMessStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ role, permission, allowed }: { role: string; permission: Permission; allowed: boolean }) =>
      permissionService.setMessRolePermission(
        activeMess!.id,
        role,
        permission,
        allowed,
        user!.id
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERM_KEYS.messRole(activeMess?.id!) });
      toast.success(getT().toasts.rolePermissionUpdated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResetMessRolePermission() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ role, permission }: { role: string; permission: Permission }) =>
      permissionService.resetMessRolePermission(activeMess!.id, role, permission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERM_KEYS.messRole(activeMess?.id!) });
      toast.success(getT().toasts.roleResetDefault);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResetAllMessRolePermissionsForRole() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (role: string) =>
      permissionService.resetAllMessRolePermissionsForRole(activeMess!.id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERM_KEYS.messRole(activeMess?.id!) });
      toast.success(getT().toasts.allRoleChangesReset);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResetAllMessRolePermissions() {
  const { activeMess } = useMessStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => permissionService.resetAllMessRolePermissions(activeMess!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERM_KEYS.messRole(activeMess?.id!) });
      toast.success(getT().toasts.allRolesReset);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useGlobalPermissionPresets() {
  return useQuery({
    queryKey: PERM_KEYS.presets(),
    queryFn: () => permissionService.getGlobalPresets(),
    staleTime: Infinity,
  });
}

/**
 * Full 3-layer permission check for the currently logged-in user.
 * Layer 1: member-level override → Layer 2: mess role override → Layer 3: DB preset
 */
export function useHasPermission(permission: Permission): boolean {
  const { activeMess } = useMessStore();
  const { user } = useAuth();
  const { data: memberOverrides = [] } = useMemberPermissions(user?.id ?? "");
  const { data: roleOverrides = [] } = useMessRolePermissions();
  const { data: presets = [] } = useGlobalPermissionPresets();

  if (!activeMess?.role) return false;

  return resolvePermission(
    activeMess.role,
    permission,
    memberOverrides,
    roleOverrides,
    presets,
  );
}
