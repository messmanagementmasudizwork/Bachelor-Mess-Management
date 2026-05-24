"use client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useMessStore } from "@/lib/stores/mess.store";
import { authService } from "@/lib/services/auth.service";
import { messService } from "@/lib/services/mess.service";
import type { LoginInput, RegisterInput } from "@/lib/validations/auth.schema";

export function useAuth() {
  const {
    user,
    session,
    isLoading,
    isInitialized,
    setUser,
    setSession,
    setLoading,
    setInitialized,
    clear,
  } = useAuthStore();
  const router = useRouter();

  const signIn = async (input: LoginInput, redirectTo = "/dashboard") => {
    setLoading(true);
    try {
      const data = await authService.signIn(input);
      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        setInitialized(true);

        // Pre-select mess during login so dashboard shows immediately without loading
        const { activeMess, setActiveMess } = useMessStore.getState();
        if (!activeMess) {
          try {
            const messes = await messService.getUserMesses(data.user.id);
            if (messes && messes.length > 0) {
              const first = messes[0];
              const mess = first?.mess as { id: string; name: string; avatar_url?: string | null } | null;
              if (mess) {
                setActiveMess({
                  id: mess.id,
                  name: mess.name,
                  role: first.role,
                  avatar_url: mess.avatar_url ?? null,
                });
              }
            }
          } catch {
            // If mess fetch fails, dashboard will handle it gracefully
          }
        }

        setLoading(false);
      }
      router.push(redirectTo);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signUp = async (input: RegisterInput) => {
    setLoading(true);
    try {
      await authService.signUp(input);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await authService.signOut();
    useMessStore.getState().clearMess();
    clear();
    router.push("/login");
  };

  return {
    user,
    session,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  };
}
