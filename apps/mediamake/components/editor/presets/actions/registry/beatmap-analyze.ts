import { z } from "zod";
import { atomPresetId } from "@/components/editor/presets/define-atom-preset";
import { paramMetaTypes } from "../../dataTypes";
import type { ActionDefinition, ActionExecuteResult } from "../types";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { decodeBrowserAudio } from "@/lib/browser-waveform";
import { findAudioSrcForTrackName } from "../engine/find-audio-for-track";
import { audioClipsFromCompiled } from "../engine/find-audio-media";

export const BEATMAP_PRESET_IDS = [atomPresetId("ImageBeat"), atomPresetId("BeatMontage")];

const inputSchema = z.object({
  trackName: z
    .string()
    .default("")
    .describe("Track to analyze, or a direct audio URL. Empty uses the atom's own audio.")
    .meta({ [paramMetaTypes.linkTrackName]: true }),
  beatsPerBar: z
    .union([z.literal(3), z.literal(4)])
    .default(4)
    .describe("Beats per bar, for downbeats."),
  tempoMin: z.number().min(40).max(200).default(60).describe("Slowest tempo to consider (bpm)."),
  tempoMax: z.number().min(60).max(260).default(200).describe("Fastest tempo to consider (bpm)."),
});

const isFetchable = (src: string) => /^(https?:|blob:|data:audio\/)/i.test(src.trim());

/** The audio file behind an atom's `audio.src`: a URL, a track name, or `ref:<id | trackName>`. */
export function resolveBeatAudioSrc(
  timeline: Timeline,
  atomAudioSrc: string,
  trackName: string,
): string | null {
  if (trackName.trim()) return findAudioSrcForTrackName(timeline, trackName)?.src ?? null;
  const raw = atomAudioSrc.trim();
  if (!raw) return null;
  if (isFetchable(raw)) return raw;
  const target = raw.replace(/^ref:/i, "");
  const byTrack = findAudioSrcForTrackName(timeline, target);
  if (byTrack) return byTrack.src;
  const compiled = useCompileStore.getState().generatedOutput?.childrenData;
  const clip = audioClipsFromCompiled(compiled).find(
    (c) => c.id === target || c.trackName === target || c.name === target,
  );
  return clip?.src ?? null;
}

interface BeatmapPayload {
  beatmap: Record<string, unknown>;
}

/**
 * Reads the atom's audio in the browser and writes a beatmap onto it: beat grid,
 * downbeats, and kick / snare / hat / accent hits with strengths. Same analysis
 * the atoms fall back to while rendering, run once here so renders skip decoding.
 */
export const beatmapAnalyze: ActionDefinition = {
  metadata: {
    id: "beatmapAnalyze",
    title: "Analyze Beats (Browser)",
    description:
      "Decode the audio in the browser and store its beat grid, downbeats and drum / accent hits on the atom. Cuts and punches then follow the music exactly, and renders skip re-analyzing.",
    supportedPresetIds: BEATMAP_PRESET_IDS,
    tags: ["beatmade", "audio", "beats", "browser"],
  },
  inputSchema,
  defaultInputParams: { trackName: "", beatsPerBar: 4, tempoMin: 60, tempoMax: 200 },
  execute: async (ctx): Promise<ActionExecuteResult> => {
    const input = inputSchema.parse(ctx.inputData);
    const target = ctx.action.target;
    const preset =
      target.type === "preset"
        ? ctx.timeline.presets?.find((p) => p.id === target.presetInstanceId)
        : undefined;
    const data = (preset?.presetInputData ?? {}) as Record<string, any>;
    const atomSrc = typeof data.audio?.src === "string" ? data.audio.src : "";
    const src = resolveBeatAudioSrc(ctx.timeline, atomSrc, input.trackName);
    if (!src) {
      throw new Error(
        atomSrc
          ? `Could not find the audio file for "${atomSrc}". Pick a track or paste an audio URL.`
          : "Set the atom's audio (or pick a track) first.",
      );
    }

    ctx.browser.reportProgress("Fetching audio…");
    const buffer = await decodeBrowserAudio(src);
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
    const { analyzeBeatmapAsync } = await import("@microfox/remotion");
    const beatmap = await analyzeBeatmapAsync(channels, buffer.sampleRate, {
      beatsPerBar: input.beatsPerBar,
      tempoRange: [Math.min(input.tempoMin, input.tempoMax - 10), input.tempoMax],
      src: atomSrc && !input.trackName.trim() ? atomSrc : src,
      source: "browser",
      onProgress: ctx.browser.reportProgress,
    });
    if (beatmap.beats.length === 0) throw new Error("No beats found: the audio is silent or too short.");

    const count = (kind: string) => beatmap.onsets[kind]?.length ?? 0;
    const payload: BeatmapPayload = { beatmap: beatmap as unknown as Record<string, unknown> };
    return {
      outputs: [
        {
          label: `${beatmap.bpm.toFixed(1)} BPM · ${beatmap.beats.length} beats · ${count("kick")} kicks · ${count("accent")} accents`,
          isFavorite: true,
          payload,
        },
      ],
    };
  },
  applyOutput: ({ currentData, output }) => {
    const payload = output.payload as Partial<BeatmapPayload> | undefined;
    if (!payload?.beatmap) return currentData;
    return { ...currentData, beatmap: payload.beatmap };
  },
};
