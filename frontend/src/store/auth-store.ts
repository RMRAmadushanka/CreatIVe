import type { Session } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";

import { supabase } from "@/lib/supabase";

export type Role = "admin" | "user";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const listeners = new Set<() => void>();
let currentUser: AuthUser | null = null;
let authReady = false;
let initialized = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function readRole(metadata: Record<string, unknown> | undefined): Role {
  const role = metadata?.role;
  return role === "admin" ? "admin" : "user";
}

export function mapSessionToUser(session: Session | null): AuthUser | null {
  const user = session?.user;
  if (!user) return null;

  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const name =
    (typeof metadata?.name === "string" && metadata.name) ||
    user.email?.split("@")[0] ||
    "User";

  return {
    id: user.id,
    name,
    email: user.email ?? "",
    role: readRole(metadata),
  };
}

function setSession(session: Session | null) {
  currentUser = mapSessionToUser(session);
  authReady = true;
  emit();
}

function ensureAuthListener() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  supabase.auth.getSession().then(({ data }) => setSession(data.session));
  supabase.auth.onAuthStateChange((_event, session) => setSession(session));
}

export const authStore = {
  get: () => currentUser,
  isReady: () => {
    if (typeof window === "undefined") return true;
    ensureAuthListener();
    return authReady;
  },
  subscribe: (callback: () => void) => {
    ensureAuthListener();
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
  signUp: async (name: string, email: string, password: string) => {
    const role: Role = email.toLowerCase().startsWith("admin") ? "admin" : "user";
    const { data: result, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });
    if (error) throw error;
    if (!result.session) {
      throw new Error("Check your email to confirm your account before signing in.");
    }
    return mapSessionToUser(result.session)!;
  },
  signIn: async (email: string, password: string) => {
    const { data: result, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return mapSessionToUser(result.session)!;
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  getAccessToken: async () => {
    const { data: result } = await supabase.auth.getSession();
    return result.session?.access_token ?? null;
  },
};

export function useAuth() {
  return useSyncExternalStore(authStore.subscribe, authStore.get, () => null);
}

export function useAuthReady() {
  return useSyncExternalStore(
    authStore.subscribe,
    authStore.isReady,
    () => true,
  );
}
