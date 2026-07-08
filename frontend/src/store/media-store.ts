import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { createIndexedDBStorage } from "@/lib/indexeddb-storage";

export type AssetKind = "logo" | "icon" | "image";

export type LibraryAsset = {
  id: string;
  name: string;
  url: string;
  kind: AssetKind;
  format: string;
  width: number;
  height: number;
  size: number;
  createdAt: number;
};

const SEED: LibraryAsset[] = [
  {
    id: "s1",
    name: "brand-mark.svg",
    url: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400",
    kind: "logo",
    format: "SVG",
    width: 512,
    height: 512,
    size: 0,
    createdAt: 0,
  },
  {
    id: "s2",
    name: "hero-mountain.jpg",
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    kind: "image",
    format: "JPG",
    width: 1920,
    height: 1280,
    size: 0,
    createdAt: 0,
  },
  {
    id: "s3",
    name: "icon-star.png",
    url: "https://images.unsplash.com/photo-1454789476662-53eb23ba5907?w=200",
    kind: "icon",
    format: "PNG",
    width: 128,
    height: 128,
    size: 0,
    createdAt: 0,
  },
  {
    id: "s4",
    name: "workspace.jpg",
    url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
    kind: "image",
    format: "JPG",
    width: 1600,
    height: 900,
    size: 0,
    createdAt: 0,
  },
];

export function classifyKind(width: number, height: number, format: string, name = ""): AssetKind {
  const fmt = format.toLowerCase();
  if (fmt === "svg") return width && width <= 256 && height <= 256 ? "icon" : "logo";
  if (/logo|brand|mark/i.test(name)) return "logo";
  if (width && width <= 256 && height <= 256) return "icon";
  if (width && Math.abs(width - height) < 32 && width <= 600) return "logo";
  return "image";
}

export function readImageMeta(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve({ width: 0, height: 0 });
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

type MediaState = {
  assets: LibraryAsset[];
  addFromDataUrl: (input: {
    name: string;
    url: string;
    size?: number;
    format?: string;
  }) => Promise<LibraryAsset>;
  addFromFile: (file: File) => Promise<LibraryAsset>;
  deleteAsset: (id: string) => void;
};

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      assets: SEED,

      addFromDataUrl: async (input) => {
        const ext = (input.format || input.name.split(".").pop() || "").toLowerCase();
        const meta = await readImageMeta(input.url);
        const asset: LibraryAsset = {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: input.name,
          url: input.url,
          format: ext.toUpperCase() || "IMG",
          width: meta.width,
          height: meta.height,
          size: input.size || 0,
          kind: classifyKind(meta.width, meta.height, ext, input.name),
          createdAt: Date.now(),
        };
        set({ assets: [asset, ...get().assets] });
        return asset;
      },

      addFromFile: async (file) => {
        const url = await fileToDataUrl(file);
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        return get().addFromDataUrl({ name: file.name, url, size: file.size, format: ext });
      },

      deleteAsset: (id) => set({ assets: get().assets.filter((a) => a.id !== id) }),
    }),
    {
      name: "creative:media-library:v1",
      storage: createJSONStorage(() => createIndexedDBStorage()),
      skipHydration: true,
      partialize: (state) => ({ assets: state.assets }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<MediaState>),
        assets:
          (persisted as MediaState | undefined)?.assets?.length
            ? (persisted as MediaState).assets
            : current.assets,
      }),
    },
  ),
);

export function getAssets(): LibraryAsset[] {
  return useMediaStore.getState().assets;
}

export async function addAssetFromDataUrl(input: {
  name: string;
  url: string;
  size?: number;
  format?: string;
}): Promise<LibraryAsset> {
  return useMediaStore.getState().addFromDataUrl(input);
}

export async function addAssetFromFile(file: File): Promise<LibraryAsset> {
  return useMediaStore.getState().addFromFile(file);
}

export function deleteAsset(id: string) {
  useMediaStore.getState().deleteAsset(id);
}

export function useMediaLibrary(): LibraryAsset[] {
  return useMediaStore((s) => s.assets);
}
