"use client";
import { useState, useId } from "react";
import {
  MessageSquareWarning, Plus, Clock, CheckCircle2, XCircle,
  AlertTriangle, Trash2, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useComplaints, useCreateComplaint, useUpdateComplaint, useDeleteComplaint,
} from "@/lib/hooks/use-complaints";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { useAuthStore } from "@/lib/stores/auth.store";
import { storageService } from "@/lib/services/storage.service";
import { FileUpload } from "@/components/shared/ImageUpload";
import { useLanguage } from "@/lib/hooks/use-language";
import type {
  Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus,
} from "@/lib/services/complaint.service";

const CATEGORY_EMOJI: Record<ComplaintCategory, string> = {
  food: "🍽️", cleaning: "🧹", maintenance: "🔧",
  member: "👤", billing: "💰", other: "📌",
};

const PRIORITY_COLORS: Record<ComplaintPriority, string> = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  open: "border-blue-400 bg-blue-50 dark:bg-blue-900/20",
  in_progress: "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  resolved: "border-green-400 bg-green-50 dark:bg-green-900/20",
  closed: "border-gray-300 bg-gray-50 dark:bg-gray-800/30",
  rejected: "border-red-400 bg-red-50 dark:bg-red-900/20",
};

const STATUS_ICON: Record<ComplaintStatus, React.ReactNode> = {
  open: <Clock className="h-4 w-4 text-blue-500" />,
  in_progress: <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />,
  resolved: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  closed: <XCircle className="h-4 w-4 text-gray-400" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
};

function ComplaintCard({ complaint, isAdmin, currentUserId }: {
  complaint: Complaint;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [resolutionNote, setResolutionNote] = useState(complaint.resolution_note ?? "");
  const updateComplaint = useUpdateComplaint();
  const deleteComplaint = useDeleteComplaint();

  const isOwner = complaint.submitted_by === currentUserId;
  const canManage = isAdmin || isOwner;
  const isActive = complaint.status === "open" || complaint.status === "in_progress";

  const handleStatusChange = (status: ComplaintStatus) => {
    updateComplaint.mutate({
      id: complaint.id,
      input: {
        status,
        resolution_note: resolutionNote || undefined,
      },
    });
  };

  const categoryLabels: Record<ComplaintCategory, string> = {
    food: t.complaints.categories.food,
    cleaning: t.complaints.categories.cleaning,
    maintenance: t.complaints.categories.maintenance,
    member: t.complaints.categories.member,
    billing: t.complaints.categories.billing,
    other: t.complaints.categories.other,
  };

  const priorityLabels: Record<ComplaintPriority, string> = {
    low: t.complaints.priority.low,
    medium: t.complaints.priority.medium,
    high: t.complaints.priority.high,
    urgent: t.complaints.priority.urgent,
  };

  const statusLabels: Record<ComplaintStatus, string> = {
    open: t.complaints.status.open,
    in_progress: t.complaints.status.inProgress,
    resolved: t.complaints.status.resolved,
    closed: t.complaints.status.closed,
    rejected: t.complaints.status.rejected,
  };

  return (
    <Card className={cn("border-l-4 transition-all", STATUS_COLORS[complaint.status])}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-1.5">
              <span className="text-base">{CATEGORY_EMOJI[complaint.category]}</span>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                PRIORITY_COLORS[complaint.priority]
              )}>
                {priorityLabels[complaint.priority]}
              </span>
              <Badge variant="outline" className="text-xs gap-1">
                {STATUS_ICON[complaint.status]}
                {statusLabels[complaint.status]}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {categoryLabels[complaint.category]}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground leading-snug">{complaint.title}</h3>
          </div>
          {canManage && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => deleteComplaint.mutate(complaint.id)}
              disabled={deleteComplaint.isPending}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {complaint.submitter_name && (
            <span>{t.complaints.submittedBy} {complaint.submitter_name}</span>
          )}
          <span>{formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-muted-foreground">{complaint.description}</p>

        {complaint.resolution_note && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">{t.complaints.resolutionNote}</p>
            <p className="text-sm text-green-800 dark:text-green-300">{complaint.resolution_note}</p>
          </div>
        )}

        {isAdmin && isActive && (
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {t.complaints.changeStatus}
          </button>
        )}

        {isAdmin && isActive && expanded && (
          <div className="space-y-3 pt-1 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.complaints.resolutionNote}</Label>
              <Textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder={t.complaints.notePlaceholder ?? "..."}
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {complaint.status === "open" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("in_progress")}
                  disabled={updateComplaint.isPending}
                  className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                >
                  <Loader2 className="h-3 w-3 mr-1" /> {t.complaints.status.inProgress}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange("resolved")}
                disabled={updateComplaint.isPending}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> {t.complaints.status.resolved}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange("rejected")}
                disabled={updateComplaint.isPending}
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                <XCircle className="h-3 w-3 mr-1" /> {t.complaints.status.rejected}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SubmitComplaintDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const createComplaint = useCreateComplaint();
  const { user } = useAuthStore();
  const uid = useId();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState<string | null>(null);

  const complaintSchema = z.object({
    title: z.string().min(5, t.complaints.validation?.titleMin ?? "Min 5 chars"),
    description: z.string().min(10, t.complaints.validation?.descMin ?? "Min 10 chars"),
    category: z.enum(["food", "cleaning", "maintenance", "member", "billing", "other"]),
    priority: z.enum(["low", "medium", "high", "urgent"]),
  });

  type ComplaintFormData = z.infer<typeof complaintSchema>;

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "other",
      priority: "medium",
    },
  });

  const categoryLabels: Record<ComplaintCategory, string> = {
    food: t.complaints.categories.food,
    cleaning: t.complaints.categories.cleaning,
    maintenance: t.complaints.categories.maintenance,
    member: t.complaints.categories.member,
    billing: t.complaints.categories.billing,
    other: t.complaints.categories.other,
  };

  const priorityLabels: Record<ComplaintPriority, string> = {
    low: t.complaints.priority.low,
    medium: t.complaints.priority.medium,
    high: t.complaints.priority.high,
    urgent: t.complaints.priority.urgent,
  };

  const handleMediaUpload = async (file: File) => {
    if (!user?.id) return;
    const result = await storageService.uploadMedia(user.id, file);
    setMediaUrl(result.url);
    setMediaName(file.name);
  };

  const onSubmit = (data: ComplaintFormData) => {
    createComplaint.mutate(
      { ...data, media_url: mediaUrl ?? undefined },
      {
        onSuccess: () => {
          reset();
          setMediaUrl(null);
          setMediaName(null);
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.complaints.submitTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-title`}>{t.complaints.complaintTitle}</Label>
            <Input id={`${uid}-title`} placeholder={t.complaints.titlePlaceholder} {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-desc`}>{t.complaints.detailedDesc}</Label>
            <Textarea
              id={`${uid}-desc`}
              placeholder={t.complaints.titlePlaceholder}
              rows={3}
              {...register("description")}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.complaints.categoryLabel}</Label>
              <Select defaultValue="other" onValueChange={(v) => setValue("category", v as ComplaintCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(categoryLabels) as [ComplaintCategory, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {CATEGORY_EMOJI[val]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t.complaints.priorityLabel}</Label>
              <Select defaultValue="medium" onValueChange={(v) => setValue("priority", v as ComplaintPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(priorityLabels) as [ComplaintPriority, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t.complaints.mediaUpload}</Label>
            <FileUpload
              onUpload={handleMediaUpload}
              currentFileName={mediaName}
              onRemove={() => { setMediaUrl(null); setMediaName(null); }}
              label={t.complaints.mediaUpload}
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t.cancel}</Button>
            <Button type="submit" disabled={createComplaint.isPending}>
              {createComplaint.isPending ? t.submitting : t.complaints.submitBtn2}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ComplaintsPage() {
  const { t } = useLanguage();
  const [submitOpen, setSubmitOpen] = useState(false);
  const { data: complaints = [], isLoading } = useComplaints();
  const { user } = useAuthStore();
  const isAdmin = useHasPermission("notifications.send");
  const currentUserId = user?.id ?? "";

  const openComplaints = complaints.filter((c) => c.status === "open");
  const inProgressComplaints = complaints.filter((c) => c.status === "in_progress");
  const resolvedComplaints = complaints.filter((c) => c.status === "resolved" || c.status === "closed" || c.status === "rejected");

  const urgentCount = complaints.filter((c) => c.priority === "urgent" && c.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setSubmitOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> {t.complaints.submitBtn}
        </Button>
      </div>

      {urgentCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {t.complaints.urgentAlert.replace("{count}", String(urgentCount))}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-blue-600">{openComplaints.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.complaints.status.open}</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-yellow-600">{inProgressComplaints.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.complaints.status.inProgress}</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-green-600">{resolvedComplaints.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.complaints.status.resolved}</p>
        </Card>
      </div>

      <Tabs defaultValue="open">
        <TabsList className="w-full">
          <TabsTrigger value="open" className="flex-1">
            {t.complaints.status.open}
            {openComplaints.length > 0 && (
              <Badge variant="default" className="ml-1.5 text-xs">{openComplaints.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="flex-1">
            {t.complaints.status.inProgress}
            {inProgressComplaints.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{inProgressComplaints.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex-1">{t.complaints.status.resolved}</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : openComplaints.length === 0 ? (
            <EmptyState
              icon={<MessageSquareWarning className="h-8 w-8" />}
              title={t.complaints.noComplaints}
              description={t.complaints.pageSubtitle}
              action={{ label: t.complaints.submitBtn, onClick: () => setSubmitOpen(true) }}
            />
          ) : (
            openComplaints.map((c) => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : inProgressComplaints.length === 0 ? (
            <EmptyState
              icon={<Loader2 className="h-8 w-8" />}
              title={t.complaints.noComplaints}
              description={t.complaints.pageSubtitle}
            />
          ) : (
            inProgressComplaints.map((c) => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : resolvedComplaints.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8" />}
              title={t.complaints.noComplaints}
            />
          ) : (
            resolvedComplaints.map((c) => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <SubmitComplaintDialog open={submitOpen} onClose={() => setSubmitOpen(false)} />
    </div>
  );
}
