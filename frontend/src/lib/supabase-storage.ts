import { supabase } from "@/lib/supabase";

export const MEDIA_BUCKET = "media";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
]);

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

export function assertMediaFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`${file.name}: only PNG, JPG, SVG, and WebP are allowed`);
  }
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error(`${file.name}: must be 5 MB or smaller`);
  }
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/svg+xml":
      return "svg";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export type UploadedObject = {
  path: string;
  publicUrl: string;
};

/** Upload a file to the public `media` bucket under `{userId}/{uuid}.ext`. */
export async function uploadMediaFile(file: File): Promise<UploadedObject> {
  assertMediaFile(file);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("You must be signed in to upload media");
  }

  const ext = extensionFor(file);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${user.id}/${id}.${ext}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw new Error(error.message || "Upload to Supabase Storage failed");
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Could not resolve public URL for uploaded file");
  }

  return { path, publicUrl: data.publicUrl };
}

export async function removeMediaObject(path: string): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) {
    // Soft-fail: metadata may already be gone; surface a console warning only.
    console.warn("[media] storage delete failed:", error.message);
  }
}
