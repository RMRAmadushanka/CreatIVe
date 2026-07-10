import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageLoading } from "@/components/layout/PageLoading";
import { projectsStore, useProjects, useProjectsStore } from "@/store/projects-store";
import { canAccessProject } from "@/lib/auth-guards";
import { useAuth } from "@/store/auth-store";
import { ArrowLeft, Plus, ExternalLink, FileText, Trash2, Globe } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/projects/$projectId")({
  component: ProjectDetail,
});

function ProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const user = useAuth();
  const all = useProjects();
  const loaded = useProjectsStore((s) => s.loaded);
  const project = all.find((p) => p.id === projectId);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!loaded) {
      void projectsStore.load().catch((error: Error) => toast.error(error.message));
    }
  }, [user?.id, loaded]);

  useEffect(() => {
    if (!user || !project) return;
    if (!canAccessProject(project, user)) {
      void navigate({ to: "/dashboard/projects" });
    }
  }, [user, project, navigate]);

  if (!loaded && !project) {
    return <PageLoading label="Loading project…" />;
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border/60 bg-card/60 p-8 text-center">
        <h2 className="text-lg font-semibold">Project not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">This project may have been deleted.</p>
        <Button className="mt-4" asChild>
          <Link to="/dashboard/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  const addPage = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await projectsStore.addPage(project.id, title.trim());
      toast.success(`Page "${title}" added`);
      setTitle("");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add page");
    } finally {
      setBusy(false);
    }
  };

  const openInBuilder = (pageId: string) => {
    void navigate({ to: "/", search: { project: project.id, page: pageId } });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/dashboard/projects"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All projects
      </Link>

      <div className="mt-3 mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.domain}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => openInBuilder(project.pages[0].id)}>
            <ExternalLink className="h-4 w-4" /> Open in Builder
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4" /> Add New Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a new page</DialogTitle>
              </DialogHeader>
              <div className="space-y-1.5 py-2">
                <Label htmlFor="ptitle">Page Title</Label>
                <Input
                  id="ptitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="About Us"
                  onKeyDown={(e) => e.key === "Enter" && void addPage()}
                />
                <p className="text-[11px] text-muted-foreground">
                  A URL slug will be auto-generated.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void addPage()} disabled={busy}>
                  {busy ? "Adding…" : "Add Page"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
        <div className="border-b border-border/60 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pages · {project.pages.length}
        </div>
        <div className="divide-y divide-border/60">
          {project.pages.map((pg) => (
            <div key={pg.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{pg.title}</div>
                  <code className="text-[11px] text-muted-foreground">{pg.slug}</code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => openInBuilder(pg.id)}>
                  <ExternalLink className="h-3.5 w-3.5" /> Open in Builder
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    void projectsStore
                      .deletePage(project.id, pg.id)
                      .then(() => toast.success("Page deleted"))
                      .catch((error: Error) => toast.error(error.message));
                  }}
                  disabled={project.pages.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
