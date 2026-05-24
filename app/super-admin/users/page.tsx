"use client";
import { useState } from "react";
import { useAllUsers, useBanUser, useUnbanUser } from "@/lib/hooks/use-super-admin";
import { useLanguage } from "@/lib/hooks/use-language";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, Ban, CheckCircle, Shield, UserX } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import type { UserOverview, UserFilter } from "@/lib/types/super-admin.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function UserRow({ user }: { user: UserOverview }) {
  const { t } = useLanguage();
  const ban   = useBanUser();
  const unban = useUnbanUser();
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");

  const initials = user.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <>
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="bg-purple-100 text-purple-700 text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800 truncate">{user.full_name}</p>
              {user.is_super_admin && (
                <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                  <Shield className="w-3 h-3 mr-1" />Super Admin
                </Badge>
              )}
              {user.is_banned && (
                <Badge variant="destructive" className="text-xs">
                  <UserX className="w-3 h-3 mr-1" />{t.superAdmin.users.banLabel}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {user.email ?? user.phone ?? "—"}
            </p>
            {user.is_banned && user.banned_reason && (
              <p className="text-xs text-red-500 mt-0.5">{t.superAdmin.users.banReason} {user.banned_reason}</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">
              {t.superAdmin.users.joinedLabel} {formatDistanceToNow(new Date(user.created_at), { locale: bn, addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user.is_banned ? (
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => unban.mutate(user.id)}
              disabled={unban.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {t.superAdmin.users.unbanBtn}
            </Button>
          ) : (
            !user.is_super_admin && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setBanOpen(true)}
              >
                <Ban className="w-4 h-4 mr-1" />
                {t.superAdmin.users.banBtn}
              </Button>
            )
          )}
        </div>
      </div>

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.superAdmin.users.banTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            <strong>{user.full_name}</strong> — {t.superAdmin.users.banReasonFor}:
          </p>
          <Textarea
            placeholder={t.superAdmin.users.banReasonPlaceholder}
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)}>{t.cancel}</Button>
            <Button
              variant="destructive"
              disabled={!banReason.trim() || ban.isPending}
              onClick={() => {
                ban.mutate({ userId: user.id, reason: banReason }, {
                  onSuccess: () => { setBanOpen(false); setBanReason(""); },
                });
              }}
            >
              {t.superAdmin.users.banBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function UserManagementPage() {
  const { t } = useLanguage();
  const [search, setSearch]               = useState("");
  const [filter, setFilter]               = useState<UserFilter>("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as typeof window & { _st?: ReturnType<typeof setTimeout> })._st);
    (window as typeof window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const { data, isLoading } = useAllUsers(filter, debouncedSearch);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.superAdmin.users.title}</h1>
          <p className="text-sm text-slate-500">{t.superAdmin.users.found.replace("{count}", String(data?.count ?? 0))}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t.superAdmin.users.searchPlaceholder}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as UserFilter)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.superAdmin.users.allUsers}</SelectItem>
            <SelectItem value="banned">{t.superAdmin.users.banned}</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
        {!isLoading && (data?.data ?? []).length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t.superAdmin.users.noUsers}</p>
          </div>
        )}
        {!isLoading && (data?.data ?? []).map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}
