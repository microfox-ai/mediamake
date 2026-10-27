"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  FolderUpIcon,
  Loader2Icon,
  PaletteIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ASSET_KINDS,
  isImage,
  isVideo,
  mimeOf,
  planKitUpload,
  primaryLogo,
  skippedFolder,
  type BrandAsset,
  type BrandAssetKind,
  type BrandColor,
  type BrandFont,
  type BrandKit,
  type BrandKitPatch,
  type KitPlan,
} from "@/lib/brand-kit";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<BrandAssetKind, string> = {
  logo: "Logos",
  "logo-animated": "Animated logo",
  intro: "Intros",
  outro: "Outros",
  "end-screen": "End screens",
  channel: "Channel art",
  favicon: "Icons",
  font: "Font files",
  guide: "Guide",
  sound: "Sounds",
  other: "Other",
};

const formatBytes = (n: number) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

/** Files from an <input webkitdirectory>, with the picked folder's own name dropped from each path. */
function kitFilesOf(list: FileList) {
  const files = [...list];
  const roots = new Set(files.map((f) => (f.webkitRelativePath || f.name).split("/")[0]));
  const strip = roots.size === 1 && files.every((f) => f.webkitRelativePath.includes("/"));
  return files.map((f) => {
    const rel = f.webkitRelativePath || f.name;
    return {
      path: strip ? rel.split("/").slice(1).join("/") : rel,
      size: f.size,
      readText: () => f.text(),
      file: f,
    };
  });
}

type KitFileWithBlob = ReturnType<typeof kitFilesOf>[number];

type IterableDir = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
};

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
};

/**
 * Files of a kit folder picked with the File System Access API (Chromium only), without opening
 * the folders a kit never uploads (skippedFolder: graphics/, node_modules/, hidden ones), so a
 * brand whose source holds thousands of reference frames reads as just its kit. Each of those
 * folders comes back as one skipped line.
 */
async function walkKitFolder(dir: FileSystemDirectoryHandle, prefix = "") {
  const files: KitFileWithBlob[] = [];
  const skipped: KitPlan["skipped"] = [];
  for await (const entry of (dir as IterableDir).values()) {
    const path = `${prefix}${entry.name}`;
    if (entry.kind === "directory") {
      const reason = skippedFolder(entry.name);
      if (reason) {
        skipped.push({ path: `${path}/`, reason: `${reason}, not opened` });
      } else {
        const sub = await walkKitFolder(entry, `${path}/`);
        files.push(...sub.files);
        skipped.push(...sub.skipped);
      }
    } else {
      const file = await (entry as FileSystemFileHandle).getFile();
      files.push({ path, size: file.size, readText: () => file.text(), file });
    }
  }
  return { files, skipped };
}

function AssetTile({ asset, onRemove, canEdit }: { asset: BrandAsset; onRemove: () => void; canEdit: boolean }) {
  const name = asset.path.split("/").pop();
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-muted/30">
      <a href={asset.url} target="_blank" rel="noreferrer" className="block aspect-video">
        {isImage(asset.path) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt={name} className="size-full object-contain p-2 [background:repeating-conic-gradient(#8881_0_25%,transparent_0_50%)_0_0/16px_16px]" loading="lazy" />
        ) : isVideo(asset.path) ? (
          <video src={asset.url} muted loop playsInline preload="metadata" className="size-full object-contain" onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">.{asset.path.split(".").pop()}</div>
        )}
      </a>
      <div className="truncate border-t px-2 py-1 text-[11px] text-muted-foreground" title={asset.path}>
        {asset.label || name}
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove from the kit"
          className="absolute right-1 top-1 rounded-md bg-background/90 p-1 opacity-0 shadow-sm transition group-hover:opacity-100"
        >
          <XIcon className="size-3" />
        </button>
      )}
    </div>
  );
}

export function BrandKitSheet({
  projectId,
  projectName,
  clientId,
  open,
  onOpenChange,
  onSaved,
}: {
  projectId: string;
  projectName: string;
  clientId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [kit, setKit] = React.useState<BrandKit | null>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [denied, setDenied] = React.useState<string | null>(null);
  const [plan, setPlan] = React.useState<(KitPlan & { files: KitFileWithBlob[] }) | null>(null);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [draft, setDraft] = React.useState<{ name: string; summary: string; colors: BrandColor[]; fonts: BrandFont[]; guide: string } | null>(null);
  const folderInput = React.useRef<HTMLInputElement>(null);
  const filesInput = React.useRef<HTMLInputElement>(null);

  const headers = React.useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (clientId) h["x-client-id"] = clientId;
    return h;
  }, [clientId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setDenied(null);
    try {
      const res = await fetch(`/api/project/brand-kit?projectId=${encodeURIComponent(projectId)}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        setDenied(data.error ?? "Could not load the brand kit");
        return;
      }
      setKit(data.brandKit);
      setRole(data.role);
    } finally {
      setLoading(false);
    }
  }, [projectId, headers]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const canEdit = role === "owner" || role === "editor";

  const save = async (patch: BrandKitPatch) => {
    const res = await fetch("/api/project/brand-kit", { method: "PUT", headers, body: JSON.stringify({ projectId, ...patch }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed");
    setKit(data.brandKit);
    onSaved?.();
    return data.brandKit as BrandKit;
  };

  const review = async (files: KitFileWithBlob[], skipped: KitPlan["skipped"] = []) => {
    const result = await planKitUpload(files);
    setPlan({ ...result, skipped: [...skipped, ...result.skipped], files: result.upload as KitFileWithBlob[] });
  };

  const choose = async (list: FileList | null) => {
    if (!list?.length) return;
    await review(kitFilesOf(list));
  };

  /** Chromium walks the folder itself and leaves graphics/ shut; other browsers get <input webkitdirectory>. */
  const pickFolder = async () => {
    const w = window as PickerWindow;
    if (typeof w.showDirectoryPicker !== "function") return folderInput.current?.click();
    let dir: FileSystemDirectoryHandle;
    try {
      dir = await w.showDirectoryPicker({ id: "mediamake-brand-kit", mode: "read" });
    } catch {
      return; // closed the picker
    }
    try {
      const { files, skipped } = await walkKitFolder(dir);
      await review(files, skipped);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const upload = async () => {
    if (!plan) return;
    const files = plan.files;
    setProgress({ done: 0, total: files.length });
    try {
      const assets: BrandAsset[] = [];
      for (let i = 0; i < files.length; i += 100) {
        const batch = files.slice(i, i + 100);
        const res = await fetch("/api/project/brand-kit/upload", {
          method: "POST",
          headers,
          body: JSON.stringify({ projectId, files: batch.map((f) => ({ path: f.path, contentType: f.file.type || mimeOf(f.path) })) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not start the upload");
        const byPath = new Map<string, { uploadUrl: string; url: string; kind: BrandAssetKind; contentType: string }>(
          data.uploads.map((u: { path: string }) => [u.path, u]),
        );
        await mapLimit(batch, 4, async (f) => {
          const target = byPath.get(f.path);
          if (!target) return;
          const put = await fetch(target.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": target.contentType, "x-amz-acl": "public-read" },
            body: f.file,
          });
          if (!put.ok) throw new Error(`${f.path}: upload failed (${put.status})`);
          assets.push({ path: f.path, kind: target.kind, url: target.url, mimeType: target.contentType, size: f.size });
          setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        });
      }
      await save({ ...plan.patch, assets });
      toast.success(`Brand kit saved: ${assets.length} file${assets.length === 1 ? "" : "s"}`);
      setPlan(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setProgress(null);
    }
  };

  const startEdit = () =>
    setDraft({
      name: kit?.name ?? projectName,
      summary: kit?.summary ?? "",
      colors: kit?.colors ?? [],
      fonts: kit?.fonts ?? [],
      guide: kit?.guide ?? "",
    });

  const saveDraft = async () => {
    if (!draft) return;
    try {
      await save({
        name: draft.name,
        summary: draft.summary,
        colors: draft.colors.filter((c) => c.hex),
        fonts: draft.fonts.filter((f) => f.family.trim()),
        guide: draft.guide,
      });
      setDraft(null);
      toast.success("Brand kit saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const removeAsset = async (path: string) => {
    try {
      await save({ removeAssets: [path] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const removeKit = async () => {
    if (!window.confirm(`Remove the brand kit from ${projectName}? Uploaded files stay in storage.`)) return;
    const res = await fetch(`/api/project/brand-kit?projectId=${encodeURIComponent(projectId)}`, { method: "DELETE", headers });
    if (res.ok) {
      setKit(null);
      onSaved?.();
    } else toast.error((await res.json()).error ?? "Could not remove the kit");
  };

  const groups = React.useMemo(() => {
    const out = new Map<BrandAssetKind, BrandAsset[]>();
    for (const kind of ASSET_KINDS) {
      const list = (kit?.assets ?? []).filter((a) => a.kind === kind);
      if (list.length) out.set(kind, list);
    }
    return out;
  }, [kit]);

  const logo = kit ? primaryLogo(kit) : undefined;
  const busy = !!progress;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logo ? <img src={logo} alt="" className="size-full object-contain p-1" /> : <PaletteIcon className="size-5 text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">{kit?.name || projectName}</SheetTitle>
              <SheetDescription>Brand kit for {projectName}: logos, colours, fonts, intros and end screens, shared by everything in this project.</SheetDescription>
            </div>
          </div>
          {kit && kit.colors.length > 0 && (
            <div className="mt-3 flex h-2 overflow-hidden rounded-full">
              {kit.colors.map((c) => (
                <div key={c.name} className="flex-1" style={{ background: c.hex }} title={`${c.name} ${c.hex}`} />
              ))}
            </div>
          )}
        </SheetHeader>

        <input ref={folderInput} type="file" className="hidden" multiple {...{ webkitdirectory: "", directory: "" }} onChange={(e) => void choose(e.target.files).finally(() => (e.target.value = ""))} />
        <input ref={filesInput} type="file" className="hidden" multiple onChange={(e) => void choose(e.target.files).finally(() => (e.target.value = ""))} />

        <div className="space-y-6 p-5">
          {loading && (
            <div className="grid gap-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          )}

          {!loading && denied && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{denied}</p>}

          {!loading && !denied && (
            <>
              {canEdit && !plan && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-4">
                  <div className="mr-auto min-w-0">
                    <p className="text-sm font-medium">{kit ? "Update the kit" : "Upload a brand kit"}</p>
                    <p className="text-xs text-muted-foreground">
                      Pick the folder <code className="rounded bg-muted px-1">pack-brand-kit</code> exported (<code className="rounded bg-muted px-1">brands/&lt;brand&gt;/</code>); its <code className="rounded bg-muted px-1">graphics/</code> source is left out. Files with the same path are replaced.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => void pickFolder()} className="gap-1.5">
                    <FolderUpIcon className="size-4" /> Folder
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => filesInput.current?.click()} className="gap-1.5">
                    <UploadIcon className="size-4" /> Files
                  </Button>
                </div>
              )}

              {plan && (
                <div className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      {plan.upload.length} file{plan.upload.length === 1 ? "" : "s"} to upload ·{" "}
                      {formatBytes(plan.upload.reduce((s, f) => s + f.size, 0))}
                    </p>
                    {plan.skipped.length > 0 && <span className="text-xs text-muted-foreground">{plan.skipped.length} skipped</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {plan.patch.name && <Badge variant="secondary">name: {plan.patch.name}</Badge>}
                    {plan.patch.guide !== undefined && <Badge variant="secondary">brand guide</Badge>}
                    {plan.patch.colors !== undefined && <Badge variant="secondary">colours</Badge>}
                    {plan.patch.fonts !== undefined && <Badge variant="secondary">fonts</Badge>}
                    {plan.patch.thumbnailProfile !== undefined && <Badge variant="secondary">thumbnail profile</Badge>}
                    {plan.patch.channelDescription !== undefined && <Badge variant="secondary">channel description</Badge>}
                  </div>
                  {plan.skipped.length > 0 && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Skipped files</summary>
                      <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
                        {plan.skipped.map((s) => (
                          <li key={s.path} className="truncate">
                            {s.path} · {s.reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {progress && <Progress value={(progress.done / Math.max(1, progress.total)) * 100} />}
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setPlan(null)} disabled={busy}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => void upload()} disabled={busy} className="gap-1.5">
                      {busy ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
                      {busy ? `Uploading ${progress!.done}/${progress!.total}` : "Upload and save"}
                    </Button>
                  </div>
                </div>
              )}

              {!kit && !canEdit && <p className="text-sm text-muted-foreground">This project has no brand kit yet.</p>}

              {kit && !draft && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Identity</h3>
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={startEdit}>
                        Edit
                      </Button>
                    )}
                  </div>
                  {kit.summary && <p className="text-sm text-muted-foreground">{kit.summary}</p>}
                  {kit.colors.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {kit.colors.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => void navigator.clipboard.writeText(c.hex).then(() => toast.success(`Copied ${c.hex}`))}
                          className="overflow-hidden rounded-lg border text-left"
                        >
                          <div className="h-10" style={{ background: c.hex }} />
                          <div className="px-2 py-1">
                            <div className="truncate text-xs font-medium">{c.name}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {c.hex}
                              {c.role ? ` · ${c.role}` : ""}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {kit.fonts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {kit.fonts.map((f) => (
                        <Badge key={f.family} variant="outline" className="gap-1 font-normal">
                          {f.family}
                          {f.role && <span className="text-muted-foreground">· {f.role}</span>}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {!kit.colors.length && !kit.fonts.length && <p className="text-xs text-muted-foreground">No colours or fonts yet.</p>}
                </section>
              )}

              {draft && (
                <section className="space-y-3 rounded-xl border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-medium">
                      Name
                      <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    </label>
                    <label className="space-y-1 text-xs font-medium">
                      One line
                      <Input value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="Telugu devotional music channel" />
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium">Colours</p>
                    {draft.colors.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={c.hex.length === 7 ? c.hex : "#000000"}
                          onChange={(e) => setDraft({ ...draft, colors: draft.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)) })}
                          className="h-8 w-10 cursor-pointer rounded border bg-transparent"
                        />
                        <Input value={c.name} onChange={(e) => setDraft({ ...draft, colors: draft.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className="h-8" placeholder="name" />
                        <Input value={c.role ?? ""} onChange={(e) => setDraft({ ...draft, colors: draft.colors.map((x, j) => (j === i ? { ...x, role: e.target.value || undefined } : x)) })} className="h-8 w-32" placeholder="role" />
                        <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={() => setDraft({ ...draft, colors: draft.colors.filter((_, j) => j !== i) })}>
                          <XIcon className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => setDraft({ ...draft, colors: [...draft.colors, { name: `color-${draft.colors.length + 1}`, hex: "#888888" }] })}>
                      <PlusIcon className="size-3.5" /> Colour
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium">Fonts</p>
                    {draft.fonts.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input value={f.family} onChange={(e) => setDraft({ ...draft, fonts: draft.fonts.map((x, j) => (j === i ? { ...x, family: e.target.value } : x)) })} className="h-8" placeholder="family" />
                        <Input value={f.role ?? ""} onChange={(e) => setDraft({ ...draft, fonts: draft.fonts.map((x, j) => (j === i ? { ...x, role: e.target.value || undefined } : x)) })} className="h-8 w-32" placeholder="display, body…" />
                        <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={() => setDraft({ ...draft, fonts: draft.fonts.filter((_, j) => j !== i) })}>
                          <XIcon className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => setDraft({ ...draft, fonts: [...draft.fonts, { family: "" }] })}>
                      <PlusIcon className="size-3.5" /> Font
                    </Button>
                  </div>
                  <label className="block space-y-1 text-xs font-medium">
                    Brand guide (markdown)
                    <Textarea value={draft.guide} onChange={(e) => setDraft({ ...draft, guide: e.target.value })} rows={6} className="font-mono text-xs" />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => void saveDraft()}>
                      Save
                    </Button>
                  </div>
                </section>
              )}

              {[...groups].map(([kind, list]) => (
                <section key={kind} className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    {KIND_LABEL[kind]} <span className="font-normal text-muted-foreground">{list.length}</span>
                  </h3>
                  <div className={cn("grid gap-2", kind === "font" || kind === "sound" || kind === "guide" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}>
                    {list.map((a) => (
                      <AssetTile key={a.path} asset={a} canEdit={canEdit} onRemove={() => void removeAsset(a.path)} />
                    ))}
                  </div>
                </section>
              ))}

              {kit?.guide && !draft && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Brand guide</h3>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs">{kit.guide}</pre>
                </section>
              )}

              {kit && canEdit && (
                <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
                  <span>Updated {new Date(kit.updatedAt).toLocaleString()}</span>
                  <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => void removeKit()}>
                    <Trash2Icon className="size-3.5" /> Remove kit
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
