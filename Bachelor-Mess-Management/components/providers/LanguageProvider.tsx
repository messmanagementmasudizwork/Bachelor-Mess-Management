"use client";

import React, { createContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth.store";
import { getTranslations, type Translations, type Lang } from "@/lib/i18n";

const LS_KEY = "messpilot_lang";
const DEFAULT_LANG: Lang = "en";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
  t: Translations;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function readLsLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const v = localStorage.getItem(LS_KEY);
  if (v === "bn" || v === "en") return v;
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLsLang);
  const user = useAuthStore((s) => s.user);

  // On mount or user change: load preferred_language from DB
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("preferred_language")
          .eq("id", user.id)
          .single();
        const dbLang = data?.preferred_language;
        if (dbLang === "bn" || dbLang === "en") {
          setLangState(dbLang);
          localStorage.setItem(LS_KEY, dbLang);
        }
      } catch {
        // ignore
      }
    })();
  }, [user?.id]);

  const setLang = useCallback(
    async (newLang: Lang) => {
      setLangState(newLang);
      localStorage.setItem(LS_KEY, newLang);
      if (user?.id) {
        const supabase = createClient();
        if (supabase) {
          try {
            await supabase
              .from("profiles")
              .update({ preferred_language: newLang })
              .eq("id", user.id);
          } catch {
            // ignore
          }
        }
      }
    },
    [user?.id]
  );

  const t = getTranslations(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
