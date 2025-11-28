/**
 * Marquee Crossfade Billboard Preset
 *
 * A dynamic marquee crossfade effect with multiple text lines scrolling horizontally
 * in opposite directions at varying speeds. Features LED ticker-style aesthetics with
 * glow effects, screen blend mode for light overlap intensity, and seamless infinite
 * scroll animation.
 *
 * Features:
 * - Multiple text lines scrolling in opposite directions (left-to-right and right-to-left)
 * - Varying speeds create visual depth (faster = closer, slower = farther)
 * - LED ticker aesthetics with glow effects and text stroke
 * - Screen blend mode for light overlap intensity boost at intersections
 * - Seamless infinite loop animation
 * - Customizable text content, colors, speeds, and glow intensity
 * - Light trail effects behind moving text
 *
 * Use cases:
 * - Promotional content and announcements
 * - Billboard-style displays
 * - Attention-grabbing social media content
 * - Event promotions and ticker displays
 * - Dynamic background effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters with Zod schema
const presetParams = z.object({
  line1Text: z
    .string()
    .default('BREAKING NEWS • LATEST UPDATES • TRENDING NOW •')
    .describe('Text content for line 1 (top line)'),
  line2Text: z
    .string()
    .default('SPECIAL OFFERS • LIMITED TIME ONLY • SHOP NOW •')
    .describe('Text content for line 2'),
  line3Text: z
    .string()
    .default('NEW RELEASES • COMING SOON • STAY TUNED •')
    .describe('Text content for line 3 (center line)'),
  line4Text: z
    .string()
    .default('EXCLUSIVE DEALS • MEMBER PERKS • JOIN TODAY •')
    .describe('Text content for line 4'),
  line5Text: z
    .string()
    .default('LIVE EVENTS • HAPPENING NOW • DONT MISS OUT •')
    .describe('Text content for line 5 (bottom line)'),

  line1Color: z
    .string()
    .default('#FF6B6B')
    .describe('Color for line 1 text'),
  line2Color: z
    .string()
    .default('#4ECDC4')
    .describe('Color for line 2 text'),
  line3Color: z
    .string()
    .default('#FFE66D')
    .describe('Color for line 3 text'),
  line4Color: z
    .string()
    .default('#95E1D3')
    .describe('Color for line 4 text'),
  line5Color: z
    .string()
    .default('#F38181')
    .describe('Color for line 5 text'),

  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(80)
    .describe('Base font size for all text lines'),

  speed1: z
    .number()
    .min(5)
    .max(30)
    .default(8)
    .describe('Animation duration in seconds for line 1 (lower = faster)'),
  speed2: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Animation duration in seconds for line 2'),
  speed3: z
    .number()
    .min(5)
    .max(30)
    .default(12)
    .describe('Animation duration in seconds for line 3'),
  speed4: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Animation duration in seconds for line 4'),
  speed5: z
    .number()
    .min(5)
    .max(30)
    .default(18)
    .describe('Animation duration in seconds for line 5'),

  glowIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Glow effect intensity multiplier (0 = no glow, 3 = intense)'),

  totalDuration: z
    .number()
    .min(5)
    .max(300)
    .default(30)
    .describe('Total preset duration in seconds'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:900")'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: any = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Configuration for each line
  const lineConfigs = [
    {
      id: 'marquee-line-1',
      text: params.line1Text,
      color: params.line1Color,
      speed: params.speed1,
      yPosition: '10%',
      direction: 'right', // Scroll left-to-right
    },
    {
      id: 'marquee-line-2',
      text: params.line2Text,
      color: params.line2Color,
      speed: params.speed2,
      yPosition: '30%',
      direction: 'left', // Scroll right-to-left
    },
    {
      id: 'marquee-line-3',
      text: params.line3Text,
      color: params.line3Color,
      speed: params.speed3,
      yPosition: '50%',
      direction: 'right', // Scroll left-to-right
    },
    {
      id: 'marquee-line-4',
      text: params.line4Text,
      color: params.line4Color,
      speed: params.speed4,
      yPosition: '70%',
      direction: 'left', // Scroll right-to-left
    },
    {
      id: 'marquee-line-5',
      text: params.line5Text,
      color: params.line5Color,
      speed: params.speed5,
      yPosition: '90%',
      direction: 'right', // Scroll left-to-right
    },
  ];

  // Create text atoms and effects for each line
  const lineComponents: RenderableComponentData[] = lineConfigs.map(
    (config) => {
      const lineId = config.id;
      const textId = `${lineId}-text`;

      // Calculate glow intensity
      const baseGlow = 10;
      const mediumGlow = 20;
      const strongGlow = 30;
      const glowMultiplier = params.glowIntensity;

      // Create scroll animation effect
      // Direction: right = scroll from left (-100%) to right (100%)
      // Direction: left = scroll from right (100%) to left (-100%)
      const startX = config.direction === 'right' ? -100 : 100;
      const endX = config.direction === 'right' ? 100 : -100;

      // Calculate number of loops within totalDuration
      const numLoops = Math.ceil(params.totalDuration / config.speed);

      // Create keyframes for seamless looping
      const scrollRanges: any[] = [];
      const fadeRanges: any[] = [];

      for (let i = 0; i < numLoops; i++) {
        const loopStart = (i * config.speed) / params.totalDuration;
        const loopEnd = ((i + 1) * config.speed) / params.totalDuration;

        // Scroll animation for this loop
        scrollRanges.push(
          { key: 'translateX', val: startX, prog: loopStart },
          { key: 'translateX', val: endX, prog: Math.min(loopEnd, 1) },
        );

        // Fade in/out cycle for this loop
        const fadeInEnd = loopStart + 0.1 * (loopEnd - loopStart);
        const fadeOutStart = loopStart + 0.9 * (loopEnd - loopStart);

        fadeRanges.push(
          { key: 'opacity', val: 0.6, prog: loopStart },
          { key: 'opacity', val: 1, prog: fadeInEnd },
          { key: 'opacity', val: 1, prog: fadeOutStart },
          { key: 'opacity', val: 0.6, prog: Math.min(loopEnd, 1) },
        );
      }

      const scrollEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: params.totalDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: scrollRanges,
      };

      const fadeEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: params.totalDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: fadeRanges,
      };

      // Text atom with LED ticker styling
      const textAtom: RenderableComponentData = {
        id: textId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: config.text,
          style: {
            fontSize: params.fontSize,
            color: config.color,
            fontWeight: fontStyle.fontWeight || 700,
            textTransform: 'uppercase' as any,
            letterSpacing: '0.1em',
            textShadow: `0 0 ${baseGlow * glowMultiplier}px currentColor, 0 0 ${mediumGlow * glowMultiplier}px currentColor, 0 0 ${strongGlow * glowMultiplier}px currentColor`,
            WebkitTextStroke: `1px rgba(255, 255, 255, ${0.2 * glowMultiplier})`,
            whiteSpace: 'nowrap' as any,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.totalDuration,
          },
        },
        effects: [
          {
            id: `${lineId}-scroll-effect`,
            componentId: 'generic',
            data: scrollEffect,
          },
          {
            id: `${lineId}-fade-effect`,
            componentId: 'generic',
            data: fadeEffect,
          },
        ],
      };

      // Container for this line with positioning
      const lineContainer: RenderableComponentData = {
        id: lineId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute w-full flex items-center justify-center overflow-hidden',
            style: {
              top: config.yPosition,
              transform: 'translateY(-50%)',
              mixBlendMode: 'screen' as any,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.totalDuration,
          },
        },
        childrenData: [textAtom],
      };

      return lineContainer;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'marquee-crossfade-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: lineComponents,
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
  id: 'marquee-crossfade-billboard',
  title: 'Marquee Crossfade Billboard',
  description:
    'A dynamic marquee crossfade effect with multiple text lines scrolling horizontally in opposite directions at varying speeds. Features LED ticker-style aesthetics with glow effects, screen blend mode for light overlap intensity, and seamless infinite scroll animation. Faster scrolling lines appear closer while slower lines recede, creating visual depth. Perfect for promotional content, attention-grabbing announcements, and billboard-style displays.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'marquee',
    'crossfade',
    'billboard',
    'ticker',
    'scrolling',
    'LED',
    'glow',
    'promotional',
    'text',
    'infinite-scroll',
  ],
  dependencies: {},
  defaultInputParams: {
    line1Text: 'BREAKING NEWS • LATEST UPDATES • TRENDING NOW •',
    line2Text: 'SPECIAL OFFERS • LIMITED TIME ONLY • SHOP NOW •',
    line3Text: 'NEW RELEASES • COMING SOON • STAY TUNED •',
    line4Text: 'EXCLUSIVE DEALS • MEMBER PERKS • JOIN TODAY •',
    line5Text: 'LIVE EVENTS • HAPPENING NOW • DONT MISS OUT •',
    line1Color: '#FF6B6B',
    line2Color: '#4ECDC4',
    line3Color: '#FFE66D',
    line4Color: '#95E1D3',
    line5Color: '#F38181',
    fontSize: 80,
    speed1: 8,
    speed2: 10,
    speed3: 12,
    speed4: 15,
    speed5: 18,
    glowIntensity: 1,
    totalDuration: 30,
    font: 'Inter:700',
  },
};

// Export preset
export const marqueeCrossfadeBillboardPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
