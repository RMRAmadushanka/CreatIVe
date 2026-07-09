import type { Project } from "@/store/projects-store";

/** Search params for opening a project in the page builder. */
export function builderSearchForProject(project: Pick<Project, "id" | "pages">) {
  const firstPage = project.pages[0];
  return {
    project: project.id,
    page: firstPage?.id,
  };
}
