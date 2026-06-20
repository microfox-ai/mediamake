/**
 * Organic Ink Spread Typography Preset
 *
 * This preset simulates organic ink spreading on paper using reveal mask techniques.
 * Each word has its own animated mask that mimics liquid ink flow, starting from the baseline
 * and spreading outward irregularly, creating depth through varying opacity (darker at origin,
 * lighter at edges) like real ink bleed effects. Includes paper grain texture simulation via CSS filters.
 *
 * Features:
 * - **Organic Ink Spread**: Reveal mask animation simulating ink absorption on paper
 * - **Staggered Word Animation**: Each word appears with 150ms delay for sequential wave effect
 * - **Varying Opacity**: Simulates ink density variation (darker at origin, lighter at edges)
 * - **Paper Grain Texture**: CSS filters create subtle paper texture effect
 * - **Irregular Spread Pattern**: Clip-path animation mimics liquid ink flow from baseline
 * - **Customizable Typography**: Font, size, color, and spacing controls
 *
 * Use cases:
 * - Artistic typography reveals for creative content
 * - Time-lapse style text animations
 * - Organic, handcrafted aesthetic for titles
 * - Poetry or literary content presentation
 * - Vintage or analog-style text effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display with ink spread effect'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600:italic", "Roboto:700", "BebasNeue")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#1a1a1a')
    .optional()
    .describe('Text color (CSS color value)'),
  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .optional()
    .describe('Spacing between words in pixels'),
  spreadDuration: z
    .number()
    .min(0.2)
    .max(1.5)
    .default(0.5)
    .optional()
    .describe('Duration of ink spread animation per word (seconds)'),
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .optional()
    .describe('Delay between word animations (seconds)'),
  startOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Starting opacity of ink (lighter at edges)'),
  endOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .optional()
    .describe('Ending opacity of ink (darker at origin)'),
  paperContrast: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .optional()
    .describe('Paper texture contrast filter value'),
  paperBrightness: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(0.95)
    .optional()
    .describe('Paper texture brightness filter value'),
  position: z
    .enum(['center', 'top', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text'),
  alignment: z
    .enum(['center', 'left', 'right'])
    .default('center')
    .optional()
    .describe('Horizontal alignment of text'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse text into words
  const words = params.text.trim().split(/\s+/);

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate total duration
  const spreadDuration = params.spreadDuration ?? 0.5;
  const staggerDelay = params.staggerDelay ?? 0.15;
  const totalDuration =
    words.length * staggerDelay + spreadDuration;

  // Alignment classes
  const alignmentClass =
    params.alignment === 'left'
      ? 'justify-start'
      : params.alignment === 'right'
      ? 'justify-end'
      : 'justify-center';

  const positionClass =
    params.position === 'top'
      ? 'items-start'
      : params.position === 'bottom'
      ? 'items-end'
      : 'items-center';

  // Create word components with effects
  const wordComponents: RenderableComponentData[] = words.map(
    (word, index) => {
      const wordId = `ink-word-${index}`;
      const wordWrapperId = `ink-word-wrapper-${index}`;
      const wordStartTime = index * staggerDelay;

      // Clip-path effect: Ink spread from baseline
      const clipPathEffect: GenericEffectData = {
        type: 'cubic-bezier',
        bezier: [0.4, 0.0, 0.2, 1],
        start: 0,
        duration: spreadDuration,
        mode: 'provider',
        targetIds: [wordWrapperId],
        ranges: [
          {
            key: 'clipPath',
            val: 'polygon(50% 100%, 50% 100%, 50% 100%, 50% 100%)',
            prog: 0,
          },
          {
            key: 'clipPath',
            val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            prog: 1,
          },
        ],
      };

      // Opacity effect: Varying ink density
      const opacityEffect: GenericEffectData = {
        type: 'cubic-bezier',
        bezier: [0.4, 0.0, 0.2, 1],
        start: 0,
        duration: spreadDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: params.startOpacity ?? 0.3, prog: 0 },
          { key: 'opacity', val: params.endOpacity ?? 1, prog: 1 },
        ],
      };

      // Word wrapper with clip-path effect
      const wordWrapper: RenderableComponentData = {
        id: wordWrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block overflow-hidden',
          },
        },
        context: {
          timing: {
            start: wordStartTime,
            duration: totalDuration - wordStartTime,
          },
        },
        effects: [
          {
            id: `clip-effect-${index}`,
            componentId: 'generic',
            data: clipPathEffect,
          },
        ],
        childrenData: [
          {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word,
              style: {
                fontSize: params.fontSize ?? 48,
                color: params.textColor ?? '#1a1a1a',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight
                  ? { weights: [fontStyle.fontWeight.toString()] }
                  : {}),
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: totalDuration - wordStartTime,
              },
            },
            effects: [
              {
                id: `opacity-effect-${index}`,
                componentId: 'generic',
                data: opacityEffect,
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;

      return wordWrapper;
    },
  );

  // Root container with paper texture filter
  const rootContainer: RenderableComponentData = {
    id: 'organic-ink-spread-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex ${positionClass} ${alignmentClass}`,
        style: {
          filter: `contrast(${params.paperContrast ?? 1.2}) brightness(${params.paperBrightness ?? 0.95})`,
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
            className: 'relative flex flex-wrap',
            style: {
              gap: `${params.wordSpacing ?? 8}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'this',
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

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
  id: 'organic-ink-spread-typography',
  title: 'Organic Ink Spread Typography',
  description:
    'Typography preset that simulates organic ink spreading on paper using reveal mask technique. Text is revealed through animated masks that mimic liquid ink flow, starting from the baseline and spreading outward irregularly. Each word has its own staggered ink spread effect with varying opacity (darker at origin, lighter at edges) creating depth like real ink bleed. Includes paper grain texture simulation via CSS filters.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'ink-spread',
    'organic',
    'reveal',
    'animation',
    'artistic',
    'paper-texture',
    'staggered',
    'handcrafted',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Organic Ink Spread Effect',
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#1a1a1a',
    wordSpacing: 8,
    spreadDuration: 0.5,
    staggerDelay: 0.15,
    startOpacity: 0.3,
    endOpacity: 1,
    paperContrast: 1.2,
    paperBrightness: 0.95,
    position: 'center',
    alignment: 'center',
  },
};

// Export preset
export const organicInkSpreadTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
