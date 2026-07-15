import JSZip from "jszip";
import type { BuilderElement } from "@/features/builder/types";
import {
  buildViteProjectFiles,
  slugifyProjectName,
  type ExportPage,
  type ExportSite,
} from "@/features/export/vite-project-files";

export type DownloadViteZipInput = {
  projectName: string;
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    canvasNodes?: unknown[];
  }>;
  theme?: ExportSite["theme"];
};

function asElements(nodes: unknown[] | undefined): BuilderElement[] {
  if (!Array.isArray(nodes)) return [];
  return nodes as BuilderElement[];
}

export async function downloadViteProjectZip(input: DownloadViteZipInput): Promise<string> {
  const exportPages: ExportPage[] = input.pages.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    canvasNodes: asElements(p.canvasNodes),
  }));

  const site: ExportSite = {
    name: input.projectName || "PageLoom Site",
    pages: exportPages,
    theme: input.theme,
  };

  const files = buildViteProjectFiles(site);
  const root = slugifyProjectName(site.name);
  const zip = new JSZip();
  const folder = zip.folder(root);
  if (!folder) throw new Error("Could not create ZIP folder");

  for (const [path, content] of Object.entries(files)) {
    folder.file(path, content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `${root}-vite.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return filename;
}
