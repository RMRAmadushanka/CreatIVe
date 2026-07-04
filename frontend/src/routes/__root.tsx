import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { ErrorPage } from "@/components/layout/ErrorPage";
import { NotFoundPage } from "@/components/layout/NotFoundPage";
import { APP_NAME } from "@/constants/app";

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: "Visual page builder for CreatIVe" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=JetBrains+Mono:wght@400;500;700&family=DM+Serif+Display&display=swap",
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppHeader />
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
