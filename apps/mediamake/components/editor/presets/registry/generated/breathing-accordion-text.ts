/**
 * Breathing Accordion Text Preset
 *
 * Creates hypnotic breathing text animation with continuous accordion-like contraction
 * and expansion. Features letter spacing oscillation (-0.35em to 0.15em), synchronized
 * opacity pulsing, subtle scale effects, and wave-pattern phase offsets across multiple
 * text lines.
 *
 * Perfect for ambient video backgrounds, meditation apps, and atmospheric visuals.
 *
 * Features:
 * - Continuous letter spacing oscillation (accordion/bellows effect)
 * - Synchronized opacity pulsing (1 → 0.8 → 1)
 * - Subtle scale variations (1 → 0.98 → 1.02 → 1)
 * - Wave pattern phase offsets across multiple text lines
 * - Smooth, hypnotic easing for meditation-friendly animations
 * - Configurable cycle duration (4-6 seconds recommended)
 * - Customizable text lines with individual phase offsets
 *
 * Use cases:
 * - Ambient video backgrounds
 * - Meditation and relaxation apps
 * - Atmospheric title sequences
 * - Breathing exercise guides
 * - Hypnotic text effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  textLines: z
    .array(z.string())
    .min(1)
    .max(10)
    .default(['BREATHE IN', 'AND OUT', 'SLOWLY'])
    .describe('Array of text lines to display (1-10 lines)'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(60)
    .optional()
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  cycleDuration: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .optional()
    .describe('Duration of one breathing cycle in seconds (4-6 recommended)'),
  phaseOffset: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Time offset between each line in seconds (for wave effect)'),
  minLetterSpacing: z
    .number()
    .min(-0.5)
    .max(0)
    .default(-0.35)
    .optional()
    .describe('Minimum letter spacing in em (compressed state)'),
  maxLetterSpacing: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.15)
    .optional()
    .describe('Maximum letter spacing in em (expanded state)'),
  minOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Minimum opacity during pulse (0-1)'),
  enableScale: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable subtle scale effect'),
  minScale: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.98)
    .optional()
    .describe('Minimum scale value'),
  maxScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.02)
    .optional()
    .describe('Maximum scale value'),
  duration: z
    .number()
    .min(1)
    .default(30)
    .optional()
    .describe('Total duration of the preset in seconds'),
  verticalSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .optional()
    .describe('Vertical spacing between text lines in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Extract parameters with defaults
  const cycleDuration = params.cycleDuration ?? 5;
  const phaseOffset = params.phaseOffset ?? 0.5;
  const minLetterSpacing = params.minLetterSpacing ?? -0.35;
  const maxLetterSpacing = params.maxLetterSpacing ?? 0.15;
  const minOpacity = params.minOpacity ?? 0.8;
  const enableScale = params.enableScale ?? true;
  const minScale = params.minScale ?? 0.98;
  const maxScale = params.maxScale ?? 1.02;
  const totalDuration = params.duration ?? 30;
  const verticalSpacing = params.verticalSpacing ?? 20;

  // Create text line components with breathing effects
  const textLineComponents: RenderableComponentData[] = params.textLines.map(
    (text, lineIndex) => {
      const textLineId = `breathing-text-line-${lineIndex}`;

      // Calculate phase offset for this line (wave effect)
      const effectDelay = lineIndex * phaseOffset;

      // Create breathing animation effect
      // Keyframes: 0% (normal) → 25% (compressed) → 75% (expanded) → 100% (normal)
      const breathingEffect = {
        id: `breathing-effect-${lineIndex}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: effectDelay, // Phase offset for wave pattern
          duration: totalDuration - effectDelay, // Animate until end
          mode: 'provider' as const,
          targetIds: [textLineId],
          ranges: [
            // Letter spacing oscillation (accordion effect)
            { key: 'letterSpacing', val: '0em', prog: 0 },
            { key: 'letterSpacing', val: `${minLetterSpacing}em`, prog: 0.25 },
            { key: 'letterSpacing', val: `${maxLetterSpacing}em`, prog: 0.75 },
            { key: 'letterSpacing', val: '0em', prog: 1 },

            // Opacity pulsing (synchronized with spacing)
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: minOpacity, prog: 0.25 },
            { key: 'opacity', val: minOpacity, prog: 0.75 },
            { key: 'opacity', val: 1, prog: 1 },

            // Subtle scale effect (optional)
            ...(enableScale
              ? [
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: minScale, prog: 0.25 },
                  { key: 'scale', val: maxScale, prog: 0.75 },
                  { key: 'scale', val: 1, prog: 1 },
                ]
              : []),
          ],
        },
      };

      return {
        id: textLineId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text,
          style: {
            fontSize: params.fontSize ?? 60,
            color: params.textColor ?? '#FFFFFF',
            fontWeight: 'bold',
            letterSpacing: '0em', // Starting value
            transformOrigin: 'center center',
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
        effects: [breathingEffect],
      };
    },
  );

  // Create root container with vertical layout
  const rootContainer: RenderableComponentData = {
    id: 'breathing-accordion-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col justify-center items-center',
        style: {
          gap: `${verticalSpacing}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'breathing-accordion-text',
  title: 'Breathing Accordion Text',
  description:
    'Hypnotic breathing text animation with continuous accordion-like contraction and expansion. Features letter spacing oscillation (-0.35em to 0.15em), synchronized opacity pulsing, subtle scale effects, and wave-pattern phase offsets across multiple text lines. Perfect for ambient backgrounds and meditation apps.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'breathing',
    'accordion',
    'hypnotic',
    'meditation',
    'ambient',
    'wave',
    'oscillation',
    'letter-spacing',
  ],
  defaultInputParams: {
    textLines: ['BREATHE IN', 'AND OUT', 'SLOWLY'],
    fontSize: 60,
    font: 'Inter:700',
    textColor: '#FFFFFF',
    cycleDuration: 5,
    phaseOffset: 0.5,
    minLetterSpacing: -0.35,
    maxLetterSpacing: 0.15,
    minOpacity: 0.8,
    enableScale: true,
    minScale: 0.98,
    maxScale: 1.02,
    duration: 30,
    verticalSpacing: 20,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const breathingAccordionTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};