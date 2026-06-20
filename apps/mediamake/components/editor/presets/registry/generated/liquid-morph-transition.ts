/**
 * Liquid Morph Transition Preset
 *
 * Creates a fluid dynamics-inspired transition where media items appear to melt and reform.
 * The outgoing media distorts with wave-like displacement effects while fading out, and the
 * incoming media materializes from a liquid state with inverse distortion. Includes iridescent
 * color shifts during the morph phase to simulate liquid refraction, creating an organic,
 * flowing transition between content.
 *
 * Features:
 * - Wave-like displacement effects with multiple keyframes
 * - Iridescent color shifts (hue-rotate and saturation)
 * - Blur materialization effect on incoming media
 * - Configurable overlap duration
 * - Support for both video and image media
 * - Smooth organic flowing transitions
 *
 * Use cases:
 * - Creating liquid-style transitions for video montages
 * - Building fluid morph effects between images
 * - Adding organic transitions to presentations
 * - Creating artistic video transitions
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
  media1: z.object({
    src: z.string().describe('Source URL of outgoing media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
    volume: z.number().optional().describe('Volume level (0-1)'),
    muted: z.boolean().optional().describe('Whether to mute the media'),
    playbackRate: z.number().optional().describe('Playback speed multiplier'),
  }).describe('Outgoing media configuration'),
  media2: z.object({
    src: z.string().describe('Source URL of incoming media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
    volume: z.number().optional().describe('Volume level (0-1)'),
    muted: z.boolean().optional().describe('Whether to mute the media'),
    playbackRate: z.number().optional().describe('Playback speed multiplier'),
  }).describe('Incoming media configuration'),
  overlapDuration: z
    .number()
    .default(0.8)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration } = params;

  // Calculate BaseLayout duration (media1 + media2 - overlap)
  const baseLayoutDuration =
    media1.duration + media2.duration - overlapDuration;

  // Determine component IDs based on media types
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Create outgoing media container with wave effects
  const outgoingMediaContainer: RenderableComponentData = {
    id: 'outgoing-media-container',
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
        duration: media1.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-media',
        type: 'atom',
        componentId: media1ComponentId,
        data: {
          src: media1.src,
          fit: 'cover',
          volume: media1.volume ?? 1,
          muted: media1.muted ?? false,
          playbackRate: media1.playbackRate ?? 1,
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Wave motion effect: scale(1) -> scale(1.1, 0.9) -> scale(0.9, 1.1) -> scale(0.8)
      {
        id: 'outgoing-wave-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: media1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-media-container'],
          ranges: [
            // scaleX animation
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.1, prog: 0.25 },
            { key: 'scaleX', val: 0.9, prog: 0.5 },
            { key: 'scaleX', val: 0.8, prog: 1 },
            // scaleY animation
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 0.9, prog: 0.25 },
            { key: 'scaleY', val: 1.1, prog: 0.5 },
            { key: 'scaleY', val: 0.8, prog: 1 },
            // opacity fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Iridescent color shift effect
      {
        id: 'outgoing-hue-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: media1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-media-container'],
          ranges: [
            { key: 'hue-rotate', val: 0, prog: 0 },
            { key: 'hue-rotate', val: 30, prog: 1 },
            { key: 'saturate', val: 1, prog: 0 },
            { key: 'saturate', val: 1.5, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming media container with reverse wave and blur effects
  const incomingMediaContainer: RenderableComponentData = {
    id: 'incoming-media-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: media1.duration - overlapDuration,
        duration: media2.duration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-media',
        type: 'atom',
        componentId: media2ComponentId,
        data: {
          src: media2.src,
          fit: 'cover',
          volume: media2.volume ?? 1,
          muted: media2.muted ?? false,
          playbackRate: media2.playbackRate ?? 1,
        },
        context: {
          timing: {
            start: 0,
            duration: media2.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Reverse wave transform: scale(1.2) -> scale(0.9, 1.1) -> scale(1.1, 0.9) -> scale(1)
      {
        id: 'incoming-wave-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-media-container'],
          ranges: [
            // scaleX animation
            { key: 'scaleX', val: 1.2, prog: 0 },
            { key: 'scaleX', val: 0.9, prog: 0.33 },
            { key: 'scaleX', val: 1.1, prog: 0.66 },
            { key: 'scaleX', val: 1, prog: 1 },
            // scaleY animation
            { key: 'scaleY', val: 1.2, prog: 0 },
            { key: 'scaleY', val: 1.1, prog: 0.33 },
            { key: 'scaleY', val: 0.9, prog: 0.66 },
            { key: 'scaleY', val: 1, prog: 1 },
            // opacity fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Blur materialization effect
      {
        id: 'incoming-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-media-container'],
          ranges: [
            { key: 'blur', val: 3, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
      // Reverse iridescent color shift
      {
        id: 'incoming-hue-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-media-container'],
          ranges: [
            { key: 'hue-rotate', val: 30, prog: 0 },
            { key: 'hue-rotate', val: 0, prog: 1 },
            { key: 'saturate', val: 1.5, prog: 0 },
            { key: 'saturate', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create root container with both media containers
  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [outgoingMediaContainer, incomingMediaContainer],
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

// Define preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-morph-transition',
  title: 'Liquid Morph Transition',
  description:
    'A fluid dynamics-inspired transition where media items appear to melt and reform with wave-like distortion, iridescent color shifts, and organic flowing effects creating a liquid morph between content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'liquid', 'morph', 'fluid', 'wave', 'distortion', 'iridescent'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
      volume: 1,
      muted: false,
      playbackRate: 1,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
      volume: 1,
      muted: false,
      playbackRate: 1,
    },
    overlapDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const liquidMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
