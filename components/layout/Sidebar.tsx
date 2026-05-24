"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect, useRef } from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/use-auth";
import { useLanguage } from "@/lib/hooks/use-language";
import { useMyMembership } from "@/lib/hooks/use-members";
import { useMessRolePermissions, useMemberPermissions, useGlobalPermissionPresets } from "@/lib/hooks/use-permissions";
import { resolvePermission } from "@/lib/utils/permissions";
import type { Permission } from "@/lib/types";
import { useIsSuperAdmin } from "@/lib/hooks/use-super-admin";
import { useUIStore } from "@/lib/stores/ui.store";
import {
  NAV_GROUPS, STANDALONE_NAV_ITEMS, getActiveGroupId,
  type NavItemDef,
} from "./nav.config";

// ── Helpers ────────────────────────────────────────────────────

function tNav(t: ReturnType<typeof useLanguage>["t"], key: string): string {
  return (t.nav as Record<string, string>)[key] ?? key;
}

function isItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/meals") return pathname === "/dashboard/meals";
  return pathname.startsWith(href);
}

// ── Component ──────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: isSuperAdmin } = useIsSuperAdmin();
  const { t } = useLanguage();
  const { setSidebarOpen } = useUIStore();

  const { data: membership }           = useMyMembership();
  const { data: roleOverrides = [] }   = useMessRolePermissions();
  const { data: memberOverrides = [] } = useMemberPermissions(user?.id ?? "");
  const { data: presets = [] }         = useGlobalPermissionPresets();

  const canSee = (permission: Permission | null): boolean => {
    if (permission === null) return true;
    if (!membership) return true;
    return resolvePermission(membership.role, permission, memberOverrides, roleOverrides, presets);
  };

  const activeGroupId = useMemo(() => getActiveGroupId(pathname), [pathname]);

  const visibleGroups = useMemo(
    () => NAV_GROUPS.filter(g =>
      g.directHref ? true : g.items.some(i => canSee(i.permission))
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [membership, roleOverrides, memberOverrides, presets]
  );

  // ── Sub-panel open state ───────────────────────────────────
  // null = collapsed (default). group.id = that group expanded.
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Sync store so layout.tsx can adjust content padding
  useEffect(() => {
    setSidebarOpen(openGroupId !== null);
  }, [openGroupId, setSidebarOpen]);

  // Auto-collapse on navigation (sub-item link clicked)
  useEffect(() => {
    setOpenGroupId(null);
  }, [pathname]);

  // Auto-collapse on outside click
  useEffect(() => {
    if (!openGroupId) return;
    const handleOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setOpenGroupId(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openGroupId]);

  const openGroup = NAV_GROUPS.find(g => g.id === openGroupId) ?? null;
  const visibleSubItems: NavItemDef[] = openGroup?.items.filter(i => canSee(i.permission)) ?? [];

  // ── Strip icon className ───────────────────────────────────
  const stripIcon = (active: boolean, isOpen = false) => cn(
    "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
    active || isOpen
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

  return (
    <aside
      ref={sidebarRef}
      className="fixed left-0 top-0 z-40 h-screen hidden lg:block w-16 bg-card border-r border-border"
    >
      {/* ── STRIP (always w-16) ──────────────────────────────── */}
      <div className="w-16 h-full flex flex-col items-center">

        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-border w-full flex-shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center justify-center h-8 w-8 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
          >
            M
          </Link>
        </div>

        {/* Group icons */}
        <nav className="flex-1 overflow-y-auto py-3 flex flex-col items-center gap-1 w-full px-3">
          {visibleGroups.map((group) => {
            const active = activeGroupId === group.id;
            const label  = tNav(t, group.labelKey);

            if (group.directHref) {
              return (
                <Link
                  key={group.id}
                  href={group.directHref}
                  title={label}
                  className={stripIcon(active)}
                >
                  <group.icon className="h-5 w-5" />
                </Link>
              );
            }

            const isOpen = openGroupId === group.id;
            return (
              <button
                key={group.id}
                title={label}
                onClick={() => setOpenGroupId(isOpen ? null : group.id)}
                className={stripIcon(active, isOpen)}
              >
                <group.icon className="h-5 w-5" />
              </button>
            );
          })}
        </nav>

        {/* Bottom: standalones + super admin */}
        <div className="border-t border-border py-3 flex flex-col items-center gap-1 w-full px-3">
          {STANDALONE_NAV_ITEMS.filter(i => canSee(i.permission)).map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={tNav(t, item.labelKey)}
                className={stripIcon(active)}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          })}

          {isSuperAdmin && (
            <Link
              href="/super-admin"
              title={t.nav.superAdmin}
              className={cn(
                stripIcon(pathname.startsWith("/super-admin")),
                "border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
              )}
            >
              <Shield className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* ── SUB-PANEL (absolute, starts below header at top-14) ────
          left-16 = right edge of strip.
          top-14  = below fixed header (h-14 = 56px).
          bottom-0 = reaches screen bottom.
          w-48    = 192px → total sidebar 64+192=256px = lg:pl-64.
          Opens on group icon click, closes on nav / outside click.
      ── */}
      {openGroupId && openGroup && !openGroup.directHref && (
        <div className="absolute left-16 top-14 bottom-0 w-48 bg-card border-l border-r border-border flex flex-col shadow-sm">

          {/* Sub-items */}
          <nav className="flex-1 overflow-y-auto pt-3 pb-3 px-2 space-y-0.5">
            {visibleSubItems.map((item) => {
              const active = isItemActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tNav(t, item.labelKey)}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </aside>
  );
}
