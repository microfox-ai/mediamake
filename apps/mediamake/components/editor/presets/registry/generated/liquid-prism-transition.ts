/**
 * Liquid Prism Transition Preset
 *
 * A creative video transition where content appears to melt into prismatic liquid drops that
 * separate into rainbow colors before reforming. Features 16 circular VideoAtom instances
 * arranged in a grid with varying sizes (50-150px), each with unique hue-rotate filters
 * (0-360deg range). Drops animate with physics-based bounce easing on translateY, morphing
 * border-radius (50% → 20% → 70% → 50%), and scale transformations (1 → 0.5 → 1.2 → 1).
 * Uses mix-blend-mode: screen for color blending and staggered opacity timing for organic
 * liquid motion.
 *
 * Technical Specifications:
 * - BaseLayout with 1.3s overlap between outgoing and incoming videos
 * - 12-16 VideoAtom instances per video with border-radius: 50% and varying dimensions (50px to 150px)
 * - Each atom has unique hue-rotate filter (0deg to 360deg range)
 * - Generic effects with custom easing: transform (translateY with bounce easing, scale from 1 to 0.5 to 1.2 to 1),
 *   border-radius (50% to 20% to 70% to 50%), opacity with staggered fade timing
 * - Mix-blend-mode: screen for color blending
 * - Position atoms in grid pattern that disperses during transition
 *
 * Use cases:
 * - Creative video transitions with liquid/prismatic effects
 * - Music video transitions with rainbow color separation
 * - High-impact transitions for artistic content
 * - Color-shifting transitions for dynamic visual storytelling
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
    .describe('Source URL of the outgoing video (before transition)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (after transition)'),
  transitionVideoSrc: z
    .string()
    .describe('Source URL of the video used for prismatic drops'),
  outgoingDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  overlapDuration: z
    .number()
    .default(1.3)
    .describe('Overlap duration for transition in seconds (default: 1.3s)'),
  dropCount: z
    .number()
    .min(12)
    .max(16)
    .default(16)
    .describe('Number of prismatic drops (12-16)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionVideoSrc,
    outgoingDuration,
    incomingDuration,
    overlapDuration,
    dropCount,
  } = params;

  // Calculate total duration (outgoing + incoming - overlap)
  const totalDuration = outgoingDuration + incomingDuration - overlapDuration;

  // Helper: Generate drop sizes (50-150px range)
  const generateDropSizes = (count: number): number[] => {
    const sizes: number[] = [];
    for (let i = 0; i < count; i++) {
      // Distribute sizes across range
      const size = 50 + Math.floor((100 / (count - 1)) * i);
      sizes.push(size);
    }
    return sizes;
  };

  // Helper: Generate hue-rotate values (0-360deg)
  const generateHueRotations = (count: number): number[] => {
    const rotations: number[] = [];
    for (let i = 0; i < count; i++) {
      const rotation = Math.floor((360 / count) * i);
      rotations.push(rotation);
    }
    return rotations;
  };

  const dropSizes = generateDropSizes(dropCount);
  const hueRotations = generateHueRotations(dropCount);

  // Create drop atoms
  const dropAtoms: RenderableComponentData[] = dropSizes.map(
    (size, index) => {
      const dropId = `drop-${index}`;
      const hueRotate = hueRotations[index];
      const staggerDelay = index * 0.05; // Stagger timing (0.05s per drop)

      return {
        id: dropId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: transitionVideoSrc,
          fit: 'cover',
          className: 'overflow-hidden',
          style: {
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            filter: `hue-rotate(${hueRotate}deg)`,
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [
          // Opacity fade (staggered)
          {
            id: `opacity-${dropId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: staggerDelay,
              duration: overlapDuration - staggerDelay,
              mode: 'provider',
              targetIds: [dropId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          // TranslateY (bounce effect)
          {
            id: `translateY-${dropId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: staggerDelay,
              duration: overlapDuration - staggerDelay,
              mode: 'provider',
              targetIds: [dropId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: 100, prog: 0.3 },
                { key: 'translateY', val: 80, prog: 0.5 },
                { key: 'translateY', val: 90, prog: 0.7 },
                { key: 'translateY', val: 85, prog: 1 },
              ],
            },
          },
          // Scale morph (1 → 0.5 → 1.2 → 1)
          {
            id: `scale-${dropId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: staggerDelay,
              duration: overlapDuration - staggerDelay,
              mode: 'provider',
              targetIds: [dropId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.5, prog: 0.3 },
                { key: 'scale', val: 1.2, prog: 0.7 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
          // Border-radius morph (50% → 20% → 70% → 50%)
          {
            id: `borderRadius-${dropId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: staggerDelay,
              duration: overlapDuration - staggerDelay,
              mode: 'provider',
              targetIds: [dropId],
              ranges: [
                { key: 'borderRadius', val: '50%', prog: 0 },
                { key: 'borderRadius', val: '20%', prog: 0.3 },
                { key: 'borderRadius', val: '70%', prog: 0.7 },
                { key: 'borderRadius', val: '50%', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Drop grid container
  const dropGridContainer: RenderableComponentData = {
    id: 'drop-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-4 grid-rows-4',
        style: {
          gap: '10px',
          padding: '20px',
          justifyItems: 'center',
          alignItems: 'center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: dropAtoms,
  };

  // Prismatic drops layer
  const prismaticDropsLayer: RenderableComponentData = {
    id: 'prismatic-drops-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: outgoingDuration - overlapDuration,
        duration: overlapDuration,
      },
    },
    childrenData: [dropGridContainer],
  };

  // Outgoing video layer
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
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
        duration: outgoingDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          {
            id: 'outgoing-fade-out',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: outgoingDuration - overlapDuration,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video layer
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: outgoingDuration - overlapDuration / 2,
        duration: incomingDuration + overlapDuration / 2,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration + overlapDuration / 2,
          },
        },
        effects: [
          {
            id: 'incoming-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration / 2,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-prism-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoLayer,
      prismaticDropsLayer,
      incomingVideoLayer,
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
  id: 'liquid-prism-transition',
  title: 'Liquid Prism Transition',
  description:
    'A creative video transition where content appears to melt into prismatic liquid drops that separate into rainbow colors before reforming. Features 16 circular VideoAtom instances arranged in a grid with varying sizes (50-150px), each with unique hue-rotate filters (0-360deg range). Drops animate with physics-based bounce easing on translateY, morphing border-radius (50% → 20% → 70% → 50%), and scale transformations (1 → 0.5 → 1.2 → 1). Uses mix-blend-mode: screen for color blending and staggered opacity timing for organic liquid motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'liquid',
    'prism',
    'rainbow',
    'creative',
    'drops',
    'morphing',
    'color-shift',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionVideoSrc: 'https://example.com/transition-video.mp4',
    outgoingDuration: 10,
    incomingDuration: 10,
    overlapDuration: 1.3,
    dropCount: 16,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidPrismTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
