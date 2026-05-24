"use client";
import { useState } from "react";
import { AlertTriangle, Lock, XCircle, ChevronDown, ChevronUp, Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/hooks/use-language";
import { useSubmitReactivationRequest, useMyRequests } from "@/lib/hooks/use-reactivation";
import { reactivationService } from "@/lib/services/reactivation.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AccountStatus } from "@/lib/types";

interface Props {
  status: AccountStatus;
  messId: string;
  memberId: string;
  excessDays: number;
}

export function AccountFrozenBanner({ status, messId, memberId, excessDays }: Props) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [proofText, setProofText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: myRequests = [] } = useMyRequests(memberId);
  const submitRequest = useSubmitReactivationRequest(messId, memberId);
  const hasPending = myRequests.some((r) => r.status === "pending");

  if (status === "active") return null;

  const isClosed = status === "closed";
  const isBanned = status === "banned";

  const handleSubmit = async () => {
    if (!proofText.trim() && !file) {
      toast.error(t.violations.proofRequired);
      return;
    }
    try {
      let fileUrl: string | null = null;
      if (file) {
        setUploading(true);
        fileUrl = await reactivationService.uploadProofFile(memberId, file);
        setUploading(false);
      }
      await submitRequest.mutateAsync({ proofText, proofFileUrl: fileUrl });
      setProofText("");
      setFile(null);
      setExpanded(false);
    } catch {
      setUploading(false);
    }
  };

  const bgColor =
    status === "frozen" ? "bg-blue-50 border-blue-200" :
    status === "banned"  ? "bg-orange-50 border-orange-200" :
    "bg-red-50 border-red-200";

  const textColor =
    status === "frozen" ? "text-blue-800" :
    status === "banned"  ? "text-orange-800" :
    "text-red-800";

  const Icon = status === "frozen" ? AlertTriangle : status === "banned" ? Lock : XCircle;

  const title =
    status === "frozen" ? t.violations.bannerFrozen :
    status === "banned"  ? t.violations.bannerBanned :
    t.violations.bannerClosed;

  const desc =
    status === "frozen" ? t.violations.bannerFrozenDesc.replace("{days}", String(excessDays)) :
    status === "banned"  ? t.violations.bannerBannedDesc.replace("{days}", String(excessDays)) :
    t.violations.bannerClosedDesc;

  return (
    <Card className={cn("border-2 rounded-2xl", bgColor)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", textColor)} />
          <div className="flex-1 space-y-1">
            <p className={cn("font-semibold text-sm", textColor)}>{title}</p>
            <p className={cn("text-xs leading-relaxed", textColor, "opacity-80")}>{desc}</p>
          </div>
        </div>

        {!isClosed && (
          <>
            {hasPending ? (
              <div className={cn("rounded-xl px-3 py-2 text-xs font-medium", textColor, "bg-white/60 border border-current/20")}>
                ✅ {t.violations.requestPending}
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("w-full text-xs h-8 gap-1", textColor)}
                  onClick={() => setExpanded((v) => !v)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {t.violations.submitProof}
                  {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                </Button>

                {expanded && (
                  <div className="space-y-2">
                    <Textarea
                      value={proofText}
                      onChange={(e) => setProofText(e.target.value)}
                      placeholder={t.violations.proofTextPlaceholder}
                      className="text-xs min-h-[80px] bg-white/80"
                    />
                    <label className={cn(
                      "flex items-center gap-2 cursor-pointer rounded-xl border-2 border-dashed px-3 py-2.5 text-xs transition-colors hover:bg-white/60",
                      textColor
                    )}>
                      <Upload className="h-3.5 w-3.5 shrink-0" />
                      {file ? file.name : t.violations.uploadFile}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={handleSubmit}
                        disabled={submitRequest.isPending || uploading}
                      >
                        {(submitRequest.isPending || uploading) && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {t.violations.submitProof}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setExpanded(false)}
                      >
                        {t.violations.cancel}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
