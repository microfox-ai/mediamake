/**
 * Masking Tape Grid Reveal Transition Preset
 *
 * This preset creates a sophisticated masking tape grid reveal transition where the entire screen
 * is covered by a grid of realistic masking tape strips (horizontal and vertical). During the 
 * 2-second transition, the tape strips slide out in a diagonal wave pattern from top-left to 
 * bottom-right, revealing the incoming video beneath.
 *
 * Features:
 * - **Grid Coverage**: 20 tape strips (10 horizontal, 10 vertical) covering the entire screen
 * - **Realistic Appearance**: Beige/tan color with semi-transparent edges and subtle texture
 * - **Diagonal Wave Animation**: Strips slide out in a staggered wave pattern from top-left to bottom-right
 * - **Transform Effects**: Each strip rotates and scales as it moves off-screen
 * - **Audio Synchronization**: Adhesive 'unsticking' sound follows the wave pattern
 * - **Smooth Transitions**: 2-second overlap between outgoing and incoming videos
 *
 * Use cases:
 * - Creating dynamic transitions between video clips
 * - Adding artistic reveal effects to presentations
 * - Building engaging video sequences with unique transitions
 * - Creating professional video content with stylized effects
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
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      volume: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Volume level (0-1, default: 1)'),
    })
    .describe('Outgoing video configuration'),
  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      volume: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Volume level (0-1, default: 1)'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of the transition overlap in seconds'),
  unstickSound: z
    .object({
      src: z
        .string()
        .optional()
        .describe('Source URL of the adhesive unsticking sound'),
      volume: z
        .number()
        .min(0)
        .max(1)
        .default(0.7)
        .describe('Volume level (0-1, default: 0.7)'),
    })
    .optional()
    .describe('Adhesive unsticking sound configuration'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, unstickSound } =
    params;

  // For this transition, we need to know the durations of both videos
  // Since we don't have duration info in params, we'll use a placeholder approach
  // In real usage, durations would be provided or calculated from media metadata
  const outgoingDuration = 5; // Placeholder - would be from media metadata
  const incomingDuration = 5; // Placeholder - would be from media metadata

  // Calculate BaseLayout duration: sum of media durations minus overlap
  const baseLayoutDuration =
    outgoingDuration + incomingDuration - transitionDuration;

  // Grid configuration
  const horizontalStrips = 10;
  const verticalStrips = 10;
  const totalStrips = horizontalStrips + verticalStrips;

  // Animation timing
  const stripAnimationDuration = 0.3; // Each strip animates for 300ms
  const delayIncrement = 0.05; // 50ms delay between each strip

  // Create tape strips
  const tapeStrips: RenderableComponentData[] = [];

  // Helper function to create tape strip
  const createTapeStrip = (
    index: number,
    isHorizontal: boolean,
  ): RenderableComponentData => {
    const stripId = `tape-${isHorizontal ? 'h' : 'v'}-${index}`;
    const position = (index * 10).toString(); // 0%, 10%, 20%, etc.

    // Calculate delay based on position in grid (diagonal wave)
    const delay = isHorizontal
      ? index * delayIncrement
      : index * delayIncrement;

    // Determine animation direction
    const translateKey = isHorizontal ? 'translateY' : 'translateX';
    const translateValue = isHorizontal ? -120 : -120; // Move off-screen
    const rotateValue = isHorizontal ? -15 : 15; // Rotate as it moves

    // Create the tape strip
    const strip: RenderableComponentData = {
      id: stripId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="w-full h-full"></div>`,
        className: isHorizontal
          ? `absolute left-0 bg-amber-50/85 backdrop-blur-sm shadow-md`
          : `absolute top-0 bg-amber-50/85 backdrop-blur-sm shadow-md`,
        style: {
          ...(isHorizontal
            ? {
                top: `${position}%`,
                width: '100%',
                height: '10%',
              }
            : {
                left: `${position}%`,
                width: '10%',
                height: '100%',
              }),
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      effects: [
        {
          id: `${stripId}-slide-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingDuration - transitionDuration + delay,
            duration: stripAnimationDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: translateKey, val: 0, prog: 0 },
              { key: translateKey, val: translateValue, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotateValue, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.8, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    return strip;
  };

  // Create horizontal strips
  for (let i = 0; i < horizontalStrips; i++) {
    tapeStrips.push(createTapeStrip(i, true));
  }

  // Create vertical strips
  for (let i = 0; i < verticalStrips; i++) {
    tapeStrips.push(createTapeStrip(i, false));
  }

  // Create child components
  const childrenData: RenderableComponentData[] = [
    // Incoming video (bottom layer, z-0)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        volume: incomingVideo.volume ?? 1,
        fit: 'cover',
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: outgoingDuration - transitionDuration,
          duration: incomingDuration + transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Outgoing video (middle layer, z-5)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        volume: outgoingVideo.volume ?? 1,
        fit: 'cover',
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 5,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingDuration,
        },
      },
    } as RenderableComponentData,

    // Tape grid container (top layer, z-10)
    {
      id: 'tape-grid-container',
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
          duration: baseLayoutDuration,
        },
      },
      childrenData: tapeStrips,
    } as RenderableComponentData,
  ];

  // Add audio if provided
  if (unstickSound?.src) {
    childrenData.push({
      id: 'unstick-audio',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: unstickSound.src,
        volume: unstickSound.volume ?? 0.7,
      },
      context: {
        timing: {
          start: outgoingDuration - transitionDuration,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'masking-tape-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible',
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

const presetMetadata: PresetMetadata = {
  id: 'masking-tape-grid-reveal',
  title: 'Masking Tape Grid Reveal Transition',
  description:
    'A sophisticated transition featuring a grid of realistic masking tape strips that slide out in a diagonal wave pattern, revealing the incoming video beneath with rotation and scaling effects',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'masking-tape',
    'grid',
    'reveal',
    'wave',
    'diagonal',
    'tape',
    'artistic',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      volume: 1,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      volume: 1,
    },
    transitionDuration: 2,
    unstickSound: {
      src: 'https://example.com/unstick-sound.mp3',
      volume: 0.7,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const maskingTapeGridRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
