import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authStore, useAuth, useAuthReady } from "@/store/auth-store";
import { APP_NAME } from "@/constants/app";
import { LayoutTemplate, Images, CreditCard, ShieldCheck, Zap, Layers } from "lucide-react";

function resolvePostLoginTarget(redirect?: string): {
  to: "/dashboard" | "/" | "/media-library";
  search?: Record<string, string>;
} {
  if (!redirect) {
    return { to: "/dashboard" };
  }

  try {
    const url = new URL(redirect, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.startsWith("/auth")) {
      return { to: "/dashboard" };
    }

    const search = Object.fromEntries(url.searchParams.entries());
    const to = url.pathname as "/dashboard" | "/" | "/media-library";
    if (to !== "/" && to !== "/dashboard" && to !== "/media-library") {
      return { to: "/dashboard" };
    }

    return {
      to,
      search: Object.keys(search).length > 0 ? search : undefined,
    };
  } catch {
    return { to: "/dashboard" };
  }
}

export function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const user = useAuth();
  const authReady = useAuthReady();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const didRedirect = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);

  const goAfterLogin = () => {
    if (didRedirect.current) return;
    didRedirect.current = true;

    const target = resolvePostLoginTarget(redirect);
    if (target.to === "/") {
      void navigate({
        to: "/",
        search: {
          project: target.search?.project,
          page: target.search?.page,
        },
      });
      return;
    }

    void navigate({ to: target.to, search: target.search });
  };

  useEffect(() => {
    if (authReady && user && !busy) {
      goAfterLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user, busy]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === "signup" && !name)) {
      toast.error("Please fill in all fields");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        await authStore.signIn(email, password);
      } else {
        await authStore.signUp(name, email, password);
      }
      toast.success(mode === "signin" ? "Signed in" : "Account created");
      goAfterLogin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="bg-background text-foreground">
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Visual CMS for modern sites
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Build pages faster with {APP_NAME}
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Drag-and-drop builder, media library, projects, and monthly plans — made for teams that
            want to ship marketing pages without waiting on engineering.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={scrollToForm}>
              Get started free
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">See features</a>
            </Button>
          </div>
        </div>

        <div
          ref={formRef}
          className="rounded-2xl border border-border/60 bg-card/60 p-8 shadow-2xl backdrop-blur"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Sign in to use the page builder and dashboard.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
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
          <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Start free in Sri Lanka, then upgrade with PayHere when you need more projects, pages,
            and media uploads.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <PriceCard name="Free" price="LKR 0" detail="1 project · 3 pages · basic components" />
            <PriceCard name="Pro" price="LKR 2,990/mo" detail="10 projects · 20 pages · more components" featured />
            <PriceCard name="Business" price="LKR 7,990/mo" detail="100 projects · all components · unlimited media" />
          </div>
          <div className="mt-6">
            <Button onClick={scrollToForm}>Start on Free</Button>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-border/60 bg-card/20">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            <Step n="1" title="Create an account" body="Sign up and land on your Free plan instantly." />
            <Step n="2" title="Build your pages" body="Use the canvas builder and media library." />
            <Step n="3" title="Upgrade when ready" body="Unlock higher limits with PayHere billing." />
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

function PriceCard({
  name,
  price,
  detail,
  featured,
}: {
  name: string;
  price: string;
  detail: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        featured ? "border-primary/50 bg-primary/5" : "border-border/60 bg-background/40"
      }`}
    >
      <div className="text-sm font-semibold">{name}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{price}</div>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
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
