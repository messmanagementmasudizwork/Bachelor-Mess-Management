"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useMessStore } from "@/lib/stores/mess.store";
import { messService } from "@/lib/services/mess.service";
import { useQueryClient } from "@tanstack/react-query";

function restoreMessInBackground(userId: string) {
  const { activeMess, setActiveMess } = useMessStore.getState();
  if (activeMess) return;
  void messService
    .getUserMesses(userId)
    .then((messes) => {
      if (!messes || messes.length === 0) return;
      const first = messes[0];
      const mess = first?.mess as { id: string; name: string; avatar_url?: string | null; is_month_closed?: boolean; mess_settings?: Record<string, unknown> | null } | null;
      if (!mess) return;
      setActiveMess({
        id: mess.id,
        name: mess.name,
        role: first.role,
        avatar_url: mess.avatar_url ?? null,
        is_month_closed: mess.is_month_closed ?? false,
        settings: mess.mess_settings as unknown as import("@/lib/types/mess.types").MessSettings ?? null,
      });
    })
    .catch(() => {});
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setSession, setLoading, setInitialized } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    // Verify session in background — does NOT block rendering.
    // If user is already in localStorage store, dashboard shows immediately.
    // If session is expired/invalid, user is cleared and redirect triggers.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        restoreMessInBackground(session.user.id);
      } else {
        // Session gone — clear query cache, store, and mess so layout redirects to login
        queryClient.clear();
        setSession(null);
        setUser(null);
        useMessStore.getState().clearMess();
      }
      setLoading(false);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setInitialized(true);
      if (session?.user) {
        restoreMessInBackground(session.user.id);
      } else {
        // User signed out — clear all cached data so next user starts fresh
        queryClient.clear();
        useMessStore.getState().clearMess();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setLoading, setInitialized, queryClient]);

  return <>{children}</>;
}
