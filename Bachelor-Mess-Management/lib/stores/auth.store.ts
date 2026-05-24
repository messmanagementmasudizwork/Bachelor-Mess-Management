import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: false,       // false by default — persisted user shows dashboard immediately
      isInitialized: false,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),
      clear: () => set({ user: null, session: null, isLoading: false, isInitialized: true }),
    }),
    {
      name: "mess-auth",
      storage: createJSONStorage(() => localStorage),
      // Persist user so dashboard renders immediately on refresh
      partialize: (state) => ({ user: state.user }),
    }
  )
);
