"use client";
import { useState } from "react";
import { Trash2, Shield, CalendarOff, Armchair } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useUpdateMemberRole,
  useRemoveMember,
  useSetMemberLeave,
  useUpdateSeatNumber,
} from "@/lib/hooks/use-members";
import { useLanguage } from "@/lib/hooks/use-language";
import { getRoleDisplayNameBn } from "@/lib/utils/permissions";
import { getTodayString } from "@/lib/utils/date";
import type { MemberRole } from "@/lib/types";

const ASSIGNABLE_ROLES: MemberRole[] = ["admin", "assistant_manager", "member", "guest"];

export type MemberAction = "role" | "remove" | "leave" | "seat";

interface TargetMember {
  id: string;
  name: string;
  role: MemberRole;
  action: MemberAction;
  currentSeat?: number | null;
}

interface Props {
  member: TargetMember | null;
  onClose: () => void;
}

export function MemberActionDialog({ member, onClose }: Props) {
  const { t } = useLanguage();
  const d = t.members.dialog;

  const [selectedRole, setSelectedRole] = useState<MemberRole>("member");
  const [leaveStart, setLeaveStart] = useState(getTodayString());
  const [leaveEnd, setLeaveEnd] = useState("");
  const [seatNumber, setSeatNumber] = useState(member?.currentSeat?.toString() ?? "");
  const [removeReason, setRemoveReason] = useState("");

  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const setLeave = useSetMemberLeave();
  const updateSeat = useUpdateSeatNumber();

  const handleRoleChange = async () => {
    if (!member) return;
    await updateRole.mutateAsync({ memberId: member.id, role: selectedRole });
    onClose();
  };

  const handleRemove = async () => {
    if (!member) return;
    await removeMember.mutateAsync({ memberId: member.id, reason: removeReason.trim() || undefined });
    onClose();
  };

  const handleLeave = async () => {
    if (!member || !leaveStart || !leaveEnd) return;
    await setLeave.mutateAsync({ memberId: member.id, leaveStart, leaveEnd });
    onClose();
  };

  const handleSeat = async () => {
    if (!member) return;
    const parsed = seatNumber.trim() ? parseInt(seatNumber.trim(), 10) : null;
    await updateSeat.mutateAsync({ memberId: member.id, seatNumber: parsed });
    onClose();
  };

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        {member?.action === "role" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {d.changeRole}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{member.name}</span>
                {" — "}{d.changeRole}
              </p>
              <Select defaultValue={member.role} onValueChange={(v) => setSelectedRole(v as MemberRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{getRoleDisplayNameBn(role)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={handleRoleChange} loading={updateRole.isPending}>
                {d.saveRole}
              </Button>
            </div>
          </>
        )}

        {member?.action === "remove" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                {d.removeTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{member.name}</span>
                {" — "}{d.removeConfirm}
              </p>
              <div className="space-y-1.5">
                <Label>{d.reasonOptional}</Label>
                <Input
                  placeholder={d.reasonPlaceholder}
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{d.cannotUndo}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>{t.cancel}</Button>
                <Button variant="destructive" className="flex-1" onClick={handleRemove} loading={removeMember.isPending}>
                  {d.removeBtn}
                </Button>
              </div>
            </div>
          </>
        )}

        {member?.action === "leave" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarOff className="h-4 w-4" />
                {d.setLeaveTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{member.name}</span>
                {" — "}{d.setLeaveDates}
              </p>
              <div className="space-y-2">
                <Label>{d.leaveStart}</Label>
                <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{d.leaveEnd}</Label>
                <Input type="date" value={leaveEnd} min={leaveStart} onChange={(e) => setLeaveEnd(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>{t.cancel}</Button>
                <Button
                  className="flex-1"
                  onClick={handleLeave}
                  disabled={!leaveStart || !leaveEnd}
                  loading={setLeave.isPending}
                >
                  {d.setLeaveTitle}
                </Button>
              </div>
            </div>
          </>
        )}

        {member?.action === "seat" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Armchair className="h-4 w-4" />
                {d.seatNumberTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{member.name}</span>
                {" — "}{d.seatNumberFor}
              </p>
              <div className="space-y-2">
                <Label>{d.seatNumberTitle} ({d.seatNumberPlaceholder})</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder={d.seatExample}
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onClose}>{t.cancel}</Button>
                <Button className="flex-1" onClick={handleSeat} loading={updateSeat.isPending}>
                  {t.save}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
