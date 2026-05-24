"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CurrencySymbol = "৳" | "Tk" | "BDT";
export type DateFormatPref = "d MMMM, yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
export type TimeFormatPref = "12h" | "24h";

interface PreferencesState {
  currencySymbol: CurrencySymbol;
  dateFormat: DateFormatPref;
  timeFormat: TimeFormatPref;
  setCurrencySymbol: (s: CurrencySymbol) => void;
  setDateFormat: (f: DateFormatPref) => void;
  setTimeFormat: (f: TimeFormatPref) => void;
  hydrate: (prefs: { currencySymbol?: CurrencySymbol; dateFormat?: DateFormatPref; timeFormat?: TimeFormatPref }) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      currencySymbol: "৳",
      dateFormat: "d MMMM, yyyy",
      timeFormat: "12h",
      setCurrencySymbol: (currencySymbol) => set({ currencySymbol }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      hydrate: (prefs) => set((state) => ({
        currencySymbol: prefs.currencySymbol ?? state.currencySymbol,
        dateFormat: prefs.dateFormat ?? state.dateFormat,
        timeFormat: prefs.timeFormat ?? state.timeFormat,
      })),
    }),
    { name: "mess-pilot-preferences" }
  )
);
