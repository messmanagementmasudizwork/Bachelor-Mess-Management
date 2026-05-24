"use client";
import { Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDailyMeals, useAdminToggleMeal } from "@/lib/hooks/use-meals";
import { useMembers } from "@/lib/hooks/use-members";
import { useLanguage } from "@/lib/hooks/use-language";
import { cn, getInitials } from "@/lib/utils";
import { getRoleDisplayNameBn, getRoleBadgeColor } from "@/lib/utils/permissions";
import type { MemberRole, UpdateMealInput } from "@/lib/types";

interface Props {
  date: string;
  canToggle: boolean;
}

export function AdminMembersView({ date, canToggle }: Props) {
  const { t } = useLanguage();
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: todayMeals, isLoading: mealsLoading } = useAdminDailyMeals(date);
  const adminToggle = useAdminToggleMeal();

  const MEAL_TYPES = [
    { key: "breakfast" as const, fullLabel: t.meals.breakfast },
    { key: "lunch" as const, fullLabel: t.meals.lunch },
    { key: "dinner" as const, fullLabel: t.meals.dinner },
  ];

  const isLoading = membersLoading || mealsLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const getMealForMember = (memberId: string) =>
    todayMeals?.find((m) => m.member_id === memberId);

  const handleToggle = (
    memberId: string,
    type: "breakfast" | "lunch" | "dinner",
    current: boolean
  ) => {
    if (!canToggle) return;
    const existing = getMealForMember(memberId);
    adminToggle.mutate({
      memberId,
      input: {
        date,
        breakfast: type === "breakfast" ? !current : (existing?.breakfast ?? true),
        lunch: type === "lunch" ? !current : (existing?.lunch ?? true),
        dinner: type === "dinner" ? !current : (existing?.dinner ?? true),
      } as UpdateMealInput,
    });
  };

  if (!members || members.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">{t.meals.noMembersInView}</p>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const meal = getMealForMember(member.id);
        const userProfile = member.user as { full_name?: string; avatar_url?: string } | null;
        return (
          <div key={member.id} className="p-3 rounded-xl border bg-card space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {getInitials(userProfile?.full_name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {userProfile?.full_name ?? t.unknown}
                </p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRoleBadgeColor(
                    member.role as MemberRole
                  )}`}
                >
                  {getRoleDisplayNameBn(member.role as MemberRole)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MEAL_TYPES.map((type) => {
                const isOn = meal ? meal[type.key] : true;
                return (
                  <button
                    key={type.key}
                    onClick={() => handleToggle(member.id, type.key, isOn)}
                    disabled={!canToggle || adminToggle.isPending}
                    className={cn(
                      "flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-semibold transition-all active:scale-95",
                      isOn
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-red-100 text-red-600 border border-red-200",
                      !canToggle && "cursor-default"
                    )}
                  >
                    {isOn ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {type.fullLabel}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
