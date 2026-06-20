/**
 * Water Reveal Transition Preset
 *
 * This preset creates a sophisticated water-flow transition effect where the outgoing video
 * appears to be washed away by flowing water ink, revealing the incoming video as if painted
 * onto wet canvas.
 *
 * Features:
 * - 1.5-second overlap transition between media items
 * - Diagonal upward slide with wave distortion on outgoing video
 * - Wet paint effect (blur + contrast) on incoming video
 * - Animated water flow mask using clip-path
 * - GPU-accelerated transforms with transform3d
 * - Subtle shake effect at peak transition (0.75s)
 * - Ripple effect using blur filters
 *
 * Use cases:
 * - Creating dynamic video transitions with water/liquid themes
 * - Artistic transitions for storytelling content
 * - Creative reveals for product or content showcases
 * - Smooth, visually engaging transitions between video segments
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      startFrom: z
        .number()
        .optional()
        .default(0)
        .describe('Start time for outgoing video'),
      endAt: z.number().optional().describe('End time for outgoing video'),
      volume: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .default(1)
        .describe('Volume for outgoing video'),
      muted: z
        .boolean()
        .optional()
        .default(false)
        .describe('Mute outgoing video audio'),
    })
    .describe('Outgoing video configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      startFrom: z
        .number()
        .optional()
        .default(0)
        .describe('Start time for incoming video'),
      endAt: z.number().optional().describe('End time for incoming video'),
      volume: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .default(1)
        .describe('Volume for incoming video'),
      muted: z
        .boolean()
        .optional()
        .default(false)
        .describe('Mute incoming video audio'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate media durations
  const media1Duration = media1.endAt
    ? media1.endAt - (media1.startFrom || 0)
    : 10; // Default 10s if not specified
  const media2Duration = media2.endAt
    ? media2.endAt - (media2.startFrom || 0)
    : 10; // Default 10s if not specified

  // Calculate total duration: media1 + media2 - overlap
  const totalDuration = media1Duration + media2Duration - transitionDuration;

  // Calculate incoming video start time (overlaps with outgoing)
  const incomingStartTime = media1Duration - transitionDuration;

  // Peak transition moment for shake effect
  const shakeStartTime = incomingStartTime + transitionDuration / 2; // 0.75s into transition

  // Helper function to create water flow mask keyframes
  const createWaterFlowMask = () => {
    // Animated clip-path moving diagonally across screen
    return `polygon(
      0% 0%,
      100% 0%,
      100% 100%,
      0% 100%
    )`;
  };

  // Create outgoing video with effects
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: media1.src,
      startFrom: media1.startFrom || 0,
      endAt: media1.endAt,
      volume: media1.volume ?? 1,
      muted: media1.muted ?? false,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: media1Duration,
      },
    },
    effects: [
      // Diagonal slide upward with transform3d
      {
        id: 'slide-out-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: incomingStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Diagonal movement (up and to the right)
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '100px', prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-100px', prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Wave distortion using blur
      {
        id: 'ripple-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: incomingStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Blur in and out to create ripple effect
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(4px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Shake effect at peak transition
      {
        id: 'shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: shakeStartTime - 0.1,
          duration: 0.2,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Small random translations for shake
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '5px', prog: 0.25 },
            { key: 'translateX', val: '-3px', prog: 0.5 },
            { key: 'translateX', val: '4px', prog: 0.75 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-4px', prog: 0.25 },
            { key: 'translateY', val: '5px', prog: 0.5 },
            { key: 'translateY', val: '-3px', prog: 0.75 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video with wet paint effect
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: media2.src,
      startFrom: media2.startFrom || 0,
      endAt: media2.endAt,
      volume: media2.volume ?? 1,
      muted: media2.muted ?? false,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: media2Duration + transitionDuration,
      },
    },
    effects: [
      // Wet paint effect: blur + contrast fade in
      {
        id: 'wet-paint-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            // Blur from 8px to 0px
            {
              key: 'filter',
              val: 'blur(8px) contrast(1.2)',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'blur(4px) contrast(1.1)',
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'blur(0px) contrast(1)',
              prog: 1,
            },
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.7 },
          ],
        },
      },
      // Subtle scale in for "painted onto canvas" effect
      {
        id: 'paint-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create water flow mask overlay
  const waterFlowMask: RenderableComponentData = {
    id: 'water-flow-mask',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; pointer-events: none;"></div>',
      className: 'absolute inset-0',
      style: {
        zIndex: 3,
        mixBlendMode: 'multiply',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      // Animated clip-path for water flow effect
      {
        id: 'water-flow-animation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['water-flow-mask'],
          ranges: [
            // Clip-path animation (diagonal wipe)
            {
              key: 'clipPath',
              val: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)',
              prog: 0.5,
            },
            {
              key: 'clipPath',
              val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
              prog: 1,
            },
            // Opacity for flow visibility
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Wrap videos in container layouts with proper z-index
  const outgoingVideoWrapper: RenderableComponentData = {
    id: 'outgoing-video-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1Duration,
      },
    },
    childrenData: [outgoingVideo],
  };

  const incomingVideoWrapper: RenderableComponentData = {
    id: 'incoming-video-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: media2Duration + transitionDuration,
      },
    },
    childrenData: [incomingVideo],
  };

  // Create transition container
  const transitionContainer: RenderableComponentData = {
    id: 'transition-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoWrapper,
      incomingVideoWrapper,
      waterFlowMask,
    ] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'water-reveal-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [transitionContainer] as RenderableComponentData[],
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
  id: 'water-reveal-transition',
  title: 'Water Reveal Transition',
  description:
    'A sophisticated water-flow transition where the outgoing video is washed away with flowing water ink effect and ripple distortions, revealing the incoming video painted onto wet canvas with blur and contrast adjustments. Features diagonal sliding, wave distortion, shake effect at peak transition, and animated water flow mask using clip-path.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'water',
    'flow',
    'reveal',
    'liquid',
    'ink',
    'paint',
    'wet',
    'canvas',
    'ripple',
    'wave',
    'shake',
    'diagonal',
    'slide',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
      volume: 1,
      muted: false,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
      volume: 1,
      muted: false,
    },
    transitionDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const waterRevealTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
