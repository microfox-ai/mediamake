import type { PresetOutput } from '../types';
import { clockRange } from '../registry/general/track-timing-legacy';
import {
  ATOM_FILL_STYLE,
  type AtomBuild,
  type ContainerBuild,
  type ContainerProps,
  type TrackShellParams,
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
  style: ATOM_FILL_STYLE,
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

const LAYOUT_BOX_KEYS = ['left', 'top', 'right', 'bottom', 'width', 'height'] as const;

function inputLayoutStyle(params: unknown): Record<string, unknown> | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const container = (params as { containerProps?: unknown }).containerProps;
  if (!container || typeof container !== 'object') return undefined;
  const style = (container as { style?: unknown }).style;
  if (!style || typeof style !== 'object' || Array.isArray(style)) return undefined;
  const record = style as Record<string, unknown>;
  return Object.keys(record).length > 0 ? record : undefined;
}

const LAYOUT_POSITION_KEYS = ['position', 'transform', ...LAYOUT_BOX_KEYS] as const;

/**
 * Stamp the Layout section onto a container.
 * Keys the section owns are replaced by the UI style. Colour and other
 * preset keys stay. `inset-0` is removed so it cannot put the fill back,
 * and a relative layout drops the `absolute` class.
 */
export function mergeLayoutOntoContainer(
  existing: { className?: string; style?: Record<string, unknown> } | null | undefined,
  layout: Record<string, unknown>,
): { className?: string; style?: Record<string, unknown> } {
  const base =
    existing && typeof existing === 'object' ? existing : {};
  const { style: previousStyle, className: previousClass, ...rest } = base;
  const style: Record<string, unknown> =
    previousStyle && typeof previousStyle === 'object' && !Array.isArray(previousStyle)
      ? { ...previousStyle }
      : {};
  for (const key of LAYOUT_POSITION_KEYS) delete style[key];
  for (const key of Object.keys(style)) {
    if (key.startsWith('--mm-')) delete style[key];
  }
  for (const [key, value] of Object.entries(layout)) {
    if (value === undefined || value === '') delete style[key];
    else style[key] = value;
  }

  let className = typeof previousClass === 'string' ? previousClass : undefined;
  const position = layout.position;
  const touchesBox =
    LAYOUT_BOX_KEYS.some((key) => layout[key] !== undefined && layout[key] !== '') ||
    position === 'relative' ||
    position === 'absolute';
  if (className && touchesBox) {
    className = className.replace(/\binset-0\b/g, ' ');
    if (position === 'relative') {
      className = className.replace(/\babsolute\b/g, ' ').replace(/\bfixed\b/g, ' ');
    }
    className = className.replace(/\s+/g, ' ').trim();
  }

  return {
    ...rest,
    ...(className ? { className } : {}),
    ...(Object.keys(style).length > 0 ? { style } : {}),
  };
}

/** Stamp `params.containerProps.style` onto the preset's root node. */
export function applyInputContainerLayout<T>(params: unknown, result: T): T {
  const layout = inputLayoutStyle(params);
  if (!layout) return result;
  const output = (result as { output?: { childrenData?: unknown[] } } | null)?.output;
  const children = output?.childrenData;
  if (!Array.isArray(children) || children.length === 0) return result;
  const [first, ...rest] = children;
  if (!first || typeof first !== 'object') return result;
  const node = first as { data?: unknown };
  const data =
    node.data && typeof node.data === 'object' && !Array.isArray(node.data)
      ? { ...(node.data as Record<string, unknown>) }
      : {};
  const existing = data.containerProps;
  data.containerProps = mergeLayoutOntoContainer(
    existing && typeof existing === 'object'
      ? (existing as { className?: string; style?: Record<string, unknown> })
      : undefined,
    layout,
  );
  return {
    ...(result as object),
    output: {
      ...output,
      childrenData: [{ ...(first as object), data }, ...rest],
    },
  } as T;
}
