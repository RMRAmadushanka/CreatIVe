import { useSyncExternalStore } from "react";

export type Role = "admin" | "user";
export type AuthUser = { name: string; email: string; role: Role };

const KEY = "cms.auth.user";
const listeners = new Set<() => void>();
let current: AuthUser | null = null;

if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) current = JSON.parse(raw) as AuthUser;
  } catch {
    current = null;
  }
}

function emit() {
  if (typeof window !== "undefined") {
    if (current) window.localStorage.setItem(KEY, JSON.stringify(current));
    else window.localStorage.removeItem(KEY);
  }
  listeners.forEach((l) => l());
}

export const authStore = {
  get: () => current,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  signIn: (email: string, _password: string) => {
    const role: Role = email.toLowerCase().startsWith("admin") ? "admin" : "user";
    const name = email.split("@")[0] || "User";
    current = { name, email, role };
    emit();
    return current;
  },
  signUp: (name: string, email: string, _password: string) => {
    const role: Role = email.toLowerCase().startsWith("admin") ? "admin" : "user";
    current = { name, email, role };
    emit();
    return current;
  },
  signOut: () => {
    current = null;
    emit();
  },
};

export function useAuth() {
  return useSyncExternalStore(authStore.subscribe, authStore.get, () => null);
}
