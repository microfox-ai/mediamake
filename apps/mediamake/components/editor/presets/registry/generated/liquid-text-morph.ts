/**
 * Liquid Text Morph Effect Preset
 *
 * Creates a dynamic liquid text morph effect where text appears to melt and reform.
 * Features viscous liquid-like deformations responding to bass-like vibrations.
 * Letters stretch, wobble, and deform with organic fluid motion.
 *
 * Features:
 * - Multiple text layers with wobble, scale, skew, and drip animations
 * - Organic fluid motion using ease-in-out timing
 * - Base blur effect for liquid appearance
 * - Drip effects where text stretches and snaps back
 * - Screen blend modes for layered liquid effect
 * - Continuous looping animations for perpetual motion
 *
 * Use cases:
 * - Music videos with bass-heavy drops
 * - Energetic title sequences
 * - Abstract typography animations
 * - Liquid-themed branding content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMS SCHEMA ---

const presetParams = z.object({
  text: z
    .string()
    .default('LIQUID')
    .describe('Text content to display with liquid effect'),
  fontSize: z
    .string()
    .default('text-8xl')
    .describe(
      'Tailwind font size class (e.g., text-8xl, text-7xl, text-9xl)',
    ),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., Inter, Roboto, Montserrat)'),
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (e.g., 100, 400, 700, 900)'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Primary text color (hex or rgba)'),
  textStroke: z
    .string()
    .default('2px rgba(0,0,0,0.3)')
    .describe('Text stroke style (e.g., 2px rgba(0,0,0,0.3))'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the effect in seconds'),
  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Maximum blur intensity for liquid effect (0-10)'),
  wobbleSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Speed multiplier for wobble animations (0.5-3)'),
  dripSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.2)
    .describe('Speed multiplier for drip animations (0.5-2)'),
  dripIntensity: z
    .number()
    .min(10)
    .max(60)
    .default(30)
    .describe('Maximum drip distance in pixels (10-60)'),
});

// --- EXECUTION ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    textStroke,
    duration,
    blurIntensity,
    wobbleSpeed,
    dripSpeed,
    dripIntensity,
  } = params;

  // Helper: Create text data with font config
  const createTextData = (opacity: string, blendMode?: string) => ({
    text,
    className: `font-black ${fontSize}`,
    style: {
      color: textColor,
      WebkitTextStroke: textStroke,
      ...(opacity !== '1' && { opacity: parseFloat(opacity) }),
      ...(blendMode && { mixBlendMode: blendMode }),
    },
    font: {
      family: fontFamily,
      weights: [fontWeight],
    },
  });

  // Base text layer with blur effect
  const baseTextLayer: RenderableComponentData = {
    id: 'base-text-blur',
    type: 'atom',
    componentId: 'TextAtom',
    data: createTextData('1'),
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'base-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 2 / wobbleSpeed,
          mode: 'provider',
          targetIds: ['base-text-blur'],
          loop: true,
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: blurIntensity, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Wobble layer 1: scaleX/scaleY oscillation
  const wobbleLayer1: RenderableComponentData = {
    id: 'wobble-text-layer-1',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      ...createTextData('0.7', 'screen'),
      className: `font-black ${fontSize} absolute`,
      style: {
        ...createTextData('0.7', 'screen').style,
        WebkitTextStroke: '2px rgba(0,0,0,0.2)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'wobble-scale-x-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 1.5 / wobbleSpeed,
          mode: 'provider',
          targetIds: ['wobble-text-layer-1'],
          loop: true,
          ranges: [
            { key: 'scaleX', val: 0.95, prog: 0 },
            { key: 'scaleX', val: 1.05, prog: 0.5 },
            { key: 'scaleX', val: 0.95, prog: 1 },
          ],
        },
      },
      {
        id: 'wobble-scale-y-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 1.5 / wobbleSpeed,
          mode: 'provider',
          targetIds: ['wobble-text-layer-1'],
          loop: true,
          ranges: [
            { key: 'scaleY', val: 1.05, prog: 0 },
            { key: 'scaleY', val: 0.95, prog: 0.5 },
            { key: 'scaleY', val: 1.05, prog: 1 },
          ],
        },
      },
    ],
  };

  // Wobble layer 2: skew and blur oscillation
  const wobbleLayer2: RenderableComponentData = {
    id: 'wobble-text-layer-2',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      ...createTextData('0.5', 'screen'),
      className: `font-black ${fontSize} absolute`,
      style: {
        ...createTextData('0.5', 'screen').style,
        WebkitTextStroke: '2px rgba(0,0,0,0.15)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'wobble-skew-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 2 / wobbleSpeed,
          mode: 'provider',
          targetIds: ['wobble-text-layer-2'],
          loop: true,
          ranges: [
            { key: 'skewX', val: -3, prog: 0 },
            { key: 'skewX', val: 3, prog: 0.5 },
            { key: 'skewX', val: -3, prog: 1 },
          ],
        },
      },
      {
        id: 'wobble-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 2 / wobbleSpeed,
          mode: 'provider',
          targetIds: ['wobble-text-layer-2'],
          loop: true,
          ranges: [
            { key: 'blur', val: 1, prog: 0 },
            { key: 'blur', val: 4, prog: 0.5 },
            { key: 'blur', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Drip layer 1: translateY, opacity, scaleY
  const dripLayer1: RenderableComponentData = {
    id: 'drip-text-layer-1',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      ...createTextData('0.3', 'screen'),
      className: `font-black ${fontSize} absolute`,
      style: {
        ...createTextData('0.3', 'screen').style,
        WebkitTextStroke: '2px rgba(0,0,0,0.1)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'drip-translate-effect-1',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: 1.2 / dripSpeed,
          mode: 'provider',
          targetIds: ['drip-text-layer-1'],
          loop: true,
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: dripIntensity, prog: 0.7 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'drip-opacity-effect-1',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 1.2 / dripSpeed,
          mode: 'provider',
          targetIds: ['drip-text-layer-1'],
          loop: true,
          ranges: [
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 0.9 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
      {
        id: 'drip-scale-y-effect-1',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 1.2 / dripSpeed,
          mode: 'provider',
          targetIds: ['drip-text-layer-1'],
          loop: true,
          ranges: [
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 1.15, prog: 0.6 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Drip layer 2: deeper drip with blur (staggered start)
  const dripLayer2: RenderableComponentData = {
    id: 'drip-text-layer-2',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      ...createTextData('0.2', 'screen'),
      className: `font-black ${fontSize} absolute`,
      style: {
        ...createTextData('0.2', 'screen').style,
        WebkitTextStroke: '2px rgba(0,0,0,0.08)',
      },
    },
    context: {
      timing: {
        start: 0.4,
        duration: duration - 0.4,
      },
    },
    effects: [
      {
        id: 'drip-translate-effect-2',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: 1.5 / dripSpeed,
          mode: 'provider',
          targetIds: ['drip-text-layer-2'],
          loop: true,
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: dripIntensity * 1.5, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'drip-opacity-effect-2',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 1.5 / dripSpeed,
          mode: 'provider',
          targetIds: ['drip-text-layer-2'],
          loop: true,
          ranges: [
            { key: 'opacity', val: 0.2, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 0.85 },
            { key: 'opacity', val: 0.2, prog: 1 },
          ],
        },
      },
      {
        id: 'drip-blur-effect-2',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 1.5 / dripSpeed,
          mode: 'provider',
          targetIds: ['drip-text-layer-2'],
          loop: true,
          ranges: [
            { key: 'blur', val: 2, prog: 0 },
            { key: 'blur', val: 6, prog: 0.7 },
            { key: 'blur', val: 2, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      baseTextLayer,
      wobbleLayer1,
      wobbleLayer2,
      dripLayer1,
      dripLayer2,
    ] as RenderableComponentData[],
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

// --- METADATA ---

const presetMetadata: PresetMetadata = {
  id: 'liquid-text-morph',
  title: 'Liquid Text Morph Effect',
  description:
    'Dynamic liquid text effect with wobble, scale, and drip animations. Creates organic fluid text that appears to reshape with bass-like intensity using multiple overlapping text layers with blur, transform, and opacity effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'liquid',
    'morph',
    'wobble',
    'drip',
    'bass',
    'fluid',
    'organic',
    'animated',
    'kinetic',
    'title',
    'effect',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID',
    fontSize: 'text-8xl',
    fontFamily: 'Inter',
    fontWeight: '900',
    textColor: '#ffffff',
    textStroke: '2px rgba(0,0,0,0.3)',
    duration: 10,
    blurIntensity: 3,
    wobbleSpeed: 1.5,
    dripSpeed: 1.2,
    dripIntensity: 30,
  },
};

// --- EXPORT ---

export const liquidTextMorphPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
