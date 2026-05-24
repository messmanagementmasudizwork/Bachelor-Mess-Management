"use client";
import { useState, useCallback } from "react";

const PIN_STORAGE_KEY = "messpilot_action_pin";

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
  const isPinSet = (): boolean => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(PIN_STORAGE_KEY);
  };

  const setPin = useCallback((pin: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(PIN_STORAGE_KEY, hashPin(pin));
  }, []);

  const verifyPin = useCallback((pin: string): boolean => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) return true;
    return stored === hashPin(pin);
  }, []);

  const removePin = useCallback((): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(PIN_STORAGE_KEY);
  }, []);

  return { isPinSet, setPin, verifyPin, removePin };
}

export function usePinDialog() {
  const [open, setOpen] = useState(false);
  const [resolveRef, setResolveRef] = useState<((ok: boolean) => void) | null>(null);

  const requirePin = useCallback((): Promise<boolean> => {
    const { isPinSet } = usePinProtectionStatic();
    if (!isPinSet()) return Promise.resolve(true);
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

function usePinProtectionStatic() {
  return {
    isPinSet: () => {
      if (typeof window === "undefined") return false;
      return !!localStorage.getItem(PIN_STORAGE_KEY);
    },
  };
}
