"use client";
import { useState } from "react";
import { ChefHat, Utensils, Users, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useDailyMealSummary, useAdminDailyMeals } from "@/lib/hooks/use-meals";
import { useMessStore } from "@/lib/stores/mess.store";
import { getTodayString, formatDate } from "@/lib/utils/date";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/hooks/use-language";
import { usePreferences } from "@/lib/hooks/use-preferences";

export default function KitchenPage() {
  const { t } = useLanguage();
  const { formatDatePref } = usePreferences();
  const today = getTodayString();
  const { activeMess } = useMessStore();
  const [displayMode, setDisplayMode] = useState(false);

  const { data: summary, isLoading: summaryLoading, refetch } = useDailyMealSummary(today);
  const { data: members, isLoading: membersLoading } = useAdminDailyMeals(today);

  const isLoading = summaryLoading || membersLoading;

  const MEAL_TYPES = [
    { key: "breakfast" as const, label: t.kitchen.breakfast, emoji: "🌅", color: "bg-amber-50 border-amber-200 text-amber-800" },
    { key: "lunch"     as const, label: t.kitchen.lunch,     emoji: "☀️", color: "bg-green-50 border-green-200 text-green-800" },
    { key: "dinner"    as const, label: t.kitchen.dinner,    emoji: "🌙", color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  ];

  // Kitchen display mode — large font minimal UI
  if (displayMode) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <ChefHat className="h-6 w-6 text-amber-400" />
            <div>
              <p className="text-lg font-bold">{activeMess?.name ?? t.kitchen.kitchenDefault}</p>
              <p className="text-sm text-gray-400">{formatDatePref(today)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white" onClick={() => setDisplayMode(false)}>
              <Minimize2 className="h-4 w-4" />
              <span className="ml-1 text-xs">{t.kitchen.normalView}</span>
            </Button>
          </div>
        </div>

        {/* Big meal counts */}
        <div className="flex-1 grid grid-cols-3 gap-1 p-4">
          {[
            { emoji: "🌅", label: t.kitchen.breakfast, count: summary?.total_breakfast ?? 0, bg: "bg-amber-950/50 border-amber-800" },
            { emoji: "☀️", label: t.kitchen.lunch,     count: summary?.total_lunch ?? 0,     bg: "bg-green-950/50 border-green-800" },
            { emoji: "🌙", label: t.kitchen.dinner,    count: summary?.total_dinner ?? 0,    bg: "bg-indigo-950/50 border-indigo-800" },
          ].map(({ emoji, label, count, bg }) => (
            <div key={label} className={cn("rounded-2xl border-2 flex flex-col items-center justify-center p-6 gap-2", bg)}>
              <div className="text-5xl">{emoji}</div>
              <div className="text-9xl font-black tabular-nums leading-none">{summaryLoading ? "—" : count}</div>
              <div className="text-2xl font-bold text-gray-300">{label}</div>
              <div className="text-xl text-gray-500">{t.kitchen.personsUnit}</div>
            </div>
          ))}
        </div>

        {/* Bottom totals */}
        <div className="grid grid-cols-2 gap-4 p-4 border-t border-gray-800">
          <div className="text-center">
            <p className="text-gray-500 text-sm">{t.kitchen.guestLabel}</p>
            <p className="text-5xl font-black text-rose-400">{summary?.total_guest ?? 0}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-sm">{t.kitchen.totalMeals}</p>
            <p className="text-5xl font-black text-white">
              {((summary?.total_breakfast ?? 0) + (summary?.total_lunch ?? 0) + (summary?.total_dinner ?? 0) + (summary?.total_guest ?? 0))}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDisplayMode(true)}>
            <Maximize2 className="h-3.5 w-3.5" />
            {t.kitchen.displayMode}
          </Button>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            title={t.kitchen.refresh}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Big meal count cards */}
      <div className="grid grid-cols-3 gap-3">
        {MEAL_TYPES.map(({ key, label, emoji, color }) => {
          const count = summary
            ? key === "breakfast" ? summary.total_breakfast
            : key === "lunch"    ? summary.total_lunch
            : summary.total_dinner
            : 0;
          return (
            <div key={key} className={cn("rounded-2xl border-2 p-4 text-center", color)}>
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-4xl font-black tabular-nums">{summaryLoading ? "—" : count}</div>
              <div className="text-sm font-medium mt-1">{label}</div>
              <div className="text-xs opacity-70 mt-0.5">{t.kitchen.personsUnit}</div>
            </div>
          );
        })}
      </div>

      {/* Guest meals + total */}
      {!summaryLoading && summary && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-rose-50 border-rose-200">
            <CardContent className="p-4 text-center">
              <p className="text-xs font-medium text-rose-700">{t.kitchen.guestMeals}</p>
              <p className="text-3xl font-black text-rose-800 mt-1">{summary.total_guest}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-xs font-medium text-primary/80">{t.kitchen.totalMealsToday}</p>
              <p className="text-3xl font-black text-primary mt-1">
                {summary.total_breakfast + summary.total_lunch + summary.total_dinner + summary.total_guest}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Member list for today */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t.kitchen.memberMealList}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : !members || members.length === 0 ? (
            <EmptyState
              icon={<Utensils className="h-7 w-7" />}
              title={t.kitchen.noMealsToday}
              description={t.kitchen.noMealsDesc}
            />
          ) : (
            <div className="space-y-2">
              {members.map((entry) => {
                const memberData = entry.member as {
                  id: string;
                  seat_number?: number | null;
                  user: { full_name?: string; avatar_url?: string } | null;
                } | null;
                const name = memberData?.user?.full_name ?? t.kitchen.member;

                return (
                  <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      {memberData?.seat_number && (
                        <p className="text-xs text-muted-foreground">{t.kitchen.seatNo}{memberData.seat_number}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {[
                        { label: t.kitchen.shortBreakfast, active: entry.breakfast },
                        { label: t.kitchen.shortLunch,     active: entry.lunch },
                        { label: t.kitchen.shortDinner,    active: entry.dinner },
                      ].map(({ label, active: isActive }, idx) => (
                        <Badge
                          key={idx}
                          variant={isActive ? "success" : "outline"}
                          className={cn("text-xs px-2", !isActive && "opacity-40")}
                        >
                          {label}
                        </Badge>
                      ))}
                      {(entry.guest_breakfast ?? 0) + (entry.guest_lunch ?? 0) + (entry.guest_dinner ?? 0) > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(entry.guest_breakfast ?? 0) + (entry.guest_lunch ?? 0) + (entry.guest_dinner ?? 0)} {t.kitchen.guestLabel}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Food quantity + grocery estimation */}
      {!summaryLoading && summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              {t.kitchen.estimationTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Per meal breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: t.kitchen.breakfast, count: summary.total_breakfast, icon: "🌅" },
                { label: t.kitchen.lunch,     count: summary.total_lunch,     icon: "☀️" },
                { label: t.kitchen.dinner,    count: summary.total_dinner,    icon: "🌙" },
              ].map(({ label, count, icon }) => (
                <div key={label} className="p-2 rounded-xl bg-muted/40">
                  <p className="text-base">{icon}</p>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Grocery estimates */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{t.kitchen.groceryEstimate}</p>
              {(() => {
                const lunchDinner = summary.total_lunch + summary.total_dinner + summary.total_guest;
                const totalAll = summary.total_breakfast + lunchDinner;
                if (totalAll === 0) return <p className="text-xs text-muted-foreground">{t.kitchen.noMeals}</p>;

                const rice = Math.ceil(totalAll * 0.25 * 10) / 10;
                const dal  = Math.ceil(lunchDinner * 0.1 * 10) / 10;
                const veg  = Math.ceil(lunchDinner * 0.3 * 10) / 10;
                const fish = Math.ceil(lunchDinner * 0.25 * 10) / 10;
                const oil  = Math.ceil(totalAll * 0.03 * 10) / 10;

                return (
                  <div className="space-y-1.5">
                    {[
                      { item: t.kitchen.rice,     amount: rice, icon: "🌾" },
                      { item: t.kitchen.lentils,  amount: dal,  icon: "🫘" },
                      { item: t.kitchen.vegetables, amount: veg, icon: "🥦" },
                      { item: t.kitchen.fishMeat, amount: fish, icon: "🐟" },
                      { item: t.kitchen.oil,      amount: oil,  icon: "🫙" },
                    ].map(({ item, amount, icon }) => (
                      <div key={item} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span>{icon}</span>
                          <span className="font-medium">{item}</span>
                        </span>
                        <span className="font-bold text-foreground">~{amount} {t.kitchen.kg}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      * {t.kitchen.footerNote.replace("{total}", String(totalAll))}
                    </p>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        <ChefHat className="h-3 w-3 inline mr-1" />
        {t.kitchen.autoUpdate}
      </p>
    </div>
  );
}
