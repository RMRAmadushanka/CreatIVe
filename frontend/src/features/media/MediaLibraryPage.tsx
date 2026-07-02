import { useMemo, useRef, useState } from "react";
import {
  Search,
  Upload,
  Trash2,
  Link as LinkIcon,
  ImageIcon,
  Images as ImagesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import {
  addAssetFromFile,
  deleteAsset as deleteFromStore,
  useMediaLibrary,
  type AssetKind,
  type LibraryAsset,
} from "@/store/media-store";

type Asset = LibraryAsset;

const FILTERS: { id: "all" | AssetKind; label: string }[] = [
  { id: "all", label: "All Assets" },
  { id: "logo", label: "Logos" },
  { id: "icon", label: "Icons" },
  { id: "image", label: "Images" },
];

export function MediaLibraryPage() {
  const assets = useMediaLibrary();
  const [filter, setFilter] = useState<"all" | AssetKind>("all");
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (filter !== "all" && a.kind !== filter) return false;
      if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [assets, filter, query]);

  const counts = useMemo(() => {
    return {
      all: assets.length,
      logo: assets.filter((a) => a.kind === "logo").length,
      icon: assets.filter((a) => a.kind === "icon").length,
      image: assets.filter((a) => a.kind === "image").length,
    };
  }, [assets]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const accepted = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    let count = 0;
    for (const file of Array.from(files)) {
      if (!accepted.includes(file.type)) {
        toast.error(`${file.name}: unsupported format`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: exceeds 5MB`);
        continue;
      }
      await addAssetFromFile(file);
      count++;
    }
    if (count) {
      toast.success(`Uploaded ${count} asset${count > 1 ? "s" : ""}`);
    }
  }

  function deleteAsset(id: string) {
    deleteFromStore(id);
    toast.success("Asset deleted");
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ImagesIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Media Library</h1>
              <p className="text-xs text-muted-foreground">
                Manage all your logos, icons, and images
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-3 md:justify-end">
            <div className="relative flex-1 md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search assets..."
                className="pl-9"
              />
            </div>
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload New Asset
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              const count = counts[f.id];
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "relative flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {filtered.length === 0 ? (
          <EmptyState onUpload={() => fileInputRef.current?.click()} hasQuery={!!query} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={() => deleteAsset(asset.id)}
                onCopy={() => copyUrl(asset.url)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AssetCard({
  asset,
  onDelete,
  onCopy,
}: {
  asset: Asset;
  onDelete: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border/60 bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="relative aspect-square overflow-hidden bg-muted/30">
        <img
          src={asset.url}
          alt={asset.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          <button
            onClick={onCopy}
            title="Copy URL"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-110"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition hover:scale-110"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <span className="absolute left-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
          {asset.format}
        </span>
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium" title={asset.name}>
          {asset.name}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize">{asset.kind}</span>
          <span>{asset.width > 0 ? `${asset.width}×${asset.height}` : "—"}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onUpload, hasQuery }: { onUpload: () => void; hasQuery: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ImageIcon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">
        {hasQuery ? "No matching assets" : "No assets yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasQuery
          ? "Try a different keyword or clear your search."
          : "Upload PNG, JPG, SVG, or WebP files up to 5MB to get started."}
      </p>
      {!hasQuery && (
        <Button onClick={onUpload} className="mt-6 gap-2">
          <Upload className="h-4 w-4" />
          Upload your first asset
        </Button>
      )}
    </div>
  );
}
