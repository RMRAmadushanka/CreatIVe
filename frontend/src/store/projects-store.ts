import { useSyncExternalStore } from "react";

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

const KEY = "cms.projects";
const listeners = new Set<() => void>();

const seed = (): Project[] => [
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

let state: Project[] = (() => {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Project[];
  } catch {}
  const s = seed();
  window.localStorage.setItem(KEY, JSON.stringify(s));
  return s;
})();

function emit() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export const projectsStore = {
  getAll: () => state,
  getByOwner: (email: string) => state.filter((p) => p.ownerEmail === email),
  get: (id: string) => state.find((p) => p.id === id),
  create: (name: string, domain: string, ownerEmail: string, ownerName: string) => {
    const p: Project = {
      id: uid("p"),
      name,
      domain,
      ownerEmail,
      ownerName,
      createdAt: Date.now(),
      pages: [{ id: uid("pg"), title: "Home", slug: "/" }],
    };
    state = [p, ...state];
    emit();
    return p;
  },
  delete: (id: string) => {
    state = state.filter((p) => p.id !== id);
    emit();
  },
  addPage: (projectId: string, title: string) => {
    const slug =
      "/" +
      title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    state = state.map((p) =>
      p.id === projectId
        ? { ...p, pages: [...p.pages, { id: uid("pg"), title, slug: slug || "/page" }] }
        : p,
    );
    emit();
  },
  deletePage: (projectId: string, pageId: string) => {
    state = state.map((p) =>
      p.id === projectId ? { ...p, pages: p.pages.filter((pg) => pg.id !== pageId) } : p,
    );
    emit();
  },
  setPages: (projectId: string, pages: Page[]) => {
    let changed = false;
    state = state.map((p) => {
      if (p.id !== projectId) return p;
      if (JSON.stringify(p.pages) === JSON.stringify(pages)) return p;
      changed = true;
      return { ...p, pages };
    });
    if (changed) emit();
  },
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

export function useProjects() {
  return useSyncExternalStore(projectsStore.subscribe, projectsStore.getAll, () => [] as Project[]);
}

// -------- Users (admin) --------
export type PlatformUser = { id: string; name: string; email: string; role: "admin" | "user" };
const UKEY = "cms.users";
const uListeners = new Set<() => void>();
const seedUsers = (): PlatformUser[] => [
  { id: "u_1", name: "Admin Root", email: "admin@platform.io", role: "admin" },
  { id: "u_2", name: "Jane Cooper", email: "jane@northwind.shop", role: "user" },
  { id: "u_3", name: "Wade Warren", email: "wade@example.com", role: "user" },
  { id: "u_4", name: "Esther Howard", email: "esther@example.com", role: "user" },
  { id: "u_5", name: "Cameron W.", email: "cam@studio.dev", role: "admin" },
];

let users: PlatformUser[] = (() => {
  if (typeof window === "undefined") return seedUsers();
  try {
    const raw = window.localStorage.getItem(UKEY);
    if (raw) return JSON.parse(raw) as PlatformUser[];
  } catch {}
  const s = seedUsers();
  window.localStorage.setItem(UKEY, JSON.stringify(s));
  return s;
})();

function emitU() {
  if (typeof window !== "undefined") window.localStorage.setItem(UKEY, JSON.stringify(users));
  uListeners.forEach((l) => l());
}

export const usersStore = {
  getAll: () => users,
  setRole: (id: string, role: "admin" | "user") => {
    users = users.map((u) => (u.id === id ? { ...u, role } : u));
    emitU();
  },
  subscribe: (cb: () => void) => {
    uListeners.add(cb);
    return () => uListeners.delete(cb);
  },
};

export function usePlatformUsers() {
  return useSyncExternalStore(usersStore.subscribe, usersStore.getAll, () => [] as PlatformUser[]);
}
