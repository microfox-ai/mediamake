/**
 * Polaroid Stack Drop Transition Preset
 *
 * This preset creates a dynamic transition effect where YouTube images appear
 * as rotating polaroid photos that fall onto a growing stack on a wooden table surface.
 * Each polaroid drops from above with 3D rotation, lands with realistic gravity and bounce,
 * and accumulates into a visible stack with deepening shadows.
 *
 * Features:
 * - **Polaroid Frame Effect**: Cream/off-white border around each image
 * - **3D Drop Animation**: Incoming polaroid rotates in 3D space (rotateX from -45deg)
 * - **Random Rotation**: Each polaroid has a slight random rotateZ angle (-8 to 8 degrees)
 * - **Realistic Physics**: Custom cubic-bezier gravity easing + spring bounce on landing
 * - **Stack Accumulation**: Outgoing polaroids remain visible with reduced opacity
 * - **Deepening Shadows**: Shadow intensity increases with each layer
 * - **Wooden Table Background**: Amber-toned background for realistic table effect
 *
 * Technical Details:
 * - Drop animation: 60% of overlap duration (0.48s of 0.8s)
 * - Bounce settle: 40% of overlap duration (0.32s of 0.8s)
 * - Transition overlap: 0.8 seconds between images
 * - Z-index stacking: Increments for proper layering
 * - Provider mode effects: All effects target specific polaroid IDs
 *
 * Use cases:
 * - YouTube thumbnail transitions
 * - Photo slideshow with physical feel
 * - Memory wall effects
 * - Scrapbook-style presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        duration: z.number().describe('Duration to display this image in seconds'),
      }),
    )
    .describe('Array of YouTube images to display as polaroids'),
  transitionOverlap: z
    .number()
    .default(0.8)
    .describe('Overlap duration between polaroids in seconds'),
  dropDuration: z
    .number()
    .default(0.48)
    .describe('Duration of the drop animation (60% of overlap)'),
  bounceDuration: z
    .number()
    .default(0.32)
    .describe('Duration of the bounce settle animation (40% of overlap)'),
  stackOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.9)
    .describe('Opacity of stacked (previous) polaroids'),
  stackOffsetX: z
    .number()
    .default(2)
    .describe('Horizontal offset for stacked polaroids in percentage'),
  stackOffsetY: z
    .number()
    .default(1)
    .describe('Vertical offset for stacked polaroids in percentage'),
  randomRotationRange: z
    .number()
    .default(8)
    .describe('Maximum random rotation angle for polaroids in degrees'),
  trackName: z
    .string()
    .default('polaroid-stack')
    .describe('Name/ID prefix for the track'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    transitionOverlap,
    dropDuration,
    bounceDuration,
    stackOpacity,
    stackOffsetX,
    stackOffsetY,
    randomRotationRange,
    trackName,
  } = params;

  // Helper function to generate random rotation angle
  const getRandomRotation = (): number => {
    return Math.random() * randomRotationRange * 2 - randomRotationRange;
  };

  // Calculate total duration
  let totalDuration = 0;
  if (images.length > 0) {
    totalDuration = images.reduce((sum, img) => sum + img.duration, 0);
    totalDuration -= (images.length - 1) * transitionOverlap;
  }

  // Build polaroid children
  const polaroidChildren: RenderableComponentData[] = [];
  let currentStart = 0;

  images.forEach((image, index) => {
    const isFirst = index === 0;
    const isLast = index === images.length - 1;
    const polaroidId = `${trackName}-polaroid-${index}`;
    const randomRotateZ = getRandomRotation();

    // Calculate timing
    let startTime: number;
    let duration: number;

    if (isFirst) {
      startTime = 0;
      duration = image.duration;
    } else {
      startTime = currentStart - transitionOverlap;
      duration = image.duration + transitionOverlap;
    }

    // Build effects
    const effects: any[] = [];

    // Incoming animation (drop + rotation)
    if (!isFirst) {
      effects.push({
        id: `${polaroidId}-drop-rotation`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          bezier: [0.45, 0, 0.85, 0.35],
          start: 0,
          duration: dropDuration,
          mode: 'provider',
          targetIds: [polaroidId],
          ranges: [
            { key: 'translateY', val: -120, unit: '%', prog: 0 },
            { key: 'translateY', val: 0, unit: '%', prog: 1 },
            { key: 'rotateX', val: -45, unit: 'deg', prog: 0 },
            { key: 'rotateX', val: 0, unit: 'deg', prog: 1 },
            { key: 'rotateZ', val: randomRotateZ, unit: 'deg', prog: 0 },
            { key: 'rotateZ', val: randomRotateZ, unit: 'deg', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });

      // Bounce settle effect
      effects.push({
        id: `${polaroidId}-bounce-settle`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: dropDuration,
          duration: bounceDuration,
          mode: 'provider',
          targetIds: [polaroidId],
          ranges: [
            { key: 'translateY', val: 0, unit: '%', prog: 0 },
            { key: 'translateY', val: -3, unit: '%', prog: 0.5 },
            { key: 'translateY', val: 0, unit: '%', prog: 1 },
          ],
        },
      });
    }

    // Shadow deepening effect (for all polaroids)
    effects.push({
      id: `${polaroidId}-shadow-deepen`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: transitionOverlap,
        mode: 'provider',
        targetIds: [polaroidId],
        ranges: [
          {
            key: 'boxShadow',
            val: '0 4px 6px rgba(0,0,0,0.1)',
            prog: 0,
          },
          {
            key: 'boxShadow',
            val: `0 ${10 + index * 5}px ${20 + index * 10}px rgba(0,0,0,${0.2 + index * 0.05})`,
            prog: 1,
          },
        ],
      },
    });

    // Fade out effect for outgoing polaroids (reduce opacity)
    if (!isLast) {
      effects.push({
        id: `${polaroidId}-stack-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: image.duration - transitionOverlap,
          duration: transitionOverlap,
          mode: 'provider',
          targetIds: [polaroidId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: stackOpacity, prog: 1 },
          ],
        },
      });
    }

    // Create polaroid component
    polaroidChildren.push({
      id: polaroidId,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'absolute p-3 bg-white shadow-2xl',
        style: {
          width: '80%',
          height: '70%',
          left: isFirst
            ? '10%'
            : `${10 + (index % 3) * stackOffsetX}%`,
          top: isFirst
            ? '15%'
            : `${15 + (index % 3) * stackOffsetY}%`,
          objectFit: 'cover',
          zIndex: index + 1,
          transform: isFirst ? 'none' : `rotateZ(${randomRotateZ}deg)`,
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: duration,
        },
      },
      effects,
    } as RenderableComponentData);

    currentStart += image.duration;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-amber-900/20',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: polaroidChildren,
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
  id: 'polaroid-stack-drop',
  title: 'Polaroid Stack Drop Transition',
  description:
    'YouTube images appear as rotating polaroid photos falling onto a growing stack with realistic gravity and bounce physics. Each polaroid has a cream border frame, drops from top with 3D rotation, and settles with bounce easing. Shadows deepen as the stack accumulates, creating realistic depth perception.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'polaroid',
    'stack',
    'drop',
    '3d',
    'physics',
    'youtube',
    'images',
  ],
  defaultInputParams: {
    images: [
      {
        src: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        duration: 5,
      },
      {
        src: 'https://i.ytimg.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
        duration: 5,
      },
      {
        src: 'https://i.ytimg.com/vi/9bZkp7q19f0/maxresdefault.jpg',
        duration: 5,
      },
    ],
    transitionOverlap: 0.8,
    dropDuration: 0.48,
    bounceDuration: 0.32,
    stackOpacity: 0.9,
    stackOffsetX: 2,
    stackOffsetY: 1,
    randomRotationRange: 8,
    trackName: 'polaroid-stack',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const polaroidStackDropPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
