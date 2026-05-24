"use client";
import { useState } from "react";
import { useAllComplaints, useUpdateComplaintStatus } from "@/lib/hooks/use-super-admin";
import { useLanguage } from "@/lib/hooks/use-language";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquareWarning, Search, RefreshCw, Building2, User,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ComplaintSummary } from "@/lib/types/super-admin.types";

const STATUS_STYLES: Record<string, string> = {
  open:        "bg-red-100 text-red-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved:    "bg-green-100 text-green-700",
  closed:      "bg-slate-100 text-slate-600",
  rejected:    "bg-orange-100 text-orange-700",
};

const PRIORITY_STYLES: Record<string, string> = {
  low:    "bg-slate-100 text-slate-600",
  medium: "bg-yellow-100 text-yellow-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function ComplaintRow({ complaint }: { complaint: ComplaintSummary }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [statusDialog, setStatusDialog] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const update = useUpdateComplaintStatus();

  const NEXT_STATUSES: Record<string, { value: string; label: string }[]> = {
    open:        [{ value: "in_progress", label: t.superAdmin.complaints.startProgressBtn }, { value: "rejected", label: t.superAdmin.complaints.rejectBtn }],
    in_progress: [{ value: "resolved", label: t.superAdmin.complaints.resolveBtn }, { value: "closed", label: t.superAdmin.complaints.closeBtn }],
    resolved:    [{ value: "closed", label: t.superAdmin.complaints.closeBtn }],
    closed:      [],
    rejected:    [],
  };

  const STATUS_LABELS: Record<string, string> = {
    open: t.superAdmin.complaints.status.open,
    in_progress: t.superAdmin.complaints.status.inProgress,
    resolved: t.superAdmin.complaints.status.resolved,
    closed: t.superAdmin.complaints.status.closed,
    rejected: t.superAdmin.complaints.status.rejected,
  };

  const PRIORITY_LABELS: Record<string, string> = {
    low: t.superAdmin.complaints.priority.low,
    medium: t.superAdmin.complaints.priority.medium,
    high: t.superAdmin.complaints.priority.high,
    urgent: t.superAdmin.complaints.priority.urgent,
  };

  const CATEGORY_LABELS: Record<string, string> = {
    food: t.superAdmin.complaints.categories.food,
    cleaning: t.superAdmin.complaints.categories.cleaning,
    maintenance: t.superAdmin.complaints.categories.maintenance,
    member: t.superAdmin.complaints.categories.member,
    billing: t.superAdmin.complaints.categories.billing,
    other: t.superAdmin.complaints.categories.other,
  };

  const nextStatuses = NEXT_STATUSES[complaint.status] ?? [];

  const handleUpdate = () => {
    if (!statusDialog) return;
    update.mutate(
      { id: complaint.id, status: statusDialog, note: note || undefined },
      { onSuccess: () => { setStatusDialog(null); setNote(""); } }
    );
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", PRIORITY_STYLES[complaint.priority])}>
                {PRIORITY_LABELS[complaint.priority] ?? complaint.priority}
              </span>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_STYLES[complaint.status])}>
                {STATUS_LABELS[complaint.status] ?? complaint.status}
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {CATEGORY_LABELS[complaint.category] ?? complaint.category}
              </span>
            </div>
            <p className="font-semibold text-slate-800 mt-1.5">{complaint.title}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
              {complaint.mess && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />{complaint.mess.name}
                </span>
              )}
              {complaint.submitter && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />{complaint.submitter.full_name}
                </span>
              )}
              <span>
                {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true, locale: bn })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {nextStatuses.map((s) => (
              <Button
                key={s.value}
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => setStatusDialog(s.value)}
              >
                {s.label}
              </Button>
            ))}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            <p className="text-sm text-slate-700">{complaint.description}</p>
            {complaint.resolution_note && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs font-medium text-green-700 mb-1">{t.superAdmin.complaints.resolutionNote}</p>
                <p className="text-sm text-green-800">{complaint.resolution_note}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.superAdmin.complaints.updateStatus}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              <span className="font-medium">"{complaint.title}"</span> {t.superAdmin.complaints.updateDesc}
            </p>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{t.superAdmin.complaints.noteOptional}</label>
              <Textarea
                placeholder={t.superAdmin.complaints.notePlaceholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>{t.cancel}</Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleUpdate}
              disabled={update.isPending}
            >
              {t.superAdmin.complaints.updateBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ComplaintsPage() {
  const { t } = useLanguage();
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("all");
  const [priority, setPriority] = useState("all");

  const { data, isLoading, refetch } = useAllComplaints(status, priority, search);
  const complaints = data?.data ?? [];
  const count      = data?.count ?? 0;

  const urgentCount = complaints.filter((c) => c.priority === "urgent" && c.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
          <MessageSquareWarning className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.superAdmin.complaints.title}</h1>
          <p className="text-sm text-slate-500">{t.superAdmin.complaints.subtitle}</p>
        </div>
      </div>

      {urgentCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <MessageSquareWarning className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {t.superAdmin.complaints.urgentAlert.replace("{count}", String(urgentCount))}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t.superAdmin.complaints.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t.superAdmin.complaints.allStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.superAdmin.complaints.allStatus}</SelectItem>
            <SelectItem value="open">{t.superAdmin.complaints.status.open}</SelectItem>
            <SelectItem value="in_progress">{t.superAdmin.complaints.status.inProgress}</SelectItem>
            <SelectItem value="resolved">{t.superAdmin.complaints.status.resolved}</SelectItem>
            <SelectItem value="closed">{t.superAdmin.complaints.status.closed}</SelectItem>
            <SelectItem value="rejected">{t.superAdmin.complaints.status.rejected}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t.superAdmin.complaints.allPriority} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.superAdmin.complaints.allPriority}</SelectItem>
            <SelectItem value="urgent">{t.superAdmin.complaints.priority.urgent}</SelectItem>
            <SelectItem value="high">{t.superAdmin.complaints.priority.high}</SelectItem>
            <SelectItem value="medium">{t.superAdmin.complaints.priority.medium}</SelectItem>
            <SelectItem value="low">{t.superAdmin.complaints.priority.low}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {!isLoading && (
        <p className="text-sm text-slate-500">{t.superAdmin.complaints.found.replace("{count}", String(count))}</p>
      )}

      <div className="space-y-3">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
        {!isLoading && complaints.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <MessageSquareWarning className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t.superAdmin.complaints.noComplaints}</p>
          </div>
        )}
        {!isLoading && complaints.map((c) => (
          <ComplaintRow key={c.id} complaint={c as ComplaintSummary} />
        ))}
      </div>
    </div>
  );
}
