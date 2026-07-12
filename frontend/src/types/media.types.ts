export type AssetKind = "logo" | "icon" | "image";

export type LibraryAsset = {
  id: string;
  name: string;
  url: string;
  /** Supabase Storage object path; null for legacy / external URLs. */
  storagePath: string | null;
  kind: AssetKind;
  format: string;
  width: number;
  height: number;
  size: number;
  createdAt: number;
};
