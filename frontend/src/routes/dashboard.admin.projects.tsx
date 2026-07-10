import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLoading } from "@/components/layout/PageLoading";
import { projectsStore, useProjects, useProjectsLoading, useProjectsStore } from "@/store/projects-store";
import { useAuth } from "@/store/auth-store";
import { Trash2, Globe } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/admin/projects")({
  component: AdminProjects,
});

function AdminProjects() {
  const user = useAuth();
  const projects = useProjects();
  const loading = useProjectsLoading();
  const loaded = useProjectsStore((s) => s.loaded);

  useEffect(() => {
    if (!user) return;
    void projectsStore.load().catch((error: Error) => toast.error(error.message));
  }, [user?.id]);

  if (!loaded && loading) {
    return <PageLoading label="Loading projects…" />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">All Platform Projects</h1>
        <p className="text-sm text-muted-foreground">
          {projects.length} projects across all tenants.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No projects on the platform yet.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Globe className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.domain}</TableCell>
                  <TableCell>
                    <div className="text-sm">{p.ownerName}</div>
                    <div className="text-xs text-muted-foreground">{p.ownerEmail}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.pages.length}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
                        void projectsStore
                          .delete(p.id)
                          .then(() => toast.success(`Deleted "${p.name}"`))
                          .catch((error: Error) => toast.error(error.message));
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
