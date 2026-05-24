"use client";
import { useState } from "react";
import { Crown, Calendar, UserCog, Clock, Shield, RotateCcw, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CardLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useManagerHistory, useMembers, useAssignManager } from "@/lib/hooks/use-members";
import { useMessStore } from "@/lib/stores/mess.store";
import { useRealtimeManagerChange } from "@/lib/hooks/use-realtime";
import { MEMBER_KEYS } from "@/lib/hooks/use-members";
import { getInitials } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import type { MemberRole } from "@/lib/types";
import { getRoleDisplayNameBn } from "@/lib/utils/permissions";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { useLanguage } from "@/lib/hooks/use-language";
import { usePreferences } from "@/lib/hooks/use-preferences";

interface AssignForm {
  note: string;
}

export default function ManagerPage() {
  const { t } = useLanguage();
  const { formatDatePref } = usePreferences();
  const { activeMess } = useMessStore();
  const { data: history, isLoading } = useManagerHistory();
  const { data: members } = useMembers();
  const assignManager = useAssignManager();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<AssignForm>({ defaultValues: { note: "" } });

  useRealtimeManagerChange([[...MEMBER_KEYS.manager(activeMess?.id ?? "")], [...MEMBER_KEYS.all]]);

  const currentManager = history?.find((h) => h.is_current);
  const pastManagers = history?.filter((h) => !h.is_current) ?? [];

  const today = new Date().toISOString().split("T")[0];
  const eligibleMembers = members?.filter((m) => m.role !== "owner" && m.status !== "removed") ?? [];
  const currentManagerMemberId = currentManager
    ? (currentManager.member as { id?: string } | null)?.id
    : null;
  const currentIdx = eligibleMembers.findIndex((m) => m.id === currentManagerMemberId);
  const rotationQueue = [
    ...eligibleMembers.slice(currentIdx + 1),
    ...eligibleMembers.slice(0, currentIdx + 1),
  ];

  const isMemberOnLeave = (member: typeof eligibleMembers[0]) => {
    const ls = (member as { leave_start?: string | null }).leave_start;
    const le = (member as { leave_end?: string | null }).leave_end;
    if (!ls) return false;
    return today >= ls && (!le || today <= le);
  };

  const nextAvailableIdx = rotationQueue.findIndex(
    (m) => m.id !== currentManagerMemberId && !isMemberOnLeave(m) && m.status === "active"
  );

  const isAdminOrOwner = useHasPermission("settings.manage");

  const getManagerName = (record: typeof currentManager) => {
    if (!record) return t.manager.managerFallback;
    const user = (record.member as { user?: { full_name?: string; avatar_url?: string } } | null)?.user;
    return user?.full_name ?? t.manager.managerFallback;
  };

  const getManagerAvatar = (record: typeof currentManager) => {
    if (!record) return null;
    const user = (record.member as { user?: { full_name?: string; avatar_url?: string } } | null)?.user;
    return user?.avatar_url ?? null;
  };

  const onConfirmAssign = async (data: AssignForm) => {
    if (!selectedMemberId) return;
    await assignManager.mutateAsync({ memberId: selectedMemberId, note: data.note || undefined });
    setSelectedMemberId(null);
    reset();
  };

  const selectedMember = members?.find((m) => m.id === selectedMemberId);
  const selectedProfile = selectedMember?.user as { full_name?: string } | null;

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="current">
        <p className="text-sm text-muted-foreground mb-3">{t.manager.pageSubtitle}</p>
        <TabsList className="w-full">
          <TabsTrigger value="current" className="flex-1">{t.manager.tabs.current}</TabsTrigger>
          <TabsTrigger value="rotation" className="flex-1 gap-1">
            <RotateCcw className="h-3.5 w-3.5" />
            {t.manager.tabs.rotation}
          </TabsTrigger>
          <TabsTrigger value="history-tab" className="flex-1 gap-1">
            <Clock className="h-3.5 w-3.5" />
            {t.manager.tabs.history}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rotation">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                {t.manager.rotationTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!members || members.length === 0 ? (
                <EmptyState icon={<Users className="h-7 w-7" />} title={t.manager.noMembers} description={t.manager.membersJoinNote} />
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    {t.manager.rotationNote}
                  </p>
                  {rotationQueue.map((member, idx) => {
                    const userProfile = member.user as { full_name?: string; avatar_url?: string } | null;
                    const isCurrent = member.id === currentManagerMemberId;
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isCurrent ? "border-amber-300 bg-amber-50" : idx === 0 && !isCurrent ? "border-blue-200 bg-blue-50/50" : "bg-muted/20"}`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${isCurrent ? "bg-amber-400 text-white" : idx === 0 ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                          {isCurrent ? <Crown className="h-4 w-4" /> : idx + 1}
                        </div>
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarFallback className="text-xs">{getInitials(userProfile?.full_name ?? "?")}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{userProfile?.full_name ?? t.deposits.memberLabel}</p>
                          <p className="text-xs text-muted-foreground">{getRoleDisplayNameBn(member.role as MemberRole)}</p>
                        </div>
                        {isCurrent && <Badge variant="warning" className="text-xs flex-shrink-0">{t.manager.currentLabel}</Badge>}
                        {isMemberOnLeave(member) && !isCurrent && <Badge variant="secondary" className="text-xs flex-shrink-0 bg-orange-100 text-orange-700">{t.manager.onLeave}</Badge>}
                        {!isCurrent && !isMemberOnLeave(member) && member.status === "active" && idx === nextAvailableIdx && <Badge variant="info" className="text-xs flex-shrink-0">{t.manager.nextLabel}</Badge>}
                        {!isCurrent && member.status === "on_leave" && <Badge variant="secondary" className="text-xs flex-shrink-0 bg-orange-100 text-orange-700">{t.manager.onBreak}</Badge>}
                        {isAdminOrOwner && !isCurrent && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 flex-shrink-0"
                            onClick={() => { setSelectedMemberId(member.id); }}
                          >
                            {t.manager.assignBtn}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history-tab">
          {pastManagers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t.manager.noHistory}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t.manager.managerHistory}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pastManagers.map((record) => {
                  const name = getManagerName(record);
                  const avatar = getManagerAvatar(record);
                  return (
                    <div key={record.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={avatar ?? undefined} />
                        <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDatePref(record.start_date)}
                          {record.end_date && ` — ${formatDatePref(record.end_date)}`}
                        </p>
                        {record.handover_note && (
                          <p className="text-xs text-muted-foreground italic mt-0.5">"{record.handover_note}"</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">{t.manager.completed}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="current">
          {/* Current Manager */}
          <Card className="border-2 border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <Crown className="h-4 w-4" />
                {t.manager.currentManager}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <CardLoader />
              ) : !currentManager ? (
                <EmptyState
                  icon={<UserCog className="h-7 w-7" />}
                  title={t.manager.noManager}
                  description={t.manager.assignManager}
                />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-amber-300">
                      <AvatarImage src={getManagerAvatar(currentManager) ?? undefined} />
                      <AvatarFallback className="text-xl bg-amber-100 text-amber-700">
                        {getInitials(getManagerName(currentManager))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-400 flex items-center justify-center">
                      <Crown className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold">{getManagerName(currentManager)}</p>
                    <Badge variant="warning" className="mt-1">{t.manager.currentManager}</Badge>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{t.manager.startDate} {formatDatePref(currentManager.start_date)}</span>
                    </div>
                    {currentManager.handover_note && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{currentManager.handover_note}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assign new manager — admin/owner only */}
          {isAdminOrOwner ? (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {t.manager.assignTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!members || members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t.manager.noMembers}</p>
                ) : (
                  members.filter((m) => m.role !== "owner").map((member) => {
                    const userProfile = member.user as { full_name?: string; avatar_url?: string } | null;
                    const isCurrentManager = member.role === "manager";
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/40 transition-colors"
                      >
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={userProfile?.avatar_url} />
                          <AvatarFallback className="text-sm">
                            {getInitials(userProfile?.full_name ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{userProfile?.full_name ?? t.deposits.memberLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {getRoleDisplayNameBn(member.role as MemberRole)}
                          </p>
                        </div>
                        {isCurrentManager ? (
                          <Badge variant="warning" className="gap-1">
                            <Crown className="h-3 w-3" />
                            {t.manager.currentLabel}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedMemberId(member.id)}
                          >
                            {t.manager.assignBtn}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed mt-4">
              <CardContent className="py-6 text-center">
                <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t.manager.adminOnlyNote}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign confirmation dialog */}
      <Dialog open={!!selectedMemberId} onOpenChange={(v) => { if (!v) { setSelectedMemberId(null); reset(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.manager.assignTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onConfirmAssign)} className="space-y-4 pt-1">
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="font-semibold">{selectedProfile?.full_name ?? t.deposits.memberLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.manager.assignConfirmNote}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{t.manager.handoverNote}</Label>
              <Input
                placeholder={t.manager.handoverPlaceholder}
                {...register("note")}
              />
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setSelectedMemberId(null); reset(); }}>
                {t.manager.cancelBtn}
              </Button>
              <Button type="submit" className="flex-1" disabled={assignManager.isPending}>
                {assignManager.isPending ? t.manager.assigningBtn : t.manager.confirmAssignBtn}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
