export interface Page {
  id: string;
  title: string;
  slug: string;
  layoutData: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreatePageRequest {
  title: string;
  slug: string;
  layoutData: Record<string, unknown>;
}
