import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/dashboard/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">System Settings</h1>
      <div className="space-y-4">
        <SettingCard
          title="Public sign-ups"
          description="Allow new users to register without an invitation."
          defaultChecked
        />
        <SettingCard
          title="Enforce 2FA for admins"
          description="Require two-factor authentication for all administrator accounts."
        />
        <SettingCard
          title="Maintenance mode"
          description="Show a maintenance page to all non-admin visitors."
        />
        <SettingCard
          title="Weekly usage digest"
          description="Email admins a summary of platform activity every Monday."
          defaultChecked
        />
      </div>
    </div>
  );
}

function SettingCard({
  title,
  description,
  defaultChecked,
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 rounded-xl border border-border/60 bg-card/60 p-5">
      <div>
        <Label className="text-sm font-medium">{title}</Label>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
