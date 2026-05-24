"use client";
import { useState } from "react";
import { useAuditLogs } from "@/lib/hooks/use-super-admin";
import { useLanguage } from "@/lib/hooks/use-language";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, Search, RefreshCw, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import type { AuditLogEntry } from "@/lib/types/super-admin.types";
import { cn } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login:  "bg-purple-100 text-purple-700",
  logout: "bg-slate-100 text-slate-600",
};

function getActionColor(action: string): string {
  const key = Object.keys(ACTION_COLORS).find((k) => action.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : "bg-orange-100 text-orange-700";
}

function AuditRow({ log }: { log: AuditLogEntry }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.old_value || log.new_value;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", getActionColor(log.action))}>
              {log.action}
            </span>
            <span className="text-sm font-medium text-slate-700">{log.entity_type}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
            {log.user && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {log.user.full_name}
              </span>
            )}
            {log.mess && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {log.mess.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-xs text-slate-400">
            {format(new Date(log.created_at), "dd MMM yy, HH:mm", { locale: bn })}
          </p>
          {hasDetails && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? t.superAdmin.audit.less : t.superAdmin.audit.more}
            </Button>
          )}
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
          {log.old_value && (
            <div>
              <p className="text-xs font-medium text-red-600 mb-1">{t.superAdmin.audit.oldValue}</p>
              <pre className="text-xs bg-red-50 rounded p-2 overflow-x-auto text-red-800">
                {JSON.stringify(log.old_value, null, 2)}
              </pre>
            </div>
          )}
          {log.new_value && (
            <div>
              <p className="text-xs font-medium text-green-600 mb-1">{t.superAdmin.audit.newValue}</p>
              <pre className="text-xs bg-green-50 rounded p-2 overflow-x-auto text-green-800">
                {JSON.stringify(log.new_value, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [messId, setMessId] = useState("");
  const [filters, setFilters] = useState<{ action?: string; messId?: string }>({});

  const { data, isLoading, refetch, isFetching } = useAuditLogs(filters);

  const applyFilters = () => {
    setFilters({
      action: search || undefined,
      messId: messId || undefined,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setMessId("");
    setFilters({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.superAdmin.audit.title}</h1>
            <p className="text-sm text-slate-500">
              {t.superAdmin.audit.found.replace("{count}", String(data?.count ?? 0))}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          {t.superAdmin.audit.refreshBtn}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t.superAdmin.audit.actionFilter}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          placeholder={t.superAdmin.audit.messIdFilter}
          value={messId}
          onChange={(e) => setMessId(e.target.value)}
          className="sm:w-56"
        />
        <Button onClick={applyFilters} size="sm">{t.superAdmin.audit.applyBtn}</Button>
        {Object.keys(filters).length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>{t.superAdmin.audit.clearBtn}</Button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading && Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
        {!isLoading && (data?.data ?? []).length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t.superAdmin.audit.noLogs}</p>
          </div>
        )}
        {!isLoading && (data?.data ?? []).map((log) => (
          <AuditRow key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}
