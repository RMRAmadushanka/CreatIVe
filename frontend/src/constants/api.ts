export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const API_ENDPOINTS = {
  pages: "/api/pages",
  pageBySlug: (slug: string) => `/api/pages/${encodeURIComponent(slug)}`,
  pageById: (id: string) => `/api/pages/${encodeURIComponent(id)}`,
  authMe: "/api/auth/me",
  authSync: "/api/auth/sync",
  adminUsers: "/api/admin/users",
  adminUserRole: (id: string) => `/api/admin/users/${encodeURIComponent(id)}/role`,
} as const;
