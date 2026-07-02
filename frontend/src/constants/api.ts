export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const API_ENDPOINTS = {
  pages: "/api/pages",
  pageBySlug: (slug: string) => `/api/pages/${encodeURIComponent(slug)}`,
} as const;
