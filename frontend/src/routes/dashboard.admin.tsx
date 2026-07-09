import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireAdmin } from "@/lib/auth-guards";

export const Route = createFileRoute("/dashboard/admin")({
  beforeLoad: () => requireAdmin(),
  component: () => <Outlet />,
});
