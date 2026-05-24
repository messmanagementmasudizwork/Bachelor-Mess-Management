"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QrCode, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { messService } from "@/lib/services/mess.service";
import { useAuth } from "@/lib/hooks/use-auth";
import { toast } from "sonner";
import { useLanguage } from "@/lib/hooks/use-language";

export default function JoinPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const code = searchParams.get("code")?.toUpperCase() ?? "";

  useEffect(() => {
    if (!authLoading && !user && code) {
      router.push(`/login?redirectTo=/join?code=${code}`);
    }
  }, [authLoading, user, code, router]);

  const handleJoin = async () => {
    if (!user || !code) return;
    setJoining(true);
    try {
      await messService.joinMess(code, user.id);
      setJoined(true);
      toast.success(t.join.joinedToast);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setJoining(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-2xl mb-4 shadow-lg">
            M
          </div>
          <h1 className="text-3xl font-bold">MessPilot</h1>
        </div>

        <Card>
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{t.join.joinBtn}</CardTitle>
            <CardDescription>
              {code ? `${t.join.inviteCode} ${code}` : t.join.noCode}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {code ? (
              <>
                <div className="bg-muted rounded-xl py-4 text-center">
                  <p className="font-mono text-3xl font-bold tracking-widest text-primary">{code}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.join.inviteCodeLabel}</p>
                </div>

                {user ? (
                  <Button
                    className="w-full gap-2"
                    onClick={handleJoin}
                    disabled={joining || joined}
                  >
                    {joined ? (
                      t.join.joined
                    ) : joining ? (
                      t.join.joining
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        {t.join.joinBtn}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2"
                    onClick={() => router.push(`/login?redirectTo=/join?code=${code}`)}
                  >
                    <LogIn className="h-4 w-4" />
                    {t.join.loginToJoin}
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">{t.join.noInviteCode}</p>
                <Button variant="link" onClick={() => router.push("/")} className="mt-2">
                  {t.join.returnHome}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
