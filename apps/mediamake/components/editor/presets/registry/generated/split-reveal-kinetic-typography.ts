/**
 * Split-Reveal Kinetic Typography Preset
 *
 * This preset creates a modern kinetic typography effect where text lines split and reveal
 * from the center with a breathing animation. Each line starts compressed (letterSpacing: -0.05em)
 * and expands to 0.1em while fading in from gray to full color. The effect includes subtle
 * horizontal scaling for emphasis and optional glow effects for dramatic impact.
 *
 * Features:
 * - **Split-Reveal Animation**: Text breathes into existence with expanding letter spacing
 * - **Staggered Timing**: Lines appear with 0.4s intervals for sequential reveal
 * - **Color Transition**: Smooth fade from gray (rgb(100,100,100)) to white (rgb(255,255,255))
 * - **Horizontal Emphasis**: Subtle scaleX animation (0.9 to 1) for width expansion feel
 * - **Performance Optimized**: Uses will-change for smooth animations
 * - **Smooth Easing**: 0.9s ease-out curves for expansion feel
 *
 * Use cases:
 * - Modern title sequences and intros
 * - Kinetic typography for music videos
 * - Brand reveals and announcements
 * - Social media content with dramatic text reveals
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
  lines: z
    .array(z.string())
    .min(1)
    .max(10)
    .default(['SPLIT', 'REVEAL', 'EFFECT'])
    .describe('Array of text lines to display (1-10 lines)'),
  fontSize: z
    .string()
    .default('text-4xl md:text-6xl')
    .describe('Tailwind font size classes (e.g., "text-4xl md:text-6xl")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  lineSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(24)
    .describe('Vertical spacing between lines in pixels'),
  transitionDuration: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.9)
    .describe('Duration of each line animation in seconds'),
  staggerInterval: z
    .number()
    .min(0)
    .max(2)
    .default(0.4)
    .describe('Time interval between line animations in seconds'),
  initialLetterSpacing: z
    .string()
    .default('-0.05em')
    .describe('Initial compressed letter spacing'),
  finalLetterSpacing: z
    .string()
    .default('0.1em')
    .describe('Final expanded letter spacing'),
  startColor: z
    .string()
    .default('rgb(100,100,100)')
    .describe('Initial text color (gray)'),
  endColor: z
    .string()
    .default('rgb(255,255,255)')
    .describe('Final text color (full color)'),
  scaleXStart: z
    .number()
    .min(0.1)
    .max(1.5)
    .default(0.9)
    .describe('Initial horizontal scale value'),
  scaleXEnd: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Final horizontal scale value'),
  backgroundColor: z
    .string()
    .default('bg-black')
    .describe('Background color (Tailwind class)'),
  totalDuration: z
    .number()
    .min(1)
    .max(30)
    .optional()
    .describe(
      'Total duration of the preset in seconds (auto-calculated if not provided)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    lines,
    fontSize,
    fontFamily,
    fontWeight,
    lineSpacing,
    transitionDuration,
    staggerInterval,
    initialLetterSpacing,
    finalLetterSpacing,
    startColor,
    endColor,
    scaleXStart,
    scaleXEnd,
    backgroundColor,
    totalDuration,
  } = params;

  // Calculate total duration if not provided
  const lastLineStart = (lines.length - 1) * staggerInterval;
  const calculatedTotalDuration = lastLineStart + transitionDuration + 1; // +1s for hold period
  const finalDuration = totalDuration ?? calculatedTotalDuration;

  // Create text line components with effects
  const textLineComponents: RenderableComponentData[] = lines.map(
    (lineText, index) => {
      const lineId = `text-line-${index}`;
      const effectId = `effect-line-${index}`;
      const effectStart = index * staggerInterval;

      // Create generic effect for this line
      const effectData: GenericEffectData = {
        type: 'ease-out',
        start: effectStart,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [lineId],
        ranges: [
          // Opacity: 0 to 1
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          // Letter spacing: compressed to expanded
          { key: 'letterSpacing', val: initialLetterSpacing, prog: 0 },
          { key: 'letterSpacing', val: finalLetterSpacing, prog: 1 },
          // Color: gray to full color
          { key: 'color', val: startColor, prog: 0 },
          { key: 'color', val: endColor, prog: 1 },
          // ScaleX: subtle horizontal expansion
          { key: 'scaleX', val: scaleXStart, prog: 0 },
          { key: 'scaleX', val: scaleXEnd, prog: 1 },
        ],
      };

      const effect = {
        id: effectId,
        componentId: 'generic',
        data: effectData,
      };

      return {
        id: lineId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: lineText,
          className: `${fontSize} font-bold uppercase text-center`,
          style: {
            letterSpacing: initialLetterSpacing,
            opacity: 0,
            color: startColor,
            willChange: 'letter-spacing, opacity, transform',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
            subsets: ['latin'],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: finalDuration,
          },
        },
        effects: [effect],
      } as RenderableComponentData;
    },
  );

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'split-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `min-h-screen flex flex-col items-center justify-center ${backgroundColor}`,
        style: {
          gap: `${lineSpacing}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: finalDuration,
      },
    },
    childrenData: textLineComponents,
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
  id: 'split-reveal-kinetic-typography',
  title: 'Split-Reveal Kinetic Typography',
  description:
    'Modern kinetic typography preset featuring split-reveal effect with simultaneous fade-in and letter-spacing animation. Text starts compressed (letter-spacing: -0.05em, opacity: 0) and breathes into existence with expansion to 0.1em and full opacity. Includes subtle color transition from gray to full color and optional horizontal scaling for emphasis. Perfect for modern title sequences with staggered timing (0.4s intervals) and smooth ease-out curves (0.9s duration).',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'split-reveal',
    'title',
    'text',
    'animated',
    'modern',
    'breathing',
    'expansion',
    'staggered',
  ],
  defaultInputParams: {
    lines: ['SPLIT', 'REVEAL', 'EFFECT'],
    fontSize: 'text-4xl md:text-6xl',
    fontFamily: 'Inter',
    fontWeight: '700',
    lineSpacing: 24,
    transitionDuration: 0.9,
    staggerInterval: 0.4,
    initialLetterSpacing: '-0.05em',
    finalLetterSpacing: '0.1em',
    startColor: 'rgb(100,100,100)',
    endColor: 'rgb(255,255,255)',
    scaleXStart: 0.9,
    scaleXEnd: 1,
    backgroundColor: 'bg-black',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const splitRevealKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
