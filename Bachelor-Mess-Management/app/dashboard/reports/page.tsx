"use client";
import { useState } from "react";
import {
  BarChart3, Download, Lock, AlertTriangle, UtensilsCrossed,
  Receipt, Wallet, TrendingUp, ChevronLeft, ChevronRight,
  FileText, Table, Users, Sparkles,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { exportReportToPDF } from "@/lib/utils/pdf-export";
import { exportReportToExcel } from "@/lib/utils/excel-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardLoader } from "@/components/shared/LoadingSpinner";
import { MemberReportCard, type MemberReportData } from "@/components/reports/MemberReportCard";
import { useMonthlyReport, useCloseMonth } from "@/lib/hooks/use-reports";
import { useMessStore } from "@/lib/stores/mess.store";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { formatMonth, prevMonth, nextMonth, getCurrentMonthString } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/lib/hooks/use-language";

export default function ReportsPage() {
  const { t } = useLanguage();
  const { formatCurrency } = usePreferences();
  const { activeMess } = useMessStore();
  const [reportMonth, setReportMonth] = useState(getCurrentMonthString());
  const [confirmClose, setConfirmClose] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const { data: report, isLoading } = useMonthlyReport(reportMonth);
  const closeMonth = useCloseMonth();

  const canCloseMonth = useHasPermission("mess.close_month");
  const isCurrentMonth = reportMonth === getCurrentMonthString();

  const handleCloseMonth = async () => {
    await closeMonth.mutateAsync({ month: reportMonth });
    setConfirmClose(false);
  };

  const mealKey = t.reports.chartKeys.meal;
  const costKey = t.reports.chartKeys.cost;
  const depositKey = t.reports.chartKeys.deposit;

  const summaryStats = report ? [
    {
      label: t.reports.totalMeals,
      value: report.total_meals ?? 0,
      unit: t.reports.mealsUnit,
      gradient: "from-blue-500 to-blue-600",
      bg: "from-blue-50 to-blue-100/60 dark:from-blue-950/40 dark:to-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      icon: <UtensilsCrossed className="h-5 w-5" />,
    },
    {
      label: t.reports.mealRate,
      value: formatCurrency(report.meal_rate ?? 0),
      unit: t.reports.mealRatePerMeal,
      gradient: "from-amber-500 to-orange-500",
      bg: "from-amber-50 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-900/20",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: t.reports.totalExpense,
      value: formatCurrency(report.total_expense ?? 0),
      unit: "",
      gradient: "from-red-500 to-rose-500",
      bg: "from-red-50 to-rose-50/60 dark:from-red-950/40 dark:to-rose-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-300",
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      label: t.reports.totalDeposit,
      value: formatCurrency(report.total_deposited ?? 0),
      unit: "",
      gradient: "from-green-500 to-emerald-500",
      bg: "from-green-50 to-emerald-50/60 dark:from-green-950/40 dark:to-emerald-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-700 dark:text-green-300",
      icon: <Wallet className="h-5 w-5" />,
    },
  ] : [];

  const memberChartData = report?.members?.map((m: MemberReportData) => ({
    name: m.member_name.split(" ")[0],
    [mealKey]: m.meal_summary?.total_meals ?? 0,
    [costKey]: Math.round(m.total_cost),
    [depositKey]: Math.round(m.deposited),
  })) ?? [];

  const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
    rent:         { label: t.reports.categories.rent,         icon: "🏠", color: "bg-blue-500"   },
    electricity:  { label: t.reports.categories.electricity,  icon: "⚡", color: "bg-yellow-500" },
    wifi:         { label: t.reports.categories.wifi,         icon: "📶", color: "bg-cyan-500"   },
    gas:          { label: t.reports.categories.gas,          icon: "🔥", color: "bg-red-500"    },
    maid_salary:  { label: t.reports.categories.maid_salary,  icon: "🧹", color: "bg-pink-500"   },
    maintenance:  { label: t.reports.categories.maintenance,  icon: "🔧", color: "bg-slate-500"  },
    utilities:    { label: t.reports.categories.utilities,    icon: "💧", color: "bg-teal-500"   },
    bazaar:       { label: t.reports.categories.bazaar,       icon: "🛒", color: "bg-green-500"  },
    other:        { label: t.reports.categories.other,        icon: "📦", color: "bg-gray-500"   },
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {report && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            disabled={exportingExcel}
            onClick={async () => {
              setExportingExcel(true);
              try {
                await exportReportToExcel(report, formatMonth(reportMonth), activeMess?.name ?? "Mess", reportMonth);
                toast.success("Excel downloaded!");
              } finally { setExportingExcel(false); }
            }}
          >
            <Table className="h-3.5 w-3.5" />
            {exportingExcel ? "..." : "Excel"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await exportReportToPDF(report, formatMonth(reportMonth), activeMess?.name ?? "Mess", reportMonth);
              } finally { setExporting(false); }
            }}
          >
            <FileText className="h-3.5 w-3.5" />
            {exporting ? "..." : "PDF"}
          </Button>
        </div>
      )}

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setReportMonth(prevMonth(reportMonth))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border bg-background shadow-sm hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 rounded-2xl border bg-gradient-to-r from-primary/5 to-primary/10 px-5 py-2 shadow-sm min-w-[180px] justify-center">
          <h2 className="text-base font-bold tracking-tight">{formatMonth(reportMonth)}</h2>
          {report?.is_closed && (
            <Badge variant="secondary" className="gap-1 text-[10px] py-0">
              <Lock className="h-2.5 w-2.5" />
              {t.reports.closedBadge}
            </Badge>
          )}
        </div>

        <button
          onClick={() => setReportMonth(nextMonth(reportMonth))}
          disabled={reportMonth >= getCurrentMonthString()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border bg-background shadow-sm hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <CardLoader />
      ) : !report ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-medium text-muted-foreground">{t.reports.noData}</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="summary">
          <TabsList className="w-full grid grid-cols-4 h-10">
            <TabsTrigger value="summary" className="text-xs font-medium">
              {t.reports.tabs.summary}
            </TabsTrigger>
            <TabsTrigger value="chart" className="text-xs font-medium gap-1">
              <BarChart3 className="h-3 w-3" />
              {t.reports.tabs.charts}
            </TabsTrigger>
            <TabsTrigger value="members" className="text-xs font-medium gap-1">
              <Users className="h-3 w-3" />
              {t.reports.tabs.members}
              {report.members.some((m: MemberReportData) => m.status === "due") && (
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs font-medium gap-1">
              <Sparkles className="h-3 w-3" />
              {t.reports.tabs.analysis}
            </TabsTrigger>
          </TabsList>

          {/* ── Summary Tab ── */}
          <TabsContent value="summary" className="space-y-4 mt-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {summaryStats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-4 bg-gradient-to-br",
                    stat.bg, stat.border
                  )}
                >
                  <div className={cn(
                    "mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                    stat.gradient
                  )}>
                    {stat.icon}
                  </div>
                  <p className={cn("text-[11px] font-medium mb-0.5", stat.text)}>{stat.label}</p>
                  <p className="text-xl font-extrabold text-foreground leading-none">
                    {stat.value}
                    {stat.unit && (
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">{stat.unit}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            {/* Expense breakdown */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  {t.reports.expenseBreakdown}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-1 rounded-full bg-orange-400" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">{t.reports.variableExpense}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t.reports.mealRateDistributed}</p>
                      </div>
                    </div>
                    <p className="text-base font-bold text-orange-600">{formatCurrency(report.total_variable_expense)}</p>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-1 rounded-full bg-purple-400" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">{t.reports.fixedExpenseLabel}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t.reports.equallyDistributed}</p>
                      </div>
                    </div>
                    <p className="text-base font-bold text-purple-600">{formatCurrency(report.total_fixed_expense)}</p>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5 bg-muted/30">
                    <p className="text-sm font-semibold">{t.reports.totalDepositMinusCost}</p>
                    <p className={cn(
                      "text-base font-extrabold",
                      report.total_deposited - report.total_expense >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {report.total_deposited - report.total_expense >= 0 ? "+" : ""}
                      {formatCurrency(report.total_deposited - report.total_expense)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Close month */}
            {canCloseMonth && isCurrentMonth && !report.is_closed && (
              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20">
                <CardContent className="p-4">
                  {!confirmClose ? (
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900">
                        <Lock className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t.reports.closeMonth}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{t.reports.closeMonthConfirm}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 h-8 border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-200"
                          onClick={() => setConfirmClose(true)}
                        >
                          <Lock className="h-3.5 w-3.5" />
                          {t.reports.closeMonth}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        {t.reports.confirmCloseMonth.replace("{month}", formatMonth(reportMonth))}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => setConfirmClose(false)}>
                          {t.reports.cancelBtn}
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-9 bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={handleCloseMonth}
                          disabled={closeMonth.isPending}
                        >
                          {t.reports.confirmBtn}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {report.is_closed && (
              <div className="flex items-center gap-2.5 rounded-2xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 shrink-0" />
                {t.reports.monthClosed}
              </div>
            )}
          </TabsContent>

          {/* ── Chart Tab ── */}
          <TabsContent value="chart" className="space-y-4 mt-4">
            {memberChartData.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  {t.reports.noChartData}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2 border-b bg-muted/30">
                    <CardTitle className="text-sm">{t.reports.memberMealsChart}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={memberChartData} margin={{ top: 4, right: 8, left: -24, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid hsl(var(--border))" }}
                          cursor={{ fill: "hsl(var(--muted))" }}
                        />
                        <Bar dataKey={mealKey} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 border-b bg-muted/30">
                    <CardTitle className="text-sm">{t.reports.expenseVsDeposit}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={memberChartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid hsl(var(--border))" }}
                          cursor={{ fill: "hsl(var(--muted))" }}
                          formatter={(value: number, name: string) => [`৳${value}`, name]}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey={costKey} fill="#f87171" radius={[6, 6, 0, 0]} />
                        <Bar dataKey={depositKey} fill="#4ade80" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Expense type breakdown */}
                <Card>
                  <CardHeader className="pb-2 border-b bg-muted/30">
                    <CardTitle className="text-sm">{t.reports.expenseType}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {[
                      { label: t.reports.variableExpense, value: report.total_variable_expense, total: report.total_expense, color: "bg-orange-500" },
                      { label: t.reports.fixedExpenseLabel, value: report.total_fixed_expense, total: report.total_expense, color: "bg-purple-500" },
                    ].map(({ label, value, total, color }) => {
                      const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                      return (
                        <div key={label} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">{label}</span>
                            <span className="text-muted-foreground">{formatCurrency(value)} <span className="text-[10px]">({pct}%)</span></span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Category breakdown */}
                {report.expense_summary?.by_category && Object.keys(report.expense_summary.by_category).length > 0 && (() => {
                  const cats = Object.entries(report.expense_summary.by_category as Record<string, number>).sort((a, b) => b[1] - a[1]);
                  const maxVal = cats[0]?.[1] ?? 1;
                  return (
                    <Card>
                      <CardHeader className="pb-2 border-b bg-muted/30">
                        <CardTitle className="text-sm">{t.reports.categoryExpense}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3">
                        {cats.map(([cat, amount]) => {
                          const meta = CATEGORY_META[cat] ?? { label: cat, icon: "📦", color: "bg-gray-500" };
                          const pct = Math.round((amount / maxVal) * 100);
                          const totalPct = report.total_expense > 0 ? Math.round((amount / report.total_expense) * 100) : 0;
                          return (
                            <div key={cat} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span>{meta.icon}</span>
                                  <span>{meta.label}</span>
                                </span>
                                <span className="text-muted-foreground">
                                  {formatCurrency(amount)} <span className="text-[10px]">({totalPct}%)</span>
                                </span>
                              </div>
                              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full ${meta.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })()}
              </>
            )}
          </TabsContent>

          {/* ── Members Tab ── */}
          <TabsContent value="members" className="space-y-3 mt-4">
            {/* Meta bar */}
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground">
                {t.reports.mealRate}:{" "}
                <strong className="text-foreground">{formatCurrency(report.meal_rate)}</strong>
                {t.reports.mealRatePerMeal}
              </span>
              <div className="flex items-center gap-2">
                {report.members.filter((m: MemberReportData) => m.status === "due").length > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {t.reports.dueLabel}: {report.members.filter((m: MemberReportData) => m.status === "due").length}
                  </span>
                )}
                {report.members.filter((m: MemberReportData) => m.status === "advance").length > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {t.reports.advanceLabel}: {report.members.filter((m: MemberReportData) => m.status === "advance").length}
                  </span>
                )}
              </div>
            </div>

            {report.members.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">{t.reports.noMembers}</CardContent>
              </Card>
            ) : (
              report.members.map((member: MemberReportData) => (
                <MemberReportCard key={member.member_id} member={member} />
              ))
            )}
          </TabsContent>

          {/* ── Insights Tab ── */}
          <TabsContent value="insights" className="space-y-4 mt-4">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  {t.reports.budgetAnalysis.replace("{month}", formatMonth(reportMonth))}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {(() => {
                  const totalExp = report.total_expense;
                  const totalDep = report.members.reduce((s: number, m: MemberReportData) => s + m.deposited, 0);
                  const balance = totalDep - totalExp;
                  const memberCount = report.members.length || 1;
                  const avgCostPerMember = totalExp / memberCount;
                  const avgDepPerMember = totalDep / memberCount;
                  const mealRate = report.meal_rate;
                  const totalMeals = report.total_meals;
                  const dueCount = report.members.filter((m: MemberReportData) => m.status === "due").length;
                  const advCount = report.members.filter((m: MemberReportData) => m.status === "advance").length;
                  const depositCoverage = totalExp > 0 ? Math.round((totalDep / totalExp) * 100) : 100;

                  return (
                    <>
                      {/* Balance status banner */}
                      <div className={cn(
                        "flex items-center gap-3.5 rounded-2xl border p-4",
                        balance >= 0
                          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 dark:from-green-950/30 dark:to-emerald-950/20 dark:border-green-800"
                          : "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 dark:from-red-950/30 dark:to-rose-950/20 dark:border-red-800"
                      )}>
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl",
                          balance >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"
                        )}>
                          {balance >= 0 ? "✅" : "⚠️"}
                        </div>
                        <div>
                          <p className={cn("text-sm font-bold", balance >= 0 ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200")}>
                            {balance >= 0 ? t.reports.budgetGood : t.reports.budgetDeficit}
                          </p>
                          <p className={cn("text-xs mt-0.5", balance >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
                            {balance >= 0
                              ? t.reports.surplus.replace("{amount}", formatCurrency(balance))
                              : t.reports.deficit.replace("{amount}", formatCurrency(Math.abs(balance)))}
                          </p>
                        </div>
                      </div>

                      {/* Key metric grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { label: t.reports.avgCostPerMember,    value: formatCurrency(avgCostPerMember), icon: "💸" },
                          { label: t.reports.avgDepositPerMember, value: formatCurrency(avgDepPerMember),  icon: "💰" },
                          { label: t.reports.depositCoverageLabel, value: `${depositCoverage}%`,           icon: "📊" },
                          { label: t.reports.mealRate,            value: formatCurrency(mealRate),         icon: "🍽️" },
                        ].map(({ label, value, icon }) => (
                          <div key={label} className="flex flex-col items-center rounded-2xl border bg-muted/30 p-3 text-center gap-1">
                            <span className="text-xl">{icon}</span>
                            <p className="text-base font-extrabold text-foreground">{value}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Coverage progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{t.reports.depositCoverageLabel}</span>
                          <span className={depositCoverage >= 100 ? "text-green-600" : "text-red-600"}>{depositCoverage}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              depositCoverage >= 100 ? "bg-green-500" : depositCoverage >= 80 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.min(depositCoverage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Insight bullets */}
                      <div className="rounded-2xl border bg-muted/20 p-3.5 space-y-2">
                        {[
                          { icon: "👥", text: t.reports.memberInsightLine.replace("{count}", String(memberCount)).replace("{due}", String(dueCount)).replace("{advance}", String(advCount)) },
                          { icon: "🍽️", text: t.reports.totalMealsLine.replace("{count}", String(totalMeals)) },
                          { icon: "💡", text: `${t.reports.mealRateLine} ` },
                        ].map(({ icon, text }, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="shrink-0">{icon}</span>
                            <span>
                              {text}
                              {i === 2 && <strong className="text-foreground ml-0.5">{formatCurrency(mealRate)}</strong>}
                            </span>
                          </div>
                        ))}
                        {depositCoverage < 100 && (
                          <div className="flex items-start gap-2 text-xs text-red-600 font-medium">
                            <span className="shrink-0">⚠️</span>
                            <span>{t.reports.deficitWarning}</span>
                          </div>
                        )}
                        {depositCoverage >= 100 && balance > 0 && (
                          <div className="flex items-start gap-2 text-xs text-green-600 font-medium">
                            <span className="shrink-0">✅</span>
                            <span>{t.reports.surplusNote.replace("{amount}", formatCurrency(balance))}</span>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
