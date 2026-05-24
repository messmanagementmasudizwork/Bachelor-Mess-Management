"use client";
import { useState } from "react";
import {
  useAllMesses,
  useUpdateMessStatus,
  useDeleteMess,
} from "@/lib/hooks/use-super-admin";
import { useLanguage } from "@/lib/hooks/use-language";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Search, MoreVertical, CheckCircle, XCircle, Trash2, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import type { MessOverview } from "@/lib/types/super-admin.types";
import type { MessStatusFilter } from "@/lib/types/super-admin.types";

function MessRow({ mess }: { mess: MessOverview }) {
  const { t } = useLanguage();
  const updateStatus = useUpdateMessStatus();
  const deleteMess   = useDeleteMess();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const STATUS_LABELS = {
    active:    { label: t.superAdmin.messes.status.active,    variant: "default" as const     },
    inactive:  { label: t.superAdmin.messes.status.inactive,  variant: "secondary" as const   },
    suspended: { label: t.superAdmin.messes.status.suspended, variant: "destructive" as const },
  };

  const status = STATUS_LABELS[mess.status as keyof typeof STATUS_LABELS] ?? { label: mess.status, variant: "outline" as const };

  return (
    <>
      <div className="flex items-start justify-between bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800 truncate">{mess.name}</p>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.superAdmin.messes.owner} {mess.owner?.full_name ?? t.superAdmin.messes.unknownOwner} · {mess.owner?.email ?? mess.owner?.phone ?? ""}
            </p>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {mess.member_count ?? "—"} {t.superAdmin.messes.memberLabel}
              </span>
              <span className="text-xs text-slate-400">
                {t.superAdmin.messes.createdLabel} {formatDistanceToNow(new Date(mess.created_at), { locale: bn, addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {mess.status !== "active" && (
              <DropdownMenuItem
                className="text-green-600"
                onClick={() => updateStatus.mutate({ messId: mess.id, status: "active" })}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {t.superAdmin.messes.activate}
              </DropdownMenuItem>
            )}
            {mess.status !== "suspended" && (
              <DropdownMenuItem
                className="text-orange-600"
                onClick={() => updateStatus.mutate({ messId: mess.id, status: "suspended" })}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t.superAdmin.messes.suspend}
              </DropdownMenuItem>
            )}
            {mess.status !== "inactive" && (
              <DropdownMenuItem
                onClick={() => updateStatus.mutate({ messId: mess.id, status: "inactive" })}
              >
                {t.superAdmin.messes.deactivate}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t.superAdmin.messes.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.superAdmin.messes.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{mess.name}</strong> {t.superAdmin.messes.deleteDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMess.mutate(mess.id)}
            >
              {t.superAdmin.messes.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function MessManagementPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MessStatusFilter>("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as typeof window & { _st?: ReturnType<typeof setTimeout> })._st);
    (window as typeof window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const { data, isLoading } = useAllMesses(filter, debouncedSearch);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.superAdmin.messes.title}</h1>
          <p className="text-sm text-slate-500">
            {t.superAdmin.messes.found.replace("{count}", String(data?.count ?? 0))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t.superAdmin.messes.searchPlaceholder}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as MessStatusFilter)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t.superAdmin.messes.allMesses} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.superAdmin.messes.allMesses}</SelectItem>
            <SelectItem value="active">{t.superAdmin.messes.status.active}</SelectItem>
            <SelectItem value="inactive">{t.superAdmin.messes.status.inactive}</SelectItem>
            <SelectItem value="suspended">{t.superAdmin.messes.status.suspended}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
        {!isLoading && (data?.data ?? []).length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t.superAdmin.messes.noMesses}</p>
          </div>
        )}
        {!isLoading && (data?.data ?? []).map((mess) => (
          <MessRow key={mess.id} mess={mess} />
        ))}
      </div>
    </div>
  );
}
