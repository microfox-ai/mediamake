/**
 * Spiral Zoom Transition Preset
 *
 * A creative spiral zoom transition where videos swap through a rotating zoom vortex effect.
 * The outgoing video zooms to 2x scale while rotating clockwise 180 degrees and fading out,
 * while the incoming video starts at 0.5x scale, rotates counter-clockwise 180 degrees while
 * zooming to full scale and fading in. Both videos feature a blur effect that peaks at the
 * midpoint for enhanced motion blur.
 *
 * Features:
 * - Dual spiral motion (clockwise outgoing, counter-clockwise incoming)
 * - Scale transitions (2x zoom out, 0.5x to 1x zoom in)
 * - Synchronized rotation (180° opposing directions)
 * - Radial blur simulation peaking at midpoint
 * - Configurable 1.8s transition duration
 * - Smooth ease-in-out timing
 * - GPU-accelerated transforms
 *
 * Use cases:
 * - Creative video transitions for vlogs or montages
 * - Transitions between contrasting scenes
 * - Music video effects
 * - Dynamic content swaps
 * - Vortex-style scene changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================
// PARAMETERS SCHEMA
// ============================================

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of the first (outgoing) video'),
      duration: z
        .number()
        .positive()
        .describe('Duration of the first video in seconds'),
    })
    .describe('First video configuration (outgoing video)'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second (incoming) video'),
      duration: z
        .number()
        .positive()
        .describe('Duration of the second video in seconds'),
    })
    .describe('Second video configuration (incoming video)'),
  transitionDuration: z
    .number()
    .positive()
    .default(1.8)
    .describe('Duration of the spiral zoom transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================
// PRESET EXECUTION
// ============================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Timing calculations
  const outgoingStart = 0;
  const outgoingDuration = video1.duration;
  const incomingStart = video1.duration - transitionDuration;
  const incomingDuration = video2.duration;

  // Effect timing (relative to component start)
  const outgoingEffectStart = video1.duration - transitionDuration;
  const incomingEffectStart = 0;

  // ============================================
  // OUTGOING VIDEO CONTAINER
  // ============================================

  const outgoingVideoContainer: RenderableComponentData = {
    id: 'spiral-zoom-outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    childrenData: [
      {
        id: 'spiral-zoom-outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
          muted: false,
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Scale effect: 1 to 2
      {
        id: 'spiral-zoom-outgoing-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['spiral-zoom-outgoing-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 2, prog: 1 },
          ],
        },
      },
      // Rotate effect: 0deg to 180deg (clockwise)
      {
        id: 'spiral-zoom-outgoing-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['spiral-zoom-outgoing-container'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 180, prog: 1 },
          ],
        },
      },
      // Opacity effect: 1 to 0
      {
        id: 'spiral-zoom-outgoing-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['spiral-zoom-outgoing-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Blur effect: 0px -> 4px -> 0px (radial blur simulation)
      {
        id: 'spiral-zoom-outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['spiral-zoom-outgoing-container'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 4, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================
  // INCOMING VIDEO CONTAINER
  // ============================================

  const incomingVideoContainer: RenderableComponentData = {
    id: 'spiral-zoom-incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    childrenData: [
      {
        id: 'spiral-zoom-incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
          muted: false,
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Scale effect: 0.5 to 1
      {
        id: 'spiral-zoom-incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: incomingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['spiral-zoom-incoming-container'],
          ranges: [
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Rotate effect: -180deg to 0deg (counter-clockwise)
      {
        id: 'spiral-zoom-incoming-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: incomingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['spiral-zoom-incoming-container'],
          ranges: [
            { key: 'rotate', val: -180, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      // Opacity effect: 0 to 1
      {
        id: 'spiral-zoom-incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: incomingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['spiral-zoom-incoming-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Blur effect: 0px -> 4px -> 0px (radial blur simulation)
      {
        id: 'spiral-zoom-incoming-blur',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: incomingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['spiral-zoom-incoming-container'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 4, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================
  // ROOT CONTAINER
  // ============================================

  const rootContainer: RenderableComponentData = {
    id: 'spiral-zoom-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideoContainer, incomingVideoContainer],
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

// ============================================
// METADATA
// ============================================

const presetMetadata: PresetMetadata = {
  id: 'spiral-zoom-transition',
  title: 'Spiral Zoom Transition',
  description:
    'A creative spiral zoom transition where videos swap through a rotating zoom vortex effect. The outgoing video zooms to 2x scale while rotating clockwise 180 degrees and fading out, while the incoming video starts at 0.5x scale, rotates counter-clockwise 180 degrees while zooming to full scale and fading in. Both videos feature a blur effect that peaks at the midpoint for enhanced motion blur. Perfect for creative content or transitions between contrasting scenes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'spiral',
    'zoom',
    'rotate',
    'vortex',
    'creative',
    'blur',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.8,
  },
};

// ============================================
// EXPORT
// ============================================

export const spiralZoomTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
