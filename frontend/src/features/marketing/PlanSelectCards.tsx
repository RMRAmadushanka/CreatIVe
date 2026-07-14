import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatLimit, formatPriceLkr, listPlans } from "@/services/billing.service";
import type { Plan } from "@/types/billing.types";

const PLAN_BLURBS: Record<string, { tagline: string; bestFor: string; extras: string[] }> = {
  free: {
    tagline: "Try CreatIVe with no card required",
    bestFor: "Solo experiments & first landing pages",
    extras: [
      "Core layout & content blocks",
      "Image & button components",
      "1 workspace project",
      "Community-ready starter limits",
    ],
  },
  pro: {
    tagline: "For freelancers and growing sites",
    bestFor: "Agencies & marketers shipping regularly",
    extras: [
      "Forms, accordion, tabs & nav header",
      "Feature cards & footer blocks",
      "Higher media upload quota",
      "PayHere monthly checkout (LKR)",
    ],
  },
  business: {
    tagline: "Full component set for serious teams",
    bestFor: "Multi-page brands & larger catalogs",
    extras: [
      "All builder components (incl. carousels)",
      "Highest project & page limits",
      "Unlimited media uploads / month",
      "Priority-ready production workspaces",
    ],
  },
};

function humanComponentLabel(type: string): string {
  const map: Record<string, string> = {
    section: "Section container",
    fullSection: "Full-width section",
    row: "Flex row",
    grid: "Grid layout",
    heading: "Heading",
    richText: "Rich text",
    text: "Text block",
    image: "Image",
    button: "Button",
    icon: "Icon",
    form: "Contact form",
    accordion: "Accordion / FAQ",
    tabs: "Tabs",
    navbar: "Navigation header",
    featureCard: "Feature card",
    card: "Card",
    footer: "Footer",
    carousel: "Hero carousel",
    imageCarousel: "Image carousel",
  };
  return map[type] ?? type;
}

export function PlanSelectCards({
  onSelect,
  selectedPlanId,
  ctaLabel,
}: {
  onSelect: (plan: Plan) => void;
  selectedPlanId?: string | null;
  ctaLabel?: (plan: Plan) => string;
}) {
  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: listPlans,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading plans…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {plans.map((plan) => (
        <MarketingPlanCard
          key={plan.id}
          plan={plan}
          selected={selectedPlanId === plan.id}
          onSelect={() => onSelect(plan)}
          cta={ctaLabel?.(plan)}
        />
      ))}
    </div>
  );
}

function MarketingPlanCard({
  plan,
  selected,
  onSelect,
  cta,
}: {
  plan: Plan;
  selected?: boolean;
  onSelect: () => void;
  cta?: string;
}) {
  const meta = PLAN_BLURBS[plan.id] ?? {
    tagline: plan.name,
    bestFor: "CreatIVe workspaces",
    extras: [],
  };
  const featured = plan.id === "pro";
  const limits = [
    { label: "Projects", value: formatLimit(plan.maxProjects) },
    { label: "Pages per project", value: formatLimit(plan.maxPagesPerProject) },
    { label: "Media uploads / month", value: formatLimit(plan.maxMediaUploadsMonth) },
    {
      label: "Builder components",
      value: plan.allBuilderComponents
        ? "All components"
        : `${plan.builderComponents.length} included`,
    },
  ];

  const componentPreview = plan.allBuilderComponents
    ? ["Hero carousel", "Image carousel", "Forms", "Nav", "Cards", "…and everything else"]
    : plan.builderComponents.slice(0, 6).map(humanComponentLabel);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6",
        featured
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border/60 bg-background/40",
        selected && "ring-2 ring-primary",
      )}
    >
      {featured && (
        <div className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          <Sparkles className="h-3 w-3" /> Most popular
        </div>
      )}

      <div className="text-lg font-semibold">{plan.name}</div>
      <p className="mt-1 text-sm text-muted-foreground">{meta.tagline}</p>
      <div className="mt-4 text-3xl font-bold tracking-tight">{formatPriceLkr(plan.priceLkr)}</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Billed {plan.billingInterval === "month" ? "monthly" : plan.billingInterval} · LKR via PayHere
      </p>
      <p className="mt-3 text-sm">
        <span className="font-medium text-foreground">Best for:</span>{" "}
        <span className="text-muted-foreground">{meta.bestFor}</span>
      </p>

      <div className="mt-5 space-y-2 border-t border-border/50 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Limits
        </div>
        {limits.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2 border-t border-border/50 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Includes
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {meta.extras.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 space-y-2 border-t border-border/50 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Builder access
        </div>
        <p className="text-sm text-muted-foreground">
          {componentPreview.join(" · ")}
          {!plan.allBuilderComponents && plan.builderComponents.length > 6
            ? ` · +${plan.builderComponents.length - 6} more`
            : ""}
        </p>
      </div>

      <Button className="mt-6 w-full" variant={featured ? "default" : "outline"} onClick={onSelect}>
        {cta ??
          (plan.priceLkr <= 0
            ? "Start free — create account"
            : `Choose ${plan.name} — continue to signup`)}
      </Button>
    </div>
  );
}
