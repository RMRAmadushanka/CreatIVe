import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { BuilderElement } from "@/features/builder/types";
import { idbStorage } from "@/store/idb";

type BuilderState = {
  standaloneLayout: BuilderElement[];
  setStandaloneLayout: (elements: BuilderElement[]) => void;
};

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set) => ({
      standaloneLayout: [],
      setStandaloneLayout: (elements) => set({ standaloneLayout: elements }),
    }),
    {
      name: "canvas-builder:layout",
      storage: idbStorage,
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
