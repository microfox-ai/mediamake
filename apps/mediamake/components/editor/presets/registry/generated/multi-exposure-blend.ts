/**
 * Artistic Multi-Exposure Blend Preset
 *
 * Creates an artistic multi-exposure effect where multiple image layers blend together
 * with varying opacities and blur levels, mimicking double-exposure film photography.
 *
 * Features:
 * - **Three Depth Layers**: Back (always blurred), mid (animating blur), front (sharp)
 * - **Screen Blend Mode**: Film-like double-exposure look with light blending
 * - **Organic Timing**: Staggered start times and different durations for natural overlap
 * - **Selective Blur**: Each layer has different blur characteristics creating depth
 * - **Never Fully Opaque**: All layers remain semi-transparent for ethereal ghosting effect
 * - **Contrast Boost**: Enhanced contrast (1.2) to amplify blend mode effects
 *
 * Use cases:
 * - Creating dreamy, ethereal image compositions
 * - Mimicking experimental film photography techniques
 * - Building layered visual atmospheres with depth
 * - Artistic overlays with organic motion and ghosting
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  frontImage: z.string().describe('Source URL for the front (sharp) image layer'),
  midImage: z.string().describe('Source URL for the mid (animating blur) image layer'),
  backImage: z.string().describe('Source URL for the back (always blurred) image layer'),
  duration: z
    .number()
    .default(6)
    .describe('Total duration of the multi-exposure composition in seconds'),
  blendMode: z
    .enum(['screen', 'lighten', 'overlay', 'soft-light'])
    .default('screen')
    .describe('CSS blend mode for film double-exposure effect'),
  contrast: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .describe('Contrast enhancement to boost blend mode effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { frontImage, midImage, backImage, duration, blendMode, contrast } = params;

  // Timing strategy:
  // - Root container: 6s total
  // - Back layer: starts at 0.5s, lasts 6s (longest)
  // - Mid layer: starts at 1s, lasts 5s
  // - Front layer: starts at 0s, lasts 4s (shortest)
  // All layers have staggered starts and different durations for organic overlapping

  const rootDuration = duration;

  // Back layer: always blurred, constant opacity 0.3
  const backLayerStart = 0.5;
  const backLayerDuration = 6;

  // Mid layer: blur animates 10px → 0px → 10px, opacity 0.5 → 0.7 → 0.5
  const midLayerStart = 1;
  const midLayerDuration = 5;

  // Front layer: sharp, opacity 0.6 → 0.9 → 0.6
  const frontLayerStart = 0;
  const frontLayerDuration = 4;

  const childrenData: RenderableComponentData[] = [
    // Back layer - always blurred, low opacity
    {
      id: 'multi-exposure-back-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: blendMode,
            filter: `blur(20px) contrast(${contrast})`,
            opacity: 0.3,
          },
        },
      },
      context: {
        timing: {
          start: backLayerStart,
          duration: backLayerDuration,
        },
      },
      childrenData: [
        {
          id: 'back-image',
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: backImage,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: backLayerDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Mid layer - animating blur and opacity
    {
      id: 'multi-exposure-mid-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: blendMode,
          },
        },
      },
      context: {
        timing: {
          start: midLayerStart,
          duration: midLayerDuration,
        },
      },
      effects: [
        {
          id: 'mid-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: midLayerDuration,
            mode: 'provider',
            targetIds: ['multi-exposure-mid-layer'],
            ranges: [
              // Blur: 10px → 0px → 10px
              { key: 'filter', val: `blur(10px) contrast(${contrast})`, prog: 0 },
              { key: 'filter', val: `blur(0px) contrast(${contrast})`, prog: 0.5 },
              { key: 'filter', val: `blur(10px) contrast(${contrast})`, prog: 1 },
              // Opacity: 0.5 → 0.7 → 0.5
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0.5, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'mid-image',
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: midImage,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: midLayerDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Front layer - sharp, animating opacity
    {
      id: 'multi-exposure-front-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: blendMode,
            filter: `contrast(${contrast})`,
          },
        },
      },
      context: {
        timing: {
          start: frontLayerStart,
          duration: frontLayerDuration,
        },
      },
      effects: [
        {
          id: 'front-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: frontLayerDuration,
            mode: 'provider',
            targetIds: ['multi-exposure-front-layer'],
            ranges: [
              // Opacity: 0.6 → 0.9 → 0.6
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.5 },
              { key: 'opacity', val: 0.6, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'front-image',
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: frontImage,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: frontLayerDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'multi-exposure-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: rootDuration,
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
  id: 'multi-exposure-blend',
  title: 'Artistic Multi-Exposure Blend',
  description:
    'Creates an artistic multi-exposure effect where multiple image layers blend together with varying opacities and blur levels, mimicking double-exposure film photography. Features three depth layers (back, mid, front) with screen/lighten blend modes, selective blur, and organic overlapping timing for a dreamy, ethereal aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'effects', 'artistic', 'multi-exposure', 'blend', 'film', 'overlay'],
  defaultInputParams: {
    frontImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    midImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    backImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop',
    duration: 6,
    blendMode: 'screen',
    contrast: 1.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const multiExposureBlendPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
