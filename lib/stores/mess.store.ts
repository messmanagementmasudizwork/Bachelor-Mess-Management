import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MessSettings } from "@/lib/types/mess.types";

interface ActiveMess {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  is_month_closed?: boolean;
  settings?: MessSettings | null;
}

interface MessState {
  activeMess: ActiveMess | null;
  activeMonth: string;
  setActiveMess: (mess: ActiveMess | null) => void;
  setActiveMonth: (month: string) => void;
  clearMess: () => void;
}

const currentMonth = new Date().toISOString().substring(0, 7);

export const useMessStore = create<MessState>()(
  persist(
    (set) => ({
      activeMess: null,
      activeMonth: currentMonth,
      setActiveMess: (activeMess) => set({ activeMess }),
      setActiveMonth: (activeMonth) => set({ activeMonth }),
      clearMess: () => set({ activeMess: null }),
    }),
    {
      name: "mess-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeMess: state.activeMess }),
    }
  )
);
