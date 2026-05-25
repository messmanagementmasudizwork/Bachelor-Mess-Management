"use client";
import { useState, useRef, useEffect } from "react";
import { Shield, Eye, EyeOff, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePinProtection } from "@/lib/hooks/use-pin";
import { useLanguage } from "@/lib/hooks/use-language";
import { toast } from "sonner";

interface PinVerifyDialogProps {
  open: boolean;
  onResult: (success: boolean) => void;
  title?: string;
}

export function PinVerifyDialog({ open, onResult, title }: PinVerifyDialogProps) {
  const { t } = useLanguage();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { verifyPin } = usePinProtection();

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError(t.pin.pinMin4);
      return;
    }
    setLoading(true);
    try {
      const ok = await verifyPin(pin);
      if (ok) {
        onResult(true);
      } else {
        setError(t.pin.pinIncorrect);
        setPin("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onResult(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {title ?? t.pin.verifyTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">{t.pin.enterPinDesc}</p>
          <div className="space-y-2">
            <Label>{t.pin.pinLabel}</Label>
            <div className="relative">
              <Input
                ref={inputRef}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
                placeholder={t.pin.pinPlaceholder}
                className={error ? "border-destructive" : ""}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onResult(false)} disabled={loading}>
              <X className="h-4 w-4 mr-1" /> {t.pin.cancel}
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? "..." : t.pin.confirm}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PinSetupDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "set" | "change" | "remove";
}

export function PinSetupDialog({ open, onClose, mode }: PinSetupDialogProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<"current" | "new" | "confirm">(mode === "set" ? "new" : "current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setPin, verifyPin, removePin } = usePinProtection();

  useEffect(() => {
    if (open) {
      setStep(mode === "set" ? "new" : "current");
      setCurrentPin(""); setNewPin(""); setConfirmPin(""); setError("");
    }
  }, [open, mode]);

  const handleNext = async () => {
    setLoading(true);
    try {
      if (step === "current") {
        const ok = await verifyPin(currentPin);
        if (!ok) { setError(t.pin.currentPinIncorrect); return; }
        if (mode === "remove") {
          await removePin();
          toast.success(t.pin.pinRemoved);
          onClose();
          return;
        }
        setStep("new"); setError(""); setCurrentPin("");
      } else if (step === "new") {
        if (newPin.length < 4) { setError(t.pin.pinMin4); return; }
        setStep("confirm"); setError("");
      } else {
        if (newPin !== confirmPin) { setError(t.pin.pinMismatch); setConfirmPin(""); return; }
        await setPin(newPin);
        toast.success(mode === "set" ? t.pin.pinSet : t.pin.pinChanged);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const titleMap = {
    set: t.pin.setTitle,
    change: t.pin.changeTitle,
    remove: t.pin.removeTitle,
  };
  const stepLabel = step === "current" ? t.pin.currentPin : step === "new" ? t.pin.newPin : t.pin.confirmPin;
  const value = step === "current" ? currentPin : step === "new" ? newPin : confirmPin;
  const setter = step === "current" ? setCurrentPin : step === "new" ? setNewPin : setConfirmPin;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {titleMap[mode]}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{stepLabel}</Label>
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={value}
                onChange={(e) => { setter(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleNext()}
                placeholder={t.pin.pinPlaceholder}
                className={error ? "border-destructive" : ""}
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">{t.pin.pinHint}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>{t.pin.cancel}</Button>
            <Button className="flex-1" onClick={handleNext} disabled={loading}>
              {loading ? "..." : step === "confirm" ? t.pin.setConfirm : t.pin.next}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
