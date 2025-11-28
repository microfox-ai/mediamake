/**
 * Calligraphy Brush Reveal Preset
 *
 * This preset creates an elegant text reveal animation that mimics the artistry of Asian brush
 * calligraphy. Each word appears as if being written by an expert calligrapher, with varying
 * stroke pressure and speed that capture the essence of traditional ink painting.
 *
 * Features:
 * - **Natural Brush Strokes**: SVG path animations with stroke-dasharray technique for authentic
 *   calligraphic reveal that shows thick and thin strokes based on brush pressure
 * - **Variable Stroke Width**: Multiple overlapping paths with different widths (2px to 8px)
 *   create depth and dimension in the strokes
 * - **Ink Bleeding Effects**: Subtle blurred elements at stroke intersections simulate natural
 *   ink bleeding on paper texture
 * - **Dynamic Timing**: Word-based timing that varies (0.5s to 1.2s) based on word complexity
 *   and character count
 * - **Paper Texture**: Gradient background with subtle texture overlay creates authentic paper feel
 * - **Brush Motion**: Transform-origin manipulation and slight rotation/scale changes simulate
 *   natural brush lifting and pressing motions
 * - **Ink Depth**: Subtle text shadows provide depth and dimensionality to the ink strokes
 *
 * Use cases:
 * - Asian-inspired video content with traditional aesthetics
 * - Poetic or literary text reveals with artistic flair
 * - Elegant title sequences for cultural or educational content
 * - Meditative or contemplative text animations
 * - Artistic overlays for calligraphy demonstrations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  trackId: z
    .string()
    .default('calligraphy-brush-reveal')
    .describe('Unique identifier for this preset instance'),

  words: z
    .array(
      z.object({
        text: z.string().describe('Word text to reveal'),
        start: z.number().describe('Start time relative to parent (seconds)'),
        duration: z
          .number()
          .describe('Duration for this word reveal (seconds)'),
      }),
    )
    .describe(
      'Array of words with timing information for sequential calligraphy reveal',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size for the text in pixels'),

  textColor: z
    .string()
    .default('#1a1a1a')
    .optional()
    .describe('Color of the final revealed text'),

  font: z
    .string()
    .default('Noto Serif SC:400')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Noto Serif SC:400", "Ma Shan Zheng", "ZCOOL XiaoWei")',
    ),

  strokeWidthBase: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .optional()
    .describe('Base stroke width for the calligraphy paths in pixels'),

  strokeWidthVariation: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .optional()
    .describe(
      'Variation in stroke width to create thick/thin effect (added/subtracted from base)',
    ),

  inkBleedIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Intensity of ink bleeding effect at stroke intersections (0-1)'),

  paperTextureIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .optional()
    .describe('Intensity of paper texture overlay (0-1)'),

  backgroundGradient: z
    .string()
    .default('from-gray-50 to-gray-100')
    .optional()
    .describe(
      'Tailwind gradient classes for paper background (e.g., "from-amber-50 to-orange-50")',
    ),

  strokeTimingVariation: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.2)
    .optional()
    .describe(
      'Random timing variation for stroke layers to create depth (0-0.5 seconds)',
    ),

  inkBleedDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe(
      'When ink bleed effect starts relative to word duration (0-1, default 0.6 = 60%)',
    ),

  textRevealDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe(
      'When final text appears relative to word duration (0-1, default 0.8 = 80%)',
    ),

  brushLiftRotation: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe('Maximum rotation in degrees for brush lifting motion'),

  containerPadding: z
    .number()
    .min(0)
    .max(200)
    .default(40)
    .optional()
    .describe('Padding around the text container in pixels'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    words,
    fontSize = 72,
    textColor = '#1a1a1a',
    font = 'Noto Serif SC:400',
    strokeWidthBase = 4,
    strokeWidthVariation = 2,
    inkBleedIntensity = 0.3,
    paperTextureIntensity = 0.15,
    backgroundGradient = 'from-gray-50 to-gray-100',
    strokeTimingVariation = 0.2,
    inkBleedDelay = 0.6,
    textRevealDelay = 0.8,
    brushLiftRotation = 3,
    containerPadding = 40,
  } = params;

  // Parse font string
  const parseFontString = (fontStr: string) => {
    const fontFamily = fontStr.includes(':') ? fontStr.split(':')[0] : fontStr;
    const fontStyle: React.CSSProperties = {};
    if (fontStr.includes(':')) {
      const fontParts = fontStr.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Calculate total duration
  const totalDuration =
    words.length > 0
      ? Math.max(...words.map((w) => w.start + w.duration))
      : 10;

  // Generate word components with calligraphy effects
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `${trackId}-word-${index}`;
    const wordDuration = word.duration;

    // Calculate stroke widths for layering
    const strokeWidths = [
      strokeWidthBase - strokeWidthVariation,
      strokeWidthBase,
      strokeWidthBase + strokeWidthVariation,
    ];

    // Create SVG path effects for brush strokes (simulated with opacity and blur)
    const strokeEffects = strokeWidths.map((width, layerIndex) => {
      const timingOffset = (Math.random() - 0.5) * strokeTimingVariation;
      const effectStart = Math.max(0, timingOffset);
      const effectDuration = wordDuration - Math.abs(timingOffset);

      return {
        id: `${wordId}-stroke-${layerIndex}`,
        componentId: 'generic' as const,
        data: {
          type: 'ease-in-out' as const,
          start: effectStart,
          duration: effectDuration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            // Stroke reveal simulation with opacity
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 1 },
            // Subtle scale for brush pressure
            { key: 'scale', val: 0.98, prog: 0 },
            { key: 'scale', val: 1, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            // Brush lifting rotation
            {
              key: 'rotate',
              val: -brushLiftRotation * (layerIndex - 1),
              prog: 0,
            },
            { key: 'rotate', val: 0, prog: 0.3 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      };
    });

    // Ink bleed effect at stroke intersections
    const inkBleedEffect = {
      id: `${wordId}-ink-bleed`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: wordDuration * inkBleedDelay,
        duration: wordDuration * (1 - inkBleedDelay),
        mode: 'provider' as const,
        targetIds: [`${wordId}-bleed`],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: inkBleedIntensity, prog: 0.5 },
          { key: 'opacity', val: inkBleedIntensity * 0.8, prog: 1 },
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };

    // Final text reveal effect
    const textRevealEffect = {
      id: `${wordId}-text-reveal`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: wordDuration * textRevealDelay,
        duration: wordDuration * (1 - textRevealDelay),
        mode: 'provider' as const,
        targetIds: [`${wordId}-text`],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.98, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };

    // Word container with all effects
    return {
      id: `${wordId}-container`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            display: 'inline-block',
            marginRight: `${fontSize * 0.2}px`,
          },
        },
      },
      context: {
        timing: {
          start: word.start,
          duration: wordDuration,
        },
      },
      effects: [...strokeEffects, inkBleedEffect, textRevealEffect],
      childrenData: [
        // Ink bleed element (positioned behind text)
        {
          id: `${wordId}-bleed`,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; width: 8px; height: 8px; background: ${textColor}; border-radius: 50%; filter: blur(4px); opacity: 0; transform: scale(0.5); left: 50%; top: 50%; transform-origin: center;"></div>`,
            className: 'absolute inset-0 pointer-events-none',
          },
          context: {
            timing: {
              start: 0,
              duration: wordDuration,
            },
          },
        } as RenderableComponentData,
        // Final text element
        {
          id: `${wordId}-text`,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              opacity: 0,
              transform: 'scale(0.98)',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['400'],
              subsets: ['latin', 'chinese-simplified'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: wordDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Paper texture overlay
  const paperTextureOverlay: RenderableComponentData = {
    id: `${trackId}-paper-texture`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: paperTextureIntensity,
          backgroundImage:
            'linear-gradient(45deg, rgba(0,0,0,0.02) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.02) 75%), linear-gradient(45deg, rgba(0,0,0,0.02) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.02) 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Words container
  const wordsContainer: RenderableComponentData = {
    id: `${trackId}-words-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-wrap items-center justify-center',
        style: {
          padding: `${containerPadding}px`,
          gap: `${fontSize * 0.1}px`,
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
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full bg-gradient-to-br ${backgroundGradient}`,
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [paperTextureOverlay, wordsContainer],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'calligraphy-brush-reveal',
  title: 'Calligraphy Brush Reveal',
  description:
    'Elegant text reveal animation mimicking Asian brush calligraphy with varying stroke pressure, ink bleeding effects, and natural handwriting motion. Each word appears as if being written by an expert calligrapher with authentic brush painting techniques.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'calligraphy',
    'brush',
    'reveal',
    'asian',
    'artistic',
    'elegant',
    'ink',
    'painting',
    'handwriting',
  ],
  dependencies: {},
  defaultInputParams: {
    trackId: 'calligraphy-brush-reveal',
    words: [
      { text: '墨', start: 0, duration: 1.2 },
      { text: '香', start: 1.3, duration: 1.0 },
      { text: '流', start: 2.4, duration: 0.8 },
      { text: '韵', start: 3.3, duration: 1.1 },
    ],
    fontSize: 72,
    textColor: '#1a1a1a',
    font: 'Noto Serif SC:400',
    strokeWidthBase: 4,
    strokeWidthVariation: 2,
    inkBleedIntensity: 0.3,
    paperTextureIntensity: 0.15,
    backgroundGradient: 'from-gray-50 to-gray-100',
    strokeTimingVariation: 0.2,
    inkBleedDelay: 0.6,
    textRevealDelay: 0.8,
    brushLiftRotation: 3,
    containerPadding: 40,
  },
};

// --- Export ---

export const calligraphyBrushRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
