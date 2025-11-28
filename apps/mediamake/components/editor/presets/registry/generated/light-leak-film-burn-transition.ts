/**
 * Light Leak Film Burn Transition Preset
 *
 * Simulates vintage film damage and optical flares during media transitions with authentic
 * film burn artifacts. Features a bright white/yellow light leak overlay that intensifies
 * during the overlap period, creating a classic film burn effect reminiscent of damaged
 * analog film stock.
 *
 * Features:
 * - Authentic film burn effect with light leak overlay
 * - Crossfade transition between two media items (images or videos)
 * - White color overlay on outgoing media to simulate overexposure
 * - Screen blend mode light leak with pulsing/flickering animation
 * - Incoming media starts overexposed (high brightness) and normalizes
 * - Film grain texture via CSS filters throughout
 * - Subtle vignette effect around edges for vintage aesthetic
 * - Configurable overlap duration (default: 1 second)
 *
 * Technical Details:
 * - Single BaseLayout container with two VideoAtom/ImageAtom components
 * - Light leak ImageAtom with 'screen' blend mode at z-index: 10
 * - White overlay HTMLBlockAtom at z-index: 5 for burn effect
 * - Vignette HTMLBlockAtom at z-index: 15 for edge darkening
 * - Opacity animations for fade transitions using generic effects in provider mode
 * - Filter animations for brightness/contrast adjustments during burn effect
 * - Multiple opacity keyframes for light leak to simulate flickering
 * - Film grain applied via CSS filter: brightness(2) contrast(1.2) saturate(0.8) during peak
 *
 * Use cases:
 * - Creating vintage film transitions between clips
 * - Simulating damaged film stock effects
 * - Adding optical flare artifacts to transitions
 * - Building retro/nostalgic video aesthetics
 * - Film burn scene transitions for music videos
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
  media1: z
    .object({
      src: z.string().describe('Source URL of the first media (outgoing)'),
      type: z
        .enum(['image', 'video'])
        .describe('Type of the first media (image or video)'),
      duration: z
        .number()
        .positive()
        .describe('Duration of the first media in seconds'),
    })
    .describe('First media item (outgoing during transition)'),

  media2: z
    .object({
      src: z.string().describe('Source URL of the second media (incoming)'),
      type: z
        .enum(['image', 'video'])
        .describe('Type of the second media (image or video)'),
      duration: z
        .number()
        .positive()
        .describe('Duration of the second media in seconds'),
    })
    .describe('Second media item (incoming during transition)'),

  lightLeakTexture: z
    .object({
      src: z
        .string()
        .describe(
          'Source URL of the light leak texture image (bright/yellow overlay)',
        ),
    })
    .describe('Light leak texture for the film burn effect'),

  transitionDuration: z
    .number()
    .positive()
    .default(1.0)
    .describe(
      'Duration of the transition overlap period in seconds (default: 1.0)',
    ),

  lightLeakIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .optional()
    .describe(
      'Peak opacity of the light leak overlay (0-1, default: 1 for full intensity)',
    ),

  filmGrainIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe(
      'Intensity of film grain effect (0-1, default: 0.3 for subtle grain)',
    ),

  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .optional()
    .describe(
      'Opacity of vignette effect around edges (0-1, default: 0.4 for subtle darkening)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    lightLeakTexture,
    transitionDuration,
    lightLeakIntensity = 1,
    filmGrainIntensity = 0.3,
    vignetteIntensity = 0.4,
  } = params;

  // Calculate base layout duration (sum of media durations minus overlap)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Timing calculations
  const media1Start = 0;
  const media1End = media1.duration;
  const transitionStart = media1.duration - transitionDuration;
  const media2Start = transitionStart;

  // Film grain filter intensity calculation
  const grainBrightness = 1 + filmGrainIntensity * 0.1;
  const grainContrast = 1 + filmGrainIntensity * 0.05;

  // Outgoing media (media1) - fades to white during transition
  const outgoingMedia: RenderableComponentData = {
    id: 'outgoing-media',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        filter: `brightness(${grainBrightness}) contrast(${grainContrast})`,
      },
    },
    context: {
      timing: {
        start: media1Start,
        duration: media1.duration,
      },
    },
    effects: [
      // Fade out opacity during transition
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming media (media2) - starts overexposed and normalizes
  const incomingMedia: RenderableComponentData = {
    id: 'incoming-media',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        filter: `brightness(${grainBrightness}) contrast(${grainContrast})`,
      },
    },
    context: {
      timing: {
        start: media2Start,
        duration: media2.duration + transitionDuration,
      },
    },
    effects: [
      // Fade in opacity during transition
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Brightness overexposure effect (starts bright, normalizes)
      {
        id: 'incoming-brightness-normalize',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media'],
          ranges: [
            {
              key: 'filter',
              val: `brightness(2.5) contrast(${grainContrast})`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `brightness(${grainBrightness}) contrast(${grainContrast})`,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // White overlay layer - creates film burn effect on outgoing media
  const whiteOverlay: RenderableComponentData = {
    id: 'white-overlay-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: white;"></div>',
      className: 'absolute inset-0',
      style: {
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        pointerEvents: 'none',
        zIndex: 5,
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    effects: [
      // Fade in white overlay to create burn effect
      {
        id: 'white-overlay-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['white-overlay-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Light leak overlay - screen blend mode with pulsing/flickering
  const lightLeakOverlay: RenderableComponentData = {
    id: 'light-leak-overlay',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: lightLeakTexture.src,
      className: 'absolute inset-0 mix-blend-screen',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        mixBlendMode: 'screen',
        zIndex: 10,
        filter: 'brightness(2) contrast(1.2) saturate(0.8)',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    effects: [
      // Pulsing/flickering light leak animation with multiple keyframes
      {
        id: 'light-leak-pulse',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['light-leak-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: lightLeakIntensity * 0.8, prog: 0.2 },
            { key: 'opacity', val: lightLeakIntensity, prog: 0.4 },
            { key: 'opacity', val: lightLeakIntensity * 0.7, prog: 0.6 },
            { key: 'opacity', val: lightLeakIntensity, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Vignette overlay - subtle edge darkening throughout
  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, transparent 50%, rgba(0,0,0,${vignetteIntensity}) 100%);"></div>`,
      className: 'absolute inset-0',
      style: {
        width: '100%',
        height: '100%',
        background: `radial-gradient(circle at center, transparent 50%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
        pointerEvents: 'none',
        zIndex: 15,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    effects: [],
  };

  // Root container with all layers
  const rootContainer: RenderableComponentData = {
    id: 'light-leak-film-burn-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          width: '100%',
          height: '100%',
          position: 'relative',
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
    childrenData: [
      outgoingMedia,
      incomingMedia,
      whiteOverlay,
      lightLeakOverlay,
      vignetteOverlay,
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
  id: 'light-leak-film-burn-transition',
  title: 'Light Leak Film Burn Transition',
  description:
    'Vintage film burn transition preset with light leak overlay that simulates authentic film damage, optical flares, and burn artifacts during media transitions. Features dynamic opacity animations, brightness/contrast adjustments, film grain, vignette effects, and pulsing light leak with screen blend mode for realistic vintage film aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'film-burn',
    'light-leak',
    'vintage',
    'optical-flare',
    'retro',
    'analog',
    'damage',
  ],
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
    lightLeakTexture: {
      src: 'https://example.com/light-leak-texture.jpg',
    },
    transitionDuration: 1.0,
    lightLeakIntensity: 1,
    filmGrainIntensity: 0.3,
    vignetteIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const lightLeakFilmBurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
