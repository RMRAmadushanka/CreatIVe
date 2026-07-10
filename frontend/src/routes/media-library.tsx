import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MediaLibraryPage } from "@/features/media";

export const Route = createFileRoute("/media-library")({
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
  component: MediaLibraryRoute,
});

function MediaLibraryRoute() {
  return (
    <RequireAuth>
      <MediaLibraryPage />
    </RequireAuth>
  );
}
