"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, ShieldAlert, Timer } from "lucide-react";
import { createLoginSchema, type LoginInput } from "@/lib/validations/auth.schema";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/lib/hooks/use-language";
import { useMemo } from "react";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000;
const STORAGE_KEY = "messpilot_login_attempts";

interface LoginAttemptState {
  count: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

function getAttemptState(): LoginAttemptState {
  if (typeof window === "undefined") return { count: 0, lockedUntil: null, lastAttempt: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, lockedUntil: null, lastAttempt: 0 };
    return JSON.parse(raw) as LoginAttemptState;
  } catch {
    return { count: 0, lockedUntil: null, lastAttempt: 0 };
  }
}

function saveAttemptState(state: LoginAttemptState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearAttemptState() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function LoginPage() {
  const { signIn, isLoading } = useAuth();
  const { t, lang } = useLanguage();
  const loginSchema = useMemo(() => createLoginSchema(t.validation), [lang]);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error");
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const ERROR_MESSAGES: Record<string, string> = {
    confirmation_failed: t.auth.verificationFailed,
    supabase_not_configured: t.auth.supabaseNotConfigured,
  };

  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] ?? t.error : null;

  const [attemptState, setAttemptState] = useState<LoginAttemptState>({ count: 0, lockedUntil: null, lastAttempt: 0 });
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const state = getAttemptState();
    if (state.lockedUntil && state.lockedUntil < Date.now()) {
      clearAttemptState();
      setAttemptState({ count: 0, lockedUntil: null, lastAttempt: 0 });
    } else {
      setAttemptState(state);
    }
  }, []);

  useEffect(() => {
    if (!attemptState.lockedUntil) { setCountdown(0); return; }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((attemptState.lockedUntil! - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        clearAttemptState();
        setAttemptState({ count: 0, lockedUntil: null, lastAttempt: 0 });
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [attemptState.lockedUntil]);

  useEffect(() => {
    if (errorMessage) toast.error(errorMessage);
  }, [errorMessage]);

  const isLocked = !!attemptState.lockedUntil && countdown > 0;
  const remainingAttempts = MAX_ATTEMPTS - attemptState.count;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    if (isLocked) return;
    try {
      await signIn(data, redirectTo);
      clearAttemptState();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t.auth.loginFailed;
      const newCount = attemptState.count + 1;
      const locked = newCount >= MAX_ATTEMPTS;
      const newState: LoginAttemptState = {
        count: newCount,
        lockedUntil: locked ? Date.now() + LOCKOUT_DURATION_MS : null,
        lastAttempt: Date.now(),
      };
      saveAttemptState(newState);
      setAttemptState(newState);
      if (locked) {
        toast.error(t.auth.accountLocked);
      } else {
        toast.error(msg);
      }
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl mb-4 shadow-lg">
          M
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t.appName}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.appTagline}</p>
      </div>

      <Card className="shadow-xl border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl">{t.auth.loginTitle}</CardTitle>
          <CardDescription>{t.auth.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLocked && (
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{t.auth.accountLocked}</p>
                <p className="text-xs mt-0.5">{t.auth.accountLockedMsg}</p>
                <div className="flex items-center gap-1.5 mt-2 font-mono text-base font-bold">
                  <Timer className="h-4 w-4" />
                  {formatCountdown(countdown)}
                </div>
              </div>
            </div>
          )}

          {!isLocked && attemptState.count > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t.auth.failedAttempts.replace("{count}", String(attemptState.count)).replace("{remaining}", String(remainingAttempts))}</span>
            </div>
          )}

          {errorMessage && !isLocked && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t.auth.emailPlaceholder}
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                disabled={isLocked}
                {...register("email")}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t.auth.password}</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  {t.auth.forgotPassword}
                </Link>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer" disabled={isLocked}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                disabled={isLocked}
                {...register("password")}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting || isLoading} disabled={isLocked}>
              {isLocked ? `${t.auth.accountLocked} — ${formatCountdown(countdown)}` : t.auth.loginButton}
              {!isLocked && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t.auth.noAccount}{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">
                {t.register}
              </Link>
            </p>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">{t.auth.supabaseConfigureNote}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
