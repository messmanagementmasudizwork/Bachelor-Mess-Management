"use client";
import { format, parseISO } from "date-fns";
import { usePreferencesStore } from "@/lib/stores/preferences.store";

export function usePreferences() {
  const {
    currencySymbol, dateFormat, timeFormat,
    setCurrencySymbol, setDateFormat, setTimeFormat,
  } = usePreferencesStore();

  function formatCurrency(amount: number): string {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    const formatted = abs.toLocaleString("en-BD", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    if (currencySymbol === "BDT") return `${sign}BDT ${formatted}`;
    return `${sign}${currencySymbol}${formatted}`;
  }

  function formatDatePref(dateStr: string): string {
    try {
      return format(parseISO(dateStr), dateFormat);
    } catch {
      return dateStr;
    }
  }

  function formatTimePref(date: Date): string {
    return format(date, timeFormat === "12h" ? "hh:mm a" : "HH:mm");
  }

  return {
    currencySymbol, dateFormat, timeFormat,
    setCurrencySymbol, setDateFormat, setTimeFormat,
    formatCurrency, formatDatePref, formatTimePref,
  };
}
