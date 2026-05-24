"use client";
import { useState } from "react";
import { Users, ShoppingCart, ChevronDown, BarChart2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberMealControl } from "@/components/meals/control/MemberMealControl";
import { TomorrowBazaarCard } from "@/components/meals/control/TomorrowBazaarCard";
import { useDailyMealSummary } from "@/lib/hooks/use-meals";
import { useMembers } from "@/lib/hooks/use-members";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { useMess } from "@/lib/hooks/use-mess";
import { useMessStore } from "@/lib/stores/mess.store";
import { useLanguage } from "@/lib/hooks/use-language";
import { getTodayString } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { MessSettings } from "@/lib/types";
import { redirect } from "next/navigation";

export default function MealControlPage() {
  const { t } = useLanguage();
  const { activeMess } = useMessStore();
  const canManage = useHasPermission("meals.manage_others");
  const { data: mess } = useMess(activeMess?.id);
  const { data: members } = useMembers();
  const today = getTodayString();

  const { data: todaySummary, isLoading: todayLoading } = useDailyMealSummary(today);
  const messSettings = (mess?.mess_settings ?? {}) as Partial<MessSettings>;

  const [statsOpen, setStatsOpen] = useState(false);

  if (!canManage) {
    redirect("/dashboard/meals");
  }

  // ── Compute today's stats ─────────────────────────────────
  const totalMembers = members?.filter((m) => m.status === "active").length ?? 0;
  const mealRecords  = (todaySummary?.members ?? []) as Array<{ breakfast: boolean; lunch: boolean; dinner: boolean }>;
  const onCount      = mealRecords.filter((m) => m.breakfast || m.lunch || m.dinner).length;
  const offCount     = Math.max(0, totalMembers - onCount);
  const bfCount      = todaySummary?.total_breakfast ?? 0;
  const luCount      = todaySummary?.total_lunch     ?? 0;
  const diCount      = todaySummary?.total_dinner    ?? 0;
  const totalMeals   = bfCount + luCount + diCount;

  const leftCards = [
    { label: "Active Members", value: totalMembers, bg: "bg-slate-50",  border: "border-slate-200",  text: "text-slate-700" },
    { label: "Eating Today",   value: onCount,      bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700" },
    { label: "Skipping Today", value: offCount,     bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700"   },
  ];

  const rightCards = [
    { label: "Total Meals",  value: totalMeals, bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" },
    { label: t.meals.breakfast, value: bfCount, bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700"  },
    { label: t.meals.lunch,     value: luCount, bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700"   },
    { label: t.meals.dinner,    value: diCount, bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  ];

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Collapsible stats panel ───────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

        {/* Header — always visible */}
        <button
          onClick={() => setStatsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            Today's Summary
          </div>
          <div className="flex items-center gap-3">
            {/* Compact peek — only when collapsed */}
            {!statsOpen && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-green-600 font-semibold">{onCount} ON</span>
                <span>·</span>
                <span className="text-red-500 font-semibold">{offCount} OFF</span>
                <span>·</span>
                <span className="text-violet-600 font-semibold">{totalMeals} meals</span>
              </div>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                statsOpen && "rotate-180"
              )}
            />
          </div>
        </button>

        {/* Expandable body */}
        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            statsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-2 border-t border-border">

              {/* Left — member stats */}
              <div className="space-y-2">
                {leftCards.map(({ label, value, bg, border, text }) => (
                  <div
                    key={label}
                    className={cn(
                      "rounded-lg border px-3 py-2 flex items-center justify-between",
                      bg, border,
                      todayLoading && "opacity-50"
                    )}
                  >
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <span className={cn("text-base font-bold leading-none", text)}>
                      {todayLoading ? "—" : value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Right — meal counts */}
              <div className="space-y-2">
                {rightCards.map(({ label, value, bg, border, text }) => (
                  <div
                    key={label}
                    className={cn(
                      "rounded-lg border px-3 py-2 flex items-center justify-between",
                      bg, border,
                      todayLoading && "opacity-50"
                    )}
                  >
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <span className={cn("text-base font-bold leading-none", text)}>
                      {todayLoading ? "—" : value}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <Tabs defaultValue="members">
        <TabsList className="w-full grid grid-cols-2 h-auto gap-1 p-1.5 bg-muted/70 rounded-xl">
          {[
            { value: "members", icon: <Users className="h-4 w-4" />, label: t.mealControl.tabMembers },
            { value: "bazaar",  icon: <ShoppingCart className="h-4 w-4" />, label: t.mealControl.tabBazaar },
          ].map(({ value, icon, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex flex-row items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
            >
              {icon}
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="members" className="mt-3">
          <MemberMealControl date={today} />
        </TabsContent>

        <TabsContent value="bazaar" className="mt-3">
          <TomorrowBazaarCard
            messSettings={messSettings}
            todaySummary={todaySummary}
            todayLoading={todayLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
