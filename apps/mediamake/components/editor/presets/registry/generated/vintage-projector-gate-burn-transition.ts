/**
 * Vintage Projector Gate Burn Transition Preset
 *
 * This preset creates a vintage film projector-style transition between two videos or images.
 * Features mechanical shutter blades closing from top and bottom, meeting in the middle,
 * with a bright flash frame at the transition point. The outgoing video gains heavy vignette
 * and grain texture while the shutter closes. Film scratches animate downward throughout the
 * transition, and the incoming video is revealed with an intense light leak bloom effect.
 *
 * Technical Details:
 * - Duration: 0.6 seconds (snappy transition)
 * - Shutter close: 0-0.2s (top and bottom shutters meet at center)
 * - Flash frame: 0.18-0.22s (pure white overlay at shutter meeting point)
 * - Shutter open: 0.2-0.6s (shutters reveal incoming video)
 * - Outgoing video: 0-0.2s (with vignette and grain increasing)
 * - Incoming video: 0.2-0.6s (with light leak bloom fading out)
 * - Film scratches: 0-0.6s (continuous downward movement)
 *
 * Use cases:
 * - Vintage film transitions between clips
 * - Retro-style video presentations
 * - Historical or documentary-style edits
 * - Creating authentic film projector aesthetic
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoUrl: z
    .string()
    .describe('URL of the outgoing video or image that transitions out'),
  incomingVideoUrl: z
    .string()
    .describe('URL of the incoming video or image that transitions in'),
  outgoingDuration: z
    .number()
    .default(5)
    .describe('Duration of outgoing video in seconds (before transition)'),
  incomingDuration: z
    .number()
    .default(5)
    .describe('Duration of incoming video in seconds (after transition)'),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Total duration of the transition in seconds'),
  shutterCloseTime: z
    .number()
    .default(0.2)
    .describe(
      'Time for shutters to close (relative to transition start, in seconds)',
    ),
  flashDuration: z
    .number()
    .default(0.04)
    .describe('Duration of the flash frame in seconds'),
  lightLeakIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of light leak bloom (0-1)'),
  grainIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of grain texture on outgoing video (0-1)'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.9)
    .describe('Intensity of vignette on outgoing video (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoUrl,
    incomingVideoUrl,
    outgoingDuration,
    incomingDuration,
    transitionDuration,
    shutterCloseTime,
    flashDuration,
    lightLeakIntensity,
    grainIntensity,
    vignetteIntensity,
  } = params;

  // Calculate timing
  const totalDuration = outgoingDuration + incomingDuration;
  const transitionStartTime = outgoingDuration;
  const shutterOpenTime = transitionDuration - shutterCloseTime;
  const flashStartTime = shutterCloseTime - flashDuration / 2;

  // Detect media type from URL
  const getMediaType = (url: string): 'video' | 'image' => {
    if (url.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i)) {
      return 'video';
    }
    return 'image';
  };

  const outgoingType = getMediaType(outgoingVideoUrl);
  const incomingType = getMediaType(incomingVideoUrl);

  // Create outgoing video/image
  const outgoingMedia: RenderableComponentData = {
    id: 'outgoing-media',
    type: 'atom',
    componentId: outgoingType === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: outgoingVideoUrl,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      ...(outgoingType === 'video' ? { muted: true } : {}),
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration + shutterCloseTime,
      },
    },
  };

  // Create vignette overlay (radial gradient)
  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute inset-0 pointer-events-none' style='background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,${vignetteIntensity}) 100%);'></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: shutterCloseTime,
      },
    },
    effects: [
      {
        id: 'vignette-intensity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: shutterCloseTime,
          mode: 'provider',
          targetIds: ['vignette-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create grain overlay (SVG noise filter)
  const grainOverlay: RenderableComponentData = {
    id: 'grain-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute inset-0 pointer-events-none' style='background-image: url("data:image/svg+xml,%3Csvg viewBox=%270 0 400 400%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noiseFilter%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noiseFilter)%27 opacity=%27${grainIntensity}%27/%3E%3C/svg%3E"); mix-blend-mode: overlay;'></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: shutterCloseTime,
      },
    },
    effects: [
      {
        id: 'grain-intensity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: shutterCloseTime,
          mode: 'provider',
          targetIds: ['grain-overlay'],
          ranges: [
            { key: 'opacity', val: 0.15, prog: 0 },
            { key: 'opacity', val: grainIntensity, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create outgoing video container with vignette and grain
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: shutterCloseTime,
      },
    },
    childrenData: [outgoingMedia, vignetteOverlay, grainOverlay],
  };

  // Create incoming video/image
  const incomingMedia: RenderableComponentData = {
    id: 'incoming-media',
    type: 'atom',
    componentId: incomingType === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: incomingVideoUrl,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      ...(incomingType === 'video' ? { muted: true } : {}),
    },
    context: {
      timing: {
        start: shutterCloseTime,
        duration: shutterOpenTime + incomingDuration,
      },
    },
  };

  // Create light leak bloom overlay
  const lightLeakBloom: RenderableComponentData = {
    id: 'light-leak-bloom',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute inset-0 pointer-events-none' style='background: radial-gradient(circle at center, rgba(255,240,200,${lightLeakIntensity}) 0%, transparent 60%); mix-blend-mode: screen;'></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: shutterOpenTime,
      },
    },
    effects: [
      {
        id: 'light-leak-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: shutterOpenTime,
          mode: 'provider',
          targetIds: ['light-leak-bloom'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video container with light leak
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: shutterCloseTime,
        duration: shutterOpenTime + incomingDuration,
      },
    },
    childrenData: [incomingMedia, lightLeakBloom],
  };

  // Create top shutter blade (black bar)
  const shutterTop: RenderableComponentData = {
    id: 'shutter-top',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute top-0 left-0 w-full h-1/2 bg-black'></div>`,
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'shutter-top-close',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: shutterCloseTime,
          mode: 'provider',
          targetIds: ['shutter-top'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0, unit: '%' },
            { key: 'translateY', val: 50, prog: 1, unit: '%' },
          ],
        },
      },
      {
        id: 'shutter-top-open',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: shutterCloseTime,
          duration: shutterOpenTime,
          mode: 'provider',
          targetIds: ['shutter-top'],
          ranges: [
            { key: 'translateY', val: 50, prog: 0, unit: '%' },
            { key: 'translateY', val: -100, prog: 1, unit: '%' },
          ],
        },
      },
    ],
  };

  // Create bottom shutter blade (black bar)
  const shutterBottom: RenderableComponentData = {
    id: 'shutter-bottom',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute bottom-0 left-0 w-full h-1/2 bg-black'></div>`,
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'shutter-bottom-close',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: shutterCloseTime,
          mode: 'provider',
          targetIds: ['shutter-bottom'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0, unit: '%' },
            { key: 'translateY', val: -50, prog: 1, unit: '%' },
          ],
        },
      },
      {
        id: 'shutter-bottom-open',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: shutterCloseTime,
          duration: shutterOpenTime,
          mode: 'provider',
          targetIds: ['shutter-bottom'],
          ranges: [
            { key: 'translateY', val: -50, prog: 0, unit: '%' },
            { key: 'translateY', val: 100, prog: 1, unit: '%' },
          ],
        },
      },
    ],
  };

  // Create flash overlay (pure white)
  const flashOverlay: RenderableComponentData = {
    id: 'flash-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute inset-0 bg-white'></div>`,
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: flashStartTime,
        duration: flashDuration,
      },
    },
    effects: [
      {
        id: 'flash-spike-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: flashDuration,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create film scratch overlays (vertical white lines)
  const scratch1: RenderableComponentData = {
    id: 'scratch-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute w-px h-full bg-white' style='opacity: 0.2; left: 23%;'></div>`,
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'scratch-1-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['scratch-1'],
          ranges: [
            { key: 'translateY', val: -30, prog: 0, unit: '%' },
            { key: 'translateY', val: 100, prog: 1, unit: '%' },
          ],
        },
      },
    ],
  };

  const scratch2: RenderableComponentData = {
    id: 'scratch-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute w-px h-full bg-white' style='opacity: 0.15; left: 67%;'></div>`,
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'scratch-2-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['scratch-2'],
          ranges: [
            { key: 'translateY', val: -50, prog: 0, unit: '%' },
            { key: 'translateY', val: 120, prog: 1, unit: '%' },
          ],
        },
      },
    ],
  };

  const scratch3: RenderableComponentData = {
    id: 'scratch-3',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute w-px h-full bg-white' style='opacity: 0.25; left: 89%;'></div>`,
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'scratch-3-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['scratch-3'],
          ranges: [
            { key: 'translateY', val: -20, prog: 0, unit: '%' },
            { key: 'translateY', val: 110, prog: 1, unit: '%' },
          ],
        },
      },
    ],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'vintage-projector-gate-burn-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoContainer,
      incomingVideoContainer,
      shutterTop,
      shutterBottom,
      flashOverlay,
      scratch1,
      scratch2,
      scratch3,
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
  id: 'vintage-projector-gate-burn-transition',
  title: 'Vintage Projector Gate Burn Transition',
  description:
    'A snappy 0.6s vintage projector gate burn transition with mechanical shutter blades closing from top/bottom, meeting at center with a bright flash, then opening to reveal incoming video with light leak bloom. Features film grain, vignette on outgoing video, and animated vertical film scratches for authentic film projector aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vintage',
    'projector',
    'gate-burn',
    'shutter',
    'film',
    'retro',
    'mechanical',
    'light-leak',
    'grain',
    'vignette',
    'scratches',
  ],
  defaultInputParams: {
    outgoingVideoUrl: 'https://example.com/video1.mp4',
    incomingVideoUrl: 'https://example.com/video2.mp4',
    outgoingDuration: 5,
    incomingDuration: 5,
    transitionDuration: 0.6,
    shutterCloseTime: 0.2,
    flashDuration: 0.04,
    lightLeakIntensity: 0.6,
    grainIntensity: 0.5,
    vignetteIntensity: 0.9,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vintageProjectorGateBurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};