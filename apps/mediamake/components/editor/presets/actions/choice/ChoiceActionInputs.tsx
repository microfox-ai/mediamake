"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, Loader2, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { useTimelineEditsStore } from "@/components/editor_main/stores/timeline-edits-store";
import { uploadBlobToS3 } from "@/lib/video-thumbnail-upload";
import { cn } from "@/lib/utils";
import type { ChoiceActionInfo, TimelineAction } from "../types";
import { getTargetData } from "../engine/action-lifecycle";
import {
  SAVED_CHOICE_PREFIX,
  fieldsPresentForChoice,
  savedChoiceKey,
  type SavedChoiceSnapshot,
} from "../registry/choice-action";
import { useSavedChoicesStore, type SavedActionChoice } from "./saved-choices-store";
import { capturePlayerThumbnail } from "./capture-player-thumbnail";

const EMPTY_CHOICES: SavedActionChoice[] = [];
const GRID_COLS = [2, 3, 4, 5, 6] as const;
type GridCols = (typeof GRID_COLS)[number];
const GRID_STORAGE_KEY = "choice-action-grid-cols";
const GRID_CLASS: Record<GridCols, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

function readGridCols(): GridCols {
  if (typeof window === "undefined") return 4;
  const stored = Number(window.localStorage.getItem(GRID_STORAGE_KEY));
  return GRID_COLS.includes(stored as GridCols) ? (stored as GridCols) : 4;
}

/** Choice picker, impact slider and "add current as choice" for any choice action. */
export function ChoiceActionInputs({
  timeline,
  action,
  choice,
  value,
  onChange,
}: {
  timeline: Timeline;
  action: TimelineAction;
  choice: ChoiceActionInfo;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const savedChoices = useSavedChoicesStore(
    (s) => s.byActionId[action.actionId] ?? EMPTY_CHOICES,
  );
  const loading = useSavedChoicesStore((s) => s.loading[action.actionId]);
  const loadError = useSavedChoicesStore((s) => s.errors[action.actionId]);
  const load = useSavedChoicesStore((s) => s.load);
  const removeChoice = useSavedChoicesStore((s) => s.remove);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gridCols, setGridCols] = useState<GridCols>(readGridCols);

  const handleGridCols = (cols: GridCols) => {
    setGridCols(cols);
    window.localStorage.setItem(GRID_STORAGE_KEY, String(cols));
  };

  useEffect(() => {
    void load(action.actionId);
  }, [action.actionId, load]);

  const selected =
    typeof value.choice === "string" ? value.choice : choice.builtInChoices[0]?.id;
  const impact = typeof value.impact === "number" ? value.impact : choice.defaultImpact;
  const savedSelected = Boolean(selected?.startsWith(SAVED_CHOICE_PREFIX));

  const selectBuiltIn = (id: string) => {
    const { savedChoice: _drop, ...rest } = value;
    onChange({ ...rest, choice: id });
  };

  const selectSaved = (saved: SavedActionChoice) => {
    const snapshot: SavedChoiceSnapshot = {
      id: saved.id,
      name: saved.name,
      values: saved.values,
    };
    onChange({ ...value, choice: savedChoiceKey(saved.id), savedChoice: snapshot });
  };

  const handleDelete = async (saved: SavedActionChoice) => {
    if (!window.confirm(`Delete saved choice "${saved.name}"?`)) return;
    try {
      await removeChoice(action.actionId, saved.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete choice");
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Choice</Label>
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <div className="flex flex-1 justify-center">
            <div className="inline-flex h-6 items-center rounded-md bg-muted p-0.5">
              {GRID_COLS.map((cols) => (
                <button
                  key={cols}
                  type="button"
                  title={`${cols} columns`}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground",
                    gridCols === cols && "bg-background text-foreground shadow-sm",
                  )}
                  onClick={() => handleGridCols(cols)}
                >
                  <GridColsIcon cols={cols} />
                </button>
              ))}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-3 w-3" />
            Add current as choice
          </Button>
        </div>
        <div className={cn("grid gap-1.5", GRID_CLASS[gridCols])}>
          {choice.builtInChoices.map((builtIn) => (
            <ChoiceCard
              key={builtIn.id}
              name={builtIn.label}
              selected={selected === builtIn.id}
              onSelect={() => selectBuiltIn(builtIn.id)}
            />
          ))}
          {savedChoices.map((saved) => (
            <ChoiceCard
              key={saved.id}
              name={saved.name}
              description={saved.description}
              thumbnailUrl={saved.thumbnailUrl}
              saved
              selected={selected === savedChoiceKey(saved.id)}
              onSelect={() => selectSaved(saved)}
              onDelete={() => void handleDelete(saved)}
            />
          ))}
        </div>
        {loadError && (
          <p className="text-[10px] text-destructive">
            {loadError}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void load(action.actionId, { force: true })}
            >
              Retry
            </button>
          </p>
        )}
      </div>

      {choice.builtInChoices.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Impact</Label>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {impact.toFixed(2)}
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[impact]}
            disabled={savedSelected}
            onValueChange={([next]) => onChange({ ...value, impact: next })}
          />
          {savedSelected && (
            <p className="text-[10px] text-muted-foreground">
              Saved choices apply their exact values, so impact is ignored.
            </p>
          )}
        </div>
      )}

      {choice.builtInChoices.length === 0 && savedChoices.length === 0 && !loading && (
        <p className="text-[10px] text-muted-foreground">
          No saved styles yet. Add the current look as a choice.
        </p>
      )}

      <SaveChoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        timeline={timeline}
        action={action}
        fieldKeys={choice.fieldKeys}
        openFields={choice.openFields}
        onSaved={selectSaved}
      />
    </div>
  );
}

function GridColsIcon({ cols }: { cols: GridCols }) {
  const size = cols * 3 + (cols - 1);
  return (
    <svg viewBox={`0 0 ${size} 11`} className="h-3 w-auto" aria-hidden>
      {Array.from({ length: cols }).map((_, i) => (
        <rect key={i} x={i * 4} y={0} width={3} height={11} rx={0.5} fill="currentColor" />
      ))}
    </svg>
  );
}

function ChoiceCard({
  name,
  description,
  thumbnailUrl,
  saved = false,
  selected,
  onSelect,
  onDelete,
}: {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  saved?: boolean;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      title={description || name}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative min-w-0 cursor-pointer overflow-hidden rounded-md border text-left transition-colors hover:border-primary/60",
        selected && "border-primary ring-1 ring-primary",
      )}
    >
      <div className="flex aspect-video items-center justify-center bg-muted">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : saved ? (
          <ImageOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="px-1.5 py-1">
        <p className="truncate text-[11px] font-medium">{name}</p>
        {description && (
          <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {onDelete && (
        <button
          type="button"
          title="Delete saved choice"
          className="absolute right-1 top-1 rounded-sm bg-background/80 p-0.5 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </button>
      )}
    </div>
  );
}

function previewFieldValue(value: unknown): string {
  if (value == null || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return value.length > 42 ? `${value.slice(0, 42)}…` : value;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  try {
    const json = JSON.stringify(value);
    return json.length > 42 ? `${json.slice(0, 42)}…` : json;
  } catch {
    return "object";
  }
}

function SaveChoiceDialog({
  open,
  onOpenChange,
  timeline,
  action,
  fieldKeys,
  openFields,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeline: Timeline;
  action: TimelineAction;
  fieldKeys: string[];
  openFields?: boolean;
  onSaved: (choice: SavedActionChoice) => void;
}) {
  const createChoice = useSavedChoicesStore((s) => s.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [thumbnail, setThumbnail] = useState<Blob | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const previewUrl = useMemo(
    () => (thumbnail ? URL.createObjectURL(thumbnail) : null),
    [thumbnail],
  );
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const capture = async () => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setCapturing(true);
    setCaptureError(null);
    try {
      const blob = await capturePlayerThumbnail();
      if (abort.signal.aborted) return;
      setThumbnail(blob);
      if (!blob) {
        setCaptureError("Could not read the player. Make sure the timeline preview is visible.");
      }
    } catch (err) {
      if (abort.signal.aborted) return;
      setThumbnail(null);
      setCaptureError(err instanceof Error ? err.message : "Could not capture the frame");
    } finally {
      if (!abort.signal.aborted) setCapturing(false);
    }
  };

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      return;
    }
    const latest = useTimelineEditsStore.getState().getEditedTimeline(timeline.id) || timeline;
    setValues(
      fieldsPresentForChoice(getTargetData(latest, action.target), { fieldKeys, openFields }),
    );
    setName("");
    setDescription("");
    setThumbnail(null);
    setSaveError(null);
    void capture();
    // Snapshot once per open; later edits are not picked up mid-dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const capturedKeys = Object.keys(values);
  const canSave = name.trim().length > 0 && capturedKeys.length > 0 && !saving;

  const removeField = (key: string) => {
    setValues((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "choice";
      const thumbnailUrl = thumbnail
        ? await uploadBlobToS3(thumbnail, `choice-${slug}.jpg`, "image/jpeg")
        : null;
      const saved = await createChoice({
        actionId: action.actionId,
        name: name.trim(),
        description: description.trim() || undefined,
        thumbnailUrl: thumbnailUrl ?? undefined,
        values,
      });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save choice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add current as choice</DialogTitle>
          <DialogDescription>
            {openFields
              ? `Starts with the ${capturedKeys.length} field${capturedKeys.length === 1 ? "" : "s"} set on this block right now. Remove any this style should leave alone.`
              : `Starts with the ${capturedKeys.length} field${capturedKeys.length === 1 ? "" : "s"} this action fills that are set now. Remove any this choice should leave alone.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md border bg-muted">
            {previewUrl ? (
              <img src={previewUrl} alt="Current frame" className="h-full w-full object-cover" />
            ) : capturing ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="px-4 text-center text-xs text-muted-foreground">
                {captureError ?? "No thumbnail"}
              </p>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute bottom-1.5 right-1.5 h-6 gap-1 px-2 text-[10px]"
              disabled={capturing}
              onClick={() => void capture()}
            >
              <RefreshCw className={cn("h-3 w-3", capturing && "animate-spin")} />
              Current frame
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="choice-name" className="text-xs">
              Name
            </Label>
            <Input
              id="choice-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Soft double wave"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="choice-description" className="text-xs">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="choice-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>

          {capturedKeys.length === 0 ? (
            <p className="text-xs text-destructive">
              {openFields
                ? "Nothing is set on this block yet. Edit it, then save a style."
                : "None of this action's fields are set on the target yet. Run the action or set them first."}
            </p>
          ) : (
            <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
              {capturedKeys.map((key) => (
                <li key={key} className="flex items-center gap-2 px-2 py-1">
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium" title={key}>
                    {key}
                  </span>
                  <span
                    className="max-w-[40%] shrink-0 truncate text-[10px] text-muted-foreground"
                    title={previewFieldValue(values[key])}
                  >
                    {previewFieldValue(values[key])}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 shrink-0 p-0"
                    title={`Leave ${key} out`}
                    onClick={() => removeField(key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {saveError && <p className="text-xs text-destructive">{saveError}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSave} onClick={() => void handleSave()}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save choice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
