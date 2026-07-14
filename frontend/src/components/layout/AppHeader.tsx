import { Link } from "@tanstack/react-router";
import { useAuth, useAuthReady } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/constants/app";

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

  return <AppWorkspaceHeader />;
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

function AppWorkspaceHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-6">
        <Link to="/" search={homeSearch} className="text-sm font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            search={homeSearch}
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-primary/10 text-primary" }}
            inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
            className="rounded-md px-3 py-1.5 font-medium transition-colors"
          >
            Builder
          </Link>
          <Link
            to="/media-library"
            activeProps={{ className: "bg-primary/10 text-primary" }}
            inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
            className="rounded-md px-3 py-1.5 font-medium transition-colors"
          >
            Media Library
          </Link>
          <Link
            to="/dashboard"
            activeProps={{ className: "bg-primary/10 text-primary" }}
            inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
            className="rounded-md px-3 py-1.5 font-medium transition-colors"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
