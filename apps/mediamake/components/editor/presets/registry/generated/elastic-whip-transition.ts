/**
 * Elastic Whip Transition Preset
 *
 * A dynamic transition with elastic bounce-back physics. The incoming media slides in from the right,
 * overshoots slightly to the left (-5% past center), then bounces back to settle at center position.
 * The outgoing media exits cleanly to the left with matching energy. Features synchronized scale pulse
 * and rotation bounce at the overshoot moment for added emphasis.
 *
 * Key Features:
 * - Elastic overshoot animation (115% → -5% → 0%)
 * - Motion blur during fast movement, crisp during settle
 * - Scale pulse (1.02x) at overshoot moment
 * - Rotation bounce (3deg → -1deg → 0deg)
 * - 0.35-second overlap for bounce physics
 * - Cubic-bezier easing for elastic feel
 *
 * Perfect for:
 * - Gaming content with energetic transitions
 * - Comedic edits requiring playful effects
 * - Youthful brand content
 * - High-energy social media videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ===========================
// PARAMETER SCHEMA
// ===========================

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of the outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration of the outgoing media in seconds'),
    })
    .describe('Outgoing media configuration'),

  media2: z
    .object({
      src: z.string().describe('Source URL of the incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration of the incoming media in seconds'),
    })
    .describe('Incoming media configuration'),

  transitionDuration: z
    .number()
    .default(0.35)
    .describe('Duration of the elastic whip transition overlap in seconds'),

  overshootPercent: z
    .number()
    .default(-5)
    .describe('Overshoot amount as percentage (negative = left overshoot)'),

  scalePulse: z
    .number()
    .default(1.02)
    .describe('Scale multiplier at overshoot moment (1.02 = 2% increase)'),

  rotationStart: z
    .number()
    .default(3)
    .describe('Initial rotation in degrees at start of incoming transition'),

  rotationOvershoot: z
    .number()
    .default(-1)
    .describe('Rotation in degrees at overshoot moment'),
});

type PresetParams = z.infer<typeof presetParams>;

// ===========================
// PRESET EXECUTION
// ===========================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    transitionDuration,
    overshootPercent,
    scalePulse,
    rotationStart,
    rotationOvershoot,
  } = params;

  // Calculate total duration accounting for overlap
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Create outgoing media with exit animation
  const outgoingMedia: RenderableComponentData = {
    id: 'outgoing-media',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-exit-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media'],
          ranges: [
            // Translate from center to left exit
            { key: 'translateX', val: 0, prog: 0, unit: '%' },
            { key: 'translateX', val: -115, prog: 1, unit: '%' },
            // Motion blur increases as it exits
            { key: 'blur', val: 0, prog: 0, unit: 'px' },
            { key: 'blur', val: 20, prog: 1, unit: 'px' },
          ],
        },
      },
    ],
  };

  // Create incoming media with elastic bounce animation
  const incomingMedia: RenderableComponentData = {
    id: 'incoming-media',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
        duration: media2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-elastic-bounce',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming media start
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media'],
          ranges: [
            // translateX: 115% → -5% → 0% (elastic bounce)
            { key: 'translateX', val: 115, prog: 0, unit: '%' },
            { key: 'translateX', val: overshootPercent, prog: 0.7, unit: '%' },
            { key: 'translateX', val: 0, prog: 1, unit: '%' },
            // Motion blur: high → medium → none (crisp settle)
            { key: 'blur', val: 20, prog: 0, unit: 'px' },
            { key: 'blur', val: 5, prog: 0.7, unit: 'px' },
            { key: 'blur', val: 0, prog: 1, unit: 'px' },
            // Scale pulse: 1 → 1.02 → 1 (emphasis at overshoot)
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: scalePulse, prog: 0.7 },
            { key: 'scale', val: 1, prog: 1 },
            // Rotation bounce: 3deg → -1deg → 0deg
            { key: 'rotate', val: rotationStart, prog: 0, unit: 'deg' },
            { key: 'rotate', val: rotationOvershoot, prog: 0.7, unit: 'deg' },
            { key: 'rotate', val: 0, prog: 1, unit: 'deg' },
          ],
        },
      },
    ],
  };

  // Root container for the transition
  const rootContainer: RenderableComponentData = {
    id: 'elastic-whip-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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

// ===========================
// PRESET METADATA
// ===========================

const presetMetadata: PresetMetadata = {
  id: 'elastic-whip-transition',
  title: 'Elastic Whip Transition',
  description:
    'Dynamic elastic whip transition with bounce-back physics, overshoot animation, and playful motion blur effects. Incoming media slides from right with elastic bounce (115% → -5% → 0%), while outgoing media exits cleanly left. Features synchronized scale pulse (1.02x) and rotation bounce (3deg → -1deg → 0deg) at overshoot moment. Perfect for gaming content, comedic edits, or youthful brand content with energetic feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'elastic',
    'whip',
    'bounce',
    'overshoot',
    'playful',
    'energetic',
    'gaming',
    'comedy',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video' as const,
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video' as const,
      duration: 3,
    },
    transitionDuration: 0.35,
    overshootPercent: -5,
    scalePulse: 1.02,
    rotationStart: 3,
    rotationOvershoot: -1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ===========================
// EXPORT
// ===========================

export const elasticWhipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
