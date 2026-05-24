"use client";
import React, { useState } from "react";
import {
  Shield, KeyRound, Check, X, RotateCcw, ChevronDown,
  User, ChevronsUpDown, Info, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardLoader } from "@/components/shared/LoadingSpinner";
import { useMembers } from "@/lib/hooks/use-members";
import { useLanguage } from "@/lib/hooks/use-language";
import {
  useMemberPermissions,
  useSetPermissionOverride,
  useRemovePermissionOverride,
  useClearPermissionOverrides,
  useMessRolePermissions,
  useSetMessRolePermission,
  useResetMessRolePermission,
  useResetAllMessRolePermissionsForRole,
  useResetAllMessRolePermissions,
  useGlobalPermissionPresets,
  useHasPermission,
} from "@/lib/hooks/use-permissions";
import {
  roleHasPermission,
  resolveRolePermission,
  getRoleDisplayNameBn,
  getRoleBadgeColor,
} from "@/lib/utils/permissions";
import { useMessStore } from "@/lib/stores/mess.store";
import { getInitials } from "@/lib/utils";
import { ROLE_PERMISSIONS } from "@/lib/types";
import type { Permission, MemberRole, MessRolePermission } from "@/lib/types";

// ── Static permission data (keys only — labels come from i18n) ──────────────
type PermGroupKey = "meals" | "expenses" | "bazaar" | "members" | "deposits" | "reports" | "system" | "nav";

const ALL_PERMISSION_KEYS: { key: Permission; groupKey: PermGroupKey; tKey: string }[] = [
  { key: "meals.manage_others",  groupKey: "meals",    tKey: "manage_others_meals" },
  { key: "expenses.create",      groupKey: "expenses", tKey: "create_expense" },
  { key: "expenses.approve",     groupKey: "expenses", tKey: "approve_expense" },
  { key: "expenses.delete",      groupKey: "expenses", tKey: "delete_expense" },
  { key: "bazaar.create",        groupKey: "bazaar",   tKey: "create_bazaar" },
  { key: "bazaar.edit",          groupKey: "bazaar",   tKey: "edit_bazaar" },
  { key: "bazaar.delete",        groupKey: "bazaar",   tKey: "delete_bazaar" },
  { key: "bazaar.approve",       groupKey: "bazaar",   tKey: "approve_bazaar" },
  { key: "members.invite",       groupKey: "members",  tKey: "invite_member" },
  { key: "members.remove",       groupKey: "members",  tKey: "remove_member" },
  { key: "members.manage_roles", groupKey: "members",  tKey: "change_role" },
  { key: "deposits.add",         groupKey: "deposits", tKey: "add_deposit" },
  { key: "deposits.approve",     groupKey: "deposits", tKey: "approve_deposit" },
  { key: "reports.view",         groupKey: "reports",  tKey: "view_reports" },
  { key: "reports.export",       groupKey: "reports",  tKey: "export_reports" },
  { key: "settings.manage",      groupKey: "system",   tKey: "manage_settings" },
  { key: "mess.close_month",     groupKey: "system",   tKey: "close_month" },
  { key: "inventory.manage",     groupKey: "system",   tKey: "manage_inventory" },
  { key: "menu.manage",          groupKey: "system",   tKey: "manage_menu" },
  { key: "notifications.send",   groupKey: "system",   tKey: "send_notification" },
  { key: "nav.bazaar",           groupKey: "nav",      tKey: "show_bazaar" },
  { key: "nav.expenses",         groupKey: "nav",      tKey: "show_expenses" },
  { key: "nav.deposits",         groupKey: "nav",      tKey: "show_deposits" },
  { key: "nav.members",          groupKey: "nav",      tKey: "show_members" },
  { key: "nav.reports",          groupKey: "nav",      tKey: "show_reports" },
  { key: "nav.inventory",        groupKey: "nav",      tKey: "show_inventory" },
  { key: "nav.kitchen",          groupKey: "nav",      tKey: "show_kitchen" },
  { key: "nav.menu",             groupKey: "nav",      tKey: "show_menu" },
  { key: "nav.polls",            groupKey: "nav",      tKey: "show_polls" },
  { key: "nav.complaints",       groupKey: "nav",      tKey: "show_complaints" },
  { key: "nav.chat",             groupKey: "nav",      tKey: "show_chat" },
  { key: "nav.notices",          groupKey: "nav",      tKey: "show_notices" },
  { key: "nav.gamification",     groupKey: "nav",      tKey: "show_gamification" },
];

const ROLES: MemberRole[] = ["owner", "admin", "manager", "assistant_manager", "member", "guest"];
const LOCKED_ROLES: MemberRole[] = ["owner"];

// ── Custom Hooks ─────────────────────────────────────────────────────────────

function useExpandAll() {
  const [expandAll, setExpandAll] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("messpilot_perm_expand") === "true";
    }
    return false;
  });
  const toggle = (val: boolean) => {
    setExpandAll(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("messpilot_perm_expand", String(val));
    }
  };
  return { expandAll, toggle };
}

function useGroupAccordion(expandAll: boolean) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const isOpen = (group: string) => expandAll || openGroup === group;
  const toggleGroup = (group: string) => {
    if (expandAll) return;
    setOpenGroup((prev) => (prev === group ? null : group));
  };
  return { isOpen, toggleGroup };
}

// ── Page Root ────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const { t } = useLanguage();
  const { activeMess } = useMessStore();
  const isAdminOrOwner = useHasPermission("members.manage_roles");
  const { expandAll, toggle } = useExpandAll();

  if (!isAdminOrOwner) {
    return (
      <EmptyState
        icon={<Shield className="h-8 w-8" />}
        title={t.permissions.noAccess}
        description={t.permissions.accessDenied}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Global expand toggle */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t.permissions.keepGroupsOpen}</p>
            </div>
          </div>
          <Switch checked={expandAll} onCheckedChange={toggle} />
        </CardContent>
      </Card>

      <Tabs defaultValue="matrix">
        <TabsList className="w-full">
          <TabsTrigger value="matrix" className="flex-1 gap-1.5">
            <Shield className="h-4 w-4" />
            {t.permissions.tabs.rolePermissions}
          </TabsTrigger>
          <TabsTrigger value="overrides" className="flex-1 gap-1.5">
            <KeyRound className="h-4 w-4" />
            {t.permissions.tabs.memberOverrides}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-4">
          <RolePermissionMatrix expandAll={expandAll} />
        </TabsContent>

        <TabsContent value="overrides" className="mt-4">
          <MemberOverridePanel expandAll={expandAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Tab 1: Role Permission Matrix ────────────────────────────────────────────

function RolePermissionMatrix({ expandAll }: { expandAll: boolean }) {
  const { t } = useLanguage();

  const permKeyToLabel = (tKey: string): string =>
    (t.permissions.permissionKeys as Record<string, string>)[tKey] ?? tKey;

  const groupKeyToLabel = (gk: PermGroupKey): string =>
    (t.permissions.groups as Record<string, string>)[gk] ?? gk;

  const roleShort = (role: MemberRole): string => {
    const map: Record<MemberRole, string> = {
      owner:             t.permissions.roles.owner,
      admin:             t.permissions.roles.admin,
      manager:           t.permissions.roles.manager,
      assistant_manager: t.permissions.roles.assistant,
      member:            t.permissions.roles.member,
      guest:             t.permissions.roles.guest,
    };
    return map[role] ?? role;
  };

  const groups = [...new Set(ALL_PERMISSION_KEYS.map((p) => p.groupKey))] as PermGroupKey[];
  const { isOpen, toggleGroup } = useGroupAccordion(expandAll);

  const { data: messOverrides = [], isLoading } = useMessRolePermissions();
  const { data: presets = [] } = useGlobalPermissionPresets();
  const setOverride = useSetMessRolePermission();
  const resetOverride = useResetMessRolePermission();
  const resetAllForRole = useResetAllMessRolePermissionsForRole();
  const resetAll = useResetAllMessRolePermissions();

  const [pendingCell, setPendingCell] = useState<string | null>(null);

  const totalOverrides = messOverrides.length;

  const getOverride = (role: string, perm: string) =>
    messOverrides.find((o) => o.role === role && o.permission_key === perm);

  const effectiveValue = (role: MemberRole, perm: Permission) =>
    resolveRolePermission(role, perm, messOverrides, presets);

  const isOverridden = (role: string, perm: string) => !!getOverride(role, perm);

  const handleCellClick = async (role: MemberRole, perm: Permission) => {
    if (LOCKED_ROLES.includes(role)) return;
    const cellKey = `${role}-${perm}`;
    setPendingCell(cellKey);
    try {
      const current = effectiveValue(role, perm);
      const preset = roleHasPermission(role, perm, presets);
      const newVal = !current;
      if (newVal === preset && isOverridden(role, perm)) {
        await resetOverride.mutateAsync({ role, permission: perm });
      } else {
        await setOverride.mutateAsync({ role, permission: perm, allowed: newVal });
      }
    } finally {
      setPendingCell(null);
    }
  };

  const handleResetCell = async (role: MemberRole, perm: Permission) => {
    await resetOverride.mutateAsync({ role, permission: perm });
  };

  const handleResetRole = async (role: MemberRole) => {
    await resetAllForRole.mutateAsync(role);
  };

  if (isLoading) return <CardLoader />;

  return (
    <div className="space-y-4">
      {/* Total override count + reset all */}
      {totalOverrides > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-blue-600">{totalOverrides}</span> {t.permissions.overrides}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 h-7"
            onClick={() => resetAll.mutate()}
            disabled={resetAll.isPending}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {t.permissions.resetAllDefaults}
          </Button>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border-2 border-blue-400 bg-blue-50 dark:bg-blue-950 inline-flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-blue-600" />
          </span>
          {t.permissions.customOn}
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-500" /> {t.permissions.defaultOn}
        </span>
        <span className="flex items-center gap-1.5">
          <X className="h-3.5 w-3.5 text-red-300" /> {t.permissions.defaultOff}
        </span>
      </div>

      {/* Desktop Matrix Table */}
      <div className="hidden lg:block rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
        <div className="overflow-y-auto max-h-[calc(100vh-22rem)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted border-b shadow-sm">
              <th className="text-left px-4 py-3 font-semibold w-52">
                {t.nav.permissions}
              </th>
              {ROLES.map((role) => {
                const roleOverrideCount = messOverrides.filter((o) => o.role === role).length;
                const locked = LOCKED_ROLES.includes(role);
                return (
                  <th key={role} className="px-2 py-3 text-center font-semibold min-w-[96px]">
                    <div className="flex flex-col items-center gap-1">
                      <Badge className={getRoleBadgeColor(role)} variant="outline">
                        {roleShort(role)}
                      </Badge>
                      {locked ? (
                        <span className="text-[9px] text-muted-foreground">{t.permissions.locked}</span>
                      ) : roleOverrideCount > 0 ? (
                        <button
                          className="text-[9px] text-blue-600 hover:text-destructive hover:underline flex items-center gap-0.5"
                          onClick={() => handleResetRole(role)}
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          {roleOverrideCount} {t.permissions.overrides}
                        </button>
                      ) : (
                        <span className="text-[9px] text-muted-foreground/50">{t.permissions.defaultBtn}</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((groupKey) => {
              const open = isOpen(groupKey);
              const perms = ALL_PERMISSION_KEYS.filter((p) => p.groupKey === groupKey);
              const groupLabel = groupKeyToLabel(groupKey);
              return (
                <React.Fragment key={`group-${groupKey}`}>
                  <tr
                    className={`border-t transition-colors ${expandAll ? "bg-muted/20 cursor-default" : "bg-muted/20 hover:bg-muted/40 cursor-pointer"}`}
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <td colSpan={ROLES.length + 1} className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
                        />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {groupLabel}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">({perms.length})</span>
                      </div>
                    </td>
                  </tr>
                  {open && perms.map((perm, i) => (
                    <tr key={perm.key} className={i % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                      <td className="px-4 py-2.5 text-sm pl-9">{permKeyToLabel(perm.tKey)}</td>
                      {ROLES.map((role) => {
                        const allowed = effectiveValue(role, perm.key);
                        const overridden = isOverridden(role, perm.key);
                        const locked = LOCKED_ROLES.includes(role);
                        const cellKey = `${role}-${perm.key}`;
                        const isPending = pendingCell === cellKey;

                        return (
                          <td key={role} className="px-2 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                disabled={locked || isPending}
                                onClick={() => handleCellClick(role, perm.key)}
                                className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-all border-2 ${
                                  locked
                                    ? "cursor-not-allowed opacity-60 border-transparent"
                                    : isPending
                                    ? "opacity-50 cursor-wait border-transparent"
                                    : overridden
                                    ? allowed
                                      ? "border-blue-400 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 cursor-pointer"
                                      : "border-orange-400 bg-orange-50 dark:bg-orange-950 hover:bg-orange-100 cursor-pointer"
                                    : "border-transparent hover:border-muted-foreground/30 hover:bg-muted/50 cursor-pointer"
                                }`}
                              >
                                {allowed
                                  ? <Check className={`h-3.5 w-3.5 ${overridden ? "text-blue-600" : "text-emerald-500"}`} />
                                  : <X    className={`h-3.5 w-3.5 ${overridden ? "text-orange-500" : "text-red-300"}`} />
                                }
                              </button>
                              {overridden && !locked && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleResetCell(role, perm.key); }}
                                  title={t.permissions.resetToDefault}
                                  className="w-4 h-4 rounded text-muted-foreground/50 hover:text-destructive hover:bg-muted flex items-center justify-center"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
        </div>
      </div>

      {/* Mobile Matrix — accordion cards per group */}
      <div className="lg:hidden space-y-2">
        {groups.map((groupKey) => {
          const open = isOpen(groupKey);
          const perms = ALL_PERMISSION_KEYS.filter((p) => p.groupKey === groupKey);
          return (
            <Card key={groupKey} className="overflow-hidden">
              <button
                type="button"
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${expandAll ? "cursor-default" : "hover:bg-muted/40 cursor-pointer"}`}
                onClick={() => toggleGroup(groupKey)}
                disabled={expandAll}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {groupKeyToLabel(groupKey)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">({perms.length})</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
                />
              </button>
              {open && (
                <CardContent className="px-4 pb-3 pt-0 space-y-4 border-t">
                  {perms.map((perm) => (
                    <div key={perm.key} className="pt-3">
                      <p className="text-sm font-medium mb-2">{permKeyToLabel(perm.tKey)}</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {ROLES.map((role) => {
                          const allowed = effectiveValue(role, perm.key);
                          const overridden = isOverridden(role, perm.key);
                          const locked = LOCKED_ROLES.includes(role);
                          const cellKey = `${role}-${perm.key}`;
                          const isPending = pendingCell === cellKey;
                          return (
                            <button
                              key={role}
                              disabled={locked || isPending}
                              onClick={() => handleCellClick(role, perm.key)}
                              className={`flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg border transition-all ${
                                locked
                                  ? "opacity-60 cursor-not-allowed"
                                  : overridden
                                  ? allowed
                                    ? "border-blue-400 bg-blue-50 text-blue-700"
                                    : "border-orange-400 bg-orange-50 text-orange-700"
                                  : allowed
                                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-700"
                                  : "border-transparent bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              {allowed
                                ? <Check className="h-3 w-3 flex-shrink-0" />
                                : <X    className="h-3 w-3 flex-shrink-0 opacity-50" />
                              }
                              <span className="truncate">{roleShort(role)}</span>
                            </button>
                          );
                        })}
                      </div>
                      <Separator className="mt-3" />
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary count per role */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {ROLES.map((role) => {
          const count = ROLE_PERMISSIONS[role].length;
          const overrideCount = messOverrides.filter((o) => o.role === role).length;
          return (
            <Card key={role} className="text-center">
              <CardContent className="p-3">
                <Badge className={`${getRoleBadgeColor(role)} mb-1`} variant="outline">
                  {roleShort(role)}
                </Badge>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-[10px] text-muted-foreground">{t.permissions.defaultBtn}</p>
                {overrideCount > 0 && (
                  <p className="text-[10px] text-blue-600 font-medium">{overrideCount} {t.permissions.overrides}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Owner locked note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
        <span>{t.permissions.locked} — {t.permissions.noAccess}</span>
      </div>
    </div>
  );
}

// ── Tab 2: Member Override Panel ─────────────────────────────────────────────

function MemberOverridePanel({ expandAll }: { expandAll: boolean }) {
  const { t } = useLanguage();
  const { data: members, isLoading } = useMembers();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const selectedMember = members?.find((m) => m.id === selectedMemberId);
  const userProfile = selectedMember?.user as { full_name?: string; avatar_url?: string } | null;

  if (isLoading) return <CardLoader />;

  if (!members?.length) {
    return (
      <EmptyState
        icon={<User className="h-7 w-7" />}
        title={t.noData}
        description={t.noData}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <Label className="text-sm font-medium mb-2 block">{t.permissions.tabs.memberOverrides}</Label>
          <Select onValueChange={(v) => setSelectedMemberId(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t.permissions.overrideTitle} />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => {
                const up = m.user as { full_name?: string } | null;
                return (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <span>{up?.full_name ?? t.deposits.unknownMember}</span>
                      <Badge variant="outline" className={`text-[10px] py-0 ${getRoleBadgeColor(m.role as MemberRole)}`}>
                        {getRoleDisplayNameBn(m.role as MemberRole)}
                      </Badge>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedMemberId ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-2">
          <ChevronDown className="h-8 w-8 opacity-30" />
          <p className="text-sm">{t.permissions.tabs.memberOverrides}</p>
        </div>
      ) : (
        <MemberPermissionEditor
          memberId={selectedMemberId}
          userId={selectedMember?.user_id ?? ""}
          memberName={userProfile?.full_name ?? t.deposits.unknownMember}
          memberRole={selectedMember?.role as MemberRole ?? "member"}
          expandAll={expandAll}
        />
      )}
    </div>
  );
}

// ── Member Permission Editor ──────────────────────────────────────────────────

interface EditorProps {
  memberId: string;
  userId: string;
  memberName: string;
  memberRole: MemberRole;
  expandAll: boolean;
}

function MemberPermissionEditor({ userId, memberName, memberRole, expandAll }: EditorProps) {
  const { t } = useLanguage();

  const permKeyToLabel = (tKey: string): string =>
    (t.permissions.permissionKeys as Record<string, string>)[tKey] ?? tKey;

  const groupKeyToLabel = (gk: PermGroupKey): string =>
    (t.permissions.groups as Record<string, string>)[gk] ?? gk;

  const { data: memberOverrides = [], isLoading: memberLoading } = useMemberPermissions(userId);
  const { data: messOverrides = [], isLoading: messLoading } = useMessRolePermissions();
  const { data: presets = [] } = useGlobalPermissionPresets();
  const setOverride = useSetPermissionOverride(userId);
  const removeOverride = useRemovePermissionOverride(userId);
  const clearAll = useClearPermissionOverrides(userId);
  const [pending, setPending] = useState<string | null>(null);
  const { isOpen, toggleGroup } = useGroupAccordion(expandAll);

  const groups = [...new Set(ALL_PERMISSION_KEYS.map((p) => p.groupKey))] as PermGroupKey[];

  const getMemberOverride = (key: Permission) =>
    memberOverrides.find((o) => o.permission_key === key);

  const effectiveValue = (key: Permission): boolean => {
    const mo = getMemberOverride(key);
    if (mo !== undefined) return mo.allowed;
    return resolveRolePermission(memberRole, key, messOverrides, presets);
  };

  const handleToggle = async (key: Permission, newVal: boolean) => {
    setPending(key);
    try {
      const roleEffective = resolveRolePermission(memberRole, key, messOverrides, presets);
      if (newVal === roleEffective && getMemberOverride(key) !== undefined) {
        await removeOverride.mutateAsync(key);
      } else {
        await setOverride.mutateAsync({ permission: key, allowed: newVal });
      }
    } finally {
      setPending(null);
    }
  };

  const overrideCount = memberOverrides.length;

  if (memberLoading || messLoading) return <CardLoader />;

  return (
    <div className="space-y-3">
      {/* Member info bar */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs">{getInitials(memberName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{memberName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className={`text-[10px] py-0 ${getRoleBadgeColor(memberRole)}`}>
                  {getRoleDisplayNameBn(memberRole)}
                </Badge>
                {overrideCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] py-0">
                    {overrideCount} {t.permissions.overrides}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {overrideCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 flex-shrink-0"
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {t.permissions.resetAll}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Permission groups — accordion */}
      {groups.map((groupKey) => {
        const open = isOpen(groupKey);
        const perms = ALL_PERMISSION_KEYS.filter((p) => p.groupKey === groupKey);
        const groupOverrideCount = perms.filter(
          (p) => getMemberOverride(p.key) !== undefined
        ).length;

        return (
          <Card key={groupKey} className="overflow-hidden">
            <button
              type="button"
              className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${expandAll ? "cursor-default" : "hover:bg-muted/30 cursor-pointer"}`}
              onClick={() => toggleGroup(groupKey)}
              disabled={expandAll}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {groupKeyToLabel(groupKey)}
                </span>
                <span className="text-[10px] text-muted-foreground/60">({perms.length})</span>
                {groupOverrideCount > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                    {groupOverrideCount} {t.permissions.overrides}
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
              />
            </button>

            {open && (
              <CardContent className="px-4 pb-3 pt-0 space-y-0 border-t">
                {perms.map((perm, idx, arr) => {
                  const mo = getMemberOverride(perm.key);
                  const effective = effectiveValue(perm.key);
                  const hasOverride = mo !== undefined;
                  const isPending = pending === perm.key;
                  const roleEffective = resolveRolePermission(memberRole, perm.key, messOverrides, presets);

                  return (
                    <div key={perm.key}>
                      <div className="flex items-center justify-between py-2.5 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm">{permKeyToLabel(perm.tKey)}</span>
                            {hasOverride ? (
                              <Badge
                                variant={effective ? "default" : "destructive"}
                                className="text-[9px] px-1.5 py-0 h-4"
                              >
                                {effective ? t.permissions.grantPermission : t.permissions.denyPermission}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">
                                {t.permissions.defaultRole} ({roleEffective ? t.permissions.defaultOn : t.permissions.defaultOff})
                              </Badge>
                            )}
                          </div>
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
                            className={hasOverride ? "data-[state=checked]:bg-blue-600" : ""}
                          />
                        </div>
                      </div>
                      {idx < arr.length - 1 && <Separator />}
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
