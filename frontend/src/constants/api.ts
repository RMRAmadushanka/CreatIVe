export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const API_ENDPOINTS = {
  pages: "/api/pages",
  pageBySlug: (slug: string) => `/api/pages/${encodeURIComponent(slug)}`,
  pageById: (id: string) => `/api/pages/${encodeURIComponent(id)}`,
  projects: "/api/projects",
  projectById: (id: string) => `/api/projects/${encodeURIComponent(id)}`,
  projectPages: (id: string) => `/api/projects/${encodeURIComponent(id)}/pages`,
  projectPageById: (projectId: string, pageId: string) =>
    `/api/projects/${encodeURIComponent(projectId)}/pages/${encodeURIComponent(pageId)}`,
  media: "/api/media",
  mediaById: (id: string) => `/api/media/${encodeURIComponent(id)}`,
  authMe: "/api/auth/me",
  authSync: "/api/auth/sync",
  adminUsers: "/api/admin/users",
  adminUserRole: (id: string) => `/api/admin/users/${encodeURIComponent(id)}/role`,
} as const;
