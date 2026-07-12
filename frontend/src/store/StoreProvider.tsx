import { useEffect, useState, type ReactNode } from "react";

import { PageLoading } from "@/components/layout/PageLoading";
import { authStore, useAuthStore } from "@/store/auth-store";
import { useBuilderStore } from "@/store/builder-store";
import { useMediaStore } from "@/store/media-store";
import { useUsersStore } from "@/store/users-store";

const persistedStores = [useUsersStore, useBuilderStore] as const;

/** Load persisted Zustand state from IndexedDB before rendering the app. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const authReady = useAuthStore((s) => s.isReady);

  useEffect(() => {
    authStore.init();
    void Promise.all(persistedStores.map((store) => store.persist.rehydrate())).then(() =>
      setReady(true),
    );
  }, []);

  // Load media from the API when the signed-in user changes; clear on logout.
  useEffect(() => {
    if (!authReady || !ready) return;
    if (!userId) {
      useMediaStore.getState().reset();
      return;
    }
    void useMediaStore.getState().load().catch(() => {
      // Surface via store.error; pages can show toast if needed.
    });
  }, [authReady, ready, userId]);

  if (!ready) {
    return <PageLoading label="Loading your workspace…" />;
  }

  return children;
}
