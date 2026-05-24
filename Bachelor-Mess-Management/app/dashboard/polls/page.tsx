"use client";
import { useState, useId } from "react";
import {
  Vote, Plus, Clock, Lock, Eye, EyeOff, Trash2, CheckCircle2,
  BarChart2, ChevronDown, ChevronUp, Users, AlertCircle,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  usePolls, usePollVotes, useMyVote, useCreatePoll,
  useClosePoll, useDeletePoll, useCastVote, useChangeVote,
} from "@/lib/hooks/use-polls";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { useLanguage } from "@/lib/hooks/use-language";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { Poll, PollType } from "@/lib/services/poll.service";

const POLL_TYPE_COLORS: Record<PollType, string> = {
  general:            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  menu_vote:          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  manager_selection:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  rule_change:        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

function PollCard({ poll, isAdmin }: { poll: Poll; isAdmin: boolean }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuthStore();
  const { data: votes = [] } = usePollVotes(poll.id);
  const { data: myVote } = useMyVote(poll.id);
  const castVote = useCastVote();
  const changeVote = useChangeVote();
  const closePoll = useClosePoll();
  const deletePoll = useDeletePoll();

  const pollTypeLabels: Record<PollType, string> = {
    general:           t.polls.types.general,
    menu_vote:         t.polls.types.menuVote,
    manager_selection: t.polls.types.managerSelect,
    rule_change:       t.polls.types.ruleChange,
  };

  const isClosed = poll.status === "closed" || (poll.closes_at != null && isPast(new Date(poll.closes_at)));
  const totalVotes = votes.length;

  const voteCounts: Record<string, number> = {};
  for (const v of votes) {
    voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1;
  }
  const maxVotes = Math.max(...Object.values(voteCounts), 0);

  const handleVote = (optionId: string) => {
    if (isClosed) return;
    if (myVote) {
      if (myVote.option_id === optionId) return;
      changeVote.mutate({ pollId: poll.id, optionId });
    } else {
      castVote.mutate({ pollId: poll.id, optionId });
    }
  };

  const voterNames = poll.is_anonymous
    ? []
    : votes.map((v) => v.voter_name).filter(Boolean);

  return (
    <Card className={cn("border", isClosed && "opacity-75")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", POLL_TYPE_COLORS[poll.poll_type])}>
                {pollTypeLabels[poll.poll_type]}
              </span>
              {poll.is_anonymous && (
                <Badge variant="outline" className="text-xs gap-1">
                  <EyeOff className="h-3 w-3" /> {t.polls.anonymousBadge}
                </Badge>
              )}
              {isClosed && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Lock className="h-3 w-3" /> {t.polls.closed}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground leading-snug">{poll.title}</h3>
            {poll.description && (
              <p className="text-sm text-muted-foreground mt-1">{poll.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAdmin && !isClosed && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => closePoll.mutate(poll.id)}
                title={t.polls.closePollTitle}
                disabled={closePoll.isPending}
              >
                <Lock className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => deletePoll.mutate(poll.id)}
                title={t.polls.deleteTitle}
                disabled={deletePoll.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {t.polls.votesCount.replace("{count}", String(totalVotes))}
          </span>
          {poll.closes_at && !isClosed && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(poll.closes_at), { addSuffix: true })} {t.polls.endsIn}
            </span>
          )}
          {poll.closes_at && isClosed && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(poll.closes_at), "d MMM yyyy")}-{t.polls.endedOn}
            </span>
          )}
          {poll.creator_name && (
            <span>{t.polls.createdBy} {poll.creator_name}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {poll.options.map((option) => {
          const count = voteCounts[option.id] ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyChoice = myVote?.option_id === option.id;
          const isWinner = isClosed && count === maxVotes && maxVotes > 0;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isClosed || castVote.isPending || changeVote.isPending}
              className={cn(
                "w-full text-left rounded-xl border p-3 transition-all",
                isClosed ? "cursor-default" : "hover:border-primary/50 hover:bg-muted/40 cursor-pointer",
                isMyChoice && "border-primary bg-primary/5",
                isWinner && "border-green-500 bg-green-50 dark:bg-green-900/20"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {isMyChoice && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
                  {isWinner && !isMyChoice && <BarChart2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
                  <span className={cn("text-sm font-medium", isWinner && "text-green-700 dark:text-green-400")}>
                    {option.text}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{count} ({pct}%)</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </button>
          );
        })}

        {!poll.is_anonymous && totalVotes > 0 && (
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {t.polls.viewVoters} ({voterNames.length})
          </button>
        )}

        {expanded && !poll.is_anonymous && (
          <div className="flex flex-wrap gap-1 mt-1">
            {voterNames.map((name, i) => (
              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">{name}</span>
            ))}
          </div>
        )}

        {!isClosed && !myVote && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <AlertCircle className="h-3 w-3" /> {t.polls.votePrompt}
          </p>
        )}
        {!isClosed && myVote && (
          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-2">
            <CheckCircle2 className="h-3 w-3" /> {t.polls.voteChangePrompt}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CreatePollDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const createPoll = useCreatePoll();
  const uid = useId();

  const pollTypeLabels: Record<PollType, string> = {
    general:           t.polls.types.general,
    menu_vote:         t.polls.types.menuVote,
    manager_selection: t.polls.types.managerSelect,
    rule_change:       t.polls.types.ruleChange,
  };

  const pollSchema = z.object({
    title: z.string().min(3, t.polls.pollTitle),
    description: z.string().optional(),
    poll_type: z.enum(["general", "menu_vote", "manager_selection", "rule_change"]),
    is_anonymous: z.boolean(),
    options: z.array(z.object({ text: z.string().min(1) })).min(2).max(10),
    has_deadline: z.boolean(),
    closes_at: z.string().optional(),
  });

  type PollFormData = z.infer<typeof pollSchema>;

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<PollFormData>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      title: "",
      description: "",
      poll_type: "general",
      is_anonymous: false,
      options: [{ text: "" }, { text: "" }],
      has_deadline: false,
      closes_at: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "options" });
  const hasDeadline = watch("has_deadline");
  const isAnonymous = watch("is_anonymous");

  const onSubmit = (data: PollFormData) => {
    const options = data.options.map((o, i) => ({ id: `opt_${i + 1}`, text: o.text.trim() }));
    createPoll.mutate(
      {
        title: data.title,
        description: data.description || undefined,
        poll_type: data.poll_type,
        is_anonymous: data.is_anonymous,
        options,
        closes_at: data.has_deadline && data.closes_at ? new Date(data.closes_at).toISOString() : null,
      },
      { onSuccess: () => { reset(); onClose(); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.polls.createTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-title`}>{t.polls.pollTitle}</Label>
            <Input id={`${uid}-title`} placeholder={t.polls.titlePlaceholder} {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-desc`}>{t.polls.pollDescription}</Label>
            <Textarea id={`${uid}-desc`} placeholder={t.polls.descPlaceholder} rows={2} {...register("description")} />
          </div>

          <div className="space-y-1.5">
            <Label>{t.polls.pollType}</Label>
            <Select defaultValue="general" onValueChange={(v) => setValue("poll_type", v as PollType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(pollTypeLabels) as [PollType, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.polls.options}</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  placeholder={t.polls.optionPlaceholder.replace("{n}", String(index + 1))}
                  {...register(`options.${index}.text`)}
                />
                {fields.length > 2 && (
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {errors.options && (
              <p className="text-xs text-destructive">{t.polls.optionFillError}</p>
            )}
            {fields.length < 10 && (
              <Button type="button" variant="outline" size="sm" onClick={() => append({ text: "" })}>
                <Plus className="h-4 w-4 mr-1" /> {t.polls.addOption}
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{t.polls.anonymousVoting}</p>
              <p className="text-xs text-muted-foreground">{t.polls.anonymousNote}</p>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={(v) => setValue("is_anonymous", v)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{t.polls.setTimeLimit}</p>
              <p className="text-xs text-muted-foreground">{t.polls.timeLimitNote}</p>
            </div>
            <Switch checked={hasDeadline} onCheckedChange={(v) => setValue("has_deadline", v)} />
          </div>

          {hasDeadline && (
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-deadline`}>{t.polls.closeDateTime}</Label>
              <Input
                id={`${uid}-deadline`}
                type="datetime-local"
                {...register("closes_at")}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t.polls.cancelBtn}</Button>
            <Button type="submit" disabled={createPoll.isPending}>
              {createPoll.isPending ? t.polls.creating : t.polls.createBtn}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PollsPage() {
  const { t } = useLanguage();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: polls = [], isLoading } = usePolls();
  const isAdmin = useHasPermission("notifications.send");

  const activePolls = polls.filter(
    (p) => p.status === "active" && (p.closes_at == null || !isPast(new Date(p.closes_at)))
  );
  const closedPolls = polls.filter(
    (p) => p.status === "closed" || (p.closes_at != null && isPast(new Date(p.closes_at)))
  );

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t.polls.newPoll}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-primary">{polls.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.polls.stats.total}</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-green-600">{activePolls.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.polls.stats.active}</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-muted-foreground">{closedPolls.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.polls.stats.closed}</p>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">
            {t.polls.tabActive}
            {activePolls.length > 0 && (
              <Badge variant="default" className="ml-1.5 text-xs">{activePolls.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex-1">
            {t.polls.tabClosed}
            {closedPolls.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{closedPolls.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
            </div>
          ) : activePolls.length === 0 ? (
            <EmptyState
              icon={<Vote className="h-8 w-8" />}
              title={t.polls.noActivePolls}
              description={isAdmin ? t.polls.noActivePollsAdmin : t.polls.noActivePollsMember}
              action={isAdmin ? { label: t.polls.newPoll, onClick: () => setCreateOpen(true) } : undefined}
            />
          ) : (
            activePolls.map((poll) => (
              <PollCard key={poll.id} poll={poll} isAdmin={isAdmin} />
            ))
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
            </div>
          ) : closedPolls.length === 0 ? (
            <EmptyState
              icon={<Lock className="h-8 w-8" />}
              title={t.polls.noClosedPolls}
              description={t.polls.noClosedDesc}
            />
          ) : (
            closedPolls.map((poll) => (
              <PollCard key={poll.id} poll={poll} isAdmin={isAdmin} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <CreatePollDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
