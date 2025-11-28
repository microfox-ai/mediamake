/**
 * Horizontal Sliding Wipe Transition Preset
 *
 * Creates a broadcast-quality horizontal wipe transition using a colored div that slides
 * from left to right. The wipe element starts off-screen left, slides across to cover
 * the first image, then continues sliding off-screen right to reveal the second image.
 *
 * Features:
 * - Two-layer composite structure (bottom image, top image, wipe element)
 * - Smooth ease-in-out timing for professional feel
 * - Optional edge blur/glow effect on leading edge
 * - Optional diagonal skew transform for dynamic wipe
 * - Configurable wipe color
 * - Proper timing inheritance with fitDurationTo: 'self'
 *
 * Use cases:
 * - Classic video editing-style wipes between images
 * - Broadcast-quality transitions
 * - Cinematic reveals with colored dividers
 * - Professional presentation transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  bottomImage: z
    .object({
      src: z.string().describe('Source URL of the bottom/second image'),
    })
    .describe('Bottom image that gets revealed'),
  topImage: z
    .object({
      src: z.string().describe('Source URL of the top/first image'),
    })
    .describe('Top image that gets covered by wipe'),
  wipeColor: z
    .string()
    .default('#000000')
    .describe('Color of the wipe element (CSS color value)'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Duration of the wipe transition in seconds'),
  edgeBlur: z
    .boolean()
    .default(true)
    .describe('Enable subtle box-shadow blur on wipe leading edge'),
  enableSkew: z
    .boolean()
    .default(false)
    .describe('Enable slight skew transform for diagonal wipe effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { bottomImage, topImage, wipeColor, duration, edgeBlur, enableSkew } =
    params;

  // Bottom image (z-index: 0) - revealed underneath
  const bottomImageNode: RenderableComponentData = {
    id: 'horizontal-wipe-bottom-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: bottomImage.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'self',
      },
    },
  };

  // Top image (z-index: 10) - gets covered by wipe
  const topImageNode: RenderableComponentData = {
    id: 'horizontal-wipe-top-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: topImage.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'self',
      },
    },
  };

  // Wipe div (z-index: 20) - slides from left to right
  const wipeDivNode: RenderableComponentData = {
    id: 'horizontal-wipe-div',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-y-0 w-full',
        style: {
          zIndex: 20,
          backgroundColor: wipeColor,
          boxShadow: edgeBlur
            ? '0 0 20px 10px rgba(0,0,0,0.3)'
            : 'none',
          transform: enableSkew ? 'skewX(-2deg)' : 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'self',
      },
    },
    effects: [
      {
        id: 'horizontal-wipe-slide-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['horizontal-wipe-div'],
          ranges: [
            { key: 'translateX', val: -100, prog: 0, unit: '%' },
            { key: 'translateX', val: 100, prog: 1, unit: '%' },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Root container holding all three layers
  const rootContainer: RenderableComponentData = {
    id: 'horizontal-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [bottomImageNode, topImageNode, wipeDivNode],
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
  id: 'horizontal-sliding-wipe-transition',
  title: 'Horizontal Sliding Wipe Transition',
  description:
    'A broadcast-quality horizontal wipe transition that uses a colored div sliding from left to right to reveal the next image. Features smooth ease-in-out timing, optional edge blur/glow effects, and professional feathering for a polished transition boundary. Perfect for creating cinematic reveals and classic video editing-style wipes.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wipe', 'horizontal', 'slide', 'reveal', 'cinematic'],
  defaultInputParams: {
    bottomImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    topImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    },
    wipeColor: '#000000',
    duration: 2,
    edgeBlur: true,
    enableSkew: false,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const horizontalSlidingWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
