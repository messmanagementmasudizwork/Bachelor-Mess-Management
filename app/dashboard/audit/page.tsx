"use client";
import { useState } from "react";
import { ShieldCheck, Clock, User, Package, Wallet, Receipt, Users, Settings, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { auditService, type AuditLog } from "@/lib/services/audit.service";
import { useMessStore } from "@/lib/stores/mess.store";
import { getInitials } from "@/lib/utils";
import { useLanguage } from "@/lib/hooks/use-language";

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  expense:    <Receipt className="h-3.5 w-3.5" />,
  deposit:    <Wallet className="h-3.5 w-3.5" />,
  member:     <Users className="h-3.5 w-3.5" />,
  mess:       <Settings className="h-3.5 w-3.5" />,
  meal:       <Package className="h-3.5 w-3.5" />,
  default:    <Package className="h-3.5 w-3.5" />,
};

const ACTION_COLORS: Record<string, string> = {
  create:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  approve: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  reject:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  default: "bg-muted text-muted-foreground",
};

const LIMIT_OPTIONS = [25, 50, 100];

function getActionColor(action: string): string {
  const key = Object.keys(ACTION_COLORS).find((k) => action.toLowerCase().includes(k));
  return ACTION_COLORS[key ?? "default"];
}

function AuditRow({ log }: { log: AuditLog }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const userName = (log.user as any)?.full_name ?? t.audit.actions.create;
  const icon = ENTITY_ICONS[log.entity_type] ?? ENTITY_ICONS.default;
  const actionColor = getActionColor(log.action);
  const actionLabel = (t.audit.actions as Record<string, string>)[log.action] ?? log.action;
  const entityLabel = (t.audit.entityTypes as Record<string, string>)[log.entity_type] ?? log.entity_type;
  const hasDetails = log.old_value || log.new_value;

  return (
    <div className="border-b border-border last:border-0 py-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
          <AvatarFallback className="text-xs">{getInitials(userName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="font-medium text-sm text-foreground">{userName}</span>
            <Badge className={`text-xs px-1.5 py-0 ${actionColor}`}>{actionLabel}</Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {icon} {entityLabel}
            </span>
            {log.entity_id && (
              <span className="text-xs text-muted-foreground font-mono">
                #{log.entity_id.slice(0, 8)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </span>
            {hasDetails && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                {t.audit.details} <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
          {expanded && hasDetails && (
            <div className="mt-2 space-y-1.5">
              {log.old_value && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded p-2 text-xs">
                  <p className="font-semibold text-red-700 dark:text-red-400 mb-1">{t.audit.oldValue}</p>
                  <pre className="text-red-800 dark:text-red-300 overflow-auto whitespace-pre-wrap text-[10px]">
                    {JSON.stringify(log.old_value, null, 2)}
                  </pre>
                </div>
              )}
              {log.new_value && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-xs">
                  <p className="font-semibold text-green-700 dark:text-green-400 mb-1">{t.audit.newValue}</p>
                  <pre className="text-green-800 dark:text-green-300 overflow-auto whitespace-pre-wrap text-[10px]">
                    {JSON.stringify(log.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const { t } = useLanguage();
  const { activeMess } = useMessStore();
  const [limit, setLimit] = useState(50);
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit_trail", activeMess?.id, limit],
    queryFn: () => auditService.getMessActivityLog(activeMess!.id, limit),
    enabled: !!activeMess?.id,
    staleTime: 30000,
  });

  const filtered = entityFilter === "all"
    ? logs
    : logs.filter((l) => l.entity_type === entityFilter);

  const entityTypes = Array.from(new Set(logs.map((l) => l.entity_type)));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? t.audit.loading : t.audit.refreshBtn}
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.audit.filterByType}</SelectItem>
            {entityTypes.map((et) => (
              <SelectItem key={et} value={et}>
                {(t.audit.entityTypes as Record<string, string>)[et] ?? et}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIMIT_OPTIONS.map((l) => (
              <SelectItem key={l} value={String(l)}>
                {t.audit.showEntries.replace("{n}", String(l))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length}
        </span>
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-8 w-8" />}
              title={t.audit.noLogs}
              description={t.audit.noLogsDesc}
            />
          ) : (
            <div>
              {filtered.map((log) => (
                <AuditRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
