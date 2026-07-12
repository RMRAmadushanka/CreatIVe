import { create } from "zustand";

import { removeMediaObject, uploadMediaFile } from "@/lib/supabase-storage";
import {
  createMediaAsset,
  deleteMediaAsset,
  listMediaAssets,
} from "@/services/media.service";
import type { AssetKind, LibraryAsset } from "@/types/media.types";

export type { AssetKind, LibraryAsset };

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

type MediaState = {
  assets: LibraryAsset[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  reset: () => void;
  addFromFile: (file: File) => Promise<LibraryAsset>;
  deleteAsset: (id: string) => Promise<void>;
};

export const useMediaStore = create<MediaState>((set, get) => ({
  assets: [],
  loaded: false,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const assets = await listMediaAssets();
      set({ assets, loaded: true, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load media",
      });
      throw error;
    }
  },

  reset: () => set({ assets: [], loaded: false, loading: false, error: null }),

  addFromFile: async (file) => {
    const uploaded = await uploadMediaFile(file);
    try {
      const meta = await readImageMeta(uploaded.publicUrl);
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const asset = await createMediaAsset({
        name: file.name,
        url: uploaded.publicUrl,
        storagePath: uploaded.path,
        kind: classifyKind(meta.width, meta.height, ext, file.name),
        format: ext.toUpperCase() || "IMG",
        width: meta.width,
        height: meta.height,
        size: file.size,
      });
      set((s) => ({ assets: [asset, ...s.assets.filter((a) => a.id !== asset.id)] }));
      return asset;
    } catch (error) {
      await removeMediaObject(uploaded.path);
      throw error;
    }
  },

  deleteAsset: async (id) => {
    const removed = await deleteMediaAsset(id);
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }));
    if (removed.storagePath) {
      await removeMediaObject(removed.storagePath);
    }
  },
}));

export function getAssets(): LibraryAsset[] {
  return useMediaStore.getState().assets;
}

export async function addAssetFromFile(file: File): Promise<LibraryAsset> {
  return useMediaStore.getState().addFromFile(file);
}

/** @deprecated Prefer addAssetFromFile — data URLs are no longer stored. */
export async function addAssetFromDataUrl(_input: {
  name: string;
  url: string;
  size?: number;
  format?: string;
}): Promise<LibraryAsset> {
  throw new Error("Data URL uploads are no longer supported. Upload a File via addAssetFromFile.");
}

export async function deleteAsset(id: string): Promise<void> {
  return useMediaStore.getState().deleteAsset(id);
}

export function useMediaLibrary(): LibraryAsset[] {
  return useMediaStore((s) => s.assets);
}

/** Kept for re-exports; no longer used for uploads. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}
