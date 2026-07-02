import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/store/auth-store";
import { Shield, Mail, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const user = useAuth();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Profile</h1>
      <div className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary text-xl font-semibold uppercase">
            {user.name.slice(0, 1)}
          </div>
          <div>
            <div className="text-lg font-semibold">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 text-sm">
          <Row icon={<UserIcon className="h-4 w-4" />} label="Display name" value={user.name} />
          <Row icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
          <Row
            icon={<Shield className="h-4 w-4" />}
            label="Role"
            value={user.role === "admin" ? "Administrator" : "Normal user"}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-4 py-2.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium">{value}</span>
    </div>
  );
}
