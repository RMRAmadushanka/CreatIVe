import { createFileRoute } from "@tanstack/react-router";
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
import { usePlatformUsers, usersStore } from "@/store/projects-store";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const users = usePlatformUsers();
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">All Users</h1>
        <p className="text-sm text-muted-foreground">
          {users.length} users across the platform. Change a role to grant or revoke admin access.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
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
                    onValueChange={(v) => {
                      usersStore.setRole(u.id, v as "admin" | "user");
                      toast.success(
                        `${u.name} is now ${v === "admin" ? "an Admin" : "a Normal User"}`,
                      );
                    }}
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
      </div>
    </div>
  );
}
