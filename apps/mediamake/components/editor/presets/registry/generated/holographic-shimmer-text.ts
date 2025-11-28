/**
 * Holographic Shimmer Text Effect Preset
 *
 * This preset creates a cutting-edge holographic text effect featuring an iridescent,
 * color-shifting sheen that mimics holographic foil. The text appears to have a rainbow-like
 * shimmer that shifts based on an imaginary viewing angle.
 *
 * Features:
 * - **Metallic Base Text**: Text with gradient background (white to gray) clipped to text
 * - **Multi-Layer Gradients**: Three stacked gradient layers with different blend modes
 * - **Seamless Background Animation**: 400% wide gradients that loop continuously
 * - **Hue Rotation**: Full 360deg hue shift over 5 seconds for color variation
 * - **Breathing Effect**: Subtle scale oscillation (0.995 to 1.005) for organic motion
 * - **Blend Mode Stacking**: overlay, screen, and color-dodge at different opacities
 *
 * Use cases:
 * - Modern, attention-grabbing titles
 * - Futuristic tech presentations
 * - Dynamic brand reveals
 * - Music video titles
 * - Gaming stream overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define preset parameters
const presetParams = z.object({
  text: z
    .string()
    .describe('The text content to display with holographic shimmer effect'),
  fontSize: z
    .union([z.number(), z.string()])
    .default(96)
    .describe('Font size in pixels or CSS string (e.g., "96px", 96)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family for the text (e.g., "Inter", "Roboto", "Montserrat")',
    ),
  fontWeight: z
    .union([z.number(), z.string()])
    .default('bold')
    .describe('Font weight (e.g., "bold", 700, "800")'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Duration of the effect in seconds'),
  shimmerSpeed: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe(
      'Speed of the shimmer animation in seconds (lower = faster, 3 = default)',
    ),
  hueRotationSpeed: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Speed of hue rotation in seconds (5 = default)'),
  breathingSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Speed of breathing scale effect in seconds (2 = default)'),
  intensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Overall intensity multiplier for opacity values (1 = default)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font size
  const fontSize =
    typeof params.fontSize === 'number'
      ? `${params.fontSize}px`
      : params.fontSize;

  // Calculate opacity values based on intensity
  const overlayOpacity = 0.3 * params.intensity;
  const screenOpacity = 0.2 * params.intensity;
  const colorDodgeOpacity = 0.4 * params.intensity;

  // Define gradient colors
  const gradientColors = {
    purple: '#c084fc', // purple-400
    pink: '#f472b6', // pink-400
    cyan: '#22d3ee', // cyan-400
  };

  // Create root container with text and overlay gradients
  const rootContainer: RenderableComponentData = {
    id: 'holographic-shimmer-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: 'holographic-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          // Hue rotation effect (5 seconds loop)
          {
            id: 'hue-rotate-effect',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: params.hueRotationSpeed,
              mode: 'provider',
              targetIds: ['holographic-text-container'],
              ranges: [
                { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
                { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
              ],
            },
          },
          // Breathing scale effect (2 seconds loop)
          {
            id: 'breathing-scale-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: params.breathingSpeed,
              mode: 'provider',
              targetIds: ['holographic-text-container'],
              ranges: [
                { key: 'scale', val: 0.995, prog: 0 },
                { key: 'scale', val: 1.005, prog: 0.5 },
                { key: 'scale', val: 0.995, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          // Base text with metallic gradient
          {
            id: 'holographic-text-base',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: params.text,
              gradient: 'linear-gradient(to right, #ffffff, #e5e5e5)',
              style: {
                fontSize,
                fontWeight: params.fontWeight,
                letterSpacing: '0.02em',
              },
              font: {
                family: params.fontFamily,
                weights: ['700', '800'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
          },
          // Gradient layer 1: overlay blend mode
          {
            id: 'gradient-layer-1',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  background: `linear-gradient(to right, ${gradientColors.purple}, ${gradientColors.pink}, ${gradientColors.cyan}, ${gradientColors.purple})`,
                  backgroundSize: '400% 100%',
                  mixBlendMode: 'overlay',
                  opacity: overlayOpacity,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
            effects: [
              {
                id: 'shimmer-effect-layer-1',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: params.shimmerSpeed,
                  mode: 'provider',
                  targetIds: ['gradient-layer-1'],
                  ranges: [
                    {
                      key: 'backgroundPosition',
                      val: '0% 0%',
                      prog: 0,
                    },
                    {
                      key: 'backgroundPosition',
                      val: '100% 0%',
                      prog: 1,
                    },
                  ],
                },
              },
            ],
          },
          // Gradient layer 2: screen blend mode
          {
            id: 'gradient-layer-2',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  background: `linear-gradient(to right, ${gradientColors.cyan}, ${gradientColors.purple}, ${gradientColors.pink}, ${gradientColors.cyan})`,
                  backgroundSize: '400% 100%',
                  mixBlendMode: 'screen',
                  opacity: screenOpacity,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
            effects: [
              {
                id: 'shimmer-effect-layer-2',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: params.shimmerSpeed,
                  mode: 'provider',
                  targetIds: ['gradient-layer-2'],
                  ranges: [
                    {
                      key: 'backgroundPosition',
                      val: '0% 0%',
                      prog: 0,
                    },
                    {
                      key: 'backgroundPosition',
                      val: '100% 0%',
                      prog: 1,
                    },
                  ],
                },
              },
            ],
          },
          // Gradient layer 3: color-dodge blend mode
          {
            id: 'gradient-layer-3',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  background: `linear-gradient(to right, ${gradientColors.pink}, ${gradientColors.cyan}, ${gradientColors.purple}, ${gradientColors.pink})`,
                  backgroundSize: '400% 100%',
                  mixBlendMode: 'color-dodge',
                  opacity: colorDodgeOpacity,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
            effects: [
              {
                id: 'shimmer-effect-layer-3',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: params.shimmerSpeed,
                  mode: 'provider',
                  targetIds: ['gradient-layer-3'],
                  ranges: [
                    {
                      key: 'backgroundPosition',
                      val: '0% 0%',
                      prog: 0,
                    },
                    {
                      key: 'backgroundPosition',
                      val: '100% 0%',
                      prog: 1,
                    },
                  ],
                },
              },
            ],
          },
        ] as RenderableComponentData[],
      },
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'holographic-shimmer-text',
  title: 'Holographic Shimmer Text Effect',
  description:
    'A cutting-edge holographic text effect featuring an iridescent, color-shifting sheen that creates the appearance of holographic foil. Multiple gradient overlay layers with different blend modes (overlay, screen, color-dodge) create a mesmerizing rainbow shimmer that shifts smoothly and continuously. Includes subtle breathing scale animation for added dynamism. Perfect for modern, attention-grabbing titles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'holographic',
    'shimmer',
    'gradient',
    'iridescent',
    'color-shift',
    'modern',
    'futuristic',
    'rainbow',
    'title',
    'effect',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HOLOGRAPHIC',
    fontSize: 96,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    duration: 10,
    shimmerSpeed: 3,
    hueRotationSpeed: 5,
    breathingSpeed: 2,
    intensity: 1,
  },
};

// Export preset
export const holographicShimmerTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
