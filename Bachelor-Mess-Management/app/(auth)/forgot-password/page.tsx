"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { createForgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth.schema";
import { authService } from "@/lib/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/lib/hooks/use-language";

export default function ForgotPasswordPage() {
  const { t, lang } = useLanguage();
  const forgotPasswordSchema = useMemo(() => createForgotPasswordSchema(t.validation), [lang]);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await authService.resetPassword(data.email);
      setIsSuccess(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.error);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl mb-4 shadow-lg">
          M
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t.appName}</h1>
      </div>

      <Card className="shadow-xl border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">{t.auth.forgotPasswordTitle}</CardTitle>
          <CardDescription>{t.auth.forgotPasswordSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t.auth.resetLinkSent}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t.auth.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.auth.emailPlaceholder}
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                  {...register("email")}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
                {t.auth.sendResetLink}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link href="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" />
              {t.auth.backToLogin}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
