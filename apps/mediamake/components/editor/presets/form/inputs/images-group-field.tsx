"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeftRight, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
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
import { ColorInput } from "./color-input";
import { useEditorUIStore } from "@/components/editor_main/stores/editor-ui-store";
import { isValidRangeString } from "../../engine/range-validation";

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

/** Normalize legacy array or { mediaRef, items } into a consistent shape. */
export function parseImagesGroupValue(value: any): {
  mediaRef?: string;
  items: any[];
} {
  if (Array.isArray(value)) {
    return { items: value };
  }
  if (value && typeof value === "object" && Array.isArray(value.items)) {
    return {
      mediaRef:
        typeof value.mediaRef === "string" && value.mediaRef
          ? value.mediaRef
          : undefined,
      items: value.items,
    };
  }
  return { items: [] };
}

export function serializeImagesGroupValue(
  mediaRef: string | undefined,
  items: any[],
): any {
  if (mediaRef) {
    return { mediaRef, items };
  }
  return { items };
}

export function extractMediaSrc(entry: any): string {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  if (typeof entry === "object") {
    return (
      entry.src ||
      entry.filePath ||
      entry.url ||
      entry.metadata?.src ||
      ""
    );
  }
  return "";
}

export function toMediaRefEntry(src: string): { src: string } {
  return { src };
}

/**
 * Images / Form editor for imagesGroup fields.
 * When `mediaRef` is set, srcs are sourced from (and written to) that medias reference.
 */
export function ImagesGroupField({
  value,
  onChange,
  itemSchema,
  renderForm,
  baseData = {},
  onUpdateMediaRef,
}: {
  value: any;
  onChange: (next: any) => void;
  itemSchema?: any;
  renderForm: (items: any[], onItemsChange: (items: any[]) => void) => ReactNode;
  baseData?: Record<string, any>;
  /** Persist medias array for the linked reference key. */
  onUpdateMediaRef?: (refKey: string, medias: any[]) => void;
}) {
  const { mediaRef, items } = parseImagesGroupValue(value);
  const linked = Boolean(mediaRef);
  const refMedias: any[] = linked && Array.isArray(baseData[mediaRef!])
    ? baseData[mediaRef!]
    : [];

  const displayImages = useMemo(() => {
    if (!linked) return items;
    const len = Math.max(items.length, refMedias.length);
    const out: any[] = [];
    for (let i = 0; i < len; i++) {
      const local = items[i] && typeof items[i] === "object" ? items[i] : {};
      out.push({
        ...local,
        src: extractMediaSrc(refMedias[i]) || local.src || "",
      });
    }
    return out;
  }, [linked, items, refMedias]);

  const props = useMemo(() => getItemPropSchemas(itemSchema), [itemSchema]);
  const groupProps = props.filter(
    (p) => p.key !== "src" && isGroupEditable(p) && !isRangeProp(p),
  );
  const popupProps = props.filter((p) => p.key !== "src");

  const [tab, setTab] = useState<"images" | "form">("images");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [groupDraft, setGroupDraft] = useState<Record<string, any>>({});
  const [groupOpen, setGroupOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4 | 5>(3);
  const [addingImages, setAddingImages] = useState(false);

  const commit = (nextMediaRef: string | undefined, nextItems: any[]) => {
    onChange(serializeImagesGroupValue(nextMediaRef, nextItems));
  };

  const syncRefMedias = (medias: any[]) => {
    if (mediaRef && onUpdateMediaRef) {
      onUpdateMediaRef(mediaRef, medias);
    }
  };

  const updateLocalItem = (index: number, patch: Record<string, any>) => {
    const nextItems = displayImages.map((img, i) => {
      if (i !== index) {
        const { src: _s, ...rest } = img;
        // Preserve local props; src handled separately when linked
        return items[i] ?? rest;
      }
      const base = items[i] && typeof items[i] === "object" ? { ...items[i] } : {};
      const next = { ...base, ...patch };
      if (linked && "src" in patch) {
        // src goes to ref; keep local without relying on it as source of truth
        // but mirror for unlink fallback
        next.src = patch.src;
      }
      return next;
    });

    // Ensure length
    while (nextItems.length < displayImages.length) {
      nextItems.push({});
    }

    if (linked && "src" in patch) {
      const medias = displayImages.map((img, i) => {
        const nextSrc =
          i === index ? String(patch.src ?? "") : extractMediaSrc(img);
        const existing = refMedias[i];
        if (existing && typeof existing === "object") {
          return { ...existing, src: nextSrc };
        }
        return toMediaRefEntry(nextSrc);
      });
      syncRefMedias(medias);
    }

    commit(mediaRef, nextItems);
  };

  const deleteImage = (index: number) => {
    const nextItems = items.filter((_, i) => i !== index);
    if (linked) {
      const medias = displayImages
        .filter((_, i) => i !== index)
        .map((img, i) => {
          // Map back to original ref index (before filter)
          const origIndex = i < index ? i : i + 1;
          const existing = refMedias[origIndex];
          const src = extractMediaSrc(img);
          if (existing && typeof existing === "object") {
            return { ...existing, src };
          }
          return toMediaRefEntry(src);
        });
      syncRefMedias(medias);
    }
    commit(mediaRef, nextItems);
    if (editIndex === index) setEditIndex(null);
  };

  const replaceSrc = (index: number, file: MediaFile) => {
    const src = file.filePath || "";
    updateLocalItem(index, { src });
    setReplaceIndex(null);
  };

  const addImages = (files: MediaFile | MediaFile[]) => {
    const list = Array.isArray(files) ? files : [files];
    const additions = list
      .map((file) => file.filePath || "")
      .filter(Boolean)
      .map((src) => ({ src }));
    if (additions.length === 0) {
      setAddingImages(false);
      return;
    }

    const nextItems = [
      ...items,
      ...additions.map((a) => (linked ? { src: a.src } : a)),
    ];
    if (linked) {
      const medias = [
        ...displayImages.map((img, i) => {
          const existing = refMedias[i];
          const src = extractMediaSrc(img);
          if (existing && typeof existing === "object") {
            return { ...existing, src };
          }
          return toMediaRefEntry(src);
        }),
        ...additions.map((a) => toMediaRefEntry(a.src)),
      ];
      syncRefMedias(medias);
    }
    commit(mediaRef, nextItems);
    setAddingImages(false);
  };

  const applyGroupEdit = () => {
    const keys = Object.keys(groupDraft);
    if (keys.length === 0) return;

    const nextItems = displayImages.map((_, i) => {
      const base = items[i] && typeof items[i] === "object" ? { ...items[i] } : {};
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
    commit(mediaRef, nextItems);
    setGroupOpen(false);
  };

  const onItemsChangeFromForm = (nextItems: any[]) => {
    if (linked) {
      // Form may edit src — push srcs to ref, preserving other media item props
      const medias = nextItems.map((item, i) => {
        const src = extractMediaSrc(item);
        const existing = refMedias[i];
        if (existing && typeof existing === "object") {
          return { ...existing, src };
        }
        return toMediaRefEntry(src);
      });
      syncRefMedias(medias);
    }
    commit(mediaRef, nextItems);
  };

  const editing = editIndex !== null ? displayImages[editIndex] : null;

  return (
    <>
      {linked && mediaRef && (
        <p
          className="mb-1.5 text-[11px] text-muted-foreground truncate"
          title={`Image sources linked from ${mediaRef}`}
        >
          ref: {mediaRef}
        </p>
      )}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "images" | "form")}
        className="w-full"
      >
        <div className="flex items-center gap-1.5">
          <TabsList className="h-8">
            <TabsTrigger value="images" className="h-7 text-xs">
              Images
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
              disabled={displayImages.length === 0}
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

        <TabsContent value="images" className="mt-3 space-y-3">
          <div
            className={`grid gap-2 ${
              gridCols === 5
                ? "grid-cols-5"
                : gridCols === 4
                  ? "grid-cols-4"
                  : "grid-cols-3"
            }`}
          >
            {displayImages.map((img, index) => (
              <div
                key={index}
                className="group relative aspect-square overflow-hidden rounded-md border bg-muted cursor-pointer"
                onClick={() => setEditIndex(index)}
              >
                {img?.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.src}
                    alt={`Image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
                  <Pencil className="h-5 w-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                </div>
                <div className="absolute right-1 top-1 flex gap-0.5 opacity-90">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="Swap image"
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
                    title="Delete image"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(index);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <button
              type="button"
              title="Add images"
              className="flex aspect-square items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground transition-colors hover:border-muted-foreground/70 hover:bg-muted hover:text-foreground"
              onClick={() => setAddingImages(true)}
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </TabsContent>

        <TabsContent value="form" className="mt-3">
          {renderForm(displayImages, onItemsChangeFromForm)}
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
                disabled={displayImages.length === 0}
              >
                Apply to all ({displayImages.length})
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
              Edit image {(editIndex ?? 0) + 1}
              {linked ? " (src from ref)" : ""}
            </DialogTitle>
          </DialogHeader>
          {editing && editIndex !== null && (
            <div className="space-y-3">
              {editing.src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editing.src}
                  alt=""
                  className="h-28 w-full rounded-md object-cover border"
                />
              )}
              <div className="grid grid-cols-3 gap-2">
                {(["fit", "filter", "blendMode"] as const).map((key) => {
                  const prop = popupProps.find((p) => p.key === key);
                  if (!prop) return <div key={key} />;
                  return (
                    <PropEditor
                      key={key}
                      prop={prop}
                      value={editing[key]}
                      onChange={(val) => updateLocalItem(editIndex, { [key]: val })}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["opacity", "colorTint"] as const).map((key) => {
                  const prop = popupProps.find((p) => p.key === key);
                  if (!prop) return <div key={key} />;
                  return (
                    <PropEditor
                      key={key}
                      prop={prop}
                      value={editing[key]}
                      onChange={(val) => updateLocalItem(editIndex, { [key]: val })}
                    />
                  );
                })}
              </div>
              {(() => {
                const prop = popupProps.find((p) => p.key === "rangeString");
                if (!prop) return null;
                return (
                  <PropEditor
                    prop={prop}
                    value={editing.rangeString}
                    onChange={(val) =>
                      updateLocalItem(editIndex, { rangeString: val })
                    }
                  />
                );
              })()}
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

      {addingImages && (
        <MediaPicker
          pickerMode={true}
          singular={false}
          onSelect={(files) => addImages(files)}
          onClose={() => setAddingImages(false)}
        />
      )}
    </>
  );
}

function GridColsIcon({ cols }: { cols: 3 | 4 | 5 }) {
  const size = cols * 3 + (cols - 1);
  return (
    <svg
      viewBox={`0 0 ${size} 11`}
      className="h-3.5 w-auto"
      aria-hidden
    >
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
      {isRangeProp(prop) ? (
        <RangePropInput
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
      ) : (
        <Input
          className="h-8 text-xs font-mono"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="—"
        />
      )}
    </div>
  );
}

function RangePropInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: any) => void;
}) {
  const [draft, setDraft] = useState(value);
  const beginRangeEdit = useEditorUIStore((s) => s.beginRangeEdit);
  const endRangeEdit = useEditorUIStore((s) => s.endRangeEdit);
  const setHasInvalidRanges = useEditorUIStore((s) => s.setHasInvalidRanges);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <Input
      className="h-8 text-xs font-mono"
      value={draft}
      placeholder="0:00-0:30"
      onFocus={() => beginRangeEdit()}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        if (next && !isValidRangeString(next)) setHasInvalidRanges(true);
      }}
      onBlur={() => {
        if (draft && !isValidRangeString(draft)) {
          setHasInvalidRanges(true);
          endRangeEdit();
          return;
        }
        setHasInvalidRanges(false);
        onChange(draft || undefined);
        endRangeEdit();
      }}
    />
  );
}
