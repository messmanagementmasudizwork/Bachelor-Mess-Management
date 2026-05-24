"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, User, Phone, Briefcase, Droplets, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";
import { getRoleDisplayNameBn } from "@/lib/utils/permissions";
import { getRequiredClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/hooks/use-language";
import { toast } from "sonner";
import type { MemberRole } from "@/lib/types";

const profileSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().regex(/^(01[3-9]\d{8})?$/).optional().or(z.literal("")),
  profession: z.string().max(100).optional().or(z.literal("")),
  blood_group: z.string().optional().or(z.literal("")),
  emergency_contact: z.string().max(15).optional().or(z.literal("")),
});

type ProfileForm = z.infer<typeof profileSchema>;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface MemberProfile {
  id: string;
  user_id: string;
  role: MemberRole;
  status: string;
  seat_number?: number | null;
  joining_date?: string;
  meal_default_breakfast?: boolean;
  meal_default_lunch?: boolean;
  meal_default_dinner?: boolean;
  user: {
    id?: string;
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    profession?: string | null;
    blood_group?: string | null;
    emergency_contact?: string | null;
  } | null;
}

interface Props {
  member: MemberProfile | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  onUpdated?: () => void;
}

export function MemberProfileDialog({ member, open, onClose, canEdit, onUpdated }: Props) {
  const { t } = useLanguage();
  const s = t.settings;
  const m = t.members;

  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const userProfile = member?.user;

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: userProfile?.full_name ?? "",
      phone: userProfile?.phone ?? "",
      profession: userProfile?.profession ?? "",
      blood_group: userProfile?.blood_group ?? "",
      emergency_contact: userProfile?.emergency_contact ?? "",
    },
  });

  const onSave = async (data: ProfileForm) => {
    if (!member?.user_id) return;
    setSaving(true);
    try {
      const supabase = getRequiredClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
          profession: data.profession || null,
          blood_group: data.blood_group || null,
          emergency_contact: data.emergency_contact || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.user_id);

      if (error) throw new Error(error.message);
      toast.success(s.profileSaved);
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{m.profileTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userProfile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-lg font-bold">
                {getInitials(userProfile?.full_name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-base">{userProfile?.full_name ?? m.noName}</p>
              <p className="text-xs text-muted-foreground">{userProfile?.email ?? ""}</p>
              <Badge variant="secondary" className="mt-1 text-xs">
                {getRoleDisplayNameBn(member.role)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/50 rounded-lg p-2.5">
              <p className="text-muted-foreground mb-0.5">{m.seatNoLabel}</p>
              <p className="font-medium">{member.seat_number ?? "—"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5">
              <p className="text-muted-foreground mb-0.5">{m.joinDateLabel}</p>
              <p className="font-medium">
                {member.joining_date
                  ? new Date(member.joining_date).toLocaleDateString("bn-BD")
                  : "—"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 col-span-2">
              <p className="text-muted-foreground mb-0.5">{m.defaultMealsLabel}</p>
              <div className="flex gap-1.5">
                {[
                  { label: t.meals.breakfast, active: member.meal_default_breakfast },
                  { label: t.meals.lunch, active: member.meal_default_lunch },
                  { label: t.meals.dinner, active: member.meal_default_dinner },
                ].map(({ label, active }) => (
                  <span
                    key={label}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {!editing ? (
            <div className="space-y-3">
              {[
                { icon: Phone, label: s.phone, value: userProfile?.phone },
                { icon: Briefcase, label: s.profession, value: userProfile?.profession },
                { icon: Droplets, label: s.bloodGroup, value: userProfile?.blood_group },
                { icon: AlertCircle, label: s.emergencyContact, value: userProfile?.emergency_contact },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium truncate">{value || "—"}</p>
                  </div>
                </div>
              ))}

              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setEditing(true)}
                >
                  <User className="h-4 w-4 mr-2" />
                  {m.editInfo}
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{s.fullName}</Label>
                <Input {...form.register("full_name")} placeholder={s.namePlaceholder} className="h-9" />
                {form.formState.errors.full_name && (
                  <p className="text-xs text-destructive">{s.nameMinLength}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{s.phone}</Label>
                <Input {...form.register("phone")} placeholder={t.auth.phonePlaceholder} className="h-9" />
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{s.profession}</Label>
                <Input {...form.register("profession")} placeholder={s.professionPlaceholder} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{s.bloodGroup}</Label>
                <Select
                  value={form.watch("blood_group") ?? ""}
                  onValueChange={(v) => form.setValue("blood_group", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={s.selectBloodGroup} />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{s.emergencyContact}</Label>
                <Input {...form.register("emergency_contact")} placeholder={t.auth.phonePlaceholder} className="h-9" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving} className="flex-1 gap-1">
                  <Save className="h-3.5 w-3.5" />
                  {saving ? t.saving : t.save}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)} className="flex-1">
                  {t.cancel}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
