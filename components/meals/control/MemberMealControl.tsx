"use client";
import { useState, useMemo } from "react";
import { Check, X, Users, ChevronUp, ChevronDown, ChevronsUpDown, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdminDailyMeals, useAdminToggleMeal } from "@/lib/hooks/use-meals";
import { useMembers } from "@/lib/hooks/use-members";
import { useMonthlyReport } from "@/lib/hooks/use-reports";
import { useMessStore } from "@/lib/stores/mess.store";
import { useLanguage } from "@/lib/hooks/use-language";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { cn, getInitials } from "@/lib/utils";
import { getRoleDisplayNameBn, getRoleBadgeColor } from "@/lib/utils/permissions";
import { formatDate } from "@/lib/utils/date";
import { MealControlFilterBar, type FilterStatus, type SortBy, type SortDir } from "./MealControlFilterBar";
import type { MemberRole, UpdateMealInput } from "@/lib/types";

interface Props { date: string; }

const MEALS = [
  { key: "breakfast" as const, emoji: "🌅" },
  { key: "lunch"     as const, emoji: "☀️" },
  { key: "dinner"    as const, emoji: "🌙" },
] as const;

const ROLES: MemberRole[] = ["owner", "admin", "manager", "assistant_manager", "member", "guest"];

function SortIcon({ col, current, dir }: { col: SortBy; current: SortBy; dir: SortDir }) {
  if (col !== current) return <ChevronsUpDown className="h-3 w-3 opacity-30 shrink-0" />;
  return dir === "asc"
    ? <ChevronUp   className="h-3 w-3 text-primary shrink-0" />
    : <ChevronDown className="h-3 w-3 text-primary shrink-0" />;
}

function MealToggle({ on, emoji, onClick, pending }: { on: boolean; emoji: string; onClick: () => void; pending: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={cn(
        "w-9 h-9 rounded-lg inline-flex flex-col items-center justify-center transition-all active:scale-95 border",
        on
          ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
          : "bg-red-50  text-red-500  border-red-200  hover:bg-red-100"
      )}
    >
      <span className="text-sm leading-none">{emoji}</span>
      {on ? <Check className="h-2 w-2 mt-0.5" /> : <X className="h-2 w-2 mt-0.5" />}
    </button>
  );
}

export function MemberMealControl({ date }: Props) {
  const { t } = useLanguage();
  const { formatCurrency, formatDatePref } = usePreferences();
  const { activeMonth } = useMessStore();
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: todayMeals, isLoading: mealsLoading } = useAdminDailyMeals(date);
  const { data: report } = useMonthlyReport(activeMonth);
  const adminToggle = useAdminToggleMeal();

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterRole,   setFilterRole]   = useState<MemberRole | "all">("all");
  const [sortBy,       setSortBy]       = useState<SortBy>("name");
  const [sortDir,      setSortDir]      = useState<SortDir>("asc");

  const getMeal    = (id: string) => todayMeals?.find((m) => m.member_id === id);
  const getReport  = (id: string) => report?.members.find((m) => m.member_id === id);
  const mealCnt  = (id: string) => { const m = getMeal(id); return m ? +!!m.breakfast + +!!m.lunch + +!!m.dinner : 3; };
  const anyOn    = (id: string) => { const m = getMeal(id); return m ? m.breakfast || m.lunch || m.dinner : true; };

  const handleToggle = (memberId: string, type: "breakfast" | "lunch" | "dinner", cur: boolean) => {
    const m = getMeal(memberId);
    adminToggle.mutate({
      memberId,
      input: {
        date,
        breakfast: type === "breakfast" ? !cur : (m?.breakfast ?? true),
        lunch:     type === "lunch"      ? !cur : (m?.lunch     ?? true),
        dinner:    type === "dinner"     ? !cur : (m?.dinner    ?? true),
      } as UpdateMealInput,
    });
  };

  const toggleSort = (col: SortBy) => {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => {
        const name = ((m.user as { full_name?: string })?.full_name ?? "").toLowerCase();
        if (search && !name.includes(search.toLowerCase())) return false;
        if (filterRole !== "all" && m.role !== filterRole) return false;
        if (filterStatus === "on"  && !anyOn(m.id)) return false;
        if (filterStatus === "off" &&  anyOn(m.id)) return false;
        return true;
      })
      .sort((a, b) => {
        let v = 0;
        if (sortBy === "name")    v = ((a.user as { full_name?: string })?.full_name ?? "").localeCompare((b.user as { full_name?: string })?.full_name ?? "");
        else if (sortBy === "meals")   v = mealCnt(a.id) - mealCnt(b.id);
        else if (sortBy === "balance") v = (getReport(a.id)?.balance ?? 0) - (getReport(b.id)?.balance ?? 0);
        return sortDir === "asc" ? v : -v;
      });
  }, [members, search, filterRole, filterStatus, sortBy, sortDir, todayMeals, report]);

  const onCount  = members?.filter((m) => anyOn(m.id)).length ?? 0;
  const uniqueRoles = ROLES.filter((r) => members?.some((m) => m.role === r));

  if (membersLoading || mealsLoading) return (
    <Card><CardContent className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
    </CardContent></Card>
  );

  return (
    <div className="space-y-3">

      {/* ── Filter bar ────────────────────────────────────────── */}
      <MealControlFilterBar
        search={search}            onSearch={setSearch}
        filterStatus={filterStatus} onFilterStatus={setFilterStatus}
        filterRole={filterRole}    onFilterRole={setFilterRole}
        uniqueRoles={uniqueRoles}
      />

      {/* ── Admin note ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
        <Info className="h-3.5 w-3.5 shrink-0" />
        {t.mealControl.memberMealsNote}
      </div>

      {/* ── Table card ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              {t.mealControl.memberMeals} — {formatDatePref(date)}
            </span>
            <Badge variant="secondary" className="text-xs">
              {t.mealControl.memberCount.replace("{count}", `${filtered.length}/${members?.length ?? 0}`)}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">{t.meals.noMembersInView}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    {/* Name */}
                    <th className="text-left px-4 py-2.5 font-semibold">
                      <button onClick={() => toggleSort("name")} className="flex items-center gap-1.5 hover:text-foreground">
                        {t.mealControl.colName}
                        <SortIcon col="name" current={sortBy} dir={sortDir} />
                      </button>
                    </th>
                    {/* Role */}
                    <th className="px-2 py-2.5 font-semibold text-center">{t.mealControl.colRole}</th>
                    {/* Meal toggles */}
                    {MEALS.map((m) => (
                      <th key={m.key} className="px-2 py-2.5 text-center font-semibold">
                        <span className="flex flex-col items-center gap-0.5 leading-none">
                          <span>{m.emoji}</span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {m.key === "breakfast" ? t.meals.breakfast : m.key === "lunch" ? t.meals.lunch : t.meals.dinner}
                          </span>
                        </span>
                      </th>
                    ))}
                    {/* Meal count — today */}
                    <th className="px-2 py-2.5 text-center font-semibold">
                      <button onClick={() => toggleSort("meals")} className="flex items-center gap-1 hover:text-foreground mx-auto">
                        {t.mealControl.colMeals} <SortIcon col="meals" current={sortBy} dir={sortDir} />
                      </button>
                    </th>
                    {/* Monthly meal count */}
                    <th className="px-2 py-2.5 text-center font-semibold">{t.mealControl.colMonthlyMeals}</th>
                    {/* Balance */}
                    <th className="px-3 py-2.5 text-right font-semibold">
                      <button onClick={() => toggleSort("balance")} className="flex items-center gap-1 hover:text-foreground ml-auto">
                        {t.mealControl.colBalance} <SortIcon col="balance" current={sortBy} dir={sortDir} />
                      </button>
                    </th>
                    {/* Total deposit */}
                    <th className="px-4 py-2.5 text-right font-semibold">{t.mealControl.colDeposit}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((member, i) => {
                    const meal       = getMeal(member.id);
                    const rpt        = getReport(member.id);
                    const profile    = member.user as { full_name?: string; avatar_url?: string } | null;
                    const mc         = mealCnt(member.id);
                    const balance    = rpt !== undefined ? rpt.balance : null;

                    return (
                      <tr
                        key={member.id}
                        className={cn(
                          "border-b last:border-0 hover:bg-muted/20 transition-colors",
                          i % 2 !== 0 && "bg-muted/10"
                        )}
                      >
                        {/* Name + avatar */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={profile?.avatar_url} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(profile?.full_name ?? "?")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate max-w-[110px] lg:max-w-[160px]">
                              {profile?.full_name ?? t.unknown}
                            </span>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-2 py-2.5 text-center">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getRoleBadgeColor(member.role as MemberRole)}`}>
                            {getRoleDisplayNameBn(member.role as MemberRole)}
                          </span>
                        </td>

                        {/* Meal toggles */}
                        {MEALS.map((type) => {
                          const on = meal ? meal[type.key] : true;
                          return (
                            <td key={type.key} className="px-2 py-2.5 text-center">
                              <MealToggle
                                on={on} emoji={type.emoji}
                                onClick={() => handleToggle(member.id, type.key, on)}
                                pending={adminToggle.isPending}
                              />
                            </td>
                          );
                        })}

                        {/* Meal count badge — today */}
                        <td className="px-2 py-2.5 text-center">
                          <span className={cn(
                            "text-[11px] font-bold px-2 py-0.5 rounded-full",
                            mc === 3 ? "bg-green-100 text-green-700"
                              : mc === 0 ? "bg-red-100 text-red-600"
                              : "bg-amber-100 text-amber-700"
                          )}>
                            {mc}/3
                          </span>
                        </td>

                        {/* Monthly meal count */}
                        <td className="px-2 py-2.5 text-center">
                          {rpt !== undefined ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                              {rpt.meal_summary.total_meals}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Balance */}
                        <td className="px-3 py-2.5 text-right">
                          {balance !== null ? (
                            <span className={cn("text-xs font-bold", balance >= 0 ? "text-green-600" : "text-red-500")}>
                              {balance >= 0 ? "+" : ""}{formatCurrency(Math.round(Math.abs(balance)))}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Total deposited */}
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(Math.round(rpt?.deposited ?? 0))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
