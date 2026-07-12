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

export async function listPlatformUsers(): Promise<ApiUser[]> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.adminUsers}`, {
    requireAuth: true,
  });
  return parseOrThrow<ApiUser[]>(res);
}

export async function setUserRole(id: string, role: "admin" | "user"): Promise<ApiUser> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.adminUserRole(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
    requireAuth: true,
  });
  return parseOrThrow<ApiUser>(res);
}
