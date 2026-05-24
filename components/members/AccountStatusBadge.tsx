"use client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/hooks/use-language";
import type { AccountStatus } from "@/lib/types";

interface Props {
  status: AccountStatus;
  size?: "sm" | "md";
}

const CONFIG: Record<AccountStatus, { bg: string; text: string; dot: string }> = {
  active:  { bg: "bg-green-100 border-green-200",  text: "text-green-700",  dot: "bg-green-500"  },
  frozen:  { bg: "bg-blue-100 border-blue-200",    text: "text-blue-700",   dot: "bg-blue-500"   },
  banned:  { bg: "bg-orange-100 border-orange-200",text: "text-orange-700", dot: "bg-orange-500" },
  closed:  { bg: "bg-red-100 border-red-200",      text: "text-red-700",    dot: "bg-red-500"    },
};

export function AccountStatusBadge({ status, size = "sm" }: Props) {
  const { t } = useLanguage();
  if (status === "active") return null;
  const c = CONFIG[status];
  const label =
    status === "frozen" ? t.violations.statusFrozen :
    status === "banned" ? t.violations.statusBanned :
    t.violations.statusClosed;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 font-medium",
        c.bg, c.text,
        size === "sm" ? "text-[10px] py-0.5" : "text-xs py-1"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", c.dot)} />
      {label}
    </span>
  );
}
