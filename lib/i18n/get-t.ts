import { getTranslations } from "@/lib/i18n";
import type { Translations } from "@/lib/i18n";

const LS_KEY = "messpilot_lang";

export function getT(): Translations {
  if (typeof window === "undefined") return getTranslations("en");
  const lang = localStorage.getItem(LS_KEY);
  if (lang === "bn" || lang === "en") return getTranslations(lang);
  return getTranslations("en");
}
