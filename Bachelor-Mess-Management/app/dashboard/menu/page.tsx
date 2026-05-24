"use client";
import { useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2, ChefHat, Star, Wallet, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardLoader } from "@/components/shared/LoadingSpinner";
import { useWeeklyMenu, useUpsertMenuItem, useDeleteMenuItem } from "@/lib/hooks/use-menu";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { useMess } from "@/lib/hooks/use-mess";
import { useMessStore } from "@/lib/stores/mess.store";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { cn } from "@/lib/utils";
import type { MenuItem, MealSlot, DayName } from "@/lib/services/menu.service";
import { DAYS } from "@/lib/services/menu.service";
import { useLanguage } from "@/lib/hooks/use-language";

const todayDayName = DAYS[new Date().getDay()] as DayName;

const ESTIMATED_COST_PER_MEAL = 80;

export default function MenuPage() {
  const { t } = useLanguage();
  const { formatCurrency } = usePreferences();
  const DAY_LABELS: Record<DayName, string> = {
    sunday:    t.menu.days.sunday,
    monday:    t.menu.days.monday,
    tuesday:   t.menu.days.tuesday,
    wednesday: t.menu.days.wednesday,
    thursday:  t.menu.days.thursday,
    friday:    t.menu.days.friday,
    saturday:  t.menu.days.saturday,
  };
  const { data: menu = [], isLoading } = useWeeklyMenu();
  const upsert = useUpsertMenuItem();
  const remove = useDeleteMenuItem();
  const { activeMess } = useMessStore();
  const { data: mess } = useMess(activeMess?.id);
  const isAdmin = useHasPermission("menu.manage");

  const weeklyBudget = mess?.mess_settings?.weekly_menu_budget ?? 0;
  const totalMenuEntries = menu.length;
  const estimatedWeeklyCost = totalMenuEntries * ESTIMATED_COST_PER_MEAL;
  const budgetUsedPct = weeklyBudget > 0 ? Math.min((estimatedWeeklyCost / weeklyBudget) * 100, 100) : 0;
  const overBudget = weeklyBudget > 0 && estimatedWeeklyCost > weeklyBudget;

  const MEAL_SLOTS = [
    { key: "breakfast" as MealSlot, label: t.menu.mealSlots.breakfast, emoji: "🌅" },
    { key: "lunch"     as MealSlot, label: t.menu.mealSlots.lunch,     emoji: "☀️" },
    { key: "dinner"    as MealSlot, label: t.menu.mealSlots.dinner,    emoji: "🌙" },
  ];

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [formDay, setFormDay] = useState<DayName>(DAYS[0]);
  const [formMeal, setFormMeal] = useState<MealSlot>("breakfast");
  const [formItems, setFormItems] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formSpecial, setFormSpecial] = useState(false);

  const resetForm = () => {
    setFormDay(DAYS[0]);
    setFormMeal("breakfast");
    setFormItems("");
    setFormNote("");
    setFormSpecial(false);
    setEditItem(null);
  };

  const openAdd = () => {
    resetForm();
    setFormDay(todayDayName);
    setOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setFormDay(item.day);
    setFormMeal(item.meal);
    setFormItems(item.items);
    setFormNote(item.note ?? "");
    setFormSpecial(item.is_special);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!formItems.trim()) return;
    await upsert.mutateAsync({
      input: {
        day: formDay,
        meal: formMeal,
        items: formItems.trim(),
        note: formNote.trim() || undefined,
        is_special: formSpecial,
      },
      existingId: editItem?.id,
    });
    resetForm();
    setOpen(false);
  };

  const todayItems = menu.filter((m) => m.day === todayDayName);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        {isAdmin ? (
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button className="gap-1" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                {t.menu.addMenu}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{editItem ? t.menu.editMenuTitle : t.menu.addMenuTitle}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>{t.menu.day}</Label>
                  <Select value={formDay} onValueChange={(v) => setFormDay(v as DayName)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => <SelectItem key={d} value={d}>{DAY_LABELS[d] ?? d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.menu.mealTime}</Label>
                  <Select value={formMeal} onValueChange={(v) => setFormMeal(v as MealSlot)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEAL_SLOTS.map((s) => (
                        <SelectItem key={s.key} value={s.key}>{s.emoji} {s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.menu.foodItems}</Label>
                  <Input
                    placeholder={t.menu.foodItemsPlaceholder}
                    value={formItems}
                    onChange={(e) => setFormItems(e.target.value)}
                  />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.menu.specialNote}</Label>
                    <Input
                      placeholder={t.menu.noteItemsPlaceholder}
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      <Label className="text-sm cursor-pointer">{t.menu.specialMenu}</Label>
                    </div>
                    <Switch checked={formSpecial} onCheckedChange={setFormSpecial} />
                  </div>

                  {/* Budget warning in form */}
                  {weeklyBudget > 0 && !editItem && (
                    <div className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg text-xs",
                      overBudget
                        ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                        : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                    )}>
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        {overBudget
                          ? `${t.menu.weeklyBudget} (${formatCurrency(weeklyBudget)}) ${t.menu.overBudget}`
                          : `${t.menu.estimatedVsBudget}: ${formatCurrency(estimatedWeeklyCost + ESTIMATED_COST_PER_MEAL)} / ${formatCurrency(weeklyBudget)}`
                        }
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { resetForm(); setOpen(false); }}>
                      {t.menu.cancelBtn}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSave}
                      disabled={!formItems.trim()}
                      loading={upsert.isPending}
                    >
                      {editItem ? t.menu.saveBtn : t.menu.addBtn}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
        ) : null}
      </div>

      {isLoading ? (
        <CardLoader />
      ) : (
        <>
          {/* Budget tracker */}
          {weeklyBudget > 0 && (
            <Card className={cn(
              "border",
              overBudget
                ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10"
                : budgetUsedPct > 75
                  ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10"
                  : "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className={cn(
                      "h-4 w-4",
                      overBudget ? "text-red-600" : budgetUsedPct > 75 ? "text-amber-600" : "text-green-600"
                    )} />
                    <span className="text-sm font-medium">{t.menu.weeklyBudget}</span>
                    {overBudget && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{t.menu.overBudget}</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t.menu.estimatedVsBudget}</p>
                    <p className={cn(
                      "text-sm font-bold",
                      overBudget ? "text-red-600" : budgetUsedPct > 75 ? "text-amber-600" : "text-green-600"
                    )}>
                      {formatCurrency(estimatedWeeklyCost)} / {formatCurrency(weeklyBudget)}
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      overBudget ? "bg-red-500" : budgetUsedPct > 75 ? "bg-amber-500" : "bg-green-500"
                    )}
                    style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {totalMenuEntries} {t.menu.addMenu} × {formatCurrency(ESTIMATED_COST_PER_MEAL)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Today's menu highlight */}
          {todayItems.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-primary" />
                  {t.menu.todayMenu} ({DAY_LABELS[todayDayName] ?? todayDayName})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {MEAL_SLOTS.map((slot) => {
                  const entry = todayItems.find((m) => m.meal === slot.key);
                  if (!entry) return null;
                  return (
                    <div key={slot.key} className="flex items-start gap-2">
                      <span className="text-base mt-0.5">{slot.emoji}</span>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{slot.label}</p>
                        <p className="text-sm font-semibold">
                          {entry.items}
                          {entry.is_special && <Star className="inline h-3 w-3 text-amber-500 ml-1" />}
                        </p>
                        {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Weekly grid */}
          {menu.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-7 w-7" />}
              title={t.menu.noMenu}
              description={isAdmin ? t.menu.adminNoMenu : t.menu.memberNoMenu}
              action={isAdmin ? { label: t.menu.firstMenuAdd, onClick: openAdd } : undefined}
            />
          ) : (
            <div className="space-y-4">
              {DAYS.map((day) => {
                const dayItems = menu.filter((m) => m.day === day);
                if (dayItems.length === 0) return null;
                const isToday = day === todayDayName;
                return (
                  <Card key={day} className={isToday ? "border-primary/40" : ""}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {DAY_LABELS[day] ?? day}
                        {isToday && <Badge variant="default" className="text-xs">{t.menu.today}</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {MEAL_SLOTS.map((slot) => {
                        const entry = dayItems.find((m) => m.meal === slot.key);
                        if (!entry) return null;
                        return (
                          <div key={slot.key} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30">
                            <span className="text-lg flex-shrink-0">{slot.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{slot.label}</p>
                              <p className="text-sm font-medium truncate">
                                {entry.items}
                                {entry.is_special && (
                                  <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">
                                    {t.menu.specialBadge}
                                  </span>
                                )}
                              </p>
                              {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1 flex-shrink-0">
                                <Button size="icon-sm" variant="ghost" className="h-7 w-7" onClick={() => openEdit(entry)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => remove.mutate(entry.id)}
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
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
