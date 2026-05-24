"use client";
import { useState } from "react";
import {
  useSubscriptionPlans,
  useMessSubscriptions,
  useAssignMessSubscription,
  usePlatformStats,
} from "@/lib/hooks/use-super-admin";
import { useLanguage } from "@/lib/hooks/use-language";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Building2,
  Users,
  Search,
  RefreshCw,
  Check,
  Star,
  Zap,
  ArrowUpCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PLAN_COLORS: Record<string, string> = {
  free:       "bg-slate-100 text-slate-600 border-slate-200",
  pro:        "bg-orange-100 text-orange-700 border-orange-200",
  enterprise: "bg-purple-100 text-purple-700 border-purple-200",
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free:       <CreditCard className="w-3.5 h-3.5" />,
  pro:        <Star className="w-3.5 h-3.5" />,
  enterprise: <Zap className="w-3.5 h-3.5" />,
};

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-100 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
  expired:   "bg-red-100 text-red-600",
  trial:     "bg-blue-100 text-blue-700",
};

interface AssignDialogProps {
  mess: any;
  plans: any[];
  currentPlanId: string;
  onClose: () => void;
}

function AssignDialog({ mess, plans, currentPlanId, onClose }: AssignDialogProps) {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState(currentPlanId);
  const [status, setStatus]             = useState("active");
  const [expiresAt, setExpiresAt]       = useState("");
  const assign = useAssignMessSubscription();

  const STATUS_LABELS: Record<string, string> = {
    active:    t.superAdmin.subscriptions.status.active,
    cancelled: t.superAdmin.subscriptions.status.cancelled,
    expired:   t.superAdmin.subscriptions.status.expired,
    trial:     t.superAdmin.subscriptions.status.trial,
  };

  const handleSave = () => {
    assign.mutate(
      {
        messId:    mess.mess_id,
        planId:    selectedPlan,
        status,
        expiresAt: expiresAt || null,
      },
      { onSuccess: onClose }
    );
  };

  const chosenPlan = plans.find((p) => p.id === selectedPlan);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-orange-500" />
            {t.superAdmin.subscriptions.changeTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{mess.mess?.name}</p>
              <p className="text-xs text-slate-500">{mess.mess?.owner?.full_name}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">{t.superAdmin.subscriptions.selectPlan}</label>
            <div className="space-y-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left",
                    selectedPlan === plan.id
                      ? "border-orange-400 bg-orange-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      selectedPlan === plan.id ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      {PLAN_ICONS[plan.slug] ?? <CreditCard className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{plan.name}</p>
                      <p className="text-xs text-slate-500">
                        {plan.price_monthly === 0
                          ? t.superAdmin.subscriptions.free
                          : `৳${plan.price_monthly}/${t.superAdmin.subscriptions.month}`}
                      </p>
                    </div>
                  </div>
                  {selectedPlan === plan.id && (
                    <Check className="w-4 h-4 text-orange-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t.superAdmin.subscriptions.statusLabel}</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t.superAdmin.subscriptions.status.active}</SelectItem>
                <SelectItem value="trial">{t.superAdmin.subscriptions.status.trial}</SelectItem>
                <SelectItem value="cancelled">{t.superAdmin.subscriptions.status.cancelled}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              {t.superAdmin.subscriptions.expiryLabel}{" "}
              <span className="text-slate-400 font-normal">{t.superAdmin.subscriptions.expiryOptional}</span>
            </label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">{t.superAdmin.subscriptions.expiryNote}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={assign.isPending}>
            {t.cancel}
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleSave}
            disabled={assign.isPending || selectedPlan === currentPlanId}
          >
            {assign.isPending ? t.superAdmin.subscriptions.savingBtn : t.superAdmin.subscriptions.saveBtn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SubscriptionsPage() {
  const { t } = useLanguage();
  const [search, setSearch]         = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [assignTarget, setAssignTarget] = useState<any | null>(null);

  const { data: stats }          = usePlatformStats();
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const { data: subs = [],  isLoading: subsLoading, refetch } = useMessSubscriptions();

  const STATUS_LABELS: Record<string, string> = {
    active:    t.superAdmin.subscriptions.status.active,
    cancelled: t.superAdmin.subscriptions.status.cancelled,
    expired:   t.superAdmin.subscriptions.status.expired,
    trial:     t.superAdmin.subscriptions.status.trial,
  };

  const filtered = subs.filter((s: any) => {
    const matchSearch = !search || s.mess?.name?.toLowerCase().includes(search.toLowerCase());
    const matchPlan   = planFilter === "all" || s.plan?.slug === planFilter;
    return matchSearch && matchPlan;
  });

  const planCounts: Record<string, number> = {};
  for (const s of subs as any[]) {
    if (s.status === "active" && s.plan?.slug) {
      planCounts[s.plan.slug] = (planCounts[s.plan.slug] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.superAdmin.subscriptions.title}</h1>
          <p className="text-sm text-slate-500">{t.superAdmin.subscriptions.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-800">{stats?.totalMesses ?? 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t.superAdmin.subscriptions.totalMesses}</p>
        </div>
        {plans.map((plan: any) => (
          <div key={plan.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", PLAN_COLORS[plan.slug])}>
                {plan.name}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{planCounts[plan.slug] ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.superAdmin.subscriptions.messLabel}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t.superAdmin.subscriptions.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t.superAdmin.subscriptions.filterLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.superAdmin.subscriptions.allPlans}</SelectItem>
            {plans.map((p: any) => (
              <SelectItem key={p.id} value={p.slug}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-sm text-slate-500">{t.superAdmin.subscriptions.found.replace("{count}", String(filtered.length))}</p>

      <div className="space-y-2">
        {(plansLoading || subsLoading) && Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}

        {!subsLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t.superAdmin.subscriptions.unknownMess}</p>
          </div>
        )}

        {!subsLoading && filtered.map((sub: any) => (
          <div
            key={sub.id}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-orange-600" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 truncate">{sub.mess?.name ?? t.superAdmin.subscriptions.unknownMess}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {sub.mess?.owner?.full_name ?? "—"}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(new Date(sub.started_at), { addSuffix: true, locale: bn })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={cn(
                "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border",
                PLAN_COLORS[sub.plan?.slug ?? "free"]
              )}>
                {PLAN_ICONS[sub.plan?.slug ?? "free"]}
                {sub.plan?.name ?? t.superAdmin.subscriptions.free}
              </span>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                STATUS_COLORS[sub.status] ?? "bg-slate-100 text-slate-500"
              )}>
                {STATUS_LABELS[sub.status] ?? sub.status}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs"
              onClick={() => setAssignTarget(sub)}
            >
              {t.superAdmin.subscriptions.changeBtn}
            </Button>
          </div>
        ))}
      </div>

      {assignTarget && (
        <AssignDialog
          mess={assignTarget}
          plans={plans}
          currentPlanId={assignTarget.plan?.id ?? ""}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}
