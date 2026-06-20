/**
 * Paper Fold Accordion Transition Preset
 *
 * This preset creates a vertical paper fold transition that simulates an accordion-style
 * fold revealing the next video. The outgoing video appears to fold into multiple horizontal
 * segments that compress vertically, while the incoming video unfolds from similar segments.
 * Each fold has alternating light/dark shading to simulate the 3D depth of paper folds.
 * The folds animate sequentially from top to bottom with a slight stagger effect.
 * A paper texture overlay becomes visible during the folding animation.
 * The transition feels like turning a page in a pop-up book with 1.8 seconds overlap.
 *
 * Features:
 * - 8 horizontal fold strips with alternating brightness
 * - Sequential top-to-bottom animation with 0.1s stagger per strip
 * - Perspective and rotateX transforms for 3D paper fold effect
 * - Paper texture overlay that fades in/out during transition
 * - ScaleY animations from 1 to 0 (outgoing) and 0 to 1 (incoming)
 * - 1.8 second overlap period
 *
 * Use cases:
 * - Creating accordion-style video transitions
 * - Simulating paper fold effects
 * - Building pop-up book style animations
 * - Adding tactile, physical transitions between clips
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
    .describe('Source URL of the outgoing video'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video'),
  paperTextureSrc: z
    .string()
    .describe('Source URL of the paper texture image'),
  outgoingDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of the transition overlap in seconds'),
  numStrips: z
    .number()
    .default(8)
    .describe('Number of horizontal fold strips (default: 8)'),
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each strip animation in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    paperTextureSrc,
    outgoingDuration,
    incomingDuration,
    transitionDuration,
    numStrips,
    staggerDelay,
  } = params;

  // Calculate total duration (with overlap)
  const totalDuration = outgoingDuration + incomingDuration - transitionDuration;

  // Calculate strip height percentage
  const stripHeight = 100 / numStrips;

  // Helper to create outgoing video strips
  const createOutgoingStrips = (): RenderableComponentData[] => {
    const strips: RenderableComponentData[] = [];

    for (let i = 0; i < numStrips; i++) {
      const stripTop = i * stripHeight;
      const isEven = i % 2 === 0;
      const brightness = isEven ? 1.1 : 0.9;
      const rotateXStart = isEven ? -2 : 2;
      const stripId = `outgoing-strip-${i}`;
      const videoId = `outgoing-video-${i}`;

      // Create strip container
      strips.push({
        id: stripId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute w-full',
            style: {
              top: `${stripTop}%`,
              height: `${stripHeight}%`,
              transformOrigin: 'center top',
              filter: `brightness(${brightness})`,
              overflow: 'hidden',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          {
            id: `${stripId}-fold`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: outgoingDuration - transitionDuration + i * staggerDelay,
              duration: transitionDuration - i * staggerDelay,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                { key: 'scaleY', val: 1, prog: 0 },
                { key: 'scaleY', val: 0, prog: 1 },
                { key: 'rotateX', val: rotateXStart, prog: 0 },
                { key: 'rotateX', val: 0, prog: 0.5 },
                { key: 'rotateX', val: -rotateXStart, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: videoId,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: outgoingVideoSrc,
              fit: 'cover',
              className: 'w-full',
              style: {
                position: 'absolute',
                top: `${-stripTop}%`,
                left: 0,
                width: '100%',
                height: `${numStrips * 100}%`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: outgoingDuration,
              },
            },
          },
        ],
      } as RenderableComponentData);
    }

    return strips;
  };

  // Helper to create incoming video strips
  const createIncomingStrips = (): RenderableComponentData[] => {
    const strips: RenderableComponentData[] = [];

    for (let i = 0; i < numStrips; i++) {
      const stripTop = i * stripHeight;
      const isEven = i % 2 === 0;
      const brightness = isEven ? 1.1 : 0.9;
      const rotateXStart = isEven ? 2 : -2;
      const stripId = `incoming-strip-${i}`;
      const videoId = `incoming-video-${i}`;

      // Create strip container
      strips.push({
        id: stripId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute w-full',
            style: {
              top: `${stripTop}%`,
              height: `${stripHeight}%`,
              transformOrigin: 'center bottom',
              filter: `brightness(${brightness})`,
              overflow: 'hidden',
            },
          },
        },
        context: {
          timing: {
            start: outgoingDuration - transitionDuration,
            duration: incomingDuration + transitionDuration,
          },
        },
        effects: [
          {
            id: `${stripId}-unfold`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: i * staggerDelay,
              duration: transitionDuration - i * staggerDelay,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                { key: 'scaleY', val: 0, prog: 0 },
                { key: 'scaleY', val: 1, prog: 1 },
                { key: 'rotateX', val: rotateXStart, prog: 0 },
                { key: 'rotateX', val: 0, prog: 0.5 },
                { key: 'rotateX', val: -rotateXStart, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: videoId,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: incomingVideoSrc,
              fit: 'cover',
              className: 'w-full',
              style: {
                position: 'absolute',
                top: `${-stripTop}%`,
                left: 0,
                width: '100%',
                height: `${numStrips * 100}%`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: incomingDuration + transitionDuration,
              },
            },
          },
        ],
      } as RenderableComponentData);
    }

    return strips;
  };

  // Create paper texture overlay
  const paperTextureOverlay: RenderableComponentData = {
    id: 'paper-texture-overlay',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: paperTextureSrc,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        mixBlendMode: 'multiply',
      },
    },
    context: {
      timing: {
        start: outgoingDuration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'paper-texture-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['paper-texture-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.2, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create outgoing container with perspective
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    childrenData: createOutgoingStrips(),
  };

  // Create incoming container with perspective
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: outgoingDuration - transitionDuration,
        duration: incomingDuration + transitionDuration,
      },
    },
    childrenData: createIncomingStrips(),
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'paper-fold-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden bg-gray-100',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingContainer, incomingContainer, paperTextureOverlay],
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
  id: 'paper-fold-accordion-transition',
  title: 'Paper Fold Accordion Transition',
  description:
    'A vertical paper fold transition that simulates an accordion-style fold revealing the next video. The outgoing video folds into 8 horizontal segments that compress vertically with staggered timing from top to bottom, while the incoming video unfolds from similar segments. Features alternating light/dark shading for 3D depth simulation, subtle rotateX transforms for realistic fold angles, and a paper texture overlay that appears during the animation. Creates a pop-up book page-turning effect with 1.8 seconds of overlap between clips.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'paper-fold',
    'accordion',
    'vertical',
    'strips',
    '3d',
    'perspective',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    paperTextureSrc: 'https://example.com/paper-texture.jpg',
    outgoingDuration: 5,
    incomingDuration: 5,
    transitionDuration: 1.8,
    numStrips: 8,
    staggerDelay: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const paperFoldAccordionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
