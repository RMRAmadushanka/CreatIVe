import { redirect } from "@tanstack/react-router";

import { authStore, useAuthStore, type AuthUser, type Role } from "@/store/auth-store";

/** Wait until the client has finished reading the Supabase session. */
function waitForAuthReady(timeoutMs = 8000): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  authStore.init();

  if (useAuthStore.getState().isReady) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const started = Date.now();

    const finishIfReady = () => {
      if (useAuthStore.getState().isReady) {
        resolve();
        return true;
      }
      return false;
    };

    if (finishIfReady()) return;

    const unsub = useAuthStore.subscribe((state) => {
      if (state.isReady) {
        unsub();
        clearInterval(interval);
        resolve();
      }
    });

    const interval = window.setInterval(() => {
      if (finishIfReady()) {
        unsub();
        clearInterval(interval);
      } else if (Date.now() - started > timeoutMs) {
        unsub();
        clearInterval(interval);
        reject(new Error("Auth timed out"));
      }
    }, 50);
  });
}

/** Ensure the user is signed in. Redirects to /auth if not. */
export async function requireAuth(options?: { returnTo?: string }): Promise<AuthUser | undefined> {
  // Auth is client-only (Supabase session lives in the browser).
  if (typeof window === "undefined") {
    return undefined;
  }

  await waitForAuthReady();
  const user = authStore.get();
  if (!user) {
    const returnTo = options?.returnTo;
    const safeReturn =
      returnTo && !returnTo.includes("/auth") ? returnTo : undefined;
    throw redirect({
      to: "/auth",
      search: { redirect: safeReturn, plan: undefined, mode: "signin" },
    });
  }
  return user;
}

/** Ensure the user is an administrator. Redirects non-admins to projects. */
export async function requireAdmin(): Promise<AuthUser | undefined> {
  const user = await requireAuth();
  if (!user) return undefined;
  if (user.role !== "admin") {
    throw redirect({ to: "/dashboard/projects" });
  }
  return user;
}

export function isAdmin(role: Role): boolean {
  return role === "admin";
}

export function canAccessProject(
  project: { ownerEmail: string },
  user: AuthUser,
): boolean {
  return user.role === "admin" || project.ownerEmail === user.email;
}
