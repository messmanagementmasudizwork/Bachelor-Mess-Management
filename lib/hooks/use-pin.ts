"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const PIN_CACHE_KEY = "messpilot_pin_cache";

function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return String(Math.abs(hash));
}

export function usePinProtection() {
  const [pinIsSetState, setPinIsSetState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(PIN_CACHE_KEY);
  });

  const refreshPinStatus = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase.rpc("is_action_pin_set");
    if (typeof data === "boolean") {
      setPinIsSetState(data);
      if (!data) localStorage.removeItem(PIN_CACHE_KEY);
      else localStorage.setItem(PIN_CACHE_KEY, "1");
    }
  }, []);

  useEffect(() => {
    refreshPinStatus();
  }, [refreshPinStatus]);

  const isPinSet = (): boolean => pinIsSetState;

  const setPin = useCallback(async (pin: string): Promise<void> => {
    localStorage.setItem(PIN_CACHE_KEY, hashPin(pin));
    setPinIsSetState(true);
    const supabase = createClient();
    if (supabase) {
      await supabase.rpc("set_action_pin", { p_pin: pin });
    }
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.rpc("verify_action_pin", { p_pin: pin });
      if (!error && typeof data === "boolean") return data;
    }
    const stored = localStorage.getItem(PIN_CACHE_KEY);
    if (!stored) return true;
    return stored === hashPin(pin);
  }, []);

  const removePin = useCallback(async (): Promise<void> => {
    localStorage.removeItem(PIN_CACHE_KEY);
    setPinIsSetState(false);
    const supabase = createClient();
    if (supabase) {
      await supabase.rpc("remove_action_pin");
    }
  }, []);

  return { isPinSet, setPin, verifyPin, removePin, refreshPinStatus };
}

export function usePinDialog() {
  const [open, setOpen] = useState(false);
  const [resolveRef, setResolveRef] = useState<((ok: boolean) => void) | null>(null);

  const requirePin = useCallback((): Promise<boolean> => {
    const hasCachedPin = typeof window !== "undefined" && !!localStorage.getItem(PIN_CACHE_KEY);
    if (!hasCachedPin) return Promise.resolve(true);
    return new Promise((resolve) => {
      setResolveRef(() => resolve);
      setOpen(true);
    });
  }, []);

  const onConfirm = useCallback((ok: boolean) => {
    setOpen(false);
    resolveRef?.(ok);
    setResolveRef(null);
  }, [resolveRef]);

  return { open, requirePin, onConfirm };
}
