"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DefaultCard } from "@/components/editor/presets/form/default-card";
import { remapDataReferenceKeys } from "@/components/editor/presets/engine/preset-data-mutation";
import type { DefaultPresetData, ReferenceItem } from "@/components/editor/presets/types";
import type { Timeline } from "../../../../stores/project-store";
import { useTimelineEditsStore } from "../../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../../stores/compile-store";
import { useLayerStateStore } from "../../../../stores/layer-state-store";
import { flattenLayers, filterEditableLayers, filterLeafLayers } from "@/lib/editor/flatten-layers";
import { Clock, ChevronDown, ChevronRight, Plus, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { JsonEditor } from "@/components/editor/player/json-editor";
import { MediasGroupField } from "@/components/editor/presets/form/inputs/medias-group-field";
import {
  getDefaultDataTypeForReferenceType,
  getDefaultValueForReferenceType,
  getReferenceTypeOptions,
  mediaItemSchema,
} from "@/components/editor/presets/dataTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { LinkedActionsSection } from "@/components/editor/presets/actions/form/ActionSection";

interface ReferencePropsPanelProps {
  reference: ReferenceItem;
  timeline: Timeline;
  referenceIndex: number;
}

// ─── Data item ID helpers ──────────────────────────────────────────────────────

/** Parse a _dataItemIds entry like "captions.[5]" → { key: "captions", index: 5 } */
function parseDataItemId(id: string): { key: string; index: number } | null {
  const match = id.match(/^([^.[]+)\.\[(\d+)\]$/);
  if (!match) return null;
  return { key: match[1], index: parseInt(match[2], 10) };
}

/** Build nodeId → _dataItemIds map by walking the compiled childrenData tree. */
function buildDataItemIdsMap(childrenData: any[] | undefined): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!childrenData) return map;
  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      const ids = node._dataItemIds as string[] | undefined;
      if (ids && ids.length > 0) map.set(node.id, ids);
      if (node.childrenData) walk(node.childrenData);
    }
  };
  walk(childrenData);
  return map;
}

// ─── Caption word editor ───────────────────────────────────────────────────────

function WordEditor({
  word,
  index,
  onChange,
}: {
  word: any;
  index: number;
  onChange: (updated: any) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded border bg-background px-1.5 py-1 text-[10px]">
      <span className="w-5 shrink-0 font-mono text-muted-foreground/50 text-center">{index}</span>
      <Input
        value={word.text ?? ""}
        className="h-5 flex-1 min-w-0 text-xs px-1"
        title="word text"
        onChange={(e) => onChange({ ...word, text: e.target.value })}
      />
      <Input
        type="number"
        step="0.001"
        value={word.absoluteStart ?? 0}
        className="h-5 w-16 shrink-0 text-[10px] px-1"
        title="absoluteStart (s)"
        onChange={(e) => onChange({ ...word, absoluteStart: parseFloat(e.target.value) || 0 })}
      />
      <span className="text-muted-foreground/40 shrink-0">→</span>
      <Input
        type="number"
        step="0.001"
        value={word.absoluteEnd ?? 0}
        className="h-5 w-16 shrink-0 text-[10px] px-1"
        title="absoluteEnd (s)"
        onChange={(e) => onChange({ ...word, absoluteEnd: parseFloat(e.target.value) || 0 })}
      />
      {typeof word.confidence === "number" && (
        <span className="shrink-0 text-muted-foreground/40 w-8 text-right">{(word.confidence * 100).toFixed(0)}%</span>
      )}
    </div>
  );
}

// ─── Metadata key-value editor ────────────────────────────────────────────────

function MetadataEditor({
  metadata,
  onChange,
}: {
  metadata: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const entries = Object.entries(metadata);

  const handleValueChange = (key: string, raw: string) => {
    let parsed: unknown = raw;
    try { parsed = JSON.parse(raw); } catch { /* keep as string */ }
    onChange({ ...metadata, [key]: parsed });
  };

  const handleDelete = (key: string) => {
    const next = { ...metadata };
    delete next[key];
    onChange(next);
  };

  const handleAdd = () => {
    if (!newKey.trim()) return;
    let parsed: unknown = newValue;
    try { parsed = JSON.parse(newValue); } catch { /* keep as string */ }
    onChange({ ...metadata, [newKey.trim()]: parsed });
    setNewKey("");
    setNewValue("");
  };

  return (
    <div className="mt-1.5 space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-1">
          <span className="w-24 shrink-0 truncate text-[10px] font-mono text-muted-foreground" title={k}>{k}</span>
          <Input
            value={typeof v === "string" ? v : JSON.stringify(v)}
            className="h-5 flex-1 text-xs px-1"
            onChange={(e) => handleValueChange(k, e.target.value)}
          />
          <button
            type="button"
            className="shrink-0 p-0.5 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(k)}
            title="Remove key"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1 pt-0.5 border-t border-dashed border-border/50">
        <Input
          placeholder="key"
          value={newKey}
          className="h-5 w-20 shrink-0 text-[10px] px-1"
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <Input
          placeholder="value"
          value={newValue}
          className="h-5 flex-1 text-[10px] px-1"
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <button
          type="button"
          className="shrink-0 p-0.5 text-muted-foreground hover:text-primary disabled:opacity-40"
          disabled={!newKey.trim()}
          onClick={handleAdd}
          title="Add key"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Full caption item editor ──────────────────────────────────────────────────

function CaptionItemEditor({
  caption,
  index,
  totalCount,
  onChange,
}: {
  caption: any;
  index: number;
  totalCount: number;
  onChange: (updated: any) => void;
}) {
  const [timingOpen, setTimingOpen] = useState(false);
  const [wordsOpen, setWordsOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);

  const words: any[] = caption.words ?? [];
  const metadata: Record<string, unknown> = caption.metadata ?? {};
  const hasMetadata = Object.keys(metadata).length > 0;

  const absStart = typeof caption.absoluteStart === "number" ? caption.absoluteStart : null;
  const absEnd = typeof caption.absoluteEnd === "number" ? caption.absoluteEnd : null;
  const dur = absStart !== null && absEnd !== null ? (absEnd - absStart).toFixed(3) : null;

  const timingFields: [string, string][] = [
    ["absoluteStart", "Abs Start"],
    ["absoluteEnd", "Abs End"],
    ["start", "Start"],
    ["end", "End"],
    ["duration", "Duration"],
  ];

  return (
    <div className="rounded-md border overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/30 border-b">
        <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
          #{index}
        </span>
        <span className="text-[10px] text-muted-foreground">of {totalCount}</span>
        <div className="flex-1" />
        {absStart !== null && absEnd !== null && (
          <>
            <span className="text-[10px] font-mono text-muted-foreground">
              {absStart.toFixed(3)}s → {absEnd.toFixed(3)}s
            </span>
            <span className="text-[10px] text-muted-foreground/60">({dur}s)</span>
          </>
        )}
      </div>

      {/* ── Body ── */}
      <div className="p-2.5 space-y-2.5">

        {/* Text */}
        <Textarea
          value={caption.text ?? ""}
          rows={2}
          className="resize-none text-sm bg-background"
          placeholder="Caption text…"
          onChange={(e) => onChange({ ...caption, text: e.target.value })}
        />

        {/* Timing */}
        <Collapsible open={timingOpen} onOpenChange={setTimingOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {timingOpen ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
            <span className="uppercase tracking-wide font-medium">Timing</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1.5">
              {timingFields.map(([field, label]) => (
                <div key={field} className="space-y-0.5">
                  <label className="block text-[9px] text-muted-foreground/70 uppercase tracking-wide">{label}</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={typeof caption[field] === "number" ? caption[field] : ""}
                    className="h-6 text-xs px-1.5"
                    onChange={(e) => onChange({ ...caption, [field]: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Words */}
        <Collapsible open={wordsOpen} onOpenChange={setWordsOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {wordsOpen ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
            <span className="uppercase tracking-wide font-medium">Words</span>
            <span className="ml-1 text-muted-foreground/50">({words.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {words.length === 0 ? (
              <p className="mt-1.5 text-[10px] text-muted-foreground/50">No words</p>
            ) : (
              <div className="mt-1.5 space-y-0.5">
                <div className="flex items-center gap-1 px-1.5 text-[9px] text-muted-foreground/50 uppercase tracking-wide">
                  <span className="w-5 text-center">#</span>
                  <span className="flex-1">text</span>
                  <span className="w-16 text-center">abs start</span>
                  <span className="w-4" />
                  <span className="w-16 text-center">abs end</span>
                  <span className="w-8 text-right">conf</span>
                </div>
                {words.map((word, wi) => (
                  <WordEditor
                    key={word.id ?? wi}
                    word={word}
                    index={wi}
                    onChange={(updated) => {
                      const next = [...words];
                      next[wi] = updated;
                      onChange({ ...caption, words: next });
                    }}
                  />
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Metadata */}
        <Collapsible open={metaOpen} onOpenChange={setMetaOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {metaOpen ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
            <span className="uppercase tracking-wide font-medium">Metadata</span>
            {hasMetadata && <span className="ml-1 text-muted-foreground/50">({Object.keys(metadata).length})</span>}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <MetadataEditor
              metadata={metadata}
              onChange={(newMeta) => onChange({ ...caption, metadata: newMeta })}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

// ─── Active items panel ────────────────────────────────────────────────────────

interface ActiveItemsPanelProps {
  reference: ReferenceItem;
  activeIndices: Set<number>;
  currentTimeSec: number;
  onItemChange: (index: number, newItem: any) => void;
  /** Full-array replace for medias smart edits (add/delete/reorder mapping). */
  onMediasArrayChange?: (nextArray: any[]) => void;
}

function syncActiveMediasToFull(
  fullItems: any[],
  sortedIndices: number[],
  prevActive: any[],
  nextActive: any[],
): any[] {
  const sorted = sortedIndices;
  const result = [...fullItems];

  if (nextActive.length === prevActive.length) {
    nextActive.forEach((item, i) => {
      if (item !== prevActive[i]) {
        result[sorted[i]] = item;
      }
    });
    return result;
  }

  if (nextActive.length === prevActive.length - 1) {
    // Delete keeps object identity for remaining items
    const nextRefs = new Set(nextActive);
    const deletedLocal = prevActive.findIndex((p) => !nextRefs.has(p));
    if (deletedLocal >= 0) {
      result.splice(sorted[deletedLocal], 1);
    }
    return result;
  }

  if (nextActive.length > prevActive.length) {
    for (let i = 0; i < prevActive.length; i++) {
      if (nextActive[i] !== prevActive[i]) {
        result[sorted[i]] = nextActive[i];
      }
    }
    result.push(...nextActive.slice(prevActive.length));
    return result;
  }

  // Fallback: rewrite mapped slots then drop trailing active originals
  for (let i = 0; i < Math.min(nextActive.length, sorted.length); i++) {
    result[sorted[i]] = nextActive[i];
  }
  for (let i = sorted.length - 1; i >= nextActive.length; i--) {
    result.splice(sorted[i], 1);
  }
  return result;
}

function ActiveItemsPanel({
  reference,
  activeIndices,
  currentTimeSec,
  onItemChange,
  onMediasArrayChange,
}: ActiveItemsPanelProps) {
  if (activeIndices.size === 0) return null;

  const sortedIndices = Array.from(activeIndices).sort((a, b) => a - b);

  if (reference.type === "captions") {
    const captions: any[] = reference.value?.captions ?? [];
    const total = captions.length;

    return (
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Active at {currentTimeSec.toFixed(2)}s
        </p>
        {sortedIndices.map((index) => {
          const caption = captions[index];
          if (!caption) return null;
          return (
            <CaptionItemEditor
              key={index}
              caption={caption}
              index={index}
              totalCount={total}
              onChange={(updated) => onItemChange(index, updated)}
            />
          );
        })}
      </div>
    );
  }

  if (reference.type === "objects") {
    const items: any[] = Array.isArray(reference.value) ? reference.value : [];
    return (
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Active at {currentTimeSec.toFixed(2)}s
        </p>
        {sortedIndices.map((index) => {
          const item = items[index];
          if (item === undefined) return null;
          return (
            <div key={index} className="rounded-md border bg-muted/10 p-2.5">
              <span className="text-[10px] font-mono text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">#{index} of {items.length}</span>
              <pre className="text-[10px] text-muted-foreground mt-2 overflow-x-auto">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          );
        })}
      </div>
    );
  }

  if (reference.type === "medias") {
    const items: any[] = Array.isArray(reference.value) ? reference.value : [];
    const activeItems = sortedIndices
      .map((index) => items[index])
      .filter((item) => item !== undefined && item !== null);

    return (
      <div className="space-y-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Active at {currentTimeSec.toFixed(2)}s
          <span className="text-muted-foreground/60 normal-case font-normal">
            ({activeItems.length} of {items.length})
          </span>
        </p>
        <MediasGroupField
          value={activeItems}
          itemSchema={z.toJSONSchema(mediaItemSchema)}
          onChange={(nextActive) => {
            const nextFull = syncActiveMediasToFull(
              items,
              sortedIndices,
              activeItems,
              nextActive,
            );
            onMediasArrayChange?.(nextFull);
          }}
        />
      </div>
    );
  }

  if (reference.type === "media") {
    const item = reference.value;
    if (!item) return null;
    return (
      <div className="space-y-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Active at {currentTimeSec.toFixed(2)}s
        </p>
        <MediasGroupField
          value={[item]}
          singular
          itemSchema={z.toJSONSchema(mediaItemSchema)}
          onChange={(next) => {
            onItemChange(0, next[0] ?? { src: "" });
          }}
        />
      </div>
    );
  }

  return null;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ReferenceProps({ reference, timeline, referenceIndex }: ReferencePropsPanelProps) {
  const { getEditedTimeline, updateTimeline } = useTimelineEditsStore();
  const { generateOutput, isGenerating, generationProgress } = useCompileStore();
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);
  const currentFrame = useLayerStateStore((s) => s.currentFrame);
  const [activeTab, setActiveTab] = useState<"smart" | "full" | "json">("smart");
  const [filterActive, setFilterActive] = useState(true);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [editedKey, setEditedKey] = useState(reference.key || "");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editedTimeline = getEditedTimeline(timeline.id);
  const displayTimeline = editedTimeline || timeline;
  const references = displayTimeline.defaultData?.references || [];
  const selectedReference = references[referenceIndex] || reference;

  const fps = calculatedMetadata?.fps ?? 30;
  const currentTimeSec = currentFrame / fps;
  const referenceTypeOptions = useMemo(() => getReferenceTypeOptions(), []);

  useEffect(() => {
    setEditedKey(selectedReference?.key || "");
    setIsEditingKey(false);
  }, [selectedReference?.key, referenceIndex]);

  // ─── Compute active data item IDs at current frame ──────────────────────────

  const dataItemIdsMap = useMemo(
    () => buildDataItemIdsMap(calculatedMetadata?.props?.childrenData),
    [calculatedMetadata?.props?.childrenData]
  );

  const flatLayers = useMemo(() => {
    const childrenData = calculatedMetadata?.props?.childrenData;
    if (!childrenData) return [];
    const w = calculatedMetadata?.width ?? 1920;
    const h = calculatedMetadata?.height ?? 1080;
    try {
      const all = filterEditableLayers(
        flattenLayers(childrenData as any, { fps, compositionWidth: w, compositionHeight: h })
      );
      return filterLeafLayers(all);
    } catch {
      return [];
    }
  }, [calculatedMetadata, fps]);

  const activeIndices = useMemo(() => {
    const indices = new Set<number>();
    const refKey = selectedReference?.key;
    if (!refKey) return indices;

    for (const layer of flatLayers) {
      const start = layer.timing.startInFrames ?? 0;
      const dur = layer.timing.durationInFrames;
      const isActive = dur === undefined || (currentFrame >= start && currentFrame < start + dur);
      if (!isActive) continue;

      const layerIds = dataItemIdsMap.get(layer.id);
      if (!layerIds) continue;

      for (const id of layerIds) {
        const parsed = parseDataItemId(id);
        if (parsed && parsed.key === refKey) {
          indices.add(parsed.index);
        } else if (id === refKey) {
          // Singular media / bare key reference
          indices.add(0);
        }
      }
    }

    return indices;
  }, [flatLayers, currentFrame, dataItemIdsMap, selectedReference?.key]);

  const hasActiveItems = activeIndices.size > 0;
  const isSmartFilterType = ["captions", "objects", "medias", "media"].includes(
    selectedReference?.type ?? "",
  );

  // ─── onChange handlers ────────────────────────────────────────────────────────

  const scheduleRecompile = useCallback(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      const latestEdited = useTimelineEditsStore.getState().getEditedTimeline(timeline.id);
      generateOutput(latestEdited || timeline);
    }, 700);
  }, [generateOutput, timeline]);

  // Read from store at call time — avoids stale closure when edits fire in rapid succession.
  const onReferenceChange = useCallback(
    (newDefaultData: DefaultPresetData) => {
      const updatedReference = newDefaultData.references[0];
      if (!updatedReference) return;

      // Always read the freshest version of the timeline from the store.
      const latestTimeline =
        useTimelineEditsStore.getState().getEditedTimeline(timeline.id) || timeline;
      const currentReferences = latestTimeline.defaultData?.references || [];
      if (!currentReferences[referenceIndex]) return;

      const nextReferences = [...currentReferences];
      const oldKey = currentReferences[referenceIndex]?.key;
      nextReferences[referenceIndex] = { ...nextReferences[referenceIndex], ...updatedReference };
      const newKey = nextReferences[referenceIndex]?.key;
      const keyMapping = oldKey && newKey && oldKey !== newKey ? { [oldKey]: newKey } : {};

      const migratedPresets =
        Object.keys(keyMapping).length > 0
          ? (latestTimeline.presets || []).map((preset) => ({
              ...preset,
              presetInputData: remapDataReferenceKeys(preset.presetInputData || {}, keyMapping),
            }))
          : latestTimeline.presets;

      updateTimeline(timeline.id, {
        defaultData: { ...(latestTimeline.defaultData || {}), references: nextReferences },
        ...(migratedPresets ? { presets: migratedPresets } : {}),
      });

      scheduleRecompile();
    },
    // Only stable identifiers in deps — no displayTimeline/selectedReference.
    [referenceIndex, timeline, updateTimeline, scheduleRecompile]
  );

  const handleKeySave = useCallback(() => {
    const nextKey = editedKey.trim();
    if (!selectedReference) {
      setIsEditingKey(false);
      return;
    }
    if (nextKey && nextKey !== selectedReference.key) {
      onReferenceChange({
        references: [{ ...selectedReference, key: nextKey }],
      });
    } else {
      setEditedKey(selectedReference.key || "");
    }
    setIsEditingKey(false);
  }, [editedKey, selectedReference, onReferenceChange]);

  const handleKeyCancel = useCallback(() => {
    setEditedKey(selectedReference?.key || "");
    setIsEditingKey(false);
  }, [selectedReference?.key]);

  const handleTypeChange = useCallback(
    (nextType: ReferenceItem["type"]) => {
      if (!selectedReference || selectedReference.type === nextType) return;
      const defaultDataType = getDefaultDataTypeForReferenceType(nextType);
      onReferenceChange({
        references: [
          {
            ...selectedReference,
            type: nextType,
            dataType: defaultDataType?.id,
            value: getDefaultValueForReferenceType(nextType),
          },
        ],
      });
    },
    [selectedReference, onReferenceChange],
  );

  /**
   * Called when the user edits an active item (caption, object, media) at a specific index.
   * Reads the latest reference from the store at call time so rapid edits don't overwrite each other.
   */
  const handleActiveItemChange = useCallback(
    (index: number, newItem: any) => {
      // Read freshest reference value directly from the store.
      const latestTimeline =
        useTimelineEditsStore.getState().getEditedTimeline(timeline.id) || timeline;
      const latestReferences = latestTimeline.defaultData?.references || [];
      const ref = latestReferences[referenceIndex] || reference;
      if (!ref) return;

      let newValue = ref.value;

      if (ref.type === "captions") {
        const captions: any[] = ref.value?.captions ? [...ref.value.captions] : [];
        captions[index] = newItem;
        newValue = { ...ref.value, captions };
      } else if (ref.type === "objects" || ref.type === "medias") {
        const items: any[] = Array.isArray(ref.value) ? [...ref.value] : [];
        items[index] = newItem;
        newValue = items;
      } else if (ref.type === "media") {
        newValue = newItem;
      }

      onReferenceChange({ references: [{ ...ref, value: newValue }] });
    },
    [referenceIndex, reference, timeline, onReferenceChange]
  );

  const handleMediasArrayChange = useCallback(
    (nextArray: any[]) => {
      const latestTimeline =
        useTimelineEditsStore.getState().getEditedTimeline(timeline.id) || timeline;
      const latestReferences = latestTimeline.defaultData?.references || [];
      const ref = latestReferences[referenceIndex] || reference;
      if (!ref) return;
      onReferenceChange({ references: [{ ...ref, value: nextArray }] });
    },
    [referenceIndex, reference, timeline, onReferenceChange],
  );

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  const title = selectedReference?.key || `reference_${referenceIndex + 1}`;
  const referenceType = selectedReference?.type || "object";
  const selectedDefaultData: DefaultPresetData = {
    references: selectedReference ? [selectedReference] : [],
  };

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Reference Properties</h3>
              {isGenerating && (
                <div className="text-xs text-muted-foreground">
                  Generating… {generationProgress}%
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isEditingKey ? (
                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <Input
                    value={editedKey}
                    onChange={(e) => setEditedKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleKeySave();
                      if (e.key === "Escape") handleKeyCancel();
                    }}
                    className="text-md font-semibold h-8"
                    autoFocus
                    placeholder="Reference key"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleKeySave}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleKeyCancel}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <h3
                  className="text-md font-semibold cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -ml-2"
                  onClick={() => setIsEditingKey(true)}
                  title="Click to edit reference name"
                >
                  {title}
                </h3>
              )}
              <Select
                value={referenceType}
                onValueChange={(val) => handleTypeChange(val as ReferenceItem["type"])}
              >
                <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {referenceTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedReference?.key && (
              <LinkedActionsSection
                timeline={displayTimeline}
                target={{ type: "reference", referenceKey: selectedReference.key }}
              />
            )}
          </div>

          <Separator className="my-4" />

          {/* Tabs */}
          <div className="space-y-3">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "smart" | "full" | "json")}
              className="w-full"
            >
              <div className="flex items-center gap-2">
                <TabsList className="grid grid-cols-3 flex-1">
                  <TabsTrigger value="smart" className="text-xs">Smart</TabsTrigger>
                  <TabsTrigger value="full" className="text-xs">Full</TabsTrigger>
                  <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
                </TabsList>

                {/* Active filter toggle — only in Smart tab for array / media types */}
                {isSmartFilterType && activeTab === "smart" && (
                  <Button
                    variant={filterActive ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs gap-1 shrink-0 px-2"
                    onClick={() => setFilterActive((v) => !v)}
                    title="Filter to items active at the current playhead position"
                  >
                    <Clock className="h-3 w-3" />
                    {filterActive
                      ? hasActiveItems
                        ? `${activeIndices.size} active`
                        : "0 active"
                      : "All"}
                  </Button>
                )}
              </div>

              {/* Smart tab */}
              <TabsContent value="smart" className="mt-3">
                {isSmartFilterType && filterActive ? (
                  hasActiveItems ? (
                    <ActiveItemsPanel
                      reference={selectedReference}
                      activeIndices={activeIndices}
                      currentTimeSec={currentTimeSec}
                      onItemChange={handleActiveItemChange}
                      onMediasArrayChange={handleMediasArrayChange}
                    />
                  ) : (
                    <div className="rounded-md border border-dashed p-4 text-center">
                      <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">
                        No items active at {currentTimeSec.toFixed(2)}s
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Scrub the video or click "All" to see every item.
                      </p>
                    </div>
                  )
                ) : (
                  <DefaultCard
                    defaultData={selectedDefaultData}
                    onDefaultDataChange={onReferenceChange}
                    isExpanded={true}
                    singleReferenceMode={true}
                    hideIdentityFields={true}
                  />
                )}
              </TabsContent>

              <TabsContent value="full" className="mt-3">
                <DefaultCard
                  defaultData={selectedDefaultData}
                  onDefaultDataChange={onReferenceChange}
                  isExpanded={true}
                  singleReferenceMode={true}
                  hideIdentityFields={true}
                />
              </TabsContent>

              <TabsContent value="json" className="mt-3">
                <JsonEditor
                  value={selectedReference?.value ?? null}
                  onChange={(val) => {
                    if (!selectedReference) return;
                    onReferenceChange({
                      references: [{ ...selectedReference, value: val }],
                    });
                  }}
                  height="420px"
                  className="border rounded-md"
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
