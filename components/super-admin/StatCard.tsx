import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: "blue" | "green" | "orange" | "red" | "purple";
  sub?: string;
}

const COLOR_MAP = {
  blue:   { bg: "bg-blue-50",   icon: "bg-blue-500",   text: "text-blue-600"  },
  green:  { bg: "bg-green-50",  icon: "bg-green-500",  text: "text-green-600" },
  orange: { bg: "bg-orange-50", icon: "bg-orange-500", text: "text-orange-600"},
  red:    { bg: "bg-red-50",    icon: "bg-red-500",    text: "text-red-600"   },
  purple: { bg: "bg-purple-50", icon: "bg-purple-500", text: "text-purple-600"},
};

export function StatCard({ label, value, icon: Icon, color = "blue", sub }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={cn("rounded-xl p-5 border", c.bg, "border-transparent")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={cn("text-3xl font-bold mt-1", c.text)}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", c.icon)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
