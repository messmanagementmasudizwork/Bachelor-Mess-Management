import { getRequiredClient } from "@/lib/supabase/client";
import type { LoginInput, RegisterInput } from "@/lib/validations/auth.schema";

function getSupabase() {
  const supabase = getRequiredClient();
  if (!supabase) {
    throw new Error("Supabase connection missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local");
  }
  return supabase;
}

export const authService = {
  async signIn({ email, password }: LoginInput) {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (data.user) {
      const { auditService } = await import("./audit.service");
      auditService.logLoginEvent(data.user.id).catch(() => {});
    }
    return data;
  },

  async signUp({ email, password, full_name, phone }: RegisterInput) {
    const supabase = getSupabase();
    const appUrl = typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5000");
    const emailRedirectTo = `${appUrl}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, phone: phone || null },
        emailRedirectTo,
      },
    });

    if (error) {
      const detailedError = new Error(error.message) as Error & { status?: number; code?: unknown };
      detailedError.status = error.status;
      detailedError.code   = (error as unknown as Record<string,unknown>).code;
      throw detailedError;
    }

    const identities = data.user?.identities?.length ?? 0;

    // identities === 0 means user already exists but is unconfirmed.
    // Supabase returns fake success without sending email (security design).
    // We must explicitly resend the confirmation OTP.
    if (identities === 0 && !data.session && data.user) {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo },
      });
      if (resendError) {
        const err = new Error(resendError.message) as Error & { status?: number; code?: unknown };
        err.status = resendError.status;
        err.code   = (resendError as unknown as Record<string,unknown>).code;
        throw err;
      }
    }

    return data;
  },

  async verifyOtp(email: string, token: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async signOut() {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async resetPassword(email: string) {
    const supabase = getSupabase();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?type=recovery`,
    });
    if (error) throw new Error(error.message);
  },

  async updatePassword(password: string) {
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },

  async getSession() {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session;
  },

  async getUser() {
    const supabase = getRequiredClient();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  },

  async getProfile(userId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone, avatar_url, profession, blood_group, emergency_contact, preferred_language, ui_theme, currency_symbol, date_format, time_format")
      .eq("id", userId)
      .single();
    if (error) return null;
    return data;
  },

  async updateProfile(updates: { full_name?: string; phone?: string; avatar_url?: string; profession?: string; blood_group?: string; emergency_contact?: string }) {
    const supabase = getSupabase();
    const user = await this.getUser();
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
  },

  async updateUiPreferences(userId: string, prefs: { ui_theme?: "light" | "dark" | "system"; currency_symbol?: string; date_format?: string; time_format?: "12h" | "24h" }) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("profiles")
      .update({ ...prefs, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  },

  async getNotificationPreferences(userId: string): Promise<Record<string, boolean>> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", userId)
      .single();
    if (error || !data) {
      return {
        expense_added: true,
        deposit_confirmed: true,
        meal_reminder: true,
        due_reminder: true,
        manager_changed: true,
        low_balance: true,
      };
    }
    return (data.notification_preferences as Record<string, boolean>) ?? {};
  },

  async updateNotificationPreferences(userId: string, prefs: Record<string, boolean>) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("profiles")
      .update({ notification_preferences: prefs, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  },
};
