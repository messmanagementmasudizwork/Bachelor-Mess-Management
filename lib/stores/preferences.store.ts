"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CurrencySymbol   = "৳" | "Tk" | "BDT";
export type DateFormatPref   = "d MMMM, yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
export type TimeFormatPref   = "12h" | "24h";
export type NumberFormatPref = "international" | "south-asian";

interface PreferencesState {
  currencySymbol: CurrencySymbol;
  dateFormat:     DateFormatPref;
  timeFormat:     TimeFormatPref;
  numberFormat:   NumberFormatPref;
  setCurrencySymbol: (s: CurrencySymbol)     => void;
  setDateFormat:     (f: DateFormatPref)     => void;
  setTimeFormat:     (f: TimeFormatPref)     => void;
  setNumberFormat:   (f: NumberFormatPref)   => void;
  hydrate: (prefs: {
    currencySymbol?: CurrencySymbol;
    dateFormat?:     DateFormatPref;
    timeFormat?:     TimeFormatPref;
    numberFormat?:   NumberFormatPref;
  }) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      currencySymbol: "৳",
      dateFormat:     "d MMMM, yyyy",
      timeFormat:     "12h",
      numberFormat:   "international",
      setCurrencySymbol: (currencySymbol) => set({ currencySymbol }),
      setDateFormat:     (dateFormat)     => set({ dateFormat }),
      setTimeFormat:     (timeFormat)     => set({ timeFormat }),
      setNumberFormat:   (numberFormat)   => set({ numberFormat }),
      hydrate: (prefs) => set((state) => ({
        currencySymbol: prefs.currencySymbol ?? state.currencySymbol,
        dateFormat:     prefs.dateFormat     ?? state.dateFormat,
        timeFormat:     prefs.timeFormat     ?? state.timeFormat,
        numberFormat:   prefs.numberFormat   ?? state.numberFormat,
      })),
    }),
    { name: "mess-pilot-preferences" }
  )
);
