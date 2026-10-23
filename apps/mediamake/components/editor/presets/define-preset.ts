import z from 'zod';
import { paramMetaTypes } from './dataTypes';
import type { Preset, PresetMetadata } from './types';

export const DEFAULT_TRACK_MODES = ['lockedTo', 'sequence', 'aligned'] as const;

export type TrackTimingMode = 'lockedTo' | 'sequence' | 'aligned' | 'autoRange';

/** Fields every wrapped preset receives. Authors do not declare these. */
export interface TrackShellParams {
  trackName?: string;
  trackType?: string;
  start?: number;
  startOffset?: number;
  duration?: number;
  lock?: string;
  attachedToId?: string;
  trackFitDurationTo?: string;
  trackStartOffset?: number;
  trackDuration?: number;
  trackRange?: string;
  /** Edge transitions. Kept off atom `data` and compiled onto the node. */
  transitions?: unknown;
}

export interface ContainerProps {
  className?: string;
  style?: object;
}

/** Fill an atom preset uses until the layout section changes it. */
export const ATOM_FILL_STYLE = {
  position: 'absolute' as const,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

/**
 * What a container preset returns. The shell adds the BaseLayout, timing, and parent.
 * `duration` fills in when the shell params have no length (ranges, audio).
 * `type` overrides sequence → scene. `containerProps: null` leaves the layout data empty.
 */
export interface ContainerBuild {
  children?: unknown[];
  containerProps?: ContainerProps | null;
  /** Fills in when the shell params have no start. */
  start?: number;
  /** Fills in when the shell params have no length (ranges, audio). */
  duration?: number;
  type?: 'layout' | 'scene';
  config?: Record<string, unknown>;
}

/** What an atom preset returns. The shell stamps timing, the parent, and a fill container. */
export interface AtomBuild {
  id?: string;
  componentId?: string;
  type?: string;
  data?: unknown;
  effects?: unknown[];
  context?: Record<string, unknown>;
  childrenData?: unknown[];
  [key: string]: unknown;
}

function describeModes(modes: readonly string[]): string {
  const parts: string[] = [];
  if (modes.includes('lockedTo')) parts.push('Lock copies another track.');
  if (modes.includes('sequence')) parts.push('Sequence plays children in order.');
  if (modes.includes('aligned')) parts.push('Aligned uses start and duration.');
  if (modes.includes('autoRange')) {
    parts.push('Auto range starts at the first child and ends at the last.');
  }
  return parts.join(' ');
}

function trackShellSchema(modes: readonly string[], trackTypeDefault?: string) {
  const values = (
    modes.length > 0 ? [...modes] : [...DEFAULT_TRACK_MODES]
  ) as [string, ...string[]];
  const initial = values.includes(trackTypeDefault ?? '')
    ? (trackTypeDefault as string)
    : values.includes('aligned')
      ? 'aligned'
      : values[0];

  return z.object({
    trackName: z
      .string()
      .meta({ [paramMetaTypes.trackName]: true })
      .describe('Name of the track (used for the ID)'),
    trackType: z
      .enum(values)
      .default(initial)
      .describe(describeModes(values)),
    start: z
      .number()
      .default(0)
      .describe('Start of this track in its parent scene, in seconds'),
    startOffset: z
      .number()
      .optional()
      .describe(
        'Negative trim from the head, in seconds. The end stays put.',
      ),
    duration: z
      .number()
      .optional()
      .describe(
        'Duration in seconds. Used when the track is aligned. A lock takes its length from the target.',
      ),
    lock: z
      .string()
      .optional()
      .meta({ [paramMetaTypes.lockTarget]: true })
      .describe('Lock start and duration to a sibling or parent track'),
    attachedToId: z
      .string()
      .default('BaseScene')
      .meta({ [paramMetaTypes.attachTarget]: true })
      .describe(
        'Parent to insert into. BaseScene, or another scene track name.',
      ),
  });
}

/**
 * Merge the shared track fields in front of a preset's own params.
 * `build` is the only function that is stringified. The container or atom
 * shell is applied later in runPreset, because a closure would not survive
 * `new Function`.
 */
export function definePreset<T extends z.ZodRawShape>(spec: {
  metadata: PresetMetadata;
  placement: 'container' | 'atom';
  trackModes?: readonly string[];
  trackTypeDefault?: string;
  params: z.ZodObject<T>;
  build: (
    params: z.infer<z.ZodObject<T>> & TrackShellParams,
    props?: any,
  ) => ContainerBuild | AtomBuild | Promise<ContainerBuild | AtomBuild>;
}): Preset {
  const shell = trackShellSchema(
    spec.trackModes ?? DEFAULT_TRACK_MODES,
    spec.trackTypeDefault,
  );
  const merged = shell.extend(spec.params.shape);

  return {
    metadata: {
      ...spec.metadata,
      placement: spec.placement,
    },
    presetFunction: spec.build.toString(),
    presetParams: z.toJSONSchema(merged),
  };
}
