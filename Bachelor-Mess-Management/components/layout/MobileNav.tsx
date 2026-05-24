"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, X, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/use-auth";
import { useLanguage } from "@/lib/hooks/use-language";
import { useIsSuperAdmin } from "@/lib/hooks/use-super-admin";
import { useMyMembership } from "@/lib/hooks/use-members";
import { useMessRolePermissions, useMemberPermissions, useGlobalPermissionPresets } from "@/lib/hooks/use-permissions";
import { resolvePermission } from "@/lib/utils/permissions";
import { useUIStore } from "@/lib/stores/ui.store";
import { useMessStore } from "@/lib/stores/mess.store";
import type { Permission } from "@/lib/types";
import {
  NAV_GROUPS, STANDALONE_NAV_ITEMS, getActiveGroupId,
} from "./nav.config";

// ── Helpers ───────────────────────────────────────────────────

function tNav(t: ReturnType<typeof useLanguage>["t"], key: string): string {
  return (t.nav as Record<string, string>)[key] ?? key;
}

function isItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/meals") return pathname === "/dashboard/meals";
  return pathname.startsWith(href);
}

// ── Component ─────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { activeMess } = useMessStore();
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore();
  const { data: isSuperAdmin } = useIsSuperAdmin();

  const { data: membership }          = useMyMembership();
  const { data: roleOverrides = [] }  = useMessRolePermissions();
  const { data: memberOverrides = [] } = useMemberPermissions(user?.id ?? "");
  const { data: presets = [] }         = useGlobalPermissionPresets();

  const canSee = (permission: Permission | null): boolean => {
    if (permission === null) return true;
    if (!membership) return true;
    return resolvePermission(membership.role, permission, memberOverrides, roleOverrides, presets);
  };

  // Auto-expand active group on open
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const active = getActiveGroupId(pathname);
    return active ? new Set([active]) : new Set();
  });

  // Sync active group when pathname changes (drawer closes & re-opens)
  useEffect(() => {
    const active = getActiveGroupId(pathname);
    if (active) setExpandedIds(prev => new Set([...prev, active]));
  }, [pathname]);

  const toggleGroup = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Close drawer on route change
  useEffect(() => { closeMobileMenu(); }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  if (!isMobileMenuOpen) return null;

  const visibleGroups = NAV_GROUPS.filter(g =>
    g.directHref ? true : g.items.some(i => canSee(i.permission))
  );

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeMobileMenu} />

      {/* Slide-in drawer */}
      <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-card border-r border-border flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0">
              M
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{t.appName}</p>
              {activeMess && (
                <p className="text-xs text-muted-foreground truncate">{activeMess.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={closeMobileMenu}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Accordion nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleGroups.map((group) => {
            const groupLabel   = tNav(t, group.labelKey);
            const isExpanded   = expandedIds.has(group.id);
            const isGroupActive = getActiveGroupId(pathname) === group.id;
            const visibleItems  = group.items.filter(i => canSee(i.permission));

            // Direct-link group (e.g. Dashboard)
            if (group.directHref) {
              return (
                <Link
                  key={group.id}
                  href={group.directHref}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isGroupActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <group.icon className="h-4 w-4 shrink-0" />
                  <span>{groupLabel}</span>
                </Link>
              );
            }

            return (
              <div key={group.id}>
                {/* Group header — accordion toggle */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isGroupActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <group.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{groupLabel}</span>
                  <ChevronRight className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )} />
                </button>

                {/* Sub-items */}
                {isExpanded && visibleItems.length > 0 && (
                  <div className="ml-4 pl-3 border-l border-border mt-0.5 space-y-0.5">
                    {visibleItems.map((item) => {
                      const active = isItemActive(item.href, pathname);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{tNav(t, item.labelKey)}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Standalone items */}
          <div className="mt-1 pt-1 border-t border-border space-y-0.5">
            {STANDALONE_NAV_ITEMS.filter(i => canSee(i.permission)).map(item => {
              const active = pathname.startsWith(item.href);
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
                  <span>{tNav(t, item.labelKey)}</span>
                </Link>
              );
            })}
          </div>

          {/* Super Admin */}
          {isSuperAdmin && (
            <Link
              href="/super-admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors border mt-1",
                pathname.startsWith("/super-admin")
                  ? "bg-orange-100 text-orange-700 border-orange-300 font-semibold"
                  : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
              )}
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{t.nav.superAdmin}</span>
            </Link>
          )}
        </nav>

      </aside>
    </div>
  );
}
