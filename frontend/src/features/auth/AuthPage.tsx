import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authStore, useAuth } from "@/store/auth-store";
import { ShieldCheck } from "lucide-react";

export function AuthPage() {
  const navigate = useNavigate();
  const user = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === "signup" && !name)) {
      toast.error("Please fill in all fields");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    const u =
      mode === "signin"
        ? authStore.signIn(email, password)
        : authStore.signUp(name, email, password);
    setBusy(false);
    toast.success(`Welcome, ${u.name}!`, { description: `Signed in as ${u.role}` });
    navigate({ to: "/dashboard" });
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
              {mode === "signin"
                ? "Sign in to your workspace"
                : "Get started with the CMS in seconds"}
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
              placeholder="admin@acme.com"
              autoComplete="email"
            />
            <p className="text-[11px] text-muted-foreground">
              Tip: emails starting with <code className="rounded bg-muted px-1">admin</code> sign in
              as Admin.
            </p>
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
              Don't have an account?{" "}
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

        <div className="mt-4 text-center">
          <Link
            to="/"
            search={{ project: undefined, page: undefined }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
