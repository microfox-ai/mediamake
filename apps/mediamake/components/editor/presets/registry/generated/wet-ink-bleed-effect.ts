/**
 * Wet Ink Bleed Effect Preset
 *
 * This preset creates an organic ink bleed effect where text appears to be written
 * with too much ink that spreads and settles on wet paper. It simulates the visual
 * dynamics of ink droplets hitting wet paper in slow motion.
 *
 * Features:
 * - **Initial Impact**: Text starts at 150% scale with heavy blur (10px)
 * - **Rapid Spread**: Quick scale-down and blur reduction animation
 * - **Gradual Settling**: Smooth transition from multiply blend mode to normal
 * - **Splatter Particles**: Random circular particles appear and fade during impact
 * - **Organic Motion**: Liquid-like animation using ease-out and ease-in-out curves
 * - **Configurable Intensity**: Control splatter count, spread duration, and impact
 *
 * Use cases:
 * - Creating dramatic text reveals with organic feel
 * - Adding artistic ink effects to typography
 * - Building high-speed camera aesthetic animations
 * - Creating liquid-inspired visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text content to display with ink bleed effect'),
  duration: z
    .number()
    .default(2)
    .describe('Total duration of the effect in seconds (minimum 1s)'),
  fontSize: z
    .number()
    .default(64)
    .describe('Font size in pixels (default: 64px)'),
  textColor: z
    .string()
    .default('#1a1a1a')
    .describe('Text color (dark color recommended for ink effect)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:700", "Inter")',
    ),
  splatterCount: z
    .number()
    .min(5)
    .max(12)
    .default(7)
    .describe('Number of splatter particles per effect (5-12)'),
  spreadDuration: z
    .number()
    .min(0.4)
    .max(1.5)
    .default(0.8)
    .describe('Duration of the spread/settling animation in seconds (0.4-1.5s)'),
  impact: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Impact multiplier for effect intensity (0.5-2)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter';
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

  // Calculate timing parameters
  const totalDuration = Math.max(params.duration, 1);
  const spreadDuration = params.spreadDuration;
  const impact = params.impact;

  // Scale animation (600ms base, affected by spreadDuration and impact)
  const scaleDuration = Math.min(0.6 * (spreadDuration / 0.8) * impact, totalDuration * 0.8);

  // Blur animation (800ms base, longer than scale)
  const blurDuration = Math.min(0.8 * (spreadDuration / 0.8) * impact, totalDuration * 0.9);

  // Opacity/blend fade (400ms base)
  const opacityDuration = Math.min(0.4 * impact, totalDuration * 0.6);

  // Splatter particle timing
  const splatterDuration = 0.35 * impact; // 300-500ms range based on impact
  const maxSplatterDelay = 0.2 * impact; // Random delays 0-200ms

  // Generate random splatter particles
  const generateSplatterParticles = (count: number): any[] => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      // Random positioning around text center with spread
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 50; // 30-80px from center
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      // Random size variation
      const size = 2 + Math.random() * 4; // 2-6px

      // Random delay for staggered appearance
      const delay = Math.random() * maxSplatterDelay;

      const particleId = `splatter-particle-${i}`;

      const particleEffect: GenericEffectData = {
        type: 'ease-out',
        start: delay,
        duration: splatterDuration,
        mode: 'provider',
        targetIds: [particleId],
        ranges: [
          // Scale: 0 -> 1 -> 0 (appear and disappear)
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1, prog: 0.3 },
          { key: 'scale', val: 0, prog: 1 },
          // Opacity: 1 -> 0 (fade out)
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      particles.push({
        id: particleId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background-color: currentColor;"></div>`,
          className: 'absolute',
          style: {
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            color: params.textColor,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `splatter-effect-${i}`,
            componentId: 'generic',
            data: particleEffect,
          },
        ],
      });
    }
    return particles;
  };

  const splatterParticles = generateSplatterParticles(params.splatterCount);

  // Text container ID
  const textContainerId = 'ink-text-container';
  const textId = 'ink-text';

  // Main text effects
  const scaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: scaleDuration,
    mode: 'provider',
    targetIds: [textContainerId],
    ranges: [
      { key: 'scale', val: 1.5, prog: 0 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  const blurEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: blurDuration,
    mode: 'provider',
    targetIds: [textContainerId],
    ranges: [
      { key: 'filter', val: 'blur(10px)', prog: 0 },
      { key: 'filter', val: 'blur(0px)', prog: 1 },
    ],
  };

  const opacityEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: opacityDuration,
    mode: 'provider',
    targetIds: [textContainerId],
    ranges: [
      { key: 'opacity', val: 0.6, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'wet-ink-bleed-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Text container (receives scale, blur, opacity effects)
      {
        id: textContainerId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: 'ink-scale-effect',
            componentId: 'generic',
            data: scaleEffect,
          },
          {
            id: 'ink-blur-effect',
            componentId: 'generic',
            data: blurEffect,
          },
          {
            id: 'ink-opacity-effect',
            componentId: 'generic',
            data: opacityEffect,
          },
        ],
        childrenData: [
          // Main text atom
          {
            id: textId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: params.text,
              className: 'font-bold',
              style: {
                fontSize: `${params.fontSize}px`,
                color: params.textColor,
                mixBlendMode: 'multiply', // Initial dark blend
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight
                  ? { weights: [fontStyle.fontWeight.toString()] }
                  : {}),
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          },
          // Splatter particles container
          {
            id: 'splatter-container',
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            childrenData: splatterParticles as RenderableComponentData[],
          },
        ] as RenderableComponentData[],
      },
    ] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'wet-ink-bleed-effect',
  title: 'Wet Ink Bleed Effect',
  description:
    'Organic ink bleed effect where text appears to be written with too much ink that spreads and settles on wet paper. Features scale animation from 150% to 100%, blur reduction from 10px to 0, opacity fade-in, and color shift from darker (multiply blend) to normal. Includes random splatter particles around text that appear and fade during initial impact phase, creating a liquid, high-speed camera footage aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'ink',
    'bleed',
    'organic',
    'liquid',
    'artistic',
    'typography',
    'animation',
    'splatter',
    'impact',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'INK BLEED',
    duration: 2,
    fontSize: 64,
    textColor: '#1a1a1a',
    font: 'Inter:700',
    splatterCount: 7,
    spreadDuration: 0.8,
    impact: 1,
  },
};

export const wetInkBleedEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
