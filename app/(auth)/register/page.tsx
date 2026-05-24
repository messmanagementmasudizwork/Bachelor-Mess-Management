"use client";
import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { createRegisterSchema, type RegisterInput } from "@/lib/validations/auth.schema";
import { authService } from "@/lib/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/lib/hooks/use-language";

export default function RegisterPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"register" | "otp">("register");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [debugError, setDebugError] = useState<{message: string; status?: number; code?: unknown} | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const registerSchema = useMemo(() => createRegisterSchema(t.validation), [lang]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      const result = await authService.signUp(data);

      if (result.session) {
        toast.success(t.auth.registerSuccess);
        router.push("/");
        return;
      }

      if (result.user?.email_confirmed_at) {
        toast.error(t.auth.emailAlreadyExists);
        router.push("/login");
        return;
      }

      setRegisteredEmail(data.email);
      setStep("otp");
      toast.success(t.auth.otpSent);
    } catch (error) {
      const err = error as Error & { status?: number; code?: unknown };
      const msg = err.message ?? t.auth.registerFailed;

      // Capture full debug info
      setDebugError({ message: msg, status: err.status, code: err.code });
      console.error("[REGISTER] Full error:", { message: msg, status: err.status, code: err.code });

      if (
        msg.toLowerCase().includes("sending confirmation email") ||
        msg.toLowerCase().includes("smtp") ||
        msg.toLowerCase().includes("email signups are disabled") ||
        (err.code as string) === "email_provider_disabled" ||
        (err.code as string) === "unexpected_failure"
      ) {
        setEmailError(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const token = otp.join("");
    if (token.length !== 6) {
      toast.error(t.auth.otpSixDigits);
      return;
    }
    setIsVerifying(true);
    try {
      await authService.verifyOtp(registeredEmail, token);
      toast.success(t.auth.verifySuccess);
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.auth.otpInvalid);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) throw new Error(t.auth.supabaseNotConfigured);
      const appUrl = window.location.origin;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: registeredEmail,
        options: { emailRedirectTo: `${appUrl}/auth/callback` },
      });
      if (error) throw new Error(error.message);
      toast.success(t.auth.otpResent);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.auth.otpResendFailed);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl mb-4 shadow-lg">
            M
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t.appName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.auth.emailVerification}</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 mx-auto mb-2">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">{t.auth.enterVerificationCode}</CardTitle>
            <CardDescription>
              <span className="font-medium text-foreground">{registeredEmail}</span>
              <br />{t.auth.codeSentTo}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-medium">{t.auth.emailNotReceived}</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs opacity-90">
                <li>{t.auth.checkSpam}</li>
                <li>{t.auth.codeDelay}</li>
                <li>{t.auth.checkEmail}</li>
              </ul>
            </div>

            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { otpRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:border-primary transition-colors bg-background"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <Button onClick={handleVerifyOtp} className="w-full" size="lg" disabled={isVerifying || otp.join("").length !== 6}>
              {isVerifying ? t.auth.verifying : t.auth.verify}
              {!isVerifying && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">{t.auth.noCode}</p>
              <button onClick={handleResendOtp} disabled={isLoading} className="text-sm text-primary font-medium hover:underline disabled:opacity-50">
                {isLoading ? t.sending : t.auth.resend}
              </button>
            </div>

            <div className="text-center">
              <button onClick={() => { setStep("register"); setOtp(["", "", "", "", "", ""]); }} className="text-sm text-muted-foreground hover:text-foreground">
                ← {t.back}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl mb-4 shadow-lg">
          M
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t.appName}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.auth.createAccount}</p>
      </div>

      <Card className="shadow-xl border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl">{t.auth.registerTitle}</CardTitle>
          <CardDescription>{t.auth.registerSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {(emailError || debugError) && (
            <div className="mb-4 rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/20 p-4 space-y-3">
              <div className="flex items-start gap-2 text-orange-700 dark:text-orange-400">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{t.auth.smtpNotConfigured}</p>
                  <p className="text-xs mt-0.5 opacity-80">{t.auth.smtpNotConfiguredDesc}</p>
                </div>
              </div>

              <div className="rounded-lg bg-white dark:bg-black/20 border border-orange-200 dark:border-orange-800 p-3 space-y-2 text-xs">
                <p className="font-semibold text-foreground">✅ Solution 1 — Development (Easy):</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Open <strong className="text-foreground">Supabase Dashboard</strong></li>
                  <li>Authentication → <strong className="text-foreground">Providers</strong> → Email</li>
                  <li>Turn off <strong className="text-orange-600">"Confirm email"</strong> toggle (OFF)</li>
                  <li>Save → Registration will work immediately</li>
                </ol>
              </div>

              <div className="rounded-lg bg-white dark:bg-black/20 border border-orange-200 dark:border-orange-800 p-3 space-y-2 text-xs">
                <p className="font-semibold text-foreground">✅ Solution 2 — Production (SMTP):</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Supabase → Project Settings → <strong className="text-foreground">Auth</strong></li>
                  <li>Go to SMTP Settings section</li>
                  <li>Enter Resend / Sendgrid / Gmail SMTP credentials</li>
                </ol>
              </div>

              {debugError && (
                <div className="rounded-lg bg-black/5 dark:bg-white/5 border p-2 font-mono text-xs">
                  <p className="text-muted-foreground font-sans text-xs mb-1">Supabase error:</p>
                  <p className="text-destructive">{debugError.message}</p>
                  {!!debugError.code && <p className="text-orange-600">code: {String(debugError.code)}</p>}
                </div>
              )}

              <button type="button" onClick={() => { setEmailError(false); setDebugError(null); }} className="text-xs text-primary font-medium hover:underline">
                ✕ {t.close} / {t.auth.tryAgain}
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">{t.auth.fullName}</Label>
              <Input id="full_name" placeholder={t.auth.namePlaceholder} leftIcon={<User className="h-4 w-4" />} error={errors.full_name?.message} {...register("full_name")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input id="email" type="email" placeholder={t.auth.emailPlaceholder} leftIcon={<Mail className="h-4 w-4" />} error={errors.email?.message} {...register("email")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t.auth.phone}</Label>
              <Input id="phone" type="tel" placeholder="01XXXXXXXXX" leftIcon={<Phone className="h-4 w-4" />} error={errors.phone?.message} {...register("phone")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t.auth.passwordMinChars}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={<button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
                error={errors.password?.message}
                {...register("password")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">{t.auth.confirmPassword}</Label>
              <Input id="confirm_password" type="password" placeholder={t.auth.confirmPasswordPlaceholder} leftIcon={<Lock className="h-4 w-4" />} error={errors.confirm_password?.message} {...register("confirm_password")} />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || isLoading}>
              {isSubmitting || isLoading ? t.auth.pleaseWait : t.auth.createAccountBtn}
              {!isSubmitting && !isLoading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t.auth.alreadyHaveAccount}{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                {t.auth.loginLink}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
