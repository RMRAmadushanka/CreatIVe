import { createFileRoute } from "@tanstack/react-router";
import { Builder } from "@/features/builder";
import { requireAuth } from "@/lib/auth-guards";

export const Route = createFileRoute("/")({
  beforeLoad: ({ location }) => requireAuth({ returnTo: location.href }),
  head: () => ({
    meta: [
      { title: "Canvas — Drag & Drop Page Builder" },
      {
        name: "description",
        content: "A modern dark-mode drag-and-drop web page builder workspace.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    project: typeof s.project === "string" ? s.project : undefined,
    page: typeof s.page === "string" ? s.page : undefined,
  }),
  component: Builder,
});
