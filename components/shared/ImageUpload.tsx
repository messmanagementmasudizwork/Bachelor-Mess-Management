"use client";
import { useRef, useState } from "react";
import { Upload, X, Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/hooks/use-language";
import { toast } from "sonner";

interface ImageUploadProps {
  currentUrl?: string | null;
  fallbackText?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  shape?: "circle" | "square";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  accept?: string;
}

const SIZE_MAP = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

const ICON_SIZE_MAP = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export function ImageUpload({
  currentUrl,
  fallbackText = "?",
  onUpload,
  onRemove,
  shape = "circle",
  size = "md",
  className,
  disabled = false,
  accept = "image/jpeg,image/png,image/webp",
}: ImageUploadProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayUrl = preview ?? currentUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setLoading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setPreview(null);
      toast.error((err as Error)?.message ?? "Upload failed. Please try again.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRemove) return;
    setLoading(true);
    try {
      await onRemove();
      setPreview(null);
    } catch (err) {
      toast.error((err as Error)?.message ?? "Remove failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("relative inline-flex flex-col items-center gap-2 group", className)}>
      {/* Avatar */}
      <div
        className={cn(
          "relative cursor-pointer",
          disabled && "cursor-not-allowed opacity-60"
        )}
        onClick={() => !disabled && !loading && inputRef.current?.click()}
      >
        <Avatar
          className={cn(
            SIZE_MAP[size],
            shape === "square" && "rounded-xl",
            "transition-all duration-300 group-hover:scale-75"
          )}
        >
          <AvatarImage src={displayUrl ?? undefined} className="object-cover" />
          <AvatarFallback className={cn(
            "text-lg font-bold",
            shape === "square" && "rounded-xl"
          )}>
            {loading ? (
              <Loader2 className={cn(ICON_SIZE_MAP[size], "animate-spin")} />
            ) : (
              fallbackText
            )}
          </AvatarFallback>
        </Avatar>

        {loading && (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/40",
            shape === "circle" ? "rounded-full" : "rounded-xl"
          )}>
            <Loader2 className={cn(ICON_SIZE_MAP[size], "text-white animate-spin")} />
          </div>
        )}
      </div>

      {/* Buttons — hidden by default, visible on group hover */}
      {!disabled && !loading && (
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-0 group-hover:h-auto overflow-hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            disabled={disabled || loading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            {displayUrl ? t.imageUpload.change : t.imageUpload.upload}
          </Button>
          {displayUrl && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              disabled={disabled || loading}
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
              {t.imageUpload.remove}
            </Button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || loading}
      />
    </div>
  );
}

// --------------------------------------------------------
// FileUpload — for receipts / documents (not avatar style)
// --------------------------------------------------------
interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  currentFileName?: string | null;
  onRemove?: () => void;
  accept?: string;
  maxSizeMb?: number;
  className?: string;
  disabled?: boolean;
  label?: string;
}

export function FileUpload({
  onUpload,
  currentFileName,
  onRemove,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  maxSizeMb = 10,
  className,
  disabled = false,
  label,
}: FileUploadProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayLabel = label ?? t.imageUpload.defaultLabel;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(t.imageUpload.fileTooLarge.replace("{size}", String(maxSizeMb)));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      {currentFileName ? (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border text-sm">
          <span className="flex-1 truncate text-foreground">{currentFileName}</span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-destructive hover:text-destructive/80"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !disabled && !loading && inputRef.current?.click()}
          disabled={disabled || loading}
          className={cn(
            "w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed",
            "text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-muted/50",
            "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {t.imageUpload.uploading}</>
          ) : (
            <><Upload className="h-4 w-4" /> {displayLabel}</>
          )}
        </button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || loading}
      />
    </div>
  );
}
