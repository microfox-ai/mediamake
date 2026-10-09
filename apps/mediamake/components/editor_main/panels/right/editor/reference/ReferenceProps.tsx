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
import { useEditorStore } from "../../../../stores/editor-store";
import { useCompileStore } from "../../../../stores/compile-store";
import { useLayerStateStore } from "../../../../stores/layer-state-store";
import { flattenLayers, filterEditableLayers, filterLeafLayers } from "@/lib/editor/flatten-layers";
import { Clock, Plus, X, Check, Save, Loader2, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlayerRefStore } from "../../../../stores/player-ref-store";
import { isEditableKeyboardTarget } from "../../../../stores/block-clipboard-store";
import {
  NEXT_CAPTION_SHORTCUT,
  PREV_CAPTION_SHORTCUT,
  captionEndSec,
  useCaptionTrackSelection,
} from "../../../../stores/caption-track-selection";
import { LinkedActionsSection } from "@/components/editor/presets/actions/form/ActionSection";
import { CaptionItemEditor } from "@/components/editor/captions/caption-item-editor";
import { FullCaptionsEditor } from "@/components/editor/captions/full-captions-editor";
import { TranscriptionPicker } from "@/components/transcriber/picker/transcription-picker";
import { CaptionPicker } from "@/components/editor/captions/caption-picker";
import { ParagraphCaptionsDialog } from "@/components/editor/captions/paragraph-captions-dialog";
import { AudioToTextDialog } from "@/components/editor/captions/audio-to-text-dialog";
import type { Caption, CaptionsDocument, Transcription } from "@/app/types/transcription";
import {
  captionTitleFromSource,
  captionsDocumentId,
  captionsReferenceValue,
  createCaptionsDocument,
  getCaptionsDocument,
  updateCaptionsDocument,
} from "@/lib/captions/captions-client";
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
  /** When set, the panel shows the timeline selection instead of playhead-active items. */
  selectionMode?: boolean;
  onStepCaption?: (direction: -1 | 1) => void;
  canStepPrev?: boolean;
  canStepNext?: boolean;
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

function CaptionStepButton({
  direction,
  disabled,
  onClick,
}: {
  direction: -1 | 1;
  disabled?: boolean;
  onClick: () => void;
}) {
  const shortcut = direction < 0 ? PREV_CAPTION_SHORTCUT : NEXT_CAPTION_SHORTCUT;
  const label = direction < 0 ? "Previous caption" : "Next caption";
  const Icon = direction < 0 ? ChevronLeft : ChevronRight;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            disabled={disabled}
            onClick={onClick}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label} ({shortcut})
      </TooltipContent>
    </Tooltip>
  );
}

function ActiveItemsPanel({
  reference,
  activeIndices,
  currentTimeSec,
  selectionMode = false,
  onStepCaption,
  canStepPrev = false,
  canStepNext = false,
  onItemChange,
  onMediasArrayChange,
}: ActiveItemsPanelProps) {
  if (activeIndices.size === 0) return null;

  const sortedIndices = Array.from(activeIndices).sort((a, b) => a - b);

  if (reference.type === "captions") {
    const captions: any[] = reference.value?.captions ?? [];
    const total = captions.length;
    const timeLabel = `${currentTimeSec.toFixed(3)}s`;

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-[1.5rem_1fr_1.5rem] items-center">
          <CaptionStepButton
            direction={-1}
            disabled={!canStepPrev}
            onClick={() => onStepCaption?.(-1)}
          />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center justify-center gap-1 text-center">
            <Clock className="h-3 w-3" />
            {selectionMode ? "Selected" : "Active"} at {timeLabel}
          </p>
          <CaptionStepButton
            direction={1}
            disabled={!canStepNext}
            onClick={() => onStepCaption?.(1)}
          />
        </div>
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
  const [activeTab, setActiveTab] = useState<"smart" | "info" | "full" | "json">("smart");
  const [filterActive, setFilterActive] = useState(true);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [editedKey, setEditedKey] = useState(reference.key || "");
  const [showTranscriptionPicker, setShowTranscriptionPicker] = useState(false);
  const [showCaptionPicker, setShowCaptionPicker] = useState(false);
  const [showParagraphDialog, setShowParagraphDialog] = useState(false);
  const [showAudioToText, setShowAudioToText] = useState(false);
  const [isSavingCaptions, setIsSavingCaptions] = useState(false);
  const [captionsSyncFailed, setCaptionsSyncFailed] = useState(false);
  const [isCreatingBlank, setIsCreatingBlank] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const captionsSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedCaptionsKeyRef = useRef<string | null>(null);
  const captionsSaveGenRef = useRef(0);

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

    // Captions: use caption absolute timing directly — more reliable than
    // compiled _dataItemIds (preset tags often use a different key / broken template).
    if (selectedReference?.type === "captions") {
      const captions = selectedReference.value?.captions;
      if (Array.isArray(captions)) {
        captions.forEach((c: any, i: number) => {
          const start = Number(c?.absoluteStart ?? c?.start ?? 0) || 0;
          let end = Number(c?.absoluteEnd ?? c?.end ?? start) || start;
          if (end <= start) end = start + 0.05;
          if (currentTimeSec >= start && currentTimeSec < end) {
            indices.add(i);
          }
        });
      }
      return indices;
    }

    for (const layer of flatLayers) {
      const start = layer.timing.startInFrames ?? 0;
      const dur = layer.timing.durationInFrames;
      const isActive =
        dur === undefined ||
        (currentFrame >= start && currentFrame < start + dur);
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
  }, [
    flatLayers,
    currentFrame,
    currentTimeSec,
    dataItemIdsMap,
    selectedReference?.key,
    selectedReference?.type,
    selectedReference?.value,
  ]);

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
      const previous = currentReferences[referenceIndex];
      let mergedReference = { ...previous, ...updatedReference };
      if (
        previous?.type === "captions" &&
        mergedReference.value &&
        typeof mergedReference.value === "object" &&
        !Array.isArray(mergedReference.value)
      ) {
        const prevValue = previous.value ?? {};
        const nextValue = mergedReference.value;
        const prevId = captionsDocumentId(prevValue._id);
        const nextId = captionsDocumentId(nextValue._id);
        const sourceId =
          captionsDocumentId(nextValue.sourceTranscriptionId) ||
          captionsDocumentId(prevValue.sourceTranscriptionId);
        mergedReference = {
          ...mergedReference,
          value: {
            ...nextValue,
            ...(prevId && !nextId ? { _id: prevId } : nextId ? { _id: nextId } : {}),
            ...(sourceId ? { sourceTranscriptionId: sourceId } : {}),
          },
        };
      }
      nextReferences[referenceIndex] = mergedReference;
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

  const linkedCaptionsId =
    selectedReference?.type === "captions"
      ? captionsDocumentId(selectedReference?.value?._id) || null
      : null;

  const captionsSyncKey = useMemo(() => {
    const id =
      selectedReference?.type === "captions"
        ? captionsDocumentId(selectedReference.value?._id)
        : "";
    if (!id) {
      return "";
    }
    const value = selectedReference.value;
    return JSON.stringify({
      id,
      title: value.title ?? "",
      description: value.description ?? "",
      captions: value.captions ?? [],
    });
  }, [selectedReference]);

  const readLatestCaptionsValue = useCallback(() => {
    const latestTimeline =
      useTimelineEditsStore.getState().getEditedTimeline(timeline.id) || timeline;
    const ref = latestTimeline.defaultData?.references?.[referenceIndex];
    if (!ref || ref.type !== "captions") return null;
    return ref.value ?? null;
  }, [timeline, referenceIndex]);

  const bindCaptionsDocument = useCallback(
    (doc: CaptionsDocument, fallbackCaptions?: Caption[]) => {
      const latestTimeline =
        useTimelineEditsStore.getState().getEditedTimeline(timeline.id) || timeline;
      const ref = latestTimeline.defaultData?.references?.[referenceIndex];
      if (!ref || ref.type !== "captions") return;
      const value = captionsReferenceValue(doc, fallbackCaptions);
      if (!value._id) {
        throw new Error("Captions document is missing an id");
      }
      lastSavedCaptionsKeyRef.current = JSON.stringify({
        id: value._id,
        title: value.title ?? "",
        description: value.description ?? "",
        captions: value.captions ?? [],
      });
      setCaptionsSyncFailed(false);
      onReferenceChange({
        references: [{ ...ref, value }],
      });
      const latest =
        useTimelineEditsStore.getState().getEditedTimeline(timeline.id) || timeline;
      const saved = latest.defaultData?.references?.[referenceIndex];
      if (saved) {
        useEditorStore.getState().selectReference(saved, latest, referenceIndex);
      }
    },
    [timeline, referenceIndex, onReferenceChange],
  );

  const handleSaveCaptionsToDatabase = useCallback(async (manual = false) => {
    const value = readLatestCaptionsValue();
    const id = captionsDocumentId(value?._id);
    if (!id) {
      if (manual) toast.error("Create or link captions before saving");
      return;
    }
    const payload = {
      title: value.title ?? "",
      description: value.description ?? "",
      captions: value.captions ?? [],
    };
    const snapshotKey = JSON.stringify({ id, ...payload });
    const gen = ++captionsSaveGenRef.current;
    setIsSavingCaptions(true);
    try {
      try {
        await updateCaptionsDocument(id, payload);
      } catch (error) {
        const missing =
          error instanceof Error && error.message === "Captions not found";
        if (!missing) throw error;
        const created = await createCaptionsDocument({
          ...payload,
          sourceTranscriptionId: captionsDocumentId(value.sourceTranscriptionId) || id,
        });
        if (gen !== captionsSaveGenRef.current) return;
        bindCaptionsDocument(created, payload.captions);
        if (manual) toast.success("Saved as a new captions document");
        return;
      }
      if (gen !== captionsSaveGenRef.current) return;
      lastSavedCaptionsKeyRef.current = snapshotKey;
      setCaptionsSyncFailed(false);
      if (manual) toast.success("Captions saved");
    } catch (error) {
      if (gen !== captionsSaveGenRef.current) return;
      setCaptionsSyncFailed(prev => {
        if (!prev || manual) {
          toast.error(
            `Failed to save captions: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
        return true;
      });
    } finally {
      if (gen === captionsSaveGenRef.current) setIsSavingCaptions(false);
    }
  }, [readLatestCaptionsValue, bindCaptionsDocument]);

  const handleCreateCaptions = useCallback(
    async (
      body: {
        title?: string;
        description?: string;
        captions?: Caption[];
        sourceTranscriptionId?: string;
        sourceCaptionsId?: string;
        projectId?: string;
      },
      successMessage: string,
    ) => {
      setIsCreatingBlank(true);
      try {
        const created = await createCaptionsDocument({
          ...body,
          projectId: body.projectId || timeline.projectId,
        });
        bindCaptionsDocument(created, body.captions);
        toast.success(successMessage);
      } catch (error) {
        toast.error(
          `Failed to create captions: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        setIsCreatingBlank(false);
      }
    },
    [bindCaptionsDocument, timeline.projectId],
  );

  const handleCreateBlankCaptions = useCallback(() => {
    const captions = createBlankHelloCaptions();
    return handleCreateCaptions(
      { title: "Untitled Captions", description: "", captions },
      "Blank captions created",
    );
  }, [handleCreateCaptions]);

  const handleLinkTranscription = useCallback(
    (transcription: Transcription) => {
      const id = captionsDocumentId(transcription._id);
      return handleCreateCaptions(
        {
          title: captionTitleFromSource(transcription.title),
          description: transcription.description || "",
          captions: transcription.captions ?? [],
          sourceTranscriptionId: id || undefined,
          projectId: transcription.projectId || timeline.projectId,
        },
        "Caption version created from transcription",
      );
    },
    [handleCreateCaptions, timeline.projectId],
  );

  const handleLinkCaption = useCallback(
    (doc: CaptionsDocument) => {
      setShowCaptionPicker(false);
      return handleCreateCaptions(
        {
          title: captionTitleFromSource(doc.title),
          description: doc.description || "",
          captions: doc.captions ?? [],
          sourceCaptionsId: captionsDocumentId(doc._id) || undefined,
          sourceTranscriptionId:
            captionsDocumentId(doc.sourceTranscriptionId) || undefined,
          projectId: doc.projectId || timeline.projectId,
        },
        "Caption linked",
      );
    },
    [handleCreateCaptions, timeline.projectId],
  );

  useEffect(() => {
    const saved = lastSavedCaptionsKeyRef.current;
    if (saved && linkedCaptionsId) {
      try {
        const parsed = JSON.parse(saved) as { id?: string };
        if (parsed.id === linkedCaptionsId) return;
      } catch {
        // Snapshot is unreadable — treat this as a new document.
      }
    }
    lastSavedCaptionsKeyRef.current = null;
    setCaptionsSyncFailed(false);
  }, [linkedCaptionsId, referenceIndex]);

  useEffect(() => {
    if (!linkedCaptionsId) return;
    let cancelled = false;
    void (async () => {
      try {
        const doc = await getCaptionsDocument(linkedCaptionsId);
        if (cancelled) return;
        const latestTimeline =
          useTimelineEditsStore.getState().getEditedTimeline(timeline.id) || timeline;
        const ref = latestTimeline.defaultData?.references?.[referenceIndex];
        if (!ref || ref.type !== "captions") return;
        const latest = ref.value ?? {};
        if (String(latest._id ?? "") !== linkedCaptionsId) return;

        const localTitle = typeof latest.title === "string" ? latest.title : "";
        const localDescription =
          typeof latest.description === "string" ? latest.description : "";
        const nextTitle = localTitle.trim() ? localTitle : (doc.title ?? "");
        const nextDescription = localDescription.trim()
          ? localDescription
          : (doc.description ?? "");
        if (nextTitle === localTitle && nextDescription === localDescription) return;

        const nextValue = {
          ...latest,
          title: nextTitle,
          description: nextDescription,
        };
        lastSavedCaptionsKeyRef.current = JSON.stringify({
          id: linkedCaptionsId,
          title: nextTitle,
          description: nextDescription,
          captions: nextValue.captions ?? [],
        });
        onReferenceChange({
          references: [{ ...ref, value: nextValue }],
        });
      } catch (error) {
        console.error("Failed to load caption title and description", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedCaptionsId, referenceIndex, timeline.id]);

  useEffect(() => {
    if (!captionsSyncKey) return;
    if (lastSavedCaptionsKeyRef.current === null) {
      lastSavedCaptionsKeyRef.current = captionsSyncKey;
      return;
    }
    if (lastSavedCaptionsKeyRef.current === captionsSyncKey) return;
    if (captionsSyncTimerRef.current) clearTimeout(captionsSyncTimerRef.current);
    captionsSyncTimerRef.current = setTimeout(() => {
      void handleSaveCaptionsToDatabase(false);
    }, 800);
    return () => {
      if (captionsSyncTimerRef.current) clearTimeout(captionsSyncTimerRef.current);
    };
  }, [captionsSyncKey, handleSaveCaptionsToDatabase]);

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

  const trackSelection = useCaptionTrackSelection((s) => s.selection);
  const setTrackSelection = useCaptionTrackSelection((s) => s.setSelection);

  const selectedCaptionIndex = useMemo(() => {
    if (selectedReference?.type !== "captions" || !trackSelection) return null;
    if (trackSelection.timelineId !== displayTimeline.id) return null;
    if (trackSelection.referenceIndex !== referenceIndex) return null;
    const captions = selectedReference.value?.captions;
    if (!Array.isArray(captions)) return null;
    if (trackSelection.lineIdx < 0 || trackSelection.lineIdx >= captions.length) {
      return null;
    }
    return trackSelection.lineIdx;
  }, [trackSelection, selectedReference, displayTimeline.id, referenceIndex]);

  const captionStepOrigin = useCallback(
    (direction: -1 | 1) => {
      if (selectedCaptionIndex != null) return selectedCaptionIndex;
      const captions = selectedReference?.value?.captions;
      if (!Array.isArray(captions) || captions.length === 0) return null;
      if (activeIndices.size > 0) {
        const sorted = Array.from(activeIndices).sort((a, b) => a - b);
        return direction > 0 ? sorted[sorted.length - 1] : sorted[0];
      }
      let lastBefore = -1;
      captions.forEach((caption: { absoluteStart?: number; start?: number }, index: number) => {
        const start = Number(caption?.absoluteStart ?? caption?.start ?? 0) || 0;
        if (start <= currentTimeSec) lastBefore = index;
      });
      return lastBefore;
    },
    [selectedCaptionIndex, selectedReference, activeIndices, currentTimeSec],
  );

  const stepCaption = useCallback(
    (direction: -1 | 1) => {
      const captions = selectedReference?.value?.captions;
      if (!Array.isArray(captions) || captions.length === 0) return;
      const origin = captionStepOrigin(direction);
      if (origin == null) return;
      const next = origin + direction;
      if (next < 0 || next >= captions.length) return;

      const frame = Math.max(0, Math.round(captionEndSec(captions[next]) * fps));
      useLayerStateStore.getState().setCurrentFrame(frame);
      usePlayerRefStore.getState().playerRef.current?.seekTo(frame);
      setTrackSelection({
        timelineId: displayTimeline.id,
        referenceIndex,
        kind: "line",
        lineIdx: next,
      });
    },
    [
      selectedReference,
      captionStepOrigin,
      fps,
      setTrackSelection,
      displayTimeline.id,
      referenceIndex,
    ],
  );

  useEffect(() => {
    if (selectedReference?.type !== "captions") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (
        isEditableKeyboardTarget(event.target) ||
        isEditableKeyboardTarget(document.activeElement)
      ) {
        return;
      }
      event.preventDefault();
      stepCaption(event.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedReference?.type, stepCaption]);

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
                        title="Create a captions document"
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
                      <DropdownMenuItem
                        onClick={() => setShowParagraphDialog(true)}
                      >
                        From Paragraph
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowTranscriptionPicker(true)}
                      >
                        Link Transcription
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowCaptionPicker(true)}
                      >
                        Link Caption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowAudioToText(true)}
                      >
                        From Audio to Text
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        From Text to Audio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    variant={captionsSyncFailed ? "destructive" : "outline"}
                    size="sm"
                    className="h-8 w-8 shrink-0 p-0"
                    onClick={() => void handleSaveCaptionsToDatabase(true)}
                    disabled={isSavingCaptions}
                    title={
                      captionsSyncFailed
                        ? "Auto-sync failed. Save captions now"
                        : "Save captions"
                    }
                  >
                    {isSavingCaptions ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  {showTranscriptionPicker && (
                    <TranscriptionPicker
                      open={showTranscriptionPicker}
                      onClose={() => setShowTranscriptionPicker(false)}
                      onSelect={(transcription: Transcription) => {
                        setShowTranscriptionPicker(false);
                        void handleLinkTranscription(transcription);
                      }}
                    />
                  )}
                  <CaptionPicker
                    open={showCaptionPicker}
                    onClose={() => setShowCaptionPicker(false)}
                    onSelect={handleLinkCaption}
                  />
                  <AudioToTextDialog
                    open={showAudioToText}
                    onClose={() => setShowAudioToText(false)}
                    onCreated={transcription => {
                      setShowAudioToText(false);
                      void handleLinkTranscription(transcription);
                    }}
                  />
                  <ParagraphCaptionsDialog
                    open={showParagraphDialog}
                    onClose={() => setShowParagraphDialog(false)}
                    onCreate={captions => {
                      setShowParagraphDialog(false);
                      const title =
                        selectedReference.value?.title?.trim() ||
                        "Untitled Captions";
                      void handleCreateCaptions(
                        {
                          title,
                          description: selectedReference.value?.description ?? "",
                          captions,
                        },
                        "Captions created from paragraph",
                      );
                    }}
                  />
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
              onValueChange={(v) => setActiveTab(v as "smart" | "info" | "full" | "json")}
              className="w-full"
            >
              <div className="flex items-center gap-2">
                <TabsList className="grid grid-cols-4 flex-1">
                  <TabsTrigger value="smart" className="text-xs">Smart</TabsTrigger>
                  <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
                  <TabsTrigger value="full" className="text-xs">Full</TabsTrigger>
                  <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
                </TabsList>

                {/* Active filter toggle — only in Smart tab for array / media types */}
                {isSmartFilterType && activeTab === "smart" && (
                  selectedCaptionIndex != null ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 text-xs gap-1 shrink-0 px-2"
                      onClick={() => setTrackSelection(null)}
                      title="Clear the timeline selection and show the caption at the playhead"
                    >
                      <Clock className="h-3 w-3" />
                      1 selected
                    </Button>
                  ) : (
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
                  )
                )}
              </div>

              {/* Smart tab */}
              <TabsContent value="smart" className="mt-3">
                {isSmartFilterType && (selectedCaptionIndex != null || filterActive) ? (
                  selectedCaptionIndex != null || hasActiveItems ? (
                    <ActiveItemsPanel
                      reference={selectedReference}
                      activeIndices={
                        selectedCaptionIndex != null
                          ? new Set([selectedCaptionIndex])
                          : activeIndices
                      }
                      currentTimeSec={currentTimeSec}
                      selectionMode={selectedCaptionIndex != null}
                      onStepCaption={
                        referenceType === "captions" ? stepCaption : undefined
                      }
                      canStepPrev={
                        referenceType === "captions" &&
                        (captionStepOrigin(-1) ?? -1) > 0
                      }
                      canStepNext={
                        referenceType === "captions" &&
                        (captionStepOrigin(1) ?? -1) <
                          ((selectedReference?.value?.captions?.length as number | undefined) ?? 0) - 1
                      }
                      onItemChange={handleActiveItemChange}
                      onMediasArrayChange={handleMediasArrayChange}
                    />
                  ) : (
                    <div className="rounded-md border border-dashed p-4 text-center space-y-3">
                      {referenceType === "captions" && (
                        <div className="grid grid-cols-[1.5rem_1fr_1.5rem] items-center">
                          <CaptionStepButton
                            direction={-1}
                            disabled={!((captionStepOrigin(-1) ?? -1) > 0)}
                            onClick={() => stepCaption(-1)}
                          />
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium text-center">
                            {currentTimeSec.toFixed(3)}s
                          </p>
                          <CaptionStepButton
                            direction={1}
                            disabled={
                              (captionStepOrigin(1) ?? -1) >=
                              ((selectedReference?.value?.captions?.length as number | undefined) ?? 0) - 1
                            }
                            onClick={() => stepCaption(1)}
                          />
                        </div>
                      )}
                      <Clock className="h-5 w-5 mx-auto text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">
                        No items active at {currentTimeSec.toFixed(3)}s
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

              <TabsContent value="info" className="mt-3 space-y-3">
                {referenceType === "captions" && selectedReference && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Title
                      </Label>
                      <Input
                        value={selectedReference.value?.title ?? ""}
                        className="h-8 text-xs"
                        placeholder="Caption title"
                        onChange={e => {
                          onReferenceChange({
                            references: [
                              {
                                ...selectedReference,
                                value: {
                                  ...selectedReference.value,
                                  title: e.target.value,
                                },
                              },
                            ],
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Description
                      </Label>
                      <Textarea
                        value={selectedReference.value?.description ?? ""}
                        rows={3}
                        className="text-xs"
                        placeholder="What this caption version is for"
                        onChange={e => {
                          onReferenceChange({
                            references: [
                              {
                                ...selectedReference,
                                value: {
                                  ...selectedReference.value,
                                  description: e.target.value,
                                },
                              },
                            ],
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
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
