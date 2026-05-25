"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User, Lock, Bell, LogOut, Save,
  Eye, EyeOff, RefreshCw, Sun, Moon, Monitor, Globe, BellRing, BellOff,
  Shield, History, LogIn, Settings2, CopyCheck, Clock, Banknote, Calendar,
  Briefcase, Building2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { auditService } from "@/lib/services/audit.service";
import { PinSetupDialog } from "@/components/shared/PinDialog";
import { usePinProtection } from "@/lib/hooks/use-pin";
import { formatDistanceToNow } from "date-fns";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { useMyMembership, useUpdateMealDefaults, useUpdateRoomInfo } from "@/lib/hooks/use-members";
import { useApplyDefaultsToMonth } from "@/lib/hooks/use-meals";
import { useMess } from "@/lib/hooks/use-mess";
import { useMessStore } from "@/lib/stores/mess.store";
import { usePreferences } from "@/lib/hooks/use-preferences";
import type { CurrencySymbol, DateFormatPref, TimeFormatPref } from "@/lib/stores/preferences.store";
import { usePreferencesStore } from "@/lib/stores/preferences.store";
import { authService } from "@/lib/services/auth.service";
import { storageService } from "@/lib/services/storage.service";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { getInitials, cn } from "@/lib/utils";
import { getRoleDisplayNameBn } from "@/lib/utils/permissions";
import { toast } from "sonner";
import type { MemberRole, MessSettings } from "@/lib/types";
import { getTodayString } from "@/lib/utils/date";
import { checkMealToggleAllowed } from "@/lib/utils/meal-cutoff";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/hooks/use-language";
import type { Lang } from "@/lib/i18n";
import { usePushNotification } from "@/lib/hooks/use-push-notification";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const DEFAULT_NOTIF_PREFS: Record<string, boolean> = {
  expense_added: true,
  deposit_confirmed: true,
  meal_reminder: true,
  due_reminder: true,
  manager_changed: true,
  low_balance: true,
};

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
      {icon}
      {label}
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { activeMess } = useMessStore();
  const { data: myMembership } = useMyMembership();
  const { data: mess } = useMess(activeMess?.id);
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const {
    currencySymbol, dateFormat, timeFormat,
    setCurrencySymbol, setDateFormat, setTimeFormat,
  } = usePreferences();
  const hydratePreferences = usePreferencesStore((s) => s.hydrate);

  const { data: profileData } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => authService.getProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const profileSchema = z.object({
    full_name: z.string().min(2, t.settings.nameMinLength),
    phone: z.string().regex(/^(01[3-9]\d{8})?$/, t.settings.validPhone).optional().or(z.literal("")),
    profession: z.string().max(100).optional().or(z.literal("")),
    blood_group: z.string().optional().or(z.literal("")),
    emergency_contact: z.string().max(15).optional().or(z.literal("")),
  });

  const passwordSchema = z.object({
    new_password: z.string().min(8, t.settings.passwordMinLength),
    confirm_password: z.string(),
  }).refine((d) => d.new_password === d.confirm_password, {
    message: t.settings.passwordMismatch,
    path: ["confirm_password"],
  });

  const workSchema = z.object({
    company: z.string().max(150).optional().or(z.literal("")),
    department: z.string().max(100).optional().or(z.literal("")),
    designation: z.string().max(100).optional().or(z.literal("")),
    job_joining_date: z.string().optional().or(z.literal("")),
    job_id_card_no: z.string().max(100).optional().or(z.literal("")),
  });

  const roomSchema = z.object({
    building: z.string().max(100).optional().or(z.literal("")),
    floor_number: z.string().max(50).optional().or(z.literal("")),
    room_number: z.string().max(50).optional().or(z.literal("")),
    seat_number: z.coerce.number().int().positive().optional().nullable(),
  });

  type ProfileForm = z.infer<typeof profileSchema>;
  type PasswordForm = z.infer<typeof passwordSchema>;
  type WorkForm = z.infer<typeof workSchema>;
  type RoomForm = z.infer<typeof roomSchema>;

  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingWork, setSavingWork] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);
  const [pinDialogMode, setPinDialogMode] = useState<"set" | "change" | "remove" | null>(null);
  const [showDefaultsDialog, setShowDefaultsDialog] = useState(false);
  const [pendingSlotStartDates, setPendingSlotStartDates] = useState<{
    breakfast: string; lunch: string; dinner: string;
  } | null>(null);
  const { isPinSet, refreshPinStatus } = usePinProtection();
  const pinIsSet = isPinSet();

  const updateRoomInfo = useUpdateRoomInfo();
  const [mealDefaults, setMealDefaults] = useState({ breakfast: true, lunch: true, dinner: true });
  const updateMealDefaults = useUpdateMealDefaults();
  const applyDefaultsToMonth = useApplyDefaultsToMonth();

  useEffect(() => {
    if (myMembership) {
      setMealDefaults({
        breakfast: myMembership.meal_default_breakfast ?? true,
        lunch: myMembership.meal_default_lunch ?? true,
        dinner: myMembership.meal_default_dinner ?? true,
      });
      roomForm.reset({
        building: myMembership.building ?? "",
        floor_number: myMembership.floor_number ?? "",
        room_number: myMembership.room_number ?? "",
        seat_number: myMembership.seat_number ?? null,
      });
    }
  }, [myMembership?.id]);

  const handleOpenDefaultsDialog = () => {
    if (!myMembership?.id) return;
    const messSettings = (mess?.mess_settings ?? {}) as Partial<MessSettings>;
    const myRole = activeMess?.role as MemberRole | undefined;
    const joiningDate = myMembership.joining_date as string | undefined;
    const today = getTodayString();
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
      .toISOString().split("T")[0]!;

    const getSlotStart = (slot: "breakfast" | "lunch" | "dinner") => {
      const todayCheck = checkMealToggleAllowed(slot, today, myRole, messSettings, joiningDate);
      return todayCheck.allowed ? today : tomorrow;
    };

    setPendingSlotStartDates({
      breakfast: getSlotStart("breakfast"),
      lunch:     getSlotStart("lunch"),
      dinner:    getSlotStart("dinner"),
    });
    setShowDefaultsDialog(true);
  };

  const handleConfirmMealDefaults = async () => {
    if (!myMembership?.id || !pendingSlotStartDates) return;
    setShowDefaultsDialog(false);
    await updateMealDefaults.mutateAsync({
      memberId: myMembership.id,
      defaults: {
        meal_default_breakfast: mealDefaults.breakfast,
        meal_default_lunch: mealDefaults.lunch,
        meal_default_dinner: mealDefaults.dinner,
      },
    });
    await applyDefaultsToMonth.mutateAsync({
      memberId: myMembership.id,
      defaults: mealDefaults,
      slotStartDates: pendingSlotStartDates,
    });
  };

  const { data: loginHistory = [] } = useQuery({
    queryKey: ["login_history", user?.id],
    queryFn: () => auditService.getLoginHistory(user!.id, 5),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const { data: notifPrefsData } = useQuery({
    queryKey: ["notif_prefs", user?.id],
    queryFn: () => authService.getNotificationPreferences(user!.id),
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(DEFAULT_NOTIF_PREFS);
  useEffect(() => {
    if (notifPrefsData) setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...notifPrefsData });
  }, [notifPrefsData]);

  const handleLanguageChange = async (newLang: Lang) => {
    await setLang(newLang);
    toast.success(newLang === "en"
      ? t.settingsExt.languageChangedToEn
      : t.settingsExt.languageChangedToBn);
  };

  const { isSubscribed: isPushSubscribed, isLoading: isPushLoading, mode: pushMode, permission: pushPermission, enablePush, disablePush } = usePushNotification();

  const handleNotifPrefChange = async (key: string, value: boolean) => {
    if (!user?.id) return;
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    try {
      await authService.updateNotificationPreferences(user.id, updated);
    } catch {
      setNotifPrefs(notifPrefs);
      toast.error(t.settings.saveFailed ?? "সেভ হয়নি, আবার চেষ্টা করুন");
    }
  };

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      profession: "",
      blood_group: "",
      emergency_contact: "",
    },
  });

  const workForm = useForm<WorkForm>({
    resolver: zodResolver(workSchema),
    defaultValues: {
      company: "",
      department: "",
      designation: "",
      job_joining_date: "",
      job_id_card_no: "",
    },
  });

  const roomForm = useForm<RoomForm>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      building: "",
      floor_number: "",
      room_number: "",
      seat_number: null,
    },
  });

  useEffect(() => {
    if (profileData) {
      profileForm.reset({
        full_name: profileData.full_name ?? "",
        phone: profileData.phone ?? "",
        profession: profileData.profession ?? "",
        blood_group: profileData.blood_group ?? "",
        emergency_contact: profileData.emergency_contact ?? "",
      });
      workForm.reset({
        company: profileData.company ?? "",
        department: profileData.department ?? "",
        designation: profileData.designation ?? "",
        job_joining_date: profileData.job_joining_date ?? "",
        job_id_card_no: profileData.job_id_card_no ?? "",
      });
      if (profileData.ui_theme && ["light", "dark", "system"].includes(profileData.ui_theme)) {
        setTheme(profileData.ui_theme);
      }
      hydratePreferences({
        currencySymbol: (profileData.currency_symbol as CurrencySymbol) ?? undefined,
        dateFormat: (profileData.date_format as DateFormatPref) ?? undefined,
        timeFormat: (profileData.time_format as TimeFormatPref) ?? undefined,
      });
    }
  }, [profileData]);

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const onSaveProfile = async (data: ProfileForm) => {
    setSavingProfile(true);
    try {
      await authService.updateProfile({
        full_name: data.full_name,
        phone: data.phone || undefined,
        profession: data.profession || undefined,
        blood_group: data.blood_group || undefined,
        emergency_contact: data.emergency_contact || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success(t.settings.profileSaved);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const onSaveWork = async (data: WorkForm) => {
    setSavingWork(true);
    try {
      await authService.updateProfile({
        company: data.company || undefined,
        department: data.department || undefined,
        designation: data.designation || undefined,
        job_joining_date: data.job_joining_date || undefined,
        job_id_card_no: data.job_id_card_no || undefined,
      });
      toast.success(t.settings.workInfoSaved);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingWork(false);
    }
  };

  const onSaveRoom = async (data: RoomForm) => {
    if (!myMembership?.id) return;
    setSavingRoom(true);
    try {
      await updateRoomInfo.mutateAsync({
        memberId: myMembership.id,
        info: {
          building: data.building || null,
          floor_number: data.floor_number || null,
          room_number: data.room_number || null,
          seat_number: data.seat_number ?? null,
        },
      });
    } catch {
    } finally {
      setSavingRoom(false);
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    setSavingPassword(true);
    try {
      await authService.updatePassword(data.new_password);
      toast.success(t.settings.passwordChanged);
      passwordForm.reset();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingPassword(false);
    }
  };

  const notifItems = [
    { key: "expense_added",    label: t.settings.notifExpenseAdded,    desc: t.settings.notifExpenseAddedDesc    },
    { key: "deposit_confirmed",label: t.settings.notifDepositConfirmed,desc: t.settings.notifDepositConfirmedDesc},
    { key: "meal_reminder",    label: t.settings.notifMealReminder,    desc: t.settings.notifMealReminderDesc    },
    { key: "due_reminder",     label: t.settings.notifDueReminder,     desc: t.settings.notifDueReminderDesc     },
    { key: "manager_changed",  label: t.settings.notifManagerChanged,  desc: t.settings.notifManagerChangedDesc  },
    { key: "low_balance",      label: t.settings.notifLowBalance,      desc: t.settings.notifLowBalanceDesc      },
  ];

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const datePreviewOptions: { value: DateFormatPref; example: string }[] = [
    { value: "d MMMM, yyyy", example: format(new Date(), "d MMMM, yyyy") },
    { value: "dd/MM/yyyy",   example: format(new Date(), "dd/MM/yyyy")   },
    { value: "yyyy-MM-dd",   example: format(new Date(), "yyyy-MM-dd")   },
  ];

  const currencyOptions: { value: CurrencySymbol; label: string; preview: string }[] = [
    { value: "৳",   label: "৳",   preview: "৳১,২৫০" },
    { value: "Tk",  label: "Tk",  preview: "Tk 1,250" },
    { value: "BDT", label: "BDT", preview: "BDT 1,250" },
  ];

  const timeOptions: { value: TimeFormatPref; label: string; example: string }[] = [
    { value: "12h", label: t.settingsExt.time12h, example: format(new Date(), "hh:mm a") },
    { value: "24h", label: t.settingsExt.time24h, example: format(new Date(), "HH:mm")   },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── 1. Profile ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {t.settings.profileInfo}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <ImageUpload
              currentUrl={user?.user_metadata?.avatar_url}
              fallbackText={getInitials(user?.user_metadata?.full_name ?? user?.email ?? "U")}
              size="lg"
              onUpload={async (file) => {
                if (!user?.id) {
                  toast.error("User session not found. Please reload and try again.");
                  throw new Error("User session not found");
                }
                try {
                  const url = await storageService.uploadAvatar(user.id, file);
                  await authService.updateProfile({ avatar_url: url });
                  queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
                  toast.success(t.settings.imageUpdateSuccess);
                } catch (err) {
                  console.error("[PhotoUpload] upload failed:", err);
                  throw err;
                }
              }}
              onRemove={async () => {
                if (!user?.id) {
                  toast.error("User session not found. Please reload and try again.");
                  throw new Error("User session not found");
                }
                try {
                  await storageService.deleteAvatar(user.id);
                  await authService.updateProfile({ avatar_url: null });
                  queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
                  toast.success(t.settings.imageRemoveSuccess ?? "Photo removed");
                } catch (err) {
                  console.error("[PhotoUpload] remove failed:", err);
                  throw err;
                }
              }}
            />
            <div>
              <p className="font-semibold">{user?.user_metadata?.full_name ?? t.settings.noName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {myMembership && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {getRoleDisplayNameBn(myMembership.role as MemberRole)}
                </Badge>
              )}
              <p className="text-xs text-muted-foreground mt-1">{t.settings.clickToChangePhoto}</p>
            </div>
          </div>

          <Separator />

          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.settings.fullName}</Label>
                <Input {...profileForm.register("full_name")} placeholder={t.settings.namePlaceholder} />
                {profileForm.formState.errors.full_name && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t.settings.email}</Label>
                <Input value={user?.email ?? ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label>{t.settings.phone}</Label>
                <Input {...profileForm.register("phone")} placeholder="01XXXXXXXXX" />
                {profileForm.formState.errors.phone && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t.settings.profession}</Label>
                <Input {...profileForm.register("profession")} placeholder={t.settings.professionPlaceholder} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.settings.bloodGroup}</Label>
                <Select
                  value={profileForm.watch("blood_group") ?? ""}
                  onValueChange={(v) => profileForm.setValue("blood_group", v)}
                >
                  <SelectTrigger><SelectValue placeholder={t.settings.selectBloodGroup} /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.settings.emergencyContact}</Label>
                <Input {...profileForm.register("emergency_contact")} placeholder="01XXXXXXXXX" />
              </div>
            </div>
            <Button type="submit" disabled={savingProfile} className="gap-1.5">
              <Save className="h-4 w-4" />
              {savingProfile ? t.saving : t.settings.saveProfile}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── 2 & 3. Work Information + Room & Seat Information ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Work Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {t.settings.workInfo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={workForm.handleSubmit(onSaveWork)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.company}</Label>
                  <Input {...workForm.register("company")} placeholder={t.settings.companyPlaceholder} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.department}</Label>
                  <Input {...workForm.register("department")} placeholder={t.settings.departmentPlaceholder} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.designation}</Label>
                  <Input {...workForm.register("designation")} placeholder={t.settings.designationPlaceholder} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.jobJoiningDate}</Label>
                  <Input type="date" {...workForm.register("job_joining_date")} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">{t.settings.jobIdCardNo}</Label>
                  <Input {...workForm.register("job_id_card_no")} placeholder={t.settings.jobIdCardNoPlaceholder} />
                </div>
              </div>
              <Button type="submit" disabled={savingWork} className="gap-1.5">
                <Save className="h-4 w-4" />
                {savingWork ? t.saving : t.settings.saveWorkInfo}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Room & Seat Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t.settings.roomInfo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={roomForm.handleSubmit(onSaveRoom)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.building}</Label>
                  <Input {...roomForm.register("building")} placeholder={t.settings.buildingPlaceholder} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.floorNumber}</Label>
                  <Input {...roomForm.register("floor_number")} placeholder={t.settings.floorPlaceholder} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.roomNumber}</Label>
                  <Input {...roomForm.register("room_number")} placeholder={t.settings.roomPlaceholder} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.seatNumber}</Label>
                  <Input
                    type="number"
                    min={1}
                    {...roomForm.register("seat_number", { valueAsNumber: true })}
                    placeholder="e.g. 5"
                  />
                </div>
              </div>
              <Button type="submit" disabled={savingRoom || !myMembership?.id} className="gap-1.5">
                <Save className="h-4 w-4" />
                {savingRoom ? t.saving : t.settings.saveRoomInfo}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Preferences (combined) ──────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            {t.settingsExt.preferencesTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Theme + Language — 2-col grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Theme */}
            <div>
              <SectionLabel icon={<Sun className="h-3.5 w-3.5" />} label={t.settings.theme} />
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: "light",  label: t.settings.themeLight,  icon: Sun     },
                  { value: "dark",   label: t.settings.themeDark,   icon: Moon    },
                  { value: "system", label: t.settings.themeSystem, icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setTheme(value);
                      if (user?.id) {
                        authService.updateUiPreferences(user.id, { ui_theme: value as "light" | "dark" | "system" }).catch(() => {});
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-xs font-medium transition-all",
                      theme === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <SectionLabel icon={<Globe className="h-3.5 w-3.5" />} label={t.settings.language} />
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: "bn" as const, label: "বাংলা",   sub: "Bengali"  },
                  { value: "en" as const, label: "English", sub: "ইংরেজি"  },
                ].map(({ value, label, sub }) => (
                  <button
                    key={value}
                    onClick={() => handleLanguageChange(value)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl border-2 transition-all",
                      lang === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-[10px] opacity-70">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Date & Time + Currency Symbol — same row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Date & Time */}
            <div>
              <SectionLabel icon={<Calendar className="h-3.5 w-3.5" />} label={t.settingsExt.dateTimeSection} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date format */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">{t.settingsExt.dateFormatLabel}</p>
                  <div className="flex flex-col gap-1.5">
                    {datePreviewOptions.map(({ value, example }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setDateFormat(value);
                          toast.success(t.settingsExt.dateFormatChanged);
                          if (user?.id) {
                            authService.updateUiPreferences(user.id, { date_format: value }).catch(() => {});
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all text-left",
                          dateFormat === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        )}
                      >
                        <span className="font-mono">{example}</span>
                        {dateFormat === value && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time format */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">{t.settingsExt.timeFormatLabel}</p>
                  <div className="flex flex-col gap-1.5">
                    {timeOptions.map(({ value, label, example }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setTimeFormat(value);
                          toast.success(t.settingsExt.timeFormatChanged);
                          if (user?.id) {
                            authService.updateUiPreferences(user.id, { time_format: value }).catch(() => {});
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all",
                          timeFormat === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        )}
                      >
                        <span>{label}</span>
                        <span className="font-mono opacity-70">{example}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Currency symbol */}
            <div>
              <SectionLabel icon={<Banknote className="h-3.5 w-3.5" />} label={t.settingsExt.currencyLabel} />
              <div className="grid grid-cols-3 gap-2">
                {currencyOptions.map(({ value, label, preview }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setCurrencySymbol(value);
                      toast.success(t.settingsExt.currencyChanged);
                      if (user?.id) {
                        authService.updateUiPreferences(user.id, { currency_symbol: value }).catch(() => {});
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all",
                      currencySymbol === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <span className="text-base font-bold">{label}</span>
                    <span className="text-[10px] opacity-70">{preview}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Recurring Meal Defaults */}
          <div>
            <SectionLabel icon={<Settings2 className="h-3.5 w-3.5" />} label={t.meals.recurringDefaults} />
            <p className="text-xs text-muted-foreground mb-2">{t.meals.applyDefaultsNote}</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { key: "breakfast" as const, label: t.meals.breakfastFull, emoji: "🌅" },
                { key: "lunch"     as const, label: t.meals.lunchFull,     emoji: "☀️" },
                { key: "dinner"    as const, label: t.meals.dinnerFull,    emoji: "🌙" },
              ].map(({ key, label, emoji }) => (
                <div
                  key={key}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors",
                    mealDefaults[key] ? "border-green-200 bg-green-50/40" : "border-border bg-background"
                  )}
                >
                  <span className="text-xl">{emoji}</span>
                  <p className="text-xs font-medium text-center leading-tight">{label}</p>
                  <Switch
                    checked={mealDefaults[key]}
                    onCheckedChange={(v) => setMealDefaults((prev) => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
            </div>
            <Button
              onClick={handleOpenDefaultsDialog}
              disabled={updateMealDefaults.isPending || applyDefaultsToMonth.isPending || !myMembership?.id}
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
            >
              <CopyCheck className="h-3.5 w-3.5" />
              {(updateMealDefaults.isPending || applyDefaultsToMonth.isPending)
                ? t.meals.applyingDefaults
                : t.meals.applyDefaultsToMonth}
            </Button>
          </div>

          <Separator />

          {/* Notification Preferences */}
          <div>
            <SectionLabel icon={<Bell className="h-3.5 w-3.5" />} label={t.settings.notificationPreferences} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {isPushSubscribed
                    ? <BellRing className="h-3.5 w-3.5 text-primary shrink-0" />
                    : <BellOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">Push Notifications</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {pushMode === "unsupported"
                        ? t.notifications.noApiSupportDesc
                        : pushPermission === "denied"
                        ? t.notifications.permissionBlocked
                        : isPushSubscribed
                        ? t.notifications.pushEnabled
                        : t.notifications.pushDesc}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isPushSubscribed}
                  onCheckedChange={(v) => v ? enablePush() : disablePush()}
                  disabled={isPushLoading || pushMode === "unsupported" || pushPermission === "denied"}
                  className="ml-3 shrink-0"
                />
              </div>
              {notifItems.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {notifPrefs[key]
                      ? <BellRing className="h-3.5 w-3.5 text-primary shrink-0" />
                      : <BellOff  className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifPrefs[key] ?? true}
                    onCheckedChange={(v) => handleNotifPrefChange(key, v)}
                    className="ml-3 shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── 3. Security (combined) ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t.settingsExt.securityTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Change Password + Security PIN — inner cards, side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Change Password inner card */}
            <Card className="border bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  {t.settings.passwordChange}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={passwordForm.handleSubmit(onChangePassword)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t.settings.newPassword}</Label>
                      <div className="relative">
                        <Input
                          type={showNewPw ? "text" : "password"}
                          {...passwordForm.register("new_password")}
                          placeholder={t.settings.passwordMinLength}
                          className="pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {passwordForm.formState.errors.new_password && (
                        <p className="text-xs text-destructive">{passwordForm.formState.errors.new_password.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t.settings.confirmPassword}</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPw ? "text" : "password"}
                          {...passwordForm.register("confirm_password")}
                          placeholder={t.settings.confirmPasswordPlaceholder}
                          className="pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {passwordForm.formState.errors.confirm_password && (
                        <p className="text-xs text-destructive">{passwordForm.formState.errors.confirm_password.message}</p>
                      )}
                    </div>
                  </div>
                  <Button type="submit" disabled={savingPassword} variant="outline" size="sm" className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    {savingPassword ? t.settings.changingPassword : t.settings.changePassword}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Security PIN inner card */}
            <Card className="border bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t.settings.securityPin}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{t.settings.pinDesc}</p>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium">{pinIsSet ? t.settings.pinActive : t.settings.noPinSet}</p>
                  <Badge variant={pinIsSet ? "success" : "secondary"} className="text-xs">
                    {pinIsSet ? `✓ ${t.settings.pinStatus.active}` : t.settings.pinStatus.none}
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!pinIsSet ? (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPinDialogMode("set")}>
                      <Shield className="h-3.5 w-3.5" /> {t.settings.setPinBtn}
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPinDialogMode("change")}>
                        <RefreshCw className="h-3.5 w-3.5" /> {t.settings.changePin}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setPinDialogMode("remove")}>
                        {t.settings.removePin}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

        </CardContent>
      </Card>

      {/* ── 4. Login History (compact) ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            {t.settings.loginHistory}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loginHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">{t.noRecords}</p>
          ) : (
            <div className="space-y-0">
              {loginHistory.map((entry, i) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-center gap-3 py-2",
                    i < loginHistory.length - 1 && "border-b border-border/50"
                  )}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                    entry.action === "login" ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"
                  )}>
                    <LogIn className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      {entry.action === "login" ? t.settings.loginAction : t.settings.logoutAction}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. App info + Logout ──────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>{t.settings.appInfo}</span>
              <span className="font-medium text-foreground">v{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.settings.mess}</span>
              <span className="font-medium text-foreground truncate max-w-[160px]">{activeMess?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.settings.email}</span>
              <span className="font-medium text-foreground">{user?.email ?? "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full gap-2" onClick={signOut}>
        <LogOut className="h-4 w-4" />
        {t.logout}
      </Button>

      {pinDialogMode && (
        <PinSetupDialog
          open={!!pinDialogMode}
          mode={pinDialogMode}
          onClose={() => {
            setPinDialogMode(null);
            refreshPinStatus();
          }}
        />
      )}

      <Dialog open={showDefaultsDialog} onOpenChange={setShowDefaultsDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.meals.mealDefaultsScheduleTitle}</DialogTitle>
            <DialogDescription>{t.meals.mealDefaultsScheduleDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(["breakfast", "lunch", "dinner"] as const).map((slot) => {
              const labels = { breakfast: "🌅 " + t.meals.breakfast, lunch: "☀️ " + t.meals.lunch, dinner: "🌙 " + t.meals.dinner };
              const startDate = pendingSlotStartDates?.[slot];
              const today = getTodayString();
              const isToday = startDate === today;
              const isOn = mealDefaults[slot];
              return (
                <div key={slot} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium">{labels[slot]}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={isOn ? "default" : "secondary"} className="text-xs">
                      {isOn ? t.meals.mealOn : t.meals.mealOff}
                    </Badge>
                    <span className={`text-xs ${isToday ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}>
                      {isToday ? t.meals.mealDefaultsFromToday : t.meals.mealDefaultsFromTomorrow}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Only show cutoff note when at least one slot is locked to tomorrow */}
            {pendingSlotStartDates && Object.values(pendingSlotStartDates).some((d) => d !== getTodayString()) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{t.meals.mealDefaultsCutoffNote}</p>
            )}
            <p className="text-xs text-muted-foreground">{t.meals.mealDefaultsVacationNote}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDefaultsDialog(false)}>
              {t.cancel}
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirmMealDefaults}
              disabled={updateMealDefaults.isPending || applyDefaultsToMonth.isPending}
            >
              {t.meals.mealDefaultsConfirmApply}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
