export function slugForBackend(title: string, slug: string) {
  const cleaned = slug.replace(/^\/+|\/+$/g, "");
  if (cleaned) return cleaned;
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "page"
  );
}
