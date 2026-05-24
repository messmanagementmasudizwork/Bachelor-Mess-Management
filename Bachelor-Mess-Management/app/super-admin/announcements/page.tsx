"use client";
import { useState } from "react";
import { useAnnouncements, useSendAnnouncement } from "@/lib/hooks/use-super-admin";
import { useLanguage } from "@/lib/hooks/use-language";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Megaphone, Send, Globe, Building2, Users } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import type { PlatformAnnouncement } from "@/lib/types/super-admin.types";

function AnnouncementCard({ ann }: { ann: PlatformAnnouncement }) {
  const { t } = useLanguage();

  const TARGET_LABELS = {
    all:  { label: t.superAdmin.announcements.targets.all,  icon: Globe,      color: "bg-blue-100 text-blue-700"   },
    mess: { label: t.superAdmin.announcements.targets.mess, icon: Building2,  color: "bg-orange-100 text-orange-700" },
    role: { label: t.superAdmin.announcements.targets.role, icon: Users,      color: "bg-purple-100 text-purple-700" },
  };

  const target = TARGET_LABELS[ann.target_type as keyof typeof TARGET_LABELS] ?? TARGET_LABELS.all;
  const Icon = target.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800">{ann.title}</p>
            <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{ann.body}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={target.color + " border-0 gap-1 text-xs"}>
                <Icon className="w-3 h-3" />
                {target.label}
              </Badge>
              {ann.sender && (
                <span className="text-xs text-slate-400">
                  {t.superAdmin.announcements.sentBy} {ann.sender.full_name}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 shrink-0">
          {format(new Date(ann.sent_at), "dd MMM, HH:mm", { locale: bn })}
        </p>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { t } = useLanguage();
  const { data: announcements, isLoading } = useAnnouncements();
  const sendAnnouncement = useSendAnnouncement();

  const [title, setTitle]           = useState("");
  const [body, setBody]             = useState("");
  const [targetType, setTargetType] = useState<"all" | "mess" | "role">("all");
  const [targetId, setTargetId]     = useState("");
  const [targetRole, setTargetRole] = useState("");

  const canSend = title.trim() && body.trim();

  const handleSend = () => {
    sendAnnouncement.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        target_type: targetType,
        target_id:   targetType === "mess" ? targetId || undefined : undefined,
        target_role: targetType === "role" ? targetRole || undefined : undefined,
      },
      {
        onSuccess: () => {
          setTitle(""); setBody("");
          setTargetType("all"); setTargetId(""); setTargetRole("");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.superAdmin.announcements.title}</h1>
          <p className="text-sm text-slate-500">{t.superAdmin.announcements.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t.superAdmin.announcements.newAnnouncement}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t.superAdmin.announcements.titleLabel}</label>
              <Input
                placeholder={t.superAdmin.announcements.titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t.superAdmin.announcements.messageLabel}</label>
              <Textarea
                placeholder={t.superAdmin.announcements.messagePlaceholder}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t.superAdmin.announcements.targetLabel}</label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as typeof targetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.superAdmin.announcements.all}</SelectItem>
                  <SelectItem value="mess">{t.superAdmin.announcements.specificMess}</SelectItem>
                  <SelectItem value="role">{t.superAdmin.announcements.specificRole}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {targetType === "mess" && (
              <Input
                placeholder={t.superAdmin.announcements.messId}
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              />
            )}
            {targetType === "role" && (
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue placeholder={t.superAdmin.announcements.roleSelect} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t.superAdmin.announcements.roles.owner}</SelectItem>
                  <SelectItem value="admin">{t.superAdmin.announcements.roles.admin}</SelectItem>
                  <SelectItem value="manager">{t.superAdmin.announcements.roles.manager}</SelectItem>
                  <SelectItem value="member">{t.superAdmin.announcements.roles.member}</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              className="w-full gap-2 bg-orange-500 hover:bg-orange-600"
              disabled={!canSend || sendAnnouncement.isPending}
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
              {t.superAdmin.announcements.sendBtn}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-base font-semibold text-slate-700">{t.superAdmin.announcements.history}</h2>
          {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
          {!isLoading && (announcements ?? []).length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{t.superAdmin.announcements.noHistory}</p>
            </div>
          )}
          {!isLoading && (announcements ?? []).map((ann) => (
            <AnnouncementCard key={ann.id} ann={ann} />
          ))}
        </div>
      </div>
    </div>
  );
}
