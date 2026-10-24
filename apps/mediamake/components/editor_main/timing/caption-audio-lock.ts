import { sceneBlocksFromMediaInput } from '@/components/editor_main/panels/bottom/editor/media-scene-blocks';
import type { NodeTiming } from './types';

interface PresetLike {
  id: string;
  presetId: string;
  presetInputData?: unknown;
  disabled?: boolean;
}

/** Presets whose words are timed against an audio file from 0. */
export const CAPTION_PRESET_IDS = new Set([
  'sub-vertical-float',
  'sub-fast-rap-static',
  'sub-kinetic-motion',
  'sub-kinetic-gradient-flow',
  'sub-media-stitch',
  'sub-scrolling-vertical',
  'subtitles-plain',
  'broll',
]);

export function isCaptionPreset(presetId: string | undefined): boolean {
  return Boolean(presetId && CAPTION_PRESET_IDS.has(presetId));
}

function asRecord(input: unknown): Record<string, unknown> {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return {};
}

function mediaItems(input: Record<string, unknown>): Record<string, unknown>[] {
  const raw = input.mediaItems;
  const list = Array.isArray(raw) ? raw : Array.isArray(asRecord(raw).items) ? asRecord(raw).items : [];
  return (list as unknown[]).map(asRecord);
}

interface AudioSource {
  presetInstanceId: string;
  /** Media-track item index. Unset for presets with a single audio field. */
  itemIndex?: number;
}

function audioSources(preset: PresetLike): AudioSource[] {
  const input = asRecord(preset.presetInputData);
  if (preset.presetId === 'media-track') {
    return mediaItems(input).flatMap((item, itemIndex) =>
      item.type === 'audio' && item.mute !== true && typeof item.src === 'string' && item.src
        ? [{ presetInstanceId: preset.id, itemIndex }]
        : [],
    );
  }
  if (preset.presetId === 'waveform-audio' || preset.presetId === 'beatstitch') {
    const audio = asRecord(input.audio);
    const src = typeof audio.src === 'string' ? audio.src : '';
    // A `ref…` source only draws another track's audio.
    if (!src || src.startsWith('ref') || audio.muted === true) return [];
    return [{ presetInstanceId: preset.id }];
  }
  return [];
}

/** The only audio file in the timeline, or null when there are none or several. */
export function soleAudioSource(presets: PresetLike[]): AudioSource | null {
  const found = presets.filter((preset) => !preset.disabled).flatMap(audioSources);
  return found.length === 1 ? found[0] : null;
}

/** A caption block with no lock, track type, or authored span of its own. */
function followsAudio(input: Record<string, unknown>): boolean {
  if ('trackType' in input) return false;
  if (typeof input.lock === 'string' && input.lock) return false;
  for (const key of ['start', 'duration', 'trackStartOffset', 'trackDuration']) {
    if (typeof input[key] === 'number') return false;
  }
  return !(typeof input.trackRange === 'string' && input.trackRange);
}

/**
 * Where the audio item starts inside its media track. An intro clip packed
 * before the song moves it later. Zero when an earlier length is unknown.
 */
function itemOffset(track: PresetLike, itemIndex: number | undefined): number {
  if (itemIndex === undefined) return 0;
  const layout = sceneBlocksFromMediaInput(track.presetInputData);
  const index = layout.blocks.findIndex((block) => block.itemIndex === itemIndex);
  if (index < 0) return 0;
  if (layout.sequence && layout.blocks.slice(0, index).some((block) => !(block.duration > 0))) {
    return 0;
  }
  const start = layout.blocks[index].start;
  return Number.isFinite(start) && start > 0 ? start : 0;
}

/**
 * Caption blocks follow the timeline's only audio file until the user picks
 * a lock, track type, or span. Captions are timed from the audio's 0, so the
 * block takes the audio's start and length wherever that audio sits.
 */
export function autoAudioLock(
  preset: PresetLike,
  presets: PresetLike[],
): Extract<NodeTiming, { kind: 'lock' }> | null {
  if (!isCaptionPreset(preset.presetId)) return null;
  if (!followsAudio(asRecord(preset.presetInputData))) return null;
  const audio = soleAudioSource(presets);
  if (!audio) return null;
  const track = presets.find((item) => item.id === audio.presetInstanceId);
  if (!track) return null;
  const offset = itemOffset(track, audio.itemIndex);
  return {
    kind: 'lock',
    refId: track.id,
    auto: true,
    ...(offset > 0 ? { offset } : {}),
  };
}
