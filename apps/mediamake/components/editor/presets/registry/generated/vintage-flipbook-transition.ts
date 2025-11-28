/**
 * Vintage Flipbook Animation Transition Preset
 *
 * Creates a nostalgic page-flipping animation that simulates rapidly thumbing through
 * a physical flipbook or deck of cards. Features organic, hand-flipped feel with:
 *
 * - 7 intermediate page frames with slightly blurred/faded content
 * - Sequential rotateY and translateZ animations creating 3D flip effect
 * - Randomized timing (0.08s-0.15s per page) for organic variation
 * - Varied transform origins (left center with ±5px offset) for natural pivot
 * - Page edge effects: borders and shadows between pages
 * - Slight rotateZ (±2deg) and translateY (±3px) for imperfect flipping
 * - Staggered timing with 0.05s gaps between page starts
 * - Motion blur on intermediate frames (blur(1px))
 * - Total duration: ~0.7s (7 pages with staggered starts)
 * - Optional audio flutter sound synchronized with page flips
 *
 * Use cases:
 * - Scene transitions with vintage/tactile aesthetic
 * - Retro-styled slideshows or memory sequences
 * - Creative page-turn effects for storytelling
 * - Nostalgic content transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  transitionDuration: z
    .number()
    .min(0.4)
    .max(1.5)
    .default(0.7)
    .optional()
    .describe('Total duration of the flipbook transition in seconds'),
  pageCount: z
    .number()
    .int()
    .min(5)
    .max(10)
    .default(7)
    .optional()
    .describe('Number of intermediate page frames (5-10)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .optional()
    .describe('Blur amount on intermediate frames in pixels (0-3)'),
  perspectiveDistance: z
    .number()
    .min(600)
    .max(2000)
    .default(1200)
    .optional()
    .describe('3D perspective distance in pixels (600-2000)'),
  audioSrc: z
    .string()
    .optional()
    .describe('Optional audio source for flutter sound effect (e.g., uploaded asset)'),
  audioVolume: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Volume for flutter sound effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const transitionDuration = params.transitionDuration ?? 0.7;
  const pageCount = params.pageCount ?? 7;
  const blurIntensity = params.blurIntensity ?? 1;
  const perspectiveDistance = params.perspectiveDistance ?? 1200;
  const audioSrc = params.audioSrc;
  const audioVolume = params.audioVolume ?? 0.6;

  // Helper: Generate random value within range
  const randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper: Generate page timing parameters with slight variations
  const generatePageTiming = (index: number, totalPages: number) => {
    // Stagger start time: 0.05s gaps between page starts
    const startTime = index * 0.05;

    // Random duration per page between 0.08s and 0.15s
    const duration = randomInRange(0.08, 0.15);

    // Transform origin variations: left center with ±5px offset
    const transformOriginY = randomInRange(-5, 5);
    const transformOrigin = `left calc(50% + ${transformOriginY}px)`;

    // Slight variations in rotation and translation for organic feel
    const rotateZ = randomInRange(-2, 2); // ±2 degrees
    const translateY = randomInRange(-3, 3); // ±3 pixels

    return {
      startTime,
      duration,
      transformOrigin,
      rotateZ,
      translateY,
    };
  };

  // Generate page layer data
  const pageLayersData = Array.from({ length: pageCount }, (_, index) => {
    const timing = generatePageTiming(index, pageCount);

    // Vary background color slightly for each page
    const opacity = 0.86 + Math.random() * 0.09; // 0.86-0.95
    const brightness = 250 + Math.floor(Math.random() * 6); // 250-255

    // Vary border and shadow intensity
    const borderOpacity = 0.08 + Math.random() * 0.04; // 0.08-0.12
    const shadowBlur = 6 + Math.floor(Math.random() * 7); // 6-12px
    const shadowOpacity = 0.12 + Math.random() * 0.1; // 0.12-0.22

    return {
      index,
      timing,
      opacity,
      brightness,
      borderOpacity,
      shadowBlur,
      shadowOpacity,
    };
  });

  // Create page layer components
  const pageLayerComponents: RenderableComponentData[] = pageLayersData.map(
    (pageData) => {
      const {
        index,
        timing,
        opacity,
        brightness,
        borderOpacity,
        shadowBlur,
        shadowOpacity,
      } = pageData;

      const pageLayerId = `flipbook-page-layer-${index}`;
      const pageContentId = `flipbook-page-content-${index}`;

      // Page content (blurred background)
      const pageContent: RenderableComponentData = {
        id: pageContentId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              filter: `blur(${blurIntensity * (0.5 + Math.random() * 0.7)}px)`,
              backgroundColor: `rgba(${brightness}, ${brightness - 2}, ${brightness - 5}, ${opacity})`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: timing.duration,
          },
        },
        childrenData: [],
      };

      // Page layer container with 3D transform
      const pageLayer: RenderableComponentData = {
        id: pageLayerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              transformOrigin: timing.transformOrigin,
              borderRight: `1px solid rgba(0, 0, 0, ${borderOpacity})`,
              boxShadow: `${2 + Math.floor(Math.random() * 3)}px 0 ${shadowBlur}px rgba(0, 0, 0, ${shadowOpacity})`,
            },
          },
        },
        context: {
          timing: {
            start: timing.startTime,
            duration: timing.duration,
          },
        },
        effects: [
          {
            id: `flipbook-page-flip-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: timing.duration,
              mode: 'provider',
              targetIds: [pageLayerId],
              ranges: [
                // Opacity: 0 -> 1 -> 0 (brief visibility)
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
                // RotateY: 0 -> -180deg (flip animation)
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: -180, prog: 1 },
                // TranslateZ: 0 -> -50px (depth movement)
                { key: 'translateZ', val: 0, prog: 0 },
                { key: 'translateZ', val: -50, prog: 1 },
                // RotateZ: slight wobble for organic feel
                { key: 'rotateZ', val: 0, prog: 0 },
                { key: 'rotateZ', val: timing.rotateZ, prog: 0.5 },
                { key: 'rotateZ', val: 0, prog: 1 },
                // TranslateY: slight vertical drift
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: timing.translateY, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [pageContent],
      };

      return pageLayer;
    },
  );

  // Optional audio atom for flutter sound
  const audioComponents: RenderableComponentData[] = [];
  if (audioSrc) {
    const audioAtom: RenderableComponentData = {
      id: 'flipbook-audio-flutter',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: audioSrc,
        volume: audioVolume,
        startFrom: 0,
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    };
    audioComponents.push(audioAtom);
  }

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'vintage-flipbook-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: `${perspectiveDistance}px`,
          perspectiveOrigin: 'center center',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [...pageLayerComponents, ...audioComponents],
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
  id: 'vintage-flipbook-transition',
  title: 'Vintage Flipbook Animation Transition',
  description:
    'A nostalgic flipbook-style page-flipping transition that simulates rapidly thumbing through physical pages. Features 7 intermediate page layers with organic timing variations (0.08-0.15s per page), realistic page edges with shadows, slight rotation imperfections (±2deg rotateZ, ±3px translateY), motion blur effects, and staggered animations creating an authentic hand-flipped feel. Includes optional flutter sound effect synchronization for tactile audio feedback.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'flipbook',
    'vintage',
    'pages',
    'nostalgic',
    '3d',
    'organic',
    'retro',
  ],
  defaultInputParams: {
    transitionDuration: 0.7,
    pageCount: 7,
    blurIntensity: 1,
    perspectiveDistance: 1200,
    audioVolume: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vintageFlipbookTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
