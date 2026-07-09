import { del, get, set } from "idb-keyval";
import { createJSONStorage } from "zustand/middleware";

/** Zustand persist storage backed by IndexedDB. */
export const idbStorage = createJSONStorage(() => ({
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
}));
