"use client";
import { useQuery } from "@tanstack/react-query";
import { getRequiredClient } from "@/lib/supabase/client";
import { useMessStore } from "@/lib/stores/mess.store";
import { computeMemberScore, rankMembers, computeAchievements } from "@/lib/utils/gamification";
import type { MemberScore, Achievement } from "@/lib/utils/gamification";
import { useAuthStore } from "@/lib/stores/auth.store";
import { getT } from "@/lib/i18n/get-t";

export const GAMIFICATION_KEYS = {
  all: ["gamification"] as const,
  leaderboard: (messId: string) => [...GAMIFICATION_KEYS.all, "leaderboard", messId] as const,
  myAchievements: (messId: string, userId: string) =>
    [...GAMIFICATION_KEYS.all, "achievements", messId, userId] as const,
};

async function fetchLeaderboard(messId: string): Promise<MemberScore[]> {
  const supabase = getRequiredClient();

  const [membersRes, mealsRes, expensesRes, bazaarRes, depositsRes, managerRes] =
    await Promise.all([
      supabase
        .from("mess_members")
        .select("id, user_id, role, profiles!mess_members_user_id_fkey(full_name, avatar_url)")
        .eq("mess_id", messId)
        .neq("status", "removed"),

      supabase
        .from("meals")
        .select("member_id, breakfast, lunch, dinner")
        .eq("mess_id", messId),

      supabase
        .from("expenses")
        .select("created_by, status")
        .eq("mess_id", messId),

      supabase
        .from("bazaar_entries")
        .select("created_by")
        .eq("mess_id", messId),

      supabase
        .from("deposits")
        .select("member_id, status")
        .eq("mess_id", messId),

      supabase
        .from("manager_history")
        .select("member_id")
        .eq("mess_id", messId),
    ]);

  if (membersRes.error) throw new Error(membersRes.error.message);

  const members = membersRes.data ?? [];
  const meals = mealsRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const bazaar = bazaarRes.data ?? [];
  const deposits = depositsRes.data ?? [];
  const managers = managerRes.data ?? [];

  const managerMemberIds = new Set(managers.map((m: any) => m.member_id));

  const rawScores = members.map((member: any) => {
    const profile = member.profiles;
    const memberMeals = meals.filter((m: any) => m.member_id === member.id);
    const totalMeals = memberMeals.reduce(
      (acc: number, m: any) => acc + (m.breakfast ? 1 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0),
      0
    );
    const memberExpenses = expenses.filter((e: any) => e.created_by === member.user_id);
    const memberBazaar = bazaar.filter((b: any) => b.created_by === member.user_id);
    const memberDeposits = deposits.filter(
      (d: any) => d.member_id === member.id && d.status === "confirmed"
    );

    return computeMemberScore({
      memberId: member.user_id,
      memberName: profile?.full_name ?? getT().gamificationExt.unknownMember,
      avatarUrl: profile?.avatar_url,
      role: member.role,
      totalMeals,
      expensesSubmitted: memberExpenses.length,
      expensesApproved: memberExpenses.filter((e: any) => e.status === "approved").length,
      bazaarEntries: memberBazaar.length,
      depositsConfirmed: memberDeposits.length,
      wasManager: managerMemberIds.has(member.id),
    });
  });

  return rankMembers(rawScores);
}

async function fetchMyAchievements(messId: string, userId: string): Promise<Achievement[]> {
  const supabase = getRequiredClient();

  const memberRes = await supabase
    .from("mess_members")
    .select("id")
    .eq("mess_id", messId)
    .eq("user_id", userId)
    .single();

  if (memberRes.error || !memberRes.data) return [];
  const memberId = memberRes.data.id;

  const [mealsRes, expensesRes, bazaarRes] = await Promise.all([
    supabase.from("meals").select("breakfast, lunch, dinner").eq("member_id", memberId).eq("mess_id", messId),
    supabase.from("expenses").select("id").eq("created_by", userId).eq("mess_id", messId),
    supabase.from("bazaar_entries").select("id").eq("created_by", userId).eq("mess_id", messId),
  ]);

  const meals = mealsRes.data ?? [];
  const totalMeals = meals.reduce(
    (acc: number, m: any) => acc + (m.breakfast ? 1 : 0) + (m.lunch ? 1 : 0) + (m.dinner ? 1 : 0),
    0
  );

  return computeAchievements(totalMeals, bazaarRes.data?.length ?? 0, expensesRes.data?.length ?? 0);
}

export function useLeaderboard() {
  const { activeMess } = useMessStore();
  return useQuery({
    queryKey: GAMIFICATION_KEYS.leaderboard(activeMess?.id ?? ""),
    queryFn: () => fetchLeaderboard(activeMess!.id),
    enabled: !!activeMess?.id,
    staleTime: 60000,
  });
}

export function useMyAchievements() {
  const { activeMess } = useMessStore();
  const { user } = useAuthStore();
  return useQuery({
    queryKey: GAMIFICATION_KEYS.myAchievements(activeMess?.id ?? "", user?.id ?? ""),
    queryFn: () => fetchMyAchievements(activeMess!.id, user!.id),
    enabled: !!activeMess?.id && !!user?.id,
    staleTime: 60000,
  });
}
