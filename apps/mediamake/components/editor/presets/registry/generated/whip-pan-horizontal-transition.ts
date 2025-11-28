/**
 * Whip Pan Horizontal Smear Transition Preset
 *
 * Creates a fast lateral camera movement transition between two media items with:
 * - Extremely short overlap duration (0.15-0.25s) for snappy YouTube-style edits
 * - Horizontal motion blur (blur-x) during rapid lateral slide
 * - Synchronized scale stretch (scaleX: 1.1-1.15) at peak motion
 * - Sharp ease-out/ease-in curves for characteristic whip pan snap
 * - Overflow-hidden container to clip sliding content
 * - Peak motion blur at exact midpoint then sharpening as settled
 *
 * Perfect for high-energy content: gaming clips, vlogs, action montages
 *
 * Technical approach:
 * - Single BaseLayout container with overflow-hidden
 * - Outgoing media: slides left (-120%) with blur bell curve and scaleX stretch
 * - Incoming media: slides in from right (120%) with matching blur/scale
 * - Effects use provider mode targeting each media atom directly
 * - Timing: overlap period = 0.2s default (configurable 0.15-0.25s)
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ─────────────────────────────────────────────────────────────────────────────
// PARAMETERS SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media configuration'),

  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media configuration'),

  overlapDuration: z
    .number()
    .min(0.15)
    .max(0.25)
    .default(0.2)
    .describe('Transition overlap duration in seconds (0.15-0.25s for snappy feel)'),

  peakBlur: z
    .number()
    .min(10)
    .max(30)
    .default(20)
    .describe('Peak horizontal blur amount in pixels at midpoint'),

  peakScaleX: z
    .number()
    .min(1.05)
    .max(1.2)
    .default(1.15)
    .describe('Peak horizontal scale stretch at motion peak'),

  easingCurve: z
    .array(z.number())
    .length(4)
    .default([0.25, 0.1, 0.25, 1])
    .describe('Cubic bezier easing curve for snap effect'),
});

type PresetParams = z.infer<typeof presetParams>;

// ─────────────────────────────────────────────────────────────────────────────
// PRESET EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration, peakBlur, peakScaleX, easingCurve } =
    params;

  // Calculate container duration: sum of media durations minus overlap
  const containerDuration = media1.duration + media2.duration - overlapDuration;

  // Determine component IDs for media atoms
  const getMediaComponentId = (type: 'image' | 'video'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  const media1ComponentId = getMediaComponentId(media1.type);
  const media2ComponentId = getMediaComponentId(media2.type);

  // Build cubic-bezier easing string
  const easingString = `cubic-bezier(${easingCurve.join(',')})`;

  // ───────────────────────────────────────────────────────────────────────────
  // OUTGOING MEDIA (slides left with blur)
  // ───────────────────────────────────────────────────────────────────────────

  const outgoingMedia: RenderableComponentData = {
    id: 'outgoing-media',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'w-full h-full',
      fit: 'cover',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      // Transform effect: slide left + scaleX stretch
      {
        id: 'outgoing-transform',
        componentId: 'generic',
        data: {
          type: easingString,
          start: media1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-media'],
          ranges: [
            // Slide from 0% to -120% (off-screen left)
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-120%', prog: 1 },
            // Scale stretch: 1 → 1.15 → 1 (bell curve)
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: peakScaleX, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
      // Blur effect: bell curve 0px → peakBlur → 0px
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: easingString,
          start: media1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-media'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${peakBlur}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // ───────────────────────────────────────────────────────────────────────────
  // INCOMING MEDIA (slides in from right with blur)
  // ───────────────────────────────────────────────────────────────────────────

  const incomingMedia: RenderableComponentData = {
    id: 'incoming-media',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      className: 'w-full h-full',
      fit: 'cover',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2, // Above outgoing media
      },
    },
    context: {
      timing: {
        start: media1.duration - overlapDuration, // Start when overlap begins
        duration: media2.duration,
      },
    },
    effects: [
      // Transform effect: slide from right + scaleX stretch
      {
        id: 'incoming-transform',
        componentId: 'generic',
        data: {
          type: easingString,
          start: 0, // Relative to incoming media start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-media'],
          ranges: [
            // Slide from 120% (off-screen right) to 0%
            { key: 'translateX', val: '120%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
            // Scale stretch: 1 → 1.15 → 1 (bell curve)
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: peakScaleX, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
      // Blur effect: starts blurred, sharpens
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: easingString,
          start: 0, // Relative to incoming media start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-media'],
          ranges: [
            { key: 'filter', val: `blur(${peakBlur}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // ───────────────────────────────────────────────────────────────────────────
  // ROOT CONTAINER (overflow-hidden to clip sliding content)
  // ───────────────────────────────────────────────────────────────────────────

  const rootContainer: RenderableComponentData = {
    id: 'whip-pan-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
      },
    },
    childrenData: [outgoingMedia, incomingMedia],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────────────────────

const presetMetadata: PresetMetadata = {
  id: 'whip-pan-horizontal-transition',
  title: 'Whip Pan Horizontal Smear Transition',
  description:
    'Fast lateral camera movement transition with extreme horizontal motion blur, snappy easing, and peak motion stretch. Perfect for high-energy content like gaming clips, vlogs, or action montages. Uses 0.15-0.25s overlap for that characteristic YouTube edit snap.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'whip-pan', 'motion-blur', 'horizontal', 'smear', 'youtube', 'gaming', 'vlog', 'action'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 3,
    },
    overlapDuration: 0.2,
    peakBlur: 20,
    peakScaleX: 1.15,
    easingCurve: [0.25, 0.1, 0.25, 1],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const whipPanHorizontalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
