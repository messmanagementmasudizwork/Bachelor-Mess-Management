"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, ExternalLink, FileText, Image, Loader2, Clock, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/hooks/use-language";
import { usePendingRequests, useReviewRequest } from "@/lib/hooks/use-reactivation";
import { AccountStatusBadge } from "./AccountStatusBadge";
import { useAuthStore } from "@/lib/stores/auth.store";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { ReactivationRequest } from "@/lib/types";

interface Props {
  messId: string;
  myRole: string;
}

function RequestCard({
  request,
  messId,
  myRole,
  reviewedBy,
}: {
  request: ReactivationRequest;
  messId: string;
  myRole: string;
  reviewedBy: string;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const reviewRequest = useReviewRequest(messId);
  const router = useRouter();

  const member = request.member;
  const memberName = (member as any)?.user?.full_name ?? t.violations.unknownMember;
  const accountStatus = (member as any)?.account_status ?? "active";

  const canApprove =
    accountStatus === "frozen"
      ? ["owner", "admin", "manager"].includes(myRole)
      : accountStatus === "banned"
      ? ["owner", "admin"].includes(myRole)
      : false;

  const handleReview = (status: "approved" | "rejected") => {
    reviewRequest.mutate({
      requestId: request.id,
      status,
      reviewedBy,
      reviewerNotes: notes,
      memberId: request.member_id,
    });
  };

  return (
    <Card className="border rounded-xl">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
              {memberName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{memberName}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <AccountStatusBadge status={accountStatus} />
        </div>

        {/* Proof text */}
        {request.proof_text && (
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-foreground/80 leading-relaxed">
            <p className="font-medium text-[10px] text-muted-foreground mb-1">{t.violations.proofText}:</p>
            {request.proof_text}
          </div>
        )}

        {/* Proof file */}
        {request.proof_file_url && (
          <a
            href={request.proof_file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline"
          >
            <Image className="h-3.5 w-3.5" />
            {t.violations.viewProofFile}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {!request.proof_text && !request.proof_file_url && (
          <p className="text-xs text-muted-foreground italic">{t.violations.noProofProvided}</p>
        )}

        {/* Reviewer notes */}
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.violations.reviewNotesPlaceholder}
          className="text-xs min-h-[60px]"
        />

        {/* Actions */}
        <div className="flex gap-2">
          {canApprove && (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
              onClick={() => handleReview("approved")}
              disabled={reviewRequest.isPending}
            >
              {reviewRequest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {t.violations.approve}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
            onClick={() => handleReview("rejected")}
            disabled={reviewRequest.isPending}
          >
            <XCircle className="h-3.5 w-3.5" />
            {t.violations.reject}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs gap-1"
            onClick={() => router.push("/dashboard/polls")}
            title={t.violations.createPollHint}
          >
            <Users className="h-3.5 w-3.5" />
            {t.violations.poll}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReactivationReviewPanel({ messId, myRole }: Props) {
  const { t } = useLanguage();
  const { data: requests = [], isLoading } = usePendingRequests(messId);
  const { user } = useAuthStore();

  if (isLoading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold">{t.violations.pendingRequests}</h3>
        <Badge variant="secondary" className="text-[10px]">{requests.length}</Badge>
      </div>
      <div className="space-y-3">
        {requests.map((req) => (
          <RequestCard
            key={req.id}
            request={req}
            messId={messId}
            myRole={myRole}
            reviewedBy={user?.id ?? ""}
          />
        ))}
      </div>
    </div>
  );
}
