/**
 * Prismatic RGB Split Transition Preset
 *
 * This preset creates a stunning chromatic aberration transition effect where:
 * - The outgoing video breaks apart into separate red, green, and blue color channels
 * - Each RGB channel drifts in different directions (red: left, green: up, blue: right)
 * - The incoming video's RGB channels converge from opposite directions
 * - Includes scale animation (0.95 to 1.05) and blur filter for lens refraction effect
 *
 * Features:
 * - 6 VideoAtom instances (3 per video) with CSS mix-blend-mode: screen
 * - Color channel isolation using hue-rotate filters
 * - 1-second overlap transition period with synchronized animations
 * - Chromatic aberration effect with independent channel motion
 * - Lens refraction simulation with scale and blur
 *
 * Use cases:
 * - Creating dramatic video transitions with color separation
 * - Simulating optical aberration effects
 * - Adding psychedelic or glitch-style transitions
 * - Building sci-fi or technical video sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Duration of the RGB split transition overlap in seconds'),
  
  redTranslate: z
    .number()
    .default(-50)
    .describe('Horizontal translation distance for red channel in pixels (negative = left)'),
  
  greenTranslate: z
    .number()
    .default(-30)
    .describe('Vertical translation distance for green channel in pixels (negative = up)'),
  
  blueTranslate: z
    .number()
    .default(50)
    .describe('Horizontal translation distance for blue channel in pixels (positive = right)'),
  
  maxBlur: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Maximum blur amount in pixels at transition midpoint'),
  
  scaleRange: z
    .object({
      min: z.number().default(0.95).describe('Minimum scale value'),
      max: z.number().default(1.05).describe('Maximum scale value'),
    })
    .default({ min: 0.95, max: 1.05 })
    .describe('Scale animation range for lens refraction effect'),
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
    redTranslate,
    greenTranslate,
    blueTranslate,
    maxBlur,
    scaleRange,
  } = params;

  // Calculate total duration with 1-second overlap
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Outgoing video start time for transition effects (relative to outgoing video's start)
  const outgoingEffectStart = outgoingVideo.duration - transitionDuration;

  // Create outgoing video RGB channels
  const outgoingRedChannel: RenderableComponentData = {
    id: 'outgoing-red',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        mixBlendMode: 'screen',
        filter: 'hue-rotate(0deg) saturate(3)',
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-red-split',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-red'],
          ranges: [
            // Translate left
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: redTranslate, prog: 1 },
            // Scale animation
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: scaleRange.min, prog: 0.5 },
            { key: 'scale', val: scaleRange.max, prog: 1 },
            // Blur
            { key: 'filter', val: `hue-rotate(0deg) saturate(3) blur(0px)`, prog: 0 },
            { key: 'filter', val: `hue-rotate(0deg) saturate(3) blur(${maxBlur}px)`, prog: 0.5 },
            { key: 'filter', val: `hue-rotate(0deg) saturate(3) blur(0px)`, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const outgoingGreenChannel: RenderableComponentData = {
    id: 'outgoing-green',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        mixBlendMode: 'screen',
        filter: 'hue-rotate(120deg) saturate(3)',
        zIndex: 2,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-green-split',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-green'],
          ranges: [
            // Translate up
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: greenTranslate, prog: 1 },
            // Scale animation
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: scaleRange.max, prog: 0.5 },
            { key: 'scale', val: scaleRange.min, prog: 1 },
            // Blur
            { key: 'filter', val: `hue-rotate(120deg) saturate(3) blur(0px)`, prog: 0 },
            { key: 'filter', val: `hue-rotate(120deg) saturate(3) blur(${maxBlur}px)`, prog: 0.5 },
            { key: 'filter', val: `hue-rotate(120deg) saturate(3) blur(0px)`, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const outgoingBlueChannel: RenderableComponentData = {
    id: 'outgoing-blue',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        mixBlendMode: 'screen',
        filter: 'hue-rotate(240deg) saturate(3)',
        zIndex: 3,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-blue-split',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-blue'],
          ranges: [
            // Translate right
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: blueTranslate, prog: 1 },
            // Scale animation
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: scaleRange.min, prog: 0.5 },
            { key: 'scale', val: scaleRange.max, prog: 1 },
            // Blur
            { key: 'filter', val: `hue-rotate(240deg) saturate(3) blur(0px)`, prog: 0 },
            { key: 'filter', val: `hue-rotate(240deg) saturate(3) blur(${maxBlur}px)`, prog: 0.5 },
            { key: 'filter', val: `hue-rotate(240deg) saturate(3) blur(0px)`, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video starts 1 second before outgoing ends (overlap)
  const incomingStart = outgoingVideo.duration - transitionDuration;

  // Create incoming video RGB channels (converging from opposite directions)
  const incomingRedChannel: RenderableComponentData = {
    id: 'incoming-red',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        mixBlendMode: 'screen',
        filter: 'hue-rotate(0deg) saturate(3)',
        zIndex: 4,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingVideo.duration,
      },
    },
    effects: [
      {
        id: 'incoming-red-converge',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming video start
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-red'],
          ranges: [
            // Converge from right (opposite of outgoing red)
            { key: 'translateX', val: -redTranslate, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            // Scale animation
            { key: 'scale', val: scaleRange.max, prog: 0 },
            { key: 'scale', val: scaleRange.min, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            // Blur
            { key: 'filter', val: `hue-rotate(0deg) saturate(3) blur(0px)`, prog: 0 },
            { key: 'filter', val: `hue-rotate(0deg) saturate(3) blur(${maxBlur}px)`, prog: 0.5 },
            { key: 'filter', val: `hue-rotate(0deg) saturate(3) blur(0px)`, prog: 1 },
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const incomingGreenChannel: RenderableComponentData = {
    id: 'incoming-green',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        mixBlendMode: 'screen',
        filter: 'hue-rotate(120deg) saturate(3)',
        zIndex: 5,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingVideo.duration,
      },
    },
    effects: [
      {
        id: 'incoming-green-converge',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-green'],
          ranges: [
            // Converge from down (opposite of outgoing green)
            { key: 'translateY', val: -greenTranslate, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            // Scale animation
            { key: 'scale', val: scaleRange.min, prog: 0 },
            { key: 'scale', val: scaleRange.max, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            // Blur
            { key: 'filter', val: `hue-rotate(120deg) saturate(3) blur(0px)`, prog: 0 },
            { key: 'filter', val: `hue-rotate(120deg) saturate(3) blur(${maxBlur}px)`, prog: 0.5 },
            { key: 'filter', val: `hue-rotate(120deg) saturate(3) blur(0px)`, prog: 1 },
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const incomingBlueChannel: RenderableComponentData = {
    id: 'incoming-blue',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        mixBlendMode: 'screen',
        filter: 'hue-rotate(240deg) saturate(3)',
        zIndex: 6,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingVideo.duration,
      },
    },
    effects: [
      {
        id: 'incoming-blue-converge',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-blue'],
          ranges: [
            // Converge from left (opposite of outgoing blue)
            { key: 'translateX', val: -blueTranslate, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            // Scale animation
            { key: 'scale', val: scaleRange.max, prog: 0 },
            { key: 'scale', val: scaleRange.min, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            // Blur
            { key: 'filter', val: `hue-rotate(240deg) saturate(3) blur(0px)`, prog: 0 },
            { key: 'filter', val: `hue-rotate(240deg) saturate(3) blur(${maxBlur}px)`, prog: 0.5 },
            { key: 'filter', val: `hue-rotate(240deg) saturate(3) blur(0px)`, prog: 1 },
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with all RGB channels
  const rootContainer: RenderableComponentData = {
    id: 'prismatic-rgb-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#000',
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
      outgoingRedChannel,
      outgoingGreenChannel,
      outgoingBlueChannel,
      incomingRedChannel,
      incomingGreenChannel,
      incomingBlueChannel,
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

const presetMetadata: PresetMetadata = {
  id: 'prismatic-rgb-split-transition',
  title: 'Prismatic RGB Split Transition',
  description:
    'A chromatic aberration transition effect where the outgoing video splits into separate RGB color channels that drift apart while fading out, and the incoming video\'s RGB channels converge from different directions to form a complete image. Features 6 VideoAtom instances (3 per video) with mix-blend-mode screen and hue-rotate filters for channel isolation, animated translate transforms, opacity fades, scale animations, and blur effects during a 1-second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'rgb',
    'chromatic-aberration',
    'color-split',
    'video',
    'effects',
    'blend-mode',
    'prismatic',
    'glitch',
    'optical',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1,
    redTranslate: -50,
    greenTranslate: -30,
    blueTranslate: 50,
    maxBlur: 4,
    scaleRange: {
      min: 0.95,
      max: 1.05,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const prismaticRgbSplitTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
