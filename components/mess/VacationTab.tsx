"use client";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plane, Plus, Trash2, CalendarRange, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useVacations, useCreateVacation, useDeleteVacation } from "@/lib/hooks/use-vacation";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { useLanguage } from "@/lib/hooks/use-language";
import type { MessVacation } from "@/lib/services/vacation.service";

type VacationForm = {
  title: string;
  start_date: string;
  end_date: string;
  reason?: string;
};

function formatDateBn(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function getVacationStatus(v: MessVacation): "active" | "upcoming" | "past" {
  const today = new Date().toISOString().split("T")[0]!;
  if (v.end_date < today)   return "past";
  if (v.start_date > today) return "upcoming";
  return "active";
}

function getDayCount(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / 86400000) + 1;
}

export function VacationTab() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MessVacation | null>(null);

  const canManage = useHasPermission("settings.manage");
  const { data: vacations = [], isLoading } = useVacations();
  const createVacation = useCreateVacation();
  const deleteVacation = useDeleteVacation();

  const vacationSchema = useMemo(() =>
    z.object({
      title:      z.string().min(2, t.vacation.validationTitleMin),
      start_date: z.string().min(1, t.vacation.validationStartRequired),
      end_date:   z.string().min(1, t.vacation.validationEndRequired),
      reason:     z.string().optional(),
    }).refine((d) => d.end_date >= d.start_date, {
      message: t.vacation.validationEndBeforeStart,
      path: ["end_date"],
    }),
  [t]);

  const form = useForm<VacationForm>({
    resolver: zodResolver(vacationSchema),
    defaultValues: { title: "", start_date: "", end_date: "", reason: "" },
  });

  const onSubmit = async (data: VacationForm) => {
    await createVacation.mutateAsync({
      title:      data.title,
      start_date: data.start_date,
      end_date:   data.end_date,
      reason:     data.reason || undefined,
    });
    form.reset();
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteVacation.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  };

  const statusBadge = (v: MessVacation) => {
    const s = getVacationStatus(v);
    if (s === "active")   return <Badge className="bg-red-100 text-red-700 border-red-200">{t.vacation.statusActive}</Badge>;
    if (s === "upcoming") return <Badge className="bg-amber-100 text-amber-700 border-amber-200">{t.vacation.statusUpcoming}</Badge>;
    return <Badge variant="secondary">{t.vacation.statusPast}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Plane className="h-4 w-4 text-amber-500" />
                {t.vacation.tabTitle}
              </CardTitle>
              <CardDescription className="mt-0.5">{t.vacation.tabDesc}</CardDescription>
            </div>
            {canManage && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.vacation.addBtn}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-amber-500" />
                      {t.vacation.dialogTitle}
                    </DialogTitle>
                  </DialogHeader>

                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                      <Label>{t.vacation.titleLabel} *</Label>
                      <Input
                        {...form.register("title")}
                        placeholder={t.vacation.titlePlaceholder}
                      />
                      {form.formState.errors.title && (
                        <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>{t.vacation.startDate} *</Label>
                        <Input type="date" {...form.register("start_date")} />
                        {form.formState.errors.start_date && (
                          <p className="text-xs text-destructive">{form.formState.errors.start_date.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t.vacation.endDate} *</Label>
                        <Input type="date" {...form.register("end_date")} />
                        {form.formState.errors.end_date && (
                          <p className="text-xs text-destructive">{form.formState.errors.end_date.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>{t.vacation.reasonLabel}</Label>
                      <Input
                        {...form.register("reason")}
                        placeholder={t.vacation.reasonPlaceholder}
                      />
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-800">{t.vacation.noticeInfo}</p>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        {t.cancel}
                      </Button>
                      <Button type="submit" disabled={createVacation.isPending}>
                        {createVacation.isPending ? t.saving : t.vacation.confirmBtn}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && vacations.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Plane className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm">{t.vacation.empty}</p>
              {canManage && (
                <p className="text-xs mt-1">{t.vacation.emptyHint}</p>
              )}
            </div>
          )}

          {!isLoading && vacations.map((v) => (
            <div
              key={v.id}
              className="flex items-start justify-between gap-3 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl shrink-0">
                  🏖️
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{v.title}</p>
                    {statusBadge(v)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <CalendarRange className="h-3 w-3 shrink-0" />
                    <span>{formatDateBn(v.start_date)} — {formatDateBn(v.end_date)}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>{getDayCount(v.start_date, v.end_date)} {t.vacation.days}</span>
                  </div>
                  {v.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{v.reason}</p>
                  )}
                </div>
              </div>

              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => setDeleteTarget(v)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.vacation.deleteTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t.vacation.deleteDesc}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t.cancel}</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteVacation.isPending}
            >
              {deleteVacation.isPending ? t.saving : t.vacation.deleteConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
