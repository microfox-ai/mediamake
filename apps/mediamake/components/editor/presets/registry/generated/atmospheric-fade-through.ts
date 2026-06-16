/**
 * Atmospheric Fade Through Preset
 *
 * This preset creates an atmospheric, dreamy text effect where words materialize from
 * a soft haze and float gently in space. Each word undergoes a three-layer animation:
 * opacity fade (0→1), scale transformation (0.95→1.0 for a "focusing" effect), and
 * gaussian blur that clears gradually (20px→0). The words continuously float with
 * subtle random translations (±3px horizontal, ±2px vertical) creating an ethereal,
 * particle-like movement throughout their lifetime.
 *
 * Features:
 * - **Triple-Layer Materialization**: Opacity + Scale + Blur for dreamy emergence
 * - **Continuous Float Effect**: Infinite subtle translation for atmospheric feel
 * - **Languid Timing**: 2 seconds per word with 500ms overlaps for flowing appearance
 * - **Smooth Easing**: Custom cubic-bezier for organic materialization
 * - **Atmospheric Depth**: Backdrop blur on container for added depth
 *
 * Use cases:
 * - Ambient video art text overlays
 * - Dreamy poetry or quote presentations
 * - Ethereal brand messaging
 * - Meditation or relaxation content
 * - Artistic title sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  words: z
    .array(z.string())
    .describe('Array of words to display with atmospheric effect'),
  font: z
    .string()
    .optional()
    .default('Inter:500')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:500", "Roboto:400")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color format)'),
  wordDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .optional()
    .describe('Duration each word is visible (seconds)'),
  overlapDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Overlap duration between consecutive words (seconds)'),
  materializeEasing: z
    .string()
    .default('cubic-bezier(0.22, 1, 0.36, 1)')
    .optional()
    .describe('Easing function for materialization animation'),
  floatDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Duration of one float animation cycle (seconds)'),
  floatIntensityX: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe('Horizontal float intensity (pixels)'),
  floatIntensityY: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Vertical float intensity (pixels)'),
  initialBlur: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .optional()
    .describe('Initial blur amount (pixels)'),
  initialScale: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.95)
    .optional()
    .describe('Initial scale value for focusing effect'),
  backdropBlur: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Backdrop blur for atmospheric depth (pixels)'),
  textShadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Text shadow intensity (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const parseFontString = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0] || 'Inter';
    const weight = parts.length > 1 ? parts[1] : '500';
    const style = parts.length > 2 ? parts[2] : 'normal';
    return { family, weight, style };
  };

  const fontConfig = parseFontString(params.font || 'Inter:500');
  const fontStyle: React.CSSProperties = {
    fontWeight: parseInt(fontConfig.weight, 10),
    fontStyle: fontConfig.style as any,
  };

  // Extract parameters
  const {
    words,
    fontSize = 48,
    textColor = '#ffffff',
    wordDuration = 2,
    overlapDuration = 0.5,
    materializeEasing = 'cubic-bezier(0.22, 1, 0.36, 1)',
    floatDuration = 3,
    floatIntensityX = 3,
    floatIntensityY = 2,
    initialBlur = 20,
    initialScale = 0.95,
    backdropBlur = 2,
    textShadowIntensity = 0.3,
  } = params;

  // Calculate stagger timing
  const staggerTime = wordDuration - overlapDuration;
  const totalDuration = words.length * staggerTime + overlapDuration;

  // Generate word components with effects
  const wordComponents: RenderableComponentData[] = words.map(
    (word, index) => {
      const wordId = `atmospheric-word-${index}`;
      const wordStartTime = index * staggerTime;

      // Generate unique float patterns for each word (organic variation)
      const floatSeed = index * 0.618033988749; // Golden ratio for natural distribution
      const floatOffsetX =
        Math.sin(floatSeed * Math.PI * 2) * floatIntensityX * 0.5;
      const floatOffsetY =
        Math.cos(floatSeed * Math.PI * 2) * floatIntensityY * 0.5;
      const floatRangeX = floatIntensityX + floatOffsetX;
      const floatRangeY = floatIntensityY + floatOffsetY;

      // Materialization effect (opacity + scale + blur)
      const materializeEffect = {
        id: `materialize-${wordId}`,
        componentId: 'generic',
        data: {
          type: materializeEasing,
          start: 0, // Relative to word start
          duration: wordDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Opacity fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Scale focusing effect
            { key: 'scale', val: initialScale, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Blur clear
            { key: 'blur', val: initialBlur, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      };

      // Continuous float effect (infinite loop)
      const floatEffect = {
        id: `float-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Relative to word start
          duration: floatDuration,
          mode: 'provider',
          targetIds: [wordId],
          loop: true,
          ranges: [
            // Horizontal float (sinusoidal pattern)
            { key: 'translateX', val: -floatRangeX, prog: 0 },
            { key: 'translateX', val: floatRangeX, prog: 0.5 },
            { key: 'translateX', val: -floatRangeX, prog: 1 },
            // Vertical float (offset phase for organic motion)
            { key: 'translateY', val: -floatRangeY, prog: 0 },
            { key: 'translateY', val: floatRangeY, prog: 0.5 },
            { key: 'translateY', val: -floatRangeY, prog: 1 },
          ],
        },
      };

      return {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            ...fontStyle,
            textShadow: `0 0 20px rgba(255, 255, 255, ${textShadowIntensity})`,
            opacity: 0, // Initial state (animated by effect)
            transform: `scale(${initialScale})`, // Initial state
            filter: `blur(${initialBlur}px)`, // Initial state
          },
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight],
            subsets: ['latin'],
          },
        },
        context: {
          timing: {
            start: wordStartTime,
            duration: wordDuration + overlapDuration, // Extend for overlap
          },
        },
        effects: [materializeEffect, floatEffect],
      } as RenderableComponentData;
    },
  );

  // Root container with atmospheric backdrop
  const rootContainer: RenderableComponentData = {
    id: 'atmospheric-fade-through-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backdropFilter: `blur(${backdropBlur}px)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'word-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
          repeatChildrenProps: {
            className: 'absolute',
            style: {
              transformOrigin: 'center',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData,
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
  id: 'atmospheric-fade-through',
  title: 'Atmospheric Fade Through',
  description:
    'Atmospheric fade-through preset where text materializes from a soft haze with dreamy, ethereal movements. Features three-layer animation per word (opacity fade 0→1, scale 0.95→1.0 for focusing effect, blur 20px→0), continuous atmospheric floating (±3px horizontal, ±2px vertical), and languid timing (2s per word, 500ms overlaps). Uses cubic-bezier easing for smooth materialization and ease-in-out for organic float patterns. Perfect for ambient video art, poetry, meditation content, and artistic title sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'atmospheric',
    'ethereal',
    'dreamy',
    'fade',
    'float',
    'ambient',
    'poetry',
    'artistic',
    'meditation',
  ],
  defaultInputParams: {
    words: ['Ethereal', 'Dreams', 'Flowing', 'Through', 'Mist'],
    font: 'Inter:500',
    fontSize: 48,
    textColor: '#ffffff',
    wordDuration: 2,
    overlapDuration: 0.5,
    materializeEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    floatDuration: 3,
    floatIntensityX: 3,
    floatIntensityY: 2,
    initialBlur: 20,
    initialScale: 0.95,
    backdropBlur: 2,
    textShadowIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const atmosphericFadeThroughPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
