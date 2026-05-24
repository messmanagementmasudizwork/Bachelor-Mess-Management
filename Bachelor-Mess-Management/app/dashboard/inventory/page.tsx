"use client";
import { useState } from "react";
import { Package, Plus, AlertTriangle, Pencil, Trash2, RefreshCw, History, MinusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from "@/lib/hooks/use-inventory";
import { useMessStore } from "@/lib/stores/mess.store";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { toast } from "sonner";
import { useLanguage } from "@/lib/hooks/use-language";

interface UsageLogEntry {
  id: string;
  item_id: string;
  item_name: string;
  amount_used: number;
  unit: string;
  note: string;
  logged_at: string;
}

type InventoryRow = {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  min_threshold: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
};

export default function InventoryPage() {
  const { t, lang } = useLanguage();
  const cats = t.inventoryExt.categories;
  const CATEGORY_CONFIG = [
    { label: cats.grainLentils, emoji: "🌾" },
    { label: cats.fishMeat,     emoji: "🐟" },
    { label: cats.vegetables,   emoji: "🥬" },
    { label: cats.spices,       emoji: "🌶️" },
    { label: cats.cookingSupplies, emoji: "🫙" },
    { label: cats.fuel,         emoji: "🔥" },
    { label: cats.cleaningSupplies, emoji: "🧹" },
    { label: cats.other,        emoji: "📦" },
  ];
  const CATEGORIES = CATEGORY_CONFIG.map((c) => c.label);
  const CATEGORY_EMOJI: Record<string, string> = Object.fromEntries(
    CATEGORY_CONFIG.map((c) => [c.label, c.emoji])
  );
  const { activeMess } = useMessStore();
  const { data: inventory, isLoading } = useInventory();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();

  const UNITS = Object.values(t.inventory.units);

  const itemSchema = z.object({
    item_name: z.string().min(1, t.inventory.validation.nameRequired),
    category: z.string().min(1, t.inventory.validation.categoryRequired),
    quantity: z.coerce.number().min(0, t.inventory.validation.quantityMin),
    unit: z.string().min(1, t.inventory.validation.unitRequired),
    min_threshold: z.coerce.number().min(0, t.inventory.validation.thresholdMin),
  });

  type ItemFormData = z.infer<typeof itemSchema>;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryRow | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [updatingQtyId, setUpdatingQtyId] = useState<string | null>(null);
  const [newQty, setNewQty] = useState<string>("");
  const [usageItem, setUsageItem] = useState<InventoryRow | null>(null);
  const [usageAmount, setUsageAmount] = useState<string>("");
  const [usageNote, setUsageNote] = useState<string>("");

  const getUsageLog = (): UsageLogEntry[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(`messpilot_inventory_log_${activeMess?.id}`);
    return stored ? JSON.parse(stored) : [];
  };

  const [usageLog, setUsageLog] = useState<UsageLogEntry[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(`messpilot_inventory_log_${activeMess?.id ?? "none"}`);
    return stored ? JSON.parse(stored) : [];
  });

  const handleLogUsage = async () => {
    if (!usageItem || !usageAmount) return;
    const amount = parseFloat(usageAmount);
    if (isNaN(amount) || amount <= 0) return;
    const newQtyVal = Math.max(0, usageItem.quantity - amount);
    await updateItem.mutateAsync({ id: usageItem.id, input: { quantity: newQtyVal } });
    const entry: UsageLogEntry = {
      id: Math.random().toString(36).slice(2),
      item_id: usageItem.id,
      item_name: usageItem.item_name,
      amount_used: amount,
      unit: usageItem.unit,
      note: usageNote,
      logged_at: new Date().toISOString(),
    };
    const log = getUsageLog();
    const updatedLog = [entry, ...log].slice(0, 100);
    localStorage.setItem(`messpilot_inventory_log_${activeMess?.id}`, JSON.stringify(updatedLog));
    setUsageLog(updatedLog);
    toast.success(`${amount} ${usageItem.unit} ${usageItem.item_name} ${t.inventory.usageLogged}`);
    setUsageItem(null);
    setUsageAmount("");
    setUsageNote("");
  };

  const isAdmin = useHasPermission("inventory.manage");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { quantity: 0, min_threshold: 1 },
  });

  const openAdd = () => {
    setEditingItem(null);
    reset({ item_name: "", category: "", quantity: 0, unit: "", min_threshold: 1 });
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryRow) => {
    setEditingItem(item);
    reset({
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      min_threshold: item.min_threshold,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ItemFormData) => {
    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, input: { quantity: data.quantity, min_threshold: data.min_threshold } });
    } else {
      await createItem.mutateAsync(data);
    }
    setDialogOpen(false);
    reset();
  };

  const handleUpdateQty = async (itemId: string) => {
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty < 0) return;
    await updateItem.mutateAsync({ id: itemId, input: { quantity: qty } });
    setUpdatingQtyId(null);
    setNewQty("");
  };

  const lowStock = inventory?.filter((i) => i.quantity <= i.min_threshold) ?? [];
  const okStock = inventory?.filter((i) => i.quantity > i.min_threshold) ?? [];

  const categoryGroups = inventory?.reduce<Record<string, InventoryRow[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {}) ?? {};

  return (
    <div className="space-y-6 animate-fade-in">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t.inventory.addItem}
          </Button>
        </div>
      )}

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">{t.inventory.lowStockAlert}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {lowStock.map((i) => i.item_name).join(", ")} — {t.inventory.lowStockDesc}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            {isLoading ? <Skeleton className="h-8 w-12 mx-auto mb-1" /> : (
              <p className="text-2xl font-bold">{inventory?.length ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{t.inventory.totalItems}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            {isLoading ? <Skeleton className="h-8 w-12 mx-auto mb-1" /> : (
              <p className="text-2xl font-bold text-red-700">{lowStock.length}</p>
            )}
            <p className="text-xs text-red-600 mt-1">{t.inventory.lowStock}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            {isLoading ? <Skeleton className="h-8 w-12 mx-auto mb-1" /> : (
              <p className="text-2xl font-bold text-green-700">{okStock.length}</p>
            )}
            <p className="text-xs text-green-600 mt-1">{t.inventory.sufficientStock}</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory list + Usage log tabs */}
      <Tabs defaultValue="stock">
        <TabsList className="w-full">
          <TabsTrigger value="stock" className="flex-1">{t.inventory.tabs.stock}</TabsTrigger>
          <TabsTrigger value="usage-log" className="flex-1 gap-1">
            <History className="h-3.5 w-3.5" />
            {t.inventory.tabs.history}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usage-log">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                {t.inventory.usageHistory}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usageLog.length === 0 ? (
                <EmptyState
                  icon={<History className="h-7 w-7" />}
                  title={t.inventory.noHistory}
                  description={t.inventory.useBtn_Hint}
                />
              ) : (
                <div className="space-y-2">
                  {usageLog.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
                        <MinusCircle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{log.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.logged_at).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" })}
                          {" • "}{new Date(log.logged_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {log.note && <p className="text-xs text-muted-foreground italic mt-0.5">"{log.note}"</p>}
                      </div>
                      <span className="text-sm font-bold text-red-600 flex-shrink-0">
                        -{log.amount_used} {log.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          {isLoading ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : inventory?.length === 0 ? (
            <EmptyState
              icon={<Package className="h-7 w-7" />}
              title={t.inventory.noItems}
              description={t.inventory.addFirstItem}
              action={isAdmin ? { label: t.inventory.addItem, onClick: openAdd } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(categoryGroups).map(([category, items]) => (
                <Card key={category}>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <span>{CATEGORY_EMOJI[category] ?? "📦"}</span>
                      {category}
                      <Badge variant="secondary" className="text-xs ml-auto">{items.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-4">
                    {items.map((item) => {
                      const isLow = item.quantity <= item.min_threshold;
                      const isUpdatingThis = updatingQtyId === item.id;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                            isLow ? "border-red-200 bg-red-50" : "hover:bg-muted/40"
                          )}
                        >
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl text-xl flex-shrink-0",
                            isLow ? "bg-red-100" : "bg-green-100"
                          )}>
                            {CATEGORY_EMOJI[item.category] ?? "📦"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold">{item.item_name}</p>
                              {isLow && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                            </div>
                            {isUpdatingThis ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <Input
                                  type="number"
                                  value={newQty}
                                  onChange={(e) => setNewQty(e.target.value)}
                                  className="h-6 w-24 text-xs px-2"
                                  placeholder={String(item.quantity)}
                                  autoFocus
                                />
                                <span className="text-xs text-muted-foreground">{item.unit}</span>
                                <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleUpdateQty(item.id)}>
                                  {t.inventory.editOk}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setUpdatingQtyId(null)}>
                                  {t.inventory.cancelBtn}
                                </Button>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t.inventory.minLabel} {item.min_threshold} {item.unit}
                              </p>
                            )}
                          </div>

                          {!isUpdatingThis && (
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className={cn("text-sm font-bold", isLow ? "text-red-600" : "text-foreground")}>
                                  {item.quantity} {item.unit}
                                </p>
                              </div>
                              <Badge variant={isLow ? "destructive" : "success"} className="text-[10px] px-1.5">
                                {isLow ? t.inventory.lowLabel : t.inventory.okLabel}
                              </Badge>
                            </div>
                          )}

                          {isAdmin && !isUpdatingThis && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title={t.inventory.useBtn}
                                onClick={() => { setUsageItem(item); setUsageAmount(""); setUsageNote(""); }}
                              >
                                <MinusCircle className="h-3.5 w-3.5 text-amber-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title={t.inventory.quantityUpdate}
                                onClick={() => {
                                  setUpdatingQtyId(item.id);
                                  setNewQty(String(item.quantity));
                                }}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title={t.inventory.editItem}
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                title={t.inventory.deleteItem}
                                onClick={() => setDeleteConfirmId(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Usage Log Dialog */}
      <Dialog open={!!usageItem} onOpenChange={(open) => { if (!open) setUsageItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.inventory.logUsageTitle}</DialogTitle>
          </DialogHeader>
          {usageItem && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/50 flex items-center gap-3">
                <span className="text-2xl">{CATEGORY_EMOJI[usageItem.category] ?? "📦"}</span>
                <div>
                  <p className="text-sm font-semibold">{usageItem.item_name}</p>
                  <p className="text-xs text-muted-foreground">{t.inventory.currentStock} {usageItem.quantity} {usageItem.unit}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t.inventory.usedQuantity}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={usageItem.quantity}
                    value={usageAmount}
                    onChange={(e) => setUsageAmount(e.target.value)}
                    placeholder={t.inventory.usedQuantityPlaceholder}
                  />
                  <span className="text-sm text-muted-foreground flex-shrink-0">{usageItem.unit}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t.inventory.noteOptional}</Label>
                <Input
                  value={usageNote}
                  onChange={(e) => setUsageNote(e.target.value)}
                  placeholder={t.inventory.noteExample}
                />
              </div>
              {usageAmount && parseFloat(usageAmount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t.inventory.stockAfterUse}{" "}
                  <span className="font-semibold text-foreground">
                    {Math.max(0, usageItem.quantity - parseFloat(usageAmount))} {usageItem.unit}
                  </span>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageItem(null)}>{t.inventory.cancelBtn}</Button>
            <Button
              disabled={!usageAmount || parseFloat(usageAmount) <= 0 || updateItem.isPending}
              onClick={handleLogUsage}
            >
              {updateItem.isPending ? t.inventory.loggingBtn : t.inventory.logBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? t.inventory.editItem : t.inventory.addItemTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.inventory.itemName}</Label>
              <Input {...register("item_name")} placeholder={t.inventory.itemNamePlaceholder} disabled={!!editingItem} />
              {errors.item_name && <p className="text-xs text-destructive">{errors.item_name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.inventory.itemCategory}</Label>
                <Select
                  value={watch("category")}
                  onValueChange={(v) => setValue("category", v)}
                  disabled={!!editingItem}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.inventory.selectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>{t.inventory.itemUnit}</Label>
                <Select
                  value={watch("unit")}
                  onValueChange={(v) => setValue("unit", v)}
                  disabled={!!editingItem}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.inventory.selectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.inventory.itemQuantity}</Label>
                <Input type="number" step="0.01" {...register("quantity")} />
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t.inventory.minThreshold}</Label>
                <Input type="number" step="0.01" {...register("min_threshold")} />
                {errors.min_threshold && <p className="text-xs text-destructive">{errors.min_threshold.message}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t.inventory.cancelBtn}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t.inventory.savingBtn : editingItem ? t.inventory.updateBtn : t.inventory.addBtn}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.inventory.deleteItem}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t.inventory.deleteConfirm}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t.inventory.cancelBtn}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteItem.isPending}
              onClick={() => {
                if (deleteConfirmId) {
                  deleteItem.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              {deleteItem.isPending ? t.inventory.deletingBtn : t.inventory.confirmDeleteBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
