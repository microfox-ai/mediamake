import { create } from 'zustand';
import {
  calculateCompositionLayoutMetadata,
  InputCompositionProps,
  RenderableComponentData,
  RenderableContext,
} from '@microfox/remotion';
import {
  runPreset,
  insertPresetToComposition,
} from '@/components/editor/presets/engine/preset-helpers';
import {
  buildPresetItemIdByNodeId,
  useLayerStateStore,
} from './layer-state-store';
import {
  buildDataItemIds,
  resolvePresetInputData,
  createBaseDataFromReferences,
} from '@/components/editor/presets/engine/preset-data-mutation';
import { presetStdLib } from '@/components/editor/presets/engine/preset-stdlib';
import { getPredefinedPresetById } from '@/components/editor/presets/registry/registry/presets-registry';
import { createCachedFetcher } from '@/lib/audio-cache';
import AudioScene from '@/components/remotion/test.json';
import { toast } from 'sonner';
import type { Timeline } from './project-store';
import { Preset, DatabasePreset } from '@/components/editor/presets/types';

const getValueAtPath = (obj: any, path: string): any => {
  if (!path) return obj;
  return path.split('.').reduce((acc: any, key: string) => {
    if (acc == null) return undefined;
    return acc[key];
  }, obj);
};

const setValueAtPath = (obj: any, path: string, value: any): void => {
  const parts = path.split('.');
  if (parts.length === 0) return;
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cursor[key] == null || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
};

const hydrateEmptyReferenceArrays = (
  processedInputData: any,
  dataReferenceKeyByPath: Record<string, string>,
  baseData: Record<string, any>,
) => {
  if (!processedInputData || !dataReferenceKeyByPath) return processedInputData;
  const hydrated = structuredClone(processedInputData);
  Object.entries(dataReferenceKeyByPath).forEach(([path, sourceKey]) => {
    const currentVal = getValueAtPath(hydrated, path);

    // If processDataReferences already resolved the value to an array — even an
    // intentionally-empty one (e.g. a range filter that matched 0 items) — leave
    // it alone.  Overwriting here would undo the range filtering.
    if (Array.isArray(currentVal)) {
      return;
    }

    // If the value is still a data:[key][range] reference string, resolution
    // failed (key not found in baseData).  Fall back to the raw source data so
    // the preset at least has something to work with.
    const isUnresolvedRef =
      typeof currentVal === 'string' && currentVal.startsWith('data:[');
    if (!isUnresolvedRef) {
      // Value was resolved to a non-array (e.g. a scalar or object) — leave it.
      return;
    }

    const source = baseData[sourceKey];
    if (Array.isArray(source) && source.length > 0) {
      setValueAtPath(hydrated, path, source);
      return;
    }
    if (
      source &&
      typeof source === 'object' &&
      Array.isArray((source as any).captions) &&
      (source as any).captions.length > 0
    ) {
      setValueAtPath(hydrated, path, (source as any).captions);
    }
  });
  return hydrated;
};

/**
 * Post-process composition props for initial timeline generation:
 * - Bubble child durations up to parents that don't have an explicit duration
 * - Propagate container duration down to image/text atoms that don't have a duration
 *
 * This runs only on the generated composition from presets/timeline config,
 * before any user layer edits are applied (layer-state overrides).
 */
function applyDurationPropagation(
  composition: InputCompositionProps,
  explicitDurationIds?: Set<string>,
): InputCompositionProps {
  const cloneNode = (
    node: RenderableComponentData,
  ): RenderableComponentData => ({
    ...node,
    ...(node.childrenData && node.childrenData.length > 0
      ? { childrenData: node.childrenData.map(cloneNode) }
      : {}),
  });

  const clonedChildren = composition.childrenData?.map(cloneNode);
  if (!clonedChildren || clonedChildren.length === 0) {
    return composition;
  }

  const explicitIds = explicitDurationIds ?? new Set<string>();

  // First pass: resolve durations for nodes with fitDurationTo when a matching
  // target already has a duration. This is synchronous and does not probe media;
  // it only reuses existing durations within the tree.
  const resolveFitDurations = (nodes: RenderableComponentData[]): void => {
    const allNodes: RenderableComponentData[] = [];

    const collect = (list: RenderableComponentData[]) => {
      for (const n of list) {
        allNodes.push(n);
        if (n.childrenData?.length) collect(n.childrenData);
      }
    };

    collect(nodes);

    const idToNode = new Map<string, RenderableComponentData>();
    const fitKeyToDuration = new Map<string, number>();

    for (const n of allNodes) {
      idToNode.set(n.id, n);
      const ctx = n.context as RenderableContext | undefined;
      const timing = ctx?.timing as
        | { duration?: number; fitDurationTo?: string | string[] }
        | undefined;
      const dur =
        typeof timing?.duration === 'number' && timing.duration > 0
          ? timing.duration
          : undefined;
      if (dur !== undefined) {
        // Map own id → duration
        fitKeyToDuration.set(n.id, dur);
        // Also map fitDurationTo key → duration if present
        const fdt = timing?.fitDurationTo;
        if (typeof fdt === 'string' && fdt) {
          fitKeyToDuration.set(fdt, dur);
        } else if (Array.isArray(fdt)) {
          for (const k of fdt) {
            if (k) fitKeyToDuration.set(k, dur);
          }
        }
      }
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (const n of allNodes) {
        const ctx = n.context as RenderableContext | undefined;
        const timing = ctx?.timing as
          | { duration?: number; fitDurationTo?: string | string[] }
          | undefined;
        const hasDuration =
          typeof timing?.duration === 'number' && timing.duration > 0;
        if (hasDuration) continue;

        const fdt = timing?.fitDurationTo;
        if (!fdt) continue;

        const keys = Array.isArray(fdt) ? fdt : [fdt];
        let resolved: number | undefined;
        for (const key of keys) {
          if (!key) continue;
          if (fitKeyToDuration.has(key)) {
            resolved = fitKeyToDuration.get(key);
            break;
          }
          const target = idToNode.get(key);
          const targetDur =
            target &&
            typeof (target.context as RenderableContext | undefined)?.timing
              ?.duration === 'number'
              ? (target.context as RenderableContext).timing!.duration
              : undefined;
          if (targetDur !== undefined && targetDur > 0) {
            resolved = targetDur;
            break;
          }
        }

        if (resolved !== undefined && resolved > 0) {
          const nextCtx: RenderableContext = {
            ...(ctx ?? {}),
            timing: {
              ...(ctx?.timing ?? {}),
              duration: resolved,
            },
          };
          n.context = nextCtx;
          fitKeyToDuration.set(n.id, resolved);
          const f = timing?.fitDurationTo;
          if (typeof f === 'string' && f) {
            fitKeyToDuration.set(f, resolved);
          } else if (Array.isArray(f)) {
            for (const k of f) {
              if (k) fitKeyToDuration.set(k, resolved);
            }
          }
          changed = true;
        }
      }
    }
  };

  resolveFitDurations(clonedChildren);

  // Bottom-up pass: if a parent has no duration, sum all child durations and assign.
  const computeAndAssignDurations = (
    nodes: RenderableComponentData[],
  ): Array<number | undefined> => {
    const durations: Array<number | undefined> = [];

    for (const node of nodes) {
      let ctx = node.context as RenderableContext | undefined;
      const timing = ctx?.timing as { duration?: number } | undefined;
      let ownDuration =
        typeof timing?.duration === 'number' && timing.duration > 0
          ? timing.duration
          : undefined;

      // Recurse into children first so their durations are available.
      let summedChildrenDuration: number | undefined;
      if (node.childrenData && node.childrenData.length > 0) {
        const childDurations = computeAndAssignDurations(node.childrenData);
        const validChildDurations = childDurations.filter(
          (d): d is number => typeof d === 'number' && d > 0,
        );
        if (validChildDurations.length > 0) {
          summedChildrenDuration = validChildDurations.reduce(
            (acc, d) => acc + d,
            0,
          );
        }
      }

      if (
        ownDuration === undefined &&
        summedChildrenDuration !== undefined &&
        summedChildrenDuration > 0
      ) {
        const nextCtx: RenderableContext = {
          ...(ctx ?? {}),
          timing: {
            ...(ctx?.timing ?? {}),
            duration: summedChildrenDuration,
          },
        };
        node.context = nextCtx;
        ctx = nextCtx;
        ownDuration = summedChildrenDuration;
      }

      durations.push(ownDuration);
    }

    return durations;
  };

  computeAndAssignDurations(clonedChildren);

  // Top-down pass: if a container has a duration, propagate it to image/text atoms
  // that do not have an explicit duration.
  const propagateDown = (
    node: RenderableComponentData,
    inheritedDuration?: number,
  ): void => {
    const ctx = node.context as RenderableContext | undefined;
    const timing = ctx?.timing as
      | { duration?: number; fitDurationTo?: string | string[] }
      | undefined;
    const ownDuration =
      typeof timing?.duration === 'number' && timing.duration > 0
        ? timing.duration
        : inheritedDuration;

    if (node.childrenData && node.childrenData.length > 0) {
      for (const child of node.childrenData) {
        const childCtx = child.context as RenderableContext | undefined;
        const isNonMediaAtom =
          child.type === 'atom' &&
          child.componentId !== 'AudioAtom' &&
          child.componentId !== 'VideoAtom';
        const hasExplicitDuration = explicitIds.has(child.id);

        if (
          isNonMediaAtom &&
          !hasExplicitDuration &&
          ownDuration !== undefined &&
          ownDuration > 0
        ) {
          const nextChildCtx: RenderableContext = {
            ...(childCtx ?? {}),
            timing: {
              ...(childCtx?.timing ?? {}),
              duration: ownDuration,
            },
          };
          child.context = nextChildCtx;
        }

        propagateDown(child, ownDuration);
      }
    }
  };

  for (const node of clonedChildren) {
    propagateDown(node, undefined);
  }

  return {
    ...composition,
    childrenData: clonedChildren,
  };
}

// Default composition props
const defaultInputProps: InputCompositionProps = {
  childrenData: AudioScene.childrenData as RenderableComponentData[],
  config: {
    fps: 30,
    width: 1920,
    height: 1080,
    duration: 20,
  },
  style: {
    backgroundColor: 'black',
  },
};

interface PresetInfo {
  presetId: string;
  preset: Preset | DatabasePreset | null;
  isLoading: boolean;
  error: string | null;
}

interface CompileState {
  // Output state
  generatedOutput: InputCompositionProps | null;
  calculatedMetadata: Awaited<
    ReturnType<typeof calculateCompositionLayoutMetadata>
  > | null;
  isGenerating: boolean;
  generationProgress: number; // 0-100
  generationError: string | null;

  // Preset info cache
  presetInfoCache: Map<string, PresetInfo>;
  isFetchingPresets: boolean;
  fetchingProgress: number; // 0-100

  // Current timeline
  currentTimeline: Timeline | null;

  // Actions
  setCurrentTimeline: (timeline: Timeline | null) => void;
  fetchPresetInfo: (
    presetId: string,
  ) => Promise<Preset | DatabasePreset | null>;
  fetchAllPresetInfo: (timeline: Timeline) => Promise<void>;
  generateOutput: (timeline: Timeline) => Promise<void>;
  clearOutput: () => void;
  reset: () => void;
}

export const useCompileStore = create<CompileState>((set, get) => ({
  generatedOutput: null,
  calculatedMetadata: null,
  isGenerating: false,
  generationProgress: 0,
  generationError: null,
  presetInfoCache: new Map(),
  isFetchingPresets: false,
  fetchingProgress: 0,
  currentTimeline: null,

  setCurrentTimeline: timeline => {
    set({ currentTimeline: timeline });
    if (timeline) {
      // Auto-fetch preset info when timeline is set
      get().fetchAllPresetInfo(timeline);
    }
  },

  fetchPresetInfo: async (presetId: string) => {
    const state = get();
    const cached = state.presetInfoCache.get(presetId);

    // Return cached if available and not loading
    if (cached && !cached.isLoading && cached.preset) {
      return cached.preset;
    }

    // Mark as loading if not already
    if (!cached || !cached.isLoading) {
      set(state => ({
        presetInfoCache: new Map(state.presetInfoCache).set(presetId, {
          presetId,
          preset: null,
          isLoading: true,
          error: null,
        }),
      }));
    }

    try {
      // Try predefined first
      const predefinedPreset = getPredefinedPresetById(presetId);
      if (predefinedPreset) {
        set(state => {
          const newCache = new Map(state.presetInfoCache);
          newCache.set(presetId, {
            presetId,
            preset: predefinedPreset,
            isLoading: false,
            error: null,
          });
          return { presetInfoCache: newCache };
        });
        return predefinedPreset;
      }

      // Try database
      const response = await fetch(`/api/presets/by-metadata-id/${presetId}`);
      if (response.ok) {
        const data = await response.json();
        const databasePreset = data.preset;
        set(state => {
          const newCache = new Map(state.presetInfoCache);
          newCache.set(presetId, {
            presetId,
            preset: databasePreset,
            isLoading: false,
            error: null,
          });
          return { presetInfoCache: newCache };
        });
        return databasePreset;
      } else {
        throw new Error(`Preset ${presetId} not found`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch preset';
      set(state => {
        const newCache = new Map(state.presetInfoCache);
        newCache.set(presetId, {
          presetId,
          preset: null,
          isLoading: false,
          error: errorMessage,
        });
        return { presetInfoCache: newCache };
      });
      console.warn(`Failed to fetch preset ${presetId}:`, error);
      return null;
    }
  },

  fetchAllPresetInfo: async (timeline: Timeline) => {
    if (!timeline.presets || timeline.presets.length === 0) {
      set({ isFetchingPresets: false, fetchingProgress: 100 });
      return;
    }

    set({ isFetchingPresets: true, fetchingProgress: 0 });

    const totalPresets = timeline.presets.length;
    const presetIds = timeline.presets.map(p => p.presetId);

    try {
      // Fetch all presets in parallel
      const fetchPromises = presetIds.map(async (presetId, index) => {
        await get().fetchPresetInfo(presetId);
        set(state => ({
          fetchingProgress: Math.round(((index + 1) / totalPresets) * 100),
        }));
      });

      await Promise.all(fetchPromises);
      set({ isFetchingPresets: false, fetchingProgress: 100 });
    } catch (error) {
      console.error('Error fetching preset info:', error);
      set({ isFetchingPresets: false, fetchingProgress: 100 });
    }
  },

  generateOutput: async (timeline: Timeline) => {
    const state = get();
    let effectiveTimeline = timeline;

    try {
      const { useTimelineEditsStore } = require('./timeline-edits-store');
      const editedTimeline = useTimelineEditsStore
        .getState()
        .getEditedTimeline(timeline.id);
      if (editedTimeline) {
        effectiveTimeline = editedTimeline;
      }
    } catch (_error) {
      // Ignore if timeline edits store isn't available for any reason.
    }

    if (state.isGenerating) {
      return; // Already generating
    }

    if (!effectiveTimeline.presets || effectiveTimeline.presets.length === 0) {
      set({ generatedOutput: null, calculatedMetadata: null });
      return;
    }

    set({
      isGenerating: true,
      generationProgress: 0,
      generationError: null,
    });

    try {
      // Start with timeline configuration or defaults
      let baseComposition: InputCompositionProps = {
        childrenData: defaultInputProps.childrenData,
        config: {
          ...defaultInputProps.config,
          ...(effectiveTimeline.configuration?.config || {}),
        },
        style: {
          ...defaultInputProps.style,
          ...(effectiveTimeline.configuration?.style || {}),
        },
      };

      let clip = {};

      // Create base data from references
      const baseData = createBaseDataFromReferences(
        effectiveTimeline.defaultData?.references || [],
      );

      // Capture which nodes have an explicit duration in the original
      // timeline/preset data before any metadata calculations. Used so that
      // duration propagation only affects atoms that did not have a
      // user-specified duration.
      const explicitDurationIds = new Set<string>();
      const collectExplicitDurations = (
        nodes: RenderableComponentData[] | undefined,
      ) => {
        if (!nodes) return;
        for (const node of nodes) {
          const ctx = node.context as RenderableContext | undefined;
          const timing = ctx?.timing as
            | { duration?: number; durationInFrames?: number }
            | undefined;
          const hasDuration =
            (typeof timing?.duration === 'number' && timing.duration > 0) ||
            (typeof timing?.durationInFrames === 'number' &&
              timing.durationInFrames > 0);
          if (hasDuration) {
            explicitDurationIds.add(node.id);
          }
          if (node.childrenData?.length) {
            collectExplicitDurations(node.childrenData);
          }
        }
      };

      const totalPresets = effectiveTimeline.presets.filter(
        p => !p.disabled,
      ).length;
      let processedCount = 0;

      // Apply all presets in sequence (skip disabled presets)
      for (const presetItem of effectiveTimeline.presets) {
        // Skip disabled presets
        if (presetItem.disabled) {
          continue;
        }

        // Get preset info from cache
        const presetInfo = state.presetInfoCache.get(presetItem.presetId);
        if (!presetInfo || !presetInfo.preset) {
          // Try to fetch if not in cache
          const fetchedPreset = await get().fetchPresetInfo(
            presetItem.presetId,
          );
          if (!fetchedPreset) {
            console.warn(`Preset ${presetItem.presetId} not found, skipping`);
            continue;
          }
          presetInfo!.preset = fetchedPreset;
        }

        const actualPreset = presetInfo!.preset;
        if (!actualPreset) {
          continue;
        }

        // Process input data with base data references
        const resolvedInput = resolvePresetInputData(
          presetItem.presetInputData || {},
          baseData,
        );
        const hydratedProcessedInputData = hydrateEmptyReferenceArrays(
          resolvedInput.processedInputData,
          resolvedInput.dataReferenceKeyByPath,
          baseData,
        );

        // Update progress
        processedCount++;
        set({
          generationProgress: Math.round((processedCount / totalPresets) * 50),
        });

        // Run the preset function with processed input data
        const presetOutput = await runPreset(
          hydratedProcessedInputData,
          actualPreset.presetFunction,
          {
            config: baseComposition.config,
            style: baseComposition.style,
            clip: clip,
            baseData: baseData,
            dataItemIds: resolvedInput.dataItemIds,
            dataSourceKeys: resolvedInput.dataSourceKeys,
            dataReferenceBindings: resolvedInput.dataReferenceBindings,
            dataReferenceKeyByPath: resolvedInput.dataReferenceKeyByPath,
            dataMutationContext: resolvedInput.dataMutationContext,
            buildDataItemIds: options =>
              buildDataItemIds(resolvedInput.dataMutationContext, options),
            applyDataItemIdsToNodeTree: presetStdLib.applyDataItemIdsToNodeTree,
            fetcher: createCachedFetcher((url: string, data: any) =>
              fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
              }),
            ),
          },
          actualPreset.metadata,
        );

        if (presetOutput) {
          if (
            presetOutput.options?.clip &&
            actualPreset.metadata.presetType === 'full'
          ) {
            clip = presetOutput.options.clip;
          }
          // Insert preset output into composition (tag nodes with presetItem.id for "not in sync" tracking)
          baseComposition = insertPresetToComposition(baseComposition, {
            presetOutput: presetOutput,
            presetType: actualPreset.metadata.presetType,
            presetItemId: presetItem.id,
            dataItemIds: resolvedInput.dataItemIds,
          });
        }
      }

      set({
        generatedOutput: baseComposition,
        generationProgress: 75,
      });

      // Update layer-state store with node id → preset item id mapping for "not in sync" badge
      try {
        const map = buildPresetItemIdByNodeId(baseComposition.childrenData);
        useLayerStateStore.getState().setPresetItemIdByNodeId(map);
      } catch (_) {
        // ignore if store not available (e.g. SSR)
      }

      // Calculate metadata
      if (
        baseComposition.childrenData &&
        baseComposition.childrenData.length > 0
      ) {
        try {
          // Collect explicit durations from the pre-metadata composition.
          collectExplicitDurations(
            baseComposition.childrenData as RenderableComponentData[],
          );

          let metadata = await calculateCompositionLayoutMetadata({
            defaultProps: {},
            props: baseComposition,
            abortSignal: new AbortController().signal,
            compositionId: 'DataMotion',
            isRendering: false,
          });

          // Apply duration propagation on the props produced by calculateCompositionLayoutMetadata
          // so that fitDurationTo-based durations and parent/child propagation are reflected
          // in the final calculatedMetadata used by the editor.
          if (metadata?.props) {
            const patchedProps = applyDurationPropagation(
              metadata.props as unknown as InputCompositionProps,
              explicitDurationIds,
            );
            metadata = {
              ...metadata,
              props: patchedProps as any,
            };
          }

          set({
            calculatedMetadata: metadata,
            generationProgress: 100,
          });
        } catch (error) {
          console.error('Error calculating metadata:', error);
          const errorMessage =
            typeof error === 'string'
              ? error
              : 'Failed to calculate metadata in precompiling the video...';
          set({
            calculatedMetadata: null,
            generationProgress: 100,
            generationError: errorMessage,
          });
          toast.error(errorMessage, { duration: 10000 });
        }
      } else {
        set({ generationProgress: 100 });
      }

      // toast.success('Timeline rendered successfully!');
    } catch (error) {
      console.error('Error generating output:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to generate video. Please try again.';
      set({
        generationError: errorMessage,
        isGenerating: false,
        generationProgress: 0,
      });
      toast.error(errorMessage, {
        duration: 10000,
      });
    } finally {
      set({ isGenerating: false });
    }
  },

  clearOutput: () => {
    set({
      generatedOutput: null,
      calculatedMetadata: null,
      generationError: null,
      generationProgress: 0,
    });
  },

  reset: () => {
    set({
      generatedOutput: null,
      calculatedMetadata: null,
      isGenerating: false,
      generationProgress: 0,
      generationError: null,
      presetInfoCache: new Map(),
      isFetchingPresets: false,
      fetchingProgress: 0,
      currentTimeline: null,
    });
  },
}));

// Helper hook to check if preset is ready
export const usePresetReady = (presetId: string | undefined) => {
  const presetInfo = useCompileStore(state =>
    presetId ? state.presetInfoCache.get(presetId) : null,
  );
  const isFetchingPresets = useCompileStore(state => state.isFetchingPresets);

  if (!presetId) return { isReady: false, isLoading: false, error: null };

  const cached = presetInfo;
  if (!cached) {
    return { isReady: false, isLoading: isFetchingPresets, error: null };
  }

  return {
    isReady: !cached.isLoading && cached.preset !== null,
    isLoading: cached.isLoading || isFetchingPresets,
    error: cached.error,
  };
};
