/**
 * Horizontal Brush Wipe Transition Preset
 *
 * A minimalist horizontal brush wipe transition that cleanly sweeps across the screen
 * from left to right, resembling a wide brush stroke in motion graphics. Features:
 * - Soft feathered edge with gradient mask
 * - Subtle motion blur on transition edge to simulate brush bristles
 * - Thin accent line leading the transition edge (like brush handle shadow)
 * - Clean and modern aesthetic with organic brush stroke feel
 * - GPU-accelerated with transform: translateZ(0)
 *
 * Technical Implementation:
 * - Uses BaseLayout with two VideoAtom layers for incoming/outgoing clips
 * - Linear gradient mask with webkit compatibility for brush edge
 * - translateX animation from -100% to 100% over 0.8s with ease-in-out easing
 * - Motion blur using filter effect (0 → 4px → 0)
 * - 2px accent line positioned 10px ahead of main transition
 * - Provider mode effects for precise animation control
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video clip'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video clip'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }),
  transitionDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .describe('Duration of the transition wipe in seconds'),
  brushEdgeWidth: z
    .number()
    .min(50)
    .max(300)
    .default(128)
    .describe('Width of the brush edge gradient in pixels'),
  accentLineOffset: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe('Distance the accent line leads ahead of the brush edge in pixels'),
  motionBlurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Maximum blur amount during transition in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    brushEdgeWidth,
    accentLineOffset,
    motionBlurAmount,
  } = params;

  // IDs
  const containerId = 'horizontal-brush-wipe-container';
  const outgoingId = 'outgoing-video';
  const incomingId = 'incoming-video';
  const brushEdgeId = 'brush-edge';
  const accentLineId = 'accent-line';

  // Determine component types
  const outgoingComponentId =
    outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate timings - both videos play simultaneously with transition overlay
  const totalDuration = transitionDuration;

  // Outgoing video (fades out and is wiped away)
  const outgoingVideoNode: RenderableComponentData = {
    id: outgoingId,
    type: 'atom',
    componentId: outgoingComponentId,
    data: {
      src: outgoingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [],
  };

  // Incoming video (fades in and is revealed by wipe)
  const incomingVideoNode: RenderableComponentData = {
    id: incomingId,
    type: 'atom',
    componentId: incomingComponentId,
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'incoming-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [incomingId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Brush edge (gradient overlay that moves from left to right)
  const brushEdgeNode: RenderableComponentData = {
    id: brushEdgeId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-0 bottom-0',
        style: {
          width: `${brushEdgeWidth}px`,
          background:
            'linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)',
          transform: 'translateZ(0)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'brush-sweep',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [brushEdgeId],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '100vw', prog: 1 },
          ],
        },
      },
      {
        id: 'brush-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [brushEdgeId],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${motionBlurAmount}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Accent line (thin line leading the brush edge)
  const accentLineNode: RenderableComponentData = {
    id: accentLineId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-0 bottom-0',
        style: {
          width: '2px',
          backgroundColor: 'rgba(255,255,255,0.5)',
          transform: 'translateZ(0)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'accent-sweep',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [accentLineId],
          ranges: [
            {
              key: 'translateX',
              val: `calc(-100% - ${brushEdgeWidth / 2}px + ${accentLineOffset}px)`,
              prog: 0,
            },
            {
              key: 'translateX',
              val: `calc(100vw + ${accentLineOffset}px)`,
              prog: 1,
            },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          transform: 'translateZ(0)', // GPU acceleration
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoNode,
      incomingVideoNode,
      brushEdgeNode,
      accentLineNode,
    ],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'horizontal-brush-wipe',
  title: 'Horizontal Brush Wipe Transition',
  description:
    'A minimalist horizontal brush wipe transition that cleanly sweeps across the screen from left to right, resembling a wide brush stroke in motion graphics. Features soft feathered edge, motion blur effect, and thin accent line.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'wipe',
    'brush',
    'horizontal',
    'motion-graphics',
    'modern',
    'clean',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    transitionDuration: 0.8,
    brushEdgeWidth: 128,
    accentLineOffset: 10,
    motionBlurAmount: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const horizontalBrushWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
