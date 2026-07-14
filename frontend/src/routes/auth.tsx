import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/features/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    plan:
      typeof s.plan === "string" && ["free", "pro", "business"].includes(s.plan.toLowerCase())
        ? s.plan.toLowerCase()
        : undefined,
    mode: s.mode === "signup" || s.mode === "signin" ? s.mode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — PageLoom" },
      {
        name: "description",
        content: "Sign in or create an account to access PageLoom.",
      },
    ],
  }),
  component: AuthPage,
});
