import { createFileRoute } from "@tanstack/react-router";
import { Builder } from "@/features/builder";

export const Route = createFileRoute("/")({
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
