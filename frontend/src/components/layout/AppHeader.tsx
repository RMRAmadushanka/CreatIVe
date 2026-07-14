import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CreditCard, LayoutTemplate, Images, LayoutDashboard, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { authStore, useAuth, useAuthReady, type AuthUser } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_NAME } from "@/constants/app";
import { cn } from "@/utils/cn";

const homeSearch = { project: undefined, page: undefined } as const;

export function AppHeader() {
  const user = useAuth();
  const authReady = useAuthReady();

  if (!authReady) {
    return (
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-6">
          <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
        </div>
      </header>
    );
  }

  if (!user) {
    return <MarketingHeader />;
  }

  return <AppWorkspaceHeader user={user} />;
}

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <Link to="/" search={homeSearch} className="text-sm font-semibold tracking-tight">
          {APP_NAME}
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <a href="/#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="/#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </a>
          <a href="/#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth" search={{ redirect: undefined, plan: undefined, mode: "signin" }}>
              Sign in
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ redirect: undefined, plan: undefined, mode: "signup" }}>
              Get started
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function AppWorkspaceHeader({ user }: { user: AuthUser }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const navItems = [
    { to: "/" as const, label: "Builder", icon: LayoutTemplate, match: (p: string) => p === "/" },
    {
      to: "/media-library" as const,
      label: "Media",
      icon: Images,
      match: (p: string) => p.startsWith("/media-library"),
    },
    {
      to: "/dashboard/projects" as const,
      label: "Projects",
      icon: LayoutDashboard,
      match: (p: string) => p.startsWith("/dashboard/projects") || p === "/dashboard",
    },
    {
      to: "/dashboard/billing" as const,
      label: "Billing",
      icon: CreditCard,
      match: (p: string) => p.startsWith("/dashboard/billing"),
    },
  ];

  const initials = userInitials(user.name);

  const signOut = async () => {
    await authStore.signOut();
    void navigate({
      to: "/auth",
      search: { redirect: undefined, plan: undefined, mode: "signin" },
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link to="/" search={homeSearch} className="shrink-0 text-sm font-semibold tracking-tight">
            {APP_NAME}
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  search={item.to === "/" ? homeSearch : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full border-border/70 bg-card/50 pl-1.5 pr-2.5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {initials}
                </span>
                <span className="hidden max-w-[9rem] truncate text-left text-sm font-medium sm:inline">
                  {user.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  {user.role === "admin" && (
                    <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                      Admin
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/profile">
                  <UserIcon className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/billing">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="md:hidden">
                <Link to="/" search={homeSearch}>
                  <LayoutTemplate className="h-4 w-4" />
                  Builder
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="md:hidden">
                <Link to="/media-library">
                  <Images className="h-4 w-4" />
                  Media
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="md:hidden">
                <Link to="/dashboard/projects">
                  <LayoutDashboard className="h-4 w-4" />
                  Projects
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  void signOut();
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
