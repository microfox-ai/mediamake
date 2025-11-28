/**
 * Prestige TV Typokinetics Preset
 * 
 * An elegant typography preset inspired by prestige television opening titles with
 * understated light leak effects. Features refined editorial typography that emerges
 * through subtle optical phenomena - like light refracting through crystal or water.
 * 
 * Key Features:
 * - Sophisticated dissolved transition for text fade-in
 * - Gossamer-thin horizontal light streaks at different speeds (parallax depth)
 * - Continuous breathing animation (scale 0.98-1.02 over 4s)
 * - Prismatic color shifts at text edges using CSS filters (chromatic separation)
 * - Premium and restrained aesthetic - suggesting rather than declaring drama
 * 
 * Technical Implementation:
 * - Editorial layout with flex centering and generous spacing
 * - Playfair Display serif typography with expanded letter spacing
 * - Multiple light streak layers with varying opacity and animation speeds (8s, 12s, 16s, 20s)
 * - Staggered fade-in timing for title (0s) and subtitle (0.5s delay)
 * - Continuous breathing effect via generic scale animation
 * - Prismatic chromatic aberration via drop-shadow filters
 * - Subtle hue-rotate animation (0deg → 10deg → 0deg over 6s)
 * 
 * Use Cases:
 * - High-end video intros
 * - Premium brand content
 * - Editorial video titles
 * - Sophisticated podcast intros
 * - Luxury product reveals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  title: z
    .string()
    .default('PRESTIGE')
    .describe('Main title text to display'),
  subtitle: z
    .string()
    .default('TELEVISION')
    .describe('Subtitle text to display below title'),
  duration: z
    .number()
    .min(3)
    .max(30)
    .default(10)
    .describe('Total duration of the preset in seconds'),
  fadeInDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of text fade-in transition in seconds'),
  subtitleDelay: z
    .number()
    .min(0)
    .max(3)
    .default(0.5)
    .describe('Delay before subtitle fades in (seconds)'),
  breathingSpeed: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .describe('Duration of one breathing cycle (scale oscillation) in seconds'),
  prismaticSpeed: z
    .number()
    .min(3)
    .max(10)
    .default(6)
    .describe('Duration of prismatic hue-rotate cycle in seconds'),
  lightStreakSpeed: z
    .enum(['slow', 'medium', 'fast'])
    .default('medium')
    .describe('Overall speed of light streak animations'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or rgba)'),
  font: z
    .string()
    .default('Playfair Display:400')
    .describe('Font family with optional weight and style (e.g., "Playfair Display:400")'),
  titleFontSize: z
    .number()
    .min(32)
    .max(120)
    .default(72)
    .describe('Title font size in pixels'),
  subtitleFontSize: z
    .number()
    .min(16)
    .max(80)
    .default(32)
    .describe('Subtitle font size in pixels'),
  letterSpacing: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Letter spacing in em units'),
  chromaticIntensity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe('Intensity of chromatic aberration effect (opacity of color shifts)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Playfair Display:400';
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

  // Calculate light streak durations based on speed preset
  const getStreakDurations = (): number[] => {
    const speedMap = {
      slow: [16, 20, 24, 28],
      medium: [8, 12, 16, 20],
      fast: [6, 8, 10, 12],
    };
    return speedMap[params.lightStreakSpeed];
  };

  const streakDurations = getStreakDurations();

  // Light streak positions (top percentage)
  const streakPositions = ['20%', '45%', '65%', '80%'];
  const streakOpacities = [0.08, 0.06, 0.1, 0.05];

  // Create light streak layers
  const lightStreakLayers: RenderableComponentData[] = streakPositions.map(
    (position, index) => {
      const streakId = `light-streak-${index + 1}`;
      const duration = streakDurations[index];

      // Create continuous translation effect
      const translationEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [streakId],
        ranges: [
          { key: 'translateX', val: '-100%', prog: 0 },
          { key: 'translateX', val: '100%', prog: (duration / params.duration) },
          { key: 'translateX', val: '-100%', prog: 1 },
        ],
      };

      return {
        id: streakId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,${streakOpacities[index]}), transparent);"></div>`,
          className: 'absolute w-full',
          style: {
            top: position,
            pointerEvents: 'none' as const,
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
            id: `streak-translation-${index + 1}`,
            componentId: 'generic',
            data: translationEffect,
          },
        ],
      } as RenderableComponentData;
    }
  );

  // Create text content effects

  // Title fade-in effect
  const titleFadeEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: params.fadeInDuration,
    mode: 'provider',
    targetIds: ['title-text'],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Subtitle fade-in effect (with delay)
  const subtitleFadeEffect: GenericEffectData = {
    type: 'ease-out',
    start: params.subtitleDelay,
    duration: params.fadeInDuration,
    mode: 'provider',
    targetIds: ['subtitle-text'],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Breathing animation (continuous scale oscillation)
  const breathingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: ['text-content-layer'],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 0.98, prog: (params.breathingSpeed / 2 / params.duration) },
      { key: 'scale', val: 1, prog: (params.breathingSpeed / params.duration) },
      { key: 'scale', val: 1.02, prog: (params.breathingSpeed * 1.5 / params.duration) },
      { key: 'scale', val: 1, prog: (params.breathingSpeed * 2 / params.duration) },
    ],
  };

  // Prismatic hue-rotate effect (subtle color shift)
  const prismaticEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: ['title-text', 'subtitle-text'],
    ranges: [
      { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
      { key: 'filter', val: 'hue-rotate(10deg)', prog: (params.prismaticSpeed / 2 / params.duration) },
      { key: 'filter', val: 'hue-rotate(0deg)', prog: (params.prismaticSpeed / params.duration) },
    ],
  };

  // Build text content
  const titleText: RenderableComponentData = {
    id: 'title-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.title,
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
      },
      style: {
        fontSize: `${params.titleFontSize}px`,
        letterSpacing: `${params.letterSpacing}em`,
        color: params.textColor,
        textAlign: 'center' as const,
        filter: `drop-shadow(-1px 0 0 rgba(255,0,0,${params.chromaticIntensity})) drop-shadow(1px 0 0 rgba(0,0,255,${params.chromaticIntensity}))`,
        ...fontStyle,
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
        id: 'title-fade-effect',
        componentId: 'generic',
        data: titleFadeEffect,
      },
    ],
  };

  const subtitleText: RenderableComponentData = {
    id: 'subtitle-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.subtitle,
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
      },
      style: {
        fontSize: `${params.subtitleFontSize}px`,
        letterSpacing: `${params.letterSpacing * 1.6}em`,
        color: `rgba(255,255,255,0.85)`,
        textAlign: 'center' as const,
        filter: `drop-shadow(-0.5px 0 0 rgba(255,0,0,${params.chromaticIntensity * 0.67})) drop-shadow(0.5px 0 0 rgba(0,0,255,${params.chromaticIntensity * 0.67}))`,
        ...fontStyle,
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
        id: 'subtitle-fade-effect',
        componentId: 'generic',
        data: subtitleFadeEffect,
      },
    ],
  };

  // Text content container
  const textContentLayer: RenderableComponentData = {
    id: 'text-content-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center gap-6 z-10 relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [titleText, subtitleText],
    effects: [
      {
        id: 'breathing-effect',
        componentId: 'generic',
        data: breathingEffect,
      },
      {
        id: 'prismatic-effect',
        componentId: 'generic',
        data: prismaticEffect,
      },
    ],
  };

  // Light streak container
  const lightStreakLayer: RenderableComponentData = {
    id: 'light-streak-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: lightStreakLayers,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'prestige-typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center gap-8 px-12 py-16 relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [lightStreakLayer, textContentLayer],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'prestige-tv-typokinetics',
  title: 'Prestige TV Typokinetics',
  description:
    'An elegant, understated typography preset inspired by prestige television opening titles. Features refined editorial typography with subtle optical phenomena - gossamer-thin light leaks that paint horizontally across the frame, breathing scale animations for organic movement, and prismatic chromatic separation at text edges. The aesthetic is premium and restrained, suggesting drama through sophistication rather than declaration.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'prestige',
    'editorial',
    'light-leak',
    'chromatic-aberration',
    'breathing-animation',
    'premium',
    'refined',
    'television',
    'opening-titles',
    'kinetic',
    'optical',
    'subtle',
  ],
  defaultInputParams: {
    title: 'PRESTIGE',
    subtitle: 'TELEVISION',
    duration: 10,
    fadeInDuration: 2,
    subtitleDelay: 0.5,
    breathingSpeed: 4,
    prismaticSpeed: 6,
    lightStreakSpeed: 'medium',
    textColor: '#ffffff',
    font: 'Playfair Display:400',
    titleFontSize: 72,
    subtitleFontSize: 32,
    letterSpacing: 0.05,
    chromaticIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const prestigeTvTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
