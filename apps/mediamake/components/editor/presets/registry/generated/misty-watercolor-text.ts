/**
 * Misty Watercolor Text Effect Preset
 *
 * Creates a dreamlike text effect where words emerge from and disappear into soft fog,
 * with watercolor pigments that seem to condense from the mist. Features ethereal, ghostly
 * text with semi-transparent watercolor washes, gentle swirling motion, and pulsing color
 * halos. Includes subtle light rays that occasionally pierce through the text.
 *
 * Features:
 * - Multiple fog layers with different opacities and blend modes
 * - Text with ghostly opacity transitions (0→0.6→0.3 cycle)
 * - Gentle swirling motion (combined rotation and translation)
 * - Pulsing color halos around text
 * - Rotating light rays that pierce through the text
 * - Backdrop blur effects for misty glass appearance
 * - Continuous, dreamlike transformations
 *
 * Use cases:
 * - Creating ethereal, otherworldly text effects
 * - Building atmospheric title sequences
 * - Adding dreamlike overlays to videos
 * - Creating mystical or fantasy-themed text
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('Mystic Text')
    .describe('Text content to display with misty watercolor effect'),
  font: z
    .string()
    .default('Cinzel')
    .describe(
      'Font family (e.g., "Cinzel", "Cinzel:700", "PlayfairDisplay:400:italic")',
    ),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size in pixels for the main text'),
  textColor: z
    .string()
    .default('rgba(255, 255, 255, 0.9)')
    .describe('Text color (supports hex, rgba, or named colors)'),
  backgroundColor: z
    .string()
    .default('#1a1a2e')
    .describe('Background color for the scene'),
  fogIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe('Intensity of fog layers (0.1 = subtle, 1 = dense)'),
  swirlingSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Speed multiplier for swirling motion (0.5 = slow, 2 = fast)'),
  glowIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.8)
    .describe('Intensity of the pulsing glow effect (0.1 = subtle, 2 = strong)'),
  lightRayOpacity: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .describe('Opacity of light rays (0.05 = very subtle, 0.5 = prominent)'),
  duration: z
    .number()
    .default(10)
    .describe('Duration of the effect in seconds'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    font,
    fontSize,
    textColor,
    backgroundColor,
    fogIntensity,
    swirlingSpeed,
    glowIntensity,
    lightRayOpacity,
    duration,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontFamily = font.includes(':') ? font.split(':')[0] : font;
  const fontStyle: Record<string, any> = {};
  if (font.includes(':')) {
    const fontParts = font.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2];
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate fog layer opacities based on intensity
  const fog1Opacity = 0.15 * fogIntensity;
  const fog2Opacity = 0.12 * fogIntensity;
  const fog3Opacity = 0.1 * fogIntensity;

  // Calculate effect durations based on speed multiplier
  const ghostlyOpacityDuration = 4 / swirlingSpeed;
  const swirlMotionDuration = 7 / swirlingSpeed;
  const haloPulseDuration = 5 / swirlingSpeed;
  const fog1Duration = 15 / swirlingSpeed;
  const fog2Duration = 20 / swirlingSpeed;
  const fog3Duration = 18 / swirlingSpeed;

  // Calculate glow colors based on text color
  const getGlowColors = () => {
    // Default glow colors (soft blue/purple)
    return {
      primary: `rgba(180, 200, 255, ${0.4 * glowIntensity})`,
      secondary: `rgba(200, 180, 255, ${0.3 * glowIntensity})`,
    };
  };

  const glowColors = getGlowColors();

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'misty-watercolor-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor,
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
      // Fog Layer 1
      {
        id: 'fog-layer-1',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at 20% 30%, rgba(180, 200, 255, ${fog1Opacity}) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(200, 180, 255, ${fog2Opacity}) 0%, transparent 50%);"></div>`,
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            backdropFilter: 'blur(8px)',
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
            id: 'fog-1-drift',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: fog1Duration,
              mode: 'provider',
              targetIds: ['fog-layer-1'],
              ranges: [
                { key: 'translateX', val: -30, prog: 0 },
                { key: 'translateX', val: 30, prog: 1 },
                { key: 'translateY', val: -20, prog: 0 },
                { key: 'translateY', val: 20, prog: 1 },
              ],
            },
          },
        ],
      },
      // Fog Layer 2
      {
        id: 'fog-layer-2',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at 50% 50%, rgba(255, 220, 200, ${fog2Opacity * 0.67}) 0%, transparent 60%);"></div>`,
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'lighten',
            opacity: 0.6,
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
            id: 'fog-2-drift',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: fog2Duration,
              mode: 'provider',
              targetIds: ['fog-layer-2'],
              ranges: [
                { key: 'translateX', val: 40, prog: 0 },
                { key: 'translateX', val: -40, prog: 1 },
                { key: 'translateY', val: 15, prog: 0 },
                { key: 'translateY', val: -15, prog: 1 },
              ],
            },
          },
        ],
      },
      // Fog Layer 3
      {
        id: 'fog-layer-3',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at 70% 40%, rgba(220, 180, 255, ${fog3Opacity}) 0%, transparent 55%), radial-gradient(ellipse at 30% 80%, rgba(180, 220, 255, ${fog3Opacity}) 0%, transparent 55%);"></div>`,
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            opacity: 0.5,
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
            id: 'fog-3-drift',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: fog3Duration,
              mode: 'provider',
              targetIds: ['fog-layer-3'],
              ranges: [
                { key: 'translateX', val: -25, prog: 0 },
                { key: 'translateX', val: 25, prog: 1 },
                { key: 'translateY', val: 25, prog: 0 },
                { key: 'translateY', val: -25, prog: 1 },
              ],
            },
          },
        ],
      },
      // Light Rays Container
      {
        id: 'light-rays-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex justify-center items-center',
            style: {
              mixBlendMode: 'screen',
              opacity: lightRayOpacity,
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
          // Light Ray 1
          {
            id: 'light-ray-1',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div style="width: 300%; height: 300%; background: linear-gradient(90deg, transparent 48%, rgba(255, 255, 255, 0.3) 50%, transparent 52%);"></div>',
              className: 'absolute',
              style: {
                transformOrigin: 'center center',
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
                id: 'light-ray-1-rotation',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: 20 / swirlingSpeed,
                  mode: 'provider',
                  targetIds: ['light-ray-1'],
                  ranges: [
                    { key: 'rotate', val: 0, prog: 0 },
                    { key: 'rotate', val: 360, prog: 1 },
                  ],
                },
              },
            ],
          },
          // Light Ray 2
          {
            id: 'light-ray-2',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div style="width: 300%; height: 300%; background: linear-gradient(45deg, transparent 48%, rgba(255, 255, 255, 0.2) 50%, transparent 52%);"></div>',
              className: 'absolute',
              style: {
                transformOrigin: 'center center',
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
                id: 'light-ray-2-rotation',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 2 / swirlingSpeed,
                  duration: 20 / swirlingSpeed,
                  mode: 'provider',
                  targetIds: ['light-ray-2'],
                  ranges: [
                    { key: 'rotate', val: 0, prog: 0 },
                    { key: 'rotate', val: 360, prog: 1 },
                  ],
                },
              },
            ],
          },
        ],
      },
      // Text Container
      {
        id: 'text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex justify-center items-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: [
          // Main Text
          {
            id: 'main-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text,
              className: 'text-center',
              style: {
                fontSize,
                color: textColor,
                textShadow: `0 0 30px ${glowColors.primary}, 0 0 60px ${glowColors.secondary}`,
                backdropFilter: 'blur(2px)',
                letterSpacing: '0.05em',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['400', '700'],
                subsets: ['latin'],
                display: 'swap',
              },
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
            effects: [
              // Ghostly opacity cycle
              {
                id: 'text-ghostly-opacity',
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: 0,
                  duration: ghostlyOpacityDuration,
                  mode: 'provider',
                  targetIds: ['main-text'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 0.6, prog: 0.5 },
                    { key: 'opacity', val: 0.3, prog: 1 },
                  ],
                },
              },
              // Swirl motion (rotation + translation)
              {
                id: 'text-swirl-motion',
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: 0,
                  duration: swirlMotionDuration,
                  mode: 'provider',
                  targetIds: ['main-text'],
                  ranges: [
                    { key: 'rotate', val: 0, prog: 0 },
                    { key: 'rotate', val: 5, prog: 0.5 },
                    { key: 'rotate', val: 0, prog: 1 },
                    { key: 'translateX', val: -20, prog: 0 },
                    { key: 'translateX', val: 20, prog: 0.5 },
                    { key: 'translateX', val: -20, prog: 1 },
                  ],
                },
              },
              // Halo pulse (using filter drop-shadow)
              {
                id: 'text-halo-pulse',
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: 0,
                  duration: haloPulseDuration,
                  mode: 'provider',
                  targetIds: ['main-text'],
                  ranges: [
                    {
                      key: 'filter',
                      val: `drop-shadow(0 0 40px ${glowColors.primary})`,
                      prog: 0,
                    },
                    {
                      key: 'filter',
                      val: `drop-shadow(0 0 80px ${glowColors.secondary})`,
                      prog: 0.5,
                    },
                    {
                      key: 'filter',
                      val: `drop-shadow(0 0 40px ${glowColors.primary})`,
                      prog: 1,
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
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
  id: 'misty-watercolor-text',
  title: 'Misty Watercolor Text Effect',
  description:
    'A dreamlike text effect where words emerge from and disappear into soft fog with semi-transparent watercolor washes. Features ethereal ghostly letters, gentle swirling motion, pulsing color halos, and subtle light rays creating an otherworldly atmosphere with continuous smooth transformations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'misty',
    'watercolor',
    'ethereal',
    'ghostly',
    'fog',
    'swirl',
    'halo',
    'light-rays',
    'dreamlike',
    'otherworldly',
    'atmospheric',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Mystic Text',
    font: 'Cinzel',
    fontSize: 72,
    textColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: '#1a1a2e',
    fogIntensity: 0.5,
    swirlingSpeed: 1,
    glowIntensity: 0.8,
    lightRayOpacity: 0.15,
    duration: 10,
  },
};

// Export preset
export const mistyWatercolorTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
