"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getRoleDisplayNameBn } from "@/lib/utils/permissions";
import { useLanguage } from "@/lib/hooks/use-language";
import type { MemberRole } from "@/lib/types";

export type FilterStatus = "all" | "on" | "off";
export type SortBy = "name" | "meals" | "balance";
export type SortDir = "asc" | "desc";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  filterStatus: FilterStatus;
  onFilterStatus: (v: FilterStatus) => void;
  filterRole: MemberRole | "all";
  onFilterRole: (v: MemberRole | "all") => void;
  uniqueRoles: MemberRole[];
}

export function MealControlFilterBar({
  search, onSearch,
  filterStatus, onFilterStatus,
  filterRole, onFilterRole,
  uniqueRoles,
}: Props) {
  const { t } = useLanguage();

  const chip = (active: boolean) =>
    cn(
      "text-xs px-2.5 py-1 rounded-full border font-medium transition-colors whitespace-nowrap",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
    );

  const STATUS_FILTERS: { key: FilterStatus; label: string }[] = [
    { key: "all", label: t.mealControl.filterAll },
    { key: "on",  label: t.mealControl.filterOn },
    { key: "off", label: t.mealControl.filterOff },
  ];

  return (
    <Card>
      <CardContent className="p-3 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t.mealControl.searchPlaceholder}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => onFilterStatus(key)} className={chip(filterStatus === key)}>
              {label}
            </button>
          ))}

          {uniqueRoles.length > 0 && (
            <div className="w-px h-4 bg-border self-center" />
          )}

          {uniqueRoles.map((r) => (
            <button
              key={r}
              onClick={() => onFilterRole(filterRole === r ? "all" : r)}
              className={chip(filterRole === r)}
            >
              {getRoleDisplayNameBn(r)}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
