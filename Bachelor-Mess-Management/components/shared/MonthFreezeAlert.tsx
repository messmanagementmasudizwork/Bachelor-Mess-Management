"use client";
import { Lock } from "lucide-react";
import { useLanguage } from "@/lib/hooks/use-language";

interface Props {
  className?: string;
}

export function MonthFreezeAlert({ className }: Props) {
  const { t } = useLanguage();
  return (
    <div className={`flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 ${className ?? ""}`}>
      <Lock className="h-4 w-4 flex-shrink-0 text-amber-600" />
      <p className="text-sm font-medium">
        {t.reports.monthClosed}
      </p>
    </div>
  );
}
