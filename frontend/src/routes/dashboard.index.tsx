import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PageLoading } from "@/components/layout/PageLoading";
import { useAuth, useAuthReady } from "@/store/auth-store";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const user = useAuth();
  const authReady = useAuthReady();

  if (!user) {
    return <PageLoading label={authReady ? "Opening dashboard…" : "Loading…"} />;
  }

  return (
    <Navigate
      to={user.role === "admin" ? "/dashboard/admin/users" : "/dashboard/projects"}
      replace
    />
  );
}
