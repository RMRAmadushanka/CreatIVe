import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { PageLoading } from "@/components/layout/PageLoading";
import { useAuth, useAuthReady } from "@/store/auth-store";

/**
 * Client-side gate: waits for Supabase session, then either
 * renders children or redirects to /auth.
 * Needed because SSR cannot read the browser session.
 */
export function RequireAuth({
  children,
  returnTo,
}: {
  children: ReactNode;
  returnTo?: string;
}) {
  const navigate = useNavigate();
  const user = useAuth();
  const ready = useAuthReady();

  useEffect(() => {
    if (!ready || user) return;
    void navigate({
      to: "/auth",
      search: {
        redirect:
          returnTo && !returnTo.includes("/auth")
            ? returnTo
            : typeof window !== "undefined"
              ? window.location.href
              : undefined,
      },
      replace: true,
    });
  }, [ready, user, navigate, returnTo]);

  if (!ready) {
    return <PageLoading label="Checking session…" />;
  }

  if (!user) {
    return <PageLoading label="Redirecting to sign in…" />;
  }

  return children;
}
