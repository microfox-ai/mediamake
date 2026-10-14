"use client";

import { useMemo } from "react";
import {
  audioClipsFromCompiled,
  findAudioMediaClipsFromTimeline,
  type TimelineAudioClip,
} from "@/components/editor/presets/actions/engine/find-audio-media";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import type { Timeline } from "@/components/editor_main/stores/project-store";

/**
 * Waveform clips from the compiled composition. Input timing is only a
 * stand-in until that compile exists.
 */
export function useCompiledAudioClips(
  timeline: Timeline | null | undefined,
): TimelineAudioClip[] {
  const compiledChildren = useCompileStore(
    (state) => state.calculatedMetadata?.props?.childrenData,
  );
  return useMemo(() => {
    const compiled = audioClipsFromCompiled(compiledChildren);
    if (compiled.length > 0) return compiled;
    return findAudioMediaClipsFromTimeline(timeline ?? undefined);
  }, [compiledChildren, timeline]);
}
