/**
 * Glitch Outline Effect Preset
 *
 * Creates a digital corruption effect with multiple offset outlines, RGB channel separation,
 * and flickering between different positions and colors. Features scanline effects using
 * linear gradients and controlled chaos with random displacement values.
 *
 * Features:
 * - Multiple offset outlines with random displacement
 * - RGB channel separation (chromatic aberration)
 * - Flickering glitch positions with sharp transitions
 * - Scanline effects using CSS gradients
 * - Controlled random chaos within defined parameters
 * - CSS filters (hue-rotate, contrast, brightness)
 * - Transform-based glitches (translateX/Y)
 *
 * Use cases:
 * - Tech/cyberpunk aesthetics
 * - Digital corruption effects
 * - Music video glitch visuals
 * - Error/malfunction simulations
 * - Edgy modern title sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Intensity multiplier for glitch displacement (0.1-5)'),
  colorShift: z
    .boolean()
    .default(true)
    .describe('Enable RGB channel separation and hue rotation'),
  scanlines: z
    .boolean()
    .default(true)
    .describe('Enable scanline gradient overlay'),
  duration: z
    .number()
    .min(0.5)
    .max(30)
    .default(2)
    .describe('Duration of the glitch effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { glitchIntensity, colorShift, scanlines, duration } = params;

  // Helper function to generate random glitch positions with sharp transitions
  const generateGlitchPositions = (
    baseValue: number,
    intensity: number,
    steps: number = 10,
  ): Array<{ val: number; prog: number }> => {
    const positions: Array<{ val: number; prog: number }> = [];
    
    for (let i = 0; i < steps; i++) {
      const prog = i / (steps - 1);
      // Random displacement within intensity bounds
      const randomOffset = (Math.random() - 0.5) * 2 * intensity * baseValue;
      positions.push({
        val: baseValue + randomOffset,
        prog: prog,
      });
    }
    
    return positions;
  };

  // Generate random outline offset positions
  const outlineOffsets = generateGlitchPositions(10, glitchIntensity, 8);

  // Generate random transform positions for X and Y
  const translateXPositions = generateGlitchPositions(5, glitchIntensity, 12);
  const translateYPositions = generateGlitchPositions(3, glitchIntensity, 12);

  // RGB channel separation effects (chromatic aberration)
  const rgbEffects: RenderableComponentData[] = [];

  if (colorShift) {
    // Red channel - offset right
    rgbEffects.push({
      id: 'glitch-rgb-red',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            opacity: 0.8,
          },
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
          id: 'rgb-red-shift',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['glitch-rgb-red'],
            ranges: [
              { key: 'translateX', val: 2 * glitchIntensity, prog: 0 },
              { key: 'translateX', val: -1 * glitchIntensity, prog: 0.2 },
              { key: 'translateX', val: 3 * glitchIntensity, prog: 0.4 },
              { key: 'translateX', val: 1 * glitchIntensity, prog: 0.6 },
              { key: 'translateX', val: -2 * glitchIntensity, prog: 0.8 },
              { key: 'translateX', val: 2 * glitchIntensity, prog: 1 },
              { key: 'filter', val: 'brightness(1) contrast(1.2) hue-rotate(0deg)', prog: 0 },
              { key: 'filter', val: 'brightness(1.2) contrast(1.5) hue-rotate(5deg)', prog: 0.5 },
              { key: 'filter', val: 'brightness(1) contrast(1.2) hue-rotate(0deg)', prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
      childrenData: [],
    } as RenderableComponentData);

    // Green channel - slight vertical offset
    rgbEffects.push({
      id: 'glitch-rgb-green',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            opacity: 0.7,
          },
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
          id: 'rgb-green-shift',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['glitch-rgb-green'],
            ranges: [
              { key: 'translateY', val: -1 * glitchIntensity, prog: 0 },
              { key: 'translateY', val: 2 * glitchIntensity, prog: 0.25 },
              { key: 'translateY', val: -2 * glitchIntensity, prog: 0.5 },
              { key: 'translateY', val: 1 * glitchIntensity, prog: 0.75 },
              { key: 'translateY', val: -1 * glitchIntensity, prog: 1 },
              { key: 'filter', val: 'brightness(1.1) contrast(1.3) hue-rotate(-5deg)', prog: 0 },
              { key: 'filter', val: 'brightness(0.9) contrast(1.1) hue-rotate(3deg)', prog: 0.5 },
              { key: 'filter', val: 'brightness(1.1) contrast(1.3) hue-rotate(-5deg)', prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
      childrenData: [],
    } as RenderableComponentData);

    // Blue channel - offset left
    rgbEffects.push({
      id: 'glitch-rgb-blue',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            opacity: 0.75,
          },
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
          id: 'rgb-blue-shift',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['glitch-rgb-blue'],
            ranges: [
              { key: 'translateX', val: -2 * glitchIntensity, prog: 0 },
              { key: 'translateX', val: 1 * glitchIntensity, prog: 0.15 },
              { key: 'translateX', val: -3 * glitchIntensity, prog: 0.35 },
              { key: 'translateX', val: -1 * glitchIntensity, prog: 0.65 },
              { key: 'translateX', val: 2 * glitchIntensity, prog: 0.85 },
              { key: 'translateX', val: -2 * glitchIntensity, prog: 1 },
              { key: 'filter', val: 'brightness(0.95) contrast(1.4) hue-rotate(10deg)', prog: 0 },
              { key: 'filter', val: 'brightness(1.15) contrast(1.2) hue-rotate(-8deg)', prog: 0.5 },
              { key: 'filter', val: 'brightness(0.95) contrast(1.4) hue-rotate(10deg)', prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  }

  // Scanline overlay effect
  const scanlineOverlay: RenderableComponentData | null = scanlines
    ? ({
        id: 'glitch-scanlines',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="w-full h-full"></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.15) 0px,
              rgba(0, 0, 0, 0.15) 2px,
              transparent 2px,
              transparent 4px
            )`,
            mixBlendMode: 'multiply',
            opacity: 0.6,
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
            id: 'scanline-flicker',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: ['glitch-scanlines'],
              ranges: [
                { key: 'opacity', val: 0.6, prog: 0 },
                { key: 'opacity', val: 0.3, prog: 0.1 },
                { key: 'opacity', val: 0.7, prog: 0.2 },
                { key: 'opacity', val: 0.4, prog: 0.3 },
                { key: 'opacity', val: 0.6, prog: 0.5 },
                { key: 'opacity', val: 0.2, prog: 0.7 },
                { key: 'opacity', val: 0.6, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData)
    : null;

  // Main glitch container with outline effects
  const glitchContainer: RenderableComponentData = {
    id: 'glitch-target-wrapper',
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
        duration: duration,
      },
    },
    effects: [
      // Main transform glitch
      {
        id: 'glitch-transform',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['glitch-target-wrapper'],
          ranges: [
            ...translateXPositions.map((pos) => ({
              key: 'translateX' as const,
              val: pos.val,
              prog: pos.prog,
            })),
            ...translateYPositions.map((pos) => ({
              key: 'translateY' as const,
              val: pos.val,
              prog: pos.prog,
            })),
          ],
        } as GenericEffectData,
      },
      // Outline offset glitch
      {
        id: 'glitch-outline',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['glitch-target-wrapper'],
          ranges: outlineOffsets.map((offset) => ({
            key: 'outlineOffset' as const,
            val: `${offset.val}px`,
            prog: offset.prog,
          })),
        } as GenericEffectData,
      },
      // Filter effects (hue-rotate, contrast)
      ...(colorShift
        ? [
            {
              id: 'glitch-color-shift',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: duration,
                mode: 'provider',
                targetIds: ['glitch-target-wrapper'],
                ranges: [
                  { key: 'filter', val: 'hue-rotate(0deg) contrast(1)', prog: 0 },
                  { key: 'filter', val: 'hue-rotate(180deg) contrast(1.5)', prog: 0.1 },
                  { key: 'filter', val: 'hue-rotate(-90deg) contrast(1.2)', prog: 0.25 },
                  { key: 'filter', val: 'hue-rotate(90deg) contrast(1.3)', prog: 0.4 },
                  { key: 'filter', val: 'hue-rotate(0deg) contrast(1)', prog: 0.5 },
                  { key: 'filter', val: 'hue-rotate(270deg) contrast(1.4)', prog: 0.65 },
                  { key: 'filter', val: 'hue-rotate(-180deg) contrast(1.1)', prog: 0.8 },
                  { key: 'filter', val: 'hue-rotate(0deg) contrast(1)', prog: 1 },
                ],
              } as GenericEffectData,
            },
          ]
        : []),
    ],
    childrenData: [],
  };

  // Assemble all effects
  const allChildren: RenderableComponentData[] = [
    glitchContainer,
    ...rgbEffects,
  ];

  if (scanlineOverlay) {
    allChildren.push(scanlineOverlay);
  }

  const rootContainer: RenderableComponentData = {
    id: 'glitch-outline-root',
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
        duration: duration,
      },
    },
    childrenData: allChildren,
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
  id: 'glitch-outline-effect',
  title: 'Glitch Outline Effect',
  description:
    'A digital corruption effect that creates multiple offset outlines with RGB channel separation, flickering between different positions and colors. Features controlled chaos with random displacement values, scanline effects using gradients, and CSS filters/transforms for a glitch aesthetic.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'glitch',
    'outline',
    'rgb-split',
    'chromatic-aberration',
    'digital',
    'corruption',
    'scanline',
    'cyberpunk',
    'tech',
  ],
  defaultInputParams: {
    glitchIntensity: 1,
    colorShift: true,
    scanlines: true,
    duration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchOutlineEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
