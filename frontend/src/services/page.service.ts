import { authorizedFetch } from "@/lib/api-client";
import { API_BASE_URL, API_ENDPOINTS } from "@/constants/api";
import type { CreatePageRequest, Page } from "@/types/page.types";

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Request failed (${res.status} ${res.statusText})${detail ? `: ${detail}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

export async function createPage(body: CreatePageRequest): Promise<Page> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.pages}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    requireAuth: true,
  });
  return parseOrThrow<Page>(res);
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.pageBySlug(slug)}`);
  if (res.status === 404) {
    return null;
  }
  return parseOrThrow<Page>(res);
}
