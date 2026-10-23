/**
 * Text overlay is deprecated. This turns a saved text overlay input into
 * `atom:TextAtom` input: the same text, typography, timing, placement and
 * edge transitions, on a single atom instead of a BaseLayout wrapper.
 */

import type { ClipTransition, TransitionEasing } from '@microfox/remotion/transitions';
import { commitPlacement, type AxisAlign } from '../../form/inputs/position-style';
import { migrateTextOverlayInputData } from './text-overlay';

export const TEXT_ATOM_PRESET_ID = 'atom:TextAtom';

/** Track shell and tree fields carried over unchanged. */
const SHELL_KEYS = [
  'parentId',
  'trackName',
  'trackType',
  'start',
  'startOffset',
  'duration',
  'lock',
  'attachedToId',
] as const;

type Alignment =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center-center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function px(value: unknown): unknown {
  return typeof value === 'number' ? `${value}px` : value;
}

function edgeText(value: unknown): string {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string' && value.trim()) return value.trim();
  return '0';
}

function selfAxes(alignment: unknown): { x: AxisAlign; y: AxisAlign } {
  const [vertical, horizontal] = (
    typeof alignment === 'string' ? (alignment as Alignment) : 'center-center'
  ).split('-');
  const axis = (part: string | undefined): AxisAlign =>
    part === 'top' || part === 'left'
      ? 'start'
      : part === 'bottom' || part === 'right'
        ? 'end'
        : 'center';
  return { x: axis(horizontal), y: axis(vertical) };
}

/**
 * The overlay pinned a flex box with top/right/bottom/left and aligned the
 * text inside it. The atom gets the same edges with self alignment, so the
 * Layout section can keep editing it. `fit-content` keeps long text wrapping.
 */
function layoutStyle(
  position: Record<string, unknown>,
  filter: unknown,
): Record<string, unknown> {
  const { x, y } = selfAxes(position.alignment);
  const style =
    commitPlacement(
      undefined,
      {
        mode: 'absolute',
        left: edgeText(position.left),
        right: edgeText(position.right),
        top: edgeText(position.top),
        bottom: edgeText(position.bottom),
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        scaleLinked: true,
        flipX: false,
        flipY: false,
        selfX: x,
        selfY: y,
        clip: false,
      },
      { layout: true, items: false, self: true },
    ) ?? {};
  if (style.width === 'max-content') style.width = 'fit-content';
  if (style.height === 'max-content') style.height = 'fit-content';
  if (typeof filter === 'string' && filter.trim()) style.filter = filter;
  return style;
}

/** Same defaults the overlay build applied: Inter, 24px, white. */
function textStyle(style: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...style };
  delete next.filter;
  if (typeof next.fontFamily !== 'string' || !next.fontFamily.trim()) {
    next.fontFamily = 'Inter';
  }
  if (next.fontSize == null) next.fontSize = 24;
  if (next.color == null) next.color = '#FFFFFF';
  if (next.padding != null) next.padding = px(next.padding);
  if (next.borderRadius != null) next.borderRadius = px(next.borderRadius);
  return next;
}

type Motion = { type: string; amount: number; easing: TransitionEasing };

const FADE: Motion = { type: 'fade', amount: 1, easing: 'linear' };

/**
 * Overlay transitions faded and moved by fixed pixels. Clip transitions move
 * by a share of the text box, so slides use a quarter of it.
 * Shake has no clip transition; shake-in keeps its fade, shake-out is dropped.
 */
const IN_MOTIONS: Record<string, Motion[]> = {
  opacity: [FADE],
  'slide-in-right': [FADE, { type: 'slide-left', amount: 0.25, easing: 'bezier' }],
  'slide-in-left': [FADE, { type: 'slide-right', amount: 0.25, easing: 'bezier' }],
  'slide-in-top': [FADE, { type: 'slide-down', amount: 0.25, easing: 'bezier' }],
  'slide-in-bottom': [FADE, { type: 'slide-up', amount: 0.25, easing: 'bezier' }],
  'scale-in': [FADE, { type: 'scale-in', amount: 0.2, easing: 'bezier' }],
  'scale-out': [FADE, { type: 'scale-in', amount: 0.1, easing: 'bezier' }],
  'blur-in': [FADE, { type: 'blur', amount: 0.5, easing: 'bezier' }],
  'shake-in': [FADE],
};

const OUT_MOTIONS: Record<string, Motion[]> = {
  opacity: [FADE],
  'slide-out-right': [FADE, { type: 'slide-right', amount: 0.25, easing: 'bezier' }],
  'slide-out-left': [FADE, { type: 'slide-left', amount: 0.25, easing: 'bezier' }],
  'slide-out-top': [FADE, { type: 'slide-up', amount: 0.25, easing: 'bezier' }],
  'slide-out-bottom': [FADE, { type: 'slide-down', amount: 0.25, easing: 'bezier' }],
  'scale-out': [FADE, { type: 'scale-in', amount: 0.1, easing: 'bezier' }],
  'blur-out': [FADE, { type: 'blur', amount: 0.5, easing: 'bezier' }],
};

function clipTransitions(raw: unknown): ClipTransition[] {
  if (!isRecord(raw)) return [];
  const out: ClipTransition[] = [];
  const add = (
    edge: 'in' | 'out',
    name: unknown,
    duration: unknown,
    table: Record<string, Motion[]>,
  ) => {
    if (typeof name !== 'string') return;
    const motions = table[name];
    if (!motions) return;
    const seconds =
      typeof duration === 'number' && duration > 0
        ? duration
        : name === 'shake-in'
          ? 0.5
          : 1;
    for (const motion of motions) {
      out.push({
        id: `overlay-${edge}-${motion.type}`,
        type: motion.type,
        edge,
        duration: name === 'shake-in' ? Math.min(seconds, 0.5) : seconds,
        easing: motion.easing,
        amount: motion.amount,
      });
    }
  };
  add('in', raw.fadeInTransition, raw.fadeInDuration, IN_MOTIONS);
  add('out', raw.fadeOutTransition, raw.fadeOutDuration, OUT_MOTIONS);
  return out;
}

/** Build `atom:TextAtom` input from a text overlay input, legacy fields included. */
export function textOverlayToTextAtom(input: unknown): Record<string, unknown> {
  const data = migrateTextOverlayInputData(isRecord(input) ? input : {});
  const next: Record<string, unknown> = {};
  for (const key of SHELL_KEYS) {
    if (data[key] !== undefined) next[key] = data[key];
  }
  if (typeof next.trackType !== 'string') next.trackType = 'aligned';
  if (typeof next.attachedToId !== 'string') next.attachedToId = 'BaseScene';

  const style = isRecord(data.style) ? data.style : {};
  next.text = typeof data.text === 'string' ? data.text : '';
  next.style = textStyle(style);
  next.containerProps = {
    style: layoutStyle(isRecord(data.position) ? data.position : {}, style.filter),
  };
  const transitions = clipTransitions(data.transitions);
  if (transitions.length > 0) next.transitions = transitions;
  return next;
}
