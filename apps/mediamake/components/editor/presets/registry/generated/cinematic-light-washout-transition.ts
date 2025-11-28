/**
 * Cinematic Light Washout Transition Preset
 *
 * Creates a dramatic film-overexposure transition effect simulating white/warm washout.
 * The outgoing image progressively overexposes to near-white with exponential brightness
 * ramping while fading out. At the peak washout (around 60% through the transition),
 * the incoming image begins emerging from the bright void with reduced brightness that
 * gradually normalizes. Both images have warm sepia toning for a film-like aesthetic.
 *
 * Features:
 * - 2-second transition overlap for slow, cinematic pacing
 * - Exponential brightness curve on outgoing image (1 → 4)
 * - Incoming image emerges from overexposed state (brightness 3 → 1)
 * - Warm cream/gold tones via sepia filter (not pure white)
 * - Peak washout at 60% transition with amber-50 background visible
 * - Custom cubic-bezier easing for smooth brightness transitions
 *
 * Use cases:
 * - Cinematic transitions between images/videos
 * - Film-style overexposure effects
 * - Dramatic scene changes with warm aesthetic
 * - Creating nostalgic or dreamy visual transitions
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
  image1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) image'),
    duration: z.number().describe('Duration of first image in seconds'),
  }).describe('First image configuration (outgoing)'),
  
  image2: z.object({
    src: z.string().describe('Source URL of the second (incoming) image'),
    duration: z.number().describe('Duration of second image in seconds'),
  }).describe('Second image configuration (incoming)'),
  
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds (default: 2)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, transitionDuration } = params;

  // Calculate total duration (image1 + image2 - overlap)
  const totalDuration = image1.duration + image2.duration - transitionDuration;

  // Outgoing image container with opacity and brightness effects
  const outgoingImageContainer: RenderableComponentData = {
    id: 'outgoing-image-container',
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
        duration: image1.duration,
      },
    },
    effects: [
      // Opacity effect: 1 → 0.8 → 0.3 → 0 at [0%, 40%, 70%, 100%]
      {
        id: 'outgoing-opacity-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          start: image1.duration - transitionDuration,
          duration: transitionDuration,
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.4 },
            { key: 'opacity', val: 0.3, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Brightness effect: 1 → 2 → 4 → 4 at [0%, 40%, 70%, 100%]
      {
        id: 'outgoing-brightness-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          type: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
          start: image1.duration - transitionDuration,
          duration: transitionDuration,
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 2, prog: 0.4 },
            { key: 'brightness', val: 4, prog: 0.7 },
            { key: 'brightness', val: 4, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-image',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: image1.src,
          className: 'absolute inset-0 object-cover',
          style: {
            objectFit: 'cover',
            filter: 'sepia(0.15)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: image1.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Incoming image container with opacity and brightness effects
  const incomingImageContainer: RenderableComponentData = {
    id: 'incoming-image-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: image1.duration - transitionDuration,
        duration: image2.duration + transitionDuration,
      },
    },
    effects: [
      // Opacity effect: 0 → 0 → 0.5 → 1 at [0%, 50%, 75%, 100%]
      {
        id: 'incoming-opacity-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          start: 0,
          duration: transitionDuration,
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.5 },
            { key: 'opacity', val: 0.5, prog: 0.75 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Brightness effect: 3 → 2.5 → 1.5 → 1 at [0%, 50%, 75%, 100%]
      {
        id: 'incoming-brightness-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          start: 0,
          duration: transitionDuration,
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'brightness', val: 3, prog: 0 },
            { key: 'brightness', val: 2.5, prog: 0.5 },
            { key: 'brightness', val: 1.5, prog: 0.75 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-image',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: image2.src,
          className: 'absolute inset-0 object-cover',
          style: {
            objectFit: 'cover',
            filter: 'sepia(0.15)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: image2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container with warm amber background
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-washout-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-amber-50',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingImageContainer, incomingImageContainer],
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
  id: 'cinematic-light-washout-transition',
  title: 'Cinematic Light Washout Transition',
  description:
    'A dramatic film-overexposure transition effect creating a warm white/cream washout where the outgoing image progressively overexposes to near-white before the incoming image emerges from the bright void. Features exponential brightness ramping, warm sepia toning, and a 2-second overlap for cinematic pacing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'cinematic',
    'film',
    'overexposure',
    'washout',
    'warm',
    'sepia',
    'dramatic',
  ],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const cinematicLightWashoutTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
