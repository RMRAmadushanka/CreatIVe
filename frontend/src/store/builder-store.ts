import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { BuilderElement } from "@/features/builder/types";
import { createIndexedDBStorage } from "@/lib/indexeddb-storage";

type BuilderPersistState = {
  /** Standalone builder layout (when not editing a project). */
  standaloneLayout: BuilderElement[];
  setStandaloneLayout: (elements: BuilderElement[]) => void;
};

export const useBuilderStore = create<BuilderPersistState>()(
  persist(
    (set) => ({
      standaloneLayout: [],
      setStandaloneLayout: (elements) => set({ standaloneLayout: elements }),
    }),
    {
      name: "canvas-builder:layout",
      storage: createJSONStorage(() => createIndexedDBStorage()),
      skipHydration: true,
      partialize: (state) => ({ standaloneLayout: state.standaloneLayout }),
    },
  ),
);

export const builderStore = {
  getStandaloneLayout: () => useBuilderStore.getState().standaloneLayout,
  setStandaloneLayout: (elements: BuilderElement[]) =>
    useBuilderStore.getState().setStandaloneLayout(elements),
};
