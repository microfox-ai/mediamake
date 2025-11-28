/**
 * Calligraphy Brush Stroke Animation Preset
 *
 * This preset creates text that appears as if painted with a traditional brush, featuring:
 * - Brush stroke reveal using scaleX from 0 to 1 (left to right painting effect)
 * - Pressure variation simulation through opacity oscillations (0.85-1.0)
 * - Natural calligraphy timing with variable durations per character
 * - Subtle texture effects for authentic brush appearance
 * - "Lift and press" effect showing brush pressure changes
 *
 * The animation follows natural calligraphy principles:
 * - Quick movements on upstrokes
 * - Slower, deliberate movements on downstrokes
 * - Visible pressure variations throughout the stroke
 *
 * Use cases:
 * - Creating elegant title sequences with handwritten feel
 * - Adding artistic text overlays with traditional aesthetics
 * - Building signature-style text animations
 * - Creating cultural or artistic content with authentic brush effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('Brush')
    .describe('Text to display with calligraphy brush effect'),
  fontSize: z
    .number()
    .min(24)
    .max(500)
    .default(120)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#1a1a1a')
    .describe('Text color (CSS color value)'),
  font: z
    .string()
    .default('Brush Script MT:400')
    .describe(
      'Font family with optional weight and style (e.g., "Brush Script MT:400", "Pacifico", "Dancing Script:700")',
    ),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Total animation duration in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Delay between character animations in seconds'),
  pressureIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.0)
    .describe('Intensity of pressure variation effect (higher = more variation)'),
  alignmentX: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal text alignment'),
  alignmentY: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical text alignment'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Brush Script MT:400';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? fontString.split(':')[1]
    : '400';

  // Split text into characters
  const characters = params.text.split('');
  const totalDuration = params.duration;

  // Helper: Calculate character complexity for timing variation
  // Upright strokes (like 'l', 'I', '1') are faster
  // Curved or complex characters (like 'B', 'R', 'u', 'S') are slower
  const getCharacterComplexity = (char: string): number => {
    const simple = /[il1|]/i;
    const complex = /[BRSmWQOGCDU@#$%&]/i;
    const moderate = /[aeouvwxyzAEFHJKLNPTVXYZ]/i;

    if (simple.test(char)) return 0.7; // Fast strokes
    if (complex.test(char)) return 1.3; // Slow strokes
    if (moderate.test(char)) return 1.0; // Normal strokes
    return 1.0; // Default
  };

  // Calculate timings for each character
  const characterTimings = characters.map((char, index) => {
    const complexity = getCharacterComplexity(char);
    const baseDuration = 0.25; // Base duration per character
    const duration = baseDuration * complexity;
    const start = index * params.staggerDelay;

    return {
      char,
      start,
      duration,
      complexity,
    };
  });

  // Helper: Create pressure variation effect (opacity oscillation)
  const createPressureEffect = (
    targetId: string,
    start: number,
    duration: number,
    complexity: number,
  ): GenericEffectData => {
    // More complex characters have more pressure variations
    const variations = Math.max(3, Math.floor(complexity * 5));
    const ranges: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= variations; i++) {
      const prog = i / variations;
      // Oscillate opacity between 0.85 and 1.0 based on pressureIntensity
      const minOpacity = 1.0 - 0.15 * params.pressureIntensity;
      const maxOpacity = 1.0;
      const opacity =
        i % 2 === 0
          ? maxOpacity
          : minOpacity + Math.random() * (maxOpacity - minOpacity) * 0.5;

      ranges.push({
        key: 'opacity',
        val: opacity,
        prog,
      });
    }

    return {
      type: 'linear',
      start,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper: Create brush stroke reveal effect (scaleX)
  const createBrushStrokeEffect = (
    targetId: string,
    start: number,
    duration: number,
    complexity: number,
  ): GenericEffectData => {
    // Use ease-out for downstrokes (complex), ease-in for upstrokes (simple)
    const easing = complexity > 1.0 ? 'ease-out' : 'ease-in';

    return {
      type: easing,
      start,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'scaleX', val: 0, prog: 0 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    };
  };

  // Helper: Create "lift" effect at the end (slight scale down + opacity fade)
  const createLiftEffect = (
    targetId: string,
    start: number,
    duration: number,
  ): GenericEffectData => {
    return {
      type: 'ease-in',
      start,
      duration: 0.1,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleY', val: 0.98, prog: 1 },
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.95, prog: 1 },
      ],
    };
  };

  // Build character components
  const characterComponents: RenderableComponentData[] =
    characterTimings.map((timing, index) => {
      const charId = `brush-char-${index}`;

      // Create effects for this character
      const brushStrokeEffect = createBrushStrokeEffect(
        charId,
        timing.start,
        timing.duration,
        timing.complexity,
      );

      const pressureEffect = createPressureEffect(
        charId,
        timing.start,
        timing.duration,
        timing.complexity,
      );

      // Add lift effect for last few characters
      const isLastChar = index >= characters.length - 1;
      const liftEffect = isLastChar
        ? createLiftEffect(
            charId,
            timing.start + timing.duration - 0.1,
            0.1,
          )
        : null;

      const effects = [
        {
          id: `brush-stroke-${charId}`,
          componentId: 'generic' as const,
          data: brushStrokeEffect,
        },
        {
          id: `pressure-${charId}`,
          componentId: 'generic' as const,
          data: pressureEffect,
        },
      ];

      if (liftEffect) {
        effects.push({
          id: `lift-${charId}`,
          componentId: 'generic' as const,
          data: liftEffect,
        });
      }

      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: timing.char,
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            transformOrigin: 'left center',
            textShadow: '2px 2px 3px rgba(0,0,0,0.15)',
            fontWeight: parseInt(fontWeight, 10),
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
            display: 'swap',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects,
      } as RenderableComponentData;
    });

  // Alignment classes
  const justifyClass =
    params.alignmentX === 'left'
      ? 'justify-start'
      : params.alignmentX === 'right'
        ? 'justify-end'
        : 'justify-center';

  const alignClass =
    params.alignmentY === 'top'
      ? 'items-start'
      : params.alignmentY === 'bottom'
        ? 'items-end'
        : 'items-center';

  // Character wrapper (holds all characters in a row)
  const characterWrapper: RenderableComponentData = {
    id: 'brush-character-wrapper',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row',
        style: {
          gap: '0.05em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: characterComponents,
  } as RenderableComponentData;

  // Root container (centers the text)
  const rootContainer: RenderableComponentData = {
    id: 'calligraphy-brush-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${justifyClass} ${alignClass}`,
        style: {
          padding: '40px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [characterWrapper],
  } as RenderableComponentData;

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
  id: 'calligraphy-brush-text',
  title: 'Calligraphy Brush Stroke Animation',
  description:
    'Text animation that simulates traditional brush calligraphy with pressure-sensitive stroke reveals, using scaleX animations and opacity oscillations to create natural brush pressure variations and painting effects',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'calligraphy',
    'brush',
    'handwriting',
    'artistic',
    'typography',
    'animation',
    'pressure-sensitive',
    'stroke',
    'painting',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Brush',
    fontSize: 120,
    textColor: '#1a1a1a',
    font: 'Brush Script MT:400',
    duration: 2,
    staggerDelay: 0.15,
    pressureIntensity: 1.0,
    alignmentX: 'center',
    alignmentY: 'center',
  },
};

// Export preset
export const calligraphyBrushTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
