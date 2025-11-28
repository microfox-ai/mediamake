/**
 * Curtain Wipe Transition Preset
 *
 * A theatrical stage curtain transition effect where two colored divs start from the center
 * and split apart, sliding outward to the edges to reveal the content beneath. The curtains
 * feature fabric-like gradient textures, subtle shadows at their meeting point, and weighted
 * motion with ease-in-out animations that suggest physical momentum.
 *
 * Features:
 * - **Center-Split Animation**: Two curtain divs start together and slide apart horizontally
 * - **Fabric-Like Texture**: Linear gradients simulate fabric folds and depth
 * - **Shadow Depth**: Semi-transparent shadow overlay where curtains meet in the middle
 * - **Weighted Motion**: Ease-in-out animations with subtle scale effects for momentum
 * - **Perspective Effect**: ScaleX animation (1 → 0.95 → 1) adds depth during movement
 * - **Customizable Colors**: Rich brown gradient by default, fully configurable
 * - **Dual Image Layers**: Two ImageAtom layers for before/after reveal scenarios
 *
 * Use cases:
 * - Theatrical scene transitions
 * - Dramatic image reveals
 * - Stage performance-style content unveiling
 * - Before/after image comparisons with flair
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  imageLayer1: z
    .object({
      src: z.string().describe('Source URL for the first image layer'),
    })
    .describe('First image layer (visible before curtains open)'),
  imageLayer2: z
    .object({
      src: z.string().describe('Source URL for the second image layer'),
    })
    .describe('Second image layer (revealed when curtains open)'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(3)
    .describe('Duration of the curtain wipe transition in seconds'),
  curtainColor: z
    .string()
    .default('#8B4513')
    .describe('Base color for the curtain gradient (default: saddle brown)'),
  curtainAccentColor: z
    .string()
    .default('#A0522D')
    .describe(
      'Accent color for curtain gradient highlights (default: sienna)',
    ),
  curtainShadowColor: z
    .string()
    .default('#6B3410')
    .describe('Dark color for curtain gradient shadows (default: dark brown)'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity of the center shadow (0 = transparent, 1 = opaque)'),
  shadowBlur: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .describe('Blur radius of the center shadow in pixels'),
  perspectiveScale: z
    .number()
    .min(0.8)
    .max(1)
    .default(0.95)
    .describe(
      'Minimum scale value for perspective effect during movement (default: 0.95)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    imageLayer1,
    imageLayer2,
    transitionDuration,
    curtainColor,
    curtainAccentColor,
    curtainShadowColor,
    shadowIntensity,
    shadowBlur,
    perspectiveScale,
  } = params;

  // Construct gradient backgrounds for fabric-like texture
  const leftCurtainGradient = `linear-gradient(to right, ${curtainColor} 0%, ${curtainAccentColor} 20%, ${curtainColor} 40%, ${curtainShadowColor} 60%, ${curtainColor} 80%, ${curtainAccentColor} 100%)`;
  const rightCurtainGradient = `linear-gradient(to left, ${curtainColor} 0%, ${curtainAccentColor} 20%, ${curtainColor} 40%, ${curtainShadowColor} 60%, ${curtainColor} 80%, ${curtainAccentColor} 100%)`;

  const childrenData: RenderableComponentData[] = [
    // Image Layer 1 (background/before layer)
    {
      id: 'curtain-image-layer-1',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: imageLayer1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Image Layer 2 (revealed layer)
    {
      id: 'curtain-image-layer-2',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: imageLayer2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 2,
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'image-layer-2-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionDuration * 0.5,
            duration: transitionDuration * 0.5,
            mode: 'provider',
            targetIds: ['curtain-image-layer-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Left Curtain
    {
      id: 'curtain-left',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-y-0 left-0 w-1/2',
          style: {
            zIndex: 10,
            background: leftCurtainGradient,
            boxShadow: 'inset -8px 0 12px rgba(0, 0, 0, 0.4)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [],
      effects: [
        {
          id: 'curtain-left-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['curtain-left'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: -100, prog: 1, unit: '%' },
            ],
          },
        },
        {
          id: 'curtain-left-scale',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['curtain-left'],
            ranges: [
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: perspectiveScale, prog: 0.5 },
              { key: 'scaleX', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Right Curtain
    {
      id: 'curtain-right',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-y-0 right-0 w-1/2',
          style: {
            zIndex: 10,
            background: rightCurtainGradient,
            boxShadow: 'inset 8px 0 12px rgba(0, 0, 0, 0.4)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [],
      effects: [
        {
          id: 'curtain-right-slide',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['curtain-right'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: 100, prog: 1, unit: '%' },
            ],
          },
        },
        {
          id: 'curtain-right-scale',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['curtain-right'],
            ranges: [
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: perspectiveScale, prog: 0.5 },
              { key: 'scaleX', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Center Shadow (where curtains meet)
    {
      id: 'curtain-center-shadow',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-y-0 left-1/2 w-4',
          style: {
            zIndex: 11,
            transform: 'translateX(-50%)',
            background: `linear-gradient(to right, rgba(0, 0, 0, ${shadowIntensity}) 0%, rgba(0, 0, 0, ${shadowIntensity * 0.5}) 50%, rgba(0, 0, 0, ${shadowIntensity}) 100%)`,
            filter: `blur(${shadowBlur}px)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [],
      effects: [
        {
          id: 'center-shadow-fade',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration * 0.5,
            mode: 'provider',
            targetIds: ['curtain-center-shadow'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'curtain-wipe-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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
  id: 'curtain-wipe-transition',
  title: 'Curtain Wipe Transition',
  description:
    'Theatrical curtain wipe transition with two fabric-textured divs that split from center and slide outward to reveal content beneath. Features gradient backgrounds simulating fabric folds, subtle shadows where curtains meet, and weight-based easing with perspective effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'curtain',
    'wipe',
    'theatrical',
    'stage',
    'reveal',
    'fabric',
    'gradient',
  ],
  defaultInputParams: {
    imageLayer1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    imageLayer2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    },
    transitionDuration: 3,
    curtainColor: '#8B4513',
    curtainAccentColor: '#A0522D',
    curtainShadowColor: '#6B3410',
    shadowIntensity: 0.6,
    shadowBlur: 4,
    perspectiveScale: 0.95,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const curtainWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
