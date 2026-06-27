import { createFileRoute } from "@tanstack/react-router";
import { useState, type CSSProperties, type DragEvent } from "react";
import {
  Square,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  Mail,
  Trash2,
  GripVertical,
  Save,
  Rocket,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Canvas — Drag & Drop Page Builder" },
      { name: "description", content: "A modern dark-mode drag-and-drop web page builder workspace." },
    ],
  }),
  component: Builder,
});

type ElementType = "section" | "text" | "image" | "button" | "form";

type BuilderElement = {
  id: string;
  type: ElementType;
  props: Record<string, string | number>;
};

const PALETTE: { type: ElementType; label: string; icon: typeof Square; hint: string }[] = [
  { type: "section", label: "Section Container", icon: Square, hint: "Layout wrapper" },
  { type: "text", label: "Text Block", icon: Type, hint: "Paragraph or heading" },
  { type: "image", label: "Image Block", icon: ImageIcon, hint: "Picture or media" },
  { type: "button", label: "Button", icon: MousePointerClick, hint: "Call to action" },
  { type: "form", label: "Contact Form", icon: Mail, hint: "Name, email, message" },
];

const defaults: Record<ElementType, BuilderElement["props"]> = {
  section: { padding: 32, background: "#111827", minHeight: 120 },
  text: { content: "Edit this text block.", fontSize: 16, align: "left", color: "#e5e7eb" },
  image: {
    src: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800",
    alt: "Placeholder",
    width: 480,
    radius: 12,
  },
  button: { label: "Click me", bg: "#6366f1", color: "#ffffff", radius: 8, align: "left" },
  form: { title: "Get in touch", buttonLabel: "Send message", align: "left" },
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function Builder() {
  const [elements, setElements] = useState<BuilderElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const selected = elements.find((e) => e.id === selectedId) ?? null;

  const onPaletteDragStart = (e: DragEvent, type: ElementType) => {
    e.dataTransfer.setData("application/x-builder-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const onCanvasDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const type = e.dataTransfer.getData("application/x-builder-type") as ElementType;
    if (!type) return;
    const newEl: BuilderElement = { id: uid(), type, props: { ...defaults[type] } };
    setElements((prev) => [...prev, newEl]);
    setSelectedId(newEl.id);
  };

  const updateProp = (key: string, value: string | number) => {
    if (!selected) return;
    setElements((prev) =>
      prev.map((el) =>
        el.id === selected.id ? { ...el, props: { ...el.props, [key]: value } } : el,
      ),
    );
  };

  const removeSelected = () => {
    if (!selected) return;
    setElements((prev) => prev.filter((el) => el.id !== selected.id));
    setSelectedId(null);
  };

  const handleSave = () => {
    try {
      localStorage.setItem("canvas-builder:layout", JSON.stringify(elements));
      toast.success("Layout saved", { description: `${elements.length} element(s) stored locally.` });
    } catch {
      toast.error("Could not save layout");
    }
  };

  const handlePublish = () => {
    toast.success("Published!", { description: "Your page is now live (demo)." });
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Top header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/60 px-5 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
          <div>
            <div className="text-sm font-semibold tracking-tight">Canvas Builder</div>
            <div className="text-[10px] text-muted-foreground">Untitled page · Draft</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button size="sm" onClick={handlePublish} className="bg-indigo-500 text-white hover:bg-indigo-600">
            <Rocket className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

      {/* Left palette */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card/40">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
            <h1 className="text-sm font-semibold tracking-tight">Canvas Builder</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Drag components onto the canvas</p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          <p className="px-1 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Components
          </p>
          {PALETTE.map(({ type, label, icon: Icon, hint }) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => onPaletteDragStart(e, type)}
              className="group flex cursor-grab items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-indigo-500/50 hover:bg-accent active:cursor-grabbing"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight">{label}</div>
                <div className="truncate text-xs text-muted-foreground">{hint}</div>
              </div>
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </aside>

      {/* Canvas */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-12 items-center justify-between border-b border-border bg-card/40 px-5">
          <div className="text-xs text-muted-foreground">
            {elements.length} element{elements.length === 1 ? "" : "s"} on canvas
          </div>
          {elements.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setElements([]);
                setSelectedId(null);
              }}
            >
              Clear all
            </Button>
          )}
        </div>
        <div
          className="flex-1 overflow-auto p-8"
          onClick={() => setSelectedId(null)}
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onCanvasDrop}
            className={`mx-auto min-h-full max-w-4xl rounded-xl border-2 border-dashed bg-card/30 p-6 transition-colors ${
              dragOver ? "border-indigo-500 bg-indigo-500/5" : "border-border"
            }`}
          >
            {elements.length === 0 ? (
              <div className="flex h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <MousePointerClick className="h-6 w-6 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Drop components here</h2>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Drag any component from the left sidebar to start building your page.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {elements.map((el) => (
                  <CanvasItem
                    key={el.id}
                    element={el}
                    selected={el.id === selectedId}
                    onSelect={(e) => {
                      e.stopPropagation();
                      setSelectedId(el.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Right properties panel */}
      <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-card/40">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold tracking-tight">Properties</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {selected ? `Editing ${labelFor(selected.type)}` : "Select an element to edit"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {selected ? (
            <PropertyEditor element={selected} onChange={updateProp} onDelete={removeSelected} />
          ) : (
            <EmptyProps />
          )}
        </div>
      </aside>
      </div>
    </div>
  );
}

function labelFor(type: ElementType) {
  return PALETTE.find((p) => p.type === type)?.label ?? type;
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

function CanvasItem({
  element,
  selected,
  onSelect,
}: {
  element: BuilderElement;
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer rounded-lg border transition-all ${
        selected
          ? "border-indigo-500 ring-2 ring-indigo-500/30"
          : "border-transparent hover:border-border"
      }`}
    >
      {selected && (
        <div className="absolute -top-6 left-0 rounded-t-md bg-indigo-500 px-2 py-0.5 text-[10px] font-medium text-white">
          {labelFor(element.type)}
        </div>
      )}
      <Render element={element} />
    </div>
  );
}

function Render({ element }: { element: BuilderElement }) {
  const p = element.props;
  switch (element.type) {
    case "section":
      return (
        <div
          style={{
            padding: Number(p.padding),
            background: String(p.background),
            minHeight: Number(p.minHeight),
          }}
          className="rounded-md border border-border/60"
        >
          <p className="text-xs text-muted-foreground">Section container — drop content here</p>
        </div>
      );
    case "text":
      return (
        <p
          style={{
            fontSize: Number(p.fontSize),
            textAlign: p.align as CSSProperties["textAlign"],
            color: String(p.color),
          }}
        >
          {String(p.content)}
        </p>
      );
    case "image":
      return (
        <div style={{ textAlign: "left" }}>
          <img
            src={String(p.src)}
            alt={String(p.alt)}
            style={{ width: Number(p.width), borderRadius: Number(p.radius) }}
            className="max-w-full"
          />
        </div>
      );
    case "button": {
      const align = p.align as CSSProperties["textAlign"];
      return (
        <div style={{ textAlign: align }}>
          <button
            type="button"
            style={{
              background: String(p.bg),
              color: String(p.color),
              borderRadius: Number(p.radius),
            }}
            className="px-5 py-2.5 text-sm font-medium"
          >
            {String(p.label)}
          </button>
        </div>
      );
    }
    case "form":
      return (
        <div
          style={{ textAlign: p.align as CSSProperties["textAlign"] }}
          className="space-y-3 rounded-md border border-border/60 bg-background/40 p-5"
        >
          <h3 className="text-base font-semibold">{String(p.title)}</h3>
          <Input placeholder="Your name" />
          <Input type="email" placeholder="Email address" />
          <Textarea placeholder="Your message" rows={3} />
          <Button className="w-full" type="button">
            {String(p.buttonLabel)}
          </Button>
        </div>
      );
  }
}

function PropertyEditor({
  element,
  onChange,
  onDelete,
}: {
  element: BuilderElement;
  onChange: (key: string, value: string | number) => void;
  onDelete: () => void;
}) {
  const p = element.props;
  return (
    <div className="space-y-5">
      {element.type === "section" && (
        <>
          <Field label="Background color">
            <ColorInput value={String(p.background)} onChange={(v) => onChange("background", v)} />
          </Field>
          <SliderField
            label="Padding"
            value={Number(p.padding)}
            min={0}
            max={120}
            onChange={(v) => onChange("padding", v)}
            suffix="px"
          />
          <SliderField
            label="Min height"
            value={Number(p.minHeight)}
            min={40}
            max={500}
            onChange={(v) => onChange("minHeight", v)}
            suffix="px"
          />
        </>
      )}

      {element.type === "text" && (
        <>
          <Field label="Content">
            <Textarea
              value={String(p.content)}
              onChange={(e) => onChange("content", e.target.value)}
              rows={4}
            />
          </Field>
          <SliderField
            label="Font size"
            value={Number(p.fontSize)}
            min={10}
            max={72}
            onChange={(v) => onChange("fontSize", v)}
            suffix="px"
          />
          <AlignField value={String(p.align)} onChange={(v) => onChange("align", v)} />
          <Field label="Text color">
            <ColorInput value={String(p.color)} onChange={(v) => onChange("color", v)} />
          </Field>
        </>
      )}

      {element.type === "image" && (
        <>
          <Field label="Image URL">
            <Input value={String(p.src)} onChange={(e) => onChange("src", e.target.value)} />
          </Field>
          <Field label="Alt text">
            <Input value={String(p.alt)} onChange={(e) => onChange("alt", e.target.value)} />
          </Field>
          <SliderField
            label="Width"
            value={Number(p.width)}
            min={80}
            max={1024}
            onChange={(v) => onChange("width", v)}
            suffix="px"
          />
          <SliderField
            label="Corner radius"
            value={Number(p.radius)}
            min={0}
            max={48}
            onChange={(v) => onChange("radius", v)}
            suffix="px"
          />
        </>
      )}

      {element.type === "button" && (
        <>
          <Field label="Label">
            <Input value={String(p.label)} onChange={(e) => onChange("label", e.target.value)} />
          </Field>
          <Field label="Background">
            <ColorInput value={String(p.bg)} onChange={(v) => onChange("bg", v)} />
          </Field>
          <Field label="Text color">
            <ColorInput value={String(p.color)} onChange={(v) => onChange("color", v)} />
          </Field>
          <SliderField
            label="Corner radius"
            value={Number(p.radius)}
            min={0}
            max={32}
            onChange={(v) => onChange("radius", v)}
            suffix="px"
          />
          <AlignField value={String(p.align)} onChange={(v) => onChange("align", v)} />
        </>
      )}

      {element.type === "form" && (
        <>
          <Field label="Form title">
            <Input value={String(p.title)} onChange={(e) => onChange("title", e.target.value)} />
          </Field>
          <Field label="Submit button label">
            <Input
              value={String(p.buttonLabel)}
              onChange={(e) => onChange("buttonLabel", e.target.value)}
            />
          </Field>
          <AlignField value={String(p.align)} onChange={(v) => onChange("align", v)} />
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
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
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
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

function AlignField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Alignment">
      <Select value={value} onValueChange={onChange}>
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

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
    </div>
  );
}
