"use client";

import { useEffect, useRef, useMemo } from "react";
import type { Timeline } from "../../../stores/project-store";
import { useCompileStore } from "../../../stores/compile-store";

/**
 * Hook that uses the compile store for timeline rendering.
 * This is now a thin wrapper around the compile store.
 * 
 * @param loadedTimeline - The timeline to render
 * @returns The generated output, metadata, and generation state from the compile store
 */
export function useTimelineRenderer(loadedTimeline: Timeline | null) {
  // Select only what this hook needs — a full-store subscription re-renders the
  // player on every generationProgress tick.
  const generatedOutput = useCompileStore((s) => s.generatedOutput);
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);
  const isGenerating = useCompileStore((s) => s.isGenerating);
  const generationError = useCompileStore((s) => s.generationError);
  const setCurrentTimeline = useCompileStore((s) => s.setCurrentTimeline);
  const generateOutput = useCompileStore((s) => s.generateOutput);
  const isFetchingPresets = useCompileStore((s) => s.isFetchingPresets);

  // Use refs to track state and prevent infinite loops
  const lastTimelineIdRef = useRef<string | null>(null);
  const hasGeneratedForHashRef = useRef<string>("");

  // Create a stable hash of presets to detect changes
  const presetsHash = useMemo(() => {
    if (!loadedTimeline?.presets || loadedTimeline.presets.length === 0) {
      return "";
    }
    return JSON.stringify(
      loadedTimeline.presets.map(p => ({
        id: p.presetId,
        inputData: p.presetInputData,
        disabled: p.disabled
      }))
    );
  }, [loadedTimeline?.presets]);

  // Sync compile store with loaded timeline (only when timeline ID changes)
  useEffect(() => {
    const timelineId = loadedTimeline?.id || null;
    
    if (timelineId !== lastTimelineIdRef.current) {
      if (loadedTimeline) {
        setCurrentTimeline(loadedTimeline);
      } else {
        setCurrentTimeline(null);
      }
      lastTimelineIdRef.current = timelineId;
      hasGeneratedForHashRef.current = "";
    }
  }, [loadedTimeline?.id, setCurrentTimeline]);

  // Auto-generate when timeline presets are ready
  useEffect(() => {
    if (!loadedTimeline || !presetsHash) {
      return;
    }

    // Skip if we've already generated for this exact hash
    if (hasGeneratedForHashRef.current === presetsHash) {
      return;
    }

    // Get current state from store (don't subscribe to it to avoid loops)
    const state = useCompileStore.getState();
    
    // Check if all presets are loaded
    const allPresetsReady = loadedTimeline.presets?.every(preset => {
      const info = state.presetInfoCache.get(preset.presetId);
      return info && !info.isLoading && info.preset !== null;
    });

    // Only auto-generate if all presets are ready and we're not currently fetching/generating
    if (allPresetsReady && !state.isFetchingPresets && !state.isGenerating) {
      hasGeneratedForHashRef.current = presetsHash;
      generateOutput(loadedTimeline);
    }
  }, [loadedTimeline?.id, presetsHash, isFetchingPresets, isGenerating, generateOutput]);

  return {
    generatedOutput,
    calculatedMetadata,
    isGenerating,
    generationError,
  };
}
