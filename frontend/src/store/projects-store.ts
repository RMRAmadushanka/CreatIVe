import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { createIndexedDBStorage } from "@/lib/indexeddb-storage";

export type Page = { id: string; title: string; slug: string; canvasNodes?: unknown[] };

export type Project = {
  id: string;
  name: string;
  domain: string;
  ownerEmail: string;
  ownerName: string;
  pages: Page[];
  createdAt: number;
};

const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const seedProjects = (): Project[] => [
  {
    id: "p_acme",
    name: "Acme Marketing Site",
    domain: "acme.com",
    ownerEmail: "user@acme.com",
    ownerName: "user",
    createdAt: Date.now() - 86400000 * 5,
    pages: [
      { id: "pg_1", title: "Home", slug: "/" },
      { id: "pg_2", title: "About", slug: "/about" },
      { id: "pg_3", title: "Contact", slug: "/contact" },
    ],
  },
  {
    id: "p_blog",
    name: "Personal Blog",
    domain: "myblog.io",
    ownerEmail: "user@acme.com",
    ownerName: "user",
    createdAt: Date.now() - 86400000 * 2,
    pages: [{ id: "pg_4", title: "Home", slug: "/" }],
  },
  {
    id: "p_shop",
    name: "Northwind Store",
    domain: "northwind.shop",
    ownerEmail: "jane@northwind.shop",
    ownerName: "Jane Cooper",
    createdAt: Date.now() - 86400000 * 10,
    pages: [
      { id: "pg_5", title: "Home", slug: "/" },
      { id: "pg_6", title: "Products", slug: "/products" },
    ],
  },
];

type ProjectsState = {
  projects: Project[];
  create: (name: string, domain: string, ownerEmail: string, ownerName: string) => Project;
  delete: (id: string) => void;
  addPage: (projectId: string, title: string) => void;
  deletePage: (projectId: string, pageId: string) => void;
  setPages: (projectId: string, pages: Page[]) => void;
  getByOwner: (email: string) => Project[];
  get: (id: string) => Project | undefined;
};

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: seedProjects(),

      create: (name, domain, ownerEmail, ownerName) => {
        const project: Project = {
          id: uid("p"),
          name,
          domain,
          ownerEmail,
          ownerName,
          createdAt: Date.now(),
          pages: [{ id: uid("pg"), title: "Home", slug: "/" }],
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },

      delete: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      addPage: (projectId, title) => {
        const slug =
          "/" +
          title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, pages: [...p.pages, { id: uid("pg"), title, slug: slug || "/page" }] }
              : p,
          ),
        }));
      },

      deletePage: (projectId, pageId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, pages: p.pages.filter((pg) => pg.id !== pageId) } : p,
          ),
        })),

      setPages: (projectId, pages) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === projectId ? { ...p, pages } : p)),
        })),

      getByOwner: (email) => get().projects.filter((p) => p.ownerEmail === email),

      get: (id) => get().projects.find((p) => p.id === id),
    }),
    {
      name: "cms.projects",
      storage: createJSONStorage(() => createIndexedDBStorage()),
      skipHydration: true,
      partialize: (state) => ({ projects: state.projects }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<ProjectsState>),
        projects:
          (persisted as ProjectsState | undefined)?.projects?.length
            ? (persisted as ProjectsState).projects
            : current.projects,
      }),
    },
  ),
);

/** Imperative API for non-React code (builder save, etc.). */
export const projectsStore = {
  getAll: () => useProjectsStore.getState().projects,
  getByOwner: (email: string) => useProjectsStore.getState().getByOwner(email),
  get: (id: string) => useProjectsStore.getState().get(id),
  create: (...args: Parameters<ProjectsState["create"]>) =>
    useProjectsStore.getState().create(...args),
  delete: (id: string) => useProjectsStore.getState().delete(id),
  addPage: (...args: Parameters<ProjectsState["addPage"]>) =>
    useProjectsStore.getState().addPage(...args),
  deletePage: (...args: Parameters<ProjectsState["deletePage"]>) =>
    useProjectsStore.getState().deletePage(...args),
  setPages: (...args: Parameters<ProjectsState["setPages"]>) =>
    useProjectsStore.getState().setPages(...args),
};

export function useProjects() {
  return useProjectsStore((s) => s.projects);
}
