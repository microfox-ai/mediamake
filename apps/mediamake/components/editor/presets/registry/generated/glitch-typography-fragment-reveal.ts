/**
 * Glitch Kinetic Typography Fragment Reveal Preset
 *
 * A corrupted video frame style kinetic typography preset featuring words that digitally fragment
 * and slide apart in a staggered, stuttery motion. The middle word materializes through TV static
 * effects with RGB channel splitting and chromatic aberration.
 *
 * Features:
 * - **Digital Fragmentation**: Words slide apart in stepped motion using discrete position jumps
 * - **Stuttery Animation**: Irregular timing and micro-movements simulate corrupted footage
 * - **RGB Split Effect**: Middle word emerges through chromatic aberration (red/blue channel splitting)
 * - **Static Noise Overlay**: TV static effect using CSS noise texture and scan lines
 * - **Glitch Aesthetics**: Position jumps, opacity flickers, and digital artifacts
 * - **Progressive Reveal**: Middle word gradually resolves from static to clear text
 *
 * Technical approach:
 * - Uses steps() easing via discrete keyframe effects with short durations
 * - Multiple sequential effects create stuttery motion instead of smooth interpolation
 * - RGB layers (red/blue TextAtoms) animate separately then fade out
 * - Main word uses opacity-based reveal with Y-axis jitter for static simulation
 * - Scan line and noise texture overlays for authenticity
 *
 * Use cases:
 * - Tech/cyberpunk video intros
 * - Glitch art typography reveals
 * - Digital corruption aesthetic content
 * - Music videos with edgy visuals
 * - Social media content with modern glitch effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  leftWord: z
    .string()
    .default('DIGITAL')
    .describe('Left word that slides away (fragments to the left)'),
  middleWord: z
    .string()
    .default('GLITCH')
    .describe('Middle word that materializes through static noise'),
  rightWord: z
    .string()
    .default('REALITY')
    .describe('Right word that slides away (fragments to the right)'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size for sliding words (px)'),
  middleFontSize: z
    .number()
    .min(32)
    .max(300)
    .default(96)
    .describe('Font size for middle word (px)'),
  font: z
    .string()
    .optional()
    .default('Inter:900')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:700", "Inter:900")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color for all words (hex or CSS color)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex or CSS color)'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the animation (seconds)'),
  intensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Animation intensity multiplier (affects speed and distance)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate timing based on intensity
  const baseUnit = 0.1 * params.intensity;
  const leftWordEffects = createLeftWordEffects(baseUnit);
  const rightWordEffects = createRightWordEffects(baseUnit);
  const middleWordStart = 0.3;

  // Helper function to create left word stuttery slide effects
  function createLeftWordEffects(baseUnit: number) {
    return [
      // Step 1: Initial jump left
      {
        id: 'left-slide-step1',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: 0.15 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['left-word-group'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -20 * params.intensity, prog: 1 },
          ],
        },
      },
      // Step 2: Small correction
      {
        id: 'left-slide-step2',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.15 * baseUnit * 10,
          duration: 0.1 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['left-word-group'],
          ranges: [
            { key: 'translateX', val: -20 * params.intensity, prog: 0 },
            { key: 'translateX', val: -15 * params.intensity, prog: 1 },
          ],
        },
      },
      // Step 3: Large jump left
      {
        id: 'left-slide-step3',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.25 * baseUnit * 10,
          duration: 0.15 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['left-word-group'],
          ranges: [
            { key: 'translateX', val: -15 * params.intensity, prog: 0 },
            { key: 'translateX', val: -60 * params.intensity, prog: 1 },
          ],
        },
      },
      // Step 4: Micro correction
      {
        id: 'left-slide-step4',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.4 * baseUnit * 10,
          duration: 0.1 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['left-word-group'],
          ranges: [
            { key: 'translateX', val: -60 * params.intensity, prog: 0 },
            { key: 'translateX', val: -55 * params.intensity, prog: 1 },
          ],
        },
      },
      // Step 5: Final slide off
      {
        id: 'left-slide-final',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.5 * baseUnit * 10,
          duration: 0.2 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['left-word-group'],
          ranges: [
            { key: 'translateX', val: -55 * params.intensity, prog: 0 },
            { key: 'translateX', val: -150 * params.intensity, prog: 1 },
          ],
        },
      },
      // Flicker 1
      {
        id: 'left-flicker1',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.1 * baseUnit * 10,
          duration: 0.05 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['left-word-group'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Flicker 2
      {
        id: 'left-flicker2',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.35 * baseUnit * 10,
          duration: 0.05 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['left-word-group'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.4, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ];
  }

  // Helper function to create right word stuttery slide effects
  function createRightWordEffects(baseUnit: number) {
    return [
      // Step 1: Initial jump right (offset timing)
      {
        id: 'right-slide-step1',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.05 * baseUnit * 10,
          duration: 0.12 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['right-word-group'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 25 * params.intensity, prog: 1 },
          ],
        },
      },
      // Step 2: Small correction
      {
        id: 'right-slide-step2',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.17 * baseUnit * 10,
          duration: 0.08 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['right-word-group'],
          ranges: [
            { key: 'translateX', val: 25 * params.intensity, prog: 0 },
            { key: 'translateX', val: 18 * params.intensity, prog: 1 },
          ],
        },
      },
      // Step 3: Large jump right
      {
        id: 'right-slide-step3',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.25 * baseUnit * 10,
          duration: 0.18 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['right-word-group'],
          ranges: [
            { key: 'translateX', val: 18 * params.intensity, prog: 0 },
            { key: 'translateX', val: 70 * params.intensity, prog: 1 },
          ],
        },
      },
      // Step 4: Micro correction
      {
        id: 'right-slide-step4',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.43 * baseUnit * 10,
          duration: 0.12 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['right-word-group'],
          ranges: [
            { key: 'translateX', val: 70 * params.intensity, prog: 0 },
            { key: 'translateX', val: 65 * params.intensity, prog: 1 },
          ],
        },
      },
      // Step 5: Final slide off
      {
        id: 'right-slide-final',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.55 * baseUnit * 10,
          duration: 0.2 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['right-word-group'],
          ranges: [
            { key: 'translateX', val: 65 * params.intensity, prog: 0 },
            { key: 'translateX', val: 150 * params.intensity, prog: 1 },
          ],
        },
      },
      // Flicker 1
      {
        id: 'right-flicker1',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.2 * baseUnit * 10,
          duration: 0.05 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['right-word-group'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.35, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Flicker 2
      {
        id: 'right-flicker2',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0.45 * baseUnit * 10,
          duration: 0.05 * baseUnit * 10,
          mode: 'provider' as const,
          targetIds: ['right-word-group'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.25, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ];
  }

  // ============================================================================
  // BUILD COMPONENT TREE
  // ============================================================================

  // Root container (black background with overflow hidden)
  const rootContainer: RenderableComponentData = {
    id: 'glitch-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      // Scanline overlay
      {
        id: 'scanline-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none z-50',
            style: {
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
              mixBlendMode: 'overlay',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,

      // Noise texture overlay
      {
        id: 'noise-texture-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none z-40',
            style: {
              background:
                "url(data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E)",
              opacity: 0.08,
              mixBlendMode: 'overlay',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,

      // Sliding words container
      {
        id: 'sliding-words-container',
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
          // Left word group
          {
            id: 'left-word-group',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute',
                style: {
                  left: '15%',
                  willChange: 'transform, opacity',
                },
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
                id: 'left-word-text',
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: params.leftWord,
                  style: {
                    fontSize: `${params.fontSize}px`,
                    fontWeight: 700,
                    color: params.textColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    ...fontStyle,
                  },
                  font: {
                    family: fontFamily,
                    weights: fontStyle.fontWeight
                      ? [fontStyle.fontWeight.toString()]
                      : ['700'],
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: params.duration,
                  },
                },
                effects: leftWordEffects,
              },
            ],
          } as RenderableComponentData,

          // Right word group
          {
            id: 'right-word-group',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute',
                style: {
                  right: '15%',
                  willChange: 'transform, opacity',
                },
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
                id: 'right-word-text',
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: params.rightWord,
                  style: {
                    fontSize: `${params.fontSize}px`,
                    fontWeight: 700,
                    color: params.textColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    ...fontStyle,
                  },
                  font: {
                    family: fontFamily,
                    weights: fontStyle.fontWeight
                      ? [fontStyle.fontWeight.toString()]
                      : ['700'],
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: params.duration,
                  },
                },
                effects: rightWordEffects,
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,

      // Middle word container (starts at middleWordStart)
      {
        id: 'middle-word-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: middleWordStart,
            duration: params.duration - middleWordStart,
          },
        },
        childrenData: [
          // Red channel (RGB split)
          {
            id: 'middle-word-red',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: params.middleWord,
              style: {
                fontSize: `${params.middleFontSize}px`,
                fontWeight: 900,
                color: 'rgba(255, 0, 0, 0.7)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                position: 'absolute',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['900'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration - middleWordStart,
              },
            },
            effects: [
              // Red channel shift
              {
                id: 'red-channel-shift',
                componentId: 'generic',
                data: {
                  type: 'ease-out' as const,
                  start: 0,
                  duration: 0.8 * params.intensity,
                  mode: 'provider' as const,
                  targetIds: ['middle-word-red'],
                  ranges: [
                    { key: 'translateX', val: -8 * params.intensity, prog: 0 },
                    {
                      key: 'translateX',
                      val: -2 * params.intensity,
                      prog: 0.7,
                    },
                    { key: 'translateX', val: 0, prog: 1 },
                  ],
                },
              },
              // Red opacity reveal
              {
                id: 'red-opacity-reveal',
                componentId: 'generic',
                data: {
                  type: 'ease-out' as const,
                  start: 0,
                  duration: 0.6 * params.intensity,
                  mode: 'provider' as const,
                  targetIds: ['middle-word-red'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 0.7, prog: 0.3 },
                    { key: 'opacity', val: 0.7, prog: 0.8 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          },

          // Blue channel (RGB split)
          {
            id: 'middle-word-blue',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: params.middleWord,
              style: {
                fontSize: `${params.middleFontSize}px`,
                fontWeight: 900,
                color: 'rgba(0, 100, 255, 0.7)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                position: 'absolute',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['900'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration - middleWordStart,
              },
            },
            effects: [
              // Blue channel shift
              {
                id: 'blue-channel-shift',
                componentId: 'generic',
                data: {
                  type: 'ease-out' as const,
                  start: 0,
                  duration: 0.8 * params.intensity,
                  mode: 'provider' as const,
                  targetIds: ['middle-word-blue'],
                  ranges: [
                    { key: 'translateX', val: 8 * params.intensity, prog: 0 },
                    { key: 'translateX', val: 2 * params.intensity, prog: 0.7 },
                    { key: 'translateX', val: 0, prog: 1 },
                  ],
                },
              },
              // Blue opacity reveal
              {
                id: 'blue-opacity-reveal',
                componentId: 'generic',
                data: {
                  type: 'ease-out' as const,
                  start: 0,
                  duration: 0.6 * params.intensity,
                  mode: 'provider' as const,
                  targetIds: ['middle-word-blue'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 0.7, prog: 0.3 },
                    { key: 'opacity', val: 0.7, prog: 0.8 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          },

          // Main middle word (white, reveals gradually)
          {
            id: 'middle-word-main',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: params.middleWord,
              style: {
                fontSize: `${params.middleFontSize}px`,
                fontWeight: 900,
                color: params.textColor,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                position: 'absolute',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['900'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration - middleWordStart,
              },
            },
            effects: [
              // Static reveal (gradual opacity increase)
              {
                id: 'main-static-reveal',
                componentId: 'generic',
                data: {
                  type: 'ease-out' as const,
                  start: 0,
                  duration: 0.8 * params.intensity,
                  mode: 'provider' as const,
                  targetIds: ['middle-word-main'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 0.2, prog: 0.2 },
                    { key: 'opacity', val: 0.5, prog: 0.4 },
                    { key: 'opacity', val: 0.7, prog: 0.6 },
                    { key: 'opacity', val: 0.9, prog: 0.8 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ],
                },
              },
              // Y-axis jitter (simulating static)
              {
                id: 'main-y-jitter',
                componentId: 'generic',
                data: {
                  type: 'linear' as const,
                  start: 0,
                  duration: 0.5 * params.intensity,
                  mode: 'provider' as const,
                  targetIds: ['middle-word-main'],
                  ranges: [
                    { key: 'translateY', val: 0, prog: 0 },
                    { key: 'translateY', val: 3, prog: 0.15 },
                    { key: 'translateY', val: -2, prog: 0.3 },
                    { key: 'translateY', val: 2, prog: 0.5 },
                    { key: 'translateY', val: -1, prog: 0.7 },
                    { key: 'translateY', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          },
        ],
      } as RenderableComponentData,
    ],
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'glitchTypographyFragmentReveal',
  title: 'Glitch Typography Fragment Reveal',
  description:
    'A corrupted video frame style kinetic typography preset featuring words that digitally fragment and slide apart in a staggered, stuttery motion. The middle word materializes through TV static effects with RGB channel splitting and chromatic aberration. Includes scan lines, noise texture overlays, and irregular timing patterns that simulate damaged footage aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'glitch',
    'digital',
    'corruption',
    'rgb-split',
    'chromatic-aberration',
    'static',
    'noise',
    'fragment',
    'tech',
    'cyberpunk',
  ],
  dependencies: {},
  defaultInputParams: {
    leftWord: 'DIGITAL',
    middleWord: 'GLITCH',
    rightWord: 'REALITY',
    fontSize: 72,
    middleFontSize: 96,
    font: 'Inter:900',
    textColor: '#ffffff',
    backgroundColor: '#000000',
    duration: 3,
    intensity: 1,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const glitchTypographyFragmentRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
