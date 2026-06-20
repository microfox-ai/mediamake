/**
 * Vertical Drop Projector Transition Preset
 *
 * This preset simulates a top-loading slide projector mechanism where slides
 * drop vertically through the frame. The outgoing image drops down and out
 * while the incoming image drops in from above, creating a gravity-based
 * carousel effect.
 *
 * Features:
 * - Mechanical slide projector simulation with vertical drop physics
 * - Brief pause at the top (0.15s) simulating slide settling into gate
 * - Accelerating fall (ease-in-quart) for outgoing slide
 * - Decelerating entry (ease-out-quart) for incoming slide
 * - Dynamic shadow effects enhancing physical depth:
 *   - Outgoing: upward shadow (0 -10px 30px) fading in during drop
 *   - Incoming: downward shadow (0 10px 30px) fading out during entry
 * - Supports both image and video media types
 * - Black gap between transitions for mechanical realism
 *
 * Technical Implementation:
 * - BaseLayout container with absolute positioning and overflow hidden
 * - Total transition duration: ~0.7s (0.25s drop + 0.15s pause + 0.3s entry)
 * - Outgoing animation: translateY 0% → 100% over 0.25s (ease-in-quart)
 * - Incoming animation: translateY -100% → 0% over 0.3s (ease-out-quart)
 * - Shadow effects animate in sync with drop/entry movements
 * - BaseLayout duration = img1.duration + img2.duration + 0.7s transition
 *
 * Use cases:
 * - Creating vintage slide show presentations
 * - Retro photo gallery transitions
 * - Mechanical carousel-style video transitions
 * - Educational content with nostalgic projector aesthetic
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
  image1: z
    .object({
      src: z.string().describe('Source URL of the first (outgoing) image'),
      duration: z.number().describe('Display duration of first image in seconds'),
    })
    .describe('First image configuration'),
  image2: z
    .object({
      src: z.string().describe('Source URL of the second (incoming) image'),
      duration: z.number().describe('Display duration of second image in seconds'),
    })
    .describe('Second image configuration'),
  transitionDuration: z
    .number()
    .default(0.7)
    .describe('Total transition duration in seconds (drop + pause + entry)'),
  dropDuration: z
    .number()
    .default(0.25)
    .describe('Duration of outgoing image drop in seconds'),
  pauseDuration: z
    .number()
    .default(0.15)
    .describe('Pause duration between drops (simulates slide settling) in seconds'),
  entryDuration: z
    .number()
    .default(0.3)
    .describe('Duration of incoming image entry in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    image1,
    image2,
    transitionDuration,
    dropDuration,
    pauseDuration,
    entryDuration,
  } = params;

  // Calculate timing
  // Total BaseLayout duration = img1 display + img2 display + transition overhead
  const baseLayoutDuration = image1.duration + image2.duration + transitionDuration;

  // Outgoing container timing: starts at 0, lasts for img1.duration + drop time
  const outgoingContainerStart = 0;
  const outgoingContainerDuration = image1.duration + dropDuration;

  // Incoming container timing: starts after outgoing drop + pause
  const incomingContainerStart = image1.duration + dropDuration + pauseDuration;
  const incomingContainerDuration = image2.duration + entryDuration;

  // Drop effect timing (relative to outgoing container)
  const dropEffectStart = image1.duration; // Drop starts at end of display time
  
  // Entry effect timing (relative to incoming container, which starts late)
  const entryEffectStart = 0; // Entry starts immediately when incoming container appears

  // Outgoing container with drop animation
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
        start: outgoingContainerStart,
        duration: outgoingContainerDuration,
      },
    },
    effects: [
      // Drop animation: translateY 0% → 100%
      {
        id: 'outgoing-drop-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-quart',
          start: dropEffectStart,
          duration: dropDuration,
          mode: 'provider',
          targetIds: ['outgoing-container'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '100%', prog: 1 },
          ],
        },
      },
      // Upward shadow effect: fades in during drop
      {
        id: 'outgoing-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-quart',
          start: dropEffectStart,
          duration: dropDuration,
          mode: 'provider',
          targetIds: ['outgoing-container'],
          ranges: [
            { key: 'boxShadow', val: '0 0px 0px rgba(0,0,0,0)', prog: 0 },
            { key: 'boxShadow', val: '0 -10px 30px rgba(0,0,0,0.5)', prog: 1 },
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
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingContainerDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Incoming container with entry animation
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
        start: incomingContainerStart,
        duration: incomingContainerDuration,
      },
    },
    effects: [
      // Entry animation: translateY -100% → 0%
      {
        id: 'incoming-entry-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out-quart',
          start: entryEffectStart,
          duration: entryDuration,
          mode: 'provider',
          targetIds: ['incoming-container'],
          ranges: [
            { key: 'translateY', val: '-100%', prog: 0 },
            { key: 'translateY', val: '0%', prog: 1 },
          ],
        },
      },
      // Downward shadow effect: fades out during entry
      {
        id: 'incoming-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out-quart',
          start: entryEffectStart,
          duration: entryDuration,
          mode: 'provider',
          targetIds: ['incoming-container'],
          ranges: [
            { key: 'boxShadow', val: '0 10px 30px rgba(0,0,0,0.5)', prog: 0 },
            { key: 'boxShadow', val: '0 0px 0px rgba(0,0,0,0)', prog: 1 },
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
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingContainerDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vertical-drop-projector-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'vertical-drop-projector-transition',
  title: 'Vertical Drop Projector Transition',
  description:
    'A vertical drop transition simulating a top-loading slide projector mechanism. The outgoing image drops down out of frame while the incoming image drops in from above, with a brief pause at the top to simulate slide settling. Features gravity-based physics with ease-in-quart (accelerating fall) and ease-out-quart (decelerating entry), plus dynamic shadow effects that enhance the physical depth of the mechanical carousel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vertical',
    'drop',
    'projector',
    'slide',
    'carousel',
    'mechanical',
    'gravity',
    'shadow',
    'vintage',
    'retro',
  ],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
      duration: 5,
    },
    transitionDuration: 0.7,
    dropDuration: 0.25,
    pauseDuration: 0.15,
    entryDuration: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const verticalDropProjectorTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
