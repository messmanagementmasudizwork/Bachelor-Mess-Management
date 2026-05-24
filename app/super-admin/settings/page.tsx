"use client";
import { usePlatformSettings, useUpdatePlatformSetting, usePlatformStats } from "@/lib/hooks/use-super-admin";
import { useLanguage } from "@/lib/hooks/use-language";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings, Server, Users, Building2, Shield, Bell,
  Zap, RefreshCw, Save, AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}

export default function SystemSettingsPage() {
  const { t } = useLanguage();
  const { data: settings, isLoading } = usePlatformSettings();
  const { data: stats } = usePlatformStats();
  const updateSetting = useUpdatePlatformSetting();

  const [numValues,  setNumValues]  = useState<Record<string, string>>({});
  const [textValues, setTextValues] = useState<Record<string, string>>({});

  const BOOL_SETTINGS = [
    { key: "maintenance_mode",         label: t.superAdmin.settings.maintenance,       desc: t.superAdmin.settings.maintenanceDesc,       icon: AlertTriangle, danger: true  },
    { key: "allow_new_registrations",  label: t.superAdmin.settings.newRegistration,   desc: t.superAdmin.settings.newRegistrationDesc,   icon: Users,         danger: false },
    { key: "allow_new_messes",         label: t.superAdmin.settings.newMessCreation,   desc: t.superAdmin.settings.newMessCreationDesc,   icon: Building2,     danger: false },
    { key: "enable_ai_features",       label: t.superAdmin.settings.aiFeatures,        desc: t.superAdmin.settings.aiFeaturesDesc,        icon: Zap,           danger: false },
    { key: "enable_realtime",          label: t.superAdmin.settings.realtimeUpdates,   desc: t.superAdmin.settings.realtimeDesc,          icon: RefreshCw,     danger: false },
    { key: "enable_push_notifications",label: t.superAdmin.settings.pushNotifications, desc: t.superAdmin.settings.pushDesc,              icon: Bell,          danger: false },
  ];

  const NUM_SETTINGS = [
    { key: "max_members_per_mess", label: t.superAdmin.settings.maxMembersPerMess, desc: t.superAdmin.settings.maxMembersDesc, min: 5,  max: 500 },
    { key: "max_messes_per_user",  label: t.superAdmin.settings.maxMessesPerUser,  desc: t.superAdmin.settings.maxMessesDesc,  min: 1,  max: 20  },
  ];

  const TEXT_SETTINGS = [
    { key: "platform_version", label: t.superAdmin.settings.platformVersion, placeholder: "1.0.0" },
    { key: "support_email",    label: t.superAdmin.settings.supportEmail,    placeholder: "support@messpilot.com" },
  ];

  useEffect(() => {
    if (!settings) return;
    const nums: Record<string, string> = {};
    const texts: Record<string, string> = {};
    for (const s of NUM_SETTINGS)  nums[s.key]  = settings[s.key] ?? "";
    for (const s of TEXT_SETTINGS) texts[s.key] = settings[s.key] ?? "";
    setNumValues(nums);
    setTextValues(texts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const toggleBool = (key: string, current: boolean) => {
    updateSetting.mutate({ key, value: (!current).toString() });
  };

  const saveNum = (key: string) => {
    const val = numValues[key];
    if (!val || isNaN(Number(val))) {
      toast.error(t.superAdmin.settings.invalidNumber);
      return;
    }
    updateSetting.mutate({ key, value: val });
  };

  const saveText = (key: string) => {
    updateSetting.mutate({ key, value: textValues[key] ?? "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.superAdmin.settings.title}</h1>
          <p className="text-sm text-slate-500">{t.superAdmin.settings.subtitle}</p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Server className="w-4 h-4" /> {t.superAdmin.settings.platformInfo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t.superAdmin.settings.totalMesses,   value: stats?.totalMesses        },
              { label: t.superAdmin.settings.activeMesses,  value: stats?.activeMesses       },
              { label: t.superAdmin.settings.totalUsers,    value: stats?.totalUsers         },
              { label: t.superAdmin.settings.activeMembers, value: stats?.totalActiveMembers },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{value ?? "—"}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Shield className="w-4 h-4" /> {t.superAdmin.settings.featureToggles}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <SettingsSkeleton />}
            {!isLoading && BOOL_SETTINGS.map(({ key, label, desc, icon: Icon, danger }) => {
              const isOn = settings?.[key] === "true";
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    danger && isOn
                      ? "bg-red-50 border-red-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${danger && isOn ? "text-red-600" : "text-slate-500"}`} />
                    <div>
                      <p className={`text-sm font-medium ${danger && isOn ? "text-red-700" : "text-slate-800"}`}>
                        {label}
                      </p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isOn}
                    onCheckedChange={() => toggleBool(key, isOn)}
                    disabled={updateSetting.isPending}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4" /> {t.superAdmin.settings.limits}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading && <Skeleton className="h-24 rounded-xl" />}
              {!isLoading && NUM_SETTINGS.map(({ key, label, desc }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">{label}</label>
                  <p className="text-xs text-slate-400 mb-2">{desc}</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={numValues[key] ?? ""}
                      onChange={(e) => setNumValues((p) => ({ ...p, [key]: e.target.value }))}
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={() => saveNum(key)} disabled={updateSetting.isPending}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Server className="w-4 h-4" /> {t.superAdmin.settings.platformInfo}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading && <Skeleton className="h-24 rounded-xl" />}
              {!isLoading && TEXT_SETTINGS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">{label}</label>
                  <div className="flex gap-2">
                    <Input
                      value={textValues[key] ?? ""}
                      placeholder={placeholder}
                      onChange={(e) => setTextValues((p) => ({ ...p, [key]: e.target.value }))}
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={() => saveText(key)} disabled={updateSetting.isPending}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
