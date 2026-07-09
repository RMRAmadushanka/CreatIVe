import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listPlatformUsers, setUserRole } from "@/services/user.service";
import { authStore, useAuth } from "@/store/auth-store";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const currentUser = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: listPlatformUsers,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "admin" | "user" }) => setUserRole(id, role),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      if (currentUser?.id === updated.id) {
        await authStore.refreshFromBackend();
      }
      toast.success(
        `${updated.name} is now ${updated.role === "admin" ? "an Admin" : "a Normal User"}`,
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">All Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage platform roles. Roles are enforced by the backend on every API request.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading users…</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive">
            {(error as Error).message}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-48">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-primary">
                        {u.name.slice(0, 1)}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      disabled={roleMutation.isPending}
                      onValueChange={(v) =>
                        roleMutation.mutate({ id: u.id, role: v as "admin" | "user" })
                      }
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">Normal User</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
