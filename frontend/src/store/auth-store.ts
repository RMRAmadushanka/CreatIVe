import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";
import { create } from "zustand";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { syncAuthUser } from "@/services/auth.service";

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
  refreshFromBackend: () => Promise<AuthUser | null>;
};

function mapSessionToUser(session: Session | null): AuthUser | null {
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
    role: "user",
  };
}

async function mergeBackendRole(base: AuthUser): Promise<AuthUser> {
  try {
    const apiUser = await syncAuthUser();
    if (!apiUser) return base;
    return {
      id: apiUser.id,
      name: apiUser.name,
      email: apiUser.email,
      role: apiUser.role,
    };
  } catch {
    return base;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isReady: false,
  initialized: false,

  init: () => {
    if (get().initialized || typeof window === "undefined") return;
    set({ initialized: true });

    if (!isSupabaseConfigured) {
      set({ isReady: true });
      return;
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      const base = mapSessionToUser(data.session);
      const user = base ? await mergeBackendRole(base) : null;
      set({ user, isReady: true });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        const base = mapSessionToUser(session);
        const user = base ? await mergeBackendRole(base) : null;
        set({ user, isReady: true });
      })();
    });
  },

  refreshFromBackend: async () => {
    const current = get().user;
    if (!current) return null;
    const updated = await mergeBackendRole(current);
    set({ user: updated });
    return updated;
  },

  signUp: async (name, email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase is not configured. Add credentials to frontend/.env");
    }
    const { data: result, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    if (!result.session) {
      throw new Error("Check your email to confirm your account before signing in.");
    }
    const base = mapSessionToUser(result.session)!;
    const mapped = await mergeBackendRole(base);
    set({ user: mapped, isReady: true });
    return mapped;
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase is not configured. Add credentials to frontend/.env");
    }
    const { data: result, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const base = mapSessionToUser(result.session)!;
    const mapped = await mergeBackendRole(base);
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
  init: () => useAuthStore.getState().init(),
  signUp: (...args: Parameters<AuthState["signUp"]>) => useAuthStore.getState().signUp(...args),
  signIn: (...args: Parameters<AuthState["signIn"]>) => useAuthStore.getState().signIn(...args),
  signOut: () => useAuthStore.getState().signOut(),
  getAccessToken: () => useAuthStore.getState().getAccessToken(),
  refreshFromBackend: () => useAuthStore.getState().refreshFromBackend(),
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

export function useIsAdmin(): boolean {
  return useAuthStore((s) => s.user?.role === "admin");
}
