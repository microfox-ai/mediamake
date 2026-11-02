"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  BookmarkPlusIcon,
  CircleHelpIcon,
  ClipboardCopyIcon,
  ExternalLinkIcon,
  LibraryIcon,
  Loader2Icon,
  MusicIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  Search as SearchIcon,
  StarIcon,
  ThumbsDownIcon,
  Trash2Icon,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  SETTING_LABELS,
  copyForClaude,
  formatDuration,
  formatSettings,
  type Generation,
  type GenerationPreset,
  type GenerationRating,
  type GenerationSettings,
} from "@/lib/generations";
import { cn } from "@/lib/utils";

const RATINGS: { value: GenerationRating; label: string; icon: typeof StarIcon; active: string }[] = [
  { value: "keeper", label: "Keeper", icon: StarIcon, active: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600/90 hover:text-white" },
  { value: "maybe", label: "Maybe", icon: CircleHelpIcon, active: "border-amber-500 bg-amber-500 text-white hover:bg-amber-500/90 hover:text-white" },
  { value: "reject", label: "Reject", icon: ThumbsDownIcon, active: "border-destructive bg-destructive text-white hover:bg-destructive/90 hover:text-white" },
];

/** The preset form's settings, as typed. */
const PRESET_FIELDS: { key: string; type: "number" | "text" | "gender" }[] = [
  { key: "weirdness", type: "number" },
  { key: "styleInfluence", type: "number" },
  { key: "audioInfluence", type: "number" },
  { key: "variety", type: "number" },
  { key: "vocalGender", type: "gender" },
  { key: "voice", type: "text" },
  { key: "duration", type: "text" },
];

interface PresetDraft {
  id?: string;
  name: string;
  styles: string;
  excludeStyles: string;
  settings: Record<string, string>;
}

const settingLabel = (key: string) => {
  const name = SETTING_LABELS[key] ?? key;
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const draftSettings = (settings: GenerationSettings) =>
  Object.fromEntries(Object.entries(settings).flatMap(([k, v]) => (v === undefined ? [] : [[k, String(v)]])));

/** Back from the form's strings: numbers and true/false as they were. */
const toSettings = (settings: Record<string, string>): GenerationSettings =>
  Object.fromEntries(
    Object.entries(settings)
      .map(([k, v]) => [k, v.trim()] as const)
      .filter(([, v]) => v)
      .map(([k, v]) => [k, /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v === "true" ? true : v === "false" ? false : v]),
  );

function TakeCard({
  take,
  parent,
  projectName,
  clientId,
  canEdit,
  playing,
  onPlay,
  onEnded,
  onRate,
  onNote,
  onSavePreset,
}: {
  take: Generation;
  parent?: Generation;
  projectName: string;
  clientId?: string;
  canEdit: boolean;
  playing: boolean;
  onPlay: () => void;
  onEnded: () => void;
  onRate: (rating: GenerationRating | null) => void;
  onNote: (text: string) => Promise<void>;
  onSavePreset: () => void;
}) {
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const settings = formatSettings(take.settings);
  const duration = formatDuration(take.duration);

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await onNote(note.trim());
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const copy = () =>
    void navigator.clipboard
      .writeText(copyForClaude(take, projectName))
      .then(() => toast.success("Copied for Claude"))
      .catch(() => toast.error("Could not copy"));

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPlay}
          disabled={!take.audioUrl}
          title={!take.audioUrl ? "No audio yet" : playing ? "Stop" : "Play"}
          className="group relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted/40 disabled:cursor-not-allowed"
        >
          {take.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={take.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <MusicIcon className="m-auto size-5 text-muted-foreground" />
          )}
          {take.audioUrl && (
            <span className={cn("absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity", playing ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
              {playing ? <PauseIcon className="size-5 fill-current" /> : <PlayIcon className="size-5 fill-current" />}
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-medium">{take.title || "Untitled"}</span>
            {take.kind !== "create" && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{take.kind}</Badge>}
            {take.model && <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">{take.model}</Badge>}
            {take.instrumental && <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">instrumental</Badge>}
            {take.status !== "complete" && (
              <Badge variant={take.status === "failed" ? "destructive" : "secondary"} className="gap-1 px-1.5 py-0 text-[10px]">
                {take.status === "generating" && <Loader2Icon className="size-2.5 animate-spin" />}
                {take.status}
              </Badge>
            )}
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
              {duration && `${duration} · `}
              {new Date(take.createdAt).toLocaleDateString()}
            </span>
          </div>
          {take.styles && (
            <p className="line-clamp-2 text-xs" title={take.styles}>
              {take.styles}
            </p>
          )}
          {take.excludeStyles && <p className="line-clamp-1 text-xs text-muted-foreground">Exclude: {take.excludeStyles}</p>}
          {settings && <p className="text-[11px] text-muted-foreground">{settings}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            {take.url && (
              <a href={take.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <ExternalLinkIcon className="size-3" /> Open on Suno
              </a>
            )}
            {take.parentUrl && (
              <a href={take.parentUrl} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 text-muted-foreground hover:text-foreground">
                <ExternalLinkIcon className="size-3 shrink-0" />
                <span className="truncate">From {parent?.title || take.parentRef?.slice(0, 8)}</span>
              </a>
            )}
            {take.libraryItem && (
              <span className="inline-flex items-center gap-1 text-muted-foreground" title={take.libraryItem}>
                <LibraryIcon className="size-3" /> in the library
              </span>
            )}
            {take.usedIn.map((slug) => (
              <span key={slug} className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
                {slug}
              </span>
            ))}
          </div>
        </div>
      </div>

      {playing && take.audioUrl && <audio src={take.audioUrl} controls autoPlay onEnded={onEnded} className="h-8 w-full" />}

      <div className="flex flex-wrap items-center gap-1.5">
        {RATINGS.map(({ value, label, icon: Icon, active }) => (
          <Button
            key={value}
            size="sm"
            variant="outline"
            disabled={!canEdit}
            onClick={() => onRate(take.rating === value ? null : value)}
            className={cn("h-7 gap-1 px-2 text-xs", take.rating === value && active)}
          >
            <Icon className="size-3.5" /> {label}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {canEdit && (take.styles || take.excludeStyles) && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={onSavePreset} title="Save these styles and settings as a preset">
              <BookmarkPlusIcon className="size-3.5" /> Preset
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={copy}>
            <ClipboardCopyIcon className="size-3.5" /> Copy for Claude
          </Button>
        </div>
      </div>

      {!take.instrumental && take.lyrics && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Lyrics</summary>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-2 font-sans">{take.lyrics}</pre>
        </details>
      )}

      {(take.notes.length > 0 || canEdit) && (
        <div className="space-y-1.5">
          {take.notes.map((n, i) => (
            <p key={i} className="text-xs">
              {n.text}{" "}
              <span className="text-muted-foreground">
                · {n.by === clientId ? "you" : n.by}, {new Date(n.at).toLocaleString()}
              </span>
            </p>
          ))}
          {canEdit && (
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                void addNote();
              }}
            >
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="h-7 text-xs" />
              <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={saving || !note.trim()}>
                {saving ? <Loader2Icon className="size-3.5 animate-spin" /> : "Add"}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export function GenerationsSheet({
  projectId,
  projectName,
  clientId,
  open,
  onOpenChange,
}: {
  projectId: string;
  projectName: string;
  clientId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = React.useState<"takes" | "presets">("takes");
  const [items, setItems] = React.useState<Generation[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [denied, setDenied] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [q, setQ] = React.useState("");
  const [rating, setRating] = React.useState("all");
  const [model, setModel] = React.useState("all");
  const [models, setModels] = React.useState<string[]>([]);
  const [playing, setPlaying] = React.useState<string | null>(null);
  const [presets, setPresets] = React.useState<GenerationPreset[] | null>(null);
  const [draft, setDraft] = React.useState<PresetDraft | null>(null);
  const [savingPreset, setSavingPreset] = React.useState(false);
  // Only the latest request may fill the list, so a slow one can't undo a newer filter.
  const latest = React.useRef(0);

  const headers = React.useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (clientId) h["x-client-id"] = clientId;
    return h;
  }, [clientId]);

  React.useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = React.useMemo(() => {
    const params = new URLSearchParams({ projectId });
    if (q) params.set("q", q);
    if (rating !== "all") params.set("rating", rating);
    if (model !== "all") params.set("model", model);
    return params.toString();
  }, [projectId, q, rating, model]);

  const load = React.useCallback(
    async (cursor?: string) => {
      const request = ++latest.current;
      if (cursor) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await fetch(`/api/generations?${filters}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { headers });
        const data = await res.json();
        if (request !== latest.current) return;
        if (!res.ok) {
          setDenied(data.error ?? "Could not load the takes");
          return;
        }
        setDenied(null);
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor);
        setRole(data.role);
        setModels((prev) => [...new Set([...prev, ...data.items.map((g: Generation) => g.model).filter(Boolean)])].sort());
      } catch (error) {
        if (request === latest.current) toast.error(error instanceof Error ? error.message : String(error));
      } finally {
        if (request === latest.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [filters, headers],
  );

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const loadPresets = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/generations/presets?projectId=${encodeURIComponent(projectId)}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load the presets");
      setPresets(data.presets);
    } catch (error) {
      setPresets([]);
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }, [projectId, headers]);

  React.useEffect(() => {
    if (open && tab === "presets" && presets === null) void loadPresets();
  }, [open, tab, presets, loadPresets]);

  const canEdit = role === "owner" || role === "editor";
  const byRef = React.useMemo(() => new Map(items.map((g) => [g.ref, g])), [items]);

  const patch = async (take: Generation, body: Record<string, unknown>) => {
    const res = await fetch(`/api/generations/${take.id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed");
    setItems((prev) => prev.map((g) => (g.id === data.id ? data : g)));
  };

  const rate = (take: Generation, next: GenerationRating | null) => {
    setItems((prev) => prev.map((g) => (g.id === take.id ? { ...g, rating: next } : g)));
    patch(take, { rating: next }).catch((error) => {
      setItems((prev) => prev.map((g) => (g.id === take.id ? { ...g, rating: take.rating } : g)));
      toast.error(error instanceof Error ? error.message : String(error));
    });
  };

  const savePreset = async () => {
    if (!draft?.name.trim()) return;
    // Saving without an id replaces the preset with that name.
    const sameName = !draft.id && presets?.find((p) => p.tool === "suno" && p.name === draft.name.trim());
    if (sameName && !window.confirm(`Replace the preset ${sameName.name}?`)) return;
    setSavingPreset(true);
    try {
      const res = await fetch(`/api/generations/presets?projectId=${encodeURIComponent(projectId)}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ id: draft.id, name: draft.name, styles: draft.styles, excludeStyles: draft.excludeStyles, settings: toSettings(draft.settings) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the preset");
      setPresets(data.presets);
      setDraft(null);
      toast.success("Preset saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingPreset(false);
    }
  };

  const removePreset = async (preset: GenerationPreset) => {
    if (!window.confirm(`Delete the preset ${preset.name}?`)) return;
    const res = await fetch(`/api/generations/presets?projectId=${encodeURIComponent(projectId)}&id=${preset.id}`, { method: "DELETE", headers });
    const data = await res.json();
    if (res.ok) setPresets(data.presets);
    else toast.error(data.error ?? "Could not delete the preset");
  };

  const presetFromTake = (take: Generation) => {
    setDraft({ name: take.title || "New preset", styles: take.styles, excludeStyles: take.excludeStyles, settings: draftSettings(take.settings) });
    setTab("presets");
  };

  const filtered = !!q || rating !== "all" || model !== "all";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
              <MusicIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">Generations</SheetTitle>
              <SheetDescription>
                Every song take made for {projectName}: play, rate and note them, keep styles as presets, or copy one for Claude to make more.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "takes" | "presets")} className="gap-4 p-5">
          <TabsList>
            <TabsTrigger value="takes">Takes</TabsTrigger>
            <TabsTrigger value="presets">Presets</TabsTrigger>
          </TabsList>

          <TabsContent value="takes" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1">
                <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title, styles, lyrics or a Suno link…" className="h-8 pl-9 text-sm" />
              </div>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger className="h-8 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ratings</SelectItem>
                  <SelectItem value="keeper">Keepers</SelectItem>
                  <SelectItem value="maybe">Maybes</SelectItem>
                  <SelectItem value="reject">Rejects</SelectItem>
                  <SelectItem value="unrated">Unrated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-8 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All models</SelectItem>
                  {models.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading && (
              <div className="grid gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            )}

            {!loading && denied && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{denied}</p>}

            {!loading && !denied && items.length === 0 && (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {filtered
                  ? "No takes match these filters."
                  : "No takes yet. Browse Hack saves every Suno take made for this channel here, and Claude can list them with the MediaMake MCP's list_generations."}
              </p>
            )}

            {!loading &&
              !denied &&
              items.map((take) => (
                <TakeCard
                  key={take.id}
                  take={take}
                  parent={take.parentRef ? byRef.get(take.parentRef) : undefined}
                  projectName={projectName}
                  clientId={clientId}
                  canEdit={canEdit}
                  playing={playing === take.id}
                  onPlay={() => setPlaying(playing === take.id ? null : take.id)}
                  onEnded={() => setPlaying(null)}
                  onRate={(next) => rate(take, next)}
                  onNote={(text) => patch(take, { note: text })}
                  onSavePreset={() => presetFromTake(take)}
                />
              ))}

            {!loading && !denied && nextCursor && (
              <div className="flex justify-center">
                <Button size="sm" variant="ghost" onClick={() => void load(nextCursor)} disabled={loadingMore} className="gap-1.5">
                  {loadingMore && <Loader2Icon className="size-4 animate-spin" />}
                  Load more
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="presets" className="space-y-3">
            {!denied && canEdit && !draft && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-4">
                <p className="mr-auto min-w-0 text-xs text-muted-foreground">
                  Styles, exclude styles and settings the channel reuses. Save one here, or from a take with <span className="font-medium">Preset</span>.
                </p>
                <Button size="sm" className="gap-1.5" onClick={() => setDraft({ name: "", styles: "", excludeStyles: "", settings: {} })}>
                  <PlusIcon className="size-4" /> New preset
                </Button>
              </div>
            )}

            {draft && (
              <section className="space-y-3 rounded-xl border p-4">
                <label className="block space-y-1 text-xs font-medium">
                  Name
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Dark lofi rain" />
                </label>
                <label className="block space-y-1 text-xs font-medium">
                  Styles
                  <Textarea value={draft.styles} onChange={(e) => setDraft({ ...draft, styles: e.target.value })} rows={3} placeholder="lofi, rain, soft piano, female vocals" />
                </label>
                <label className="block space-y-1 text-xs font-medium">
                  Exclude styles
                  <Input value={draft.excludeStyles} onChange={(e) => setDraft({ ...draft, excludeStyles: e.target.value })} placeholder="drums, autotune" />
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PRESET_FIELDS.map(({ key, type }) => {
                    const value = draft.settings[key] ?? "";
                    const set = (v: string) => setDraft({ ...draft, settings: { ...draft.settings, [key]: v } });
                    return (
                      <label key={key} className="space-y-1 text-xs font-medium">
                        {settingLabel(key)}
                        {type === "gender" ? (
                          <Select value={value || "any"} onValueChange={(v) => set(v === "any" ? "" : v)}>
                            <SelectTrigger className="h-8 w-full text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="male">Male</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={value}
                            onChange={(e) => set(e.target.value)}
                            type={type === "number" ? "number" : "text"}
                            min={type === "number" ? 0 : undefined}
                            max={type === "number" ? 100 : undefined}
                            className="h-8"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setDraft(null)} disabled={savingPreset}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => void savePreset()} disabled={savingPreset || !draft.name.trim()} className="gap-1.5">
                    {savingPreset && <Loader2Icon className="size-4 animate-spin" />}
                    Save preset
                  </Button>
                </div>
              </section>
            )}

            {presets === null && !denied && <Skeleton className="h-24 rounded-xl" />}
            {denied && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{denied}</p>}
            {presets?.length === 0 && !draft && <p className="text-sm text-muted-foreground">No presets yet.</p>}

            {presets?.map((preset) => {
              const settings = formatSettings(preset.settings);
              return (
                <div key={preset.id} className="space-y-1.5 rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{preset.name}</span>
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                      {preset.tool}
                    </Badge>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        title="Copy styles"
                        onClick={() => void navigator.clipboard.writeText(preset.styles).then(() => toast.success("Styles copied"))}
                      >
                        <ClipboardCopyIcon className="size-3.5" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            title="Edit"
                            onClick={() => setDraft({ id: preset.id, name: preset.name, styles: preset.styles, excludeStyles: preset.excludeStyles, settings: draftSettings(preset.settings) })}
                          >
                            <PencilIcon className="size-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" title="Delete" onClick={() => void removePreset(preset)}>
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {preset.styles && <p className="text-xs">{preset.styles}</p>}
                  {preset.excludeStyles && <p className="text-xs text-muted-foreground">Exclude: {preset.excludeStyles}</p>}
                  {settings && <p className="text-[11px] text-muted-foreground">{settings}</p>}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
