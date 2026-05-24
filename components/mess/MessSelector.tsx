"use client";
import { useState } from "react";
import { Plus, LogIn, ArrowRight } from "lucide-react";
import { useUserMesses, useCreateMess, useJoinMess } from "@/lib/hooks/use-mess";
import { useMessStore } from "@/lib/stores/mess.store";
import { useAuth } from "@/lib/hooks/use-auth";
import { useLanguage } from "@/lib/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatMonth } from "@/lib/utils/date";

export function MessSelector() {
  const { t } = useLanguage();
  const { data: messes, isLoading } = useUserMesses();
  const { setActiveMess } = useMessStore();
  const { user, signOut } = useAuth();
  const createMess = useCreateMess();
  const joinMess = useJoinMess();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", mess_type: "student" as const, address: "" });
  const [joinCode, setJoinCode] = useState("");

  if (isLoading) return <PageLoader />;

  const handleSelectMess = (mess: NonNullable<typeof messes>[number]) => {
    if (!mess.mess) return;
    const m = mess.mess as { id: string; name: string; avatar_url?: string | null; is_month_closed?: boolean; settings?: Record<string, unknown> | null };
    setActiveMess({
      id: m.id,
      name: m.name,
      role: mess.role,
      avatar_url: m.avatar_url ?? null,
      is_month_closed: m.is_month_closed ?? false,
      settings: m.settings as unknown as import("@/lib/types/mess.types").MessSettings ?? null,
    });
  };

  const handleCreate = async () => {
    await createMess.mutateAsync(createForm);
    setCreateOpen(false);
  };

  const handleJoin = async () => {
    await joinMess.mutateAsync(joinCode);
    setJoinOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-2xl mb-4 shadow-lg">
            M
          </div>
          <h1 className="text-3xl font-bold text-foreground">MessPilot</h1>
          <p className="text-muted-foreground mt-2">
            {t.messSelector.welcome.replace("friend", user?.user_metadata?.full_name ?? t.messSelector.welcome.split(",")[1]?.trim() ?? "")}
          </p>
        </div>

        {/* Existing messes */}
        {messes && messes.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              {t.messSelector.yourMesses}
            </h2>
            <div className="space-y-3">
              {messes.map((item: NonNullable<typeof messes>[number]) => {
                const mess = item.mess as { id: string; name: string; mess_type: string; current_month: string; avatar_url?: string | null } | null;
                if (!mess) return null;
                const typeKey = mess.mess_type === "job_holder" ? "job" : mess.mess_type as keyof typeof t.mess.types;
                return (
                  <Card
                    key={mess.id}
                    className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-2 hover:border-primary/30"
                    onClick={() => handleSelectMess(item)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg flex-shrink-0">
                        {mess.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{mess.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {t.mess.types[typeKey] ?? mess.mess_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatMonth(mess.current_month)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={item.role === "owner" ? "default" : item.role === "manager" ? "success" : "outline"}
                          className="text-xs"
                        >
                          {item.role === "owner"
                            ? t.gamification.roles.owner
                            : item.role === "manager"
                            ? t.gamification.roles.manager
                            : t.gamification.roles.member}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-dashed border-2">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.messSelector.createNew}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.messSelector.createSubtitle}</p>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.messSelector.createTitle}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>{t.messSelector.messName}</Label>
                  <Input
                    placeholder={t.messSelector.messNamePlaceholder}
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.messSelector.messType}</Label>
                  <Select
                    value={createForm.mess_type}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, mess_type: v as "student" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">{t.mess.types.student}</SelectItem>
                      <SelectItem value="job_holder">{t.mess.types.job}</SelectItem>
                      <SelectItem value="family">{t.mess.types.family}</SelectItem>
                      <SelectItem value="hostel">{t.mess.types.hostel}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.messSelector.addressOptional}</Label>
                  <Input
                    placeholder={t.messSelector.addressPlaceholder}
                    value={createForm.address}
                    onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  loading={createMess.isPending}
                  disabled={!createForm.name}
                >
                  {t.messSelector.createBtn}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-dashed border-2">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                    <LogIn className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.messSelector.joinMess}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.messSelector.joinSubtitle}</p>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.messSelector.joinTitle}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>{t.messSelector.inviteCode}</Label>
                  <Input
                    placeholder={t.messSelector.inviteCodePlaceholder}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="text-center text-lg font-mono tracking-widest"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleJoin}
                  loading={joinMess.isPending}
                  disabled={joinCode.length < 6}
                >
                  {t.messSelector.joinBtn}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-6 text-center">
          <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground">
            {t.messSelector.logout}
          </button>
        </div>
      </div>
    </div>
  );
}
