import { authorizedFetch } from "@/lib/api-client";
import { API_BASE_URL, API_ENDPOINTS } from "@/constants/api";
import type {
  CreateProjectRequest,
  Project,
  ReplacePagesRequest,
} from "@/types/project.types";

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Request failed (${res.status} ${res.statusText})${detail ? `: ${detail}` : ""}`,
    );
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export async function listProjects(): Promise<Project[]> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.projects}`, {
    requireAuth: true,
  });
  return parseOrThrow<Project[]>(res);
}

export async function getProject(id: string): Promise<Project> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.projectById(id)}`, {
    requireAuth: true,
  });
  return parseOrThrow<Project>(res);
}

export async function createProject(body: CreateProjectRequest): Promise<Project> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.projects}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    requireAuth: true,
  });
  return parseOrThrow<Project>(res);
}

export async function deleteProject(id: string): Promise<void> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.projectById(id)}`, {
    method: "DELETE",
    requireAuth: true,
  });
  await parseOrThrow<void>(res);
}

export async function addProjectPage(
  projectId: string,
  title: string,
  slug?: string,
): Promise<Project> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.projectPages(projectId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, slug }),
    requireAuth: true,
  });
  return parseOrThrow<Project>(res);
}

export async function deleteProjectPage(projectId: string, pageId: string): Promise<Project> {
  const res = await authorizedFetch(
    `${API_BASE_URL}${API_ENDPOINTS.projectPageById(projectId, pageId)}`,
    {
      method: "DELETE",
      requireAuth: true,
    },
  );
  return parseOrThrow<Project>(res);
}

export async function replaceProjectPages(
  projectId: string,
  body: ReplacePagesRequest,
): Promise<Project> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.projectPages(projectId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    requireAuth: true,
  });
  return parseOrThrow<Project>(res);
}
