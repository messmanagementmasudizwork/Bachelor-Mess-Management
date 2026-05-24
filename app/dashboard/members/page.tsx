"use client";
import { useState } from "react";
import { Users, Crown, Copy, Shield, Trash2, TrendingDown, TrendingUp, CalendarOff, Armchair, UserSearch, History, UserCheck, UserX, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardLoader } from "@/components/shared/LoadingSpinner";
import { MemberActionDialog, type MemberAction } from "@/components/members/MemberActionDialog";
import { MemberProfileDialog } from "@/components/members/MemberProfileDialog";
import { PermissionOverrideDialog } from "@/components/members/PermissionOverrideDialog";
import { ReactivationReviewPanel } from "@/components/members/ReactivationReviewPanel";
import { AccountStatusBadge } from "@/components/members/AccountStatusBadge";
import { useMembers, useAssignManager, useUpdateMemberStatus } from "@/lib/hooks/use-members";
import { useMemberBalances } from "@/lib/hooks/use-deposits";
import { useMess } from "@/lib/hooks/use-mess";
import { useMessStore } from "@/lib/stores/mess.store";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { useQueryClient } from "@tanstack/react-query";
import { getRoleBadgeColor, getRoleDisplayNameBn } from "@/lib/utils/permissions";
import { getTimeAgo } from "@/lib/utils/date";
import { getInitials, cn } from "@/lib/utils";
import { usePreferences } from "@/lib/hooks/use-preferences";
import type { MemberRole, MemberStatus } from "@/lib/types";
import { useLanguage } from "@/lib/hooks/use-language";

type ActionMember = {
  id: string;
  name: string;
  role: MemberRole;
  action: MemberAction;
  currentSeat?: number | null;
} | null;

export default function MembersPage() {
  const { t } = useLanguage();
  const { formatCurrency } = usePreferences();
  const { activeMess } = useMessStore();
  const { data: members, isLoading, refetch } = useMembers();
  const { data: mess } = useMess(activeMess?.id);
  const { data: balances } = useMemberBalances();
  const assignManager = useAssignManager();
  const updateStatus = useUpdateMemberStatus();
  const queryClient = useQueryClient();

  const STATUS_OPTIONS: { value: MemberStatus; label: string }[] = [
    { value: "active", label: t.members.status.active },
    { value: "inactive", label: t.members.status.inactive },
    { value: "on_leave", label: t.members.status.onLeave },
  ];

  const [actionMember, setActionMember] = useState<ActionMember>(null);
  const [assignManagerOpen, setAssignManagerOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<(typeof members extends (infer T)[] | undefined ? T : never) | null>(null);
  const [permMember, setPermMember] = useState<{ id: string; userId: string; name: string; role: MemberRole } | null>(null);

  const canManageRoles = useHasPermission("members.manage_roles");
  const canRemoveMembers = useHasPermission("members.remove");

  const getBalance = (memberId: string) =>
    balances?.find((b) => b.member_id === memberId);

  const handleCopyInviteCode = () => {
    if (!mess?.invite_code) return;
    navigator.clipboard.writeText(mess.invite_code);
    toast.success(t.members.inviteCopied);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        {canManageRoles ? (
          <Dialog open={assignManagerOpen} onOpenChange={setAssignManagerOpen}>

            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Crown className="h-4 w-4" />
                {t.members.assignManager}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{t.members.assignManagerTitle}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {members?.filter((m) => m.role !== "owner").map((member) => {
                  const userProfile = member.user as { full_name?: string; avatar_url?: string } | null;
                  return (
                    <button
                      key={member.id}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/50 transition-colors text-left",
                        member.role === "manager" && "border-green-300 bg-green-50"
                      )}
                      onClick={() => {
                        assignManager.mutate({ memberId: member.id });
                        setAssignManagerOpen(false);
                      }}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={userProfile?.avatar_url} />
                        <AvatarFallback className="text-xs">{getInitials(userProfile?.full_name ?? "?")}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{userProfile?.full_name ?? t.deposits.memberLabel}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(member.role as MemberRole)}`}>
                          {getRoleDisplayNameBn(member.role as MemberRole)}
                        </span>
                      </div>
                      {member.role === "manager" && <Crown className="h-4 w-4 text-green-600" />}
                    </button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        ) : undefined}
      </div>

      {/* Invite code card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t.members.inviteCode}</p>
            <p className="text-2xl font-bold font-mono tracking-widest text-primary mt-1">
              {mess?.invite_code ?? t.members.inviteCodeLoading}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyInviteCode} disabled={!mess?.invite_code}>
            <Copy className="h-4 w-4" />
            {t.members.copyBtn}
          </Button>
        </CardContent>
      </Card>

      {/* Reactivation review panel (owner/admin/manager only) */}
      {activeMess?.id && (
        <ReactivationReviewPanel
          messId={activeMess.id}
          myRole={activeMess.role ?? "member"}
        />
      )}

      {/* Members list + join/leave history */}
      <Tabs defaultValue="list">
        <TabsList className="w-full">
          <TabsTrigger value="list" className="flex-1">{t.dashboard.memberList}</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1">
            <History className="h-3.5 w-3.5" />
            {t.members.tabs.history}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                {t.members.joinHistory}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardLoader />
              ) : !members || members.length === 0 ? (
                <EmptyState icon={<Users className="h-7 w-7" />} title={t.members.noMembers} description={t.members.inviteToAddMembers} />
              ) : (
                <div className="space-y-2">
                  {[...members]
                    .sort((a, b) => (b.joining_date ?? "").localeCompare(a.joining_date ?? ""))
                    .map((member) => {
                      const userProfile = member.user as { full_name?: string; avatar_url?: string } | null;
                      const isActive = member.status === "active";
                      const isOnLeave = member.status === "on_leave";
                      return (
                        <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 ${isActive ? "bg-green-100 text-green-700" : isOnLeave ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                            {isActive ? <UserCheck className="h-4 w-4" /> : isOnLeave ? <CalendarOff className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{userProfile?.full_name ?? t.unknown}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {t.members.joinedAt} {member.joining_date ? new Date(member.joining_date).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" }) : t.unknown}
                              </span>
                              {member.seat_number && (
                                <span className="text-xs text-muted-foreground">• {t.members.seatNo}{member.seat_number}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge
                              variant={isActive ? "success" : "secondary"}
                              className="text-xs"
                            >
                              {isActive ? t.members.status.active : isOnLeave ? t.members.status.onLeave : t.members.status.inactive}
                            </Badge>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(member.role as MemberRole)}`}>
                              {getRoleDisplayNameBn(member.role as MemberRole)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t.dashboard.memberList}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardLoader />
              ) : !members || members.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-7 w-7" />}
                  title={t.members.noMembers}
                  description={t.members.inviteToAddMembers}
                />
              ) : (
                <div className="space-y-3">
                  {members.map((member) => {
                    const userProfile = member.user as {
                      id?: string;
                      full_name?: string;
                      avatar_url?: string;
                      phone?: string;
                      email?: string;
                      profession?: string;
                      blood_group?: string;
                      emergency_contact?: string;
                    } | null;
                    const isOwner = member.role === "owner";
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/40 transition-colors"
                      >
                        <button
                          onClick={() => setProfileMember(member)}
                          className="flex-shrink-0 rounded-full hover:ring-2 hover:ring-primary/40 transition-all"
                          title={t.members.viewProfile}
                        >
                          <Avatar className="h-11 w-11">
                            <AvatarImage src={userProfile?.avatar_url} />
                            <AvatarFallback>{getInitials(userProfile?.full_name ?? "?")}</AvatarFallback>
                          </Avatar>
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              className="text-sm font-semibold truncate hover:text-primary transition-colors text-left"
                              onClick={() => setProfileMember(member)}
                            >
                              {userProfile?.full_name ?? t.unknown}
                            </button>
                            {member.role === "manager" && (
                              <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                            )}
                            <AccountStatusBadge
                              status={(member.account_status as import("@/lib/types").AccountStatus | undefined) ?? "active"}
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRoleBadgeColor(member.role as MemberRole)}`}>
                              {getRoleDisplayNameBn(member.role as MemberRole)}
                            </span>
                            {member.seat_number && (
                              <span className="text-xs text-muted-foreground">{t.members.seatNo}{member.seat_number}</span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {getTimeAgo(member.joining_date)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {canManageRoles && !isOwner ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="focus:outline-none">
                                  <Badge
                                    variant={member.status === "active" ? "success" : "secondary"}
                                    className="text-xs cursor-pointer"
                                  >
                                    {member.status === "active" ? t.members.status.active : member.status === "on_leave" ? t.members.status.onLeave : t.members.status.inactive}
                                  </Badge>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                {STATUS_OPTIONS.map((opt) => (
                                  <DropdownMenuItem
                                    key={opt.value}
                                    disabled={member.status === opt.value || updateStatus.isPending}
                                    onClick={() => updateStatus.mutate({ memberId: member.id, status: opt.value })}
                                    className={cn(member.status === opt.value && "font-semibold")}
                                  >
                                    {opt.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Badge variant={member.status === "active" ? "success" : "secondary"} className="text-xs">
                              {member.status === "active" ? t.members.status.active : member.status === "on_leave" ? t.members.status.onLeave : t.members.status.inactive}
                            </Badge>
                          )}

                          {(() => {
                            const bal = getBalance(member.id);
                            if (!bal) return null;
                            const net = Number(bal.balance ?? 0);
                            return (
                              <span className={cn(
                                "flex items-center gap-0.5 text-xs font-medium",
                                net >= 0 ? "text-emerald-600" : "text-red-500"
                              )}>
                                {net >= 0
                                  ? <TrendingUp className="h-3 w-3" />
                                  : <TrendingDown className="h-3 w-3" />}
                                {formatCurrency(Math.abs(net))}
                              </span>
                            );
                          })()}

                          {(canManageRoles || canRemoveMembers) && !isOwner && (
                            <div className="flex flex-wrap gap-1">
                              <button
                                onClick={() => setProfileMember(member)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title={t.members.viewProfile}
                              >
                                <UserSearch className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setActionMember({ id: member.id, name: userProfile?.full_name ?? t.deposits.memberLabel, role: member.role as MemberRole, action: "seat", currentSeat: member.seat_number })}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title={t.members.actions.seatNumber}
                              >
                                <Armchair className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setActionMember({ id: member.id, name: userProfile?.full_name ?? t.deposits.memberLabel, role: member.role as MemberRole, action: "leave" })}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title={t.members.actions.setLeave}
                              >
                                <CalendarOff className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setActionMember({ id: member.id, name: userProfile?.full_name ?? t.deposits.memberLabel, role: member.role as MemberRole, action: "role" })}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title={t.members.actions.changeRole}
                              >
                                <Shield className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setPermMember({ id: member.id, userId: member.user_id, name: userProfile?.full_name ?? t.deposits.memberLabel, role: member.role as MemberRole })}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                                title={t.members.actions.customPermissions}
                              >
                                <KeyRound className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setActionMember({ id: member.id, name: userProfile?.full_name ?? t.deposits.memberLabel, role: member.role as MemberRole, action: "remove" })}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                title={t.members.actions.remove}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MemberActionDialog
        member={actionMember}
        onClose={() => setActionMember(null)}
      />

      {permMember && (
        <PermissionOverrideDialog
          open={!!permMember}
          onClose={() => setPermMember(null)}
          memberId={permMember.id}
          userId={permMember.userId}
          memberName={permMember.name}
          memberRole={permMember.role}
        />
      )}

      <MemberProfileDialog
        member={profileMember
          ? {
              id: profileMember.id,
              user_id: profileMember.user_id,
              role: profileMember.role as MemberRole,
              status: profileMember.status,
              seat_number: profileMember.seat_number,
              joining_date: profileMember.joining_date ?? undefined,
              meal_default_breakfast: profileMember.meal_default_breakfast ?? undefined,
              meal_default_lunch: profileMember.meal_default_lunch ?? undefined,
              meal_default_dinner: profileMember.meal_default_dinner ?? undefined,
              user: profileMember.user as {
                id?: string;
                full_name?: string | null;
                phone?: string | null;
                email?: string | null;
                avatar_url?: string | null;
                profession?: string | null;
                blood_group?: string | null;
                emergency_contact?: string | null;
              } | null,
            }
          : null}
        open={!!profileMember}
        onClose={() => setProfileMember(null)}
        canEdit={canManageRoles}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["members"] });
          setProfileMember(null);
        }}
      />
    </div>
  );
}
