/**
 * Camera Shutter Flash Transition Preset
 *
 * This preset simulates a camera shutter click with an explosive white flash transition between two images or videos.
 * It creates a punchy, dramatic transition effect commonly used in YouTube thumbnails and social media content.
 *
 * Features:
 * - **Rapid Brightness Spike**: Outgoing media brightness ramps from 1 to 3+ during first 40% of overlap
 * - **Peak White Flash**: White overlay fades in to 100% opacity then out at 40-60% of overlap
 * - **Incoming Fade**: Incoming media fades in from white with brightness ramping down from 3 to 1
 * - **Configurable Overlap**: Default 0.45s overlap period with customizable duration
 * - **Sharp Easing**: Uses easeOutExpo and easeInOutQuad for punchy camera shutter effect
 * - **Flexible Media Types**: Supports both images and videos
 * - **16:9 Optimized**: Targets YouTube thumbnail-style content with cover object-fit
 *
 * Use Cases:
 * - Creating dramatic transitions between B-roll clips
 * - Building YouTube-style thumbnail animations
 * - Adding impact to photo slideshows
 * - Simulating camera flash effects in video content
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
      src: z.string().describe('Source URL of the outgoing media'),
      type: z
        .enum(['image', 'video'])
        .optional()
        .describe('Media type (auto-detected from extension if not provided)'),
      duration: z.number().describe('Duration of the outgoing media in seconds'),
    })
    .describe('Outgoing media configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of the incoming media'),
      type: z
        .enum(['image', 'video'])
        .optional()
        .describe('Media type (auto-detected from extension if not provided)'),
      duration: z.number().describe('Duration of the incoming media in seconds'),
    })
    .describe('Incoming media configuration'),
  overlapDuration: z
    .number()
    .min(0.3)
    .max(1.0)
    .default(0.45)
    .describe('Duration of the transition overlap in seconds (0.4-0.5 recommended)'),
  peakBrightness: z
    .number()
    .min(2)
    .max(5)
    .default(3)
    .describe('Peak brightness value during flash (default: 3)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration, peakBrightness } = params;

  // Helper function to determine component ID from media type
  const getComponentId = (
    src: string,
    type?: 'image' | 'video',
  ): 'ImageAtom' | 'VideoAtom' => {
    if (type === 'video') return 'VideoAtom';
    if (type === 'image') return 'ImageAtom';

    // Auto-detect from extension
    if (src.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'VideoAtom';
    return 'ImageAtom';
  };

  // Calculate timing breakpoints (relative to overlap start)
  const brightnessSpikeDuration = overlapDuration * 0.4; // 0-40% of overlap
  const flashFadeStart = overlapDuration * 0.2; // Flash starts at 20% (before peak)
  const flashFadeDuration = overlapDuration * 0.6; // Flash lasts 20-80% of overlap
  const incomingFadeDuration = overlapDuration * 0.6; // 40-100% of overlap

  // Calculate BaseLayout duration (sum minus overlap)
  const baseLayoutDuration = media1.duration + media2.duration - overlapDuration;

  // Determine component IDs
  const media1ComponentId = getComponentId(media1.src, media1.type);
  const media2ComponentId = getComponentId(media2.src, media2.type);

  const childrenData: RenderableComponentData[] = [
    // Outgoing media (bottom layer, z-index 10)
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'absolute inset-0',
        fit: 'cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        // Brightness spike (0-40% of overlap)
        {
          id: 'outgoing-brightness-spike',
          componentId: 'generic',
          data: {
            type: 'ease-out', // Sharp, punchy easing (easeOutExpo-like)
            start: media1.duration - overlapDuration, // Start of overlap
            duration: brightnessSpikeDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'filter:brightness', val: 1, prog: 0 },
              { key: 'filter:brightness', val: peakBrightness, prog: 1 },
            ],
          },
        },
        // Fade out (40-100% of overlap)
        {
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: media1.duration - overlapDuration + brightnessSpikeDuration,
            duration: incomingFadeDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming media (middle layer, z-index 20)
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'absolute inset-0',
        fit: 'cover',
        style: {
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: media1.duration - overlapDuration, // Start at overlap
          duration: media2.duration + overlapDuration,
        },
      },
      effects: [
        // Brightness ramp down (0-60% of overlap, relative to incoming start)
        {
          id: 'incoming-brightness-rampdown',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to incoming media start
            duration: incomingFadeDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'filter:brightness', val: peakBrightness, prog: 0 },
              { key: 'filter:brightness', val: 1, prog: 1 },
            ],
          },
        },
        // Fade in (0-60% of overlap, relative to incoming start)
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to incoming media start
            duration: incomingFadeDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // White flash overlay (top layer, z-index 30)
    {
      id: 'white-flash',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: #FFFFFF;"></div>',
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: media1.duration - overlapDuration, // Start at overlap
          duration: overlapDuration,
        },
      },
      effects: [
        // Flash fade in/out (centered at overlap midpoint)
        {
          id: 'white-flash-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: flashFadeStart, // Start at 20% of overlap
            duration: flashFadeDuration, // 20-80% of overlap
            mode: 'provider',
            targetIds: ['white-flash'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.333 }, // Peak at 40% of overlap (1/3 of fade duration)
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'camera-shutter-flash-container',
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
        duration: baseLayoutDuration,
      },
    },
    childrenData,
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
  id: 'camera-shutter-flash-transition',
  title: 'Camera Shutter Flash Transition',
  description:
    'Simulates a camera shutter click with explosive white flash transition between two images or videos. Features rapid brightness spike on outgoing media (1→3), peak white flash overlay at midpoint, and incoming media fade-in from white with brightness ramp-down (3→1). Uses 0.45s overlap period with sharp easing for punchy camera shutter effect. Ideal for YouTube thumbnails and 16:9 content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'flash',
    'camera',
    'shutter',
    'brightness',
    'youtube',
    'dramatic',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/image1.jpg',
      type: 'image',
      duration: 3,
    },
    media2: {
      src: 'https://example.com/image2.jpg',
      type: 'image',
      duration: 3,
    },
    overlapDuration: 0.45,
    peakBrightness: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const cameraShutterFlashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
