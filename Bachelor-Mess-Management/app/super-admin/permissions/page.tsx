"use client";
import { useGlobalPresets, useUpdateGlobalPreset } from "@/lib/hooks/use-super-admin";
import { useLanguage } from "@/lib/hooks/use-language";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Check, X, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RolePermissionPreset } from "@/lib/types/member.types";

const ROLES = ["owner", "admin", "manager", "assistant_manager", "member", "guest"] as const;

function buildMatrix(presets: RolePermissionPreset[]) {
  const matrix: Record<string, Record<string, boolean>> = {};
  for (const p of presets) {
    if (!matrix[p.permission_key]) matrix[p.permission_key] = {};
    matrix[p.permission_key][p.role] = p.allowed;
  }
  return matrix;
}

export default function GlobalPermissionsPage() {
  const { t } = useLanguage();
  const { data: presets, isLoading } = useGlobalPresets();
  const updatePreset = useUpdateGlobalPreset();

  const matrix = presets ? buildMatrix(presets) : {};

  const ROLE_LABELS: Record<string, string> = {
    owner:             t.permissions.roles.owner,
    admin:             t.permissions.roles.admin,
    manager:           t.permissions.roles.manager,
    assistant_manager: t.gamification.roles.assistant_manager ?? t.permissions.roles.assistant,
    member:            t.permissions.roles.member,
    guest:             t.permissions.roles.guest,
  };

  const PERMISSION_LABELS: Record<string, string> = {
    "meals.manage_others":  t.permissions.permissionKeys.manage_others_meals,
    "expenses.create":      t.permissions.permissionKeys.create_expense,
    "expenses.approve":     t.permissions.permissionKeys.approve_expense,
    "expenses.delete":      t.permissions.permissionKeys.delete_expense,
    "bazaar.create":        t.permissions.permissionKeys.create_bazaar,
    "bazaar.edit":          t.permissions.permissionKeys.edit_bazaar,
    "bazaar.delete":        t.permissions.permissionKeys.delete_bazaar,
    "bazaar.approve":       t.permissions.permissionKeys.approve_bazaar,
    "members.invite":       t.permissions.permissionKeys.invite_member,
    "members.remove":       t.permissions.permissionKeys.remove_member,
    "members.manage_roles": t.permissions.permissionKeys.change_role,
    "deposits.add":         t.permissions.permissionKeys.add_deposit,
    "deposits.approve":     t.permissions.permissionKeys.approve_deposit,
    "reports.view":         t.permissions.permissionKeys.view_reports,
    "reports.export":       t.permissions.permissionKeys.export_reports,
    "settings.manage":      t.permissions.permissionKeys.manage_settings,
    "mess.close_month":     t.permissions.permissionKeys.close_month,
    "inventory.manage":     t.permissions.permissionKeys.manage_inventory,
    "menu.manage":          t.permissions.permissionKeys.manage_menu,
    "notifications.send":   t.permissions.permissionKeys.send_notification,
  };

  const PERMISSION_GROUPS: { label: string; keys: string[] }[] = [
    { label: t.permissions.groups.meals,    keys: ["meals.manage_others"] },
    { label: t.permissions.groups.expenses, keys: ["expenses.create", "expenses.approve", "expenses.delete"] },
    { label: t.permissions.groups.bazaar,   keys: ["bazaar.create", "bazaar.edit", "bazaar.delete", "bazaar.approve"] },
    { label: t.permissions.groups.members,  keys: ["members.invite", "members.remove", "members.manage_roles"] },
    { label: t.permissions.groups.deposits, keys: ["deposits.add", "deposits.approve"] },
    { label: t.permissions.groups.reports,  keys: ["reports.view", "reports.export"] },
    { label: t.permissions.groups.system,   keys: ["settings.manage", "mess.close_month", "inventory.manage", "menu.manage", "notifications.send"] },
  ];

  const toggle = (role: string, permKey: string, current: boolean) => {
    if (role === "owner") return;
    updatePreset.mutate({ role, permission: permKey, allowed: !current });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.superAdmin.permissions.title}</h1>
          <p className="text-sm text-slate-500">{t.superAdmin.permissions.subtitle}</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        ⚠️ {t.superAdmin.permissions.warning}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      )}

      {!isLoading && (
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[200px_repeat(6,1fr)] bg-slate-900 rounded-t-xl text-white text-xs font-semibold">
              <div className="p-3">{t.superAdmin.permissions.permissionCol}</div>
              {ROLES.map((role) => (
                <div key={role} className="p-3 text-center">
                  {ROLE_LABELS[role]}
                </div>
              ))}
            </div>

            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  {group.label}
                </div>
                {group.keys.map((permKey, rowIdx) => (
                  <div
                    key={permKey}
                    className={cn(
                      "grid grid-cols-[200px_repeat(6,1fr)] border-b border-slate-200",
                      rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50"
                    )}
                  >
                    <div className="p-3 text-sm text-slate-700 font-medium flex items-center">
                      {PERMISSION_LABELS[permKey] ?? permKey}
                    </div>
                    {ROLES.map((role) => {
                      const allowed = matrix[permKey]?.[role] ?? false;
                      const isOwner = role === "owner";
                      return (
                        <div key={role} className="p-2 flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 rounded-lg transition-colors",
                              isOwner
                                ? "cursor-not-allowed opacity-60 bg-green-50"
                                : allowed
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-50 text-red-400 hover:bg-red-100"
                            )}
                            onClick={() => toggle(role, permKey, allowed)}
                            disabled={isOwner || updatePreset.isPending}
                            title={isOwner ? t.superAdmin.permissions.ownerNote : undefined}
                          >
                            {isOwner ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : allowed ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}

            <div className="bg-slate-900 rounded-b-xl p-3 flex items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 bg-green-100 rounded flex items-center justify-center"><Check className="w-2.5 h-2.5 text-green-700" /></span>
                {t.superAdmin.permissions.hasPermission}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 bg-red-50 rounded flex items-center justify-center"><X className="w-2.5 h-2.5 text-red-400" /></span>
                {t.superAdmin.permissions.noPermission}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 bg-green-50 rounded flex items-center justify-center"><Lock className="w-2.5 h-2.5 text-slate-400" /></span>
                {t.superAdmin.permissions.locked}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
