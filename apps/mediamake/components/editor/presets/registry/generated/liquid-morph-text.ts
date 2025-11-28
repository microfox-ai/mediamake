/**
 * Liquid Morph Text Effect Preset
 *
 * This preset creates a text effect that appears as if emerging from liquid on the downbeat.
 * The text starts heavily distorted with wave-like transforms and quickly settles into readable form.
 * Includes ripple effects emanating from the center and reflective highlights shimmering across the text surface.
 *
 * Features:
 * - **Liquid Distortion**: Wave-like transforms with blur, scale, and skew animations
 * - **Ripple Effects**: Concentric rings expanding from center with decreasing opacity
 * - **Shimmer Highlights**: Linear gradient overlay sweeping across text surface
 * - **Fluid Dynamics**: Simulates RealFlow/X-Particles style liquid formation
 * - **Color Shift**: Subtle hue-rotate animation during formation
 * - **Custom Timing**: All animations synchronized to create liquid emergence effect
 *
 * Use cases:
 * - High-end motion graphics intros
 * - Luxury brand titles
 * - Music video text effects
 * - Fluid dynamics demonstrations
 * - Premium product reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().default('LIQUID').describe('Text to display with liquid morph effect'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  textColor: z.string().default('#ffffff').describe('Text color (CSS color value)'),
  fontFamily: z.string().default('Inter').describe('Font family name'),
  fontWeight: z.string().default('500').describe('Font weight (e.g., "400", "500", "700")'),
  duration: z.number().default(1).describe('Total duration of the effect in seconds'),
  distortionDuration: z.number().default(0.3).describe('Duration of liquid distortion phase in seconds'),
  shimmerDuration: z.number().default(0.4).describe('Duration of shimmer highlight sweep in seconds'),
  rippleCount: z.number().default(3).describe('Number of ripple rings to display'),
  rippleDuration: z.number().default(0.8).describe('Duration of each ripple expansion in seconds'),
  rippleStagger: z.number().default(0.15).describe('Time delay between each ripple in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    textColor,
    fontFamily,
    fontWeight,
    duration,
    distortionDuration,
    shimmerDuration,
    rippleCount,
    rippleDuration,
    rippleStagger,
  } = params;

  const containerId = 'liquid-morph-container';
  const textLayerId = 'text-layer';
  const textId = 'liquid-text';
  const rippleLayerId = 'ripple-layer';
  const shimmerLayerId = 'shimmer-layer';
  const shimmerOverlayId = 'shimmer-overlay';

  // Calculate shimmer timing: starts after initial distortion
  const shimmerStart = distortionDuration * 0.8;

  // Create ripple effects with staggered timing
  const createRippleEffect = (index: number) => {
    const rippleId = `ripple-${index}`;
    const startTime = index * rippleStagger;
    const opacity = 0.2 - index * 0.05;

    return {
      id: rippleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100px; height: 100px; border-radius: 50%; border: 2px solid currentColor;"></div>`,
        className: 'absolute',
        style: {
          color: textColor,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `ripple-expand-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: startTime,
            duration: rippleDuration,
            mode: 'provider',
            targetIds: [rippleId],
            ranges: [
              { key: 'scale', val: 0.1, prog: 0 },
              { key: 'scale', val: 3, prog: 1 },
              { key: 'opacity', val: opacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  const rippleChildren: RenderableComponentData[] = Array.from(
    { length: rippleCount },
    (_, i) => createRippleEffect(i),
  );

  // Ripple layer container
  const rippleLayer: RenderableComponentData = {
    id: rippleLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: rippleChildren,
  };

  // Text layer with distortion effects
  const textLayer: RenderableComponentData = {
    id: textLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: textId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: text,
          style: {
            fontSize: fontSize,
            fontWeight: fontWeight,
            color: textColor,
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight, '400', '600'],
            subsets: ['latin'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: 'liquid-distortion-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: distortionDuration,
              mode: 'provider',
              targetIds: [textId],
              ranges: [
                // Scale: 1.4 -> 1
                { key: 'scale', val: 1.4, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                // SkewX: -15deg -> 0
                { key: 'skewX', val: -15, prog: 0 },
                { key: 'skewX', val: 0, prog: 1 },
                // Opacity: 0.3 -> 1
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                // Blur: 20px -> 0px (using filter)
                { key: 'filter', val: 'blur(20px) hue-rotate(-10deg)', prog: 0 },
                { key: 'filter', val: 'blur(0px) hue-rotate(0deg)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Shimmer layer with gradient sweep
  const shimmerLayer: RenderableComponentData = {
    id: shimmerLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-20',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: shimmerOverlayId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 200%; height: 200%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);"></div>`,
          className: 'absolute',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: 'shimmer-sweep-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: shimmerStart,
              duration: shimmerDuration,
              mode: 'provider',
              targetIds: [shimmerOverlayId],
              ranges: [
                { key: 'translateX', val: '-100%', prog: 0 },
                { key: 'translateX', val: '200%', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-visible',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [rippleLayer, textLayer, shimmerLayer],
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
  id: 'liquid-morph-text',
  title: 'Liquid Morph Text Effect',
  description:
    'Text emerges from liquid with distortion settling, ripple waves emanating from center, and reflective shimmer highlights. Simulates fluid dynamics using blur, scale, skew transforms with radial ripple animations and gradient shimmer sweep.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'liquid',
    'morph',
    'distortion',
    'ripple',
    'shimmer',
    'fluid-dynamics',
    'motion-graphics',
    'high-end',
    'luxury',
  ],
  defaultInputParams: {
    text: 'LIQUID',
    fontSize: 72,
    textColor: '#ffffff',
    fontFamily: 'Inter',
    fontWeight: '500',
    duration: 1,
    distortionDuration: 0.3,
    shimmerDuration: 0.4,
    rippleCount: 3,
    rippleDuration: 0.8,
    rippleStagger: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidMorphTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
