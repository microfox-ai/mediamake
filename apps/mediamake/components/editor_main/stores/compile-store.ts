import { create } from 'zustand';
import { calculateCompositionLayoutMetadata, InputCompositionProps, RenderableComponentData } from "@microfox/remotion";
import { runPreset, insertPresetToComposition } from "@/components/editor/presets/engine/preset-helpers";
import { processPresetInputData, createBaseDataFromReferences } from "@/components/editor/presets/engine/preset-data-mutation";
import { getPredefinedPresetById } from "@/components/editor/presets/registry/registry/presets-registry";
import { createCachedFetcher } from "@/lib/audio-cache";
import AudioScene from "@/components/remotion/test.json";
import { toast } from "sonner";
import type { Timeline } from "./project-store";
import { Preset, DatabasePreset } from "@/components/editor/presets/types";

// Default composition props
const defaultInputProps: InputCompositionProps = {
  childrenData: AudioScene.childrenData as RenderableComponentData[],
  config: {
    fps: 30,
    width: 1920,
    height: 1080,
    duration: 20
  },
  style: {
    backgroundColor: "black"
  }
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
  calculatedMetadata: Awaited<ReturnType<typeof calculateCompositionLayoutMetadata>> | null;
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
  fetchPresetInfo: (presetId: string) => Promise<Preset | DatabasePreset | null>;
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

  setCurrentTimeline: (timeline) => {
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
          error: null
        })
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
            error: null
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
            error: null
          });
          return { presetInfoCache: newCache };
        });
        return databasePreset;
      } else {
        throw new Error(`Preset ${presetId} not found`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch preset';
      set(state => {
        const newCache = new Map(state.presetInfoCache);
        newCache.set(presetId, {
          presetId,
          preset: null,
          isLoading: false,
          error: errorMessage
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
          fetchingProgress: Math.round(((index + 1) / totalPresets) * 100)
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
    
    if (state.isGenerating) {
      return; // Already generating
    }

    if (!timeline.presets || timeline.presets.length === 0) {
      set({ generatedOutput: null, calculatedMetadata: null });
      return;
    }

    set({ 
      isGenerating: true, 
      generationProgress: 0,
      generationError: null 
    });

    try {
      // Start with timeline configuration or defaults
      let baseComposition: InputCompositionProps = {
        childrenData: defaultInputProps.childrenData,
        config: {
          ...defaultInputProps.config,
          ...(timeline.configuration?.config || {})
        },
        style: {
          ...defaultInputProps.style,
          ...(timeline.configuration?.style || {})
        }
      };

      let clip = {};

      // Create base data from references
      const baseData = createBaseDataFromReferences(timeline.defaultData?.references || []);

      const totalPresets = timeline.presets.filter(p => !p.disabled).length;
      let processedCount = 0;

      // Apply all presets in sequence (skip disabled presets)
      for (const presetItem of timeline.presets) {
        // Skip disabled presets
        if (presetItem.disabled) {
          continue;
        }

        // Get preset info from cache
        const presetInfo = state.presetInfoCache.get(presetItem.presetId);
        if (!presetInfo || !presetInfo.preset) {
          // Try to fetch if not in cache
          const fetchedPreset = await get().fetchPresetInfo(presetItem.presetId);
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
        const processedInputData = processPresetInputData(
          presetItem.presetInputData || {},
          baseData
        );

        // Update progress
        processedCount++;
        set({ generationProgress: Math.round((processedCount / totalPresets) * 50) });

        // Run the preset function with processed input data
        const presetOutput = await runPreset(
          processedInputData,
          actualPreset.presetFunction,
          {
            config: baseComposition.config,
            style: baseComposition.style,
            clip: clip,
            baseData: baseData,
            fetcher: createCachedFetcher((url: string, data: any) =>
              fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
              })
            ),
          },
          actualPreset.metadata
        );

        if (presetOutput) {
          if (presetOutput.options?.clip && actualPreset.metadata.presetType === 'full') {
            clip = presetOutput.options.clip;
          }
          // Insert preset output into composition
          baseComposition = insertPresetToComposition(baseComposition, {
            presetOutput: presetOutput,
            presetType: actualPreset.metadata.presetType
          });
        }
      }

      set({ 
        generatedOutput: baseComposition,
        generationProgress: 75
      });

      // Calculate metadata
      if (baseComposition.childrenData && baseComposition.childrenData.length > 0) {
        try {
          const metadata = await calculateCompositionLayoutMetadata({
            defaultProps: {},
            props: baseComposition,
            abortSignal: new AbortController().signal,
            compositionId: 'DataMotion',
            isRendering: false,
          });
          set({ 
            calculatedMetadata: metadata,
            generationProgress: 100
          });
        } catch (error) {
          console.error('Error calculating metadata:', error);
          set({ generationProgress: 100 });
        }
      } else {
        set({ generationProgress: 100 });
      }

      // toast.success('Timeline rendered successfully!');
    } catch (error) {
      console.error('Error generating output:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate video. Please try again.';
      set({ 
        generationError: errorMessage,
        isGenerating: false,
        generationProgress: 0
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
      generationProgress: 0
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
    presetId ? state.presetInfoCache.get(presetId) : null
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
    error: cached.error
  };
};
