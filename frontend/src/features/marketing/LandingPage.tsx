import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/constants/app";
import { PlanSelectCards } from "@/features/marketing/PlanSelectCards";
import { setPendingPlan } from "@/lib/pending-plan";
import type { Plan } from "@/types/billing.types";
import { CreditCard, Images, LayoutTemplate, Layers, Zap } from "lucide-react";
import type { ReactNode } from "react";

export function LandingPage() {
  const navigate = useNavigate();

  const choosePlan = (plan: Plan) => {
    setPendingPlan(plan.id);
    void navigate({
      to: "/auth",
      search: { redirect: undefined, plan: plan.id, mode: "signup" },
    });
  };

  return (
    <div className="bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="max-w-2xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Visual CMS for modern sites
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Build pages faster with {APP_NAME}
          </h1>
          <p className="text-base text-muted-foreground">
            Pick a plan, create your account, and start building. Drag-and-drop builder, media
            library, projects, and PayHere billing for Sri Lanka — all in one place.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href="#pricing">View plans</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">See features</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-border/60 bg-card/20">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Features</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Everything you need to design, manage assets, and publish project pages.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<LayoutTemplate className="h-5 w-5" />}
              title="Visual page builder"
              body="Compose sections, forms, carousels, and more with drag and drop."
            />
            <Feature
              icon={<Images className="h-5 w-5" />}
              title="Media library"
              body="Upload logos and images to Supabase Storage and reuse them across pages."
            />
            <Feature
              icon={<Layers className="h-5 w-5" />}
              title="Projects & pages"
              body="Organize multi-page sites with ownership and role-based access."
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Choose your plan</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Select a plan, then sign up. Free starts instantly. Pro and Business open PayHere so you
            can pay right after your account is created.
          </p>
          <div className="mt-8">
            <PlanSelectCards onSelect={choosePlan} />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-border/60 bg-card/20">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            <Step n="1" title="Pick a plan" body="Compare Free, Pro, and Business on this page." />
            <Step n="2" title="Create your account" body="Sign up — we remember the plan you chose." />
            <Step
              n="3"
              title="Pay on PayHere"
              body="Free is ready immediately. Pro and Business open PayHere so you can pay and activate."
            />
          </ol>
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            <CreditCard className="h-4 w-4 text-primary" />
            Local payments supported via PayHere (sandbox ready).
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="rounded-xl border border-border/60 bg-background/40 p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-primary">Step {n}</div>
      <h3 className="mt-2 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </li>
  );
}
