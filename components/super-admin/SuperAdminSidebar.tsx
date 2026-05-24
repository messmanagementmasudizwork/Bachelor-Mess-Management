"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Building2, Users, ShieldCheck, ScrollText,
  Megaphone, ArrowLeft, Shield, MessageSquareWarning, Settings,
  CreditCard, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/hooks/use-language";

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV_ITEMS = [
    { href: "/super-admin",               label: t.superAdmin.nav.overview,      icon: LayoutDashboard },
    { href: "/super-admin/messes",        label: t.superAdmin.nav.messes,        icon: Building2 },
    { href: "/super-admin/users",         label: t.superAdmin.nav.users,         icon: Users },
    { href: "/super-admin/permissions",   label: t.superAdmin.nav.permissions,   icon: ShieldCheck },
    { href: "/super-admin/audit",         label: t.superAdmin.nav.audit,         icon: ScrollText },
    { href: "/super-admin/announcements", label: t.superAdmin.nav.announcements, icon: Megaphone },
    { href: "/super-admin/complaints",    label: t.superAdmin.nav.complaints,    icon: MessageSquareWarning },
    { href: "/super-admin/subscriptions", label: t.superAdmin.nav.subscriptions, icon: CreditCard },
    { href: "/super-admin/settings",      label: t.superAdmin.nav.settings,      icon: Settings },
  ];

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">MessPilot</p>
            <p className="text-xs text-orange-400 font-medium">Super Admin</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/super-admin"
            ? pathname === "/super-admin"
            : pathname.startsWith(href);
          return (
            <Link key={href} href={href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-orange-500 text-white font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.superAdminExt.backToDashboard}
          </Button>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop: fixed left sidebar ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-slate-900 text-slate-100 flex-col z-40">
        <SidebarContent />
      </aside>

      {/* ── Mobile: top header bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-slate-900 border-b border-slate-700 flex items-center gap-3 px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-white">Super Admin</span>
        </div>
      </header>

      {/* ── Mobile: slide-in drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-slate-900 text-slate-100 flex flex-col shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
