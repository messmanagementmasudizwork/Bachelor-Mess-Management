"use client";
import { useState } from "react";
import {
  BarChart3, RefreshCw, Save, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, Coffee, Sun, Moon,
  Users, Wallet, Receipt, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyReport, useMySnapshots, useSaveSnapshot } from "@/lib/hooks/use-reports";
import { useMyMembership } from "@/lib/hooks/use-members";
import { useMessStore } from "@/lib/stores/mess.store";
import { useLanguage } from "@/lib/hooks/use-language";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { formatMonth, prevMonth, nextMonth, getTodayString } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

type SnapshotRow = {
  month: string;
  total_meals: number;
  total_breakfast: number;
  total_lunch: number;
  total_dinner: number;
  total_guest_meals: number;
  meal_rate: number;
  meal_cost: number;
  fixed_share: number;
  guest_charges: number;
  total_cost: number;
  total_deposited: number;
  balance: number;
  status: string;
  generated_at: string;
};

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className={cn("rounded-xl p-3 border", color ?? "bg-muted/40 border-border")}>
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function MealRow({ icon, label, count, color }: {
  icon: React.ReactNode; label: string; count: number; color: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full", color)}>
        {count}
      </span>
    </div>
  );
}

function FinanceRow({ label, value, highlight }: {
  label: string; value: string; highlight?: "green" | "red" | "blue";
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold",
        highlight === "green" && "text-green-600",
        highlight === "red" && "text-red-500",
        highlight === "blue" && "text-blue-600",
      )}>
        {value}
      </span>
    </div>
  );
}

function SnapshotView({ data, t }: { data: SnapshotRow; t: ReturnType<typeof useLanguage>["t"] }) {
  const { formatCurrency } = usePreferences();
  const attendance = data.total_meals > 0
    ? Math.round(((data.total_breakfast + data.total_lunch + data.total_dinner) / (data.total_meals || 1)) * 100)
    : 0;

  const balanceColor = data.balance > 0 ? "green" : data.balance < 0 ? "red" : undefined;
  const statusLabel = data.status === "advance"
    ? t.myReport.advance
    : data.status === "due"
    ? t.myReport.due
    : t.myReport.clear;
  const statusColor = data.status === "advance"
    ? "bg-green-100 text-green-700"
    : data.status === "due"
    ? "bg-red-100 text-red-600"
    : "bg-gray-100 text-gray-600";

  return (
    <div className="space-y-4">
      {/* Top stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label={t.myReport.totalMeals}
          value={String(data.total_meals)}
          color="bg-blue-50 border-blue-200 text-blue-900"
        />
        <StatCard
          label={t.myReport.mealCost}
          value={formatCurrency(Math.round(data.meal_cost))}
          color="bg-orange-50 border-orange-200 text-orange-900"
        />
        <div className={cn("rounded-xl p-3 border", statusColor.replace("text-", "border-").replace("700", "200").replace("600", "200"))}>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t.myReport.balance}</p>
          <p className={cn("text-xl font-bold mt-0.5",
            data.balance > 0 ? "text-green-700" : data.balance < 0 ? "text-red-600" : "text-gray-600"
          )}>
            {data.balance > 0 ? "+" : ""}{formatCurrency(Math.round(Math.abs(data.balance)))}
          </p>
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", statusColor)}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Meal breakdown */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {t.myReport.mealBreakdown}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <MealRow
              icon={<Coffee className="h-3.5 w-3.5 text-amber-500" />}
              label={t.meals.breakfast}
              count={data.total_breakfast}
              color="bg-amber-50 text-amber-700"
            />
            <MealRow
              icon={<Sun className="h-3.5 w-3.5 text-blue-500" />}
              label={t.meals.lunch}
              count={data.total_lunch}
              color="bg-blue-50 text-blue-700"
            />
            <MealRow
              icon={<Moon className="h-3.5 w-3.5 text-indigo-500" />}
              label={t.meals.dinner}
              count={data.total_dinner}
              color="bg-indigo-50 text-indigo-700"
            />
            <MealRow
              icon={<Users className="h-3.5 w-3.5 text-purple-500" />}
              label={t.myReport.guestMeals}
              count={data.total_guest_meals}
              color="bg-purple-50 text-purple-700"
            />
          </CardContent>
        </Card>

        {/* Financial breakdown */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4 text-green-600" />
              {t.myReport.financialSummary}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <FinanceRow label={t.myReport.mealRate} value={`৳${data.meal_rate.toFixed(2)}`} />
            <FinanceRow label={t.myReport.mealCost} value={`৳${Math.round(data.meal_cost)}`} highlight="blue" />
            <FinanceRow label={t.myReport.fixedShare} value={`৳${Math.round(data.fixed_share)}`} />
            <FinanceRow label={t.myReport.guestCharges} value={`৳${Math.round(data.guest_charges)}`} />
            <FinanceRow label={t.myReport.totalCost} value={`৳${Math.round(data.total_cost)}`} highlight="red" />
            <FinanceRow label={t.myReport.deposited} value={`৳${Math.round(data.total_deposited)}`} highlight="green" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SnapshotSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

export default function MyReportPage() {
  const { t } = useLanguage();
  const { formatCurrency } = usePreferences();
  const { activeMonth } = useMessStore();
  const { data: myMembership } = useMyMembership();
  const [viewMonth, setViewMonth] = useState(activeMonth);

  const today = getTodayString();
  const currentMonth = today.slice(0, 7);
  const isCurrentMonth = viewMonth === currentMonth;

  const memberId = myMembership?.id;

  const { data: liveReport, isLoading: liveLoading } = useMonthlyReport(viewMonth);
  const { data: snapshots, isLoading: snapshotsLoading } = useMySnapshots(memberId);
  const saveSnapshot = useSaveSnapshot();

  const myLiveData = liveReport?.members.find((m) => m.member_id === memberId);
  const snapshot = snapshots?.find((s) => s.month === viewMonth) ?? null;

  const showLive = isCurrentMonth;
  const isLoading = showLive ? liveLoading : snapshotsLoading;

  const handleSave = () => {
    if (!memberId) return;
    saveSnapshot.mutate({ memberId, month: viewMonth });
  };

  const displayData: SnapshotRow | null = showLive
    ? myLiveData
      ? {
          month: viewMonth,
          total_meals: myLiveData.meal_summary.total_meals,
          total_breakfast: myLiveData.meal_summary.total_breakfast,
          total_lunch: myLiveData.meal_summary.total_lunch,
          total_dinner: myLiveData.meal_summary.total_dinner,
          total_guest_meals: myLiveData.meal_summary.total_guest_meals,
          meal_rate: liveReport?.meal_rate ?? 0,
          meal_cost: myLiveData.meal_cost,
          fixed_share: myLiveData.fixed_cost_share,
          guest_charges: myLiveData.guest_charge,
          total_cost: myLiveData.total_cost,
          total_deposited: myLiveData.deposited,
          balance: myLiveData.balance,
          status: myLiveData.status,
          generated_at: new Date().toISOString(),
        }
      : null
    : snapshot;

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/20 p-2.5">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{t.myReport.pageTitle}</h1>
            <p className="text-xs text-purple-100 leading-tight">{t.myReport.pageSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2.5">
        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => setViewMonth(prevMonth(viewMonth))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-center">
          <p className="text-sm font-semibold">{formatMonth(viewMonth)}</p>
          {isCurrentMonth && (
            <Badge variant="secondary" className="text-[10px] mt-0.5">
              {t.myReport.currentMonth}
            </Badge>
          )}
        </div>

        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => setViewMonth(nextMonth(viewMonth))}
          disabled={viewMonth >= currentMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Data source badge + save button */}
      <div className="flex items-center justify-between">
        <Badge variant={isCurrentMonth ? "default" : "secondary"} className="text-xs gap-1">
          {isCurrentMonth
            ? <><TrendingUp className="h-3 w-3" /> {t.myReport.liveData}</>
            : <><Clock className="h-3 w-3" /> {t.myReport.savedSnapshot}</>
          }
        </Badge>

        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1.5"
          onClick={handleSave}
          disabled={saveSnapshot.isPending || !memberId || !displayData}
        >
          {saveSnapshot.isPending
            ? <><RefreshCw className="h-3 w-3 animate-spin" /> {t.myReport.generating}</>
            : snapshot
            ? <><RefreshCw className="h-3 w-3" /> {t.myReport.refreshSnapshot}</>
            : <><Save className="h-3 w-3" /> {t.myReport.generateSnapshot}</>
          }
        </Button>
      </div>

      {/* Main content */}
      {isLoading ? (
        <SnapshotSkeleton />
      ) : displayData ? (
        <SnapshotView data={displayData} t={t} />
      ) : !isCurrentMonth && !snapshot ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Wallet className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
            <p className="font-medium text-sm">{t.myReport.noSnapshotYet}</p>
            <p className="text-xs text-muted-foreground">{t.myReport.generateHint}</p>
            <Button
              onClick={handleSave}
              disabled={saveSnapshot.isPending || !memberId}
              className="mt-2"
            >
              {saveSnapshot.isPending
                ? t.myReport.generating
                : t.myReport.generateSnapshot}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">{t.myReport.noData}</p>
          </CardContent>
        </Card>
      )}

      {/* Previous months list */}
      {snapshots && snapshots.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">{t.myReport.previousMonths}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {snapshots.map((s) => (
                <button
                  key={s.month}
                  onClick={() => setViewMonth(s.month)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-3 py-2.5 border text-sm transition-colors",
                    viewMonth === s.month
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "hover:bg-muted/60 border-border"
                  )}
                >
                  <span className="font-medium">{formatMonth(s.month)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{s.total_meals} মিল</span>
                    <span className={cn("text-xs font-bold",
                      s.balance > 0 ? "text-green-600" : s.balance < 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {s.balance > 0 ? "+" : ""}{formatCurrency(Math.round(Math.abs(s.balance)))}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
