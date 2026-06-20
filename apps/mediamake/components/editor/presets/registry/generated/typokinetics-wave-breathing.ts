/**
 * Typokinetics Wave Breathing Preset
 *
 * Creates a wave-like breathing effect across text where each character or word breathes
 * in sequence, creating a wave that travels from left to right. The breathing intensity
 * varies using a bell curve distribution - stronger in the middle, gentler at the edges.
 * Combines vertical float movement (translateY: -5px to 5px) that's offset from scaling
 * to create a floating, ethereal quality.
 *
 * Features:
 * - Wave-like breathing effect that travels left to right
 * - Bell curve intensity distribution (stronger center, gentler edges)
 * - Position-based delays (150ms per word/character)
 * - Vertical float movement offset from scaling
 * - Scale effect: 1.0-1.05 for edges, 1.0-1.15 for center
 * - Continuous looping with seamless transitions
 * - Flexible word or character-based animations
 * - Responsive wrapping for long text
 *
 * Use cases:
 * - Kinetic typography for title cards
 * - Ethereal floating text effects
 * - After Effects-style displacement animations
 * - Wave-based text reveals
 * - Dynamic title sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { TextAtomData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameters schema
const presetParams = z.object({
  text: z.string().describe('Text to animate with wave breathing effect'),
  animationUnit: z
    .enum(['word', 'character'])
    .default('word')
    .describe(
      'Animate by word or character - word is recommended for readability',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Gap between words/characters in pixels'),
  breathDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(0.8)
    .describe('Duration of each breath cycle in seconds'),
  delayPerUnit: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .describe('Delay between each word/character in seconds (wave speed)'),
  centerIntensity: z
    .number()
    .min(1.05)
    .max(1.3)
    .default(1.15)
    .describe('Maximum scale for center words/characters'),
  edgeIntensity: z
    .number()
    .min(1.01)
    .max(1.1)
    .default(1.05)
    .describe('Maximum scale for edge words/characters'),
  floatAmplitude: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Vertical float amplitude in pixels (center units)'),
  duration: z
    .number()
    .min(1)
    .max(300)
    .default(30)
    .describe('Total duration of the preset in seconds'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.fontFamily || 'Inter';
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

  // Split text into units (words or characters)
  const units =
    params.animationUnit === 'word'
      ? params.text.split(/\s+/).filter((w) => w.length > 0)
      : params.text.split('');

  const totalUnits = units.length;

  // Helper function: Calculate bell curve intensity
  const calculateWaveIntensity = (index: number, total: number): number => {
    if (total === 1) return 1;
    const normalizedIndex = index / (total - 1);
    return Math.sin(normalizedIndex * Math.PI);
  };

  // Create TextAtom for each unit
  const unitComponents: RenderableComponentData[] = units.map(
    (unit, index) => {
      const unitId = `unit-${index}`;
      const intensity = calculateWaveIntensity(index, totalUnits);

      // Calculate scale range based on intensity (bell curve)
      const minScale = 1.0;
      const maxScale =
        params.edgeIntensity +
        (params.centerIntensity - params.edgeIntensity) * intensity;

      // Calculate float amplitude based on intensity
      const floatRange = params.floatAmplitude * intensity;

      // Calculate delay based on position
      const breathDelay = index * params.delayPerUnit;

      // Create breath (scale) effect
      const breathEffect = {
        id: `breath-effect-${unitId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: breathDelay,
          duration: params.breathDuration,
          mode: 'provider',
          targetIds: [unitId],
          ranges: [
            { key: 'scale', val: minScale, prog: 0 },
            { key: 'scale', val: maxScale, prog: 0.5 },
            { key: 'scale', val: minScale, prog: 1 },
          ],
        },
      };

      // Create float (translateY) effect - offset by 0.25 cycle
      const floatEffect = {
        id: `float-effect-${unitId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: breathDelay,
          duration: params.breathDuration,
          mode: 'provider',
          targetIds: [unitId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -floatRange, prog: 0.25 },
            { key: 'translateY', val: 0, prog: 0.5 },
            { key: 'translateY', val: floatRange, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      };

      const textAtomData: TextAtomData = {
        text: unit,
        style: {
          fontSize: `${params.fontSize}px`,
          color: params.textColor,
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
      };

      return {
        id: unitId,
        type: 'atom',
        componentId: 'TextAtom',
        data: textAtomData,
        effects: [breathEffect, floatEffect],
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'flex flex-row items-center justify-center gap-1 overflow-hidden flex-wrap',
        style: {
          gap: `${params.wordSpacing}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: unitComponents as RenderableComponentData[],
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
  id: 'typokineticsWaveBreathing',
  title: 'Typokinetics Wave Breathing',
  description:
    'A kinetic typography preset that creates a wave-like breathing effect across text. Each word scales and floats in sequence, creating a wave that travels from left to right. The breathing intensity follows a bell curve distribution - stronger scaling and movement in the center words, gentler at the edges. Includes vertical float movement (translateY) that is phase-offset from the scaling to create an ethereal, floating quality. Words are dynamically generated from input text, making this preset flexible for any text length.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'wave',
    'breathing',
    'float',
    'ethereal',
    'animated',
    'text',
    'title',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Wave Breathing Effect',
    animationUnit: 'word',
    fontSize: 48,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    wordSpacing: 8,
    breathDuration: 0.8,
    delayPerUnit: 0.15,
    centerIntensity: 1.15,
    edgeIntensity: 1.05,
    floatAmplitude: 5,
    duration: 30,
  },
};

// Export preset
export const typokineticsWaveBreathingPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
