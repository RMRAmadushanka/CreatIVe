import { createFileRoute } from "@tanstack/react-router";
import { MediaLibraryPage } from "@/features/media";
import { requireAuth } from "@/lib/auth-guards";

export const Route = createFileRoute("/media-library")({
  beforeLoad: () => requireAuth(),
  head: () => ({
    meta: [
      { title: "Media Library — Asset Manager" },
      {
        name: "description",
        content:
          "Browse, search, and manage your uploaded logos, icons, and images in one clean media library.",
      },
      { property: "og:title", content: "Media Library — Asset Manager" },
      {
        property: "og:description",
        content: "A clean dark-mode media library for logos, icons, and images.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MediaLibraryPage,
});
