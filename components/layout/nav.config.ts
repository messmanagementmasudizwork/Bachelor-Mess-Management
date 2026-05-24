// ============================================================
// Navigation Group Config — Single source of truth
// DEVELOPMENT_RULES.md Rule #9: সব nav item এখানেই define হবে
// Sidebar.tsx ও MobileNav.tsx এখান থেকে import করবে
// ============================================================
import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/lib/types";
import {
  LayoutDashboard,
  UtensilsCrossed,
  TrendingUp,
  MessageCircle,
  Users,
  ShieldCheck,
  ShoppingCart,
  Receipt,
  Wallet,
  BarChart3,
  Package,
  ChefHat,
  CalendarDays,
  Vote,
  MessageSquareWarning,
  Megaphone,
  Trophy,
  Bell,
  Settings,
  KeyRound,
  Building2,
  UserCog,
  LineChart,
  LayoutPanelTop,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

export interface NavItemDef {
  href: string;
  labelKey: string;
  description: string;
  icon: LucideIcon;
  permission: Permission | null;
}

export interface NavGroupDef {
  id: string;
  labelKey: string;
  description: string;
  icon: LucideIcon;
  directHref?: string;
  items: NavItemDef[];
}

export interface StandaloneNavItem {
  href: string;
  labelKey: string;
  description: string;
  icon: LucideIcon;
  permission: Permission | null;
}

// ── Nav Groups ────────────────────────────────────────────────

export const NAV_GROUPS: NavGroupDef[] = [
  {
    id: "dashboard",
    labelKey: "dashboard",
    description: "Overview of your mess activity",
    icon: LayoutDashboard,
    directHref: "/dashboard",
    items: [],
  },
  {
    id: "myReport",
    labelKey: "myReport",
    description: "Your personal meal & expense summary",
    icon: LineChart,
    directHref: "/dashboard/my-report",
    items: [],
  },
  {
    id: "meals",
    labelKey: "meals",
    description: "Manage your daily meal status",
    icon: UtensilsCrossed,
    items: [
      { href: "/dashboard/meals", labelKey: "meals", description: "Manage your daily meal status", icon: UtensilsCrossed, permission: null },
      { href: "/dashboard/meals/control", labelKey: "mealControl", description: "Control all member meal entries", icon: ShieldCheck, permission: "meals.manage_others" },
      { href: "/dashboard/kitchen", labelKey: "kitchen", description: "Today's cooking schedule & tasks", icon: ChefHat, permission: "nav.kitchen" },
      { href: "/dashboard/menu", labelKey: "menu", description: "Weekly meal plan & recipes", icon: CalendarDays, permission: "nav.menu" },
    ],
  },
  {
    id: "finance",
    labelKey: "finance",
    description: "Financial management",
    icon: TrendingUp,
    items: [
      { href: "/dashboard/bazaar", labelKey: "bazaar", description: "Track grocery & market purchases", icon: ShoppingCart, permission: "nav.bazaar" },
      { href: "/dashboard/expenses", labelKey: "expenses", description: "Manage and approve mess expenses", icon: Receipt, permission: "nav.expenses" },
      { href: "/dashboard/deposits", labelKey: "deposits", description: "Member deposits & wallet balance", icon: Wallet, permission: "nav.deposits" },
      { href: "/dashboard/reports", labelKey: "reports", description: "Monthly financial summary & analysis", icon: BarChart3, permission: "nav.reports" },
    ],
  },
  {
    id: "community",
    labelKey: "community",
    description: "Community & communication",
    icon: MessageCircle,
    items: [
      { href: "/dashboard/chat", labelKey: "chat", description: "Private messaging between members", icon: MessageCircle, permission: "nav.chat" },
      { href: "/dashboard/notices", labelKey: "notices", description: "Announcements, meetings & events", icon: Megaphone, permission: "nav.notices" },
      { href: "/dashboard/polls", labelKey: "polls", description: "Community polls & group voting", icon: Vote, permission: "nav.polls" },
      { href: "/dashboard/complaints", labelKey: "complaints", description: "Submit and track complaints", icon: MessageSquareWarning, permission: "nav.complaints" },
      { href: "/dashboard/gamification", labelKey: "gamification", description: "Member rankings & achievements", icon: Trophy, permission: "nav.gamification" },
    ],
  },
  {
    id: "members",
    labelKey: "members",
    description: "Members & resources",
    icon: Users,
    items: [
      { href: "/dashboard/members", labelKey: "members", description: "View and manage mess members", icon: Users, permission: "nav.members" },
      { href: "/dashboard/inventory", labelKey: "inventory", description: "Track kitchen stock & supplies", icon: Package, permission: "nav.inventory" },
    ],
  },
  {
    id: "admin",
    labelKey: "adminGroup",
    description: "Administration",
    icon: ShieldCheck,
    items: [
      { href: "/dashboard/notice-vacation", labelKey: "noticeboard", description: "Notices, meetings & vacation management", icon: LayoutPanelTop, permission: "settings.manage" },
      { href: "/dashboard/audit", labelKey: "audit", description: "Track all actions & changes", icon: ShieldCheck, permission: "members.manage_roles" },
      { href: "/dashboard/permissions", labelKey: "permissions", description: "Role & member access control", icon: KeyRound, permission: "members.manage_roles" },
      { href: "/dashboard/mess", labelKey: "messSettings", description: "Mess info, invite code & meal rules", icon: Building2, permission: "settings.manage" },
      { href: "/dashboard/manager", labelKey: "manager", description: "Assign and manage mess managers", icon: UserCog, permission: "settings.manage" },
    ],
  },
];

// ── Standalone items ───────────────────────────────────────────

export const STANDALONE_NAV_ITEMS: StandaloneNavItem[] = [
  { href: "/dashboard/notifications", labelKey: "notifications", description: "Your alerts & unread updates", icon: Bell, permission: null },
  { href: "/dashboard/settings", labelKey: "account", description: "Your profile, photo & preferences", icon: Settings, permission: null },
];

// ── Utility: detect active group from pathname ─────────────────

export function getActiveGroupId(pathname: string): string | null {
  for (const group of NAV_GROUPS) {
    if (group.directHref) {
      if (pathname === group.directHref) return group.id;
      continue;
    }
    const match = group.items.some((item) => {
      if (item.href === "/dashboard/meals") return pathname === "/dashboard/meals";
      return pathname.startsWith(item.href);
    });
    if (match) return group.id;
  }
  return null;
}

// ── Utility: get page title keys from pathname ─────────────────

export function getPageTitleKeys(pathname: string): {
  groupLabelKey: string | null;
  itemLabelKey: string | null;
  description: string | null;
} {
  for (const group of NAV_GROUPS) {
    if (group.directHref) {
      if (pathname === group.directHref) {
        return { groupLabelKey: group.labelKey, itemLabelKey: group.labelKey, description: group.description };
      }
      continue;
    }
    for (const item of group.items) {
      const matches =
        item.href === "/dashboard/meals"
          ? pathname === item.href
          : pathname.startsWith(item.href);
      if (matches) {
        return { groupLabelKey: group.labelKey, itemLabelKey: item.labelKey, description: item.description };
      }
    }
  }
  for (const item of STANDALONE_NAV_ITEMS) {
    if (pathname.startsWith(item.href)) {
      return { groupLabelKey: item.labelKey, itemLabelKey: item.labelKey, description: item.description };
    }
  }
  return { groupLabelKey: null, itemLabelKey: null, description: null };
}
