"use client";
import { format, parseISO } from "date-fns";
import { usePreferencesStore } from "@/lib/stores/preferences.store";

export function usePreferences() {
  const {
    currencySymbol, dateFormat, timeFormat, numberFormat,
    setCurrencySymbol, setDateFormat, setTimeFormat, setNumberFormat,
  } = usePreferencesStore();

  function formatAmount(amount: number): string {
    const abs = Math.abs(amount);
    if (numberFormat === "south-asian") {
      const parts = abs.toFixed(0).split("");
      const result: string[] = [];
      parts.reverse().forEach((d, i) => {
        if (i === 3 || (i > 3 && (i - 3) % 2 === 0)) result.push(",");
        result.push(d);
      });
      return result.reverse().join("");
    }
    return abs.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function formatCurrency(amount: number): string {
    const sign = amount < 0 ? "-" : "";
    const formatted = formatAmount(amount);
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
    currencySymbol, dateFormat, timeFormat, numberFormat,
    setCurrencySymbol, setDateFormat, setTimeFormat, setNumberFormat,
    formatCurrency, formatDatePref, formatTimePref,
  };
}
