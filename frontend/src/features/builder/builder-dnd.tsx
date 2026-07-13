/**
 * All builder drag-and-drop in one file (@dnd-kit).
 *
 * Drop targets attach `data: { parentId, index }` where index is a number (insert
 * before that slot) or "append" (add to end of container / root canvas).
 */
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LucideIcon } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/utils/cn";

import type { BuilderElement, ElementType } from "./types";

// --- shared drop payload (read in handleDragEnd) ---

type DropData = {
  parentId: string | null;
  index: number | "append";
};

type PaletteData = { from: "palette"; type: ElementType };
type CanvasData = { from: "canvas"; id: string };

function dropId(parentId: string | null, index: number | "append") {
  return `drop:${parentId ?? "root"}:${index}`;
}

export function paletteTypeFromId(id: string): ElementType | null {
  if (!id.startsWith("palette:")) return null;
  return id.slice("palette:".length) as ElementType;
}

function findParentId(tree: BuilderElement[], id: string): string | null {
  for (const el of tree) {
    if (el.children.some((c) => c.id === id)) return el.id;
    const nested = findParentId(el.children, id);
    if (nested !== null) return nested;
  }
  return null;
}

function isDropData(data: unknown): data is DropData {
  if (!data || typeof data !== "object") return false;
  const d = data as DropData;
  return "parentId" in d && (typeof d.index === "number" || d.index === "append");
}

function resolveDropTarget(
  over: DragEndEvent["over"],
  elements: BuilderElement[],
  findNode: DragEndContext["findNode"],
): DropData | null {
  if (!over?.data.current) return null;

  const data = over.data.current;
  if (isDropData(data)) return data;

  if (typeof data === "object" && data !== null && "from" in data && data.from === "canvas") {
    const elementId = (data as CanvasData).id;
    const parentId = findParentId(elements, elementId);
    const siblings =
      parentId === null ? elements : (findNode(elements, parentId)?.children ?? []);
    const idx = siblings.findIndex((s) => s.id === elementId);
    if (idx >= 0) return { parentId, index: idx };
  }

  return null;
}

/** Prefer gap lines over large "append" containers so in-section reorder works. */
const builderCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const candidates = pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
  if (candidates.length <= 1) return candidates;

  const ranked = candidates
    .map((collision) => {
      const container = args.droppableContainers.find((c) => c.id === collision.id);
      const data = container?.data?.current;
      let score = 0;
      if (isDropData(data)) {
        score = typeof data.index === "number" ? 100 : 20;
        if (data.index === "append") {
          const rect = args.droppableRects.get(collision.id);
          if (rect) score -= (rect.width * rect.height) / 50_000;
        }
      } else if (
        typeof data === "object" &&
        data !== null &&
        "from" in data &&
        data.from === "canvas"
      ) {
        score = 60;
      }
      return { collision, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.map((r) => r.collision);
};

function canDropInto(
  elements: BuilderElement[],
  parentId: string | null,
  elementType: ElementType,
  findNode: DragEndContext["findNode"],
): boolean {
  if (elementType === "column") return false;
  if (parentId === null) return true;
  const parent = findNode(elements, parentId);
  if (!parent) return false;
  const container =
    parent.type === "section" ||
    parent.type === "fullSection" ||
    parent.type === "column" ||
    parent.type === "card";
  if (!container) return false;
  if ((elementType === "row" || elementType === "grid") && parent.type === "column") return false;
  return true;
}

// --- drag end: one function, reads over.data only ---

export type DragEndContext = {
  elements: BuilderElement[];
  commit: (next: BuilderElement[]) => void;
  setSelectedId: (id: string | null) => void;
  onRequestRowLayout: (parentId: string | null) => void;
  makeElement: (type: ElementType) => BuilderElement;
  findNode: (tree: BuilderElement[], id: string) => BuilderElement | null;
  insertInto: (
    tree: BuilderElement[],
    parentId: string | null,
    node: BuilderElement,
  ) => BuilderElement[];
  insertAtIndex: (
    tree: BuilderElement[],
    parentId: string | null,
    index: number,
    node: BuilderElement,
  ) => BuilderElement[];
  moveNode: (
    tree: BuilderElement[],
    draggedId: string,
    targetParentId: string | null,
    beforeIndex: number,
  ) => BuilderElement[];
};

export function handleDragEnd(event: DragEndEvent, ctx: DragEndContext) {
  const { active, over } = event;
  const drop = resolveDropTarget(over, ctx.elements, ctx.findNode);
  if (!drop) return;

  const activeData = active.data.current as PaletteData | CanvasData | undefined;

  if (activeData?.from === "palette") {
    const type = activeData.type;
    if (!canDropInto(ctx.elements, drop.parentId, type, ctx.findNode)) return;

    if (type === "row") {
      ctx.onRequestRowLayout(drop.parentId);
      return;
    }

    const node = ctx.makeElement(type);
    const next =
      drop.index === "append"
        ? ctx.insertInto(ctx.elements, drop.parentId, node)
        : ctx.insertAtIndex(ctx.elements, drop.parentId, drop.index, node);
    ctx.commit(next);
    ctx.setSelectedId(node.id);
    return;
  }

  if (activeData?.from === "canvas") {
    const draggedId = activeData.id;
    if (drop.index === "append") {
      const parent = drop.parentId ? ctx.findNode(ctx.elements, drop.parentId) : null;
      const len = parent ? parent.children.length : ctx.elements.length;
      // Avoid accidental "append" hits on large drop areas when reordering existing items.
      // Reordering to end should happen through the explicit final DropGap (numeric index).
      // Keep append only for truly empty targets so moving into empty containers still works.
      if (len > 0) return;
      ctx.commit(ctx.moveNode(ctx.elements, draggedId, drop.parentId, len));
    } else {
      ctx.commit(ctx.moveNode(ctx.elements, draggedId, drop.parentId, drop.index));
    }
  }
}

// --- provider ---

export function BuilderDndProvider({
  children,
  onDragEnd,
  renderOverlay,
}: {
  children: ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
  renderOverlay?: (activeId: string) => ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={builderCollisionDetection}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={(e) => {
        setActiveId(null);
        onDragEnd(e);
      }}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeId && renderOverlay ? renderOverlay(activeId) : null}
      </DragOverlay>
    </DndContext>
  );
}

// --- palette item ---

export function PaletteDraggable({
  type,
  label,
  hint,
  icon: Icon,
  locked = false,
  onLockedClick,
}: {
  type: ElementType;
  label: string;
  hint: string;
  icon: LucideIcon;
  locked?: boolean;
  onLockedClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { from: "palette", type } satisfies PaletteData,
    disabled: locked,
  });

  return (
    <div
      ref={setNodeRef}
      {...(locked ? {} : listeners)}
      {...(locked ? {} : attributes)}
      onClick={locked ? onLockedClick : undefined}
      title={locked ? "Upgrade your plan to unlock this component" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all",
        locked
          ? "cursor-not-allowed opacity-50"
          : "cursor-grab hover:border-indigo-500/50 hover:bg-accent active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight">
          {label}
          {locked ? " · Upgrade" : ""}
        </div>
        <div className="truncate text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}

// --- thin line between siblings (reorder / insert at index) ---

export function DropGap({ parentId, index }: { parentId: string | null; index: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId(parentId, index),
    data: { parentId, index } satisfies DropData,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-3 shrink-0 transition-all",
        isOver ? "my-1 h-4 rounded-md bg-indigo-500/40 ring-1 ring-indigo-500" : "h-3",
      )}
    />
  );
}

// --- container or root canvas (append to end) ---

export function DropArea({
  parentId,
  className,
  style,
  children,
}: {
  parentId: string | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId(parentId, "append"),
    data: { parentId, index: "append" } satisfies DropData,
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(className, isOver && "border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/40")}
    >
      {children}
    </div>
  );
}

// --- draggable canvas element ---

export function CanvasDraggable({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { from: "canvas", id } satisfies CanvasData,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(className, isDragging && "opacity-50")}
    >
      {children}
    </div>
  );
}
