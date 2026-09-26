"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { DefaultCard } from "@/components/editor/presets/form/default-card";
import { remapDataReferenceKeys } from "@/components/editor/presets/engine/preset-data-mutation";
import type { DefaultPresetData, ReferenceItem } from "@/components/editor/presets/types";
import type { Timeline } from "../../../../stores/project-store";
import { useTimelineEditsStore } from "../../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../../stores/compile-store";
import { useLayerStateStore } from "../../../../stores/layer-state-store";
import { flattenLayers, filterEditableLayers, filterLeafLayers } from "@/lib/editor/flatten-layers";
import { Clock, Plus, X, Check, FileAudio, Save, Loader2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { z } from "zod";
import { LinkedActionsSection } from "@/components/editor/presets/actions/form/ActionSection";
import { CaptionItemEditor } from "@/components/editor/captions/caption-item-editor";
import { FullCaptionsEditor } from "@/components/editor/captions/full-captions-editor";
import { TranscriptionPicker } from "@/components/transcriber/picker/transcription-picker";
import type { Caption, Transcription } from "@/app/types/transcription";
import { generateId } from "@microfox/datamotion";
import { toast } from "sonner";

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

/** Default blank caption: 3 words × 1s, line duration 3s. */
function createBlankHelloCaptions(): Caption[] {
  const words = ["Hello", "world", "friend"];
  const captionWords = words.map((text, i) => ({
    id: generateId(),
    text,
    start: i,
    end: i + 1,
    absoluteStart: i,
    absoluteEnd: i + 1,
    duration: 1,
    confidence: 1,
  }));
  return [
    {
      id: generateId(),
      text: words.join(" "),
      absoluteStart: 0,
      absoluteEnd: 3,
      start: 0,
      end: 3,
      duration: 3,
      words: captionWords,
      metadata: {},
    },
  ];
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
              defaultMetaOpen
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
  const seekToFrame = useLayerStateStore((s) => s.seekToFrame);
  const [activeTab, setActiveTab] = useState<"smart" | "form" | "full" | "json">("smart");
  const [filterActive, setFilterActive] = useState(true);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [editedKey, setEditedKey] = useState(reference.key || "");
  const [showCaptionsPicker, setShowCaptionsPicker] = useState(false);
  const [isSavingCaptions, setIsSavingCaptions] = useState(false);
  const [isCreatingBlank, setIsCreatingBlank] = useState(false);
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

      const migratedActions =
        Object.keys(keyMapping).length > 0
          ? (latestTimeline.actions || []).map((action) => {
            if (
              action.target?.type === "reference" &&
              oldKey &&
              action.target.referenceKey === oldKey &&
              newKey
            ) {
              return {
                ...action,
                target: { type: "reference" as const, referenceKey: newKey },
              };
            }
            return action;
          })
          : latestTimeline.actions;

      updateTimeline(timeline.id, {
        defaultData: { ...(latestTimeline.defaultData || {}), references: nextReferences },
        ...(migratedPresets ? { presets: migratedPresets } : {}),
        ...(migratedActions ? { actions: migratedActions } : {}),
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

  const linkedTranscriptionId =
    selectedReference?.type === "captions" && selectedReference?.value?._id
      ? String(selectedReference.value._id)
      : null;

  const handleSaveCaptionsToDatabase = useCallback(async () => {
    if (!selectedReference || selectedReference.type !== "captions") return;
    const id = selectedReference.value?._id;
    if (!id) {
      toast.error("Link a transcription before saving");
      return;
    }
    setIsSavingCaptions(true);
    try {
      const response = await fetch(`/api/transcriptions/${id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          captions: selectedReference.value?.captions ?? [],
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save captions");
      }
      toast.success("Captions saved successfully");
    } catch (error) {
      toast.error(
        `Failed to save captions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSavingCaptions(false);
    }
  }, [selectedReference]);

  const handleCreateBlankCaptions = useCallback(async () => {
    if (!selectedReference || selectedReference.type !== "captions") return;
    setIsCreatingBlank(true);
    try {
      const captions = createBlankHelloCaptions();
      const response = await fetch("/api/transcriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blank: true,
          title: "Untitled Captions",
          status: "completed",
          tags: ["blank"],
          captions,
          audioUrl: "",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create transcription");
      }
      const result = await response.json();
      const created = result.transcription as Transcription;
      onReferenceChange({
        references: [
          {
            ...selectedReference,
            value: {
              captions: created.captions ?? captions,
              _id: created._id?.toString() ?? "",
            },
          },
        ],
      });
      toast.success("Blank captions created and linked");
    } catch (error) {
      toast.error(
        `Failed to create blank captions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsCreatingBlank(false);
    }
  }, [selectedReference, onReferenceChange]);

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
              {referenceType === "captions" && selectedReference && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs shrink-0 px-2"
                        disabled={isCreatingBlank}
                        title="Create new captions transcription"
                      >
                        {isCreatingBlank ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        Create
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[180px]">
                      <DropdownMenuItem
                        onClick={() => void handleCreateBlankCaptions()}
                      >
                        From Blank
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        From Audio to Text
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        From Text to Audio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs shrink-0 px-2"
                    onClick={() => setShowCaptionsPicker(true)}
                    title="Link captions from a transcription"
                  >
                    <FileAudio className="h-3.5 w-3.5" />
                    Link
                  </Button>
                  {linkedTranscriptionId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs shrink-0 px-2"
                      onClick={() => void handleSaveCaptionsToDatabase()}
                      disabled={isSavingCaptions}
                      title="Sync caption metadata to the linked transcription"
                    >
                      {isSavingCaptions ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Save
                    </Button>
                  )}
                  {showCaptionsPicker && (
                    <TranscriptionPicker
                      open={showCaptionsPicker}
                      onClose={() => setShowCaptionsPicker(false)}
                      onSelect={(transcription: Transcription) => {
                        onReferenceChange({
                          references: [
                            {
                              ...selectedReference,
                              value: {
                                captions: transcription.captions,
                                _id: transcription._id?.toString() ?? "",
                              },
                            },
                          ],
                        });
                        setShowCaptionsPicker(false);
                      }}
                    />
                  )}
                </>
              )}
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
              onValueChange={(v) => setActiveTab(v as "smart" | "form" | "full" | "json")}
              className="w-full"
            >
              <div className="flex items-center gap-2">
                <TabsList className="grid grid-cols-4 flex-1">
                  <TabsTrigger value="smart" className="text-xs">Smart</TabsTrigger>
                  <TabsTrigger value="form" className="text-xs">Form</TabsTrigger>
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

              <TabsContent value="form" className="mt-3">
                <DefaultCard
                  defaultData={selectedDefaultData}
                  onDefaultDataChange={onReferenceChange}
                  isExpanded={true}
                  singleReferenceMode={true}
                  hideIdentityFields={true}
                />
              </TabsContent>

              <TabsContent value="full" className="mt-3">
                {referenceType === "captions" ? (
                  <FullCaptionsEditor
                    captions={
                      Array.isArray(selectedReference?.value?.captions)
                        ? selectedReference.value.captions
                        : []
                    }
                    currentTimeSec={currentTimeSec}
                    onSeek={(timeSec) => {
                      seekToFrame(Math.max(0, Math.round(timeSec * fps)));
                    }}
                    onChange={(nextCaptions) => {
                      if (!selectedReference) return;
                      onReferenceChange({
                        references: [
                          {
                            ...selectedReference,
                            value: {
                              ...selectedReference.value,
                              captions: nextCaptions,
                            },
                          },
                        ],
                      });
                    }}
                  />
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-center">
                    <p className="text-xs text-muted-foreground">
                      Full editor is available for captions references
                    </p>
                  </div>
                )}
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
