"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { superAdminService } from "@/lib/services/super-admin.service";
import { permissionService } from "@/lib/services/permission.service";
import { useAuth } from "./use-auth";
import { toast } from "sonner";
import { getT } from "@/lib/i18n/get-t";
import type { MessStatusFilter, UserFilter } from "@/lib/types/super-admin.types";

export const SA_KEYS = {
  root:          ["super_admin"]       as const,
  isSa:          (uid: string)         => ["super_admin", "is_sa", uid]    as const,
  stats:         ()                    => ["super_admin", "stats"]          as const,
  messes:        (f: string, s: string) => ["super_admin", "messes", f, s] as const,
  users:         (f: string, s: string) => ["super_admin", "users",  f, s] as const,
  audit:         (f: object)           => ["super_admin", "audit",  JSON.stringify(f)] as const,
  presets:       ()                    => ["super_admin", "presets"]        as const,
  announcements: ()                    => ["super_admin", "announcements"]  as const,
};

export function useIsSuperAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: SA_KEYS.isSa(user?.id ?? ""),
    queryFn:  () => superAdminService.isSuperAdmin(user!.id),
    enabled:  !!user?.id,
    staleTime: 60_000,
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: SA_KEYS.stats(),
    queryFn:  () => superAdminService.getPlatformStats(),
    staleTime: 30_000,
  });
}

export function useAllMesses(filter: MessStatusFilter = "all", search = "") {
  return useQuery({
    queryKey: SA_KEYS.messes(filter, search),
    queryFn:  () => superAdminService.getAllMesses(filter, search),
    staleTime: 15_000,
  });
}

export function useUpdateMessStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messId, status }: { messId: string; status: "active" | "inactive" | "suspended" }) =>
      superAdminService.updateMessStatus(messId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super_admin", "messes"] });
      qc.invalidateQueries({ queryKey: SA_KEYS.stats() });
      toast.success(getT().toasts.messStatusUpdated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteMess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messId: string) => superAdminService.deleteMess(messId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super_admin", "messes"] });
      qc.invalidateQueries({ queryKey: SA_KEYS.stats() });
      toast.success(getT().toasts.messDeleted);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAllUsers(filter: UserFilter = "all", search = "") {
  return useQuery({
    queryKey: SA_KEYS.users(filter, search),
    queryFn:  () => superAdminService.getAllUsers(filter, search),
    staleTime: 15_000,
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      superAdminService.banUser(userId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super_admin", "users"] });
      qc.invalidateQueries({ queryKey: SA_KEYS.stats() });
      toast.success(getT().toasts.userBanned);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnbanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => superAdminService.unbanUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super_admin", "users"] });
      qc.invalidateQueries({ queryKey: SA_KEYS.stats() });
      toast.success(getT().toasts.userUnbanned);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAuditLogs(filters: { messId?: string; userId?: string; action?: string; from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: SA_KEYS.audit(filters),
    queryFn:  () => superAdminService.getAuditLogs(filters),
    staleTime: 15_000,
  });
}

export function useGlobalPresets() {
  return useQuery({
    queryKey: SA_KEYS.presets(),
    queryFn:  () => permissionService.getGlobalPresets(),
    staleTime: Infinity,
  });
}

export function useUpdateGlobalPreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ role, permission, allowed }: { role: string; permission: string; allowed: boolean }) =>
      superAdminService.updateGlobalPreset(role, permission, allowed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SA_KEYS.presets() });
      qc.invalidateQueries({ queryKey: ["permissions", "presets"] });
      toast.success(getT().toasts.globalDefaultUpdated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["super_admin", "subscription_plans"],
    queryFn:  () => superAdminService.getSubscriptionPlans(),
    staleTime: 60_000,
  });
}

export function useMessSubscriptions() {
  return useQuery({
    queryKey: ["super_admin", "mess_subscriptions"],
    queryFn:  () => superAdminService.getMessSubscriptions(),
    staleTime: 15_000,
  });
}

export function useAssignMessSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      messId, planId, status, expiresAt,
    }: { messId: string; planId: string; status?: string; expiresAt?: string | null }) =>
      superAdminService.assignMessSubscription(messId, planId, status, expiresAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super_admin", "mess_subscriptions"] });
      qc.invalidateQueries({ queryKey: ["super_admin", "stats"] });
      toast.success(getT().toasts.subscriptionUpdated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAllComplaints(
  statusFilter = "all",
  priorityFilter = "all",
  search = ""
) {
  return useQuery({
    queryKey: ["super_admin", "complaints", statusFilter, priorityFilter, search],
    queryFn:  () => superAdminService.getAllComplaints(statusFilter, priorityFilter, search),
    staleTime: 15_000,
  });
}

export function useUpdateComplaintStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      superAdminService.updateComplaintStatus(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super_admin", "complaints"] });
      toast.success(getT().toasts.complaintStatusUpdated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["super_admin", "platform_settings"],
    queryFn:  () => superAdminService.getPlatformSettings(),
    staleTime: 60_000,
  });
}

export function useUpdatePlatformSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      superAdminService.updatePlatformSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super_admin", "platform_settings"] });
      toast.success(getT().toasts.settingUpdated);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: SA_KEYS.announcements(),
    queryFn:  () => superAdminService.getAnnouncements(),
    staleTime: 30_000,
  });
}

export function useSendAnnouncement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; body: string; target_type: "all" | "mess" | "role"; target_id?: string; target_role?: string }) =>
      superAdminService.sendAnnouncement({ ...payload, sent_by: user!.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SA_KEYS.announcements() });
      toast.success(getT().toasts.announcementSent);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
