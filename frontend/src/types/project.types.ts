export type ProjectPage = {
  id: string;
  title: string;
  slug: string;
  canvasNodes?: unknown[];
};

export type Project = {
  id: string;
  name: string;
  domain: string;
  ownerEmail: string;
  ownerName: string;
  ownerId?: string;
  pages: ProjectPage[];
  createdAt: number;
};

export type CreateProjectRequest = {
  name: string;
  domain: string;
};

export type ReplacePagesRequest = {
  pages: Array<{
    id?: string;
    title: string;
    slug: string;
    canvasNodes?: unknown[];
  }>;
};
