import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";
import { create } from "zustand";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type Role = "admin" | "user";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type AuthState = {
  user: AuthUser | null;
  isReady: boolean;
  initialized: boolean;
  init: () => void;
  signUp: (name: string, email: string, password: string) => Promise<AuthUser>;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isReady: typeof window === "undefined",
  initialized: false,

  init: () => {
    if (get().initialized || typeof window === "undefined") return;
    set({ initialized: true });

    if (!isSupabaseConfigured) {
      set({ isReady: true });
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      set({ user: mapSessionToUser(data.session), isReady: true });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: mapSessionToUser(session), isReady: true });
    });
  },

  signUp: async (name, email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase is not configured. Add credentials to frontend/.env");
    }
    const role: Role = email.toLowerCase().startsWith("admin") ? "admin" : "user";
    const { data: result, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) throw error;
    if (!result.session) {
      throw new Error("Check your email to confirm your account before signing in.");
    }
    const mapped = mapSessionToUser(result.session)!;
    set({ user: mapped, isReady: true });
    return mapped;
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase is not configured. Add credentials to frontend/.env");
    }
    const { data: result, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const mapped = mapSessionToUser(result.session)!;
    set({ user: mapped, isReady: true });
    return mapped;
  },

  signOut: async () => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null });
  },

  getAccessToken: async () => {
    if (!isSupabaseConfigured) return null;
    const { data: result } = await supabase.auth.getSession();
    return result.session?.access_token ?? null;
  },
}));

/** Imperative API for api-client and legacy imports. */
export const authStore = {
  get: () => {
    useAuthStore.getState().init();
    return useAuthStore.getState().user;
  },
  isReady: () => {
    useAuthStore.getState().init();
    return useAuthStore.getState().isReady;
  },
  signUp: (...args: Parameters<AuthState["signUp"]>) => useAuthStore.getState().signUp(...args),
  signIn: (...args: Parameters<AuthState["signIn"]>) => useAuthStore.getState().signIn(...args),
  signOut: () => useAuthStore.getState().signOut(),
  getAccessToken: () => useAuthStore.getState().getAccessToken(),
};

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return user;
}

export function useAuthReady() {
  const isReady = useAuthStore((s) => s.isReady);
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return isReady;
}
