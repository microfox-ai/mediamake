/**
 * Vertical Curtain Wipe Transition Preset
 *
 * This preset creates a venetian blind style video transition where the incoming video is revealed
 * through 5 vertical strips that expand from thin lines to full width using scaleX transforms.
 * Creates a wave-like reveal pattern from left to right with staggered timing (0.1s offset per strip).
 * The outgoing video fades to 50% opacity during the transition allowing the incoming video to show
 * through the expanding gaps. Ideal for documentary or corporate content with an architectural aesthetic.
 *
 * Features:
 * - **5 Vertical Strips**: Incoming video split into 5 equal-width vertical sections
 * - **Expanding Animation**: Each strip uses scaleX transform to expand from thin line to full width
 * - **Staggered Timing**: 0.1s delay between each strip creating left-to-right wave effect
 * - **Outgoing Fade**: Outgoing video fades from 100% → 50% → 0% opacity over 1.5s
 * - **Venetian Blind Effect**: Architectural transition style perfect for professional content
 *
 * Use cases:
 * - Documentary transitions with a professional feel
 * - Corporate video transitions
 * - Educational content scene changes
 * - Architectural or design-focused content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video (current scene)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (next scene)'),
  overlapDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap in seconds'),
  numberOfStrips: z
    .number()
    .default(5)
    .describe('Number of vertical strips (default: 5)'),
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each strip animation in seconds (default: 0.1s)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    overlapDuration,
    numberOfStrips,
    staggerDelay,
  } = params;

  // Calculate strip width percentage
  const stripWidthPercent = 100 / numberOfStrips;

  // Generate incoming strips
  const incomingStrips: RenderableComponentData[] = [];

  for (let i = 0; i < numberOfStrips; i++) {
    const stripId = `strip-${i}`;
    const stripContainerId = `${stripId}-container`;
    const stripVideoId = `${stripId}-video`;

    // Calculate timing for staggered effect
    const effectStart = i * staggerDelay;
    const effectDuration = overlapDuration - effectStart;

    // Calculate positioning
    const leftPosition = i * stripWidthPercent;
    const videoLeftPosition = -i * stripWidthPercent; // Offset video to show correct portion

    // Create strip container with scaleX effect
    const stripContainer: RenderableComponentData = {
      id: stripContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${leftPosition}%`,
            top: 0,
            width: `${stripWidthPercent}%`,
            height: '100%',
            overflow: 'hidden',
            transformOrigin: 'left',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: `${stripId}-scale-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: effectStart,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [stripContainerId],
            ranges: [
              { key: 'scaleX', val: 0.1, prog: 0 },
              { key: 'scaleX', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: stripVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            fit: 'cover',
            style: {
              position: 'absolute',
              left: `${videoLeftPosition}%`,
              top: 0,
              width: `${100 * numberOfStrips}%`,
              height: '100%',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    incomingStrips.push(stripContainer);
  }

  // Create outgoing video container with opacity fade
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          style: {
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Create incoming strips container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-strips-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: incomingStrips,
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'vertical-curtain-wipe-container',
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
        duration: overlapDuration,
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
  id: 'vertical-curtain-wipe-transition',
  title: 'Vertical Curtain Wipe Transition',
  description:
    'A venetian blind style video transition where the incoming video is revealed through 5 vertical strips that expand from thin lines to full width using scaleX transforms. Creates a wave-like reveal pattern from left to right with staggered timing (0.1s offset per strip). The outgoing video fades to 50% opacity during the transition allowing the incoming video to show through the expanding gaps. Ideal for documentary or corporate content with an architectural aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'curtain',
    'wipe',
    'venetian-blind',
    'vertical',
    'strips',
    'documentary',
    'corporate',
    'architectural',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    overlapDuration: 1.5,
    numberOfStrips: 5,
    staggerDelay: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const verticalCurtainWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
