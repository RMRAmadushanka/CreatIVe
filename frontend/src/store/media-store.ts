import { useEffect, useState } from "react";

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

const STORAGE_KEY = "creative:media-library:v1";
const EVENT_NAME = "creative:media-library:changed";

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

function read(): LibraryAsset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function write(next: LibraryAsset[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function getAssets(): LibraryAsset[] {
  return read();
}

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

export async function addAssetFromDataUrl(input: {
  name: string;
  url: string;
  size?: number;
  format?: string;
}): Promise<LibraryAsset> {
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
  const current = read();
  write([asset, ...current]);
  return asset;
}

export async function addAssetFromFile(file: File): Promise<LibraryAsset> {
  const url = await fileToDataUrl(file);
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return addAssetFromDataUrl({ name: file.name, url, size: file.size, format: ext });
}

export function deleteAsset(id: string) {
  write(read().filter((a) => a.id !== id));
}

export function useMediaLibrary(): LibraryAsset[] {
  const [assets, setAssets] = useState<LibraryAsset[]>(() => read());
  useEffect(() => {
    const sync = () => setAssets(read());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return assets;
}
