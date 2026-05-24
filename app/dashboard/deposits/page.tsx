"use client";
import { useState } from "react";
import { Plus, Wallet, Check, X, ChevronDown, ChevronUp, TrendingDown, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardLoader } from "@/components/shared/LoadingSpinner";
import {
  useMonthlyDeposits,
  useCreateDeposit,
  useMemberBalances,
  usePrevMonthBalances,
  useConfirmDeposit,
  useRejectDeposit,
} from "@/lib/hooks/use-deposits";
import { useMembers } from "@/lib/hooks/use-members";
import { useMessStore } from "@/lib/stores/mess.store";
import { MonthFreezeAlert } from "@/components/shared/MonthFreezeAlert";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { createDepositSchema, type CreateDepositInput } from "@/lib/validations/deposit.schema";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { formatDate, getTodayString } from "@/lib/utils/date";
import { getInitials, cn } from "@/lib/utils";
import { useLanguage } from "@/lib/hooks/use-language";

const STATUS_TABS = ["all", "confirmed", "pending"] as const;
type StatusTab = typeof STATUS_TABS[number];

export default function DepositsPage() {
  const { t } = useLanguage();
  const { formatCurrency } = usePreferences();
  const { activeMess } = useMessStore();
  const { data: deposits, isLoading } = useMonthlyDeposits();
  const { data: balances } = useMemberBalances();
  const { data: prevBalances } = usePrevMonthBalances();
  const { data: members } = useMembers();
  const createDeposit = useCreateDeposit();
  const confirmDeposit = useConfirmDeposit();
  const rejectDeposit = useRejectDeposit();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const canAddDeposit = useHasPermission("deposits.add");
  const canApproveDeposit = useHasPermission("deposits.approve");
  const isClosed = activeMess?.is_month_closed ?? false;

  const PAYMENT_METHODS = [
    { value: "cash", label: t.deposits.paymentMethods.cash, emoji: "💵" },
    { value: "bkash", label: t.deposits.paymentMethods.bkash, emoji: "📱" },
    { value: "nagad", label: t.deposits.paymentMethods.nagad, emoji: "📲" },
    { value: "rocket", label: t.deposits.paymentMethods.rocket, emoji: "🚀" },
    { value: "bank_transfer", label: t.deposits.paymentMethods.bank, emoji: "🏦" },
    { value: "other", label: t.deposits.paymentMethods.other, emoji: "💰" },
  ];

  const minDepositAmount = Number(activeMess?.settings?.min_deposit_amount ?? 0);
  const depositSchema = createDepositSchema(t.validation, minDepositAmount);

  const { register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<CreateDepositInput>({
      resolver: zodResolver(depositSchema),
      defaultValues: { date: getTodayString(), payment_method: "cash" },
    });

  const selectedBalance = balances?.find((b) => b.member_id === selectedMemberId);
  const selectedDue = selectedBalance ? -Math.min(Number(selectedBalance.balance), 0) : 0;

  const onSubmit = async (data: CreateDepositInput) => {
    await createDeposit.mutateAsync(data);
    reset({ date: getTodayString(), payment_method: "cash" });
    setSelectedMemberId(null);
    setOpen(false);
  };

  const filtered = deposits?.filter((d) => {
    if (activeTab === "all") return true;
    return d.status === activeTab;
  }) ?? [];

  const totalConfirmed = deposits?.filter((d) => d.status === "confirmed").reduce((s, d) => s + Number(d.amount), 0) ?? 0;
  const pendingCount = deposits?.filter((d) => d.status === "pending").length ?? 0;

  const dueMembers = (balances ?? []).filter((b) => Number(b.balance) < 0);
  const advanceMembers = (balances ?? []).filter((b) => Number(b.balance) > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        {!isClosed ? (
        <PermissionGate permission="deposits.add">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset({ date: getTodayString(), payment_method: "cash" }); }}>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <Plus className="h-4 w-4" />
              {t.deposits.addDeposit}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.deposits.addDepositTitle}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              {canAddDeposit && (
                <div className="space-y-1.5">
                  <Label>{t.deposits.selectMember}</Label>
                  <Select onValueChange={(v) => { setValue("member_id", v); setSelectedMemberId(v); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.deposits.selfDeposit} />
                    </SelectTrigger>
                    <SelectContent>
                      {members?.map((m) => {
                        const up = m.user as { full_name?: string } | null;
                        const bal = balances?.find((b) => b.member_id === m.id);
                        const due = bal ? -Math.min(Number(bal.balance), 0) : 0;
                        return (
                          <SelectItem key={m.id} value={m.id}>
                            <span className="flex items-center gap-2">
                              {up?.full_name ?? t.deposits.memberLabel}
                              {due > 0 && (
                                <span className="text-xs text-red-500">({formatCurrency(due)} {t.deposits.dueLabel})</span>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedMemberId && selectedBalance && (
                    <div className={cn(
                      "p-2 rounded-lg text-xs flex items-center justify-between",
                      selectedDue > 0 ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
                    )}>
                      <span>{selectedDue > 0 ? t.deposits.dueAmount : t.deposits.advanceAmount}</span>
                      <span className="font-bold">{formatCurrency(selectedDue > 0 ? selectedDue : Number(selectedBalance.balance))}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{t.deposits.amountTaka}</Label>
                  {minDepositAmount > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {t.mess.minDeposit}: {formatCurrency(minDepositAmount)}
                    </span>
                  )}
                </div>
                <Input type="number" placeholder={minDepositAmount > 0 ? String(minDepositAmount) : t.amountZero} {...register("amount", { valueAsNumber: true })} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                {canAddDeposit && selectedDue > 0 && (
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-7 border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => setValue("amount", Math.round(selectedDue / 2), { shouldValidate: true })}
                    >
                      {t.deposits.partial} ({formatCurrency(Math.round(selectedDue / 2))})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-7 border-green-400 text-green-700 hover:bg-green-50"
                      onClick={() => setValue("amount", selectedDue, { shouldValidate: true })}
                    >
                      {t.deposits.full} ({formatCurrency(selectedDue)})
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t.deposits.paymentMethod}</Label>
                <Select defaultValue="cash" onValueChange={(v) => setValue("payment_method", v as CreateDepositInput["payment_method"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.emoji} {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.date}</Label>
                <Input type="date" {...register("date")} />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t.deposits.transactionRef}</Label>
                <Input placeholder={t.deposits.transactionPlaceholder} {...register("transaction_ref")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.deposits.commentOptional}</Label>
                <Input placeholder={t.deposits.commentPlaceholder} {...register("note")} />
              </div>
              <Button type="submit" className="w-full" disabled={createDeposit.isPending}>
                {createDeposit.isPending ? t.deposits.savingDeposit : t.deposits.saveDeposit}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </PermissionGate>
        ) : null}
      </div>

      {isClosed && <MonthFreezeAlert />}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-emerald-700">{t.deposits.totalDeposit}</p>
            <p className="text-sm font-bold text-emerald-800 mt-1 truncate">{formatCurrency(totalConfirmed)}</p>
          </CardContent>
        </Card>
        <Card className={cn("border", dueMembers.length > 0 ? "bg-red-50 border-red-200" : "bg-muted/30")}>
          <CardContent className="p-3">
            <p className={cn("text-xs font-medium", dueMembers.length > 0 ? "text-red-700" : "text-muted-foreground")}>{t.deposits.dueMembers}</p>
            <p className={cn("text-sm font-bold mt-1 truncate", dueMembers.length > 0 ? "text-red-800" : "text-foreground")}>
              {dueMembers.length} {t.deposits.personsUnit}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-blue-700">{t.deposits.totalTransactions}</p>
            <p className="text-sm font-bold text-blue-800 mt-1 truncate">{deposits?.length ?? 0} {t.deposits.countUnit}</p>
          </CardContent>
        </Card>
      </div>

      {/* Due/Advance alerts with carry-forward */}
      {(dueMembers.length > 0 || advanceMembers.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.deposits.memberBalances}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dueMembers.map((b) => {
              const member = members?.find((m) => m.id === b.member_id);
              const up = member?.user as { full_name?: string; avatar_url?: string } | null;
              const prevBal = prevBalances?.find((p) => p.member_id === b.member_id);
              const prevBalance = prevBal ? Number(prevBal.balance) : null;
              return (
                <div key={b.member_id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-red-50 border border-red-100">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-red-100 text-red-700">{getInitials(up?.full_name ?? "?")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{up?.full_name ?? t.deposits.memberLabel}</p>
                    <p className="text-xs text-red-600">{t.deposits.dueLabel}</p>
                    {prevBalance !== null && prevBalance !== 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {t.deposits.lastMonthLabel} {prevBalance > 0 ? `${t.deposits.advanceLastMonth} ${formatCurrency(prevBalance)}` : `${t.deposits.dueLastMonth} ${formatCurrency(Math.abs(prevBalance))}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-red-700 font-bold text-sm flex-shrink-0">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {formatCurrency(Math.abs(Number(b.balance)))}
                  </div>
                </div>
              );
            })}
            {advanceMembers.map((b) => {
              const member = members?.find((m) => m.id === b.member_id);
              const up = member?.user as { full_name?: string; avatar_url?: string } | null;
              const prevBal = prevBalances?.find((p) => p.member_id === b.member_id);
              const prevBalance = prevBal ? Number(prevBal.balance) : null;
              return (
                <div key={b.member_id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-green-50 border border-green-100">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-green-100 text-green-700">{getInitials(up?.full_name ?? "?")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{up?.full_name ?? t.deposits.memberLabel}</p>
                    <p className="text-xs text-green-600">{t.deposits.advanceLabel}</p>
                    {prevBalance !== null && prevBalance !== 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {t.deposits.lastMonthLabel} {prevBalance > 0 ? `${t.deposits.advanceLastMonth} ${formatCurrency(prevBalance)}` : `${t.deposits.dueLastMonth} ${formatCurrency(Math.abs(prevBalance))}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-green-700 font-bold text-sm flex-shrink-0">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {formatCurrency(Number(b.balance))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Deposits list with filter tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusTab)}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">{t.deposits.tabs.all}</TabsTrigger>
          <TabsTrigger value="confirmed" className="flex-1">{t.deposits.tabs.confirmed}</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 gap-1.5">
            {t.deposits.tabs.pending}
            {pendingCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t.deposits.depositList}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <CardLoader />
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={<Wallet className="h-7 w-7" />}
                    title={t.deposits.noDeposits}
                    description={activeTab === "pending" ? t.deposits.noPendingDeposits : t.deposits.noDepositsThisMonth}
                    action={activeTab === "all" ? { label: t.deposits.addDepositBtn, onClick: () => setOpen(true) } : undefined}
                  />
                ) : (
                  <div className="space-y-2">
                    {filtered.map((deposit) => {
                      const member = deposit.member as { user?: { full_name?: string; avatar_url?: string } } | null;
                      const pm = PAYMENT_METHODS.find((m) => m.value === deposit.payment_method);
                      const isPending = deposit.status === "pending";
                      const isExpanded = expandedId === deposit.id;

                      return (
                        <div
                          key={deposit.id}
                          className={cn(
                            "rounded-xl border transition-colors",
                            isPending ? "border-amber-200 bg-amber-50/50" : "hover:bg-muted/30"
                          )}
                        >
                          <div
                            className="flex items-center gap-3 p-3 cursor-pointer"
                            onClick={() => setExpandedId(isExpanded ? null : deposit.id)}
                          >
                            <Avatar className="h-9 w-9 flex-shrink-0">
                              <AvatarFallback className="text-xs">
                                {getInitials(member?.user?.full_name ?? "?")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold">{member?.user?.full_name ?? t.unknown}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-xs text-muted-foreground">{formatDate(deposit.date, "d MMM")}</span>
                                <Badge variant="outline" className="text-xs py-0">{pm?.emoji} {pm?.label}</Badge>
                                <Badge variant={isPending ? "warning" : "success"} className="text-xs py-0">
                                  {isPending ? t.deposits.tabs.pending : t.deposits.tabs.confirmed}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-base font-bold text-emerald-600">
                                +{formatCurrency(Number(deposit.amount))}
                              </span>
                              {isExpanded
                                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-3 pb-3">
                              <Separator className="mb-3" />
                              <div className="space-y-1 text-xs text-muted-foreground mb-3">
                                {deposit.transaction_ref && (
                                  <div className="flex justify-between">
                                    <span>{t.deposits.transactionLabel}</span>
                                    <span className="font-mono font-medium text-foreground">{deposit.transaction_ref}</span>
                                  </div>
                                )}
                                {deposit.note && (
                                  <div className="flex justify-between">
                                    <span>{t.deposits.noteLabel}</span>
                                    <span className="font-medium text-foreground max-w-[60%] text-right">{deposit.note}</span>
                                  </div>
                                )}
                              </div>

                              {canApproveDeposit && isPending && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => confirmDeposit.mutate(deposit.id)}
                                    disabled={confirmDeposit.isPending}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    {t.deposits.confirmBtn}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 gap-1 border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => rejectDeposit.mutate(deposit.id)}
                                    disabled={rejectDeposit.isPending}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    {t.deposits.cancelBtn}
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
