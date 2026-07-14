import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Square,
  RectangleHorizontal,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  Mail,
  Trash2,
  GripVertical,
  Save,
  Rocket,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Palette,
  Columns3,
  LayoutGrid,
  ListCollapse,
  PanelsTopLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  GalleryHorizontalEnd,
  Images,
  Navigation,
  Sparkles,
  Upload,
  FolderOpen,
  Loader2,
  Maximize2,
  Heading1,
  AlignLeft,
  Shapes,
  FileText,
  Settings as SettingsIcon,
  Pencil,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DynamicIcon, type IconName } from "@/lib/dynamic-icon";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addAssetFromFile, useMediaLibrary, type LibraryAsset } from "@/store/media-store";
import { getMySubscription } from "@/services/billing.service";
import { projectsStore, useProjects, useProjectsStore, type Project } from "@/store/projects-store";
import { builderStore } from "@/store/builder-store";
import { createPage } from "@/services/page.service";
import { slugForBackend } from "@/utils/string";
import {
  BuilderDndProvider,
  CanvasDraggable,
  DropArea,
  DropGap,
  PaletteDraggable,
  handleDragEnd,
  paletteTypeFromId,
  type DragEndContext,
} from "./builder-dnd";
import { Link, useSearch } from "@tanstack/react-router";

function useProjectContext(projectId?: string) {
  const all = useProjects();
  if (!projectId) return null;
  const project = all.find((p) => p.id === projectId) as Project | undefined;
  return project ? { project } : null;
}

type ElementType =
  | "section"
  | "fullSection"
  | "text"
  | "heading"
  | "richText"
  | "icon"
  | "image"
  | "button"
  | "form"
  | "row"
  | "column"
  | "grid"
  | "accordion"
  | "tabs"
  | "tabs"
  | "carousel"
  | "imageCarousel"
  | "navbar"
  | "featureCard"
  | "card"
  | "footer";
type Viewport = "desktop" | "tablet" | "mobile";
type NavLink = {
  id: string;
  label: string;
  href: string;
  linkType?: "external" | "internal";
  pageId?: string;
};
type PageRef = { id: string; title: string; slug: string };
type AccordionItem = { header: string; body: string };
type TabItem = { label: string; body: string };
type ImageSlide = { id: string; src: string; caption: string };
type CarouselSlide = {
  id: string;
  image: string;
  overlay: number; // 0..1
  headline: string;
  ctaLabel: string;
  ctaHref: string;
};
type FormFieldType = "short" | "long" | "email" | "select" | "checkbox";
type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string; // comma-separated for select
};
type PropValue =
  | string
  | number
  | boolean
  | { desktop?: string | number; mobile?: string | number }
  | AccordionItem[]
  | TabItem[]
  | FormField[]
  | CarouselSlide[]
  | ImageSlide[]
  | NavLink[];

type BuilderElement = {
  id: string;
  type: ElementType;
  props: Record<string, PropValue>;
  children: BuilderElement[];
};

// Layout keys stored per breakpoint (desktop / mobile). Tablet inherits desktop.
const RESPONSIVE_KEYS = new Set([
  "padding",
  "paddingTop",
  "paddingBottom",
  "minHeight",
  "fontSize",
  "width",
  "align",
]);

function bpFor(vp: Viewport): "desktop" | "mobile" {
  return vp === "mobile" ? "mobile" : "desktop";
}

// Combine the builder's viewport switcher with the actual browser width so
// components render responsively both in the canvas preview AND on real
// mobile devices.
function useEffectiveViewport(vp: Viewport): Viewport {
  const realMobile = useIsMobile();
  if (vp === "mobile") return "mobile";
  return realMobile ? "mobile" : vp;
}

function readResp(val: PropValue | undefined, vp: Viewport): string | number {
  if (Array.isArray(val)) return "";
  if (val && typeof val === "object") {
    const bp = bpFor(vp);
    const v = val[bp];
    if (v !== undefined) return v;
    return (val.desktop ?? val.mobile ?? "") as string | number;
  }
  return (val ?? "") as string | number;
}

function writeResp(
  current: PropValue | undefined,
  vp: Viewport,
  value: string | number,
): PropValue {
  const bp = bpFor(vp);
  const base =
    current && typeof current === "object"
      ? current
      : {
          desktop: current as string | number | undefined,
          mobile: current as string | number | undefined,
        };
  return { ...base, [bp]: value };
}

// Palette is the source of order in the sidebar.
const PALETTE: { type: ElementType; label: string; icon: typeof Square; hint: string }[] = [
  { type: "section", label: "Section Container", icon: Square, hint: "Layout wrapper" },
  { type: "fullSection", label: "Section", icon: RectangleHorizontal, hint: "Full-width band" },
  { type: "row", label: "Flex Grid Row", icon: Columns3, hint: "Multi-column layout" },
  { type: "grid", label: "Grid Layout", icon: LayoutGrid, hint: "1, 2 or 3 columns" },
  { type: "heading", label: "Heading", icon: Heading1, hint: "Title or section header" },
  { type: "richText", label: "Rich Text", icon: AlignLeft, hint: "Paragraph body copy" },
  { type: "text", label: "Text Block", icon: Type, hint: "Inline text snippet" },
  { type: "image", label: "Image Block", icon: ImageIcon, hint: "Picture or media" },
  { type: "icon", label: "Icon", icon: Shapes, hint: "Lucide vector icon" },
  { type: "button", label: "Button", icon: MousePointerClick, hint: "Call to action" },
  { type: "form", label: "Contact Form", icon: Mail, hint: "Name, email, message" },
  { type: "accordion", label: "Accordion / FAQ", icon: ListCollapse, hint: "Collapsible items" },
  { type: "tabs", label: "Tabs Switcher", icon: PanelsTopLeft, hint: "Switchable panels" },
  {
    type: "carousel",
    label: "Hero Carousel",
    icon: GalleryHorizontalEnd,
    hint: "Slider with CTAs",
  },
  {
    type: "imageCarousel",
    label: "Image Carousel",
    icon: Images,
    hint: "Swipeable image slideshow",
  },
  { type: "navbar", label: "Navigation Header", icon: Navigation, hint: "Logo + menu links" },
  { type: "featureCard", label: "Feature Card", icon: Sparkles, hint: "Icon, title, text, CTA" },
  { type: "card", label: "Card", icon: Square, hint: "Stylized container drop zone" },
  { type: "footer", label: "Footer", icon: RectangleHorizontal, hint: "Brand, links, copyright" },
];

type RowTemplate = "1-1" | "1-1-1" | "1-3";
const ROW_LAYOUTS: { id: RowTemplate; label: string; fractions: number[]; description: string }[] =
  [
    { id: "1-1", label: "1/2 + 1/2", fractions: [1, 1], description: "Two equal columns" },
    {
      id: "1-1-1",
      label: "1/3 + 1/3 + 1/3",
      fractions: [1, 1, 1],
      description: "Three equal columns",
    },
    { id: "1-3", label: "1/4 + 3/4", fractions: [1, 3], description: "Sidebar + content" },
  ];

function rowFractions(template: string): number[] {
  return ROW_LAYOUTS.find((l) => l.id === template)?.fractions ?? [1, 1];
}

// Empty strings mean "inherit the global token (CSS var)".
const defaults: Record<ElementType, BuilderElement["props"]> = {
  section: { padding: 32, background: "", minHeight: 120 },
  fullSection: { paddingTop: 64, paddingBottom: 64, background: "", backgroundImage: "" },
  text: { content: "Edit this text block.", fontSize: 16, align: "left", color: "" },
  heading: { content: "Your headline goes here", tag: "h2", align: "left", color: "" },
  richText: {
    content:
      "Rich Text lets you write a longer paragraph of body copy. Adjust the font size and alignment from the properties panel.",
    fontSize: 16,
    align: "left",
    color: "",
  },
  icon: { name: "sparkles", size: 48, color: "" },
  image: {
    src: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800",
    alt: "Placeholder",
    width: 480,
    radius: 12,
  },
  button: {
    label: "Click me",
    bg: "",
    color: "",
    radius: 0,
    align: "left",
    href: "#",
    linkType: "external",
    pageId: "",
  },
  form: {
    title: "Get in touch",
    buttonLabel: "Send message",
    align: "left",
    emailJsTemplateId: "",
    fields: [
      { id: "f_name", type: "short", label: "Your name", placeholder: "Jane Doe", required: true },
      {
        id: "f_email",
        type: "email",
        label: "Email address",
        placeholder: "you@example.com",
        required: true,
      },
      {
        id: "f_msg",
        type: "long",
        label: "Your message",
        placeholder: "Tell us a bitâ€¦",
        required: false,
      },
    ] as FormField[],
  },
  row: { template: "1-1", gap: 16 },
  grid: { columns: 2, gap: 16 },
  column: {},
  accordion: {
    items: [
      {
        header: "What is this builder?",
        body: "A modern drag-and-drop workspace for assembling pages.",
      },
      {
        header: "Can I nest components?",
        body: "Yes â€” sections, rows and columns accept other primitives.",
      },
      {
        header: "Is everything responsive?",
        body: "Layout values are stored per breakpoint and adapt automatically.",
      },
    ] as AccordionItem[],
    openIndex: 0,
  },
  tabs: {
    items: [
      {
        label: "Overview",
        body: "Welcome â€” edit this panel from the properties panel on the right.",
      },
      {
        label: "Features",
        body: "Each tab keeps its own content. Click a tab on the canvas to edit it.",
      },
      { label: "Pricing", body: "Add or remove tabs to fit your design." },
    ] as TabItem[],
    activeIndex: 0,
    activeStyle: "underline",
  },
  carousel: {
    activeIndex: 0,
    height: 360,
    slides: [
      {
        id: "s_1",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600",
        overlay: 0.45,
        headline: "Build faster, ship sooner",
        ctaLabel: "Get started",
        ctaHref: "#",
      },
      {
        id: "s_2",
        image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1600",
        overlay: 0.55,
        headline: "Designed for modern teams",
        ctaLabel: "See features",
        ctaHref: "#",
      },
      {
        id: "s_3",
        image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1600",
        overlay: 0.5,
        headline: "Loved by makers worldwide",
        ctaLabel: "Read stories",
        ctaHref: "#",
      },
    ] as CarouselSlide[],
  },
  imageCarousel: {
    activeIndex: 0,
    height: 320,
    showCaptions: true,
    slides: [
      {
        id: "img_1",
        src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600",
        caption: "Misty mountain morning",
      },
      {
        id: "img_2",
        src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1600",
        caption: "Lakeside reflections",
      },
      {
        id: "img_3",
        src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600",
        caption: "Golden hour over the valley",
      },
    ] as ImageSlide[],
  },
  navbar: {
    brandText: "Acme",
    brandImage: "",
    sticky: false,
    background: "",
    links: [
      { id: "n_1", label: "Home", href: "#" },
      { id: "n_2", label: "Features", href: "#features" },
      { id: "n_3", label: "Pricing", href: "#pricing" },
      { id: "n_4", label: "Contact", href: "#contact" },
    ] as NavLink[],
  },
  featureCard: {
    icon: "sparkles",
    title: "Lightning fast",
    body: "Describe your feature in a sentence or two. Highlight the value it brings.",
    ctaLabel: "Learn more",
    ctaHref: "#",
    background: "",
    radius: 16,
    shadow: "md",
    padding: 28,
  },
  card: {
    padding: 20,
    radius: 16,
    background: "",
    shadow: true,
    productMode: true,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
    imageHeight: 220,
    badge: "New",
    badgeColor: "#6366f1",
    title: "Air Runner 2026",
    titleColor: "",
    description:
      "Lightweight performance sneaker with breathable knit upper and responsive foam sole.",
    price: "$129.00",
    oldPrice: "$159.00",
    priceColor: "#6366f1",
    rating: 4.5,
    ctaLabel: "Add to cart",
    ctaBg: "#6366f1",
    ctaColor: "#ffffff",
  },
  footer: {
    brandText: "Acme",
    brandImage: "",
    tagline: "Beautifully built with the drag-and-drop editor.",
    copyright: `Â© ${new Date().getFullYear()} Acme, Inc. All rights reserved.`,
    background: "",
    color: "",
    paddingTop: 48,
    paddingBottom: 32,
    align: "left",
    links: [
      { id: "fn_1", label: "About", href: "#", linkType: "external" },
      { id: "fn_2", label: "Features", href: "#features", linkType: "external" },
      { id: "fn_3", label: "Pricing", href: "#pricing", linkType: "external" },
      { id: "fn_4", label: "Contact", href: "#contact", linkType: "external" },
    ] as NavLink[],
  },
};

type GlobalStyles = {
  primary: string;
  secondary: string;
  font: string;
  radius: number;
};

const DEFAULT_GLOBALS: GlobalStyles = {
  primary: "#6366f1",
  secondary: "#a855f7",
  font: "Inter, system-ui, sans-serif",
  radius: 12,
};

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Inter (Sans)", value: "Inter, system-ui, sans-serif" },
  { label: "Poppins (Sans)", value: "'Poppins', system-ui, sans-serif" },
  { label: "Playfair Display (Serif)", value: "'Playfair Display', Georgia, serif" },
  { label: "DM Serif Display (Serif)", value: "'DM Serif Display', Georgia, serif" },
  { label: "JetBrains Mono (Mono)", value: "'JetBrains Mono', Menlo, monospace" },
  { label: "System UI", value: "system-ui, sans-serif" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Ensure every node has props + children (IndexedDB / API data may omit them). */
function normalizeNode(node: BuilderElement): BuilderElement {
  return {
    ...node,
    props: node.props ?? {},
    children: (node.children ?? []).map(normalizeNode),
  };
}

function normalizeTree(nodes: BuilderElement[] | undefined | null): BuilderElement[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map(normalizeNode);
}

function makeElement(type: ElementType): BuilderElement {
  if (type === "grid") return makeGrid(2);
  return { id: uid(), type, props: { ...defaults[type] }, children: [] };
}

function makeRow(template: RowTemplate): BuilderElement {
  const fractions = rowFractions(template);
  const columns: BuilderElement[] = fractions.map(() => makeElement("column"));
  return {
    id: uid(),
    type: "row",
    props: { ...defaults.row, template },
    children: columns,
  };
}

function makeGrid(columns: number): BuilderElement {
  const cols = Math.max(1, Math.min(3, columns));
  return {
    id: uid(),
    type: "grid",
    props: { ...defaults.grid, columns: cols },
    children: Array.from({ length: cols }, () => makeElement("column")),
  };
}

function insertInto(
  tree: BuilderElement[],
  parentId: string | null,
  node: BuilderElement,
): BuilderElement[] {
  if (parentId === null) return [...tree, node];
  return tree.map((el) =>
    el.id === parentId
      ? { ...el, children: [...(el.children ?? []), node] }
      : { ...el, children: insertInto(el.children ?? [], parentId, node) },
  );
}

function updateNode(
  tree: BuilderElement[],
  id: string,
  fn: (n: BuilderElement) => BuilderElement,
): BuilderElement[] {
  return tree.map((el) => {
    if (el.id === id) return fn(el);
    return { ...el, children: updateNode(el.children ?? [], id, fn) };
  });
}

function removeNode(tree: BuilderElement[], id: string): BuilderElement[] {
  return tree
    .filter((el) => el.id !== id)
    .map((el) => ({ ...el, children: removeNode(el.children ?? [], id) }));
}

function findNode(tree: BuilderElement[], id: string): BuilderElement | null {
  for (const el of tree) {
    if (el.id === id) return el;
    const c = findNode(el.children ?? [], id);
    if (c) return c;
  }
  return null;
}

function insertAtIndex(
  tree: BuilderElement[],
  parentId: string | null,
  index: number,
  node: BuilderElement,
): BuilderElement[] {
  if (parentId === null) {
    const copy = [...tree];
    copy.splice(Math.max(0, Math.min(index, copy.length)), 0, node);
    return copy;
  }
  return tree.map((el) => {
    if (el.id === parentId) {
      const copy = [...(el.children ?? [])];
      copy.splice(Math.max(0, Math.min(index, copy.length)), 0, node);
      return { ...el, children: copy };
    }
    return { ...el, children: insertAtIndex(el.children ?? [], parentId, index, node) };
  });
}

function containsDescendant(node: BuilderElement, id: string): boolean {
  return (node.children ?? []).some((c) => c.id === id || containsDescendant(c, id));
}

function moveNode(
  tree: BuilderElement[],
  draggedId: string,
  targetParentId: string | null,
  beforeIndex: number,
): BuilderElement[] {
  const dragged = findNode(tree, draggedId);
  if (!dragged) return tree;
  if (targetParentId === draggedId) return tree;
  if (targetParentId && containsDescendant(dragged, targetParentId)) return tree;

  // Adjust target index when moving within the same parent and the source is
  // before the target slot (removal shifts later indices left by one).
  let adjustedIndex = beforeIndex;
  const findSiblings = (nodes: BuilderElement[], pid: string | null): BuilderElement[] | null => {
    if (pid === null) return nodes;
    for (const n of nodes) {
      if (n.id === pid) return n.children ?? [];
      const r = findSiblings(n.children ?? [], pid);
      if (r) return r;
    }
    return null;
  };
  const siblings = findSiblings(tree, targetParentId);
  if (siblings) {
    const currentIdx = siblings.findIndex((s) => s.id === draggedId);
    if (currentIdx !== -1 && currentIdx < beforeIndex) adjustedIndex = beforeIndex - 1;
  }

  const without = removeNode(tree, draggedId);
  return insertAtIndex(without, targetParentId, adjustedIndex, dragged);
}

export function Builder() {
  const saveMutation = useMutation({ mutationFn: createPage });
  const search = useSearch({ from: "/" });
  const projectCtx = useProjectContext(search.project);
  const projectsLoaded = useProjectsStore((s) => s.loaded);
  const billingQuery = useQuery({
    queryKey: ["billing", "me"],
    queryFn: getMySubscription,
    staleTime: 60_000,
  });
  const allowedComponentTypes = useMemo(() => {
    const plan = billingQuery.data?.plan;
    if (!plan || plan.allBuilderComponents) return null; // null = all allowed
    return new Set(plan.builderComponents);
  }, [billingQuery.data]);
  const isComponentAllowed = useCallback(
    (type: string) => !allowedComponentTypes || allowedComponentTypes.has(type),
    [allowedComponentTypes],
  );

  useEffect(() => {
    if (!search.project) return;
    if (projectsLoaded) return;
    void projectsStore.load().catch(() => {
      /* builder can still work standalone */
    });
  }, [search.project, projectsLoaded]);

  const [elements, setElements] = useState<BuilderElement[]>([]);
  const [past, setPast] = useState<BuilderElement[][]>([]);
  const [future, setFuture] = useState<BuilderElement[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [globals, setGlobals] = useState<GlobalStyles>(DEFAULT_GLOBALS);
  const [globalsOpen, setGlobalsOpen] = useState(false);
  const [pendingRowParent, setPendingRowParent] = useState<{ parentId: string | null } | null>(
    null,
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const isMobile = useIsMobile();
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [mobilePropsOpen, setMobilePropsOpen] = useState(false);

  // Page manager state — one canvas tree per Page, isolated by activePageId.
  type Page = { id: string; title: string; slug: string; canvasNodes: BuilderElement[] };
  const [pages, setPages] = useState<Page[]>(() => {
    if (projectCtx?.project) {
      return projectCtx.project.pages.map(
        (p: { id: string; title: string; slug: string; canvasNodes?: unknown[] }) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          canvasNodes: normalizeTree(p.canvasNodes as BuilderElement[] | undefined),
        }),
      );
    }
    return [
      { id: "page-home", title: "Home", slug: "/", canvasNodes: [] },
      { id: "page-about", title: "About Us", slug: "/about-us", canvasNodes: [] },
    ];
  });
  const [activePageId, setActivePageId] = useState<string>(() => {
    if (projectCtx?.project) {
      const found = projectCtx.project.pages.find((p: { id: string }) => p.id === search.page);
      return found?.id ?? projectCtx.project.pages[0]?.id ?? "page-home";
    }
    return "page-home";
  });
  const [pagesOpen, setPagesOpen] = useState(false);
  const [addPageOpen, setAddPageOpen] = useState(false);
  const [editPage, setEditPage] = useState<Page | null>(null);
  const [projectHydrated, setProjectHydrated] = useState(!search.project);

  // When API project arrives after load, hydrate local page state once.
  useEffect(() => {
    if (!search.project || !projectCtx?.project || projectHydrated) return;
    const mapped = projectCtx.project.pages.map(
      (p: { id: string; title: string; slug: string; canvasNodes?: unknown[] }) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        canvasNodes: normalizeTree(p.canvasNodes as BuilderElement[] | undefined),
      }),
    );
    setPages(mapped);
    const found = mapped.find((p) => p.id === search.page);
    const nextId = found?.id ?? mapped[0]?.id;
    if (nextId) {
      setActivePageId(nextId);
      const target = mapped.find((p) => p.id === nextId);
      setElements(normalizeTree(target?.canvasNodes ?? []));
    }
    setProjectHydrated(true);
  }, [search.project, search.page, projectCtx?.project, projectHydrated]);

  // Load standalone layout from IndexedDB (non-project mode).
  useEffect(() => {
    if (projectCtx?.project) return;
    const saved = builderStore.getStandaloneLayout();
    if (saved.length > 0 && elements.length === 0) {
      setElements(normalizeTree(saved as BuilderElement[]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectCtx?.project]);

  // When in project mode, mirror local pages into the in-memory projects cache.
  useEffect(() => {
    if (!projectCtx?.project) return;
    projectsStore.patchLocalPages(
      projectCtx.project.id,
      pages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        canvasNodes: p.canvasNodes,
      })),
    );
  }, [pages, projectCtx?.project?.id]);

  // Load the requested page's canvas on first mount when arriving via ?page=
  useEffect(() => {
    if (!projectCtx?.project) return;
    const target = pages.find((p) => p.id === activePageId);
    if (target && target.canvasNodes.length > 0 && elements.length === 0) {
      setElements(normalizeTree(target.canvasNodes));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the active page's canvasNodes in sync with the live canvas tree.
  // This guarantees edits are always saved to the currently active page only.
  useEffect(() => {
    setPages((prev) => {
      const current = prev.find((p) => p.id === activePageId);
      if (!current || current.canvasNodes === elements) return prev;
      return prev.map((p) => (p.id === activePageId ? { ...p, canvasNodes: elements } : p));
    });
  }, [elements, activePageId]);

  // In standalone mode, keep IndexedDB layout in sync live (so Clear all persists immediately).
  useEffect(() => {
    if (projectCtx?.project) return;
    builderStore.setStandaloneLayout(elements);
  }, [elements, projectCtx?.project]);

  const slugify = (s: string) =>
    "/" +
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];

  const loadPageIntoCanvas = (nodes: BuilderElement[]) => {
    const normalized = normalizeTree(nodes);
    // Completely clear then reload the canvas with the target page's nodes.
    setElements([]);
    setPast([]);
    setFuture([]);
    setSelectedId(null);
    // Defer to next tick so the clear commits before the reload.
    queueMicrotask(() => setElements(normalized));
  };

  const switchPage = (id: string) => {
    if (id === activePageId) return;
    // Persist the current canvas to the outgoing page before switching.
    setPages((prev) =>
      prev.map((p) => (p.id === activePageId ? { ...p, canvasNodes: elements } : p)),
    );
    const target = pages.find((p) => p.id === id);
    setActivePageId(id);
    loadPageIntoCanvas(target?.canvasNodes ?? []);
  };

  const addPage = (title: string, slug: string) => {
    const id = "page-" + Math.random().toString(36).slice(2, 8);
    const cleanSlug = slug.startsWith("/") ? slug : "/" + slug;
    const newPage: Page = {
      id,
      title: title.trim() || "Untitled",
      slug: cleanSlug,
      canvasNodes: [],
    };
    setPages((prev) => [
      ...prev.map((p) => (p.id === activePageId ? { ...p, canvasNodes: elements } : p)),
      newPage,
    ]);
    setActivePageId(id);
    loadPageIntoCanvas([]);
    toast.success("Page created", { description: `${newPage.title} Â· ${newPage.slug}` });
  };

  const updatePageMeta = (id: string, title: string, slug: string) => {
    const cleanSlug = slug.startsWith("/") ? slug : "/" + slug;
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, title: title.trim() || "Untitled", slug: cleanSlug } : p,
      ),
    );
    toast.success("Page updated");
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) {
      toast.error("You need at least one page");
      return;
    }
    const target = pages.find((p) => p.id === id);
    const remaining = pages.filter((p) => p.id !== id);
    setPages(remaining);
    if (id === activePageId) {
      const next = remaining[0];
      setActivePageId(next.id);
      loadPageIntoCanvas(next.canvasNodes);
    }
    toast.success("Page deleted", { description: target?.title });
  };

  const selected = selectedId ? findNode(elements, selectedId) : null;

  const commit = (next: BuilderElement[]) => {
    setPast((p) => [...p, elements]);
    setFuture([]);
    setElements(normalizeTree(next));
  };

  const commitWithPrior = (prior: BuilderElement[], next: BuilderElement[]) => {
    setPast((p) => [...p, prior]);
    setFuture([]);
    setElements(next);
  };

  const undo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [elements, ...f]);
    setElements(prev);
    if (selectedId && !findNode(prev, selectedId)) setSelectedId(null);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, elements]);
    setElements(next);
    if (selectedId && !findNode(next, selectedId)) setSelectedId(null);
  };

  const onDragEnd = useCallback(
    (event: Parameters<typeof handleDragEnd>[0]) => {
      const activeId = String(event.active.id);
      const paletteType = paletteTypeFromId(activeId);
      if (paletteType && !isComponentAllowed(paletteType)) {
        toast.error("Upgrade your plan to use this component — see Billing");
        return;
      }
      handleDragEnd(event, {
        elements,
        commit: (next) => commit(next as BuilderElement[]),
        setSelectedId,
        onRequestRowLayout: (parentId) => setPendingRowParent({ parentId }),
        makeElement,
        findNode: findNode as DragEndContext["findNode"],
        insertInto: insertInto as DragEndContext["insertInto"],
        insertAtIndex: insertAtIndex as DragEndContext["insertAtIndex"],
        moveNode: moveNode as DragEndContext["moveNode"],
      });
    },
    [elements, commit, isComponentAllowed],
  );


  const confirmRowLayout = (template: RowTemplate) => {
    if (!pendingRowParent) return;
    const node = makeRow(template);
    commit(insertInto(elements, pendingRowParent.parentId, node));
    setSelectedId(node.id);
    setPendingRowParent(null);
  };

  // Live (non-history) prop update for the currently selected element.
  const updatePropLive = (key: string, value: PropValue) => {
    if (!selected) return;
    setElements((prev) =>
      updateNode(prev, selected.id, (n) => ({ ...n, props: { ...n.props, [key]: value } })),
    );
  };

  // Live prop update for any node by id â€” used for on-canvas interactions
  // (accordion toggle, tabs switch) that should NOT pollute the history stack.
  const setNodeProp = (id: string, key: string, value: PropValue) => {
    setElements((prev) =>
      updateNode(prev, id, (n) => ({ ...n, props: { ...n.props, [key]: value } })),
    );
  };

  // Commit a prop change to history.
  const commitProp = (key: string, priorValue: PropValue, nextValue: PropValue) => {
    if (!selected) return;
    const id = selected.id;
    const prior = updateNode(elements, id, (n) => ({
      ...n,
      props: { ...n.props, [key]: priorValue },
    }));
    const next = updateNode(elements, id, (n) => ({
      ...n,
      props: { ...n.props, [key]: nextValue },
    }));
    commitWithPrior(prior, next);
  };

  const removeSelected = () => {
    if (!selected) return;
    commit(removeNode(elements, selected.id));
    setSelectedId(null);
  };

  // Resize a grid's column children (1..3), preserving existing column contents.
  const resizeGridColumns = (cols: number) => {
    if (!selected || selected.type !== "grid") return;
    const target = Math.max(1, Math.min(3, cols));
    const next = updateNode(elements, selected.id, (n) => {
      const current = n.children;
      let children = current;
      if (target > current.length) {
        const extra = Array.from({ length: target - current.length }, () => makeElement("column"));
        children = [...current, ...extra];
      } else if (target < current.length) {
        children = current.slice(0, target);
      }
      return { ...n, props: { ...n.props, columns: target }, children };
    });
    commit(next);
  };

  const clearAll = () => {
    if (elements.length === 0) return;
    commit([]);
    setSelectedId(null);
  };

  const handleSave = () => {
    try {
      const pageTitle = activePage?.title ?? "Untitled page";
      const pageSlug = activePage?.slug ?? "/";

      if (projectCtx?.project) {
        const nextPages = pages.map((p) =>
          p.id === activePageId ? { ...p, canvasNodes: elements } : p,
        );
        void projectsStore
          .setPages(
            projectCtx.project.id,
            nextPages.map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              canvasNodes: p.canvasNodes,
            })),
          )
          .then(() => {
            toast.success("Project saved", {
              description: `${projectCtx.project.name} · ${activePage?.title ?? ""}`,
            });
          })
          .catch((error: Error) => {
            toast.error("Could not save project", { description: error.message });
          });
        return;
      }

      builderStore.setStandaloneLayout(elements);
      toast.success("Layout saved", { description: "Tree stored in IndexedDB." });

      void saveMutation
        .mutateAsync({
          title: pageTitle,
          slug: slugForBackend(pageTitle, pageSlug),
          layoutData: { elements },
        })
        .then((page) => {
          toast.success("Synced to server", { description: `Saved as /${page.slug}` });
        })
        .catch((error: Error) => {
          toast.error("Server save failed", { description: error.message });
        });
    } catch {
      toast.error("Could not save layout");
    }
  };

  const handlePublish = () => {
    toast.success("Published!", { description: "Your page is now live (demo)." });
  };

  return (
    <BuilderDndProvider
      onDragEnd={onDragEnd}
      renderOverlay={(activeId) => {
        if (!activeId) return null;
        const paletteType = paletteTypeFromId(activeId);
        if (paletteType) {
          const item = PALETTE.find((p) => p.type === paletteType);
          if (item) {
            return (
              <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-lg">
                {item.label}
              </div>
            );
          }
        }
        const dragged = findNode(elements, activeId);
        if (dragged) {
          return (
            <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-lg">
              {shortLabel(dragged.type)}
            </div>
          );
        }
        return null;
      }}
    >
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/60 px-3 md:px-5 backdrop-blur">
        <div className="flex items-center gap-3">
          {projectCtx?.project && (
            <Link
              to="/dashboard/projects/$projectId"
              params={{ projectId: projectCtx.project.id }}
              className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/15"
              title="Back to project"
            >
              <ChevronLeft className="h-3 w-3" />
              {projectCtx.project.name}
            </Link>
          )}
          <div className="ml-3 flex items-center gap-1 border-l border-border pl-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={undo}
              disabled={past.length === 0}
              aria-label="Undo"
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={redo}
              disabled={future.length === 0}
              aria-label="Redo"
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 rounded-md border border-border bg-background/40 p-0.5">
          {(
            [
              { id: "desktop", icon: Monitor, label: "Desktop (100%)" },
              { id: "tablet", icon: Tablet, label: "Tablet (768px)" },
              { id: "mobile", icon: Smartphone, label: "Mobile (375px)" },
            ] as { id: Viewport; icon: typeof Monitor; label: string }[]
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setViewport(id)}
              aria-label={label}
              aria-pressed={viewport === id}
              title={label}
              className={`flex h-7 w-8 items-center justify-center rounded-sm transition-colors ${
                viewport === id
                  ? "bg-indigo-500 text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isPreviewMode && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={() => setMobilePaletteOpen(true)}
                aria-label="Open components"
                title="Components"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={() => setMobilePropsOpen(true)}
                aria-label="Open properties"
                title="Properties"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setPagesOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Pages
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {pages.length}
            </span>
          </Button>
          {isPreviewMode ? (
            <Button
              size="sm"
              onClick={() => setIsPreviewMode(false)}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              Exit Preview
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsPreviewMode(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Savingâ€¦" : "Save"}
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            className="bg-indigo-500 text-white hover:bg-indigo-600"
          >
            <Rocket className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {!isPreviewMode && (
          <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-border bg-card/40 transition-all duration-300">
            <div className="border-b border-border px-5 py-4">
              <h1 className="text-sm font-semibold tracking-tight">Components</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Drag onto the canvas or into a section
              </p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {PALETTE.map(({ type, label, icon, hint }) => (
                <PaletteDraggable
                  key={type}
                  type={type}
                  label={label}
                  hint={hint}
                  icon={icon}
                  locked={!isComponentAllowed(type)}
                  onLockedClick={() =>
                    toast.error("Upgrade your plan to use this component — see Billing")
                  }
                />
              ))}
            </div>
            <div className="border-t border-border p-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setGlobalsOpen(true)}
              >
                <Palette className="mr-2 h-4 w-4" />
                Global Styles
              </Button>
            </div>
          </aside>
        )}

        <main className="flex flex-1 flex-col overflow-hidden">
          {!isPreviewMode && (
            <div className="flex h-12 items-center justify-between border-b border-border bg-card/40 px-5">
              <div className="text-xs text-muted-foreground">
                {elements.length} top-level element{elements.length === 1 ? "" : "s"}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {viewport} Â·{" "}
                  {viewport === "desktop" ? "100%" : viewport === "tablet" ? "768px" : "375px"}
                </span>
                {elements.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    Clear all
                  </Button>
                )}
              </div>
            </div>
          )}
          <div
            className={`flex-1 overflow-auto transition-all duration-300 ${
              isPreviewMode ? "bg-background p-0" : "bg-muted/20 p-8"
            }`}
            onClick={() => !isPreviewMode && setSelectedId(null)}
          >
            {(() => {
              const canvasStyle = {
                width: isPreviewMode
                  ? "100%"
                  : viewport === "desktop"
                    ? "100%"
                    : viewport === "tablet"
                      ? 768
                      : 375,
                maxWidth: "100%",
                fontFamily: globals.font,
                ["--gs-primary" as string]: globals.primary,
                ["--gs-secondary" as string]: globals.secondary,
                ["--gs-radius" as string]: `${globals.radius}px`,
                ["--gs-on-primary" as string]: "#ffffff",
                ["--gs-surface" as string]: "#111827",
                ["--gs-text" as string]: "#e5e7eb",
              } as CSSProperties;
              const canvasClass = isPreviewMode
                ? "mx-auto min-h-full transition-[width] duration-500 ease-out"
                : "mx-auto min-h-full rounded-xl border-2 border-dashed border-border bg-card/30 p-6 transition-[width] duration-500 ease-out";

              if (elements.length === 0) {
                return (
                  <DropArea parentId={null} style={canvasStyle} className={canvasClass}>
                    {isPreviewMode ? (
                      <div className="flex h-[60vh] flex-col items-center justify-center text-center text-muted-foreground">
                        <p className="text-sm">Nothing to preview yet.</p>
                      </div>
                    ) : (
                      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                          <MousePointerClick className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h2 className="text-base font-semibold">Drop components here</h2>
                        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                          Drag any component from the left sidebar. Section containers accept nested
                          elements.
                        </p>
                      </div>
                    )}
                  </DropArea>
                );
              }

              return (
                <div style={canvasStyle} className={canvasClass}>
                  <div className={isPreviewMode ? "" : "space-y-1"}>
                    {elements.map((el, i) => (
                      <Fragment key={el.id}>
                        {!isPreviewMode && <DropGap parentId={null} index={i} />}
                        <CanvasNode
                          node={el}
                          parentId={null}
                          index={i}
                          selectedId={selectedId}
                          onSelect={setSelectedId}
                          onSetProp={setNodeProp}
                          viewport={viewport}
                          preview={isPreviewMode}
                        />
                      </Fragment>
                    ))}
                    {!isPreviewMode && <DropGap parentId={null} index={elements.length} />}
                  </div>
                </div>
              );
            })()}
          </div>
        </main>

        {!isPreviewMode && (
          <aside className="hidden md:flex w-80 shrink-0 flex-col border-l border-border bg-card/40 transition-all duration-300">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold tracking-tight">Properties</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected ? `Editing ${labelFor(selected.type)}` : "Select an element to edit"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {selected ? (
                <PropertyEditor
                  element={selected}
                  viewport={viewport}
                  pages={pages.map((pg) => ({ id: pg.id, title: pg.title, slug: pg.slug }))}
                  onLiveChange={updatePropLive}
                  onCommit={commitProp}
                  onDelete={removeSelected}
                  onResizeGrid={resizeGridColumns}
                />
              ) : (
                <EmptyProps />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Mobile: Components palette drawer */}
      <Sheet open={mobilePaletteOpen && !isPreviewMode} onOpenChange={setMobilePaletteOpen}>
        <SheetContent side="left" className="w-[85vw] sm:max-w-sm p-0 flex flex-col md:hidden">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-sm">Components</SheetTitle>
            <SheetDescription className="text-xs">
              Tap a component to add it to the canvas
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {PALETTE.map(({ type, label, icon: Icon, hint }) => {
              const locked = !isComponentAllowed(type);
              return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (locked) {
                    toast.error("Upgrade your plan to use this component — see Billing");
                    return;
                  }
                  if (type === "column") return;
                  if (type === "row") {
                    setPendingRowParent({ parentId: null });
                  } else {
                    const node = makeElement(type);
                    commit(insertInto(elements, null, node));
                    setSelectedId(node.id);
                  }
                  setMobilePaletteOpen(false);
                }}
                className={`group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-indigo-500/50 hover:bg-accent ${
                  locked ? "opacity-50" : ""
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">
                    {label}
                    {locked ? " · Pro" : ""}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{hint}</div>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
              );
            })}
          </div>
          <div className="border-t border-border p-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setMobilePaletteOpen(false);
                setGlobalsOpen(true);
              }}
            >
              <Palette className="mr-2 h-4 w-4" />
              Global Styles
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile: Properties drawer */}
      <Sheet open={mobilePropsOpen && !isPreviewMode} onOpenChange={setMobilePropsOpen}>
        <SheetContent side="right" className="w-[90vw] sm:max-w-md p-0 flex flex-col md:hidden">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-sm">Properties</SheetTitle>
            <SheetDescription className="text-xs">
              {selected ? `Editing ${labelFor(selected.type)}` : "Select an element to edit"}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-5">
            {selected ? (
              <PropertyEditor
                element={selected}
                viewport={viewport}
                pages={pages.map((pg) => ({ id: pg.id, title: pg.title, slug: pg.slug }))}
                onLiveChange={updatePropLive}
                onCommit={commitProp}
                onDelete={removeSelected}
                onResizeGrid={resizeGridColumns}
              />
            ) : (
              <EmptyProps />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <GlobalStylesDialog
        open={globalsOpen}
        onOpenChange={setGlobalsOpen}
        value={globals}
        onChange={setGlobals}
      />

      <RowLayoutDialog
        open={pendingRowParent !== null}
        onCancel={() => setPendingRowParent(null)}
        onConfirm={confirmRowLayout}
      />

      <Sheet open={pagesOpen} onOpenChange={setPagesOpen}>
        <SheetContent side="right" className="w-[380px] sm:max-w-[380px]">
          <SheetHeader>
            <SheetTitle>Page Manager</SheetTitle>
            <SheetDescription>Manage the pages that make up your site.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              onClick={() => setAddPageOpen(true)}
              className="w-full justify-center bg-indigo-500 text-white hover:bg-indigo-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Page
            </Button>
            <div className="mt-2 space-y-2">
              {pages.map((p) => {
                const isActive = p.id === activePageId;
                return (
                  <div
                    key={p.id}
                    className={`group flex items-center gap-2 rounded-lg border p-3 transition-colors ${
                      isActive
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border bg-card hover:bg-accent/40"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        isActive
                          ? "bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/60"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-sm ${isActive ? "font-semibold text-foreground" : "font-medium"}`}
                      >
                        {p.title}
                      </div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {p.slug}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={isActive ? "secondary" : "outline"}
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          switchPage(p.id);
                          setPagesOpen(false);
                        }}
                        disabled={isActive}
                        title="Select to edit"
                      >
                        {isActive ? "Editing" : "Edit"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditPage(p)}
                        aria-label="Page settings"
                        title="Page settings"
                      >
                        <SettingsIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => {
                          if (confirm(`Delete page "${p.title}"?`)) deletePage(p.id);
                        }}
                        aria-label="Delete page"
                        title="Delete page"
                        disabled={pages.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AddPageDialog
        open={addPageOpen}
        onOpenChange={setAddPageOpen}
        slugify={slugify}
        onCreate={(title, slug) => {
          addPage(title, slug);
          setAddPageOpen(false);
        }}
      />

      <PageSettingsDialog
        page={editPage}
        onOpenChange={(o) => {
          if (!o) setEditPage(null);
        }}
        onSave={(title, slug) => {
          if (editPage) updatePageMeta(editPage.id, title, slug);
          setEditPage(null);
        }}
      />
    </div>
    </BuilderDndProvider>
  );
}

function labelFor(type: ElementType) {
  return PALETTE.find((p) => p.type === type)?.label ?? type;
}

function shortLabel(type: ElementType) {
  switch (type) {
    case "section":
      return "Section Container";
    case "fullSection":
      return "Section";
    case "text":
      return "Text";
    case "heading":
      return "Heading";
    case "richText":
      return "Rich Text";
    case "icon":
      return "Icon";
    case "image":
      return "Image";
    case "button":
      return "Button";
    case "form":
      return "Form";
    case "row":
      return "Row";
    case "column":
      return "Column";
    case "grid":
      return "Grid";
    case "accordion":
      return "Accordion";
    case "tabs":
      return "Tabs";
    case "carousel":
      return "Carousel";
    case "imageCarousel":
      return "Image Carousel";
    case "navbar":
      return "Navigation";
    case "featureCard":
      return "Feature Card";
    case "card":
      return "Card";
    case "footer":
      return "Footer";
  }
}

function EmptyProps() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <MousePointerClick className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No element selected</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Click any element on the canvas to see its custom properties here.
      </p>
    </div>
  );
}

function CanvasNode({
  node,
  parentId: _parentId,
  index: _index,
  selectedId,
  onSelect,
  onSetProp,
  viewport,
  preview = false,
}: {
  node: BuilderElement;
  parentId: string | null;
  index: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSetProp: (id: string, key: string, value: PropValue) => void;
  viewport: Viewport;
  preview?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const selected = !preview && node.id === selectedId;
  const isColumnChild = node.type === "column";
  const children = node.children ?? [];

  const shellClass = preview
    ? "relative"
    : `relative rounded-lg border transition-colors ${
        isColumnChild ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${
        selected
          ? "border-indigo-500 ring-2 ring-indigo-500/30"
          : hover
            ? "border-indigo-400/60"
            : "border-transparent"
      }`;

  const renderChildren = (childList: BuilderElement[]) => (
    <>
      {!preview && <DropGap parentId={node.id} index={0} />}
      {childList.map((child, i) => (
        <Fragment key={child.id}>
          <CanvasNode
            node={child}
            parentId={node.id}
            index={i}
            selectedId={selectedId}
            onSelect={onSelect}
            onSetProp={onSetProp}
            viewport={viewport}
            preview={preview}
          />
          {!preview && <DropGap parentId={node.id} index={i + 1} />}
        </Fragment>
      ))}
    </>
  );

  const content = (
    <>
      {!preview && (hover || selected) && (
        <div className="pointer-events-none absolute -top-5 left-0 z-10 rounded-t-md bg-indigo-500 px-2 py-0.5 text-[10px] font-medium text-white shadow">
          {shortLabel(node.type)}
        </div>
      )}

      {node.type === "section" || node.type === "fullSection" ? (
        node.type === "fullSection" ? (
          <FullSectionRender
            node={node}
            viewport={viewport}
            containerParentId={node.id}
            isEmpty={children.length === 0}
          >
            {children.length === 0 ? (
              <div className="flex min-h-[80px] items-center justify-center text-xs text-muted-foreground/80">
                Drop elements inside this full-width section
              </div>
            ) : (
              <div className="space-y-1">{renderChildren(children)}</div>
            )}
          </FullSectionRender>
        ) : (
          <SectionRender
            node={node}
            viewport={viewport}
            containerParentId={node.id}
            isEmpty={children.length === 0}
          >
            {children.length === 0 ? (
              <div className="flex min-h-[80px] items-center justify-center rounded-md border border-dashed border-border/70 text-xs text-muted-foreground">
                Drop elements inside this section
              </div>
            ) : (
              <div className="space-y-1">{renderChildren(children)}</div>
            )}
          </SectionRender>
        )
      ) : node.type === "row" ? (
        <RowRender node={node} viewport={viewport}>
          {children.map((child, i) => (
            <CanvasNode
              key={child.id}
              node={child}
              parentId={node.id}
              index={i}
              selectedId={selectedId}
              onSelect={onSelect}
              onSetProp={onSetProp}
              viewport={viewport}
              preview={preview}
            />
          ))}
        </RowRender>
      ) : node.type === "grid" ? (
        <GridRender node={node} viewport={viewport}>
          {children.map((child, i) => (
            <CanvasNode
              key={child.id}
              node={child}
              parentId={node.id}
              index={i}
              selectedId={selectedId}
              onSelect={onSelect}
              onSetProp={onSetProp}
              viewport={viewport}
              preview={preview}
            />
          ))}
        </GridRender>
      ) : node.type === "column" ? (
        <ColumnRender
          node={node}
          containerParentId={node.id}
          isEmpty={children.length === 0}
        >
          {children.length === 0 ? (
            <div className="flex min-h-[80px] items-center justify-center text-[11px] text-muted-foreground">
              Drop here
            </div>
          ) : (
            <div className="space-y-1">{renderChildren(children)}</div>
          )}
        </ColumnRender>
      ) : node.type === "accordion" ? (
        <AccordionRender
          node={node}
          onToggle={(idx) =>
            onSetProp(node.id, "openIndex", Number(node.props.openIndex ?? -1) === idx ? -1 : idx)
          }
        />
      ) : node.type === "tabs" ? (
        <TabsRender node={node} onSwitch={(idx) => onSetProp(node.id, "activeIndex", idx)} />
      ) : node.type === "carousel" ? (
        <CarouselRender node={node} onSwitch={(idx) => onSetProp(node.id, "activeIndex", idx)} />
      ) : node.type === "imageCarousel" ? (
        <ImageCarouselRender
          node={node}
          onSwitch={(idx) => onSetProp(node.id, "activeIndex", idx)}
        />
      ) : node.type === "navbar" ? (
        <NavbarRender node={node} viewport={viewport} />
      ) : node.type === "card" ? (
        <CardRender
          node={node}
          viewport={viewport}
          containerParentId={node.id}
          isEmpty={!Boolean(node.props.productMode) && children.length === 0}
        >
          {Boolean(node.props.productMode) ? (
            <ProductCardContent node={node} />
          ) : children.length === 0 ? (
            <div className="flex min-h-[80px] items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
              Drop elements inside this card
            </div>
          ) : (
            <div className="space-y-1">{renderChildren(children)}</div>
          )}
        </CardRender>
      ) : (
        <LeafRender node={node} viewport={viewport} />
      )}
    </>
  );

  const handleClick = (e: ReactMouseEvent) => {
    if (preview) return;
    e.stopPropagation();
    onSelect(node.id);
  };

  if (preview || isColumnChild) {
    return (
      <div
        className={shellClass}
        onClick={handleClick}
        onMouseEnter={(e) => {
          if (preview) return;
          e.stopPropagation();
          setHover(true);
        }}
        onMouseLeave={() => {
          if (preview) return;
          setHover(false);
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <CanvasDraggable id={node.id} className={shellClass}>
      <div
        onClick={handleClick}
        onMouseEnter={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onMouseLeave={() => setHover(false)}
      >
        {content}
      </div>
    </CanvasDraggable>
  );
}

function SectionRender({
  node,
  viewport,
  containerParentId,
  isEmpty,
  children,
}: {
  node: BuilderElement;
  viewport: Viewport;
  containerParentId: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  const p = node.props;
  const bg = String(p.background ?? "").trim();
  const vp = useEffectiveViewport(viewport);
  const shell = (
    <div
      style={{
        padding: Number(readResp(p.padding, vp)),
        background: bg || "var(--gs-surface)",
        minHeight: Number(readResp(p.minHeight, vp)),
        borderRadius: "var(--gs-radius)",
        transition:
          "padding 300ms ease, min-height 300ms ease, border-radius 200ms ease, background 200ms ease",
      }}
    >
      {children}
    </div>
  );

  if (isEmpty) {
    return (
      <DropArea parentId={containerParentId} className="border border-border/60">
        {shell}
      </DropArea>
    );
  }

  return <div className="border border-border/60">{shell}</div>;
}

function CardRender({
  node,
  viewport,
  containerParentId,
  isEmpty,
  children,
}: {
  node: BuilderElement;
  viewport: Viewport;
  containerParentId: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  const p = node.props;
  const bg = String(p.background ?? "").trim();
  const radius = Number(p.radius ?? 16);
  const padding = Number(readResp(p.padding, viewport) || 24);
  const shadow = Boolean(p.shadow);
  const isProduct = Boolean(p.productMode);
  const shell = (
    <div
      style={{
        background: bg || "var(--gs-surface, rgba(255,255,255,0.04))",
        borderRadius: radius,
        padding: isProduct ? 0 : padding,
        boxShadow: shadow ? "0 12px 32px rgba(0,0,0,0.35)" : "none",
        transition:
          "background 200ms ease, border-radius 200ms ease, box-shadow 200ms ease, padding 200ms ease",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );

  if (isEmpty) {
    return (
      <DropArea parentId={containerParentId} className="border border-white/5">
        {shell}
      </DropArea>
    );
  }

  return <div className="border border-white/5">{shell}</div>;
}

function ProductCardContent({ node }: { node: BuilderElement }) {
  const p = node.props;
  const image = String(p.image ?? "").trim();
  const imageHeight = Number(p.imageHeight ?? 220);
  const badge = String(p.badge ?? "").trim();
  const badgeColor = String(p.badgeColor ?? "#6366f1");
  const title = String(p.title ?? "");
  const titleColor = String(p.titleColor ?? "").trim();
  const description = String(p.description ?? "");
  const price = String(p.price ?? "");
  const oldPrice = String(p.oldPrice ?? "").trim();
  const priceColor = String(p.priceColor ?? "#6366f1");
  const rating = Math.max(0, Math.min(5, Number(p.rating ?? 0)));
  const ctaLabel = String(p.ctaLabel ?? "Add to cart");
  const ctaBg = String(p.ctaBg ?? "#6366f1");
  const ctaColor = String(p.ctaColor ?? "#ffffff");

  return (
    <div className="flex flex-col">
      <div
        className="relative w-full overflow-hidden"
        style={{ height: imageHeight, background: "rgba(255,255,255,0.03)" }}
      >
        {image ? (
          <img src={image} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Product image
          </div>
        )}
        {badge && (
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow"
            style={{ background: badgeColor }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-5">
        {rating > 0 && (
          <div className="flex items-center gap-1 text-amber-400">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="text-sm leading-none">
                {i + 1 <= Math.floor(rating) ? "â˜…" : i < rating ? "â˜†" : "â˜†"}
              </span>
            ))}
            <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
          </div>
        )}
        <h3
          className="text-base font-semibold leading-snug"
          style={titleColor ? { color: titleColor } : undefined}
        >
          {title || "Product title"}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: priceColor }}>
            {price || "$0.00"}
          </span>
          {oldPrice && (
            <span className="text-sm text-muted-foreground line-through">{oldPrice}</span>
          )}
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-md px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
          style={{ background: ctaBg, color: ctaColor }}
          onClick={(e) => e.preventDefault()}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

function FullSectionRender({
  node,
  viewport,
  containerParentId,
  isEmpty,
  children,
}: {
  node: BuilderElement;
  viewport: Viewport;
  containerParentId: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  const p = node.props;
  const bg = String(p.background ?? "").trim();
  const bgImage = String(p.backgroundImage ?? "").trim();
  const vp = useEffectiveViewport(viewport);
  const isMobileEff = vp === "mobile";
  const shell = (
    <div
      style={{
        paddingTop: Number(readResp(p.paddingTop, vp)),
        paddingBottom: Number(readResp(p.paddingBottom, vp)),
        paddingLeft: isMobileEff ? 16 : 24,
        paddingRight: isMobileEff ? 16 : 24,
        background: bg || "var(--gs-surface)",
        backgroundImage: bgImage ? `url("${bgImage}")` : undefined,
        backgroundSize: bgImage ? "cover" : undefined,
        backgroundPosition: bgImage ? "center" : undefined,
        width: "100%",
        transition: "padding 300ms ease, background 200ms ease",
      }}
    >
      {children}
    </div>
  );

  if (isEmpty) {
    return (
      <DropArea
        parentId={containerParentId}
        className="w-full border-2 border-dashed border-border/70"
      >
        {shell}
      </DropArea>
    );
  }

  return <div className="w-full border-2 border-dashed border-border/70">{shell}</div>;
}

function LeafRender({ node, viewport }: { node: BuilderElement; viewport: Viewport }) {
  const p = node.props;
  const vp = useEffectiveViewport(viewport);
  switch (node.type) {
    case "text": {
      const color = String(p.color ?? "").trim();
      return (
        <p
          style={{
            fontSize: Number(readResp(p.fontSize, vp)),
            textAlign: readResp(p.align, vp) as CSSProperties["textAlign"],
            color: color || "var(--gs-text)",
            transition: "font-size 200ms ease, color 200ms ease",
          }}
        >
          {String(p.content ?? "")}
        </p>
      );
    }
    case "heading": {
      const color = String(p.color ?? "").trim();
      const tag = (
        ["h1", "h2", "h3", "h4", "h5", "h6"].includes(String(p.tag)) ? String(p.tag) : "h2"
      ) as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      // Fluid typography: min â†’ preferred (vw) â†’ max
      const fluidMap: Record<string, string> = {
        h1: "clamp(1.75rem, 4.5vw + 0.5rem, 2.75rem)",
        h2: "clamp(1.5rem, 3.5vw + 0.5rem, 2.25rem)",
        h3: "clamp(1.25rem, 2.5vw + 0.5rem, 1.75rem)",
        h4: "clamp(1.125rem, 1.8vw + 0.5rem, 1.5rem)",
        h5: "clamp(1rem, 1.2vw + 0.5rem, 1.25rem)",
        h6: "clamp(0.9375rem, 0.8vw + 0.5rem, 1.0625rem)",
      };
      const Tag = tag;
      return (
        <Tag
          style={{
            fontSize: fluidMap[tag],
            fontWeight: 700,
            lineHeight: 1.2,
            textAlign: readResp(p.align, vp) as CSSProperties["textAlign"],
            color: color || "var(--gs-text)",
            margin: 0,
            transition: "color 200ms ease, font-size 200ms ease",
          }}
        >
          {String(p.content ?? "")}
        </Tag>
      );
    }
    case "richText": {
      const color = String(p.color ?? "").trim();
      const raw = String(p.content ?? "");
      const paragraphs = raw.split(/\n{2,}/);
      return (
        <div
          style={{
            fontSize: Number(readResp(p.fontSize, vp)),
            textAlign: readResp(p.align, vp) as CSSProperties["textAlign"],
            color: color || "var(--gs-text)",
            lineHeight: 1.65,
            transition: "font-size 200ms ease, color 200ms ease",
          }}
          className="space-y-3"
        >
          {paragraphs.map((para, i) => (
            <p key={i} style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {para}
            </p>
          ))}
        </div>
      );
    }
    case "icon": {
      const color = String(p.color ?? "").trim();
      const size = Number(p.size ?? 48);
      const name = String(p.name ?? "sparkles").trim() || "sparkles";
      return (
        <div style={{ color: color || "var(--gs-primary)", lineHeight: 0 }}>
          <DynamicIcon
            name={name as IconName}
            size={size}
            fallback={() => <Shapes size={size} />}
          />
        </div>
      );
    }
    case "image":
      return (
        <div style={{ textAlign: "left" }}>
          <img
            src={String(p.src ?? "")}
            alt={String(p.alt ?? "")}
            style={{
              width: Number(readResp(p.width, viewport)),
              borderRadius:
                Number(p.radius) > 0 ? Number(p.radius) : ("var(--gs-radius)" as unknown as number),
              transition: "width 300ms ease, border-radius 200ms ease",
            }}
            className="max-w-full"
          />
        </div>
      );
    case "button": {
      const align = readResp(p.align, vp) as CSSProperties["textAlign"];
      const bg = String(p.bg ?? "").trim();
      const color = String(p.color ?? "").trim();
      const radius = Number(p.radius);
      return (
        <div style={{ textAlign: align }}>
          <button
            type="button"
            style={{
              background: bg || "var(--gs-primary)",
              color: color || "var(--gs-on-primary)",
              borderRadius: radius > 0 ? radius : ("var(--gs-radius)" as unknown as number),
              transition: "background 200ms ease, color 200ms ease, border-radius 200ms ease",
            }}
            className="px-5 py-2.5 text-sm font-medium shadow-sm hover:opacity-90"
          >
            {String(p.label ?? "Click me")}
          </button>
        </div>
      );
    }
    case "form": {
      const fields = (p.fields as FormField[] | undefined) ?? [];
      return (
        <div
          style={{
            textAlign: readResp(p.align, vp) as CSSProperties["textAlign"],
            borderRadius: "var(--gs-radius)",
            borderTop: "3px solid var(--gs-primary)",
            transition: "border-radius 200ms ease",
          }}
          className="space-y-3 border border-border/60 bg-background/40 p-5"
        >
          <h3 className="text-base font-semibold" style={{ color: "var(--gs-secondary)" }}>
            {String(p.title ?? "")}
          </h3>
          {fields.length === 0 && (
            <div className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
              No fields yet â€” add some from the properties panel.
            </div>
          )}
          {fields.map((f) => (
            <div key={f.id} className="space-y-1.5 text-left">
              <Label className="text-xs text-muted-foreground">
                {f.label}
                {f.required && <span className="ml-1 text-destructive">*</span>}
              </Label>
              {f.type === "short" && <Input placeholder={f.placeholder ?? ""} />}
              {f.type === "email" && <Input type="email" placeholder={f.placeholder ?? ""} />}
              {f.type === "long" && <Textarea rows={3} placeholder={f.placeholder ?? ""} />}
              {f.type === "select" && (
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    {f.placeholder || "Select an option"}
                  </option>
                  {(f.options ?? "")
                    .split(",")
                    .map((o) => o.trim())
                    .filter(Boolean)
                    .map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                </select>
              )}
              {f.type === "checkbox" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" className="h-4 w-4 rounded border-input" />
                  <span>{f.placeholder || f.label}</span>
                </label>
              )}
            </div>
          ))}
          <button
            type="button"
            style={{
              background: "var(--gs-primary)",
              color: "var(--gs-on-primary)",
              borderRadius: "var(--gs-radius)",
            }}
            className="w-full px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90"
          >
            {String(p.buttonLabel ?? "Send")}
          </button>
          {String(p.emailJsTemplateId ?? "").trim() && (
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              EmailJS template: {String(p.emailJsTemplateId)}
            </p>
          )}
        </div>
      );
    }
    case "featureCard": {
      const shadowMap: Record<string, string> = {
        none: "none",
        sm: "0 1px 2px rgba(0,0,0,0.25)",
        md: "0 8px 24px rgba(0,0,0,0.35)",
        lg: "0 20px 50px rgba(0,0,0,0.5)",
      };
      const shadow = shadowMap[String(p.shadow ?? "md")] ?? shadowMap.md;
      const bg = String(p.background ?? "").trim();
      const radius = Number(p.radius ?? 16);
      const padding = Number(readResp(p.padding, viewport) || 28);
      const iconName = String(p.icon ?? "sparkles").toLowerCase();
      const IconCmp =
        iconName === "rocket"
          ? Rocket
          : iconName === "palette"
            ? Palette
            : iconName === "navigation"
              ? Navigation
              : iconName === "image"
                ? ImageIcon
                : iconName === "mail"
                  ? Mail
                  : Sparkles;
      return (
        <div
          style={{
            background: bg || "var(--gs-surface, rgba(255,255,255,0.04))",
            borderRadius: radius,
            boxShadow: shadow,
            padding,
            border: "1px solid rgba(255,255,255,0.06)",
            transition: "background 200ms ease, border-radius 200ms ease, box-shadow 200ms ease",
          }}
          className="flex flex-col items-start gap-3 text-left"
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "var(--gs-primary)", color: "var(--gs-on-primary)" }}
          >
            <IconCmp className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--gs-text)" }}>
            {String(p.title ?? "")}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: "var(--gs-text)", opacity: 0.75 }}>
            {String(p.body ?? "")}
          </p>
          <a
            href={String(p.ctaHref ?? "#")}
            onClick={(e) => e.preventDefault()}
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: "var(--gs-primary)" }}
          >
            {String(p.ctaLabel ?? "Learn more")}
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      );
    }
    case "footer": {
      const bg = String(p.background ?? "").trim();
      const color = String(p.color ?? "").trim();
      const brandImg = String(p.brandImage ?? "").trim();
      const align = String(p.align ?? "left") as "left" | "center" | "right";
      const links = (p.links as NavLink[] | undefined) ?? [];
      const pt = Number(readResp(p.paddingTop, viewport) || 48);
      const pb = Number(readResp(p.paddingBottom, viewport) || 32);
      const stackMobile = viewport === "mobile";
      // Stack on the mobile viewport preview OR on real mobile screen widths.
      const rowClass = stackMobile
        ? "flex flex-col gap-6"
        : "flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8";
      const navClass = stackMobile
        ? "flex flex-col gap-2"
        : "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2";
      return (
        <footer
          style={{
            background: bg || "var(--gs-surface, rgba(255,255,255,0.04))",
            color: color || "var(--gs-text)",
            paddingTop: pt,
            paddingBottom: pb,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            transition: "background 200ms ease, color 200ms ease, padding 200ms ease",
            textAlign: align,
          }}
          className="w-full px-4 sm:px-6"
        >
          <div className={rowClass}>
            <div className="flex min-w-0 flex-col gap-2 sm:max-w-md">
              {brandImg ? (
                <img
                  src={brandImg}
                  alt={String(p.brandText ?? "Brand")}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <span className="text-lg font-semibold" style={{ color: "var(--gs-primary)" }}>
                  {String(p.brandText ?? "")}
                </span>
              )}
              {String(p.tagline ?? "").trim() && (
                <p className="text-sm opacity-75 break-words">{String(p.tagline)}</p>
              )}
            </div>
            {links.length > 0 && (
              <nav className={navClass}>
                {links.map((l) => (
                  <a
                    key={l.id}
                    href={l.href || "#"}
                    onClick={(e) => e.preventDefault()}
                    className="text-sm opacity-80 hover:opacity-100 transition-opacity"
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
            )}
          </div>
          {String(p.copyright ?? "").trim() && (
            <div
              className="mt-8 pt-4 text-xs opacity-60"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              {String(p.copyright)}
            </div>
          )}
        </footer>
      );
    }
    default:
      return null;
  }
}

function LinkDestinationField({
  label = "Link destination",
  linkType,
  href,
  pageId,
  pages,
  onChange,
}: {
  label?: string;
  linkType: "external" | "internal";
  href: string;
  pageId: string;
  pages: PageRef[];
  onChange: (next: { linkType: "external" | "internal"; href: string; pageId: string }) => void;
}) {
  const [draft, setDraft] = useState(href);
  useEffect(() => setDraft(href), [href]);
  return (
    <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-2 text-[11px]">
          <span className={linkType === "external" ? "text-foreground" : "text-muted-foreground"}>
            External
          </span>
          <Switch
            checked={linkType === "internal"}
            onCheckedChange={(checked) => {
              if (checked) {
                const first = pages[0];
                onChange({
                  linkType: "internal",
                  pageId: pageId || first?.id || "",
                  href: first?.slug || "/",
                });
              } else {
                onChange({ linkType: "external", pageId: "", href: href || "#" });
              }
            }}
          />
          <span className={linkType === "internal" ? "text-foreground" : "text-muted-foreground"}>
            Internal
          </span>
        </div>
      </div>
      {linkType === "internal" ? (
        pages.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No pages available. Add one from Pages.
          </p>
        ) : (
          <Select
            value={pageId || pages[0]?.id}
            onValueChange={(v) => {
              const pg = pages.find((p) => p.id === v);
              if (!pg) return;
              onChange({ linkType: "internal", pageId: pg.id, href: pg.slug });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a page" />
            </SelectTrigger>
            <SelectContent>
              {pages.map((pg) => (
                <SelectItem key={pg.id} value={pg.id}>
                  {pg.title} <span className="text-muted-foreground">Â· {pg.slug}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : (
        <Input
          value={draft}
          placeholder="https://â€¦ or #anchor"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== href) onChange({ linkType: "external", pageId: "", href: draft });
          }}
        />
      )}
      {linkType === "internal" && pageId && (
        <p className="font-mono text-[10px] text-muted-foreground">â†’ {href}</p>
      )}
    </div>
  );
}

function PropertyEditor({
  element,
  viewport,
  pages,
  onLiveChange,
  onCommit,
  onDelete,
  onResizeGrid,
}: {
  element: BuilderElement;
  viewport: Viewport;
  pages: PageRef[];
  onLiveChange: (key: string, value: PropValue) => void;
  onCommit: (key: string, priorValue: PropValue, nextValue: PropValue) => void;
  onDelete: () => void;
  onResizeGrid: (cols: number) => void;
}) {
  const p = element.props;
  const focusSnapshot = useRef<Record<string, string | number>>({});

  // Which breakpoint the properties panel edits. Defaults to whatever the
  // canvas viewport implies, but the user can override via the toggle.
  // Auto-syncs when the canvas viewport switches (e.g. selecting Mobile
  // preview flips the panel into Mobile styling mode).
  const [styleBp, setStyleBp] = useState<"desktop" | "mobile">(bpFor(viewport));
  const [userOverride, setUserOverride] = useState(false);
  useEffect(() => {
    if (!userOverride) setStyleBp(bpFor(viewport));
  }, [viewport, userOverride]);

  // Wrap value for responsive keys so we merge with the existing per-bp object.
  const wrap = (key: string, value: string | number): PropValue =>
    RESPONSIVE_KEYS.has(key) ? writeResp(p[key], styleBp, value) : value;

  const live = (key: string, value: string | number) => onLiveChange(key, wrap(key, value));
  const commitVal = (key: string, prior: string | number, next: string | number) =>
    onCommit(key, wrap(key, prior), wrap(key, next));

  // Scalar accessor that respects responsive storage.
  const get = (key: string) => readResp(p[key], styleBp);

  // Text inputs: keep typing live, commit to history on blur if value changed.
  const makeTextHandlers = (key: string) => ({
    value: String(get(key)),
    onFocus: () => {
      focusSnapshot.current[key] = get(key);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      live(key, e.target.value),
    onBlur: () => {
      const prior = focusSnapshot.current[key];
      const current = get(key);
      if (prior !== undefined && prior !== current) commitVal(key, prior, current);
      delete focusSnapshot.current[key];
    },
  });

  // Upload an image and commit it as the value of `key`.
  const uploadImageFor = (key: string) => (dataUrl: string) => {
    const prior = get(key);
    onLiveChange(key, wrap(key, dataUrl));
    onCommit(key, wrap(key, prior), wrap(key, dataUrl));
  };

  const bpLabel = styleBp === "mobile" ? "Mobile" : "Desktop";
  const pickBp = (next: "desktop" | "mobile") => {
    setUserOverride(true);
    setStyleBp(next);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-border bg-muted/40 p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => pickBp("desktop")}
            className={`flex items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${
              styleBp === "desktop"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            Desktop
          </button>
          <button
            type="button"
            onClick={() => pickBp("mobile")}
            className={`flex items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${
              styleBp === "mobile"
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Mobile
          </button>
        </div>
      </div>
      <div className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-[11px] text-indigo-200">
        Layout properties save per breakpoint Â· editing{" "}
        <span className="font-semibold">{bpLabel}</span>
        {viewport === "tablet" && styleBp === "desktop" && (
          <span className="opacity-70"> (tablet inherits desktop)</span>
        )}
      </div>

      {element.type === "section" && (
        <>
          <Field label="Background color">
            <ColorInput
              valueKey="background"
              value={String(get("background"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
          <SliderField
            label={`Padding Â· ${bpLabel}`}
            valueKey="padding"
            value={Number(get("padding"))}
            min={0}
            max={120}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <SliderField
            label={`Min height Â· ${bpLabel}`}
            valueKey="minHeight"
            value={Number(get("minHeight"))}
            min={40}
            max={500}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
        </>
      )}

      {element.type === "fullSection" && (
        <>
          <Field label="Background color">
            <ColorInput
              valueKey="background"
              value={String(get("background"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
          <Field label="Background image">
            <div className="flex gap-2">
              <Input placeholder="https://â€¦ or upload" {...makeTextHandlers("backgroundImage")} />
              <UploadButton onFile={uploadImageFor("backgroundImage")} />
              <MediaPickerButton onPick={uploadImageFor("backgroundImage")} />
            </div>
          </Field>
          <SliderField
            label={`Top padding Â· ${bpLabel}`}
            valueKey="paddingTop"
            value={Number(get("paddingTop"))}
            min={0}
            max={240}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <SliderField
            label={`Bottom padding Â· ${bpLabel}`}
            valueKey="paddingBottom"
            value={Number(get("paddingBottom"))}
            min={0}
            max={240}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
        </>
      )}

      {element.type === "text" && (
        <>
          <Field label="Content">
            <Textarea rows={4} {...makeTextHandlers("content")} />
          </Field>
          <SliderField
            label={`Font size Â· ${bpLabel}`}
            valueKey="fontSize"
            value={Number(get("fontSize"))}
            min={10}
            max={72}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <AlignField
            label={`Alignment Â· ${bpLabel}`}
            value={String(get("align"))}
            onCommit={(v) => commitVal("align", get("align"), v)}
          />
          <Field label="Text color">
            <ColorInput
              valueKey="color"
              value={String(get("color"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
        </>
      )}

      {element.type === "heading" && (
        <>
          <Field label="Content">
            <Input {...makeTextHandlers("content")} />
          </Field>
          <Field label="HTML tag">
            <Select
              value={String(p.tag ?? "h2")}
              onValueChange={(v) => onCommit("tag", (p.tag ?? "h2") as PropValue, v as PropValue)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["h1", "h2", "h3", "h4", "h5", "h6"] as const).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <AlignField
            label={`Alignment Â· ${bpLabel}`}
            value={String(get("align"))}
            onCommit={(v) => commitVal("align", get("align"), v)}
          />
          <Field label="Text color">
            <ColorInput
              valueKey="color"
              value={String(get("color"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
        </>
      )}

      {element.type === "richText" && (
        <>
          <Field label="Content">
            <Textarea rows={6} {...makeTextHandlers("content")} />
          </Field>
          <SliderField
            label={`Font size Â· ${bpLabel}`}
            valueKey="fontSize"
            value={Number(get("fontSize"))}
            min={10}
            max={32}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <AlignField
            label={`Alignment Â· ${bpLabel}`}
            value={String(get("align"))}
            onCommit={(v) => commitVal("align", get("align"), v)}
          />
          <Field label="Text color">
            <ColorInput
              valueKey="color"
              value={String(get("color"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
        </>
      )}

      {element.type === "icon" && (
        <>
          <Field label="Icon name (Lucide)">
            <Input placeholder="e.g. sparkles, heart, star" {...makeTextHandlers("name")} />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Browse names at lucide.dev/icons â€” use kebab-case.
            </p>
          </Field>
          <Field label="Icon color">
            <ColorInput
              valueKey="color"
              value={String(get("color"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
          <SliderField
            label="Size"
            valueKey="size"
            value={Number(p.size ?? 48)}
            min={16}
            max={200}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
        </>
      )}

      {element.type === "image" && (
        <>
          <Field label="Image">
            <div className="flex gap-2">
              <Input placeholder="https://â€¦ or upload" {...makeTextHandlers("src")} />
              <UploadButton onFile={uploadImageFor("src")} />
              <MediaPickerButton onPick={uploadImageFor("src")} />
            </div>
          </Field>
          <Field label="Alt text">
            <Input {...makeTextHandlers("alt")} />
          </Field>
          <SliderField
            label={`Width Â· ${bpLabel}`}
            valueKey="width"
            value={Number(get("width"))}
            min={80}
            max={1024}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <SliderField
            label="Corner radius"
            valueKey="radius"
            value={Number(get("radius"))}
            min={0}
            max={48}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
        </>
      )}

      {element.type === "button" && (
        <>
          <Field label="Label">
            <Input {...makeTextHandlers("label")} />
          </Field>
          <Field label="Background">
            <ColorInput
              valueKey="bg"
              value={String(get("bg"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
          <Field label="Text color">
            <ColorInput
              valueKey="color"
              value={String(get("color"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
          <SliderField
            label="Corner radius"
            valueKey="radius"
            value={Number(get("radius"))}
            min={0}
            max={32}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <AlignField
            label={`Alignment Â· ${bpLabel}`}
            value={String(get("align"))}
            onCommit={(v) => commitVal("align", get("align"), v)}
          />
          <LinkDestinationField
            linkType={(p.linkType as "external" | "internal") ?? "external"}
            href={String(p.href ?? "#")}
            pageId={String(p.pageId ?? "")}
            pages={pages}
            onChange={(next) => {
              const priorType = (p.linkType as PropValue) ?? "external";
              const priorHref = (p.href as PropValue) ?? "#";
              const priorPageId = (p.pageId as PropValue) ?? "";
              onLiveChange("linkType", next.linkType as PropValue);
              onLiveChange("href", next.href as PropValue);
              onLiveChange("pageId", next.pageId as PropValue);
              onCommit("linkType", priorType, next.linkType as PropValue);
              onCommit("href", priorHref, next.href as PropValue);
              onCommit("pageId", priorPageId, next.pageId as PropValue);
            }}
          />
        </>
      )}

      {element.type === "form" && (
        <>
          <Field label="Form title">
            <Input {...makeTextHandlers("title")} />
          </Field>
          <Field label="Submit button label">
            <Input {...makeTextHandlers("buttonLabel")} />
          </Field>
          <AlignField
            label={`Alignment Â· ${bpLabel}`}
            value={String(get("align"))}
            onCommit={(v) => commitVal("align", get("align"), v)}
          />
          <Field label="EmailJS Template ID">
            <Input placeholder="template_xxxxxxx" {...makeTextHandlers("emailJsTemplateId")} />
            <p className="text-[11px] text-muted-foreground">
              Paste the template ID from your EmailJS dashboard to wire submissions to your email
              service.
            </p>
          </Field>
          <FormFieldsEditor
            fields={(p.fields as FormField[] | undefined) ?? []}
            onLive={(next) => onLiveChange("fields", next as unknown as PropValue)}
            onCommit={(prior, next) =>
              onCommit("fields", prior as unknown as PropValue, next as unknown as PropValue)
            }
          />
        </>
      )}

      {element.type === "grid" && (
        <>
          <Field label="Columns">
            <div className="flex items-center gap-1 rounded-md border border-border bg-background/40 p-0.5">
              {[1, 2, 3].map((n) => {
                const active = Number(p.columns ?? 2) === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onResizeGrid(n)}
                    className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-indigo-500 text-white"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {n} {n === 1 ? "column" : "columns"}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Columns stack vertically on the mobile viewport.
            </p>
          </Field>
          <SliderField
            label="Gap"
            valueKey="gap"
            value={Number(p.gap ?? 16)}
            min={0}
            max={64}
            onLiveChange={(k, v) => onLiveChange(k, v)}
            onCommit={(k, prior, next) => onCommit(k, prior, next)}
            suffix="px"
          />
        </>
      )}

      {element.type === "accordion" && (
        <ItemListEditor
          headerKey="header"
          headerLabel="Header"
          bodyLabel="Body text"
          addLabel="Add row"
          items={(p.items as AccordionItem[] | undefined) ?? []}
          onLive={(next) => onLiveChange("items", next as unknown as PropValue)}
          onCommit={(prior, next) =>
            onCommit("items", prior as unknown as PropValue, next as unknown as PropValue)
          }
        />
      )}

      {element.type === "imageCarousel" && (
        <>
          <SliderField
            label="Carousel height"
            valueKey="height"
            value={Number(p.height ?? 320)}
            min={160}
            max={640}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2">
            <div>
              <Label className="text-xs">Show captions</Label>
              <p className="text-[11px] text-muted-foreground">
                Overlay caption text on each image.
              </p>
            </div>
            <Switch
              checked={p.showCaptions !== false}
              onCheckedChange={(checked) =>
                onCommit(
                  "showCaptions",
                  (p.showCaptions !== false) as PropValue,
                  checked as PropValue,
                )
              }
            />
          </div>
          <ImageSlidesEditor
            slides={(p.slides as ImageSlide[] | undefined) ?? []}
            onLive={(next) => onLiveChange("slides", next as unknown as PropValue)}
            onCommit={(prior, next) =>
              onCommit("slides", prior as unknown as PropValue, next as unknown as PropValue)
            }
          />
        </>
      )}

      {element.type === "tabs" && (
        <>
          <Field label="Active tab style">
            <Select
              value={String(p.activeStyle ?? "underline")}
              onValueChange={(v) =>
                onCommit(
                  "activeStyle",
                  String(p.activeStyle ?? "underline") as PropValue,
                  v as PropValue,
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="underline">Underline</SelectItem>
                <SelectItem value="background">Background color</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <ItemListEditor
            headerKey="label"
            headerLabel="Tab label"
            bodyLabel="Panel content"
            addLabel="Add tab"
            items={(p.items as TabItem[] | undefined) ?? []}
            onLive={(next) => onLiveChange("items", next as unknown as PropValue)}
            onCommit={(prior, next) =>
              onCommit("items", prior as unknown as PropValue, next as unknown as PropValue)
            }
          />
        </>
      )}

      {element.type === "carousel" && (
        <>
          <SliderField
            label="Carousel height"
            valueKey="height"
            value={Number(p.height ?? 360)}
            min={160}
            max={720}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <CarouselSlidesEditor
            slides={(p.slides as CarouselSlide[] | undefined) ?? []}
            onLive={(next) => onLiveChange("slides", next as unknown as PropValue)}
            onCommit={(prior, next) =>
              onCommit("slides", prior as unknown as PropValue, next as unknown as PropValue)
            }
          />
        </>
      )}

      {element.type === "navbar" && (
        <>
          <Field label="Brand text">
            <Input {...makeTextHandlers("brandText")} />
          </Field>
          <Field label="Brand logo (optional)">
            <div className="flex gap-2">
              <Input placeholder="https://â€¦ or upload" {...makeTextHandlers("brandImage")} />
              <UploadButton onFile={uploadImageFor("brandImage")} />
              <MediaPickerButton onPick={uploadImageFor("brandImage")} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              When set, the logo image replaces the brand text on the left.
            </p>
          </Field>
          <Field label="Background color">
            <ColorInput
              valueKey="background"
              value={String(get("background"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
          <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2">
            <div>
              <Label className="text-xs">Sticky header</Label>
              <p className="text-[11px] text-muted-foreground">
                Fix the header to the top of the viewport on scroll.
              </p>
            </div>
            <Switch
              checked={Boolean(p.sticky)}
              onCheckedChange={(checked) =>
                onCommit("sticky", Boolean(p.sticky) as PropValue, checked as PropValue)
              }
            />
          </div>
          <NavLinksEditor
            links={(p.links as NavLink[] | undefined) ?? []}
            pages={pages}
            onLive={(next) => onLiveChange("links", next as unknown as PropValue)}
            onCommit={(prior, next) =>
              onCommit("links", prior as unknown as PropValue, next as unknown as PropValue)
            }
          />
        </>
      )}

      {element.type === "featureCard" && (
        <>
          <Field label="Icon">
            <Select
              value={String(p.icon ?? "sparkles")}
              onValueChange={(v) =>
                onCommit("icon", String(p.icon ?? "sparkles") as PropValue, v as PropValue)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sparkles">Sparkles</SelectItem>
                <SelectItem value="rocket">Rocket</SelectItem>
                <SelectItem value="palette">Palette</SelectItem>
                <SelectItem value="navigation">Navigation</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="mail">Mail</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Heading">
            <Input {...makeTextHandlers("title")} />
          </Field>
          <Field label="Body text">
            <Textarea rows={3} {...makeTextHandlers("body")} />
          </Field>
          <Field label="Button label">
            <Input {...makeTextHandlers("ctaLabel")} />
          </Field>
          <Field label="Button link">
            <Input {...makeTextHandlers("ctaHref")} />
          </Field>
          <Field label="Background color">
            <ColorInput
              valueKey="background"
              value={String(get("background"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
          <SliderField
            label="Border radius"
            valueKey="radius"
            value={Number(p.radius ?? 16)}
            min={0}
            max={48}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <SliderField
            label={`Padding Â· ${bpLabel}`}
            valueKey="padding"
            value={Number(get("padding") || 28)}
            min={8}
            max={80}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <Field label="Box shadow">
            <Select
              value={String(p.shadow ?? "md")}
              onValueChange={(v) =>
                onCommit("shadow", String(p.shadow ?? "md") as PropValue, v as PropValue)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      )}

      {element.type === "card" && (
        <>
          <Field label="Product card mode">
            <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {Boolean(p.productMode) ? "Product layout" : "Drop-zone container"}
              </span>
              <Switch
                checked={Boolean(p.productMode)}
                onCheckedChange={(v) =>
                  onCommit("productMode", Boolean(p.productMode) as PropValue, v as PropValue)
                }
              />
            </div>
          </Field>

          {Boolean(p.productMode) && (
            <>
              <Field label="Product image">
                <div className="flex gap-2">
                  <Input placeholder="https://â€¦" {...makeTextHandlers("image")} />
                  <UploadButton onFile={uploadImageFor("image")} />
                  <MediaPickerButton onPick={uploadImageFor("image")} />
                </div>
              </Field>
              <SliderField
                label="Image height"
                valueKey="imageHeight"
                value={Number(p.imageHeight ?? 220)}
                min={120}
                max={480}
                onLiveChange={live}
                onCommit={commitVal}
                suffix="px"
              />
              <Field label="Badge text">
                <Input
                  placeholder="New / Sale (leave empty to hide)"
                  {...makeTextHandlers("badge")}
                />
              </Field>
              <Field label="Badge color">
                <ColorInput
                  valueKey="badgeColor"
                  value={String(get("badgeColor") || "#6366f1")}
                  onLiveChange={live}
                  onCommit={commitVal}
                />
              </Field>
              <Field label="Title">
                <Input {...makeTextHandlers("title")} />
              </Field>
              <Field label="Title color">
                <ColorInput
                  valueKey="titleColor"
                  value={String(get("titleColor"))}
                  onLiveChange={live}
                  onCommit={commitVal}
                />
              </Field>
              <Field label="Description">
                <Textarea rows={3} {...makeTextHandlers("description")} />
              </Field>
              <Field label="Price">
                <Input placeholder="$129.00" {...makeTextHandlers("price")} />
              </Field>
              <Field label="Old / compare-at price">
                <Input placeholder="$159.00 (optional)" {...makeTextHandlers("oldPrice")} />
              </Field>
              <Field label="Price color">
                <ColorInput
                  valueKey="priceColor"
                  value={String(get("priceColor") || "#6366f1")}
                  onLiveChange={live}
                  onCommit={commitVal}
                />
              </Field>
              <SliderField
                label="Rating"
                valueKey="rating"
                value={Number(p.rating ?? 0)}
                min={0}
                max={5}
                onLiveChange={live}
                onCommit={commitVal}
              />
              <Field label="Button label">
                <Input {...makeTextHandlers("ctaLabel")} />
              </Field>
              <Field label="Button background">
                <ColorInput
                  valueKey="ctaBg"
                  value={String(get("ctaBg") || "#6366f1")}
                  onLiveChange={live}
                  onCommit={commitVal}
                />
              </Field>
              <Field label="Button text color">
                <ColorInput
                  valueKey="ctaColor"
                  value={String(get("ctaColor") || "#ffffff")}
                  onLiveChange={live}
                  onCommit={commitVal}
                />
              </Field>
            </>
          )}

          <Field label="Card background">
            <ColorInput
              valueKey="background"
              value={String(get("background"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
          <SliderField
            label="Border radius"
            valueKey="radius"
            value={Number(p.radius ?? 16)}
            min={0}
            max={48}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          {!Boolean(p.productMode) && (
            <SliderField
              label={`Padding Â· ${bpLabel}`}
              valueKey="padding"
              value={Number(get("padding") || 24)}
              min={0}
              max={80}
              onLiveChange={live}
              onCommit={commitVal}
              suffix="px"
            />
          )}
          <Field label="Drop shadow">
            <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {Boolean(p.shadow) ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={Boolean(p.shadow)}
                onCheckedChange={(v) =>
                  onCommit("shadow", Boolean(p.shadow) as PropValue, v as PropValue)
                }
              />
            </div>
          </Field>
        </>
      )}

      {element.type === "footer" && (
        <>
          <Field label="Brand text">
            <Input {...makeTextHandlers("brandText")} />
          </Field>
          <Field label="Brand logo">
            <div className="flex gap-2">
              <Input placeholder="https://â€¦ or upload" {...makeTextHandlers("brandImage")} />
              <UploadButton onFile={uploadImageFor("brandImage")} />
              <MediaPickerButton onPick={uploadImageFor("brandImage")} />
            </div>
          </Field>
          <Field label="Tagline">
            <Textarea rows={2} {...makeTextHandlers("tagline")} />
          </Field>
          <Field label="Copyright text">
            <Input {...makeTextHandlers("copyright")} />
          </Field>
          <Field label="Background color">
            <ColorInput
              valueKey="background"
              value={String(get("background"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
          <Field label="Text color">
            <ColorInput
              valueKey="color"
              value={String(get("color"))}
              onLiveChange={live}
              onCommit={commitVal}
            />
          </Field>
          <Field label={`Alignment Â· ${bpLabel}`}>
            <Select
              value={String(get("align") || "left")}
              onValueChange={(v) => commitVal("align", String(get("align") || "left"), v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <SliderField
            label={`Padding top Â· ${bpLabel}`}
            valueKey="paddingTop"
            value={Number(get("paddingTop") || 48)}
            min={0}
            max={160}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <SliderField
            label={`Padding bottom Â· ${bpLabel}`}
            valueKey="paddingBottom"
            value={Number(get("paddingBottom") || 32)}
            min={0}
            max={160}
            onLiveChange={live}
            onCommit={commitVal}
            suffix="px"
          />
          <NavLinksEditor
            links={(p.links as NavLink[] | undefined) ?? []}
            pages={pages}
            onLive={(next) => onLiveChange("links", next as unknown as PropValue)}
            onCommit={(prior, next) =>
              onCommit("links", prior as unknown as PropValue, next as unknown as PropValue)
            }
          />
        </>
      )}

      <div className="border-t border-border pt-4">
        <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete element
        </Button>
      </div>
    </div>
  );
}

function UploadButton({
  onFile,
  label = "Upload",
}: {
  onFile: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setUploading(true);
          void addAssetFromFile(file)
            .then((asset) => {
              onFile(asset.url);
              toast.success(`Uploaded ${asset.name}`);
            })
            .catch((error) => {
              toast.error(error instanceof Error ? error.message : "Upload failed");
            })
            .finally(() => setUploading(false));
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 gap-1.5"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {label}
      </Button>
    </>
  );
}

function MediaPickerButton({
  onPick,
  label = "Library",
}: {
  onPick: (url: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const assets = useMediaLibrary();
  const [filter, setFilter] = useState<"all" | LibraryAsset["kind"]>("all");
  const filtered = filter === "all" ? assets : assets.filter((a) => a.kind === filter);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 gap-1.5"
        onClick={() => setOpen(true)}
        title="Choose from Media Library"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-indigo-400" />
              Media Library
            </DialogTitle>
            <DialogDescription>
              Pick an asset from your library. Uploads go to Supabase Storage and stay available
              after you sign out and back in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1 pb-2">
            {(["all", "logo", "icon", "image"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-indigo-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : `${f}s`}
              </button>
            ))}
          </div>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No assets yet. Upload an image and it will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {filtered.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onPick(a.url);
                      setOpen(false);
                    }}
                    className="group overflow-hidden rounded-md border border-border bg-card text-left transition hover:border-indigo-500"
                  >
                    <div className="flex aspect-square items-center justify-center bg-muted/30">
                      <img
                        src={a.url}
                        alt={a.name}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="border-t border-border px-2 py-1.5">
                      <div className="truncate text-[11px] font-medium">{a.name}</div>
                      <div className="text-[10px] capitalize text-muted-foreground">
                        {a.kind} Â· {a.format}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SliderField({
  label,
  valueKey,
  value,
  min,
  max,
  onLiveChange,
  onCommit,
  suffix,
}: {
  label: string;
  valueKey: string;
  value: number;
  min: number;
  max: number;
  onLiveChange: (key: string, value: number) => void;
  onCommit: (key: string, priorValue: number, nextValue: number) => void;
  suffix?: string;
}) {
  const startValue = useRef<number | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs tabular-nums text-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(v) => {
          if (startValue.current === null) startValue.current = value;
          onLiveChange(valueKey, v[0]);
        }}
        onValueCommit={(v) => {
          const prior = startValue.current ?? value;
          startValue.current = null;
          if (prior !== v[0]) onCommit(valueKey, prior, v[0]);
        }}
      />
    </div>
  );
}

function AlignField({
  value,
  onCommit,
  label = "Alignment",
}: {
  value: string;
  onCommit: (v: string) => void;
  label?: string;
}) {
  return (
    <Field label={label}>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v !== value) onCommit(v);
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="left">Left</SelectItem>
          <SelectItem value="center">Center</SelectItem>
          <SelectItem value="right">Right</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

function ColorInput({
  valueKey,
  value,
  onLiveChange,
  onCommit,
}: {
  valueKey: string;
  value: string;
  onLiveChange: (key: string, value: string) => void;
  onCommit: (key: string, priorValue: string, nextValue: string) => void;
}) {
  const startValue = useRef<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onFocus={() => {
          startValue.current = value;
        }}
        onChange={(e) => {
          if (startValue.current === null) startValue.current = value;
          onLiveChange(valueKey, e.target.value);
        }}
        onBlur={() => {
          const prior = startValue.current;
          startValue.current = null;
          if (prior !== null && prior !== value) onCommit(valueKey, prior, value);
        }}
        className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background"
      />
      <Input
        value={value}
        onFocus={() => {
          startValue.current = value;
        }}
        onChange={(e) => onLiveChange(valueKey, e.target.value)}
        onBlur={() => {
          const prior = startValue.current;
          startValue.current = null;
          if (prior !== null && prior !== value) onCommit(valueKey, prior, value);
        }}
        className="flex-1"
      />
    </div>
  );
}

function GlobalStylesDialog({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: GlobalStyles;
  onChange: (next: GlobalStyles) => void;
}) {
  const set = <K extends keyof GlobalStyles>(key: K, v: GlobalStyles[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-indigo-400" />
            Global Styles
          </DialogTitle>
          <DialogDescription>
            Design tokens applied as CSS variables on the canvas. All primitives inherit instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Primary brand color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value.primary}
                onChange={(e) => set("primary", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background"
              />
              <Input
                value={value.primary}
                onChange={(e) => set("primary", e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">--gs-primary</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Secondary brand color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value.secondary}
                onChange={(e) => set("secondary", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background"
              />
              <Input
                value={value.secondary}
                onChange={(e) => set("secondary", e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">--gs-secondary</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Global font family</Label>
            <Select value={value.font} onValueChange={(v) => set("font", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">font-family</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Base border radius</Label>
              <span className="text-xs tabular-nums">{value.radius}px</span>
            </div>
            <Slider
              value={[value.radius]}
              min={0}
              max={32}
              step={1}
              onValueChange={(v) => set("radius", v[0])}
            />
            <p className="text-[10px] text-muted-foreground">--gs-radius</p>
          </div>

          <div
            className="rounded-md border border-border/60 p-4"
            style={{
              fontFamily: value.font,
              borderRadius: `${value.radius}px`,
            }}
          >
            <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              Preview
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                style={{
                  background: value.primary,
                  color: "#fff",
                  borderRadius: `${value.radius}px`,
                }}
                className="px-4 py-2 text-sm font-medium"
              >
                Primary
              </button>
              <button
                type="button"
                style={{
                  background: value.secondary,
                  color: "#fff",
                  borderRadius: `${value.radius}px`,
                }}
                className="px-4 py-2 text-sm font-medium"
              >
                Secondary
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RowRender({
  node,
  viewport,
  children,
}: {
  node: BuilderElement;
  viewport: Viewport;
  children: React.ReactNode;
}) {
  const template = String(node.props.template ?? "1-1");
  const fractions = rowFractions(template);
  const total = fractions.reduce((a, b) => a + b, 0);
  const gap = Number(node.props.gap ?? 16);
  const vp = useEffectiveViewport(viewport);
  const isStack = vp === "mobile";
  const wrapped = Array.isArray(children) ? children : [children];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isStack ? "column" : "row",
        gap,
        transition: "gap 200ms ease",
      }}
      className="w-full"
    >
      {wrapped.map((child, i) => (
        <div
          key={i}
          style={{
            flexBasis: isStack
              ? "100%"
              : `calc(${(fractions[i] / total) * 100}% - ${(gap * (fractions.length - 1)) / fractions.length}px)`,
            flexGrow: 0,
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

function GridRender({
  node,
  viewport,
  children,
}: {
  node: BuilderElement;
  viewport: Viewport;
  children: React.ReactNode;
}) {
  const columns = Math.max(1, Math.min(3, Number(node.props.columns ?? 2)));
  const gap = Number(node.props.gap ?? 16);
  const vp = useEffectiveViewport(viewport);
  const isStack = vp === "mobile";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isStack ? "1fr" : `repeat(${columns}, minmax(0, 1fr))`,
        gap,
        transition: "gap 200ms ease, grid-template-columns 200ms ease",
      }}
      className="w-full"
    >
      {children}
    </div>
  );
}

function ColumnRender({
  node: _node,
  containerParentId,
  isEmpty,
  children,
}: {
  node: BuilderElement;
  containerParentId: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  if (isEmpty) {
    return (
      <DropArea
        parentId={containerParentId}
        className="h-full rounded-md border border-dashed border-border/70 bg-background/20 p-3 transition-colors"
      >
        {children}
      </DropArea>
    );
  }

  return (
    <div className="h-full rounded-md border border-dashed border-border/70 bg-background/20 p-3 transition-colors">
      {children}
    </div>
  );
}

function RowLayoutDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (template: RowTemplate) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="h-4 w-4 text-indigo-400" />
            Choose column layout
          </DialogTitle>
          <DialogDescription>
            Pick how this Flex Grid Row should split its columns. It will stack to a single column
            on mobile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          {ROW_LAYOUTS.map((opt) => {
            const total = opt.fractions.reduce((a, b) => a + b, 0);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onConfirm(opt.id)}
                className="group flex w-full items-center gap-4 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-indigo-500/60 hover:bg-accent"
              >
                <div className="flex h-10 w-24 shrink-0 gap-1 rounded-md bg-background/60 p-1">
                  {opt.fractions.map((f, i) => (
                    <div
                      key={i}
                      style={{ flexBasis: `${(f / total) * 100}%` }}
                      className="rounded-sm bg-indigo-500/70 transition-colors group-hover:bg-indigo-400"
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AccordionRender({
  node,
  onToggle,
}: {
  node: BuilderElement;
  onToggle: (idx: number) => void;
}) {
  const items = (node.props.items as AccordionItem[] | undefined) ?? [];
  const openIndex = Number(node.props.openIndex ?? -1);
  return (
    <div
      className="overflow-hidden border"
      style={{
        borderRadius: "var(--gs-radius)",
        borderColor: "rgba(255,255,255,0.08)",
        background: "var(--gs-surface)",
      }}
    >
      {items.length === 0 ? (
        <div className="p-4 text-xs text-muted-foreground">
          No rows yet â€” add some from the properties panel.
        </div>
      ) : (
        items.map((item, idx) => {
          const open = idx === openIndex;
          return (
            <div
              key={idx}
              className="border-b last:border-b-0"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(idx);
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                style={{ color: "var(--gs-text)" }}
              >
                <span className="text-sm font-medium">{item.header || "Untitled"}</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 transition-transform duration-300"
                  style={{
                    transform: open ? "rotate(180deg)" : "rotate(0)",
                    color: "var(--gs-primary)",
                  }}
                />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div
                    className="px-4 pb-4 text-sm"
                    style={{ color: "var(--gs-text)", opacity: 0.8 }}
                  >
                    {item.body}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function TabsRender({ node, onSwitch }: { node: BuilderElement; onSwitch: (idx: number) => void }) {
  const items = (node.props.items as TabItem[] | undefined) ?? [];
  const activeIndex = Math.min(
    Math.max(0, Number(node.props.activeIndex ?? 0)),
    Math.max(0, items.length - 1),
  );
  const active = items[activeIndex];
  return (
    <div
      className="overflow-hidden border"
      style={{
        borderRadius: "var(--gs-radius)",
        borderColor: "rgba(255,255,255,0.08)",
        background: "var(--gs-surface)",
      }}
    >
      <div
        className="flex gap-1 overflow-x-auto border-b px-2 pt-2"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {items.length === 0 ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">No tabs yet</div>
        ) : (
          items.map((item, idx) => {
            const isActive = idx === activeIndex;
            const activeStyle = (node.props.activeStyle as string | undefined) ?? "underline";
            const useBackground = activeStyle === "background";
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitch(idx);
                }}
                className="relative shrink-0 rounded-t-md px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: isActive
                    ? useBackground
                      ? "var(--gs-primary-foreground, #fff)"
                      : "var(--gs-primary)"
                    : "var(--gs-text)",
                  background: isActive
                    ? useBackground
                      ? "var(--gs-primary)"
                      : "rgba(255,255,255,0.04)"
                    : "transparent",
                }}
              >
                {item.label || `Tab ${idx + 1}`}
                {isActive && !useBackground && (
                  <span
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                    style={{ background: "var(--gs-primary)" }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
      <div className="p-5 text-sm" style={{ color: "var(--gs-text)" }}>
        {active ? active.body : <span className="text-muted-foreground">Empty panel</span>}
      </div>
    </div>
  );
}

function ItemListEditor<T extends { header?: string; label?: string; body: string }>({
  headerKey,
  headerLabel,
  bodyLabel,
  addLabel,
  items,
  onLive,
  onCommit,
}: {
  headerKey: "header" | "label";
  headerLabel: string;
  bodyLabel: string;
  addLabel: string;
  items: T[];
  onLive: (next: T[]) => void;
  onCommit: (prior: T[], next: T[]) => void;
}) {
  const snapshot = useRef<T[] | null>(null);

  const startEdit = () => {
    if (snapshot.current === null) snapshot.current = items.map((it) => ({ ...it }));
  };
  const finishEdit = (next: T[]) => {
    const prior = snapshot.current;
    snapshot.current = null;
    if (prior && JSON.stringify(prior) !== JSON.stringify(next)) onCommit(prior, next);
  };

  const updateField = (idx: number, key: "header" | "label" | "body", value: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it));
    onLive(next);
  };

  const addRow = () => {
    const fresh = { [headerKey]: "New item", body: "Edit this content." } as unknown as T;
    const next = [...items, fresh];
    onCommit(items, next);
  };

  const removeRow = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    onCommit(items, next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Items</Label>
        <Button variant="outline" size="sm" className="h-7 px-2" onClick={addRow}>
          <Plus className="mr-1 h-3 w-3" />
          {addLabel}
        </Button>
      </div>
      {items.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          No items â€” click â€œ{addLabel}â€ above to start.
        </div>
      )}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-2 rounded-md border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                aria-label="Remove item"
                title="Remove item"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">{headerLabel}</Label>
              <Input
                value={String(item[headerKey] ?? "")}
                onFocus={startEdit}
                onChange={(e) => updateField(idx, headerKey, e.target.value)}
                onBlur={() => finishEdit(items)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">{bodyLabel}</Label>
              <Textarea
                rows={3}
                value={item.body}
                onFocus={startEdit}
                onChange={(e) => updateField(idx, "body", e.target.value)}
                onBlur={() => finishEdit(items)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const FIELD_TYPE_OPTIONS: { value: FormFieldType; label: string }[] = [
  { value: "short", label: "Short Text" },
  { value: "long", label: "Long Text (Textarea)" },
  { value: "email", label: "Email" },
  { value: "select", label: "Dropdown Select" },
  { value: "checkbox", label: "Checkbox" },
];

function FormFieldsEditor({
  fields,
  onLive,
  onCommit,
}: {
  fields: FormField[];
  onLive: (next: FormField[]) => void;
  onCommit: (prior: FormField[], next: FormField[]) => void;
}) {
  const snapshot = useRef<FormField[] | null>(null);
  const startEdit = () => {
    if (snapshot.current === null) snapshot.current = fields.map((f) => ({ ...f }));
  };
  const finishEdit = (next: FormField[]) => {
    const prior = snapshot.current;
    snapshot.current = null;
    if (prior && JSON.stringify(prior) !== JSON.stringify(next)) onCommit(prior, next);
  };

  const updateField = (idx: number, patch: Partial<FormField>) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    onLive(next);
  };

  const addField = (type: FormFieldType) => {
    const labelMap: Record<FormFieldType, string> = {
      short: "Short answer",
      long: "Long answer",
      email: "Email address",
      select: "Choose an option",
      checkbox: "I agree",
    };
    const fresh: FormField = {
      id: `f_${Math.random().toString(36).slice(2, 8)}`,
      type,
      label: labelMap[type],
      placeholder: type === "checkbox" ? "" : "",
      required: false,
      options: type === "select" ? "Option 1, Option 2, Option 3" : undefined,
    };
    onCommit(fields, [...fields, fresh]);
  };

  const removeField = (idx: number) => {
    onCommit(
      fields,
      fields.filter((_, i) => i !== idx),
    );
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[idx], next[target]] = [next[target], next[idx]];
    onCommit(fields, next);
  };

  const commitTypeChange = (idx: number, value: FormFieldType) => {
    const prior = fields;
    const next = fields.map((f, i) =>
      i === idx
        ? {
            ...f,
            type: value,
            options: value === "select" ? (f.options ?? "Option 1, Option 2, Option 3") : undefined,
          }
        : f,
    );
    onCommit(prior, next);
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Form fields</Label>
        <Select onValueChange={(v) => addField(v as FormFieldType)} value="">
          <SelectTrigger className="h-7 w-[140px] px-2 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            <SelectValue placeholder="Add field" />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {fields.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          No fields yet â€” use "Add field" above.
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, idx) => (
          <div
            key={field.id}
            className="space-y-2 rounded-md border border-border bg-background/40 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                #{idx + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  aria-label="Move up"
                  title="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === fields.length - 1}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  aria-label="Move down"
                  title="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeField(idx)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                  aria-label="Remove field"
                  title="Remove field"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Type</Label>
              <Select
                value={field.type}
                onValueChange={(v) => commitTypeChange(idx, v as FormFieldType)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Label</Label>
              <Input
                value={field.label}
                onFocus={startEdit}
                onChange={(e) => updateField(idx, { label: e.target.value })}
                onBlur={() => finishEdit(fields)}
              />
            </div>

            {field.type !== "checkbox" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Placeholder</Label>
                <Input
                  value={field.placeholder ?? ""}
                  onFocus={startEdit}
                  onChange={(e) => updateField(idx, { placeholder: e.target.value })}
                  onBlur={() => finishEdit(fields)}
                />
              </div>
            )}

            {field.type === "select" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  Options (comma-separated)
                </Label>
                <Textarea
                  rows={2}
                  value={field.options ?? ""}
                  onFocus={startEdit}
                  onChange={(e) => updateField(idx, { options: e.target.value })}
                  onBlur={() => finishEdit(fields)}
                />
              </div>
            )}

            <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-input"
                checked={!!field.required}
                onChange={(e) =>
                  onCommit(
                    fields,
                    fields.map((f, i) => (i === idx ? { ...f, required: e.target.checked } : f)),
                  )
                }
              />
              <span>Required field</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function CarouselRender({
  node,
  onSwitch,
}: {
  node: BuilderElement;
  onSwitch: (idx: number) => void;
}) {
  const slides = (node.props.slides as CarouselSlide[] | undefined) ?? [];
  const height = Number(node.props.height ?? 360);
  const rawIdx = Number(node.props.activeIndex ?? 0);
  const active =
    slides.length === 0 ? 0 : ((rawIdx % slides.length) + slides.length) % slides.length;

  const go = (e: React.MouseEvent, dir: -1 | 1) => {
    e.stopPropagation();
    if (slides.length === 0) return;
    const next = (active + dir + slides.length) % slides.length;
    onSwitch(next);
  };

  if (slides.length === 0) {
    return (
      <div
        style={{ height, borderRadius: "var(--gs-radius)" }}
        className="flex items-center justify-center border border-dashed border-border/60 bg-background/40 text-xs text-muted-foreground"
      >
        No slides â€” add some from the properties panel.
      </div>
    );
  }

  const slide = slides[active];
  const overlay = Math.max(0, Math.min(1, Number(slide.overlay ?? 0.4)));

  return (
    <div
      style={{ height, borderRadius: "var(--gs-radius)" }}
      className="relative overflow-hidden border border-border/60"
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-[background-image] duration-500"
        style={{ backgroundImage: `url(${slide.image})` }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: "#000", opacity: overlay }}
      />
      <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
        <h2
          className="max-w-3xl text-2xl font-semibold leading-tight text-white drop-shadow md:text-4xl"
          style={{ color: "#fff" }}
        >
          {slide.headline}
        </h2>
        {slide.ctaLabel && (
          <a
            href={slide.ctaHref || "#"}
            onClick={(e) => e.preventDefault()}
            style={{
              background: "var(--gs-primary)",
              color: "var(--gs-on-primary)",
              borderRadius: "var(--gs-radius)",
            }}
            className="mt-5 inline-flex items-center px-5 py-2.5 text-sm font-medium shadow-sm hover:opacity-90"
          >
            {slide.ctaLabel}
          </a>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => go(e, -1)}
        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={(e) => go(e, 1)}
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSwitch(i);
            }}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === active ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function CarouselSlidesEditor({
  slides,
  onLive,
  onCommit,
}: {
  slides: CarouselSlide[];
  onLive: (next: CarouselSlide[]) => void;
  onCommit: (prior: CarouselSlide[], next: CarouselSlide[]) => void;
}) {
  const snapshot = useRef<CarouselSlide[] | null>(null);
  const startEdit = () => {
    if (snapshot.current === null) snapshot.current = slides.map((s) => ({ ...s }));
  };
  const finishEdit = (next: CarouselSlide[]) => {
    const prior = snapshot.current;
    snapshot.current = null;
    if (prior && JSON.stringify(prior) !== JSON.stringify(next)) onCommit(prior, next);
  };

  const updateField = (idx: number, patch: Partial<CarouselSlide>) => {
    const next = slides.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onLive(next);
  };

  const addSlide = () => {
    const fresh: CarouselSlide = {
      id: `s_${Math.random().toString(36).slice(2, 8)}`,
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600",
      overlay: 0.4,
      headline: "New slide headline",
      ctaLabel: "Learn more",
      ctaHref: "#",
    };
    onCommit(slides, [...slides, fresh]);
  };

  const removeSlide = (idx: number) => {
    onCommit(
      slides,
      slides.filter((_, i) => i !== idx),
    );
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[idx], next[target]] = [next[target], next[idx]];
    onCommit(slides, next);
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Slides</Label>
        <Button variant="outline" size="sm" className="h-7 px-2" onClick={addSlide}>
          <Plus className="mr-1 h-3 w-3" />
          Add slide
        </Button>
      </div>

      {slides.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          No slides yet â€” click "Add slide" above.
        </div>
      )}

      <div className="space-y-3">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className="space-y-2 rounded-md border border-border bg-background/40 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Slide {idx + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === slides.length - 1}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSlide(idx)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                  aria-label="Remove slide"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Background image</Label>
              <div className="flex gap-2">
                <Input
                  value={slide.image}
                  placeholder="https://â€¦ or upload"
                  onFocus={startEdit}
                  onChange={(e) => updateField(idx, { image: e.target.value })}
                  onBlur={() => finishEdit(slides)}
                />
                <UploadButton
                  onFile={(url) => {
                    startEdit();
                    const next = slides.map((s, i) => (i === idx ? { ...s, image: url } : s));
                    onLive(next);
                    finishEdit(next);
                  }}
                />
                <MediaPickerButton
                  onPick={(url) => {
                    startEdit();
                    const next = slides.map((s, i) => (i === idx ? { ...s, image: url } : s));
                    onLive(next);
                    finishEdit(next);
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Headline</Label>
              <Input
                value={slide.headline}
                onFocus={startEdit}
                onChange={(e) => updateField(idx, { headline: e.target.value })}
                onBlur={() => finishEdit(slides)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">CTA label</Label>
                <Input
                  value={slide.ctaLabel}
                  onFocus={startEdit}
                  onChange={(e) => updateField(idx, { ctaLabel: e.target.value })}
                  onBlur={() => finishEdit(slides)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">CTA link</Label>
                <Input
                  value={slide.ctaHref}
                  onFocus={startEdit}
                  onChange={(e) => updateField(idx, { ctaHref: e.target.value })}
                  onBlur={() => finishEdit(slides)}
                  placeholder="https://â€¦"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">
                Overlay opacity Â· {Math.round((slide.overlay ?? 0) * 100)}%
              </Label>
              <Slider
                value={[Math.round((slide.overlay ?? 0) * 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => updateField(idx, { overlay: (v[0] ?? 0) / 100 })}
                onPointerDown={startEdit}
                onValueCommit={() => finishEdit(slides)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavbarRender({ node, viewport }: { node: BuilderElement; viewport: Viewport }) {
  const vp = useEffectiveViewport(viewport);
  const p = node.props;
  const links = (p.links as NavLink[] | undefined) ?? [];
  const brandText = String(p.brandText ?? "");
  const brandImage = String(p.brandImage ?? "").trim();
  const sticky = Boolean(p.sticky);
  const bg = String(p.background ?? "").trim();
  const isMobile = vp === "mobile";
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        background: bg || "var(--gs-surface)",
        borderRadius: "var(--gs-radius)",
      }}
      className={`relative border border-border/60 px-4 py-3 sm:px-5 ${
        sticky ? "shadow-sm ring-1 ring-indigo-500/30" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {brandImage ? (
            <img
              src={brandImage}
              alt={brandText || "Brand"}
              className="h-8 w-auto shrink-0 object-contain"
              draggable={false}
            />
          ) : (
            <span
              className="truncate text-base font-semibold tracking-tight"
              style={{ color: "var(--gs-on-surface, inherit)" }}
            >
              {brandText || "Brand"}
            </span>
          )}
          {sticky && (
            <span className="ml-1 shrink-0 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-300">
              Sticky
            </span>
          )}
        </div>

        {isMobile ? (
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="shrink-0 rounded-md border border-border/60 p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {open ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        ) : (
          <nav className="flex flex-wrap items-center justify-end gap-1">
            {links.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Add links from the properties panel.
              </span>
            ) : (
              links.map((l) => (
                <a
                  key={l.id}
                  href={l.href || "#"}
                  onClick={(e) => e.preventDefault()}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  style={{ borderRadius: "var(--gs-radius)" }}
                >
                  {l.label}
                </a>
              ))
            )}
          </nav>
        )}
      </div>

      {isMobile && (
        <div
          className={`grid overflow-hidden transition-all duration-200 ease-out ${
            open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <nav className="min-h-0 flex flex-col gap-1 border-t border-border/60 pt-3">
            {links.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Add links from the properties panel.
              </span>
            ) : (
              links.map((l) => (
                <a
                  key={l.id}
                  href={l.href || "#"}
                  onClick={(e) => e.preventDefault()}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  style={{ borderRadius: "var(--gs-radius)" }}
                >
                  {l.label}
                </a>
              ))
            )}
          </nav>
        </div>
      )}
    </div>
  );
}

function NavLinksEditor({
  links,
  pages,
  onLive,
  onCommit,
}: {
  links: NavLink[];
  pages: PageRef[];
  onLive: (next: NavLink[]) => void;
  onCommit: (prior: NavLink[], next: NavLink[]) => void;
}) {
  const snapshot = useRef<NavLink[] | null>(null);
  const startEdit = () => {
    if (snapshot.current === null) snapshot.current = links.map((l) => ({ ...l }));
  };
  const finishEdit = (next: NavLink[]) => {
    const prior = snapshot.current;
    snapshot.current = null;
    if (prior && JSON.stringify(prior) !== JSON.stringify(next)) onCommit(prior, next);
  };

  const update = (idx: number, patch: Partial<NavLink>) => {
    onLive(links.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addLink = () => {
    onCommit(links, [
      ...links,
      { id: `n_${Math.random().toString(36).slice(2, 8)}`, label: "New link", href: "#" },
    ]);
  };

  const removeLink = (idx: number) => {
    onCommit(
      links,
      links.filter((_, i) => i !== idx),
    );
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[idx], next[target]] = [next[target], next[idx]];
    onCommit(links, next);
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Navigation links</Label>
        <Button variant="outline" size="sm" className="h-7 px-2" onClick={addLink}>
          <Plus className="mr-1 h-3 w-3" />
          Add link
        </Button>
      </div>

      {links.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          No links yet â€” click "Add link" above.
        </div>
      )}

      <div className="space-y-2">
        {links.map((link, idx) => (
          <div
            key={link.id}
            className="space-y-2 rounded-md border border-border bg-background/40 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Link {idx + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === links.length - 1}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeLink(idx)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                  aria-label="Remove link"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Label</Label>
              <Input
                value={link.label}
                onFocus={startEdit}
                onChange={(e) => update(idx, { label: e.target.value })}
                onBlur={() => finishEdit(links)}
              />
            </div>

            <LinkDestinationField
              label="Target URL"
              linkType={link.linkType ?? "external"}
              href={link.href ?? ""}
              pageId={link.pageId ?? ""}
              pages={pages}
              onChange={(next) => {
                const prior = links.map((l) => ({ ...l }));
                const updated = links.map((l, i) => (i === idx ? { ...l, ...next } : l));
                onCommit(prior, updated);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageCarouselRender({
  node,
  onSwitch,
}: {
  node: BuilderElement;
  onSwitch: (idx: number) => void;
}) {
  const slides = (node.props.slides as ImageSlide[] | undefined) ?? [];
  const height = Number(node.props.height ?? 320);
  const showCaptions = node.props.showCaptions !== false;
  const rawIdx = Number(node.props.activeIndex ?? 0);
  const active =
    slides.length === 0 ? 0 : ((rawIdx % slides.length) + slides.length) % slides.length;

  const dragStart = useRef<{ x: number; id: number } | null>(null);
  const [dragDx, setDragDx] = useState(0);

  const go = (e: React.MouseEvent, dir: -1 | 1) => {
    e.stopPropagation();
    if (slides.length === 0) return;
    onSwitch((active + dir + slides.length) % slides.length);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (slides.length < 2) return;
    dragStart.current = { x: e.clientX, id: e.pointerId };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || dragStart.current.id !== e.pointerId) return;
    setDragDx(e.clientX - dragStart.current.x);
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || dragStart.current.id !== e.pointerId) return;
    const dx = e.clientX - dragStart.current.x;
    dragStart.current = null;
    setDragDx(0);
    const threshold = 50;
    if (Math.abs(dx) > threshold && slides.length > 0) {
      const dir = dx < 0 ? 1 : -1;
      onSwitch((active + dir + slides.length) % slides.length);
    }
  };

  if (slides.length === 0) {
    return (
      <div
        style={{ height, borderRadius: "var(--gs-radius)" }}
        className="flex items-center justify-center border border-dashed border-border/60 bg-background/40 text-xs text-muted-foreground"
      >
        No images â€” add some from the properties panel.
      </div>
    );
  }

  const slide = slides[active];

  return (
    <div
      style={{ height, borderRadius: "var(--gs-radius)" }}
      className="relative overflow-hidden border border-border/60 bg-black/40 select-none touch-pan-y"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-200"
        style={{
          backgroundImage: `url(${slide.src})`,
          transform: dragDx ? `translateX(${dragDx}px)` : undefined,
        }}
      />

      {showCaptions && slide.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-10 pt-8 text-sm text-white">
          {slide.caption}
        </div>
      )}

      <button
        type="button"
        onClick={(e) => go(e, -1)}
        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={(e) => go(e, 1)}
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        aria-label="Next image"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSwitch(i);
            }}
            aria-label={`Go to image ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ImageSlidesEditor({
  slides,
  onLive,
  onCommit,
}: {
  slides: ImageSlide[];
  onLive: (next: ImageSlide[]) => void;
  onCommit: (prior: ImageSlide[], next: ImageSlide[]) => void;
}) {
  const snapshot = useRef<ImageSlide[] | null>(null);
  const startEdit = () => {
    if (snapshot.current === null) snapshot.current = slides.map((s) => ({ ...s }));
  };
  const finishEdit = (next: ImageSlide[]) => {
    const prior = snapshot.current;
    snapshot.current = null;
    if (prior && JSON.stringify(prior) !== JSON.stringify(next)) onCommit(prior, next);
  };

  const updateField = (idx: number, patch: Partial<ImageSlide>) => {
    onLive(slides.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addSlide = () => {
    const fresh: ImageSlide = {
      id: `img_${Math.random().toString(36).slice(2, 8)}`,
      src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600",
      caption: "",
    };
    onCommit(slides, [...slides, fresh]);
  };

  const removeSlide = (idx: number) => {
    onCommit(
      slides,
      slides.filter((_, i) => i !== idx),
    );
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[idx], next[target]] = [next[target], next[idx]];
    onCommit(slides, next);
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Images</Label>
        <Button variant="outline" size="sm" className="h-7 px-2" onClick={addSlide}>
          <Plus className="mr-1 h-3 w-3" />
          Add image
        </Button>
      </div>

      {slides.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          No images yet â€” click "Add image" above.
        </div>
      )}

      <div className="space-y-3">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className="space-y-2 rounded-md border border-border bg-background/40 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Image {idx + 1}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => move(idx, 1)}
                  disabled={idx === slides.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => removeSlide(idx)}
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {slide.src && (
              <div
                className="h-20 w-full rounded border border-border bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.src})` }}
                aria-hidden
              />
            )}

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Image</Label>
              <div className="flex gap-2">
                <Input
                  value={slide.src}
                  placeholder="https://â€¦ or upload"
                  onFocus={startEdit}
                  onChange={(e) => updateField(idx, { src: e.target.value })}
                  onBlur={() => finishEdit(slides)}
                />
                <UploadButton
                  onFile={(url) => {
                    startEdit();
                    const next = slides.map((s, i) => (i === idx ? { ...s, src: url } : s));
                    onLive(next);
                    finishEdit(next);
                  }}
                />
                <MediaPickerButton
                  onPick={(url) => {
                    startEdit();
                    const next = slides.map((s, i) => (i === idx ? { ...s, src: url } : s));
                    onLive(next);
                    finishEdit(next);
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Caption (optional)</Label>
              <Input
                value={slide.caption}
                placeholder="Add a caption"
                onFocus={startEdit}
                onChange={(e) => updateField(idx, { caption: e.target.value })}
                onBlur={() => finishEdit(slides)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddPageDialog({
  open,
  onOpenChange,
  slugify,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  slugify: (s: string) => string;
  onCreate: (title: string, slug: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("/");
  const [slugTouched, setSlugTouched] = useState(false);

  const reset = () => {
    setTitle("");
    setSlug("/");
    setSlugTouched(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Page</DialogTitle>
          <DialogDescription>The URL slug auto-generates from the title.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-page-title">Page Title</Label>
            <Input
              id="new-page-title"
              autoFocus
              placeholder="e.g. About Us"
              value={title}
              onChange={(e) => {
                const v = e.target.value;
                setTitle(v);
                if (!slugTouched) setSlug(slugify(v) || "/");
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-page-slug">URL Slug</Label>
            <Input
              id="new-page-slug"
              placeholder="/about-us"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className="font-mono"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-indigo-500 text-white hover:bg-indigo-600"
            onClick={() => {
              if (!title.trim()) return;
              onCreate(title, slug || slugify(title));
              reset();
            }}
            disabled={!title.trim()}
          >
            Create Page
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PageSettingsDialog({
  page,
  onOpenChange,
  onSave,
}: {
  page: { id: string; title: string; slug: string } | null;
  onOpenChange: (o: boolean) => void;
  onSave: (title: string, slug: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("/");
  const lastId = useRef<string | null>(null);

  if (page && lastId.current !== page.id) {
    lastId.current = page.id;
    setTitle(page.title);
    setSlug(page.slug);
  }
  if (!page && lastId.current !== null) {
    lastId.current = null;
  }

  return (
    <Dialog open={page !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Page Settings</DialogTitle>
          <DialogDescription>Rename this page or change its URL slug.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-page-title">Page Title</Label>
            <Input id="edit-page-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-page-slug">URL Slug</Label>
            <Input
              id="edit-page-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-indigo-500 text-white hover:bg-indigo-600"
            onClick={() => onSave(title, slug)}
            disabled={!title.trim()}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
