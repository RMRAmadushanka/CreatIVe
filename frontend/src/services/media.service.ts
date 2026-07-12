import { authorizedFetch } from "@/lib/api-client";
import { API_BASE_URL, API_ENDPOINTS } from "@/constants/api";
import type { AssetKind, LibraryAsset } from "@/types/media.types";

export type MediaAssetDto = {
  id: string;
  name: string;
  url: string;
  storagePath: string | null;
  kind: string;
  format: string;
  width: number;
  height: number;
  size: number;
  createdAt: number;
  ownerId: string;
};

export type CreateMediaRequest = {
  name: string;
  url: string;
  storagePath?: string | null;
  kind: AssetKind;
  format: string;
  width: number;
  height: number;
  size: number;
};

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Request failed (${res.status} ${res.statusText})${detail ? `: ${detail}` : ""}`,
    );
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

function toLibraryAsset(dto: MediaAssetDto): LibraryAsset {
  const kind = (
    dto.kind === "logo" || dto.kind === "icon" || dto.kind === "image" ? dto.kind : "image"
  ) as AssetKind;
  return {
    id: dto.id,
    name: dto.name,
    url: dto.url,
    storagePath: dto.storagePath,
    kind,
    format: dto.format,
    width: dto.width,
    height: dto.height,
    size: dto.size,
    createdAt: dto.createdAt,
  };
}

export async function listMediaAssets(): Promise<LibraryAsset[]> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.media}`, {
    requireAuth: true,
  });
  const data = await parseOrThrow<MediaAssetDto[]>(res);
  return data.map(toLibraryAsset);
}

export async function createMediaAsset(body: CreateMediaRequest): Promise<LibraryAsset> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.media}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    requireAuth: true,
  });
  const data = await parseOrThrow<MediaAssetDto>(res);
  return toLibraryAsset(data);
}

/** Deletes metadata; returns the former asset so the client can remove storage. */
export async function deleteMediaAsset(id: string): Promise<LibraryAsset> {
  const res = await authorizedFetch(`${API_BASE_URL}${API_ENDPOINTS.mediaById(id)}`, {
    method: "DELETE",
    requireAuth: true,
  });
  const data = await parseOrThrow<MediaAssetDto>(res);
  return toLibraryAsset(data);
}
