/**
 * RGB Chromatic Aberration Glitch Transition Preset
 *
 * This preset creates an aggressive RGB chromatic aberration glitch effect during image transitions,
 * simulating a digital signal breakdown and recovery. Perfect for edgy YouTube content, tech videos,
 * music visuals, and modern social media content.
 *
 * Features:
 * - **RGB Channel Splitting**: Red, green, and blue channels separate horizontally during transition
 * - **Digital Signal Breakdown**: Simulates corrupted video signal with chromatic aberration
 * - **Horizontal Shake**: Subtle oscillation (±3px) during peak glitch moments
 * - **Converging Recovery**: Incoming image enters with RGB channels snapping together
 * - **Customizable Overlap**: Configurable transition duration (default 0.4s)
 * - **Dual Image Support**: Smooth transition between two images with glitch effect
 *
 * Technical Implementation:
 * - Uses layered ImageAtom components for RGB channel separation
 * - Mix blend mode 'screen' for additive color composition
 * - CSS filters for channel isolation (sepia + hue-rotate combinations)
 * - Generic effects for translateX channel displacement and opacity fading
 * - Shake effect via keyframe-based translateX oscillation
 *
 * Use cases:
 * - YouTube video transitions with edgy, modern aesthetic
 * - Tech/gaming content with glitch effects
 * - Music video visualizers
 * - Social media content with digital distortion
 * - VFX-style transitions between scenes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  image1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) image'),
    duration: z.number().describe('Duration of first image in seconds'),
  }),
  image2: z.object({
    src: z.string().describe('Source URL of the second (incoming) image'),
    duration: z.number().describe('Duration of second image in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(0.4)
    .describe('Duration of the overlap transition in seconds'),
  channelSeparation: z
    .number()
    .default(8)
    .min(2)
    .max(30)
    .optional()
    .describe('Pixel distance for RGB channel separation'),
  shakeIntensity: z
    .number()
    .default(3)
    .min(0)
    .max(10)
    .optional()
    .describe('Intensity of horizontal shake in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, transitionDuration } = params;
  const channelSeparation = params.channelSeparation ?? 8;
  const shakeIntensity = params.shakeIntensity ?? 3;

  // Calculate total duration with overlap
  const totalDuration = image1.duration + image2.duration - transitionDuration;

  // Timing calculations
  const image1Start = 0;
  const image1Duration = image1.duration;
  const image2Start = image1.duration - transitionDuration;
  const image2Duration = image2.duration;

  // Effect timing (relative to component start)
  const glitchStartImage1 = image1Duration - transitionDuration;
  const glitchStartImage2 = 0;

  // Create RGB channel components for outgoing image (image1)
  const image1RedChannel: RenderableComponentData = {
    id: 'image1-red-channel',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        mixBlendMode: 'screen',
        filter: 'sepia(100%) saturate(500%) hue-rotate(-50deg)',
        zIndex: 12,
      },
    },
    context: {
      timing: {
        start: image1Start,
        duration: image1Duration,
      },
    },
    effects: [
      // Red channel splits left + fades out
      {
        id: 'image1-red-split-left',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: glitchStartImage1,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['image1-red-channel'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -channelSeparation, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const image1GreenChannel: RenderableComponentData = {
    id: 'image1-green-channel',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        mixBlendMode: 'screen',
        filter: 'sepia(100%) saturate(500%) hue-rotate(60deg)',
        zIndex: 11,
      },
    },
    context: {
      timing: {
        start: image1Start,
        duration: image1Duration,
      },
    },
    effects: [
      // Green channel stays centered but fades out
      {
        id: 'image1-green-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: glitchStartImage1,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['image1-green-channel'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const image1BlueChannel: RenderableComponentData = {
    id: 'image1-blue-channel',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        mixBlendMode: 'screen',
        filter: 'sepia(100%) saturate(500%) hue-rotate(180deg)',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: image1Start,
        duration: image1Duration,
      },
    },
    effects: [
      // Blue channel splits right + fades out
      {
        id: 'image1-blue-split-right',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: glitchStartImage1,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['image1-blue-channel'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: channelSeparation, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create RGB channel components for incoming image (image2)
  const image2RedChannel: RenderableComponentData = {
    id: 'image2-red-channel',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        mixBlendMode: 'screen',
        filter: 'sepia(100%) saturate(500%) hue-rotate(-50deg)',
        zIndex: 22,
      },
    },
    context: {
      timing: {
        start: image2Start,
        duration: image2Duration,
      },
    },
    effects: [
      // Red channel converges from left + fades in
      {
        id: 'image2-red-converge',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: glitchStartImage2,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['image2-red-channel'],
          ranges: [
            { key: 'translateX', val: -channelSeparation, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const image2GreenChannel: RenderableComponentData = {
    id: 'image2-green-channel',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        mixBlendMode: 'screen',
        filter: 'sepia(100%) saturate(500%) hue-rotate(60deg)',
        zIndex: 21,
      },
    },
    context: {
      timing: {
        start: image2Start,
        duration: image2Duration,
      },
    },
    effects: [
      // Green channel fades in (stays centered)
      {
        id: 'image2-green-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: glitchStartImage2,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['image2-green-channel'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const image2BlueChannel: RenderableComponentData = {
    id: 'image2-blue-channel',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        mixBlendMode: 'screen',
        filter: 'sepia(100%) saturate(500%) hue-rotate(180deg)',
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: image2Start,
        duration: image2Duration,
      },
    },
    effects: [
      // Blue channel converges from right + fades in
      {
        id: 'image2-blue-converge',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: glitchStartImage2,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['image2-blue-channel'],
          ranges: [
            { key: 'translateX', val: channelSeparation, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create shake container that wraps all image1 channels
  const image1ShakeContainer: RenderableComponentData = {
    id: 'image1-shake-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: image1Start,
        duration: image1Duration,
      },
    },
    effects: [
      // Horizontal shake effect during glitch
      {
        id: 'image1-shake',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: glitchStartImage1,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['image1-shake-container'],
          ranges: [
            { key: 'translateX', val: -shakeIntensity, prog: 0 },
            { key: 'translateX', val: shakeIntensity, prog: 0.2 },
            { key: 'translateX', val: -shakeIntensity * 0.7, prog: 0.4 },
            { key: 'translateX', val: shakeIntensity * 0.5, prog: 0.6 },
            { key: 'translateX', val: -shakeIntensity * 0.3, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [image1RedChannel, image1GreenChannel, image1BlueChannel],
  };

  // Create shake container that wraps all image2 channels
  const image2ShakeContainer: RenderableComponentData = {
    id: 'image2-shake-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: image2Start,
        duration: image2Duration,
      },
    },
    effects: [
      // Horizontal shake effect during glitch (recovery phase)
      {
        id: 'image2-shake',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: glitchStartImage2,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['image2-shake-container'],
          ranges: [
            { key: 'translateX', val: shakeIntensity, prog: 0 },
            { key: 'translateX', val: -shakeIntensity, prog: 0.2 },
            { key: 'translateX', val: shakeIntensity * 0.7, prog: 0.4 },
            { key: 'translateX', val: -shakeIntensity * 0.5, prog: 0.6 },
            { key: 'translateX', val: shakeIntensity * 0.3, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [image2RedChannel, image2GreenChannel, image2BlueChannel],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'rgb-chromatic-glitch-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden bg-black w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [image1ShakeContainer, image2ShakeContainer],
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
  id: 'rgb-chromatic-glitch-transition',
  title: 'RGB Chromatic Glitch Transition',
  description:
    'Aggressive RGB channel splitting transition that simulates digital signal breakdown. Features horizontal RGB channel separation with red shifting left, blue shifting right, and green centered during overlap. Includes subtle horizontal shake effects for peak glitch moments, creating a corrupted video signal recovery effect perfect for edgy YouTube content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'rgb',
    'chromatic-aberration',
    'image',
    'youtube',
    'modern',
    'edgy',
    'tech',
  ],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1920&h=1080&fit=crop',
      duration: 3,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&h=1080&fit=crop',
      duration: 3,
    },
    transitionDuration: 0.4,
    channelSeparation: 8,
    shakeIntensity: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const rgbChromaticGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
