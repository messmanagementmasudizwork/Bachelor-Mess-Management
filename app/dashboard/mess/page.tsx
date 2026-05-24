"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2, Copy, RefreshCw, Settings2, AlertTriangle,
  QrCode, Download, Share2, Users, Calendar,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMess } from "@/lib/hooks/use-mess";

import { useHasPermission } from "@/lib/hooks/use-permissions";
import { useMessStore } from "@/lib/stores/mess.store";
import { messService } from "@/lib/services/mess.service";
import { useQueryClient } from "@tanstack/react-query";
import { formatMonth } from "@/lib/utils/date";
import { toast } from "sonner";
import { useLanguage } from "@/lib/hooks/use-language";

const messInfoSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional().or(z.literal("")),
  mess_type: z.enum(["student", "job_holder", "family", "hostel"]),
  seat_capacity: z.coerce.number().min(1).optional().or(z.literal("")),
});

const messSettingsSchema = z.object({
  meal_cutoff_breakfast: z.string(),
  meal_cutoff_lunch: z.string(),
  meal_cutoff_dinner: z.string(),
  cutoff_days_before: z.coerce.number().min(0).max(2),
  cutoff_time_mode: z.enum(["single", "per_meal"]),
  cutoff_single_time: z.string(),
  min_deposit_amount: z.coerce.number().min(0),
  guest_meal_charge: z.coerce.number().min(0),
  late_meal_penalty: z.coerce.number().min(0),
  weekly_menu_budget: z.coerce.number().min(0),
  allow_guest_meals: z.boolean(),
  require_expense_approval: z.boolean(),
  auto_manager_rotation: z.boolean(),
  manager_rotation_type: z.enum(["weekly", "monthly", "manual"]),
  notifications_enabled: z.boolean(),
  max_meal_leave_days: z.coerce.number().min(7).max(90),
  allow_open_leave_presets: z.boolean(),
});

type MessInfoForm = z.infer<typeof messInfoSchema>;
type MessSettingsForm = z.infer<typeof messSettingsSchema>;

const MESS_TYPE_LABELS: Record<string, string> = {
  student: "Student",
  job_holder: "Job Holder",
  family: "Family",
  hostel: "Hostel",
};

export default function MessSettingsPage() {
  const { t } = useLanguage();
  const { activeMess } = useMessStore();
  const { data: mess, isLoading } = useMess(activeMess?.id);
  const queryClient = useQueryClient();
  const isOwnerOrAdmin = useHasPermission("settings.manage");

  const [savingInfo, setSavingInfo]     = useState(false);
  const [savingRules, setSavingRules]   = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [qrOpen, setQrOpen]             = useState(false);

  const settings = mess?.mess_settings ?? undefined;

  const infoForm = useForm<MessInfoForm>({
    resolver: zodResolver(messInfoSchema),
    values: {
      name: mess?.name ?? "",
      address: mess?.address ?? "",
      mess_type: (mess?.mess_type as MessInfoForm["mess_type"]) ?? "student",
      seat_capacity: mess?.seat_capacity ?? "",
    },
  });

  const rulesForm = useForm<MessSettingsForm>({
    resolver: zodResolver(messSettingsSchema),
    values: {
      meal_cutoff_breakfast:    settings?.meal_cutoff_breakfast    ?? "08:00",
      meal_cutoff_lunch:        settings?.meal_cutoff_lunch        ?? "10:00",
      meal_cutoff_dinner:       settings?.meal_cutoff_dinner       ?? "16:00",
      cutoff_days_before:       settings?.cutoff_days_before       ?? 0,
      cutoff_time_mode:         (settings?.cutoff_time_mode        ?? "per_meal") as "single" | "per_meal",
      cutoff_single_time:       settings?.cutoff_single_time       ?? "22:00",
      min_deposit_amount:       settings?.min_deposit_amount       ?? 100,
      guest_meal_charge:        settings?.guest_meal_charge        ?? 0,
      late_meal_penalty:        settings?.late_meal_penalty        ?? 0,
      weekly_menu_budget:       settings?.weekly_menu_budget       ?? 0,
      allow_guest_meals:        settings?.allow_guest_meals        ?? true,
      require_expense_approval: settings?.require_expense_approval ?? false,
      auto_manager_rotation:    settings?.auto_manager_rotation    ?? false,
      manager_rotation_type:    settings?.manager_rotation_type    ?? "monthly",
      notifications_enabled:    settings?.notifications_enabled    ?? true,
      max_meal_leave_days:      settings?.max_meal_leave_days      ?? 90,
      allow_open_leave_presets: settings?.allow_open_leave_presets ?? true,
    },
  });

  const handleCopyCode = () => {
    if (mess?.invite_code) {
      navigator.clipboard.writeText(mess.invite_code);
      toast.success(t.mess.codeCopied);
    }
  };

  const handleShareQr = async () => {
    if (!mess?.invite_code) return;
    const shareText = t.messExt.shareTextTemplate
      .replace("{name}", mess.name)
      .replace("{code}", mess.invite_code);
    if (navigator.share) {
      try {
        await navigator.share({ title: mess.name, text: shareText });
      } catch {
        navigator.clipboard.writeText(shareText);
        toast.success(t.mess.textCopied);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success(t.mess.shareCopied);
    }
  };

  const handleDownloadQr = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 400, 400);
      const link = document.createElement("a");
      link.download = `messpilot-invite-${mess?.invite_code ?? "qr"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleRegenerateCode = async () => {
    if (!activeMess?.id) return;
    if (!confirm(t.mess.confirmNewCode)) return;
    setRegenerating(true);
    try {
      await messService.regenerateInviteCode(activeMess.id);
      queryClient.invalidateQueries({ queryKey: ["mess"] });
      toast.success(t.mess.newCodeCreated);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRegenerating(false);
    }
  };

  const onSaveInfo = async (data: MessInfoForm) => {
    if (!activeMess?.id) return;
    setSavingInfo(true);
    try {
      await messService.updateMess(activeMess.id, {
        name: data.name,
        address: data.address || undefined,
        mess_type: data.mess_type,
        seat_capacity: data.seat_capacity ? Number(data.seat_capacity) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["mess"] });
      toast.success(t.mess.infoSaved);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingInfo(false);
    }
  };

  const onSaveRules = async (data: MessSettingsForm) => {
    if (!activeMess?.id) return;
    setSavingRules(true);
    try {
      await messService.updateMess(activeMess.id, { settings: data });
      queryClient.invalidateQueries({ queryKey: ["mess"] });
      toast.success(t.mess.rulesSaved);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingRules(false);
    }
  };

  const qrValue = mess?.invite_code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${mess.invite_code}`
    : "MESSPILOT";

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-28 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Compact info strip — tagline + status badges */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-muted-foreground">{t.mess.pageSubtitle}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 text-xs font-normal">
            <Calendar className="h-3 w-3" />
            {t.mess.currentMonth}: {formatMonth(mess?.current_month ?? "")}
          </Badge>
          <Badge variant="secondary" className="gap-1.5 text-xs font-normal">
            <Building2 className="h-3 w-3" />
            {MESS_TYPE_LABELS[mess?.mess_type ?? "student"] ?? mess?.mess_type}
          </Badge>
          {mess?.seat_capacity && (
            <Badge variant="secondary" className="gap-1.5 text-xs font-normal">
              <Users className="h-3 w-3" />
              {mess.seat_capacity} {t.mess.seatCapacity}
            </Badge>
          )}
          {mess?.is_month_closed && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
              {t.mess.monthClosed}
            </Badge>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl [&>[data-state=active]]:bg-primary [&>[data-state=active]]:text-primary-foreground [&>[data-state=active]]:shadow-md">
          <TabsTrigger value="info" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <Building2 className="h-3.5 w-3.5" />
            {t.mess.infoTitle}
          </TabsTrigger>
          <TabsTrigger value="invite" className="flex-1 gap-1.5 text-xs sm:text-sm">
            <QrCode className="h-3.5 w-3.5" />
            {t.mess.inviteTitle}
          </TabsTrigger>
          {isOwnerOrAdmin && (
            <TabsTrigger value="rules" className="flex-1 gap-1.5 text-xs sm:text-sm">
              <Settings2 className="h-3.5 w-3.5" />
              {t.mess.rulesTitle}
            </TabsTrigger>
          )}
          {isOwnerOrAdmin && (
            <TabsTrigger value="danger" className="flex-1 gap-1.5 text-xs sm:text-sm text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t.mess.dangerZone}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Tab: Mess Info ── */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t.mess.infoTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={infoForm.handleSubmit(onSaveInfo)} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t.mess.nameLabel} *</Label>
                    <Input
                      {...infoForm.register("name")}
                      placeholder={t.mess.namePlaceholder}
                      disabled={!isOwnerOrAdmin}
                    />
                    {infoForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{infoForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t.mess.messType}</Label>
                    <Select
                      value={infoForm.watch("mess_type")}
                      onValueChange={(v) => infoForm.setValue("mess_type", v as MessInfoForm["mess_type"])}
                      disabled={!isOwnerOrAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">{t.mess.types.student}</SelectItem>
                        <SelectItem value="job_holder">{t.mess.types.job}</SelectItem>
                        <SelectItem value="family">{t.mess.types.family}</SelectItem>
                        <SelectItem value="hostel">{t.mess.types.hostel}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t.mess.addressLabel}</Label>
                    <Input
                      {...infoForm.register("address")}
                      placeholder={t.mess.addressPlaceholder}
                      disabled={!isOwnerOrAdmin}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t.mess.seatCapacity}</Label>
                    <Input
                      type="number"
                      min="1"
                      {...infoForm.register("seat_capacity")}
                      placeholder={t.amountZero}
                      disabled={!isOwnerOrAdmin}
                    />
                  </div>
                </div>

                {isOwnerOrAdmin && (
                  <Button type="submit" disabled={savingInfo} className="mt-2">
                    {savingInfo ? t.saving : t.mess.saveInfoBtn}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Invite & QR ── */}
        <TabsContent value="invite" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t.mess.inviteTitle}
              </CardTitle>
              <CardDescription>{t.mess.inviteDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-lg">
              {/* Invite code display */}
              <div className="flex items-center gap-3">
                <div className="flex-1 font-mono text-2xl font-bold tracking-widest text-center bg-muted rounded-xl py-4 select-all">
                  {mess?.invite_code ?? "XXXXXXXX"}
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="icon" onClick={handleCopyCode} title={t.mess.copyCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  {isOwnerOrAdmin && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRegenerateCode}
                      disabled={regenerating}
                      title={t.mess.newCode}
                    >
                      <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
                    </Button>
                  )}
                </div>
              </div>

              {/* QR section */}
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 bg-white p-3 rounded-xl border-2 border-border shadow-sm">
                  <QRCodeSVG value={qrValue} size={120} level="M" includeMargin={false} />
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t.mess.qrDesc}</p>
                  <div className="flex flex-wrap gap-2">
                    <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <QrCode className="h-4 w-4" />
                          {t.mess.showBigQr}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                          <DialogTitle>{mess?.name} — {t.mess.inviteQr}</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                          <div className="bg-white p-4 rounded-2xl border-2 border-border shadow-sm">
                            <QRCodeSVG id="qr-code-svg" value={qrValue} size={240} level="H" includeMargin={false} />
                          </div>
                          <div className="text-center">
                            <p className="font-mono text-xl font-bold tracking-widest">{mess?.invite_code}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t.mess.inviteCode}</p>
                          </div>
                          <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 gap-2" onClick={handleDownloadQr}>
                              <Download className="h-4 w-4" />
                              {t.mess.download}
                            </Button>
                            <Button variant="outline" className="flex-1 gap-2" onClick={handleShareQr}>
                              <Share2 className="h-4 w-4" />
                              {t.mess.share}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button variant="outline" size="sm" className="gap-2" onClick={handleShareQr}>
                      <Share2 className="h-4 w-4" />
                      {t.mess.share}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Meal Rules ── */}
        {isOwnerOrAdmin && (
          <TabsContent value="rules" className="mt-4">
            <form onSubmit={rulesForm.handleSubmit(onSaveRules)} className="space-y-4">

              {/* Row 1: Cutoff + Financial side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Meal Cutoff Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t.mess.cutoffTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t.mess.cutoffDaysBefore}</Label>
                      <Select
                        value={String(rulesForm.watch("cutoff_days_before") ?? 0)}
                        onValueChange={(v) => rulesForm.setValue("cutoff_days_before", Number(v))}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">{t.mess.cutoffSameDay}</SelectItem>
                          <SelectItem value="1">{t.mess.cutoff1Day}</SelectItem>
                          <SelectItem value="2">{t.mess.cutoff2Days}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">{t.mess.cutoffExampleNote}</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">{t.mess.cutoffTimeModeLabel}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["single", "per_meal"] as const).map((mode) => {
                          const active = (rulesForm.watch("cutoff_time_mode") ?? "per_meal") === mode;
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => rulesForm.setValue("cutoff_time_mode", mode)}
                              className={`py-1.5 px-3 text-xs rounded-lg border transition-colors ${
                                active
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-input bg-background text-foreground hover:bg-muted"
                              }`}
                            >
                              {mode === "single" ? t.mess.cutoffSingleTimeMode : t.mess.cutoffPerMealTimeMode}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(rulesForm.watch("cutoff_time_mode") ?? "per_meal") === "single" ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.mess.cutoffSingleTimeInputLabel} ({t.mess.cutoffAfterNote})</Label>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-1">
                            <Input
                              type="time"
                              {...rulesForm.register("cutoff_single_time")}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t.mess.sameDayCutoffLabel}</Label>
                        <div className="grid grid-cols-3 gap-3">
                          {([
                            { field: "meal_cutoff_breakfast" as const, label: t.kitchen.breakfast },
                            { field: "meal_cutoff_lunch"     as const, label: t.kitchen.lunch     },
                            { field: "meal_cutoff_dinner"    as const, label: t.kitchen.dinner    },
                          ]).map(({ field, label }) => (
                            <div key={field} className="space-y-1">
                              <Label className="text-xs">{label}</Label>
                              <Input type="time" {...rulesForm.register(field)} className="text-sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Financial Rules Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t.mess.financialRules}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t.mess.minDeposit} (৳)</Label>
                        <Input type="number" min="0" {...rulesForm.register("min_deposit_amount")} className="text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.mess.guestMealCharge} (৳/{t.mess.meal})</Label>
                        <Input type="number" min="0" placeholder="0" {...rulesForm.register("guest_meal_charge")} className="text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.mess.lateMealPenalty} (৳)</Label>
                        <Input type="number" min="0" placeholder="0" {...rulesForm.register("late_meal_penalty")} className="text-sm" />
                        <p className="text-[10px] text-muted-foreground">{t.mess.latePenaltyNote}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.mess.weeklyMenuBudget} (৳)</Label>
                        <Input type="number" min="0" placeholder="0" {...rulesForm.register("weekly_menu_budget")} className="text-sm" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Row 2: Permissions & Notifications */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {t.mess.permNotif}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {([
                      { field: "allow_guest_meals"          as const, label: t.mess.guestMealLabel,       desc: t.mess.guestMealDesc        },
                      { field: "require_expense_approval"   as const, label: t.mess.expenseApprovalLabel, desc: t.mess.expenseApprovalDesc  },
                      { field: "auto_manager_rotation"      as const, label: t.mess.autoRotationLabel,    desc: t.mess.autoRotationDesc     },
                      { field: "notifications_enabled"      as const, label: t.mess.notifEnabledLabel,    desc: t.mess.notifEnabledDesc     },
                    ]).map(({ field, label, desc }) => (
                      <div key={field} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          checked={rulesForm.watch(field) as boolean}
                          onCheckedChange={(v) => rulesForm.setValue(field, v)}
                        />
                      </div>
                    ))}
                  </div>

                  {rulesForm.watch("auto_manager_rotation") && (
                    <div className="mt-4 space-y-1.5">
                      <Label className="text-xs">{t.mess.rotationType}</Label>
                      <Select
                        value={rulesForm.watch("manager_rotation_type")}
                        onValueChange={(v) => rulesForm.setValue("manager_rotation_type", v as "weekly" | "monthly" | "manual")}
                      >
                        <SelectTrigger className="max-w-[200px] text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">{t.mess.rotationTypes.weekly}</SelectItem>
                          <SelectItem value="monthly">{t.mess.rotationTypes.monthly}</SelectItem>
                          <SelectItem value="manual">{t.mess.rotationTypes.manual}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Row 3: Meal Leave Rules */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {t.mess.mealLeaveRules}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t.mess.maxLeaveDays}</Label>
                      <Input
                        type="number"
                        min="7"
                        max="90"
                        {...rulesForm.register("max_meal_leave_days")}
                        className="text-sm max-w-[140px]"
                      />
                      <p className="text-[10px] text-muted-foreground">{t.mess.maxLeaveDaysDesc}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{t.mess.allowOpenLeavePresets}</p>
                        <p className="text-xs text-muted-foreground">{t.mess.allowOpenLeavePresetsDesc}</p>
                      </div>
                      <Switch
                        checked={rulesForm.watch("allow_open_leave_presets")}
                        onCheckedChange={(v) => rulesForm.setValue("allow_open_leave_presets", v)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" disabled={savingRules} className="gap-1.5">
                <Settings2 className="h-4 w-4" />
                {savingRules ? t.saving : t.mess.saveRulesBtn}
              </Button>
            </form>
          </TabsContent>
        )}

        {/* ── Tab: Danger Zone ── */}
        {isOwnerOrAdmin && (
          <TabsContent value="danger" className="mt-4">
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  {t.mess.dangerZone}
                </CardTitle>
              </CardHeader>
              <CardContent className="max-w-md">
                <p className="text-sm text-muted-foreground mb-4">{t.mess.closeMonthWarning}</p>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => toast.info(t.mess.closeMonthToast)}
                >
                  {t.mess.closeMonthBtn}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
