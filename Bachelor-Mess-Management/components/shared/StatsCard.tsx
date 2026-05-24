import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: "default" | "green" | "red" | "blue" | "purple" | "amber";
  loading?: boolean;
  className?: string;
}

const colorMap = {
  default: {
    icon: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    bg: "",
  },
  green: {
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400",
    bg: "",
  },
  red: {
    icon: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400",
    bg: "",
  },
  blue: {
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
    bg: "",
  },
  purple: {
    icon: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400",
    bg: "",
  },
  amber: {
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400",
    bg: "",
  },
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "default",
  loading,
  className,
}: StatsCardProps) {
  if (loading) {
    return (
      <div className={cn("stat-card", className)}>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </div>
    );
  }

  const colors = colorMap[color];

  return (
    <div className={cn("stat-card", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-2 text-2xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              trend.value >= 0 ? "text-emerald-600" : "text-red-600"
            )}>
              <span>{trend.value >= 0 ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}% {trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0", colors.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
