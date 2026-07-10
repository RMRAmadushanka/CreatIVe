export { authStore, useAuth, useAuthReady, useAuthStore, useIsAdmin } from "@/store/auth-store";
export type { AuthUser, Role } from "@/store/auth-store";

export { builderStore, useBuilderStore } from "@/store/builder-store";

export {
  addAssetFromDataUrl,
  addAssetFromFile,
  classifyKind,
  deleteAsset,
  fileToDataUrl,
  getAssets,
  readImageMeta,
  useMediaLibrary,
  useMediaStore,
} from "@/store/media-store";
export type { AssetKind, LibraryAsset } from "@/store/media-store";

export {
  projectsStore,
  useProjects,
  useProjectsLoading,
  useProjectsStore,
} from "@/store/projects-store";
export type { Page, Project } from "@/store/projects-store";

export { usePlatformUsers, usersStore, useUsersStore } from "@/store/users-store";
export type { PlatformUser } from "@/store/users-store";

export { StoreProvider } from "@/store/StoreProvider";
