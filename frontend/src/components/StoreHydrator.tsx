import { useEffect, useState, type ReactNode } from "react";

import { hydrateStores } from "@/store/hydrate-stores";

/** Blocks children until Zustand stores have rehydrated from IndexedDB. */
export function StoreHydrator({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void hydrateStores().then(() => setReady(true));
  }, []);

  if (!ready) return null;
  return children;
}
