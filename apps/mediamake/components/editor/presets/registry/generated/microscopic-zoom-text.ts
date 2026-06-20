/**
 * Microscopic Zoom Text Preset
 *
 * Simulates looking at text through a microscope with slowly increasing magnification.
 * Features chromatic aberration (RGB channel separation) that corrects as zoom increases,
 * mimicking optical correction at higher magnification. Includes subtle vignette effect
 * that intensifies during zoom, and grain texture that becomes more visible as we zoom closer.
 *
 * Features:
 * - **Chromatic Aberration Effect**: RGB channels slightly offset (red -3px left, blue +3px right) at start,
 *   converging to 0 as zoom increases, simulating optical correction
 * - **Precise Linear Zoom**: Smooth 100% to 102.5% scale with perfect linear motion
 * - **Vignette Effect**: Subtle radial gradient that increases from 60% to 85% opacity during zoom
 * - **Grain Texture**: Fractal noise pattern that becomes more visible (3% to 8% opacity) as we zoom in
 * - **Scientific Aesthetic**: Monospace typography with contrast and saturation filters for precise, technical look
 *
 * Use cases:
 * - Scientific or educational content
 * - Technical presentation titles
 * - Analytical or research video intros
 * - Microscopy-themed content
 * - Precision engineering or manufacturing videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('MICROSCOPIC TEXT')
    .describe('Text content to display with microscopic zoom effect'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Duration of the zoom effect in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(96)
    .describe('Font size in pixels (monospace font)'),
  textColor: z
    .string()
    .default('#000000')
    .describe('Base text color (used for green channel)'),
  bgColor: z
    .string()
    .default('#f9fafb')
    .describe('Background color (light gray for scientific look)'),
  chromaticIntensity: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Initial chromatic aberration offset in pixels (converges to 0)'),
  vignetteColor: z
    .string()
    .default('rgba(0,0,0,0.3)')
    .describe('Vignette gradient color (dark overlay at edges)'),
  grainIntensity: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.03)
    .describe('Initial grain opacity (increases during zoom)'),
  grainFinalIntensity: z
    .number()
    .min(0.01)
    .max(0.3)
    .default(0.08)
    .describe('Final grain opacity at maximum zoom'),
  scientificFilter: z
    .boolean()
    .default(true)
    .describe('Apply scientific look filters (contrast, saturation)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration;
  const chromaticIntensity = params.chromaticIntensity;

  // Base effect data shared by all RGB channels
  const baseEffectConfig = {
    type: 'linear' as const,
    start: 0,
    duration: duration,
    mode: 'provider' as const,
  };

  // Zoom effect (shared by all channels) - 100% to 102.5%
  const zoomRanges = [
    { key: 'scale', val: 1.0, prog: 0 },
    { key: 'scale', val: 1.025, prog: 1 },
  ];

  // Red channel effect: offset from -3px to 0px + zoom
  const redChannelEffect: GenericEffectData = {
    ...baseEffectConfig,
    targetIds: ['chromatic-red-channel'],
    ranges: [
      { key: 'translateX', val: -chromaticIntensity, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
      ...zoomRanges,
    ],
  };

  // Green channel effect: only zoom (no offset)
  const greenChannelEffect: GenericEffectData = {
    ...baseEffectConfig,
    targetIds: ['chromatic-green-channel'],
    ranges: zoomRanges,
  };

  // Blue channel effect: offset from +3px to 0px + zoom
  const blueChannelEffect: GenericEffectData = {
    ...baseEffectConfig,
    targetIds: ['chromatic-blue-channel'],
    ranges: [
      { key: 'translateX', val: chromaticIntensity, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
      ...zoomRanges,
    ],
  };

  // Vignette effect: opacity 0.6 to 0.85
  const vignetteEffect: GenericEffectData = {
    ...baseEffectConfig,
    targetIds: ['vignette-overlay'],
    ranges: [
      { key: 'opacity', val: 0.6, prog: 0 },
      { key: 'opacity', val: 0.85, prog: 1 },
    ],
  };

  // Grain effect: opacity increases from initial to final
  const grainEffect: GenericEffectData = {
    ...baseEffectConfig,
    targetIds: ['grain-overlay'],
    ranges: [
      { key: 'opacity', val: params.grainIntensity, prog: 0 },
      { key: 'opacity', val: params.grainFinalIntensity, prog: 1 },
    ],
  };

  // Scientific filter style
  const scientificFilterStyle = params.scientificFilter
    ? 'contrast(1.1) saturate(0.9)'
    : undefined;

  // Build the component tree
  const childrenData: RenderableComponentData[] = [
    // Vignette overlay
    {
      id: 'vignette-overlay',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle, transparent 40%, ${params.vignetteColor} 100%);"></div>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'vignette-intensify-effect',
          componentId: 'generic',
          data: vignetteEffect,
        },
      ],
    },

    // Grain overlay
    {
      id: 'grain-overlay',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E');"></div>`,
        className: 'absolute inset-0 pointer-events-none mix-blend-overlay',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'grain-increase-effect',
          componentId: 'generic',
          data: grainEffect,
        },
      ],
    },

    // Red channel (left offset)
    {
      id: 'chromatic-red-channel',
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        className: 'absolute inset-0 flex items-center justify-center font-mono mix-blend-screen',
        style: {
          fontSize: `${params.fontSize}px`,
          color: '#ef4444', // red-500
          filter: scientificFilterStyle,
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
          id: 'red-channel-effect',
          componentId: 'generic',
          data: redChannelEffect,
        },
      ],
    },

    // Green channel (center, base text color)
    {
      id: 'chromatic-green-channel',
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        className: 'absolute inset-0 flex items-center justify-center font-mono mix-blend-screen',
        style: {
          fontSize: `${params.fontSize}px`,
          color: params.textColor,
          filter: scientificFilterStyle,
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
          id: 'green-channel-effect',
          componentId: 'generic',
          data: greenChannelEffect,
        },
      ],
    },

    // Blue channel (right offset)
    {
      id: 'chromatic-blue-channel',
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        className: 'absolute inset-0 flex items-center justify-center font-mono mix-blend-screen',
        style: {
          fontSize: `${params.fontSize}px`,
          color: '#3b82f6', // blue-500
          filter: scientificFilterStyle,
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
          id: 'blue-channel-effect',
          componentId: 'generic',
          data: blueChannelEffect,
        },
      ],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'microscope-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: params.bgColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: childrenData,
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'microscopicZoomText',
  title: 'Microscopic Zoom Text',
  description:
    'A scientific microscope zoom effect for text with chromatic aberration that corrects as magnification increases. Simulates looking through a microscope with RGB channel separation, subtle vignette, and grain texture. Linear zoom from 100% to 102.5% with precise, scientific motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'zoom',
    'microscope',
    'chromatic-aberration',
    'scientific',
    'technical',
    'rgb-split',
    'vignette',
    'grain',
    'linear',
    'precise',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MICROSCOPIC TEXT',
    duration: 5,
    fontSize: 96,
    textColor: '#000000',
    bgColor: '#f9fafb',
    chromaticIntensity: 3,
    vignetteColor: 'rgba(0,0,0,0.3)',
    grainIntensity: 0.03,
    grainFinalIntensity: 0.08,
    scientificFilter: true,
  },
};

export const microscopicZoomTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
