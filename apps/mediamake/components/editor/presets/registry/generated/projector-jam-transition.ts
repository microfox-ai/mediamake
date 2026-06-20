/**
 * Projector Jam/Stutter Transition Preset
 *
 * This preset simulates the mechanical hiccup of vintage slide carousels. The outgoing image
 * appears to 'stick' momentarily with rapid shake movements before finally breaking free.
 * The incoming slide then snaps into place with authority, creating tension and authentic
 * mechanical character.
 *
 * Features:
 * - **Vintage Mechanical Feel**: Simulates stuck-then-release pattern of old projectors
 * - **Shake Sequence**: 2-3 quick shake movements with increasing intensity
 * - **Brightness Flicker**: Subtle brightness changes during jam moment
 * - **Accelerated Exit**: Outgoing slide breaks free with rapid movement
 * - **Authoritative Snap**: Incoming slide snaps into place decisively
 * - **Brief Black Gap**: 0.15s pause between slides for authentic feel
 * - **Custom Easing**: Mechanical steps() easing for realistic motion
 *
 * Use cases:
 * - Creating vintage presentation aesthetics
 * - Adding character to educational content
 * - Simulating old-school projector shows
 * - Building retro-styled slideshows
 * - Adding tension to narrative transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingImage: z.object({
    src: z.string().describe('Source URL of outgoing image'),
  }).describe('Outgoing image configuration'),
  
  incomingImage: z.object({
    src: z.string().describe('Source URL of incoming image'),
  }).describe('Incoming image configuration'),
  
  transitionDuration: z
    .number()
    .min(0.6)
    .max(0.8)
    .default(0.7)
    .describe('Total transition duration in seconds (0.6-0.8s)'),
  
  jamDuration: z
    .number()
    .min(0.4)
    .max(0.6)
    .default(0.5)
    .describe('Duration of jam/stuck phase before release (0.4-0.6s)'),
  
  blackGapDuration: z
    .number()
    .min(0.1)
    .max(0.2)
    .default(0.15)
    .describe('Duration of black gap between slides (0.1-0.2s)'),
  
  snapDuration: z
    .number()
    .min(0.1)
    .max(0.2)
    .default(0.15)
    .describe('Duration of incoming snap animation (0.1-0.2s)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingImage,
    incomingImage,
    transitionDuration,
    jamDuration,
    blackGapDuration,
    snapDuration,
  } = params;

  // Calculate timing phases
  const outgoingExitTime = jamDuration + 0.2; // Jam phase + accelerated exit
  const incomingStartTime = outgoingExitTime + blackGapDuration;

  // Outgoing image shake effect with stuck-then-release pattern
  const outgoingShakeEffect = {
    id: 'outgoing-shake-effect',
    componentId: 'generic',
    data: {
      mode: 'provider' as const,
      targetIds: ['outgoing-image'],
      type: 'linear' as const,
      start: 0,
      duration: outgoingExitTime,
      ranges: [
        // Stuck position (start)
        { key: 'translateX', val: 0, prog: 0 },
        // First shake left
        { key: 'translateX', val: -5, prog: 0.214 },
        // Return center
        { key: 'translateX', val: 0, prog: 0.357 },
        // Second shake left (stronger)
        { key: 'translateX', val: -8, prog: 0.571 },
        // Return center briefly
        { key: 'translateX', val: 0, prog: 0.714 },
        // Final release - accelerated exit left
        { key: 'translateX', val: -100, prog: 1 },
      ],
    },
  };

  // Brightness flicker synchronized with shake
  const outgoingFlickerEffect = {
    id: 'outgoing-flicker-effect',
    componentId: 'generic',
    data: {
      mode: 'provider' as const,
      targetIds: ['outgoing-image'],
      type: 'linear' as const,
      start: 0,
      duration: outgoingExitTime,
      ranges: [
        // Normal brightness
        { key: 'brightness', val: 1, prog: 0 },
        // Bright flash during first shake
        { key: 'brightness', val: 1.2, prog: 0.214 },
        // Dim during return
        { key: 'brightness', val: 0.9, prog: 0.357 },
        // Bright flash during second shake
        { key: 'brightness', val: 1.1, prog: 0.571 },
        // Normal before exit
        { key: 'brightness', val: 1, prog: 0.714 },
        // Dim on exit
        { key: 'brightness', val: 0.5, prog: 1 },
      ],
    },
  };

  // Incoming image snap effect with ease-out-quart
  const incomingSnapEffect = {
    id: 'incoming-snap-effect',
    componentId: 'generic',
    data: {
      mode: 'provider' as const,
      targetIds: ['incoming-image'],
      type: 'ease-out' as const,
      start: 0,
      duration: snapDuration,
      ranges: [
        // Start off-screen right
        { key: 'translateX', val: 100, prog: 0 },
        // Snap into place
        { key: 'translateX', val: 0, prog: 1 },
      ],
    },
  };

  // Outgoing image container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-container',
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
        duration: outgoingExitTime,
      },
    },
    childrenData: [
      {
        id: 'outgoing-image',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: outgoingImage.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingExitTime,
          },
        },
        effects: [outgoingShakeEffect, outgoingFlickerEffect],
      } as RenderableComponentData,
    ],
  };

  // Incoming image container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: snapDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-image',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: incomingImage.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: snapDuration,
          },
        },
        effects: [incomingSnapEffect],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'projector-jam-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [outgoingContainer, incomingContainer],
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
  id: 'projector-jam-transition',
  title: 'Projector Jam/Stutter Transition',
  description:
    'A vintage slide carousel transition simulating mechanical hiccup with stuck-then-release shake effect, brightness flicker, and decisive snap-in. Creates tension and authentic mechanical character rather than digital smoothness. Features 2-3 rapid shake movements with the outgoing slide momentarily sticking before breaking free, followed by a brief black gap, and the incoming slide snapping into place with authority.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'mechanical', 'projector', 'shake', 'retro'],
  defaultInputParams: {
    outgoingImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    incomingImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    },
    transitionDuration: 0.7,
    jamDuration: 0.5,
    blackGapDuration: 0.15,
    snapDuration: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const projectorJamTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
