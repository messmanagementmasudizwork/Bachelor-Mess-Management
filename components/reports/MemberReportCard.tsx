"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { getInitials, cn } from "@/lib/utils";
import { useLanguage } from "@/lib/hooks/use-language";

export interface DailyMealEntry {
  b: boolean;
  l: boolean;
  d: boolean;
  g: number;
}

export interface MemberReportData {
  member_id: string;
  member_name: string;
  avatar_url: string | null;
  meal_summary: {
    total_breakfast: number;
    total_lunch: number;
    total_dinner: number;
    total_guest_meals: number;
    total_meals: number;
    meal_cost: number;
  };
  meal_cost: number;
  fixed_cost_share: number;
  guest_charge?: number;
  total_cost: number;
  deposited: number;
  balance: number;
  status: "due" | "advance" | "clear";
  daily_meals?: Record<string, DailyMealEntry>;
}

interface Props {
  member: MemberReportData;
}

const STATUS_CONFIG = {
  due: {
    badge: "destructive" as const,
    bg: "from-red-50/80 to-rose-50/40 dark:from-red-950/30 dark:to-rose-950/10",
    border: "border-red-200 dark:border-red-800",
    balanceColor: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
  advance: {
    badge: "success" as const,
    bg: "from-green-50/80 to-emerald-50/40 dark:from-green-950/30 dark:to-emerald-950/10",
    border: "border-green-200 dark:border-green-800",
    balanceColor: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
  },
  clear: {
    badge: "secondary" as const,
    bg: "from-background to-muted/20",
    border: "border-border",
    balanceColor: "text-foreground",
    dot: "bg-gray-400",
  },
};

export function MemberReportCard({ member }: Props) {
  const { t } = useLanguage();
  const { formatCurrency } = usePreferences();
  const [expanded, setExpanded] = useState(false);

  const mrc = t.reports.mealReportCard;
  const cfg = STATUS_CONFIG[member.status];

  const MEAL_SLOTS = [
    { key: "total_breakfast" as const, label: mrc.breakfast, emoji: "🌅", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
    { key: "total_lunch"     as const, label: mrc.lunch,     emoji: "☀️",  color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"   },
    { key: "total_dinner"    as const, label: mrc.dinner,    emoji: "🌙",  color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200" },
    { key: "total_guest_meals" as const, label: mrc.guest,   emoji: "👤",  color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200" },
  ];

  const costRows = [
    { label: mrc.mealCost,      value: member.meal_cost,         cls: "text-foreground" },
    { label: mrc.fixedCostShare, value: member.fixed_cost_share, cls: "text-foreground" },
    ...(member.guest_charge && member.guest_charge > 0
      ? [{ label: mrc.guestMealCharge, value: member.guest_charge, cls: "text-purple-600 dark:text-purple-400" }]
      : []),
  ];

  return (
    <div className={cn(
      "overflow-hidden rounded-2xl border bg-gradient-to-br transition-all",
      cfg.bg, cfg.border
    )}>
      {/* Header row */}
      <button
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => setExpanded(!expanded)}
        aria-label={mrc.viewDetails}
      >
        {/* Avatar with status dot */}
        <div className="relative shrink-0">
          <Avatar className="h-11 w-11 ring-2 ring-background shadow-sm">
            <AvatarImage src={member.avatar_url ?? undefined} />
            <AvatarFallback className="text-sm font-semibold">
              {getInitials(member.member_name)}
            </AvatarFallback>
          </Avatar>
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-background",
            cfg.dot
          )} />
        </div>

        {/* Name + meals */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{member.member_name}</p>
            <Badge variant={cfg.badge} className="text-[10px] py-0 px-1.5 h-4 shrink-0">
              {mrc[member.status]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {member.meal_summary.total_meals} {mrc.meals}
          </p>
        </div>

        {/* Balance + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className={cn("text-base font-extrabold leading-none", cfg.balanceColor)}>
              {member.balance >= 0 ? "+" : ""}
              {formatCurrency(member.balance)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{mrc.balance}</p>
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3 bg-background/60 dark:bg-background/20">
          {/* Meal breakdown chips */}
          <div className="grid grid-cols-4 gap-2">
            {MEAL_SLOTS.map(({ key, label, emoji, color }) => (
              <div key={key} className={cn("flex flex-col items-center rounded-xl py-2.5 px-1", color)}>
                <span className="text-sm">{emoji}</span>
                <p className="text-base font-bold leading-none mt-1">{member.meal_summary[key]}</p>
                <p className="text-[10px] font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Cost breakdown */}
          <div className="rounded-xl border bg-background/80 divide-y overflow-hidden">
            {costRows.map((row) => (
              <div key={row.label} className="flex justify-between items-center px-3 py-2 text-xs">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn("font-medium", row.cls)}>{formatCurrency(row.value)}</span>
              </div>
            ))}

            {/* Total cost */}
            <div className="flex justify-between items-center px-3 py-2 text-xs bg-muted/30">
              <span className="font-semibold">{mrc.totalCost}</span>
              <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(member.total_cost)}</span>
            </div>

            {/* Deposited */}
            <div className="flex justify-between items-center px-3 py-2 text-xs bg-muted/30">
              <span className="font-semibold">{mrc.deposited}</span>
              <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(member.deposited)}</span>
            </div>

            {/* Balance */}
            <div className="flex justify-between items-center px-3 py-2.5 text-sm bg-muted/50">
              <span className="font-bold">{mrc.balance}</span>
              <span className={cn("font-extrabold", cfg.balanceColor)}>
                {member.balance >= 0 ? "+" : ""}
                {formatCurrency(member.balance)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
