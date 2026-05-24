"use client";
import { useState, useMemo } from "react";
import {
  Plus, ShoppingCart, Calendar, Store, ChevronDown, ChevronUp,
  TrendingUp, BarChart2, User, Pencil, Trash2, AlertTriangle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardLoader } from "@/components/shared/LoadingSpinner";
import { BazaarItemForm, type BazaarItem } from "@/components/bazaar/BazaarItemForm";
import {
  useBazaarEntries,
  useCreateBazaar,
  useUpdateBazaar,
  useDeleteBazaar,
} from "@/lib/hooks/use-bazaar";
import { useMessStore } from "@/lib/stores/mess.store";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { MonthFreezeAlert } from "@/components/shared/MonthFreezeAlert";
import { createBazaarSchema, type CreateBazaarInput } from "@/lib/validations/expense.schema";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { formatDate, getTodayString } from "@/lib/utils/date";
import { useLanguage } from "@/lib/hooks/use-language";
import { useHasPermission } from "@/lib/hooks/use-permissions";

export default function BazaarPage() {
  const { t } = useLanguage();
  const { formatCurrency, formatDatePref } = usePreferences();
  const { activeMess } = useMessStore();
  const { data: entries, isLoading } = useBazaarEntries();
  const createBazaar = useCreateBazaar();
  const updateBazaar = useUpdateBazaar();
  const deleteBazaar = useDeleteBazaar();

  const canEdit   = useHasPermission("bazaar.edit");
  const canDelete = useHasPermission("bazaar.delete");

  const isClosed = activeMess?.is_month_closed ?? false;

  // ── Create dialog state ──────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createItems, setCreateItems] = useState<BazaarItem[]>([]);

  // ── Edit dialog state ────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<{
    id: string;
    expense_id: string;
    date: string;
    amount: number;
    note?: string | null;
    shop_name?: string | null;
    items?: BazaarItem[] | null;
  } | null>(null);
  const [editItems, setEditItems] = useState<BazaarItem[]>([]);

  // ── Delete dialog state ──────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<{
    id: string;
    expense_id: string;
    label: string;
  } | null>(null);

  // ── Expanded row ─────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Shared schema ────────────────────────────────────────
  const schema = useMemo(() => createBazaarSchema(t.validation), [t.validation]);

  // ── CREATE form ──────────────────────────────────────────
  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    setValue: setCreateVal,
    watch: watchCreate,
    formState: { errors: createErrors },
  } = useForm<CreateBazaarInput>({
    resolver: zodResolver(schema),
    defaultValues: { date: getTodayString() },
  });
  const createItemsTotal = createItems.reduce((s, it) => s + it.total_price, 0);
  const createWatchedAmt = watchCreate("amount");

  const resetCreateForm = () => {
    resetCreate({ date: getTodayString() });
    setCreateItems([]);
  };

  const onCreateSubmit = async (data: CreateBazaarInput) => {
    const finalAmount = createItemsTotal > 0 ? createItemsTotal : data.amount;
    await createBazaar.mutateAsync({ ...data, amount: finalAmount, items: createItems.length > 0 ? createItems : undefined });
    resetCreateForm();
    setCreateOpen(false);
  };

  const handleCreateItemsChange = (newItems: BazaarItem[]) => {
    setCreateItems(newItems);
    const total = newItems.reduce((s, it) => s + it.total_price, 0);
    if (total > 0) setCreateVal("amount", total);
    else setCreateVal("amount", undefined as unknown as number);
  };

  // ── EDIT form ────────────────────────────────────────────
  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    setValue: setEditVal,
    watch: watchEdit,
    formState: { errors: editErrors },
  } = useForm<CreateBazaarInput>({
    resolver: zodResolver(schema),
    defaultValues: { date: getTodayString() },
  });
  const editItemsTotal = editItems.reduce((s, it) => s + it.total_price, 0);
  const editWatchedAmt = watchEdit("amount");

  const openEditDialog = (entry: typeof editEntry) => {
    if (!entry) return;
    setEditEntry(entry);
    const preItems = Array.isArray(entry.items) ? entry.items : [];
    setEditItems(preItems);
    resetEdit({
      date: entry.date,
      amount: entry.amount,
      note: entry.note ?? undefined,
      shop_name: entry.shop_name ?? undefined,
    });
    setEditOpen(true);
  };

  const handleEditItemsChange = (newItems: BazaarItem[]) => {
    setEditItems(newItems);
    const total = newItems.reduce((s, it) => s + it.total_price, 0);
    if (total > 0) setEditVal("amount", total);
    else setEditVal("amount", undefined as unknown as number);
  };

  const onEditSubmit = async (data: CreateBazaarInput) => {
    if (!editEntry) return;
    const finalAmount = editItemsTotal > 0 ? editItemsTotal : data.amount;
    await updateBazaar.mutateAsync({
      bazaarId: editEntry.id,
      expenseId: editEntry.expense_id,
      input: { ...data, amount: finalAmount, items: editItems.length > 0 ? editItems : undefined },
    });
    setEditOpen(false);
    setEditEntry(null);
  };

  // ── DELETE ────────────────────────────────────────────────
  const openDeleteDialog = (id: string, expense_id: string, label: string) => {
    setDeleteEntry({ id, expense_id, label });
    setDeleteOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!deleteEntry) return;
    await deleteBazaar.mutateAsync({ bazaarId: deleteEntry.id, expenseId: deleteEntry.expense_id });
    setDeleteOpen(false);
    setDeleteEntry(null);
  };

  // ── Summary stats ─────────────────────────────────────────
  const totalBazaar = entries?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;
  const todayTotal  = entries
    ?.filter((e) => e.date === getTodayString())
    .reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  // ── Reusable form fields renderer ─────────────────────────
  const renderFormFields = (
    mode: "create" | "edit",
    reg: typeof regCreate,
    items: BazaarItem[],
    itemsTotal: number,
    watchedAmt: number | undefined,
    errors: Record<string, { message?: string }>,
    onItemsChange: (items: BazaarItem[]) => void,
    setVal: (field: "amount", val: number) => void,
    isPending: boolean,
    onCancel: () => void
  ) => (
    <form
      onSubmit={mode === "create" ? handleCreate(onCreateSubmit) : handleEdit(onEditSubmit)}
      className="space-y-5 py-2"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t.date}</Label>
          <Input type="date" {...reg("date")} />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>{t.bazaar.shopName}</Label>
          <Input placeholder={t.bazaar.shopNamePlaceholder} {...reg("shop_name")} />
        </div>
      </div>

      <Separator />
      <BazaarItemForm items={items} onChange={onItemsChange} />
      <Separator />

      <div className="space-y-1.5">
        <Label>
          {t.bazaar.totalAmount}
          {itemsTotal > 0 && (
            <span className="ml-2 text-xs text-primary font-normal">
              ({t.bazaar.autoFromItems} {formatCurrency(itemsTotal)})
            </span>
          )}
        </Label>
        {itemsTotal > 0 ? (
          <div className="h-10 flex items-center px-3 rounded-md bg-muted border text-sm font-bold text-primary">
            {formatCurrency(itemsTotal)}
          </div>
        ) : (
          <>
            <Input
              type="number"
              placeholder="0"
              min="0"
              step="0.01"
              {...reg("amount", { valueAsNumber: true })}
              value={watchedAmt ?? ""}
              onChange={(e) =>
                setVal("amount", parseFloat(e.target.value) || (undefined as unknown as number))
              }
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{t.bazaar.additionalNote}</Label>
        <Input placeholder={t.bazaar.additionalNotePlaceholder} {...reg("note")} />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending
            ? t.bazaar.savingBazaar
            : mode === "create"
            ? t.bazaar.saveBazaar
            : t.bazaar.saveBazaar}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        {!isClosed ? (
          <PermissionGate permission="bazaar.create">
            <Dialog
              open={createOpen}
              onOpenChange={(v) => {
                setCreateOpen(v);
                if (!v) resetCreateForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-1">
                  <Plus className="h-4 w-4" />
                  {t.bazaar.addBazaar}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t.bazaar.addBazaarTitle}</DialogTitle>
                </DialogHeader>
                {renderFormFields(
                  "create",
                  regCreate,
                  createItems,
                  createItemsTotal,
                  createWatchedAmt,
                  createErrors as Record<string, { message?: string }>,
                  handleCreateItemsChange,
                  setCreateVal,
                  createBazaar.isPending,
                  () => { setCreateOpen(false); resetCreateForm(); }
                )}
              </DialogContent>
            </Dialog>
          </PermissionGate>
        ) : null}
      </div>

      {isClosed && <MonthFreezeAlert />}

      {/* ── Summary cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-green-700">{t.bazaar.totalThisMonth}</p>
            <p className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(totalBazaar)}</p>
            <p className="text-xs text-green-600 mt-0.5">{entries?.length ?? 0}{t.bazaar.entries}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-blue-700">{t.bazaar.todayBazaar}</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{formatCurrency(todayTotal)}</p>
            <p className="text-xs text-blue-600 mt-0.5">
              {entries?.filter((e) => e.date === getTodayString()).length ?? 0}{t.bazaar.entries}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <Tabs defaultValue="list">
        <TabsList className="w-full">
          <TabsTrigger value="list" className="flex-1">{t.bazaar.tabs.list}</TabsTrigger>
          <TabsTrigger value="price-history" className="flex-1">{t.bazaar.tabs.priceHistory}</TabsTrigger>
        </TabsList>

        {/* ── LIST TAB ───────────────────────────────────── */}
        <TabsContent value="list">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t.bazaar.bazaarList}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4"><CardLoader /></div>
              ) : !entries || entries.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={<ShoppingCart className="h-7 w-7" />}
                    title={t.bazaar.noBazaar}
                    description={t.bazaar.noBazaarThisMonth}
                    action={{ label: t.bazaar.addBazaarBtn, onClick: () => setCreateOpen(true) }}
                  />
                </div>
              ) : (
                <div className="divide-y">
                  {entries.map((entry) => {
                    const entryItems = entry.items as BazaarItem[] | null;
                    const hasItems   = Array.isArray(entryItems) && entryItems.length > 0;
                    const isExpanded = expandedId === entry.id;
                    const title      = entry.shop_name || entry.note || t.nav.bazaar;
                    const subtitle   = entry.shop_name && entry.note ? entry.note : null;
                    const creator    = (entry as Record<string, unknown>).creator as { full_name?: string } | null;
                    const expenseId  = (entry as Record<string, unknown>).expense_id as string | undefined;

                    return (
                      <div key={entry.id} className="hover:bg-muted/30 transition-colors">
                        {/* Main row */}
                        <div className="flex items-start gap-3 p-4">
                          {/* Cart icon */}
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700 flex-shrink-0 mt-0.5 cursor-pointer"
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          >
                            <ShoppingCart className="h-5 w-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div
                                className="min-w-0 flex-1 cursor-pointer"
                                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                              >
                                <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                                {subtitle && (
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDatePref(entry.date)}
                                  </span>
                                  {entry.shop_name && entry.note && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Store className="h-3 w-3" />
                                      {entry.shop_name}
                                    </span>
                                  )}
                                  {creator?.full_name && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {creator.full_name}
                                    </span>
                                  )}
                                  {hasItems && (
                                    <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4">
                                      {entryItems!.length} {t.bazaar.items}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Amount + chevron + action buttons */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span
                                  className="text-base font-bold text-foreground cursor-pointer"
                                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                >
                                  {formatCurrency(Number(entry.amount))}
                                </span>
                                {hasItems && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                    className="text-muted-foreground"
                                  >
                                    {isExpanded
                                      ? <ChevronUp className="h-4 w-4" />
                                      : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                )}

                                {/* Edit button */}
                                {canEdit && !isClosed && (
                                  <button
                                    type="button"
                                    title={t.permissions.permissionKeys.edit_bazaar}
                                    onClick={() =>
                                      openEditDialog({
                                        id: entry.id,
                                        expense_id: expenseId ?? "",
                                        date: entry.date,
                                        amount: Number(entry.amount),
                                        note: entry.note,
                                        shop_name: entry.shop_name,
                                        items: entryItems,
                                      })
                                    }
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                )}

                                {/* Delete button */}
                                {canDelete && !isClosed && (
                                  <button
                                    type="button"
                                    title={t.permissions.permissionKeys.delete_bazaar}
                                    onClick={() =>
                                      openDeleteDialog(entry.id, expenseId ?? "", title)
                                    }
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded item breakdown */}
                        {hasItems && isExpanded && (
                          <div className="px-4 pb-4">
                            <div className="rounded-lg border bg-muted/30 overflow-hidden">
                              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/60 border-b text-xs font-medium text-muted-foreground">
                                <span className="col-span-5">{t.bazaar.itemLabel}</span>
                                <span className="col-span-3">{t.bazaar.quantityLabel}</span>
                                <span className="col-span-2">{t.bazaar.priceLabel}</span>
                                <span className="col-span-2 text-right">{t.bazaar.totalLabel}</span>
                              </div>
                              {entryItems!.map((item, i) => (
                                <div
                                  key={i}
                                  className="grid grid-cols-12 gap-2 px-3 py-2 text-xs border-b last:border-0 hover:bg-muted/40"
                                >
                                  <span className="col-span-5 font-medium truncate">{item.name}</span>
                                  <span className="col-span-3 text-muted-foreground">{item.quantity} {item.unit}</span>
                                  <span className="col-span-2 text-muted-foreground">{formatCurrency(item.unit_price)}</span>
                                  <span className="col-span-2 text-right font-semibold text-foreground">{formatCurrency(item.total_price)}</span>
                                </div>
                              ))}
                              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-green-50 border-t">
                                <span className="col-span-10 text-xs font-bold text-green-800">{t.bazaar.totalLabel}</span>
                                <span className="col-span-2 text-right text-sm font-bold text-green-700">{formatCurrency(Number(entry.amount))}</span>
                              </div>
                            </div>
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

        {/* ── PRICE HISTORY TAB ──────────────────────────── */}
        <TabsContent value="price-history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t.bazaar.itemPriceHistory}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardLoader />
              ) : !entries || entries.length === 0 ? (
                <EmptyState
                  icon={<BarChart2 className="h-7 w-7" />}
                  title={t.bazaar.noData}
                  description={t.bazaar.addItemsNote}
                />
              ) : (() => {
                const itemMap: Record<string, { date: string; unit_price: number; unit: string }[]> = {};
                entries.forEach((entry) => {
                  const its = entry.items as BazaarItem[] | null;
                  if (!Array.isArray(its)) return;
                  its.forEach((item) => {
                    if (!itemMap[item.name]) itemMap[item.name] = [];
                    itemMap[item.name].push({ date: entry.date, unit_price: item.unit_price, unit: item.unit });
                  });
                });
                const itemNames = Object.keys(itemMap).sort();
                if (itemNames.length === 0) {
                  return (
                    <EmptyState
                      icon={<BarChart2 className="h-7 w-7" />}
                      title={t.bazaar.noPriceData}
                      description={t.bazaar.addItemizedNote}
                    />
                  );
                }
                return (
                  <div className="space-y-4">
                    {itemNames.map((name) => {
                      const records = itemMap[name].sort((a, b) => a.date.localeCompare(b.date));
                      const latest  = records[records.length - 1];
                      const prev    = records.length > 1 ? records[records.length - 2] : null;
                      const trend   = prev ? latest.unit_price - prev.unit_price : 0;
                      return (
                        <div key={name} className="p-3 rounded-xl border space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">{name}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-primary">
                                {formatCurrency(latest.unit_price)}/{latest.unit}
                              </span>
                              {trend !== 0 && (
                                <Badge
                                  variant={trend > 0 ? "destructive" : "default"}
                                  className={`text-xs gap-1 ${trend < 0 ? "bg-green-100 text-green-700 border-green-200" : ""}`}
                                >
                                  {trend > 0 ? "↑" : "↓"} {formatCurrency(Math.abs(trend))}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {records.map((r, i) => (
                              <div key={i} className="flex flex-col items-center gap-0.5 flex-shrink-0">
                                <span className="text-xs font-semibold text-foreground whitespace-nowrap">{formatCurrency(r.unit_price)}</span>
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(r.date, "d MMM")}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {records.length}{t.bazaar.records} {formatDatePref(latest.date)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── EDIT DIALOG ───────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditEntry(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-blue-600" />
              {t.permissions.permissionKeys.edit_bazaar}
            </DialogTitle>
          </DialogHeader>
          {editEntry && renderFormFields(
            "edit",
            regEdit,
            editItems,
            editItemsTotal,
            editWatchedAmt,
            editErrors as Record<string, { message?: string }>,
            handleEditItemsChange,
            setEditVal,
            updateBazaar.isPending,
            () => { setEditOpen(false); setEditEntry(null); }
          )}
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM DIALOG ─────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeleteEntry(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t.delete} — {t.nav.bazaar}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm font-medium text-destructive">{deleteEntry?.label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.bazaar.deleteConfirmDescription}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setDeleteOpen(false); setDeleteEntry(null); }}
              >
                {t.cancel}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteBazaar.isPending}
                onClick={onConfirmDelete}
              >
                {deleteBazaar.isPending ? t.bazaar.deleting : t.delete}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
