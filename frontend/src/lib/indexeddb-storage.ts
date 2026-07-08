/**
 * Zustand persist adapter backed by IndexedDB (via idb-keyval).
 * On first run, copies any existing localStorage values into IndexedDB.
 */
import { get, set, del } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

export function createIndexedDBStorage(): StateStorage {
  return {
    getItem: async (name: string): Promise<string | null> => {
      const value = await get<string>(name);
      return value ?? null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
      await set(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
      await del(name);
    },
  };
}

/** One-time migration: localStorage → IndexedDB (keeps old data, removes local copy). */
export async function migrateLocalStorageToIndexedDB(
  indexedDbKey: string,
  localStorageKey: string,
): Promise<void> {
  if (typeof window === "undefined") return;

  const existing = await get<string>(indexedDbKey);
  if (existing != null) return;

  const fromLocal = window.localStorage.getItem(localStorageKey);
  if (fromLocal == null) return;

  await set(indexedDbKey, fromLocal);
  window.localStorage.removeItem(localStorageKey);
}
