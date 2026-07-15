import type { BuilderElement } from "@/features/builder/types";

export type ExportPage = {
  id: string;
  title: string;
  slug: string;
  canvasNodes: BuilderElement[];
};

export type ExportSite = {
  name: string;
  pages: ExportPage[];
  theme?: {
    primary?: string;
    secondary?: string;
    font?: string;
    radius?: number;
  };
};

export function slugifyProjectName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "pageloom-site";
}

/** Build all files for a standalone Vite + React + TypeScript project. */
export function buildViteProjectFiles(site: ExportSite): Record<string, string> {
  const packageName = slugifyProjectName(site.name);
  const theme = {
    primary: site.theme?.primary ?? "#0f766e",
    secondary: site.theme?.secondary ?? "#f97316",
    font: site.theme?.font ?? "Inter, system-ui, sans-serif",
    radius: site.theme?.radius ?? 12,
  };

  const pages = site.pages.map((p) => ({
    id: p.id,
    title: p.title,
    slug: normalizeSlug(p.slug),
    canvasNodes: Array.isArray(p.canvasNodes) ? p.canvasNodes : [],
  }));

  if (pages.length === 0) {
    pages.push({
      id: "home",
      title: "Home",
      slug: "/",
      canvasNodes: [],
    });
  }

  return {
    "package.json": JSON.stringify(
      {
        name: packageName,
        private: true,
        version: "1.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
        },
        dependencies: {
          "lucide-react": "^0.575.0",
          react: "^19.2.0",
          "react-dom": "^19.2.0",
          "react-router-dom": "^7.6.0",
        },
        devDependencies: {
          "@types/react": "^19.2.0",
          "@types/react-dom": "^19.2.0",
          "@vitejs/plugin-react": "^5.2.0",
          typescript: "^5.8.3",
          vite: "^6.3.5",
        },
      },
      null,
      2,
    ),
    "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`,
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          useDefineForClassFields: true,
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          isolatedModules: true,
          moduleDetection: "force",
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
          noFallthroughCasesInSwitch: true,
          resolveJsonModule: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
    "tsconfig.node.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2023"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          strict: true,
          noEmit: true,
        },
        include: ["vite.config.ts"],
      },
      null,
      2,
    ),
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(site.name)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    "README.md": `# ${site.name}

Exported from **PageLoom** as a standalone Vite + React project.

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

Then open the URL shown in the terminal (usually http://localhost:5173).

## Build for production

\`\`\`bash
npm run build
npm run preview
\`\`\`

## Structure

- \`src/data/site.json\` — pages and canvas content from PageLoom
- \`src/components/PageRenderer.tsx\` — renders the visual page tree
- \`src/App.tsx\` — React Router routes (one route per page slug)

Image URLs point at your original media hosts (e.g. Supabase). Forms submit with \`alert\` unless you wire your own backend.
`,
    ".gitignore": `node_modules
dist
.DS_Store
*.local
`,
    "src/vite-env.d.ts": `/// <reference types="vite/client" />
`,
    "src/main.tsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
`,
    "src/index.css": `:root {
  --gs-primary: ${theme.primary};
  --gs-secondary: ${theme.secondary};
  --gs-radius: ${theme.radius}px;
  --gs-font: ${theme.font};
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: var(--gs-font);
  color: #0f172a;
  background: #ffffff;
  line-height: 1.5;
}

a {
  color: inherit;
}

img {
  max-width: 100%;
  display: block;
}

button,
input,
textarea,
select {
  font: inherit;
}
`,
    "src/data/site.json": JSON.stringify(
      {
        name: site.name,
        theme,
        pages,
      },
      null,
      2,
    ),
    "src/lib/responsive.ts": RESPONSIVE_HELPERS,
    "src/components/DynamicIcon.tsx": DYNAMIC_ICON,
    "src/components/PageRenderer.tsx": PAGE_RENDERER,
    "src/App.tsx": APP_TSX,
  };
}

function normalizeSlug(slug: string): string {
  const s = (slug || "/").trim();
  if (!s || s === "/") return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const RESPONSIVE_HELPERS = `export type Breakpoint = "desktop" | "tablet" | "mobile";

export type ResponsiveValue<T> = T | { desktop?: T; tablet?: T; mobile?: T };

export function resolveResponsive<T>(
  value: ResponsiveValue<T> | undefined,
  bp: Breakpoint,
): T | undefined {
  if (value == null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) return value as T;
  const obj = value as { desktop?: T; tablet?: T; mobile?: T };
  if (bp === "mobile") return obj.mobile ?? obj.tablet ?? obj.desktop;
  if (bp === "tablet") return obj.tablet ?? obj.desktop;
  return obj.desktop ?? obj.tablet ?? obj.mobile;
}

export function useBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}
`;

const DYNAMIC_ICON = `import { icons, type LucideProps } from "lucide-react";

export function DynamicIcon({
  name,
  ...props
}: LucideProps & { name?: string }) {
  const key = (name ?? "Circle") as keyof typeof icons;
  const Icon = icons[key] ?? icons.Circle;
  return <Icon {...props} />;
}
`;

const APP_TSX = `import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useMemo } from "react";
import site from "./data/site.json";
import { PageRenderer, type BuilderElement } from "./components/PageRenderer";

type SitePage = {
  id: string;
  title: string;
  slug: string;
  canvasNodes: BuilderElement[];
};

const pages = site.pages as SitePage[];

function pathForSlug(slug: string) {
  return slug === "/" ? "/" : slug;
}

function useActivePage(): SitePage {
  const { pathname } = useLocation();
  return useMemo(() => {
    const exact = pages.find((p) => pathForSlug(p.slug) === pathname);
    if (exact) return exact;
    return pages.find((p) => p.slug === "/") ?? pages[0];
  }, [pathname]);
}

function SitePageView() {
  const page = useActivePage();
  return (
    <main>
      <PageRenderer
        elements={page.canvasNodes ?? []}
        pages={pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
      />
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      {pages.map((page) => (
        <Route
          key={page.id}
          path={pathForSlug(page.slug)}
          element={<SitePageView />}
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
`;

const PAGE_RENDERER = `import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { DynamicIcon } from "./DynamicIcon";
import { resolveResponsive, useBreakpoint, type Breakpoint } from "../lib/responsive";

export type BuilderElement = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children: BuilderElement[];
};

type PageMeta = { id: string; title: string; slug: string };

type Props = {
  elements: BuilderElement[];
  pages: PageMeta[];
};

export function PageRenderer({ elements, pages }: Props) {
  const bp = useBreakpoint();
  return (
    <div>
      {elements.map((el) => (
        <ElementView key={el.id} el={el} bp={bp} pages={pages} />
      ))}
    </div>
  );
}

function ElementView({
  el,
  bp,
  pages,
}: {
  el: BuilderElement;
  bp: Breakpoint;
  pages: PageMeta[];
}) {
  const p = el.props ?? {};
  const children = el.children ?? [];

  const num = (key: string, fallback = 0) => {
    const v = resolveResponsive(p[key] as never, bp);
    return typeof v === "number" ? v : fallback;
  };
  const str = (key: string, fallback = "") => {
    const v = resolveResponsive(p[key] as never, bp);
    return typeof v === "string" ? v : fallback;
  };

  switch (el.type) {
    case "section":
      return (
        <section
          style={{
            padding: num("padding", 32),
            background: str("background") || undefined,
            minHeight: num("minHeight", 0) || undefined,
          }}
        >
          {children.map((c) => (
            <ElementView key={c.id} el={c} bp={bp} pages={pages} />
          ))}
        </section>
      );

    case "fullSection":
      return (
        <section
          style={{
            paddingTop: num("paddingTop", 64),
            paddingBottom: num("paddingBottom", 64),
            background: str("background") || undefined,
            backgroundImage: str("backgroundImage")
              ? \`url(\${str("backgroundImage")})\`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            {children.map((c) => (
              <ElementView key={c.id} el={c} bp={bp} pages={pages} />
            ))}
          </div>
        </section>
      );

    case "heading": {
      const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"].includes(String(p.tag))
        ? String(p.tag)
        : "h2") as keyof JSX.IntrinsicElements;
      return (
        <Tag
          style={{
            margin: "0 0 0.5em",
            textAlign: (str("align", "left") as CSSProperties["textAlign"]) || "left",
            color: str("color") || undefined,
          }}
        >
          {str("content", "Heading")}
        </Tag>
      );
    }

    case "text":
    case "richText":
      return (
        <p
          style={{
            margin: "0 0 1em",
            fontSize: num("fontSize", 16) || 16,
            textAlign: (str("align", "left") as CSSProperties["textAlign"]) || "left",
            color: str("color") || undefined,
            whiteSpace: "pre-wrap",
          }}
        >
          {str("content", "")}
        </p>
      );

    case "image":
      return (
        <img
          src={str("src")}
          alt={str("alt", "")}
          style={{
            width: num("width", 0) ? num("width") : "100%",
            borderRadius: num("radius", 0),
            margin: "0 auto",
          }}
        />
      );

    case "icon":
      return (
        <div style={{ display: "flex", justifyContent: alignToFlex(str("align", "left")) }}>
          <DynamicIcon
            name={str("name", "Star")}
            size={num("size", 24) || 24}
            color={str("color") || undefined}
          />
        </div>
      );

    case "button": {
      const label = str("label", "Button");
      const style: CSSProperties = {
        display: "inline-block",
        padding: "10px 18px",
        border: "none",
        cursor: "pointer",
        background: str("bg") || "var(--gs-primary)",
        color: str("color") || "#fff",
        borderRadius: num("radius", 8),
        textDecoration: "none",
      };
      const wrap = (node: ReactNode) => (
        <div style={{ textAlign: (str("align", "left") as CSSProperties["textAlign"]) || "left" }}>
          {node}
        </div>
      );
      if (p.linkType === "internal" && typeof p.pageId === "string") {
        const target = pages.find((pg) => pg.id === p.pageId);
        const to = target ? (target.slug === "/" ? "/" : target.slug) : "/";
        return wrap(
          <Link to={to} style={style}>
            {label}
          </Link>,
        );
      }
      const href = str("href", "#");
      return wrap(
        <a href={href || "#"} style={style}>
          {label}
        </a>,
      );
    }

    case "row": {
      const template = str("template", "1-1");
      const cols =
        template === "1-1-1" ? "1fr 1fr 1fr" : template === "1-3" ? "1fr 3fr" : "1fr 1fr";
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: bp === "mobile" ? "1fr" : cols,
            gap: num("gap", 16),
          }}
        >
          {children.map((c) => (
            <ElementView key={c.id} el={c} bp={bp} pages={pages} />
          ))}
        </div>
      );
    }

    case "grid":
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              bp === "mobile" ? "1fr" : \`repeat(\${Math.max(1, Math.min(3, num("columns", 2) || 2))}, 1fr)\`,
            gap: num("gap", 16),
          }}
        >
          {children.map((c) => (
            <ElementView key={c.id} el={c} bp={bp} pages={pages} />
          ))}
        </div>
      );

    case "column":
      return (
        <div>
          {children.map((c) => (
            <ElementView key={c.id} el={c} bp={bp} pages={pages} />
          ))}
        </div>
      );

    case "form":
      return <FormBlock p={p} />;

    case "accordion":
      return <AccordionBlock p={p} />;

    case "tabs":
      return <TabsBlock p={p} />;

    case "carousel":
      return <HeroCarousel p={p} />;

    case "imageCarousel":
      return <ImageCarousel p={p} />;

    case "navbar":
      return <NavbarBlock p={p} pages={pages} />;

    case "featureCard":
      return (
        <div
          style={{
            padding: num("padding", 20),
            borderRadius: num("radius", 12),
            background: str("background") || "#f8fafc",
            boxShadow: p.shadow ? "0 8px 24px rgba(15,23,42,0.08)" : undefined,
          }}
        >
          <DynamicIcon name={str("icon", "Sparkles")} size={28} color="var(--gs-primary)" />
          <h3 style={{ margin: "12px 0 8px" }}>{str("title", "Feature")}</h3>
          <p style={{ margin: 0, color: "#64748b" }}>{str("body", "")}</p>
          {str("ctaLabel") && (
            <a href={str("ctaHref", "#")} style={{ display: "inline-block", marginTop: 12 }}>
              {str("ctaLabel")}
            </a>
          )}
        </div>
      );

    case "card":
      return (
        <div
          style={{
            padding: num("padding", 16),
            borderRadius: num("radius", 12),
            background: str("background") || "#fff",
            border: "1px solid #e2e8f0",
            boxShadow: p.shadow ? "0 8px 24px rgba(15,23,42,0.08)" : undefined,
            overflow: "hidden",
          }}
        >
          {str("image") && (
            <img
              src={str("image")}
              alt=""
              style={{
                width: "100%",
                height: num("imageHeight", 160) || 160,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
          )}
          {str("badge") && (
            <span
              style={{
                display: "inline-block",
                marginTop: 10,
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                background: str("badgeColor") || "var(--gs-secondary)",
                color: "#fff",
              }}
            >
              {str("badge")}
            </span>
          )}
          <h3 style={{ margin: "10px 0 6px", color: str("titleColor") || undefined }}>
            {str("title", "Card")}
          </h3>
          <p style={{ margin: 0, color: "#64748b" }}>{str("description", "")}</p>
          {(str("price") || str("oldPrice")) && (
            <div style={{ marginTop: 10, fontWeight: 600, color: str("priceColor") || undefined }}>
              {str("price")}
              {str("oldPrice") && (
                <span style={{ marginLeft: 8, opacity: 0.6, textDecoration: "line-through" }}>
                  {str("oldPrice")}
                </span>
              )}
            </div>
          )}
          {str("ctaLabel") && (
            <button
              type="button"
              style={{
                marginTop: 12,
                border: "none",
                padding: "8px 14px",
                borderRadius: 8,
                background: str("ctaBg") || "var(--gs-primary)",
                color: str("ctaColor") || "#fff",
                cursor: "pointer",
              }}
            >
              {str("ctaLabel")}
            </button>
          )}
          {children.map((c) => (
            <ElementView key={c.id} el={c} bp={bp} pages={pages} />
          ))}
        </div>
      );

    case "footer": {
      const align = str("align", "left");
      const isMobile = bp === "mobile";
      const stack = isMobile || align === "center";
      const items =
        align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
      const justify =
        align === "center" ? "center" : align === "right" ? "flex-end" : "space-between";
      return (
        <footer
          style={{
            paddingTop: num("paddingTop", isMobile ? 32 : 48),
            paddingBottom: num("paddingBottom", isMobile ? 24 : 32),
            background: str("background") || "#0f172a",
            color: str("color") || "#e2e8f0",
            textAlign: (align as CSSProperties["textAlign"]) || "left",
          }}
        >
          <div
            style={{
              maxWidth: isMobile ? "100%" : 1100,
              margin: "0 auto",
              padding: isMobile ? "0 16px" : bp === "tablet" ? "0 24px" : "0 32px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: stack ? "column" : "row",
                alignItems: items,
                justifyContent: justify,
                gap: stack ? 20 : 32,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: items,
                  gap: 8,
                  maxWidth: stack ? "100%" : 360,
                  flex: stack ? undefined : 1,
                  minWidth: 0,
                }}
              >
                {str("brandImage") ? (
                  <img
                    src={str("brandImage")}
                    alt={str("brandText", "")}
                    style={{ height: isMobile ? 28 : 36, width: "auto", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ fontWeight: 700, fontSize: isMobile ? 16 : 18 }}>
                    {str("brandText", "Brand")}
                  </div>
                )}
                {str("tagline") && (
                  <p style={{ margin: 0, opacity: 0.75, fontSize: isMobile ? 12 : 14 }}>
                    {str("tagline")}
                  </p>
                )}
              </div>
              <FooterLinks p={p} pages={pages} bp={bp} align={align} />
            </div>
            <p
              style={{
                marginTop: isMobile ? 24 : 32,
                paddingTop: isMobile ? 12 : 16,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                fontSize: isMobile ? 11 : 13,
                opacity: 0.7,
              }}
            >
              {str("copyright", \`© \${new Date().getFullYear()}\`)}
            </p>
          </div>
        </footer>
      );
    }

    default:
      return (
        <div>
          {children.map((c) => (
            <ElementView key={c.id} el={c} bp={bp} pages={pages} />
          ))}
        </div>
      );
  }
}

function alignToFlex(align: string) {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
}

function FormBlock({ p }: { p: Record<string, unknown> }) {
  const fields = Array.isArray(p.fields) ? p.fields : [];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        alert("Form submitted (wire your API in the exported project).");
      }}
      style={{
        maxWidth: 480,
        margin:
          p.align === "center" ? "0 auto" : p.align === "right" ? "0 0 0 auto" : "0",
        display: "grid",
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0 }}>{String(p.title ?? "Contact")}</h3>
      {fields.map((raw) => {
        const f = raw as {
          id: string;
          type: string;
          label: string;
          placeholder?: string;
          required?: boolean;
          options?: string[];
        };
        return (
          <label key={f.id} style={{ display: "grid", gap: 4, fontSize: 14 }}>
            <span>
              {f.label}
              {f.required ? " *" : ""}
            </span>
            {f.type === "long" ? (
              <textarea required={!!f.required} placeholder={f.placeholder} rows={4} />
            ) : f.type === "select" ? (
              <select required={!!f.required} defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.type === "checkbox" ? (
              <input type="checkbox" required={!!f.required} />
            ) : (
              <input
                type={f.type === "email" ? "email" : "text"}
                required={!!f.required}
                placeholder={f.placeholder}
              />
            )}
          </label>
        );
      })}
      <button
        type="submit"
        style={{
          border: "none",
          padding: "10px 16px",
          borderRadius: 8,
          background: "var(--gs-primary)",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        {String(p.buttonLabel ?? "Send")}
      </button>
    </form>
  );
}

function AccordionBlock({ p }: { p: Record<string, unknown> }) {
  const items = Array.isArray(p.items) ? (p.items as { header: string; body: string }[]) : [];
  const [open, setOpen] = useState(typeof p.openIndex === "number" ? p.openIndex : 0);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? -1 : i)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              border: "none",
              background: "#f8fafc",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {item.header}
          </button>
          {open === i && <div style={{ padding: 14 }}>{item.body}</div>}
        </div>
      ))}
    </div>
  );
}

function TabsBlock({ p }: { p: Record<string, unknown> }) {
  const items = Array.isArray(p.items) ? (p.items as { label: string; body: string }[]) : [];
  const [active, setActive] = useState(typeof p.activeIndex === "number" ? p.activeIndex : 0);
  return (
    <div>
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #e2e8f0", marginBottom: 12 }}>
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            style={{
              border: "none",
              background: "transparent",
              padding: "8px 12px",
              cursor: "pointer",
              borderBottom: active === i ? "2px solid var(--gs-primary)" : "2px solid transparent",
              fontWeight: active === i ? 600 : 400,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div>{items[active]?.body}</div>
    </div>
  );
}

function HeroCarousel({ p }: { p: Record<string, unknown> }) {
  const slides = Array.isArray(p.slides)
    ? (p.slides as {
        id: string;
        image?: string;
        overlay?: string;
        headline?: string;
        ctaLabel?: string;
        ctaHref?: string;
      }[])
    : [];
  const [i, setI] = useState(typeof p.activeIndex === "number" ? p.activeIndex : 0);
  const slide = slides[i] ?? slides[0];
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);
  if (!slide) return null;
  return (
    <div
      style={{
        position: "relative",
        height: typeof p.height === "number" ? p.height : 420,
        backgroundImage: slide.image ? \`url(\${slide.image})\` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#0f172a",
        color: "#fff",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: slide.overlay || "rgba(15,23,42,0.45)",
          display: "grid",
          placeItems: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 16px", fontSize: 40 }}>{slide.headline}</h2>
          {slide.ctaLabel && (
            <a
              href={slide.ctaHref || "#"}
              style={{
                display: "inline-block",
                padding: "10px 18px",
                borderRadius: 8,
                background: "var(--gs-primary)",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              {slide.ctaLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageCarousel({ p }: { p: Record<string, unknown> }) {
  const slides = Array.isArray(p.slides)
    ? (p.slides as { id: string; src?: string; caption?: string }[])
    : [];
  const [i, setI] = useState(typeof p.activeIndex === "number" ? p.activeIndex : 0);
  const slide = slides[i] ?? slides[0];
  if (!slide) return null;
  return (
    <div>
      <img
        src={slide.src}
        alt={slide.caption || ""}
        style={{
          width: "100%",
          height: typeof p.height === "number" ? p.height : 320,
          objectFit: "cover",
          borderRadius: 12,
        }}
      />
      {p.showCaptions !== false && slide.caption && (
        <p style={{ textAlign: "center", color: "#64748b" }}>{slide.caption}</p>
      )}
      {slides.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          <button type="button" onClick={() => setI((x) => (x - 1 + slides.length) % slides.length)}>
            Prev
          </button>
          <button type="button" onClick={() => setI((x) => (x + 1) % slides.length)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function NavbarBlock({
  p,
  pages,
}: {
  p: Record<string, unknown>;
  pages: PageMeta[];
}) {
  const links = Array.isArray(p.links)
    ? (p.links as {
        id: string;
        label: string;
        href?: string;
        linkType?: string;
        pageId?: string;
      }[])
    : [];
  return (
    <nav
      style={{
        position: p.sticky ? "sticky" : "relative",
        top: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 24px",
        background: String(p.background || "#ffffff"),
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
        {typeof p.brandImage === "string" && p.brandImage ? (
          <img src={p.brandImage} alt="" style={{ height: 28 }} />
        ) : null}
        {String(p.brandText || "Brand")}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {links.map((link) => {
          if (link.linkType === "internal" && link.pageId) {
            const target = pages.find((pg) => pg.id === link.pageId);
            const to = target ? (target.slug === "/" ? "/" : target.slug) : "/";
            return (
              <Link key={link.id} to={to} style={{ textDecoration: "none" }}>
                {link.label}
              </Link>
            );
          }
          return (
            <a key={link.id} href={link.href || "#"} style={{ textDecoration: "none" }}>
              {link.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function FooterLinks({
  p,
  pages,
  bp,
  align,
}: {
  p: Record<string, unknown>;
  pages: PageMeta[];
  bp: Breakpoint;
  align: string;
}) {
  const links = Array.isArray(p.links)
    ? (p.links as {
        id: string;
        label: string;
        href?: string;
        linkType?: string;
        pageId?: string;
      }[])
    : [];
  if (!links.length) return null;
  const isMobile = bp === "mobile";
  const justify =
    align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        flexWrap: "wrap",
        gap: isMobile ? 10 : 24,
        justifyContent: justify,
        alignItems: isMobile
          ? align === "center"
            ? "center"
            : align === "right"
              ? "flex-end"
              : "flex-start"
          : "center",
      }}
    >
      {links.map((link) => {
        if (link.linkType === "internal" && link.pageId) {
          const target = pages.find((pg) => pg.id === link.pageId);
          const to = target ? (target.slug === "/" ? "/" : target.slug) : "/";
          return (
            <Link key={link.id} to={to} style={{ color: "inherit", opacity: 0.9 }}>
              {link.label}
            </Link>
          );
        }
        return (
          <a key={link.id} href={link.href || "#"} style={{ color: "inherit", opacity: 0.9 }}>
            {link.label}
          </a>
        );
      })}
    </div>
  );
}
`;
