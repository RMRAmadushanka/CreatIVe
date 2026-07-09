import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/layout/PageLoading";
import {
  FolderKanban,
  User as UserIcon,
  Users as UsersIcon,
  Globe,
  Settings,
  LogOut,
  Shield,
  Layers,
} from "lucide-react";
import { authStore, useAuth, useAuthReady, type AuthUser } from "@/store/auth-store";
import { requireAuth } from "@/lib/auth-guards";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const authUser = await requireAuth();
    return { authUser };
  },
  head: () => ({
    meta: [
      { title: "Dashboard — CMS" },
      { name: "description", content: "Multi-tenant CMS dashboard with role-based access." },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const { authUser } = Route.useRouteContext();
  const sessionUser = useAuth();
  const authReady = useAuthReady();
  const user = sessionUser ?? authUser;

  useEffect(() => {
    if (authReady && !user) {
      void navigate({ to: "/auth", search: { redirect: window.location.href } });
    }
  }, [authReady, user, navigate]);

  if (!user) {
    return <PageLoading label={authReady ? "Redirecting to sign in…" : "Checking session…"} />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-[calc(100vh-56px)] w-full bg-background">
        <AppSidebar role={user.role} name={user.name} email={user.email} />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="flex items-center gap-2 text-sm">
                <Layers className="h-4 w-4 text-primary" />
                <span className="font-semibold">CMS Console</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-xs sm:inline-flex">
                <Shield
                  className={`h-3 w-3 ${user.role === "admin" ? "text-primary" : "text-muted-foreground"}`}
                />
                <span className="font-medium">
                  {user.role === "admin" ? "Administrator" : "Normal user"}
                </span>
                <span className="text-muted-foreground">· {user.email}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await authStore.signOut();
                  window.location.href = "/auth";
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const userItems = [
  { title: "My Projects", url: "/dashboard/projects", icon: FolderKanban },
  { title: "Profile", url: "/dashboard/profile", icon: UserIcon },
];

const adminItems = [
  { title: "All Users", url: "/dashboard/admin/users", icon: UsersIcon },
  { title: "All Platform Projects", url: "/dashboard/admin/projects", icon: Globe },
  { title: "System Settings", url: "/dashboard/admin/settings", icon: Settings },
];

function AppSidebar({
  role,
  name,
  email,
}: {
  role: AuthUser["role"];
  name: string;
  email: string;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const items = role === "admin" ? adminItems : userItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Layers className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{email}</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{role === "admin" ? "Administration" : "Workspace"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/60">
        {!collapsed && (
          <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
            {role === "admin" ? "Elevated privileges" : "Tenant member"}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
