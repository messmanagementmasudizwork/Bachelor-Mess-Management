"use client";
import {
  UtensilsCrossed, Wallet, Users, TrendingUp, Receipt,
  Plus, ArrowUpRight, ArrowDownRight, Minus, ChevronRight,
  Scale,
} from "lucide-react";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessStats } from "@/lib/hooks/use-mess";
import { useMembers } from "@/lib/hooks/use-members";
import { useMonthlyExpenses, useExpenseSummary } from "@/lib/hooks/use-expenses";
import { useMonthlyDeposits, useMyBalance } from "@/lib/hooks/use-deposits";
import { useMessStore } from "@/lib/stores/mess.store";
import { useMyMembership } from "@/lib/hooks/use-members";
import { useAuth } from "@/lib/hooks/use-auth";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { formatDate, getTodayString, formatMonth } from "@/lib/utils/date";
import { getInitials, cn } from "@/lib/utils";
import { getRoleBadgeColor, getRoleDisplayNameBn } from "@/lib/utils/permissions";
import Link from "next/link";
import { useDailyMealSummary, useTodayMeal, useMyMeals } from "@/lib/hooks/use-meals";
import { useMonthlyReport } from "@/lib/hooks/use-reports";
import { useRealtimeInvalidation } from "@/lib/hooks/use-realtime";
import type { MemberRole } from "@/lib/types";
import { useLanguage } from "@/lib/hooks/use-language";

export default function DashboardPage() {
  const { t } = useLanguage();
  const { formatCurrency, formatDatePref } = usePreferences();
  const { activeMess, activeMonth } = useMessStore();
  const { user } = useAuth();
  const today = getTodayString();

  const { data: stats, isLoading: statsLoading } = useMessStats(activeMess?.id);
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: expenses, isLoading: expensesLoading } = useMonthlyExpenses();
  const { data: deposits, isLoading: depositsLoading } = useMonthlyDeposits();
  const { data: myMembership } = useMyMembership();
  const { data: todayMeals } = useDailyMealSummary(today);
  const { data: myTodayMeal, isLoading: myMealLoading } = useTodayMeal(myMembership?.id);
  const { data: myMeals, isLoading: myMealsLoading } = useMyMeals(myMembership?.id);

  // MealMonthSummaryCard-এর মতো same formula — meals table থেকে সরাসরি
  const myMonthActualTotal = (() => {
    if (!myMeals) return 0;
    const monthMeals = myMeals.filter((m) => m.date.startsWith(activeMonth));
    const pastAndToday = monthMeals.filter((m) => m.date <= today);
    const b = pastAndToday.filter((m) => m.breakfast).length;
    const l = pastAndToday.filter((m) => m.lunch).length;
    const d = pastAndToday.filter((m) => m.dinner).length;
    return b + l + d;
  })();
  const { data: expenseSummary } = useExpenseSummary();
  const { data: report, isLoading: reportLoading } = useMonthlyReport(activeMonth);
  const { data: myBalance, isLoading: balanceLoading } = useMyBalance(myMembership?.id);

  useRealtimeInvalidation({ table: "meal_logs", queryKeys: [["meal-summary", today], ["mess-stats", activeMess?.id]], channelSuffix: ":dashboard" });
  useRealtimeInvalidation({ table: "bazaar_entries", queryKeys: [["monthly-expenses"], ["expense-summary"]], channelSuffix: ":dashboard" });
  useRealtimeInvalidation({ table: "expenses", queryKeys: [["monthly-expenses"], ["expense-summary"]], channelSuffix: ":dashboard2" });
  useRealtimeInvalidation({ table: "deposits", queryKeys: [["monthly-deposits"], ["member-balances"]], channelSuffix: ":dashboard" });

  const recentExpenses = expenses?.slice(0, 5) ?? [];
  const recentDeposits = deposits?.slice(0, 4) ?? [];

  const myReport = report?.members.find((m) => m.member_id === myMembership?.id);
  const mealRate = report?.meal_rate ?? 0;

  const balanceValue = typeof myBalance === "number"
    ? myBalance
    : myReport?.balance ?? null;

  const balanceStatus =
    balanceValue == null ? "unknown"
    : balanceValue > 0 ? "advance"
    : balanceValue < 0 ? "due"
    : "clear";

  const categoryLabel: Record<string, string> = {
    bazaar: t.dashboard.categories.bazaar,
    rent: t.dashboard.categories.rent,
    electricity: t.dashboard.categories.electricity,
    wifi: t.dashboard.categories.wifi,
    gas: t.dashboard.categories.gas,
    maid_salary: t.dashboard.categories.maid,
    maintenance: t.dashboard.categories.maintenance,
    other: t.dashboard.categories.other,
  };
  const categoryColor: Record<string, string> = {
    bazaar: "bg-green-100 text-green-700",
    rent: "bg-blue-100 text-blue-700",
    electricity: "bg-yellow-100 text-yellow-700",
    wifi: "bg-cyan-100 text-cyan-700",
    gas: "bg-orange-100 text-orange-700",
    maid_salary: "bg-pink-100 text-pink-700",
    maintenance: "bg-slate-100 text-slate-700",
    other: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t.dashboard.todaySummary}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDatePref(today)} — {activeMess?.name}
          </p>
        </div>
        <Link href="/dashboard/bazaar">
          <Button size="sm" className="hidden sm:flex gap-1">
            <Plus className="h-4 w-4" />
            {t.dashboard.addBazaar}
          </Button>
        </Link>
      </div>

      {/* My role badge */}
      {myMembership && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t.dashboard.yourRole}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRoleBadgeColor(myMembership.role as MemberRole)}`}>
            {getRoleDisplayNameBn(myMembership.role as MemberRole)}
          </span>
        </div>
      )}

      {/* Stats Grid — 2×2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t.dashboard.myMonthMeals}
          value={myMealsLoading ? "—" : `${myMonthActualTotal} ${t.dashboard.mealUnit}`}
          subtitle={
            myMealLoading
              ? t.loading
              : `${t.today}: ${myTodayMeal?.breakfast ? t.dashboard.breakfast + " ✓" : t.dashboard.breakfast + " ✗"} | ${myTodayMeal?.lunch ? t.dashboard.lunch + " ✓" : t.dashboard.lunch + " ✗"} | ${myTodayMeal?.dinner ? t.dashboard.dinner + " ✓" : t.dashboard.dinner + " ✗"}`
          }
          icon={<UtensilsCrossed className="h-5 w-5" />}
          color="blue"
          loading={myMealsLoading}
        />
        <StatsCard
          title={t.dashboard.mealRate}
          value={reportLoading ? "—" : mealRate > 0 ? formatCurrency(mealRate) : t.dashboard.noCalculation}
          subtitle={`${formatMonth(activeMonth)}`}
          icon={<Scale className="h-5 w-5" />}
          color="purple"
          loading={reportLoading}
        />
        <StatsCard
          title={t.dashboard.monthlyExpense}
          value={statsLoading ? "—" : formatCurrency(stats?.monthly_expense ?? 0)}
          subtitle={`${t.dashboard.variable}: ${formatCurrency(expenseSummary?.total_variable ?? 0)}`}
          icon={<Receipt className="h-5 w-5" />}
          color="amber"
          loading={statsLoading}
        />
        <StatsCard
          title={t.dashboard.myBalance}
          value={
            balanceLoading || reportLoading
              ? "—"
              : balanceValue != null
              ? formatCurrency(Math.abs(balanceValue))
              : "—"
          }
          subtitle={
            balanceStatus === "advance" ? t.dashboard.advanceDeposit
            : balanceStatus === "due" ? t.dashboard.amountDue
            : balanceStatus === "clear" ? t.clear_balance
            : t.dashboard.noBalanceData
          }
          icon={
            balanceStatus === "due"
              ? <ArrowDownRight className="h-5 w-5" />
              : balanceStatus === "advance"
              ? <ArrowUpRight className="h-5 w-5" />
              : <Wallet className="h-5 w-5" />
          }
          color={
            balanceStatus === "advance" ? "green"
            : balanceStatus === "due" ? "red"
            : "default"
          }
          loading={balanceLoading || reportLoading}
        />
      </div>

      {/* Today's meal summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t.dashboard.todayMealList}</CardTitle>
              <CardDescription>{formatDatePref(today)}</CardDescription>
            </div>
            <Link href="/dashboard/meals">
              <Button variant="outline" size="sm">{t.viewAll}</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t.dashboard.breakfast, count: todayMeals?.total_breakfast ?? 0, color: "bg-amber-100 text-amber-700" },
              { label: t.dashboard.lunch, count: todayMeals?.total_lunch ?? 0, color: "bg-blue-100 text-blue-700" },
              { label: t.dashboard.dinner, count: todayMeals?.total_dinner ?? 0, color: "bg-indigo-100 text-indigo-700" },
            ].map((meal) => (
              <div key={meal.label} className={`rounded-xl p-4 text-center ${meal.color}`}>
                <p className="text-2xl font-bold">{meal.count}</p>
                <p className="text-xs font-medium mt-1">{meal.label}</p>
              </div>
            ))}
          </div>

          {/* Meal rate info bar */}
          {mealRate > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
              <span className="text-xs text-muted-foreground">
                {t.dashboard.thisMonthMealRate}
              </span>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(mealRate)} {t.perMeal}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My monthly summary (member view) */}
      {myReport && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t.dashboard.myMonthlyAccount.replace("{month}", formatMonth(activeMonth))}
              </CardTitle>
              <Link href="/dashboard/reports">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  {t.details} <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-background p-3 text-center">
                <p className="text-lg font-bold">{myReport.meal_summary.total_meals}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.dashboard.totalMeals}</p>
              </div>
              <div className="rounded-xl bg-background p-3 text-center">
                <p className="text-lg font-bold">{formatCurrency(myReport.total_cost)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.dashboard.totalCost}</p>
              </div>
              <div className="rounded-xl bg-background p-3 text-center">
                <p className="text-lg font-bold">{formatCurrency(myReport.deposited)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.dashboard.deposit}</p>
              </div>
              <div className={cn(
                "rounded-xl p-3 text-center",
                myReport.balance > 0 ? "bg-green-100 text-green-700"
                : myReport.balance < 0 ? "bg-red-100 text-red-700"
                : "bg-background text-foreground"
              )}>
                <p className="text-lg font-bold">
                  {myReport.balance >= 0 ? "+" : ""}{formatCurrency(myReport.balance)}
                </p>
                <p className="text-xs mt-0.5 font-medium">
                  {myReport.status === "advance" ? t.advance : myReport.status === "due" ? t.due : t.clear_balance}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom grid: Members + Recent Expenses */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Members */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.dashboard.memberList}</CardTitle>
              <Link href="/dashboard/members">
                <Button variant="outline" size="sm">{t.viewAll}</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {membersLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))
              : members?.slice(0, 5).map((member) => {
                  const userProfile = member.user as { full_name?: string; avatar_url?: string } | null;
                  return (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={userProfile?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(userProfile?.full_name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{userProfile?.full_name ?? t.unknown}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.seat_number ? `${t.members.seatNo}${member.seat_number}` : t.deposits.memberLabel}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRoleBadgeColor(member.role as MemberRole)}`}>
                        {getRoleDisplayNameBn(member.role as MemberRole)}
                      </span>
                    </div>
                  );
                })}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.dashboard.recentExpenses}</CardTitle>
              <Link href="/dashboard/expenses">
                <Button variant="outline" size="sm">{t.viewAll}</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {expensesLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))
              : recentExpenses.length === 0
              ? (
                <div className="text-center py-6">
                  <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t.dashboard.noExpenses}</p>
                </div>
              )
              : recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold flex-shrink-0 ${categoryColor[expense.category] ?? "bg-gray-100 text-gray-700"}`}>
                      {categoryLabel[expense.category]?.charAt(0) ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(expense.date, "d MMM")}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(Number(expense.amount))}
                    </span>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Deposits */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t.dashboard.recentDeposits}</CardTitle>
            <Link href="/dashboard/deposits">
              <Button variant="outline" size="sm">{t.viewAll}</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {depositsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : recentDeposits.length === 0 ? (
            <div className="text-center py-6">
              <Wallet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t.dashboard.noDeposits}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {recentDeposits.map((deposit) => {
                const memberUser = (deposit.member as { user?: { full_name?: string; avatar_url?: string } } | null)?.user;
                return (
                  <div key={deposit.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarImage src={memberUser?.avatar_url} />
                      <AvatarFallback className="text-xs bg-green-100 text-green-700">
                        {getInitials(memberUser?.full_name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{memberUser?.full_name ?? t.unknown}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(deposit.date, "d MMM")}</p>
                    </div>
                    <span className="text-sm font-bold text-green-700">
                      +{formatCurrency(Number(deposit.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
