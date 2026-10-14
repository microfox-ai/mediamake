import type { PresetOutput } from '../types';
import { clockRange } from '../registry/general/track-timing-legacy';
import type {
  AtomBuild,
  ContainerBuild,
  ContainerProps,
  TrackShellParams,
} from '../define-preset';

interface ShellTiming {
  start: number;
  duration?: number;
  startOffset?: number;
  sequence: boolean;
  locked: boolean;
  autoRange: boolean;
}

function positive(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function resolveTrackTiming(
  params: TrackShellParams,
  fallback?: { start?: number; duration?: number },
): ShellTiming {
  const lockTarget =
    (typeof params.lock === 'string' && params.lock.trim()) ||
    (typeof params.trackFitDurationTo === 'string' &&
      params.trackFitDurationTo.trim()) ||
    '';
  const trackType = params.trackType;
  const locked =
    trackType === 'lockedTo' ||
    (lockTarget.length > 0 &&
      trackType !== 'sequence' &&
      trackType !== 'aligned' &&
      trackType !== 'autoRange');
  const sequence = !locked && trackType === 'sequence';
  const autoRange = !locked && trackType === 'autoRange';
  const fromRange =
    typeof params.trackRange === 'string' ? clockRange(params.trackRange) : null;
  const start =
    finite(params.start) ??
    finite(params.trackStartOffset) ??
    fromRange?.start ??
    finite(fallback?.start) ??
    0;
  const authored =
    positive(params.duration) ??
    positive(params.trackDuration) ??
    (fromRange && fromRange.duration > 0 ? fromRange.duration : undefined);
  const length = authored ?? positive(fallback?.duration);

  const timing: ShellTiming = { start, sequence, locked, autoRange };
  if (!locked && !autoRange && typeof length === 'number') {
    timing.duration = length;
  }
  if (typeof params.startOffset === 'number' && params.startOffset < 0) {
    timing.startOffset = params.startOffset;
  }
  return timing;
}

function trackId(params: TrackShellParams): string {
  const name = typeof params.trackName === 'string' ? params.trackName.trim() : '';
  return name || 'track';
}

function parentId(params: TrackShellParams): string {
  const id =
    typeof params.attachedToId === 'string' ? params.attachedToId.trim() : '';
  return id || 'BaseScene';
}

function timingFields(timing: ShellTiming) {
  const next: { start: number; duration?: number; startOffset?: number } = {
    start: timing.start,
  };
  if (typeof timing.duration === 'number') next.duration = timing.duration;
  if (typeof timing.startOffset === 'number') next.startOffset = timing.startOffset;
  return next;
}

function containerData(props: ContainerProps | null | undefined) {
  if (props === null) return {};
  return { containerProps: props ?? { className: 'absolute inset-0' } };
}

const ATOM_FILL: ContainerProps = {
  style: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
};

/** Direct atoms have no layout, so the fill lives on the atom itself. */
function atomData(data: unknown): Record<string, unknown> {
  const base =
    data && typeof data === 'object' && !Array.isArray(data)
      ? { ...(data as Record<string, unknown>) }
      : {};
  if (base.containerProps === null) {
    delete base.containerProps;
    return base;
  }
  const existing = base.containerProps;
  const props =
    existing && typeof existing === 'object'
      ? (existing as ContainerProps)
      : undefined;
  base.containerProps = props ?? ATOM_FILL;
  return base;
}

/**
 * Turn a stringified preset's inner result into a composition node.
 * Container presets get one BaseLayout. Atom presets keep the returned node
 * and fill the parent with absolute containerProps.style.
 */
export function applyTrackShell(
  params: TrackShellParams,
  built: ContainerBuild | AtomBuild | null | undefined,
  placement: 'container' | 'atom',
): PresetOutput {
  const attachedToId = parentId(params);

  if (placement === 'atom') {
    const source = (built && typeof built === 'object' ? built : {}) as AtomBuild;
    const timing = resolveTrackTiming(params);
    const node = {
      ...source,
      id: trackId(params),
      componentId: source.componentId || 'TextAtom',
      type: 'atom' as const,
      data: atomData(source.data),
      context: {
        ...(source.context ?? {}),
        timing: timingFields(timing),
      },
    };
    return {
      output: {
        childrenData: [node] as NonNullable<PresetOutput['output']['childrenData']>,
      },
      options: { attachedToId },
    };
  }

  const source = (built && typeof built === 'object' ? built : {}) as ContainerBuild;
  const timing = resolveTrackTiming(params, {
    start: source.start,
    duration: source.duration,
  });
  const type =
    source.type === 'layout' || source.type === 'scene'
      ? source.type
      : timing.sequence
        ? 'scene'
        : 'layout';
  const node = {
    id: trackId(params),
    componentId: 'BaseLayout',
    type,
    data: containerData(source.containerProps),
    context: { timing: timingFields(timing) },
    childrenData: Array.isArray(source.children) ? source.children : [],
  };
  const output: PresetOutput['output'] = {
    childrenData: [node] as NonNullable<PresetOutput['output']['childrenData']>,
  };
  if (source.config && typeof source.config === 'object') {
    output.config = source.config as PresetOutput['output']['config'];
  }
  return {
    output,
    options: { attachedToId },
  };
}
