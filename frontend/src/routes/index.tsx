import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageLoading } from "@/components/layout/PageLoading";
import { Builder } from "@/features/builder";
import { LandingPage } from "@/features/marketing/LandingPage";
import { useAuth, useAuthReady } from "@/store/auth-store";
import { APP_NAME } from "@/constants/app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Visual page builder` },
      {
        name: "description",
        content:
          "Choose a plan, sign up, and build pages with PageLoom — drag-and-drop CMS with PayHere billing.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    project: typeof s.project === "string" ? s.project : undefined,
    page: typeof s.page === "string" ? s.page : undefined,
  }),
  component: HomePage,
});

function HomePage() {
  const user = useAuth();
  const authReady = useAuthReady();

  if (!authReady) {
    return <PageLoading label="Loading…" />;
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <RequireAuth>
      <Builder />
    </RequireAuth>
  );
}
