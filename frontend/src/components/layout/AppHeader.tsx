import { Link } from "@tanstack/react-router";

const homeSearch = { project: undefined, page: undefined } as const;

export function AppHeader() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-3 backdrop-blur">
      <Link to="/" search={homeSearch} className="text-sm font-semibold tracking-tight">
        Page Builder
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
  );
}
