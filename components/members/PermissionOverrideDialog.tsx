"use client";
import { useState } from "react";
import { Shield, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useMemberPermissions, useSetPermissionOverride, useRemovePermissionOverride, useClearPermissionOverrides } from "@/lib/hooks/use-permissions";
import { roleHasPermission } from "@/lib/utils/permissions";
import { useLanguage } from "@/lib/hooks/use-language";
import type { Permission, MemberRole } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  memberId: string;
  userId: string;
  memberName: string;
  memberRole: MemberRole;
}

export function PermissionOverrideDialog({
  open,
  onClose,
  userId,
  memberName,
  memberRole,
}: Props) {
  const { t } = useLanguage();
  const { data: overrides = [] } = useMemberPermissions(userId);
  const setOverride = useSetPermissionOverride(userId);
  const removeOverride = useRemovePermissionOverride(userId);
  const clearAll = useClearPermissionOverrides(userId);
  const [pending, setPending] = useState<string | null>(null);

  const pk = t.permissions.permissionKeys;
  const pd = t.permissions.permissionDescs;

  const ALL_PERMISSIONS: { key: Permission; label: string; desc: string }[] = [
    { key: "meals.manage_others",   label: pk.manage_others_meals, desc: pd.manage_others_meals },
    { key: "expenses.create",       label: pk.create_expense,      desc: pd.create_expense },
    { key: "expenses.approve",      label: pk.approve_expense,     desc: pd.approve_expense },
    { key: "expenses.delete",       label: pk.delete_expense,      desc: pd.delete_expense },
    { key: "bazaar.create",         label: pk.create_bazaar,       desc: pd.create_bazaar },
    { key: "bazaar.approve",        label: pk.approve_bazaar,      desc: pd.approve_bazaar },
    { key: "members.invite",        label: pk.invite_member,       desc: pd.invite_member },
    { key: "members.remove",        label: pk.remove_member,       desc: pd.remove_member },
    { key: "members.manage_roles",  label: pk.change_role,         desc: pd.manage_roles },
    { key: "deposits.add",          label: pk.add_deposit,         desc: pd.add_deposit },
    { key: "deposits.approve",      label: pk.approve_deposit,     desc: pd.approve_deposit },
    { key: "reports.view",          label: pk.view_reports,        desc: pd.view_reports },
    { key: "reports.export",        label: pk.export_reports,      desc: pd.export_reports },
    { key: "settings.manage",       label: pk.manage_settings,     desc: pd.manage_settings },
    { key: "mess.close_month",      label: pk.close_month,         desc: pd.close_month },
    { key: "inventory.manage",      label: pk.manage_inventory,    desc: pd.manage_inventory },
    { key: "menu.manage",           label: pk.manage_menu,         desc: pd.manage_menu },
    { key: "notifications.send",    label: pk.send_notification,   desc: pd.send_notification },
  ];

  const getOverride = (key: Permission) =>
    overrides.find((o) => o.permission_key === key);

  const roleDefault = (key: Permission) => roleHasPermission(memberRole, key);

  const handleToggle = async (key: Permission, newValue: boolean) => {
    const defaultValue = roleDefault(key);
    setPending(key);
    try {
      if (newValue === defaultValue) {
        await removeOverride.mutateAsync(key);
      } else {
        await setOverride.mutateAsync({ permission: key, allowed: newValue });
      }
    } finally {
      setPending(null);
    }
  };

  const effectiveValue = (key: Permission) => {
    const override = getOverride(key);
    if (override) return override.allowed;
    return roleDefault(key);
  };

  const overrideCount = overrides.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-blue-600" />
            {t.permissions.overrideTitle} {memberName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {t.permissions.defaultRole} <span className="font-semibold">{memberRole}</span>
            {overrideCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {overrideCount} {t.permissions.overrides}
              </Badge>
            )}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 -mr-1">
          {ALL_PERMISSIONS.map((perm, idx) => {
            const override = getOverride(perm.key);
            const defVal = roleDefault(perm.key);
            const effective = effectiveValue(perm.key);
            const hasOverride = !!override;
            const isPending = pending === perm.key;

            return (
              <div key={perm.key}>
                {idx > 0 && <Separator className="my-0.5" />}
                <div className="flex items-center gap-3 py-2.5 px-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">{perm.label}</p>
                      {hasOverride ? (
                        <Badge
                          variant={effective ? "default" : "destructive"}
                          className="text-[9px] px-1 py-0 h-4"
                        >
                          {effective ? t.permissions.grantPermission : t.permissions.denyPermission}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground">
                          {t.permissions.defaultBtn}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{perm.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {hasOverride && (
                      <button
                        className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                        onClick={() => removeOverride.mutate(perm.key)}
                        title={t.permissions.resetToDefault}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                    <Switch
                      checked={effective}
                      disabled={isPending}
                      onCheckedChange={(v) => handleToggle(perm.key, v)}
                      className={hasOverride && effective !== defVal ? "data-[state=checked]:bg-blue-600" : ""}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {overrideCount > 0 && (
          <div className="pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {t.permissions.resetAll}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
