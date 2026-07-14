import { useEffect, useRef } from "react";
import { AlertTriangle, Check, CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import {
  cancelSubscription,
  classifyPlanChange,
  createCheckout,
  formatDate,
  formatLimit,
  formatPriceLkr,
  getMySubscription,
  listPlans,
  resumeSubscription,
  schedulePlanChange,
  submitPayHereCheckout,
} from "@/services/billing.service";
import type { Plan, PlanChangeKind, Subscription } from "@/types/billing.types";
import { clearPendingPlan, getPendingPlan, isPaidPlanId } from "@/lib/pending-plan";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type BillingSearch = {
  status?: "success" | "cancel" | string;
  checkout?: string;
};

export const Route = createFileRoute("/dashboard/billing")({
  validateSearch: (search: Record<string, unknown>): BillingSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    checkout:
      typeof search.checkout === "string" &&
      ["pro", "business"].includes(search.checkout.toLowerCase())
        ? search.checkout.toLowerCase()
        : undefined,
  }),
  component: BillingPage,
});

function BillingPage() {
  const { status, checkout } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const autoCheckoutStarted = useRef(false);

  const plansQuery = useQuery({ queryKey: ["billing", "plans"], queryFn: listPlans });
  const subQuery = useQuery({ queryKey: ["billing", "me"], queryFn: getMySubscription });

  useEffect(() => {
    if (status !== "success" && status !== "cancel") return;

    if (status === "cancel") {
      toast.message("Checkout cancelled — you can retry anytime from Billing");
      void navigate({ to: "/dashboard/billing", search: {}, replace: true });
      return;
    }

    // PayHere notify can arrive a few seconds after the browser return URL.
    // Poll until the plan upgrades off Free (or timeout).
    let cancelled = false;
    clearPendingPlan();
    toast.message("Payment received — confirming your plan…");

    const started = Date.now();
    const poll = async () => {
      while (!cancelled && Date.now() - started < 25_000) {
        try {
          await queryClient.invalidateQueries({ queryKey: ["billing", "me"] });
          const sub = await queryClient.fetchQuery({
            queryKey: ["billing", "me"],
            queryFn: getMySubscription,
          });
          if (sub.plan.id !== "free" && sub.status === "active") {
            toast.success(`You're on ${sub.plan.name}`);
            void navigate({ to: "/dashboard/billing", search: {}, replace: true });
            return;
          }
        } catch {
          // keep polling
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) {
        toast.message(
          "Payment may still be confirming — refresh Billing in a moment. If it stays Free, the PayHere notify callback may have failed.",
        );
        void navigate({ to: "/dashboard/billing", search: {}, replace: true });
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [status, queryClient, navigate]);

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) => createCheckout(planId),
    onSuccess: (payload) => {
      clearPendingPlan();
      toast.message("Redirecting to PayHere…");
      submitPayHereCheckout(payload);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // After signup with a paid plan selected on the home page, start checkout once.
  useEffect(() => {
    const planId = checkout ?? (isPaidPlanId(getPendingPlan()) ? getPendingPlan() : null);
    if (!planId || !subQuery.isSuccess || autoCheckoutStarted.current) return;
    if (subQuery.data?.plan.id === planId && subQuery.data.status === "active") {
      clearPendingPlan();
      void navigate({ to: "/dashboard/billing", search: {}, replace: true });
      return;
    }
    autoCheckoutStarted.current = true;
    toast.message(`Continuing with ${planId} plan…`);
    checkoutMutation.mutate(planId);
    void navigate({ to: "/dashboard/billing", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, subQuery.isSuccess, subQuery.data?.plan.id, subQuery.data?.status]);

  const scheduleMutation = useMutation({
    mutationFn: (planId: string) => schedulePlanChange(planId),
    onSuccess: async (sub) => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "me"] });
      toast.success(
        sub.pendingPlan
          ? `Scheduled switch to ${sub.pendingPlan.name} at period end`
          : "Plan change scheduled",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "me"] });
      toast.success("Cancellation scheduled — you keep access until period end");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resumeMutation = useMutation({
    mutationFn: resumeSubscription,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["billing", "me"] });
      toast.success("Scheduled change cancelled — your current plan continues");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sub = subQuery.data;
  const plans = plansQuery.data ?? [];
  const checkoutPlanId = checkoutMutation.isPending ? (checkoutMutation.variables ?? null) : null;
  const schedulePlanId = scheduleMutation.isPending ? (scheduleMutation.variables ?? null) : null;
  const anyActionBusy =
    checkoutMutation.isPending ||
    scheduleMutation.isPending ||
    cancelMutation.isPending ||
    resumeMutation.isPending;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing & plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upgrades apply immediately after PayHere payment. Downgrades and cancel take effect at
          period end — your data is never deleted.
        </p>
      </div>

      {subQuery.isLoading || plansQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading billing…
        </div>
      ) : subQuery.error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(subQuery.error as Error).message}
        </div>
      ) : sub ? (
        <CurrentPlanPanel
          sub={sub}
          busy={anyActionBusy}
          onCancel={() => cancelMutation.mutate()}
          onResume={() => resumeMutation.mutate()}
          onRenew={() => checkoutMutation.mutate(sub.plan.id)}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            sub={sub}
            loading={checkoutPlanId === plan.id || schedulePlanId === plan.id}
            disabled={anyActionBusy}
            onUpgrade={() => checkoutMutation.mutate(plan.id)}
            onRenew={() => checkoutMutation.mutate(plan.id)}
            onDowngrade={() => scheduleMutation.mutate(plan.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CurrentPlanPanel({
  sub,
  busy,
  onCancel,
  onResume,
  onRenew,
}: {
  sub: Subscription;
  busy: boolean;
  onCancel: () => void;
  onResume: () => void;
  onRenew: () => void;
}) {
  const pastDue = sub.status === "past_due";
  const hasSchedule = Boolean(sub.pendingPlan) || sub.cancelAtPeriodEnd;

  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        pastDue
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border/60 bg-card/60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            Current plan
          </div>
          <div className="mt-1 text-xl font-semibold">{sub.plan.name}</div>
          <div className="text-sm text-muted-foreground">
            {formatPriceLkr(sub.plan.priceLkr)}
            {sub.plan.id !== "free" && (
              <>
                {" "}
                · renews / ends {formatDate(sub.currentPeriodEnd)}
              </>
            )}
            {" · "}
            <span className="capitalize">{sub.status.replace("_", " ")}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {pastDue && sub.plan.id !== "free" && (
            <Button size="sm" disabled={busy} onClick={onRenew}>
              Pay & renew now
            </Button>
          )}
          {hasSchedule ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={onResume}>
              Keep current plan
            </Button>
          ) : (
            sub.plan.id !== "free" && (
              <Button variant="outline" size="sm" disabled={busy} onClick={onCancel}>
                Cancel at period end
              </Button>
            )
          )}
        </div>
      </div>

      {sub.changeHint && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>{sub.changeHint}</span>
        </div>
      )}

      {sub.overLimitWarnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          After the switch you will be over limit (soft lock — existing data kept):{" "}
          {sub.overLimitWarnings.join("; ")}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UsageStat
          label="Projects"
          value={`${sub.usage.projectsUsed} / ${formatLimit(sub.plan.maxProjects)}`}
          warn={
            sub.plan.maxProjects >= 0 && sub.usage.projectsUsed >= sub.plan.maxProjects
          }
        />
        <UsageStat label="Pages / project" value={formatLimit(sub.plan.maxPagesPerProject)} />
        <UsageStat
          label="Media uploads (month)"
          value={`${sub.usage.mediaUploadsThisMonth} / ${formatLimit(sub.plan.maxMediaUploadsMonth)}`}
          warn={
            sub.plan.maxMediaUploadsMonth >= 0 &&
            sub.usage.mediaUploadsThisMonth >= sub.plan.maxMediaUploadsMonth
          }
        />
        <UsageStat
          label="Builder components"
          value={
            sub.plan.allBuilderComponents
              ? "All"
              : `${sub.plan.builderComponents.length} included`
          }
        />
      </div>
    </div>
  );
}

function UsageStat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        warn
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-border/50 bg-background/40",
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function PlanCard({
  plan,
  sub,
  loading,
  disabled,
  onUpgrade,
  onRenew,
  onDowngrade,
}: {
  plan: Plan;
  sub?: Subscription;
  loading: boolean;
  disabled: boolean;
  onUpgrade: () => void;
  onRenew: () => void;
  onDowngrade: () => void;
}) {
  const featured = plan.id === "pro";
  const current = sub?.plan.id === plan.id;
  const kind: PlanChangeKind = sub ? classifyPlanChange(sub.plan, plan) : "upgrade";
  const pendingThis = sub?.pendingPlan?.id === plan.id;

  const features = [
    `${formatLimit(plan.maxProjects)} projects`,
    `${formatLimit(plan.maxPagesPerProject)} pages per project`,
    `${formatLimit(plan.maxMediaUploadsMonth)} media uploads / month`,
    plan.allBuilderComponents
      ? "All builder components"
      : `${plan.builderComponents.length} builder components`,
  ];

  let action: { label: string; onClick: () => void; variant?: "default" | "outline" | "secondary" } | null =
    null;

  if (current) {
    if (sub?.status === "past_due") {
      action = { label: "Pay & renew now", onClick: onRenew };
    } else if (
      plan.priceLkr > 0 &&
      sub?.currentPeriodEnd &&
      new Date(sub.currentPeriodEnd).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
    ) {
      action = { label: "Pay & renew early", onClick: onRenew, variant: "outline" };
    } else {
      action = { label: "Current plan", onClick: () => {}, variant: "secondary" };
    }
  } else if (pendingThis) {
    action = { label: "Scheduled", onClick: () => {}, variant: "secondary" };
  } else if (kind === "upgrade") {
    action = {
      label:
        plan.priceLkr > 0
          ? `Subscribe & pay — ${plan.name}`
          : `Upgrade to ${plan.name}`,
      onClick: onUpgrade,
    };
  } else if (kind === "downgrade") {
    action = {
      label: plan.priceLkr <= 0 ? "Switch to Free at period end" : `Downgrade to ${plan.name}`,
      onClick: onDowngrade,
      variant: "outline",
    };
  } else if (kind === "renew") {
    action = { label: "Renew & pay", onClick: onRenew };
  }

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border p-5",
        featured ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/60 bg-card/50",
        current && "ring-2 ring-primary/40",
      )}
    >
      {featured && (
        <div className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          <Sparkles className="h-3 w-3" /> Popular
        </div>
      )}
      <div className="text-lg font-semibold">{plan.name}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{formatPriceLkr(plan.priceLkr)}</div>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5">
        {action && (
          <Button
            className="w-full"
            variant={action.variant ?? "default"}
            disabled={
              disabled ||
              action.label === "Current plan" ||
              action.label === "Scheduled"
            }
            onClick={action.onClick}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : action.label}
          </Button>
        )}
        {kind === "downgrade" && !current && !pendingThis && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Takes effect at period end. No immediate charge.
          </p>
        )}
        {kind === "upgrade" && !current && plan.priceLkr > 0 && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Opens PayHere — plan activates right after payment.
          </p>
        )}
        {kind === "renew" && !current && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            PayHere checkout for another billing period.
          </p>
        )}
      </div>
    </div>
  );
}
