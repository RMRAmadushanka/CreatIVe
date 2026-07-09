import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authStore, useAuth, useAuthReady } from "@/store/auth-store";
import { ShieldCheck } from "lucide-react";

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

  // If already signed in (e.g. returned to /auth by mistake), go to app once.
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
      const signedInUser =
        mode === "signin"
          ? await authStore.signIn(email, password)
          : await authStore.signUp(name, email, password);

      toast.success(`Welcome, ${signedInUser.name}!`, {
        description: `Signed in as ${signedInUser.role}`,
      });
      goAfterLogin();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/60 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
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
    </div>
  );
}
