/**
 * Fog Rolling Typokinetics Preset
 *
 * This preset creates a cinematic fog rolling effect where text behaves like fog
 * moving across a landscape. Text flows horizontally with varying density and speed,
 * fading in from transparent, becoming fully visible, then fading out again as if
 * passing through patches of thick and thin fog. Features subtle vertical undulation
 * to simulate fog's reaction to terrain, plus film grain overlay for atmospheric quality.
 *
 * Features:
 * - **Horizontal Flow**: Text rolls across screen with translateX animation
 * - **Varying Density**: Opacity keyframes simulate thick/thin fog patches (0 → 1 → 0.3 → 1 → 0)
 * - **Vertical Undulation**: Sine wave motion (-3px to 3px) for terrain reaction
 * - **Atmospheric Effects**: Blur and brightness oscillation for depth and density
 * - **Film Grain Overlay**: Noise texture for enhanced cinematic quality
 * - **Word-Level Animation**: Each word animates independently with staggered timing
 *
 * Use cases:
 * - Cinematic title sequences with fog aesthetic
 * - Atmospheric poetry or quote presentations
 * - Dramatic video intros with weather themes
 * - Time-lapse style text reveals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time (relative to caption start = 0)'),
        end: z.number().describe('Relative end time'),
        duration: z.number().describe('Relative duration'),
        absoluteStart: z.number().describe('Absolute start in caption timeline'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative start time within caption'),
            end: z.number().describe('Relative end time within caption'),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            splitParts: z.array(z.string()).optional(),
            impact: z.number().optional(),
            sentiment: z.string().optional(),
            emotion: z.string().optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timestamps'),

  font: z
    .string()
    .optional()
    .default('Inter:300')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:300", "Inter:200:italic")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#e5e7eb')
    .optional()
    .describe('Text color (CSS color value)'),

  fogDuration: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .optional()
    .describe('Duration for each fog roll cycle in seconds'),

  wordOffset: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Time offset between words in seconds'),

  noiseOpacity: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.08)
    .optional()
    .describe('Film grain overlay opacity (0-0.3)'),

  verticalWaveAmplitude: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Vertical undulation amplitude in pixels'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString: string) => {
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
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter:300');

  const allChildrenData: RenderableComponentData[] = [];

  // Process each caption
  params.captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    const captionId = `fog-caption-${captionIndex}`;

    // Process words
    const wordComponents: RenderableComponentData[] = caption.words.map(
      (word, wordIndex) => {
        const wordId = `${captionId}-word-${wordIndex}`;
        const wordWrapperId = `${wordId}-wrapper`;

        // Create word text atom
        const wordTextData: TextAtomData = {
          text: word.text,
          style: {
            fontSize: `${params.fontSize}px`,
            color: params.textColor,
            ...fontStyle,
            textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        };

        // Fog opacity effect (0 → 1 → 0.3 → 1 → 0)
        const opacityEffect: GenericEffectData = {
          type: 'ease-in-out',
          start: word.start + wordIndex * params.wordOffset!,
          duration: params.fogDuration!,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 0.75 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        };

        // Horizontal roll effect (viewport width to negative width)
        const horizontalEffect: GenericEffectData = {
          type: 'linear',
          start: word.start + wordIndex * params.wordOffset!,
          duration: params.fogDuration!,
          mode: 'provider',
          targetIds: [wordWrapperId],
          ranges: [
            { key: 'translateX', val: '100vw', prog: 0 },
            { key: 'translateX', val: '-100%', prog: 1 },
          ],
        };

        // Vertical undulation (sine wave -3 to 3 pixels)
        const amplitude = params.verticalWaveAmplitude!;
        const verticalEffect: GenericEffectData = {
          type: 'ease-in-out',
          start: word.start + wordIndex * params.wordOffset!,
          duration: params.fogDuration!,
          mode: 'provider',
          targetIds: [wordWrapperId],
          ranges: [
            { key: 'translateY', val: -amplitude, prog: 0 },
            { key: 'translateY', val: amplitude, prog: 0.25 },
            { key: 'translateY', val: -amplitude, prog: 0.5 },
            { key: 'translateY', val: amplitude, prog: 0.75 },
            { key: 'translateY', val: -amplitude, prog: 1 },
          ],
        };

        // Blur and brightness oscillation
        const filterEffect: GenericEffectData = {
          type: 'ease-in-out',
          start: word.start + wordIndex * params.wordOffset!,
          duration: params.fogDuration!,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'filter:blur', val: '4px', prog: 0 },
            { key: 'filter:blur', val: '0px', prog: 0.3 },
            { key: 'filter:blur', val: '2px', prog: 0.6 },
            { key: 'filter:blur', val: '0px', prog: 0.8 },
            { key: 'filter:blur', val: '4px', prog: 1 },
            { key: 'filter:brightness', val: 0.7, prog: 0 },
            { key: 'filter:brightness', val: 1.2, prog: 0.3 },
            { key: 'filter:brightness', val: 0.9, prog: 0.6 },
            { key: 'filter:brightness', val: 1.1, prog: 0.85 },
            { key: 'filter:brightness', val: 0.7, prog: 1 },
          ],
        };

        // Word text atom
        const wordTextAtom: RenderableComponentData = {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: wordTextData,
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [
            {
              id: `${wordId}-opacity`,
              componentId: 'generic',
              data: opacityEffect,
            },
            {
              id: `${wordId}-filter`,
              componentId: 'generic',
              data: filterEffect,
            },
          ],
        };

        // Word wrapper layout
        const wordWrapper: RenderableComponentData = {
          id: wordWrapperId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative inline-block mx-2',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: [wordTextAtom],
          effects: [
            {
              id: `${wordWrapperId}-horizontal`,
              componentId: 'generic',
              data: horizontalEffect,
            },
            {
              id: `${wordWrapperId}-vertical`,
              componentId: 'generic',
              data: verticalEffect,
            },
          ],
        };

        return wordWrapper;
      },
    );

    // Caption container
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row items-center justify-start w-full h-full overflow-hidden',
          style: {
            position: 'relative',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };

    allChildrenData.push(captionContainer);
  });

  // Film grain noise overlay
  const noiseOverlay: RenderableComponentData = {
    id: 'fog-noise-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVQIW2NkYGD4z8DAwMgABXAGNgGADgYBAPIJZr4AAAAASUVORK5CYII=); opacity: ${params.noiseOpacity}; pointer-events: none; mix-blend-mode: overlay;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          params.captions.length > 0
            ? params.captions[params.captions.length - 1].absoluteEnd
            : 10,
      },
    },
  };

  allChildrenData.push(noiseOverlay);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'fog-rolling-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          params.captions.length > 0
            ? params.captions[params.captions.length - 1].absoluteEnd
            : 10,
      },
    },
    childrenData: allChildrenData as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'FogRollingTypokinetics',
  title: 'Fog Rolling Typokinetics',
  description:
    'Text behaves like fog rolling across a landscape with varying density and speed. Letters fade in from transparent, become fully visible, then fade out as if passing through patches of thick and thin fog. Includes subtle vertical undulation and film grain overlay for atmospheric quality.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'fog',
    'atmospheric',
    'cinematic',
    'weather',
    'flow',
    'undulation',
    'film-grain',
    'timelapse',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Fog rolls across the landscape',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            id: 'word-1',
            text: 'Fog',
            start: 0,
            end: 0.5,
            duration: 0.5,
            absoluteStart: 0,
            absoluteEnd: 0.5,
            confidence: 0.95,
          },
          {
            id: 'word-2',
            text: 'rolls',
            start: 0.5,
            end: 1,
            duration: 0.5,
            absoluteStart: 0.5,
            absoluteEnd: 1,
            confidence: 0.95,
          },
          {
            id: 'word-3',
            text: 'across',
            start: 1,
            end: 1.5,
            duration: 0.5,
            absoluteStart: 1,
            absoluteEnd: 1.5,
            confidence: 0.95,
          },
          {
            id: 'word-4',
            text: 'the',
            start: 1.5,
            end: 1.8,
            duration: 0.3,
            absoluteStart: 1.5,
            absoluteEnd: 1.8,
            confidence: 0.95,
          },
          {
            id: 'word-5',
            text: 'landscape',
            start: 1.8,
            end: 3,
            duration: 1.2,
            absoluteStart: 1.8,
            absoluteEnd: 3,
            confidence: 0.95,
          },
        ],
      },
    ],
    font: 'Inter:300',
    fontSize: 48,
    textColor: '#e5e7eb',
    fogDuration: 10,
    wordOffset: 0.2,
    noiseOpacity: 0.08,
    verticalWaveAmplitude: 3,
  },
};

// --- Export Preset ---

export const FogRollingTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
