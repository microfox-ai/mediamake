/**
 * Clip-edge transitions.
 *
 * Authored records stay anchored to the start or the end of a host.
 * `compileClipTransitions` turns them into generic provider effects, or an
 * audio volume envelope, using the host's current duration.
 */

export type TransitionTarget = 'text' | 'image' | 'video' | 'audio' | 'preset';

export type TransitionEdge = 'in' | 'out';

export type TransitionEasing = 'linear' | 'spring' | 'bezier';

export interface ClipTransition {
  id: string;
  type: string;
  edge: TransitionEdge;
  duration: number;
  easing: TransitionEasing;
  amount: number;
  /** Shared by the in and out records created with "both ends". */
  linkId?: string;
}

export interface VolumeFade {
  edge: TransitionEdge;
  duration: number;
  amount: number;
}

export interface VolumeEnvelope {
  fades: VolumeFade[];
}

export interface CompiledTransitionEffect {
  id: string;
  componentId: 'generic';
  data: {
    origin: 'transition';
    mode: 'provider';
    targetIds: string[];
    type: TransitionEasing;
    ranges: { key: string; val: number | string; prog: number }[];
    duration: number;
    start: number;
    inactiveBehavior: 'none' | 'hold-end';
  };
}

export interface TransitionCatalogEntry {
  id: string;
  label: string;
  targets: TransitionTarget[];
  defaultDuration: number;
  defaultAmount: number;
  /** Audio entries become a volume envelope. Visual entries become generic effects. */
  channel: 'visual' | 'audio';
}

const VISUAL_TARGETS: TransitionTarget[] = ['text', 'image', 'video', 'preset'];

export const TRANSITION_CATALOG: TransitionCatalogEntry[] = [
  {
    id: 'fade',
    label: 'Fade',
    targets: VISUAL_TARGETS,
    defaultDuration: 0.5,
    defaultAmount: 1,
    channel: 'visual',
  },
  {
    id: 'blur',
    label: 'Blur',
    targets: VISUAL_TARGETS,
    defaultDuration: 0.5,
    defaultAmount: 1,
    channel: 'visual',
  },
  {
    id: 'slide-left',
    label: 'Slide left',
    targets: VISUAL_TARGETS,
    defaultDuration: 0.5,
    defaultAmount: 1,
    channel: 'visual',
  },
  {
    id: 'slide-right',
    label: 'Slide right',
    targets: VISUAL_TARGETS,
    defaultDuration: 0.5,
    defaultAmount: 1,
    channel: 'visual',
  },
  {
    id: 'slide-up',
    label: 'Slide up',
    targets: VISUAL_TARGETS,
    defaultDuration: 0.5,
    defaultAmount: 1,
    channel: 'visual',
  },
  {
    id: 'slide-down',
    label: 'Slide down',
    targets: VISUAL_TARGETS,
    defaultDuration: 0.5,
    defaultAmount: 1,
    channel: 'visual',
  },
  {
    id: 'scale-in',
    label: 'Scale',
    targets: VISUAL_TARGETS,
    defaultDuration: 0.5,
    defaultAmount: 1,
    channel: 'visual',
  },
  {
    id: 'fade',
    label: 'Fade',
    targets: ['audio'],
    defaultDuration: 0.5,
    defaultAmount: 1,
    channel: 'audio',
  },
];

export const MIN_TRANSITION_SEC = 0.05;

export function hostTargetForComponent(
  componentId: string | undefined,
): TransitionTarget | null {
  switch (componentId) {
    case 'TextAtom':
      return 'text';
    case 'ImageAtom':
    case 'ImageBeat':
      return 'image';
    case 'VideoAtom':
      return 'video';
    case 'AudioAtom':
      return 'audio';
    case 'BaseLayout':
      return 'preset';
    default:
      return null;
  }
}

export function catalogForTarget(
  target: TransitionTarget | null,
): TransitionCatalogEntry[] {
  if (!target) return [];
  return TRANSITION_CATALOG.filter((entry) => entry.targets.includes(target));
}

export function catalogEntry(
  type: string,
  target: TransitionTarget,
): TransitionCatalogEntry | undefined {
  return TRANSITION_CATALOG.find(
    (entry) => entry.id === type && entry.targets.includes(target),
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asEasing(value: unknown): TransitionEasing {
  return value === 'spring' || value === 'bezier' ? value : 'linear';
}

function asEdge(value: unknown): TransitionEdge | null {
  return value === 'in' || value === 'out' ? value : null;
}

let idSerial = 0;

export function nextTransitionId(prefix = 'tr'): string {
  idSerial += 1;
  return `${prefix}-${idSerial.toString(36)}`;
}

export function createClipTransition(
  type: string,
  edge: TransitionEdge,
  target: TransitionTarget,
  linkId?: string,
): ClipTransition {
  const entry = catalogEntry(type, target);
  return {
    id: nextTransitionId(),
    type,
    edge,
    duration: entry?.defaultDuration ?? 0.5,
    easing: 'linear',
    amount: entry?.defaultAmount ?? 1,
    ...(linkId ? { linkId } : {}),
  };
}

/** Two records that share a link so the inspector can match the other end. */
export function createClipTransitionPair(
  type: string,
  target: TransitionTarget,
): ClipTransition[] {
  const linkId = nextTransitionId('link');
  return [
    createClipTransition(type, 'in', target, linkId),
    createClipTransition(type, 'out', target, linkId),
  ];
}

function readLegacy(raw: unknown): ClipTransition[] {
  if (!Array.isArray(raw)) return [];
  const out: ClipTransition[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    if (asEdge(record.edge)) return;
    const timing = record.timing === 'in' || record.timing === 'out' || record.timing === 'in&out'
      ? record.timing
      : 'in&out';
    const animation = typeof record.animation === 'string' ? record.animation : 'fade';
    const amount = finiteNumber(record.impact ?? record.amount, 1);
    const easing = asEasing(record.animationType ?? record.easing);
    const inDur = finiteNumber(record.inRange, 0.5);
    const outDur = finiteNumber(record.outRange, 0.5);
    const base =
      typeof record.id === 'string' && record.id.trim()
        ? record.id.trim()
        : `legacy-${index}`;
    const linkId = timing === 'in&out' ? `${base}:both` : undefined;
    if (timing === 'in' || timing === 'in&out') {
      out.push({
        id: `${base}:in`,
        type: animation,
        edge: 'in',
        duration: inDur,
        easing,
        amount,
        ...(linkId ? { linkId } : {}),
      });
    }
    if (timing === 'out' || timing === 'in&out') {
      out.push({
        id: `${base}:out`,
        type: animation,
        edge: 'out',
        duration: outDur,
        easing,
        amount,
        ...(linkId ? { linkId } : {}),
      });
    }
  });
  return out;
}

function readAuthored(raw: unknown): ClipTransition[] {
  if (!Array.isArray(raw)) return [];
  const out: ClipTransition[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    const edge = asEdge(record.edge);
    if (!edge) return;
    const type = typeof record.type === 'string' && record.type.trim()
      ? record.type.trim()
      : 'fade';
    out.push({
      id:
        typeof record.id === 'string' && record.id.trim()
          ? record.id.trim()
          : `tr-${index}`,
      type,
      edge,
      duration: Math.max(0, finiteNumber(record.duration, 0.5)),
      easing: asEasing(record.easing),
      amount: finiteNumber(record.amount, 1),
      ...(typeof record.linkId === 'string' && record.linkId
        ? { linkId: record.linkId }
        : {}),
    });
  });
  return out;
}

/**
 * Accepts the authored list, or imageloop's older `transitionEffects` objects
 * (`timing: in | out | in&out`).
 */
export function normalizeClipTransitions(raw: unknown): ClipTransition[] {
  const authored = readAuthored(raw);
  if (authored.length > 0) return authored;
  return readLegacy(raw);
}

/** Prefer `transitions`, then the legacy `transitionEffects` field. */
export function transitionsFromHost(host: unknown): ClipTransition[] {
  if (!host || typeof host !== 'object') return [];
  const record = host as { transitions?: unknown; transitionEffects?: unknown };
  if (Array.isArray(record.transitions) && record.transitions.length > 0) {
    return normalizeClipTransitions(record.transitions);
  }
  const legacy = normalizeClipTransitions(record.transitionEffects);
  if (legacy.length > 0) return legacy;
  return normalizeClipTransitions(record.transitions);
}

export function transitionsOnEdge(
  transitions: ClipTransition[],
  edge: TransitionEdge,
): ClipTransition[] {
  return transitions.filter((transition) => transition.edge === edge);
}

export function longestOnEdge(
  transitions: ClipTransition[],
  edge: TransitionEdge,
): ClipTransition | null {
  let best: ClipTransition | null = null;
  for (const transition of transitions) {
    if (transition.edge !== edge) continue;
    if (!best || transition.duration >= best.duration) best = transition;
  }
  return best;
}

export function cappedTransitionDuration(
  duration: number,
  clipDuration: number,
): number {
  const raw = Number.isFinite(duration) && duration > 0 ? duration : 0;
  if (!(clipDuration > 0)) return raw;
  return Math.min(raw, clipDuration);
}

function rangesFor(
  animation: string,
  impact: number,
  edge: TransitionEdge,
): { key: string; val: number | string; prog: number }[] {
  const amount = Number.isFinite(impact) ? impact : 1;
  const fade = clamp01(amount);
  const slide = `${amount * 100}%`;
  const slideNeg = `-${amount * 100}%`;
  const blurPx = Math.max(0, amount * 20);
  const scaleFrom = Math.max(0, 1 - amount);
  const isIn = edge === 'in';
  switch (animation) {
    case 'blur':
      return [
        { key: 'blur', val: isIn ? blurPx : 0, prog: 0 },
        { key: 'blur', val: isIn ? 0 : blurPx, prog: 1 },
      ];
    case 'slide-left':
      return [
        { key: 'translateX', val: isIn ? slide : '0%', prog: 0 },
        { key: 'translateX', val: isIn ? '0%' : slideNeg, prog: 1 },
      ];
    case 'slide-right':
      return [
        { key: 'translateX', val: isIn ? slideNeg : '0%', prog: 0 },
        { key: 'translateX', val: isIn ? '0%' : slide, prog: 1 },
      ];
    case 'slide-up':
      return [
        { key: 'translateY', val: isIn ? slide : '0%', prog: 0 },
        { key: 'translateY', val: isIn ? '0%' : slideNeg, prog: 1 },
      ];
    case 'slide-down':
      return [
        { key: 'translateY', val: isIn ? slideNeg : '0%', prog: 0 },
        { key: 'translateY', val: isIn ? '0%' : slide, prog: 1 },
      ];
    case 'scale-in':
      return [
        { key: 'scale', val: isIn ? scaleFrom : 1, prog: 0 },
        { key: 'scale', val: isIn ? 1 : scaleFrom, prog: 1 },
      ];
    case 'fade':
    default:
      return [
        { key: 'opacity', val: isIn ? 1 - fade : 1, prog: 0 },
        { key: 'opacity', val: isIn ? 1 : 1 - fade, prog: 1 },
      ];
  }
}

export function compileClipTransitions(input: {
  transitions: ClipTransition[];
  clipDuration: number;
  targetId: string;
  target: TransitionTarget;
}): { effects: CompiledTransitionEffect[]; volumeEnvelope: VolumeEnvelope | null } {
  const effects: CompiledTransitionEffect[] = [];
  const fades: VolumeFade[] = [];
  const clipDuration = finiteNumber(input.clipDuration, 0);

  for (const transition of input.transitions) {
    const entry = catalogEntry(transition.type, input.target);
    if (!entry) continue;
    const duration = cappedTransitionDuration(transition.duration, clipDuration);
    if (!(duration > 0)) continue;
    if (entry.channel === 'audio') {
      fades.push({
        edge: transition.edge,
        duration,
        amount: clamp01(transition.amount),
      });
      continue;
    }
    const start =
      transition.edge === 'in'
        ? 0
        : clipDuration > 0
          ? Math.max(0, clipDuration - duration)
          : 0;
    if (transition.edge === 'out' && !(clipDuration > 0)) continue;
    effects.push({
      id: `transition:${transition.id}`,
      componentId: 'generic',
      data: {
        origin: 'transition',
        mode: 'provider',
        targetIds: [input.targetId],
        type: transition.easing,
        ranges: rangesFor(transition.type, transition.amount, transition.edge),
        duration,
        start,
        inactiveBehavior: transition.edge === 'out' ? 'hold-end' : 'none',
      },
    });
  }

  return {
    effects,
    volumeEnvelope: fades.length > 0 ? { fades } : null,
  };
}

export function isCompiledTransitionEffect(effect: unknown): boolean {
  if (!effect || typeof effect !== 'object') return false;
  const record = effect as { id?: unknown; data?: unknown };
  if (typeof record.id === 'string' && record.id.startsWith('transition:')) return true;
  const data = record.data;
  if (!data || typeof data !== 'object') return false;
  return (data as { origin?: unknown }).origin === 'transition';
}

export function stripCompiledTransitionEffects<T>(effects: T[] | undefined): T[] {
  if (!Array.isArray(effects)) return [];
  return effects.filter((effect) => !isCompiledTransitionEffect(effect));
}

export interface TransitionHost {
  id?: string;
  componentId?: string;
  transitions?: ClipTransition[];
  effects?: unknown[];
  data?: Record<string, unknown>;
  context?: { timing?: { duration?: number } };
}

/** Replace baked transition effects using the host's current duration. */
export function attachCompiledTransitions<T extends TransitionHost>(node: T): T {
  const transitions = normalizeClipTransitions(node.transitions);
  const hadEnvelope = Boolean(
    node.data && typeof node.data === 'object' && 'volumeEnvelope' in node.data,
  );
  const hadBaked = Array.isArray(node.effects) && node.effects.some(isCompiledTransitionEffect);
  if (transitions.length === 0 && !hadEnvelope && !hadBaked) {
    return node;
  }
  const target = hostTargetForComponent(node.componentId);
  const duration =
    typeof node.context?.timing?.duration === 'number'
      ? node.context.timing.duration
      : 0;
  const compiled = target
    ? compileClipTransitions({
        transitions,
        clipDuration: duration,
        targetId: node.id || 'track',
        target,
      })
    : { effects: [], volumeEnvelope: null };
  const data = { ...(node.data ?? {}) };
  if (compiled.volumeEnvelope) data.volumeEnvelope = compiled.volumeEnvelope;
  else delete data.volumeEnvelope;
  delete data.transitions;
  return {
    ...node,
    transitions,
    data,
    effects: [
      ...stripCompiledTransitionEffects(node.effects),
      ...compiled.effects,
    ],
  };
}

/**
 * Left half keeps enter transitions. Right half keeps exit transitions.
 * The cut itself has no transition until the user adds one.
 */
export function transitionsAfterSplit(
  transitions: ClipTransition[],
  side: 'left' | 'right',
): ClipTransition[] {
  return transitions.filter((transition) =>
    side === 'left' ? transition.edge !== 'out' : transition.edge !== 'in',
  );
}

/** Gain multiplier (0–1) for one local time, before the static volume. */
export function volumeGainAt(
  timeSec: number,
  clipDurationSec: number,
  fades: VolumeFade[],
): number {
  let gain = 1;
  for (const fade of fades) {
    const duration = finiteNumber(fade.duration, 0);
    const amount = clamp01(fade.amount);
    if (!(duration > 0)) continue;
    if (fade.edge === 'in') {
      const t = Math.min(1, Math.max(0, timeSec / duration));
      gain *= 1 - amount + amount * t;
      continue;
    }
    if (!(clipDurationSec > 0)) continue;
    const start = Math.max(0, clipDurationSec - Math.min(duration, clipDurationSec));
    if (timeSec < start) continue;
    const span = Math.max(clipDurationSec - start, 0.0001);
    const t = Math.min(1, Math.max(0, (timeSec - start) / span));
    gain *= 1 - amount * t;
  }
  return gain;
}

export function copyTransitionToOtherEdge(
  transitions: ClipTransition[],
  selectedId: string,
): ClipTransition[] {
  const selected = transitions.find((transition) => transition.id === selectedId);
  if (!selected) return transitions;
  const other: TransitionEdge = selected.edge === 'in' ? 'out' : 'in';
  const linkId = selected.linkId || nextTransitionId('link');
  const partner = transitions.find(
    (transition) =>
      transition.id !== selected.id &&
      transition.edge === other &&
      (transition.linkId ? transition.linkId === selected.linkId : transition.type === selected.type),
  );
  const matched = {
    type: selected.type,
    amount: selected.amount,
    easing: selected.easing,
    linkId,
  };
  if (partner) {
    return transitions.map((transition) => {
      if (transition.id === selected.id || transition.id === partner.id) {
        return { ...transition, ...matched };
      }
      return transition;
    });
  }
  const created: ClipTransition = {
    ...selected,
    ...matched,
    id: nextTransitionId(),
    edge: other,
  };
  return transitions.map((transition) =>
    transition.id === selected.id ? { ...transition, linkId } : transition,
  ).concat(created);
}
