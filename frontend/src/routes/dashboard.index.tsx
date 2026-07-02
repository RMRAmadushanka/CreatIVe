import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/store/auth-store";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const user = useAuth();
  if (!user) return null;
  return (
    <Navigate
      to={user.role === "admin" ? "/dashboard/admin/users" : "/dashboard/projects"}
      replace
    />
  );
}
