import { useEffect, useState, type ReactNode } from "react";

import { PageLoading } from "@/components/layout/PageLoading";
import { authStore } from "@/store/auth-store";
import { useBuilderStore } from "@/store/builder-store";
import { useMediaStore } from "@/store/media-store";
import { useUsersStore } from "@/store/users-store";

const persistedStores = [useUsersStore, useMediaStore, useBuilderStore] as const;

/** Load persisted Zustand state from IndexedDB before rendering the app. */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    authStore.init();
    void Promise.all(persistedStores.map((store) => store.persist.rehydrate())).then(() =>
      setReady(true),
    );
  }, []);

  if (!ready) {
    return <PageLoading label="Loading your workspace…" />;
  }

  return children;
}
