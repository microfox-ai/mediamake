/**
 * Typokinetic Drop Shadow Cascade Preset
 * 
 * This preset creates a professional typokinetic animation where text drops from above
 * with soft drop shadows. Each word cascades in with a subtle bounce effect, creating
 * a rhythmic, elegant entrance. The shadow appears first as a blur beneath where the text
 * will land, then the text drops down to meet its shadow with a gentle pulse on landing.
 * 
 * Features:
 * - Cascading word-by-word animation with staggered timing
 * - Soft Gaussian blur drop shadows that pulse on landing
 * - Subtle bounce effect (scale animation) for depth
 * - Smooth fade-in and drop-down motion
 * - Customizable timing, colors, fonts, and shadow properties
 * 
 * Use cases:
 * - Title sequences and chapter headers
 * - Elegant captions and important text callouts
 * - Opening cards for videos
 * - Professional presentation titles
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display (will be split into words)'),
  fontSize: z.number().default(64).describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color in hex or rgba format'),
  shadowColor: z
    .string()
    .default('rgba(0,0,0,0.2)')
    .describe('Drop shadow color (supports rgba for transparency)'),
  shadowBlurInitial: z
    .number()
    .default(8)
    .describe('Initial shadow blur radius in pixels'),
  shadowBlurPulse: z
    .number()
    .default(16)
    .describe('Shadow blur radius at pulse peak in pixels'),
  shadowOffsetY: z
    .number()
    .default(4)
    .describe('Vertical shadow offset in pixels (initial state)'),
  shadowOffsetYPulse: z
    .number()
    .default(8)
    .describe('Vertical shadow offset at pulse peak in pixels'),
  wordGap: z
    .number()
    .default(20)
    .describe('Gap between words in pixels'),
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .describe('Delay between each word animation in seconds'),
  dropDistance: z
    .number()
    .default(50)
    .describe('Distance words drop from above in pixels'),
  dropDuration: z
    .number()
    .default(0.6)
    .describe('Duration of drop animation per word in seconds'),
  pulseDuration: z
    .number()
    .default(0.3)
    .describe('Duration of shadow pulse effect in seconds'),
  pulseDelay: z
    .number()
    .default(0.5)
    .describe('Delay before pulse starts (relative to drop start) in seconds'),
  totalDuration: z
    .number()
    .optional()
    .describe('Total duration of the preset. If not provided, calculated from word count and timings'),
  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal alignment of text'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter:700';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts.length > 1 ? fontParts[1] : '700';

  // Split text into words
  const words = params.text.trim().split(/\s+/);
  const wordCount = words.length;

  // Calculate total duration if not provided
  const calculatedDuration =
    wordCount * params.staggerDelay +
    params.dropDuration +
    params.pulseDelay +
    params.pulseDuration;
  const totalDuration = params.totalDuration ?? calculatedDuration;

  // Helper: Create shadow filter string
  const createShadowFilter = (offsetY: number, blur: number): string => {
    return `drop-shadow(0 ${offsetY}px ${blur}px ${params.shadowColor})`;
  };

  // Generate alignment class
  const alignmentClass =
    params.alignment === 'left'
      ? 'justify-start'
      : params.alignment === 'right'
        ? 'justify-end'
        : 'justify-center';

  // Create word components with effects
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${index}`;
    const dropStartTime = index * params.staggerDelay;
    const pulseStartTime = dropStartTime + params.pulseDelay;

    // Drop effect: translateY + opacity + scale
    const dropEffect: GenericEffectData = {
      type: 'ease-out',
      start: dropStartTime,
      duration: params.dropDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Drop from above
        { key: 'translateY', val: -params.dropDistance, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        // Subtle bounce (scale)
        { key: 'scale', val: 0.95, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    // Shadow pulse effect: filter animation
    const shadowPulseEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: pulseStartTime,
      duration: params.pulseDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Initial shadow
        {
          key: 'filter',
          val: createShadowFilter(params.shadowOffsetY, params.shadowBlurInitial),
          prog: 0,
        },
        // Pulse to larger shadow
        {
          key: 'filter',
          val: createShadowFilter(params.shadowOffsetYPulse, params.shadowBlurPulse),
          prog: 0.5,
        },
        // Return to initial
        {
          key: 'filter',
          val: createShadowFilter(params.shadowOffsetY, params.shadowBlurInitial),
          prog: 1,
        },
      ],
    };

    // Text atom with initial shadow
    const textAtomData: TextAtomData = {
      text: word,
      style: {
        fontSize: params.fontSize,
        fontWeight: parseInt(fontWeight, 10),
        color: params.textColor,
        filter: createShadowFilter(params.shadowOffsetY, params.shadowBlurInitial),
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    };

    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: textAtomData,
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `drop-effect-${wordId}`,
          componentId: 'generic',
          data: dropEffect,
        },
        {
          id: `shadow-pulse-${wordId}`,
          componentId: 'generic',
          data: shadowPulseEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetic-drop-shadow-cascade-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex items-center ${alignmentClass}`,
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
            className: 'flex flex-row items-center flex-wrap',
            style: {
              gap: `${params.wordGap}px`,
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
  id: 'typokinetic-drop-shadow-cascade',
  title: 'Typokinetic Drop Shadow Cascade',
  description:
    'Professional typokinetic preset featuring cascading text animation with soft drop shadows. Each word drops from above with a subtle bounce effect, meeting its shadow below. The shadow appears first as a blur, then text lands with a gentle pulse. Perfect for title sequences, chapter headers, and elegant captions with rhythmic cascade timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'drop-shadow',
    'cascade',
    'title',
    'text',
    'bounce',
    'elegant',
    'professional',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Beautiful Title Card',
    fontSize: 64,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowBlurInitial: 8,
    shadowBlurPulse: 16,
    shadowOffsetY: 4,
    shadowOffsetYPulse: 8,
    wordGap: 20,
    staggerDelay: 0.15,
    dropDistance: 50,
    dropDuration: 0.6,
    pulseDuration: 0.3,
    pulseDelay: 0.5,
    alignment: 'center',
  },
};

// Export preset
export const typokineticDropShadowCascadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
