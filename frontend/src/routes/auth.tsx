import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/features/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CMS" },
      {
        name: "description",
        content: "Sign in or create an account to access the multi-tenant CMS dashboard.",
      },
      { property: "og:title", content: "Sign in — CMS" },
      { property: "og:description", content: "Access your multi-tenant CMS workspace." },
    ],
  }),
  component: AuthPage,
});
