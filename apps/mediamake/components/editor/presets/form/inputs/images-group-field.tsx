"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeftRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { MediaPicker } from "@/components/editor/media/media-picker";
import { AnchoredEditPopover, OpenSourceButton } from "./anchored-edit-popover";
import { MediaItemThumb, PopupMediaPreview } from "@/components/editor/media/media-item-thumb";
import { MediaFile } from "@/app/types/media";
import { paramMetaTypes, paramInputTypes } from "../../dataTypes";
import {
  detectMediaKind,
  MEDIA_STATIC_KEYS,
  overlayMediaStatic,
  readMediaStatic,
  stripMediaStatic,
  toMediaItem,
} from "../../dataTypes/media";
import { ContainerInsetsInput } from "./container-insets-input";
import { ColorInput } from "./color-input";
import { MediaLookFields } from "./media-look-fields";
import { PRESET_LOOK_FLAT_KEYS } from "./video-style";
import { LockTargetInput } from "./lock-target-input";
import { useEditorUIStore } from "@/components/editor_main/stores/editor-ui-store";
import { useLayerStateStore } from "@/components/editor_main/stores/layer-state-store";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { formatRangeClock } from "../../engine/preset-stdlib";
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

function isContainerProp(prop: ItemPropSchema): boolean {
  return prop.meta?.[paramMetaTypes.containerObject] === true;
}

function isLookStyleProp(prop: ItemPropSchema): boolean {
  return prop.meta?.[paramMetaTypes.imageStyle] === true
    || prop.meta?.[paramMetaTypes.videoStyle] === true;
}

/** Visual controls that do not apply to audio items. */
const VISUAL_PROP_KEYS = new Set([
  "fit",
  "filter",
  "blendMode",
  "opacity",
  "colorTint",
  "position",
  "fadeInTransition",
  "fadeInDuration",
  "fadeOutTransition",
  "fadeOutDuration",
  "style",
]);

const COLOR_TINT_PROP: ItemPropSchema = {
  key: "colorTint",
  type: "string",
  meta: {
    [paramMetaTypes.inputType]: paramInputTypes.color,
    [paramMetaTypes.groupEditable]: true,
  },
};

const AUDIO_POPUP_KEYS = [
  "volume",
  "mute",
  "muted",
  "playbackRate",
  "startCropVideo",
  "startFrom",
];

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

export function toMediaRefEntry(
  src: string,
  extra?: Partial<{ type: string; name: string; thumbnail: string }>,
): { src: string; type?: string; name?: string; thumbnail?: string } {
  return { src, ...extra };
}

/** Build a media-track item from a picker MediaFile (src + type + name + thumbnail). */
export function mediaFileToTrackItem(file: MediaFile): Record<string, unknown> {
  const item = toMediaItem(file);
  return {
    src: item.src,
    type: item.type,
    ...(item.name ? { name: item.name } : {}),
    ...((item as any).thumbnail ? { thumbnail: (item as any).thumbnail } : {}),
  };
}

const STATIC_PROP_KEYS = new Set<string>(MEDIA_STATIC_KEYS);

/** Item schemas that list a type enum only accept those media kinds. */
function schemaMediaKinds(itemSchema: any): Set<string> | null {
  const typeEnum = itemSchema?.properties?.type?.enum;
  if (!Array.isArray(typeEnum) || typeEnum.length === 0) return null;
  const kinds = typeEnum.filter((kind) => typeof kind === "string");
  return kinds.length > 0 ? new Set(kinds) : null;
}

/**
 * Images / Form editor for imagesGroup fields.
 * When `mediaRef` is set, file identity (src, type, name, thumbnail, …)
 * is read from and written to that medias reference. Styling stays on the preset item.
 */
export function ImagesGroupField({
  value,
  onChange,
  itemSchema,
  renderForm,
  baseData = {},
  onUpdateMediaRef,
  linkControl,
}: {
  value: any;
  onChange: (next: any) => void;
  itemSchema?: any;
  renderForm: (items: any[], onItemsChange: (items: any[]) => void) => ReactNode;
  baseData?: Record<string, any>;
  /** Persist medias array for the linked reference key. */
  onUpdateMediaRef?: (refKey: string, medias: any[]) => void;
  /** Reference dropdown + open icon, rendered beside the Images / Form tabs. */
  linkControl?: ReactNode;
}) {
  const { mediaRef, items } = parseImagesGroupValue(value);
  const linked = Boolean(mediaRef);
  const refMedias: any[] = linked && Array.isArray(baseData[mediaRef!])
    ? baseData[mediaRef!]
    : [];

  const displayImages = useMemo(() => {
    if (!linked) return items;
    const len = Math.max(items.length, refMedias.length);
    return Array.from({ length: len }, (_, i) =>
      overlayMediaStatic(items[i], refMedias[i]),
    );
  }, [linked, items, refMedias]);

  const props = useMemo(() => getItemPropSchemas(itemSchema), [itemSchema]);
  const allowedKinds = useMemo(() => schemaMediaKinds(itemSchema), [itemSchema]);
  const acceptsFile = (file: MediaFile) => {
    if (!allowedKinds) return true;
    return allowedKinds.has(detectMediaKind(file));
  };
  const groupProps = props.filter(
    (p) => p.key !== "src" && isGroupEditable(p) && !isRangeProp(p),
  );
  const hasVisualItems = displayImages.some(
    (img) => detectMediaKind(img) !== "audio",
  );
  const lookProp = props.find(isLookStyleProp);
  const groupEditProps = groupProps.filter(
    (p) =>
      (hasVisualItems || !VISUAL_PROP_KEYS.has(p.key)) &&
      !(lookProp && (PRESET_LOOK_FLAT_KEYS as readonly string[]).includes(p.key)),
  );
  const popupProps = props.filter((p) => !STATIC_PROP_KEYS.has(p.key));

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

  const splitPatch = (patch: Record<string, any>) => {
    const identity: Record<string, any> = {};
    const styling: Record<string, any> = {};
    for (const [key, val] of Object.entries(patch)) {
      if (STATIC_PROP_KEYS.has(key)) identity[key] = val;
      else styling[key] = val;
    }
    return { identity, styling };
  };

  const updateLocalItem = (index: number, patch: Record<string, any>) => {
    const { identity, styling } = splitPatch(patch);
    if (linked && Object.keys(identity).length > 0) {
      syncRefMedias(
        displayImages.map((img, i) =>
          readMediaStatic(i === index ? { ...img, ...identity } : img),
        ),
      );
    }

    const stylingPatch = linked ? styling : patch;
    if (Object.keys(stylingPatch).length === 0 && linked) return;

    const nextItems = Array.from({ length: Math.max(items.length, displayImages.length) }, (_, i) => {
      const base = items[i] && typeof items[i] === "object" ? { ...items[i] } : {};
      const next = i === index ? { ...base, ...stylingPatch } : base;
      if (i === index) {
        for (const [key, val] of Object.entries(stylingPatch)) {
          if (val === undefined) delete next[key];
        }
      }
      return linked ? stripMediaStatic(next) : next;
    });
    commit(mediaRef, nextItems);
  };

  const deleteImage = (index: number) => {
    if (linked) {
      syncRefMedias(
        displayImages.filter((_, i) => i !== index).map((img) => readMediaStatic(img)),
      );
    }
    const nextItems = (linked ? items.map((item) => stripMediaStatic(item)) : items).filter(
      (_, i) => i !== index,
    );
    commit(mediaRef, nextItems);
    if (editIndex === index) setEditIndex(null);
  };

  const replaceSrc = (index: number, file: MediaFile) => {
    if (!acceptsFile(file)) {
      setReplaceIndex(null);
      return;
    }
    const identity = readMediaStatic(toMediaItem(file));
    if (linked) {
      syncRefMedias(
        displayImages.map((img, i) =>
          readMediaStatic(i === index ? identity : img),
        ),
      );
      setReplaceIndex(null);
      return;
    }
    updateLocalItem(index, identity);
    setReplaceIndex(null);
  };

  const addImages = (files: MediaFile | MediaFile[]) => {
    const list = Array.isArray(files) ? files : [files];
    const additions = list
      .filter(acceptsFile)
      .map((file) => readMediaStatic(mediaFileToTrackItem(file)))
      .filter((a) => a.src);
    if (additions.length === 0) {
      setAddingImages(false);
      return;
    }

    if (linked) {
      syncRefMedias([
        ...displayImages.map((img) => readMediaStatic(img)),
        ...additions,
      ]);
      commit(mediaRef, [
        ...items.map((item) => stripMediaStatic(item)),
        ...additions.map(() => ({})),
      ]);
    } else {
      commit(mediaRef, [...items, ...additions]);
    }
    setAddingImages(false);
  };

  const applyGroupEdit = () => {
    const keys = Object.keys(groupDraft);
    if (keys.length === 0) return;

    const nextItems = displayImages.map((img, i) => {
      const base = items[i] && typeof items[i] === "object" ? { ...items[i] } : {};
      const isAudio = detectMediaKind(img) === "audio";
      for (const key of keys) {
        if (isAudio && VISUAL_PROP_KEYS.has(key)) continue;
        const val = groupDraft[key];
        if (val === undefined || val === "") {
          delete base[key];
        } else {
          base[key] = val;
          if (key === "style") {
            for (const flat of PRESET_LOOK_FLAT_KEYS) delete base[flat];
          }
        }
      }
      return linked ? stripMediaStatic(base) : base;
    });
    commit(mediaRef, nextItems);
    setGroupOpen(false);
  };

  const onItemsChangeFromForm = (nextItems: any[]) => {
    if (linked) {
      syncRefMedias(nextItems.map((item) => readMediaStatic(item)));
      commit(mediaRef, nextItems.map((item) => stripMediaStatic(item)));
      return;
    }
    commit(mediaRef, nextItems);
  };

  return (
    <>
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
          {linkControl}
          {(groupEditProps.length > 0 || lookProp) && (
            <AnchoredEditPopover
              open={groupOpen}
              onOpenChange={setGroupOpen}
              title="Group edit"
              anchor={
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
              }
            >
              <div className="space-y-3">
                {lookProp && hasVisualItems ? (
                  <MediaLookFields
                    style={groupDraft.style}
                    onStyle={(next) => setGroupDraft((draft) => ({ ...draft, style: next }))}
                  />
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  {groupEditProps.map((prop) => (
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
            </AnchoredEditPopover>
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
              <AnchoredEditPopover
                key={index}
                open={editIndex === index}
                onOpenChange={(open) => {
                  if (!open && editIndex === index) setEditIndex(null);
                }}
                title={`Edit image ${index + 1}${linked ? " (src from ref)" : ""}`}
                headerActions={<OpenSourceButton item={img} />}
                anchor={
                  <div
                    className="group relative aspect-square overflow-hidden rounded-md border bg-muted cursor-pointer"
                    onClick={() => setEditIndex(index)}
                  >
                    <MediaItemThumb item={img} />
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
                }
              >
                <ItemPopupFields
                  img={img}
                  popupProps={popupProps}
                  onChange={(patch) => updateLocalItem(index, patch)}
                />
              </AnchoredEditPopover>
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

function RangeWithLoop({
  rangeProp,
  rangeValue,
  showLoop,
  loopValue,
  lockToProp,
  lockToValue,
  onRangeChange,
  onLoopChange,
  onLockToChange,
}: {
  rangeProp?: ItemPropSchema;
  rangeValue: unknown;
  showLoop: boolean;
  loopValue: boolean;
  lockToProp?: ItemPropSchema;
  lockToValue?: unknown;
  onRangeChange: (val: string | undefined) => void;
  onLoopChange: (val: boolean) => void;
  onLockToChange?: (val: string) => void;
}) {
  const rangeLocked =
    typeof lockToValue === "string" && lockToValue.trim().length > 0;
  if (!rangeProp && !showLoop && !lockToProp) return null;
  return (
    <div className="flex items-end gap-2">
      {rangeProp ? (
        <div className="min-w-0 flex-1">
          <PropEditor
            prop={rangeProp}
            value={rangeValue}
            disabled={rangeLocked}
            onChange={(val) => onRangeChange(val || undefined)}
          />
        </div>
      ) : null}
      {lockToProp ? (
        <div className="w-36 shrink-0 space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">
            lockTo
          </Label>
          <LockTargetInput
            value={typeof lockToValue === "string" ? lockToValue : ""}
            onChange={(next) => onLockToChange?.(next)}
            size="sm"
            className="text-xs"
          />
        </div>
      ) : null}
      {showLoop ? (
        <div className="shrink-0 space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">
            Loop
          </Label>
          <div className="flex h-8 items-center">
            <Checkbox
              checked={loopValue}
              onCheckedChange={(checked) => onLoopChange(checked === true)}
              aria-label="Loop"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ItemPopupFields({
  img,
  popupProps,
  onChange,
}: {
  img: any;
  popupProps: ItemPropSchema[];
  onChange: (patch: Record<string, any>) => void;
}) {
  const kind = detectMediaKind(img);
  const isAudio = kind === "audio";
  const find = (key: string) => popupProps.find((p) => p.key === key);
  const kindLabel = (
    <p className="text-[11px] font-medium capitalize text-foreground">{kind}</p>
  );

  if (isAudio) {
    const audioProps = AUDIO_POPUP_KEYS.map(find).filter(
      (p): p is ItemPropSchema => p != null && !isRangeProp(p),
    );
    return (
      <div className="space-y-3">
        {kindLabel}
        <PopupMediaPreview item={img} />
        <div className="grid grid-cols-2 gap-2">
          {audioProps.map((prop) => (
            <PropEditor
              key={prop.key}
              prop={prop}
              value={img[prop.key]}
              onChange={(val) => onChange({ [prop.key]: val })}
            />
          ))}
        </div>
        <RangeWithLoop
          rangeProp={find("rangeString")}
          rangeValue={img.rangeString}
          showLoop={Boolean(find("loop"))}
          loopValue={img.loop === true}
          lockToProp={find("lockTo")}
          lockToValue={img.lockTo}
          onRangeChange={(val) => onChange({ rangeString: val })}
          onLoopChange={(val) => onChange({ loop: val })}
          onLockToChange={(val) => onChange({ lockTo: val || undefined })}
        />
      </div>
    );
  }

  const row = (keys: string[]) =>
    keys.map((key) => {
      const prop = find(key);
      if (!prop || isContainerProp(prop)) return <div key={key} />;
      return (
        <PropEditor
          key={key}
          prop={prop}
          value={img[key]}
          onChange={(val) => onChange({ [key]: val })}
        />
      );
    });

  const positionProps = popupProps.filter(isContainerProp);
  const volumeProp = find("volume");
  const muteProp = find("mute") ?? find("muted");
  const lookProp = popupProps.find(isLookStyleProp);
  const clearLookFlats = () => Object.fromEntries(PRESET_LOOK_FLAT_KEYS.map((key) => [key, undefined]));

  return (
    <div className="space-y-3">
      {kindLabel}
      <PopupMediaPreview item={img} />
      {lookProp ? (
        <MediaLookFields
          style={img[lookProp.key] && typeof img[lookProp.key] === "object" ? img[lookProp.key] : undefined}
          legacy={img}
          onStyle={(next) => onChange({ [lookProp.key]: next, ...clearLookFlats() })}
        />
      ) : (
      <div className="grid grid-cols-3 gap-2">{row(["fit", "filter", "blendMode"])}</div>
      )}
      {volumeProp || muteProp ? (
        <div className="grid grid-cols-2 gap-2">
          {volumeProp ? (
            <PropEditor
              prop={volumeProp}
              value={img.volume}
              onChange={(val) => onChange({ volume: val })}
            />
          ) : (
            <div />
          )}
          {muteProp ? (
            <PropEditor
              prop={muteProp}
              value={img[muteProp.key]}
              onChange={(val) => onChange({ [muteProp.key]: val })}
            />
          ) : (
            <div />
          )}
        </div>
      ) : null}
      {lookProp ? null : (
      <div className="grid grid-cols-2 gap-2">
        {row(["opacity"])}
        <PropEditor
          prop={find("colorTint") ?? COLOR_TINT_PROP}
          value={img.colorTint}
          onChange={(val) => onChange({ colorTint: val || undefined })}
        />
      </div>
      )}
      <RangeWithLoop
        rangeProp={find("rangeString")}
        rangeValue={img.rangeString}
        showLoop={Boolean(find("loop"))}
        loopValue={img.loop === true}
        lockToProp={find("lockTo")}
        lockToValue={img.lockTo}
        onRangeChange={(val) => onChange({ rangeString: val })}
        onLoopChange={(val) => onChange({ loop: val })}
        onLockToChange={(val) => onChange({ lockTo: val || undefined })}
      />
      {positionProps.map((prop) => (
        <div key={prop.key} className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground">
            {prop.key}
          </Label>
          <ContainerInsetsInput
            value={
              img[prop.key] && typeof img[prop.key] === "object"
                ? img[prop.key]
                : undefined
            }
            onChange={(val) => onChange({ [prop.key]: val })}
          />
        </div>
      ))}
    </div>
  );
}

function PropEditor({
  prop,
  value,
  onChange,
  disabled = false,
}: {
  prop: ItemPropSchema;
  value: any;
  onChange: (val: any) => void;
  disabled?: boolean;
}) {
  const label = prop.key;

  if (isContainerProp(prop)) {
    return (
      <div className="space-y-1 col-span-2">
        <Label className="text-[10px] uppercase text-muted-foreground">
          {label}
        </Label>
        <ContainerInsetsInput
          value={value && typeof value === "object" ? value : undefined}
          onChange={onChange}
        />
      </div>
    );
  }

  if (isColorProp(prop)) {
    return (
      <div className="space-y-1">
        <Label className="text-[10px] uppercase text-muted-foreground">
          {label}
        </Label>
        <ColorInput
          value={typeof value === "string" ? value : ""}
          onChange={(next) => onChange(next?.trim() ? next : undefined)}
          placeholder=""
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
      <div className="flex items-center gap-1.5 flex-wrap">
        <Label className="text-[10px] uppercase text-muted-foreground">
          {label}
        </Label>
        {isRangeProp(prop) && (
          <RangePlayheadLinks
            value={typeof value === "string" ? value : ""}
            onChange={onChange}
            disabled={disabled}
          />
        )}
      </div>
      {isRangeProp(prop) ? (
        <RangePropInput
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          disabled={disabled}
        />
      ) : (
        <Input
          className="h-8 text-xs font-mono"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="—"
          disabled={disabled}
        />
      )}
    </div>
  );
}

function RangePlayheadLinks({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const currentFrame = useLayerStateStore((s) => s.currentFrame);
  const fps = useCompileStore((s) => s.calculatedMetadata?.fps ?? 30);

  const add = (seconds: number) => {
    const startSec = Math.max(0, currentFrame / (fps || 30));
    const segment = `${formatRangeClock(startSec)}-${formatRangeClock(startSec + seconds)}`;
    const base = value.trim().replace(/,+$/, "");
    onChange(base ? `${base},${segment}` : segment);
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      {[5, 15, 30].map((seconds) => (
        <button
          key={seconds}
          type="button"
          disabled={disabled}
          className="text-[10px] font-normal normal-case text-primary underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-40"
          onClick={() => add(seconds)}
        >
          {seconds}secs
        </button>
      ))}
    </span>
  );
}

function RangePropInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (val: any) => void;
  disabled?: boolean;
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
      disabled={disabled}
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
