"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Film,
  Image as ImageIcon,
  Music,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MediaPicker } from "@/components/editor/media/media-picker";
import { MediaFile } from "@/app/types/media";
import { paramMetaTypes, paramInputTypes } from "../../dataTypes";
import {
  detectMediaKind,
  mediaItemSchema,
  toMediaItem,
  type MediaKind,
} from "../../dataTypes/media";
import { ColorInput } from "./color-input";
import { z } from "zod";

const JSON_SCHEMA_STANDARD_KEYS = new Set([
  "type",
  "title",
  "description",
  "enum",
  "default",
  "properties",
  "items",
  "required",
  "anyOf",
  "allOf",
  "oneOf",
  "$ref",
  "const",
  "pattern",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "uniqueItems",
  "format",
  "examples",
  "additionalProperties",
  "$schema",
  "definitions",
  "$defs",
  "not",
  "if",
  "then",
  "else",
]);

function extractZodMeta(field: Record<string, any>): Record<string, any> | undefined {
  const meta: Record<string, any> = {};
  for (const [k, v] of Object.entries(field)) {
    if (!JSON_SCHEMA_STANDARD_KEYS.has(k)) meta[k] = v;
  }
  return Object.keys(meta).length > 0 ? meta : undefined;
}

type ItemPropSchema = {
  key: string;
  type?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  description?: string;
  meta?: Record<string, any>;
};

function getItemPropSchemas(itemSchema: any): ItemPropSchema[] {
  if (!itemSchema?.properties) return [];
  return Object.entries(itemSchema.properties).map(([key, field]: [string, any]) => ({
    key,
    type: field.type,
    enum: field.enum,
    minimum: typeof field.minimum === "number" ? field.minimum : undefined,
    maximum: typeof field.maximum === "number" ? field.maximum : undefined,
    description: field.description,
    meta: extractZodMeta(field),
  }));
}

function isGroupEditable(prop: ItemPropSchema): boolean {
  return prop.meta?.[paramMetaTypes.groupEditable] === true;
}

function isColorProp(prop: ItemPropSchema): boolean {
  return prop.meta?.[paramMetaTypes.inputType] === paramInputTypes.color;
}

function isRangeProp(prop: ItemPropSchema): boolean {
  return prop.meta?.[paramMetaTypes.rangeField] === true;
}

function extractSrc(item: any): string {
  if (!item) return "";
  if (typeof item === "string") return item;
  return (
    item.src ||
    item.filePath ||
    item.url ||
    item.metadata?.src ||
    ""
  );
}

/** Props shown in the per-item popup for each media kind. */
const KIND_POPUP_KEYS: Record<MediaKind, string[]> = {
  image: [
    "type",
    "fit",
    "filter",
    "blendMode",
    "opacity",
    "colorTint",
    "rangeString",
  ],
  video: [
    "type",
    "fit",
    "opacity",
    "volume",
    "muted",
    "playbackRate",
    "startFrom",
    "rangeString",
  ],
  audio: [
    "type",
    "volume",
    "muted",
    "playbackRate",
    "startFrom",
    "rangeString",
  ],
};

const defaultItemJsonSchema = (() => {
  try {
    return z.toJSONSchema(mediaItemSchema) as any;
  } catch {
    return { type: "object", properties: {} };
  }
})();

/**
 * Gallery editor for medias references (image / video / audio).
 * Same interaction model as ImagesGroupField, without mediaRef linking.
 */
export function MediasGroupField({
  value,
  onChange,
  itemSchema,
  singular = false,
}: {
  value: any;
  onChange: (next: any[]) => void;
  itemSchema?: any;
  /** When true, at most one media item (for `media` reference type). */
  singular?: boolean;
}) {
  const items: any[] = Array.isArray(value) ? value : [];
  const resolvedItemSchema = itemSchema || defaultItemJsonSchema;
  const props = useMemo(
    () => getItemPropSchemas(resolvedItemSchema),
    [resolvedItemSchema],
  );
  const groupProps = props.filter(
    (p) => p.key !== "src" && isGroupEditable(p) && !isRangeProp(p),
  );

  const [tab, setTab] = useState<"medias" | "form">("medias");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [groupDraft, setGroupDraft] = useState<Record<string, any>>({});
  const [groupOpen, setGroupOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4 | 5>(3);
  const [adding, setAdding] = useState(false);

  const updateItem = (index: number, patch: Record<string, any>) => {
    const next = items.map((item, i) => {
      if (i !== index) return item;
      const base =
        item && typeof item === "object"
          ? { ...item }
          : { src: typeof item === "string" ? item : "" };
      return { ...base, ...patch };
    });
    onChange(next);
  };

  const deleteItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    if (editIndex === index) setEditIndex(null);
  };

  const replaceSrc = (index: number, file: MediaFile) => {
    const nextItem = toMediaItem(file);
    const existing = items[index];
    const preserved =
      existing && typeof existing === "object"
        ? {
            ...existing,
            src: nextItem.src,
            type: nextItem.type,
          }
        : nextItem;
    const next = items.map((item, i) => (i === index ? preserved : item));
    onChange(next);
    setReplaceIndex(null);
  };

  const addItems = (files: MediaFile | MediaFile[]) => {
    const list = Array.isArray(files) ? files : [files];
    const additions = list.map((f) => toMediaItem(f)).filter((m) => m.src);
    if (additions.length === 0) {
      setAdding(false);
      return;
    }
    if (singular) {
      onChange([additions[0]]);
    } else {
      onChange([...items, ...additions]);
    }
    setAdding(false);
  };

  const applyGroupEdit = () => {
    const keys = Object.keys(groupDraft);
    if (keys.length === 0) return;
    const next = items.map((item) => {
      const base =
        item && typeof item === "object"
          ? { ...item }
          : { src: typeof item === "string" ? item : "" };
      for (const key of keys) {
        const val = groupDraft[key];
        if (val === undefined || val === "") {
          delete base[key];
        } else {
          base[key] = val;
        }
      }
      return base;
    });
    onChange(next);
    setGroupOpen(false);
  };

  const editing = editIndex !== null ? items[editIndex] : null;
  const editingKind: MediaKind =
    editIndex !== null ? detectMediaKind(editing) : "image";

  return (
    <>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "medias" | "form")}
        className="w-full"
      >
        <div className="flex items-center gap-1.5">
          <TabsList className="h-8">
            <TabsTrigger value="medias" className="h-7 text-xs">
              Medias
            </TabsTrigger>
            <TabsTrigger value="form" className="h-7 text-xs">
              Form
            </TabsTrigger>
          </TabsList>
          {groupProps.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Group edit"
              disabled={items.length === 0}
              onClick={() => setGroupOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <div className="inline-flex h-8 items-center rounded-lg bg-muted p-0.5">
            {([5, 4, 3] as const).map((cols) => (
              <Button
                key={cols}
                type="button"
                variant="ghost"
                size="sm"
                title={`${cols} columns`}
                className={`h-7 w-7 p-0 ${
                  gridCols === cols
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
                onClick={() => setGridCols(cols)}
              >
                <GridColsIcon cols={cols} />
              </Button>
            ))}
          </div>
        </div>

        <TabsContent value="medias" className="mt-3 space-y-3">
          <div
            className={`grid gap-2 ${
              gridCols === 5
                ? "grid-cols-5"
                : gridCols === 4
                  ? "grid-cols-4"
                  : "grid-cols-3"
            }`}
          >
            {items.map((item, index) => {
              const src = extractSrc(item);
              const kind = detectMediaKind(item);
              return (
                <div
                  key={index}
                  className="group relative aspect-square overflow-hidden rounded-md border bg-muted cursor-pointer"
                  onClick={() => setEditIndex(index)}
                >
                  <MediaThumb src={src} kind={kind} />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
                    <Pencil className="h-5 w-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="absolute left-1 top-1">
                    <KindBadge kind={kind} />
                  </div>
                  <div className="absolute right-1 top-1 flex gap-0.5 opacity-90">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-6 w-6 p-0"
                      title="Swap media"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplaceIndex(index);
                      }}
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(index);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {(!singular || items.length === 0) && (
            <button
              type="button"
              title="Add media"
              className="flex aspect-square items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground transition-colors hover:border-muted-foreground/70 hover:bg-muted hover:text-foreground"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-6 w-6" />
            </button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="form" className="mt-3 space-y-3">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">No media items yet.</p>
          ) : (
            items.map((item, index) => (
              <div
                key={index}
                className="space-y-2 rounded-md border p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    #{index} · {detectMediaKind(item)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => deleteItem(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {props
                    .filter((p) => p.key === "src" || KIND_POPUP_KEYS[detectMediaKind(item)].includes(p.key))
                    .map((prop) => (
                      <PropEditor
                        key={prop.key}
                        prop={prop}
                        value={
                          prop.key === "src"
                            ? extractSrc(item)
                            : item?.[prop.key]
                        }
                        onChange={(val) =>
                          updateItem(index, {
                            [prop.key]:
                              prop.key === "src" ? val : val,
                          })
                        }
                      />
                    ))}
                </div>
              </div>
            ))
          )}
          {(!singular || items.length === 0) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add media
          </Button>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Group edit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {groupProps.map((prop) => (
                <PropEditor
                  key={prop.key}
                  prop={prop}
                  value={groupDraft[prop.key]}
                  onChange={(val) =>
                    setGroupDraft((d) => ({ ...d, [prop.key]: val }))
                  }
                />
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={applyGroupEdit}
                disabled={items.length === 0}
              >
                Apply to all ({items.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editIndex !== null && Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditIndex(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Edit {editingKind} {(editIndex ?? 0) + 1}
            </DialogTitle>
          </DialogHeader>
          {editing && editIndex !== null && (
            <div className="space-y-3">
              <MediaThumb
                src={extractSrc(editing)}
                kind={editingKind}
                className="h-28 w-full rounded-md object-cover border"
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {KIND_POPUP_KEYS[editingKind].map((key) => {
                  const prop = props.find((p) => p.key === key);
                  if (!prop) return null;
                  return (
                    <PropEditor
                      key={key}
                      prop={prop}
                      value={editing[key]}
                      onChange={(val) => updateItem(editIndex, { [key]: val })}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {replaceIndex !== null && (
        <MediaPicker
          pickerMode={true}
          singular={true}
          onSelect={(files) => {
            const file = Array.isArray(files) ? files[0] : files;
            if (file && replaceIndex !== null) {
              replaceSrc(replaceIndex, file);
            }
          }}
          onClose={() => setReplaceIndex(null)}
        />
      )}

      {adding && (
        <MediaPicker
          pickerMode={true}
          singular={singular}
          onSelect={(files) => addItems(files)}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  );
}

function KindBadge({ kind }: { kind: MediaKind }) {
  const Icon =
    kind === "video" ? Film : kind === "audio" ? Music : ImageIcon;
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-black/55 px-1 py-0.5 text-[9px] uppercase tracking-wide text-white">
      <Icon className="h-2.5 w-2.5" />
      {kind}
    </span>
  );
}

function MediaThumb({
  src,
  kind,
  className,
}: {
  src: string;
  kind: MediaKind;
  className?: string;
}) {
  if (kind === "audio") {
    return (
      <div
        className={
          className ||
          "flex h-full w-full items-center justify-center bg-muted"
        }
      >
        <Music className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }
  if (kind === "video" && src) {
    return (
      <video
        src={src}
        muted
        playsInline
        preload="metadata"
        className={className || "h-full w-full object-cover"}
      />
    );
  }
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        className={className || "h-full w-full object-cover"}
      />
    );
  }
  return (
    <div
      className={
        className ||
        "flex h-full w-full items-center justify-center"
      }
    >
      <ImageIcon className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}

function GridColsIcon({ cols }: { cols: 3 | 4 | 5 }) {
  const size = cols * 3 + (cols - 1);
  return (
    <svg viewBox={`0 0 ${size} 11`} className="h-3.5 w-auto" aria-hidden>
      {Array.from({ length: cols }).map((_, i) => (
        <rect
          key={i}
          x={i * 4}
          y={0}
          width={3}
          height={11}
          rx={0.5}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

function PropEditor({
  prop,
  value,
  onChange,
}: {
  prop: ItemPropSchema;
  value: any;
  onChange: (val: any) => void;
}) {
  const label = prop.key;

  if (isColorProp(prop)) {
    return (
      <div className="space-y-1">
        <Label className="text-[10px] uppercase text-muted-foreground">
          {label}
        </Label>
        <ColorInput
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          placeholder="#000000"
        />
      </div>
    );
  }

  if (prop.type === "boolean") {
    return (
      <div className="space-y-1">
        <Label className="text-[10px] uppercase text-muted-foreground">
          {label}
        </Label>
        <Select
          value={
            value === true ? "true" : value === false ? "false" : "__unset__"
          }
          onValueChange={(v) =>
            onChange(v === "__unset__" ? undefined : v === "true")
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset__">Unset</SelectItem>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (prop.enum && prop.enum.length > 0) {
    return (
      <div className="space-y-1">
        <Label className="text-[10px] uppercase text-muted-foreground">
          {label}
        </Label>
        <Select
          value={value ?? "__unset__"}
          onValueChange={(v) => onChange(v === "__unset__" ? undefined : v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset__">Unset</SelectItem>
            {prop.enum.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (prop.type === "number") {
    return (
      <div className="space-y-1">
        <Label className="text-[10px] uppercase text-muted-foreground">
          {label}
        </Label>
        <Input
          type="number"
          className="h-8 text-xs"
          min={prop.minimum}
          max={prop.maximum}
          step={0.01}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (raw === "") {
              onChange(undefined);
              return;
            }
            const n = Number(raw);
            onChange(Number.isFinite(n) ? n : undefined);
          }}
          placeholder="—"
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase text-muted-foreground">
        {label}
      </Label>
      <Input
        className="h-8 text-xs font-mono"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={isRangeProp(prop) ? "0:00-0:30" : "—"}
      />
    </div>
  );
}
