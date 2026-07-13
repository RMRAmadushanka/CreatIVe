import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Check, CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import {
  cancelSubscription,
  createCheckout,
  formatLimit,
  formatPriceLkr,
  getMySubscription,
  listPlans,
  submitPayHereCheckout,
} from "@/services/billing.service";
import type { Plan } from "@/types/billing.types";

type BillingSearch = { status?: "success" | "cancel" | string };

export const Route = createFileRoute("/dashboard/billing")({
  validateSearch: (search: Record<string, unknown>): BillingSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: BillingPage,
});

function BillingPage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const plansQuery = useQuery({ queryKey: ["billing", "plans"], queryFn: listPlans });
  const subQuery = useQuery({ queryKey: ["billing", "me"], queryFn: getMySubscription });

  useEffect(() => {
    if (status === "success") {
      toast.success("Payment received — refreshing your plan…");
      void queryClient.invalidateQueries({ queryKey: ["billing", "me"] });
      void navigate({ to: "/dashboard/billing", search: {}, replace: true });
    } else if (status === "cancel") {
      toast.message("Checkout cancelled");
      void navigate({ to: "/dashboard/billing", search: {}, replace: true });
    }
  }, [status, queryClient, navigate]);

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) => createCheckout(planId),
    onSuccess: (payload) => {
      toast.message("Redirecting to PayHere…");
      submitPayHereCheckout(payload);
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

  const sub = subQuery.data;
  const plans = plansQuery.data ?? [];
  const currentPlanId = sub?.plan.id;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing & plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sri Lanka payments via PayHere (sandbox). Limits apply to projects, pages, media uploads,
          and builder components.
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
        <div className="rounded-xl border border-border/60 bg-card/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Current plan
              </div>
              <div className="mt-1 text-xl font-semibold">{sub.plan.name}</div>
              <div className="text-sm text-muted-foreground">
                {formatPriceLkr(sub.plan.priceLkr)} · status {sub.status}
                {sub.cancelAtPeriodEnd ? " · cancels at period end" : ""}
              </div>
            </div>
            {sub.plan.id !== "free" && !sub.cancelAtPeriodEnd && (
              <Button
                variant="outline"
                size="sm"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                Cancel at period end
              </Button>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <UsageStat
              label="Projects"
              value={`${sub.usage.projectsUsed} / ${formatLimit(sub.plan.maxProjects)}`}
            />
            <UsageStat
              label="Pages / project"
              value={formatLimit(sub.plan.maxPagesPerProject)}
            />
            <UsageStat
              label="Media uploads (month)"
              value={`${sub.usage.mediaUploadsThisMonth} / ${formatLimit(sub.plan.maxMediaUploadsMonth)}`}
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
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={plan.id === currentPlanId}
            busy={checkoutMutation.isPending}
            onUpgrade={() => checkoutMutation.mutate(plan.id)}
          />
        ))}
      </div>
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function PlanCard({
  plan,
  current,
  busy,
  onUpgrade,
}: {
  plan: Plan;
  current: boolean;
  busy: boolean;
  onUpgrade: () => void;
}) {
  const featured = plan.id === "pro";
  const features = [
    `${formatLimit(plan.maxProjects)} projects`,
    `${formatLimit(plan.maxPagesPerProject)} pages per project`,
    `${formatLimit(plan.maxMediaUploadsMonth)} media uploads / month`,
    plan.allBuilderComponents
      ? "All builder components"
      : `${plan.builderComponents.length} builder components`,
  ];

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border p-5",
        featured
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border/60 bg-card/50",
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
        {current ? (
          <Button className="w-full" variant="secondary" disabled>
            Current plan
          </Button>
        ) : plan.priceLkr <= 0 ? (
          <Button className="w-full" variant="outline" disabled>
            Included free
          </Button>
        ) : (
          <Button className="w-full" disabled={busy} onClick={onUpgrade}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Upgrade to ${plan.name}`}
          </Button>
        )}
      </div>
    </div>
  );
}
