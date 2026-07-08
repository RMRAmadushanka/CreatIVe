import { get, set } from "idb-keyval";

import { migrateLocalStorageToIndexedDB } from "@/lib/indexeddb-storage";
import { useBuilderStore } from "@/store/builder-store";
import { useMediaStore } from "@/store/media-store";
import { useProjectsStore } from "@/store/projects-store";
import { useUsersStore } from "@/store/users-store";

type PersistEnvelope<T> = { state: T; version: number };

async function migrateRawArrayToPersist<T extends Record<string, unknown>>(
  key: string,
  localKey: string,
  stateKey: keyof T,
): Promise<void> {
  if (typeof window === "undefined") return;

  const wrap = (raw: unknown) =>
    set(key, JSON.stringify({ state: { [stateKey]: raw } as T, version: 0 } satisfies PersistEnvelope<T>));

  const existing = await get<string>(key);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as unknown;
      if (Array.isArray(parsed)) await wrap(parsed);
    } catch {
      /* keep */
    }
    return;
  }

  const fromLocal = window.localStorage.getItem(localKey);
  if (!fromLocal) return;

  try {
    const parsed = JSON.parse(fromLocal) as unknown;
    if (Array.isArray(parsed)) {
      await wrap(parsed);
    } else {
      await set(key, fromLocal);
    }
  } catch {
    await set(key, fromLocal);
  }
  window.localStorage.removeItem(localKey);
}

async function migrateStandaloneBuilderLayout(): Promise<void> {
  await migrateRawArrayToPersist("canvas-builder:layout", "canvas-builder:layout", "standaloneLayout");
}

let hydrated = false;

/** Call once on the client so IndexedDB-backed stores load before UI reads them. */
export async function hydrateStores(): Promise<void> {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  await Promise.all([
    migrateRawArrayToPersist("cms.projects", "cms.projects", "projects"),
    migrateRawArrayToPersist("cms.users", "cms.users", "users"),
    migrateRawArrayToPersist("creative:media-library:v1", "creative:media-library:v1", "assets"),
    migrateStandaloneBuilderLayout(),
    // Fallback: copy any already-migrated persist blobs
    migrateLocalStorageToIndexedDB("cms.projects", "cms.projects"),
    migrateLocalStorageToIndexedDB("cms.users", "cms.users"),
    migrateLocalStorageToIndexedDB("creative:media-library:v1", "creative:media-library:v1"),
  ]);

  await Promise.all([
    useProjectsStore.persist.rehydrate(),
    useUsersStore.persist.rehydrate(),
    useMediaStore.persist.rehydrate(),
    useBuilderStore.persist.rehydrate(),
  ]);
}
