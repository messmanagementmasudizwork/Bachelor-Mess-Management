"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { memberService } from "@/lib/services/member.service";
import { messService } from "@/lib/services/mess.service";
import { permissionService } from "@/lib/services/permission.service";
import { MEMBER_KEYS } from "@/lib/hooks/use-members";
import { MESS_KEYS } from "@/lib/hooks/use-mess";
import { PERM_KEYS } from "@/lib/hooks/use-permissions";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuth } from "@/lib/hooks/use-auth";

const PREFETCH_STALE = 5 * 60 * 1000;

export function DashboardPrefetcher() {
  const queryClient = useQueryClient();
  const { activeMess } = useMessStore();
  const { user } = useAuth();

  useEffect(() => {
    if (!activeMess?.id || !user?.id) return;

    const messId = activeMess.id;
    const userId = user.id;

    queryClient.prefetchQuery({
      queryKey: MEMBER_KEYS.list(messId),
      queryFn: () => memberService.getMessMembers(messId),
      staleTime: PREFETCH_STALE,
    });

    queryClient.prefetchQuery({
      queryKey: MEMBER_KEYS.me(messId, userId),
      queryFn: () => memberService.getMemberByUserId(messId, userId),
      staleTime: PREFETCH_STALE,
    });

    queryClient.prefetchQuery({
      queryKey: MESS_KEYS.detail(messId),
      queryFn: () => messService.getMessById(messId),
      staleTime: PREFETCH_STALE,
    });

    queryClient.prefetchQuery({
      queryKey: MESS_KEYS.stats(messId),
      queryFn: () => messService.getDashboardStats(messId),
      staleTime: PREFETCH_STALE,
    });

    queryClient.prefetchQuery({
      queryKey: PERM_KEYS.presets(),
      queryFn: () => permissionService.getGlobalPresets(),
      staleTime: Infinity,
    });

    queryClient.prefetchQuery({
      queryKey: PERM_KEYS.messRole(messId),
      queryFn: () => permissionService.getMessRolePermissions(messId),
      staleTime: PREFETCH_STALE,
    });

    queryClient.prefetchQuery({
      queryKey: PERM_KEYS.member(messId, userId),
      queryFn: () => permissionService.getMemberPermissions(messId, userId),
      staleTime: PREFETCH_STALE,
    });
  }, [activeMess?.id, user?.id, queryClient]);

  return null;
}
