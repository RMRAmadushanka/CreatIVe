import { create } from "zustand";

import {
  addProjectPage,
  createProject,
  deleteProject,
  deleteProjectPage,
  listProjects,
  replaceProjectPages,
} from "@/services/project.service";
import type { Project, ProjectPage } from "@/types/project.types";

export type Page = ProjectPage;
export type { Project };

type ProjectsState = {
  projects: Project[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (name: string, domain: string) => Promise<Project>;
  delete: (id: string) => Promise<void>;
  addPage: (projectId: string, title: string) => Promise<Project>;
  deletePage: (projectId: string, pageId: string) => Promise<Project>;
  setPages: (projectId: string, pages: Page[]) => Promise<Project>;
  /** Update pages in memory only (builder live edits). */
  patchLocalPages: (projectId: string, pages: Page[]) => void;
  getByOwner: (email: string) => Project[];
  get: (id: string) => Project | undefined;
  upsert: (project: Project) => void;
};

function upsertProject(list: Project[], project: Project): Project[] {
  const idx = list.findIndex((p) => p.id === project.id);
  if (idx === -1) return [project, ...list];
  const next = [...list];
  next[idx] = project;
  return next;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  loaded: false,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await listProjects();
      set({ projects, loaded: true, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load projects",
      });
      throw error;
    }
  },

  create: async (name, domain) => {
    const project = await createProject({ name, domain });
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  delete: async (id) => {
    await deleteProject(id);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },

  addPage: async (projectId, title) => {
    const project = await addProjectPage(projectId, title);
    set((s) => ({ projects: upsertProject(s.projects, project) }));
    return project;
  },

  deletePage: async (projectId, pageId) => {
    const project = await deleteProjectPage(projectId, pageId);
    set((s) => ({ projects: upsertProject(s.projects, project) }));
    return project;
  },

  setPages: async (projectId, pages) => {
    const project = await replaceProjectPages(projectId, {
      pages: pages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        canvasNodes: p.canvasNodes ?? [],
      })),
    });
    set((s) => ({ projects: upsertProject(s.projects, project) }));
    return project;
  },

  patchLocalPages: (projectId, pages) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, pages } : p)),
    })),

  getByOwner: (email) =>
    get().projects.filter((p) => p.ownerEmail.toLowerCase() === email.toLowerCase()),

  get: (id) => get().projects.find((p) => p.id === id),

  upsert: (project) => set((s) => ({ projects: upsertProject(s.projects, project) })),
}));

export const projectsStore = {
  load: () => useProjectsStore.getState().load(),
  getAll: () => useProjectsStore.getState().projects,
  getByOwner: (email: string) => useProjectsStore.getState().getByOwner(email),
  get: (id: string) => useProjectsStore.getState().get(id),
  create: (name: string, domain: string) => useProjectsStore.getState().create(name, domain),
  delete: (id: string) => useProjectsStore.getState().delete(id),
  addPage: (projectId: string, title: string) =>
    useProjectsStore.getState().addPage(projectId, title),
  deletePage: (projectId: string, pageId: string) =>
    useProjectsStore.getState().deletePage(projectId, pageId),
  setPages: (projectId: string, pages: Page[]) =>
    useProjectsStore.getState().setPages(projectId, pages),
  patchLocalPages: (projectId: string, pages: Page[]) =>
    useProjectsStore.getState().patchLocalPages(projectId, pages),
};

export function useProjects() {
  return useProjectsStore((s) => s.projects);
}

export function useProjectsLoading() {
  return useProjectsStore((s) => s.loading);
}
