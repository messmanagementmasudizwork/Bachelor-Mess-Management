"use client";
import { useState, useMemo } from "react";
import { Plus, Receipt, Check, X, ChevronDown, ChevronUp, BarChart2, History, ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardLoader } from "@/components/shared/LoadingSpinner";
import {
  useMonthlyExpenses,
  useCreateExpense,
  useExpenseSummary,
  useApproveExpense,
  useDeleteExpense,
} from "@/lib/hooks/use-expenses";
import { useMessStore } from "@/lib/stores/mess.store";
import { MonthFreezeAlert } from "@/components/shared/MonthFreezeAlert";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { createExpenseSchema, type CreateExpenseInput } from "@/lib/validations/expense.schema";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { formatDate, getTodayString, formatTimestamp } from "@/lib/utils/date";
import { auditService } from "@/lib/services/audit.service";
import { storageService } from "@/lib/services/storage.service";
import { FileUpload } from "@/components/shared/ImageUpload";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/hooks/use-language";

const STATUS_FILTER = ["all", "approved", "pending"] as const;
type StatusFilter = typeof STATUS_FILTER[number];

export default function ExpensesPage() {
  const { t } = useLanguage();
  const { formatCurrency } = usePreferences();
  const { activeMess } = useMessStore();
  const { data: expenses, isLoading } = useMonthlyExpenses();
  const { data: summary } = useExpenseSummary();
  const createExpense = useCreateExpense();
  const approveExpense = useApproveExpense();
  const deleteExpense = useDeleteExpense();

  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [auditExpenseId, setAuditExpenseId] = useState<string | null>(null);

  const canApproveExpense = useHasPermission("expenses.approve");
  const canDeleteExpense = useHasPermission("expenses.delete");
  const isClosed = activeMess?.is_month_closed ?? false;

  const { data: expenseAuditLog, isLoading: auditLoading } = useQuery({
    queryKey: ["expense_audit", auditExpenseId],
    queryFn: () => auditService.getExpenseAuditLog(auditExpenseId!, activeMess!.id),
    enabled: !!auditExpenseId && !!activeMess?.id,
  });

  const { user } = useAuthStore();
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);

  // Fix: call createExpenseSchema with validation translations
  const expenseSchema = useMemo(() => createExpenseSchema(t.validation), [t.validation]);

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<CreateExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: getTodayString(), split_type: "equal", is_variable: false },
  });

  const isVariable = watch("is_variable");

  const handleReceiptUpload = async (file: File) => {
    if (!user?.id) return;
    const result = await storageService.uploadReceipt(user.id, file);
    setReceiptFile(result.url);
    setReceiptName(file.name);
    setValue("receipt_url", result.url);
  };

  const onSubmit = async (data: CreateExpenseInput) => {
    await createExpense.mutateAsync(data);
    reset({ date: getTodayString(), split_type: "equal", is_variable: false });
    setReceiptFile(null);
    setReceiptName(null);
    setOpen(false);
  };

  const filtered = expenses?.filter((e) => {
    if (statusFilter === "all") return e.status !== "rejected";
    return e.status === statusFilter;
  }) ?? [];

  const pendingCount = expenses?.filter((e) => e.status === "pending").length ?? 0;

  const EXPENSE_CATEGORIES = [
    { value: "rent", label: t.expenses.types.rent, icon: "🏠" },
    { value: "electricity", label: t.expenses.types.electricity, icon: "⚡" },
    { value: "wifi", label: t.expenses.types.internet, icon: "📶" },
    { value: "gas", label: t.expenses.types.gas, icon: "🔥" },
    { value: "maid_salary", label: t.expenses.types.maid, icon: "🧹" },
    { value: "maintenance", label: t.expenses.types.maintenance, icon: "🔧" },
    { value: "utilities", label: t.expenses.types.utility, icon: "💧" },
    { value: "other", label: t.expenses.types.other, icon: "📦" },
  ];

  const SPLIT_TYPES = [
    { value: "equal", label: t.expenses.splitTypes.equal },
    { value: "by_meal", label: t.expenses.splitTypes.byMeal },
    { value: "custom", label: t.expenses.splitTypes.custom },
  ];

  const ACTION_LABELS: Record<string, string> = {
    expense_created: t.expenses.actions.created,
    expense_approved: t.expenses.actions.approved,
    expense_rejected: t.expenses.actions.cancelled,
    expense_updated: t.expenses.actions.updated,
    expense_deleted: t.expenses.actions.deleted,
  };

  const categoryTotals = (expenses ?? []).reduce<Record<string, number>>((acc, e) => {
    if (e.status === "rejected") return acc;
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});
  const categoryData = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => ({
      cat,
      label: EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat,
      icon: EXPENSE_CATEGORIES.find((c) => c.value === cat)?.icon ?? "📦",
      total,
    }));
  const maxTotal = Math.max(...categoryData.map((d) => d.total), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Audit History Dialog */}
      <Dialog open={!!auditExpenseId} onOpenChange={(v) => !v && setAuditExpenseId(null)}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              {t.expenses.expenseHistory}
            </DialogTitle>
          </DialogHeader>
          {auditLoading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : !expenseAuditLog || expenseAuditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t.expenses.noHistory}</p>
          ) : (
            <div className="space-y-2 py-2">
              {expenseAuditLog.map((log) => {
                const u = log.user as { full_name?: string } | null;
                return (
                  <div key={log.id} className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-muted/40 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs">{ACTION_LABELS[log.action] ?? log.action}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTimestamp(log.created_at)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{u?.full_name ?? t.unknown}</span>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex justify-end">
        {!isClosed ? (
        <PermissionGate permission="expenses.create">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset({ date: getTodayString(), split_type: "equal", is_variable: false }); }}>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <Plus className="h-4 w-4" />
              {t.expenses.addExpense}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.expenses.addExpenseTitle}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              {/* Category */}
              <div className="space-y-1.5">
                <Label>{t.expenses.expenseType}</Label>
                <Select onValueChange={(v) => setValue("category", v as CreateExpenseInput["category"])}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.expenses.selectType} />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label>{t.expenses.expenseTitle}</Label>
                <Input placeholder={t.expenses.expenseTitlePlaceholder} {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label>{t.expenses.amountTaka}</Label>
                <Input
                  type="number"
                  placeholder={t.amountZero}
                  {...register("amount", { valueAsNumber: true })}
                />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label>{t.date}</Label>
                  <Input type="date" {...register("date")} />
                  {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                </div>

                <Separator />

                {/* Variable toggle */}
                <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{t.expenses.variableExpense}</p>
                    <p className="text-xs text-muted-foreground">
                      {isVariable ? t.reports.mealRateDistributed : t.reports.equallyDistributed}
                    </p>
                  </div>
                  <Switch
                    checked={!!isVariable}
                    onCheckedChange={(v) => {
                      setValue("is_variable", v);
                      setValue("split_type", v ? "by_meal" : "equal");
                    }}
                  />
                </div>

                {/* Split type */}
                <div className="space-y-1.5">
                  <Label>{t.expenses.splitMethod}</Label>
                  <Select
                    value={watch("split_type")}
                    onValueChange={(v) => setValue("split_type", v as CreateExpenseInput["split_type"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPLIT_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <Label>{t.expenses.descriptionOptional}</Label>
                  <Input placeholder={t.expenses.descriptionPlaceholder} {...register("note")} />
                </div>

                {/* Receipt Upload */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" /> {t.expenses.receiptUpload}
                  </Label>
                  <FileUpload
                    onUpload={handleReceiptUpload}
                    currentFileName={receiptName}
                    onRemove={() => { setReceiptFile(null); setReceiptName(null); setValue("receipt_url", undefined); }}
                    label={t.expenses.receiptPlaceholder}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createExpense.isPending}>
                  {createExpense.isPending ? t.expenses.savingExpense : t.expenses.saveExpense}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </PermissionGate>
        ) : null}
      </div>

      {isClosed && <MonthFreezeAlert />}

      {/* Category chart */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              {t.expenses.categoryChart}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {categoryData.map((d) => (
                <div key={d.cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span>{d.icon}</span>
                      <span className="font-medium">{d.label}</span>
                    </span>
                    <span className="font-semibold text-foreground">{formatCurrency(d.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${(d.total / maxTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-red-700">{t.expenses.totalExpense}</p>
            <p className="text-sm font-bold text-red-800 mt-1 truncate">{formatCurrency(summary?.total ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-orange-700">{t.expenses.variableLabel}</p>
            <p className="text-sm font-bold text-orange-800 mt-1 truncate">{formatCurrency(summary?.total_variable ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-blue-700">{t.expenses.fixedLabel}</p>
            <p className="text-sm font-bold text-blue-800 mt-1 truncate">{formatCurrency(summary?.total_fixed ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">{t.expenses.tabs.all}</TabsTrigger>
          <TabsTrigger value="approved" className="flex-1">{t.expenses.tabs.approved}</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 gap-1.5">
            {t.expenses.tabs.pending}
            {pendingCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {STATUS_FILTER.map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t.expenses.expenseList}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <CardLoader />
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={<Receipt className="h-7 w-7" />}
                    title={t.expenses.noExpenses}
                    description={
                      statusFilter === "pending"
                        ? t.expenses.noPendingApprovals
                        : t.expenses.noExpensesThisMonth
                    }
                    action={statusFilter === "all" ? { label: t.expenses.addExpenseBtn, onClick: () => setOpen(true) } : undefined}
                  />
                ) : (
                  <div className="space-y-2">
                    {filtered.map((expense) => {
                      const cat = EXPENSE_CATEGORIES.find((c) => c.value === expense.category);
                      const isExpanded = expandedId === expense.id;
                      const isPending = expense.status === "pending";

                      return (
                        <div
                          key={expense.id}
                          className={`rounded-xl border transition-colors ${isPending ? "border-amber-200 bg-amber-50/50" : "hover:bg-muted/30"}`}
                        >
                          <div
                            className="flex items-start gap-3 p-3 cursor-pointer"
                            onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-xl flex-shrink-0">
                              {cat?.icon ?? "📦"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold">{expense.title}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="text-xs text-muted-foreground">{formatDate(expense.date, "d MMM")}</span>
                                    <Badge variant={expense.is_variable ? "warning" : "info"} className="text-xs py-0">
                                      {expense.is_variable ? t.expenses.variableLabel : t.expenses.fixedLabel}
                                    </Badge>
                                    <Badge
                                      variant={expense.status === "approved" ? "success" : "secondary"}
                                      className="text-xs py-0"
                                    >
                                      {expense.status === "approved" ? t.expenses.tabs.approved : t.expenses.tabs.pending}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="text-base font-bold">{formatCurrency(Number(expense.amount))}</span>
                                  {isExpanded
                                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded detail + admin actions */}
                          {isExpanded && (
                            <div className="px-3 pb-3">
                              <Separator className="mb-3" />
                              <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                                <div className="flex justify-between">
                                  <span>{t.expenses.categoryLabel}</span>
                                  <span className="font-medium text-foreground">{cat?.label ?? expense.category}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{t.expenses.splitLabel}</span>
                                  <span className="font-medium text-foreground">
                                    {SPLIT_TYPES.find((s) => s.value === expense.split_type)?.label ?? expense.split_type}
                                  </span>
                                </div>
                                {expense.note && (
                                  <div className="flex justify-between">
                                    <span>{t.expenses.noteLabel}</span>
                                    <span className="font-medium text-foreground max-w-[60%] text-right">{expense.note}</span>
                                  </div>
                                )}
                              </div>

                              {/* Approve/reject — permission-gated */}
                              {canApproveExpense && isPending && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => approveExpense.mutate(expense.id)}
                                    disabled={approveExpense.isPending}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    {t.expenses.approveBtn}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 gap-1 border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => deleteExpense.mutate(expense.id)}
                                    disabled={deleteExpense.isPending}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    {t.expenses.cancelBtn}
                                  </Button>
                                </div>
                              )}
                              {(canApproveExpense || canDeleteExpense) && !isPending && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={() => setAuditExpenseId(expense.id)}
                                  >
                                    <History className="h-3.5 w-3.5" />
                                    {t.history}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => deleteExpense.mutate(expense.id)}
                                    disabled={deleteExpense.isPending}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    {t.expenses.cancelBtn}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
