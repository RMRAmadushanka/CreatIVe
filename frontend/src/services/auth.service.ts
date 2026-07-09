import { authorizedFetch } from "@/lib/api-client";
import { API_BASE_URL, API_ENDPOINTS } from "@/constants/api";
import type { ApiUser } from "@/types/user.types";

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Request failed (${res.status} ${res.statusText})${detail ? `: ${detail}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

/** Sync Supabase session with backend user record (role comes from database). */
export async function syncAuthUser(): Promise<ApiUser | null> {
  const token = await import("@/store/auth-store").then((m) => m.authStore.getAccessToken());
  if (!token) return null;

  try {
    const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.authSync}`, {
      method: "POST",
      requireAuth: true,
    });
    return parseOrThrow<ApiUser>(res);
  } catch {
    // Backend may be offline or JWT not configured — keep Supabase session.
    return null;
  }
}

export async function getAuthUser(): Promise<ApiUser | null> {
  const token = await import("@/store/auth-store").then((m) => m.authStore.getAccessToken());
  if (!token) return null;

  try {
    const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.authMe}`, {
      requireAuth: true,
    });
    return parseOrThrow<ApiUser>(res);
  } catch {
    return null;
  }
}
