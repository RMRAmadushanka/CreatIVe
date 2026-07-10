import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
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
import {
  projectsStore,
  useProjects,
  useProjectsLoading,
  useProjectsStore,
} from "@/store/projects-store";
import { useAuth } from "@/store/auth-store";
import { builderSearchForProject } from "@/lib/project-navigation";
import { Plus, Globe, FileText, ArrowRight, Calendar, Settings2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/projects")({
  component: ProjectsSection,
});

function ProjectsSection() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onList =
    pathname === "/dashboard/projects" || pathname === "/dashboard/projects/";

  if (onList) return <MyProjects />;
  return <Outlet />;
}

function MyProjects() {
  const navigate = useNavigate();
  const user = useAuth();
  const all = useProjects();
  const loading = useProjectsLoading();
  const loaded = useProjectsStore((s) => s.loaded);
  const mine = user
    ? all.filter((p) => p.ownerEmail.toLowerCase() === user.email.toLowerCase())
    : [];

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");

  useEffect(() => {
    if (!user) return;
    void projectsStore.load().catch((error: Error) => {
      toast.error(error.message || "Failed to load projects");
    });
  }, [user?.id]);

  const openInBuilder = (project: (typeof mine)[number]) => {
    void navigate({ to: "/", search: builderSearchForProject(project) });
  };

  const openManagePages = (projectId: string) => {
    void navigate({ to: "/dashboard/projects/$projectId", params: { projectId } });
  };

  const create = async () => {
    if (!user || !name.trim() || !domain.trim()) {
      toast.error("Please provide a name and domain");
      return;
    }
    setBusy(true);
    try {
      const project = await projectsStore.create(name.trim(), domain.trim());
      toast.success(`Project "${name}" created`);
      setName("");
      setDomain("");
      setOpen(false);
      openInBuilder(project);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create project");
    } finally {
      setBusy(false);
    }
  };

  if (!loaded && loading) {
    return <PageLoading label="Loading projects…" />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Projects</h1>
          <p className="text-sm text-muted-foreground">
            {mine.length} project{mine.length === 1 ? "" : "s"} in your workspace
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Create New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="pname">Project Name</Label>
                <Input
                  id="pname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Marketing Site"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pdomain">Domain</Label>
                <Input
                  id="pdomain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void create()} disabled={busy}>
                {busy ? "Creating…" : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {mine.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-12 text-center">
          <FolderIcon />
          <h3 className="mt-3 text-sm font-medium">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col rounded-xl border border-border/60 bg-card/60 p-5 transition-colors hover:border-primary/40"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Active
                </span>
              </div>
              <h3 className="text-base font-semibold">{p.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.domain}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {p.pages.length} pages
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button size="sm" className="w-full sm:flex-1" onClick={() => openInBuilder(p)}>
                  Open in Builder <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:flex-1"
                  onClick={() => openManagePages(p.id)}
                >
                  <Settings2 className="h-3.5 w-3.5" /> Manage Pages
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FolderIcon() {
  return (
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
      <FileText className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}
