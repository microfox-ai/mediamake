/**
 * Underwater Drift Typokinetics Preset
 *
 * A sophisticated word-by-word typokinetics preset that creates a dreamlike underwater
 * reading experience. Each word from caption data drifts horizontally at different speeds
 * based on impact weight - impactful words move slower with more visual presence.
 *
 * Features:
 * - Staggered cascade entry timing for each word
 * - Independent horizontal drift animations with speed based on word.impact (if available)
 * - Cinematographic blur-to-focus effect as words pass through center screen
 * - Perspective depth for subtle 3D feeling
 * - Thin, elegant typography with wide tracking
 *
 * Technical Implementation:
 * - Each word is a separate TextAtom positioned absolutely
 * - Words drift from right (110%) to left (-110%) at different rates
 * - High-impact words drift slower (80% duration), normal words faster (60% duration)
 * - Blur effect: 2px → 0px (center clarity) → 2px, peaking at 50% progress
 * - Uses word.relativeStart for staggered entry
 * - Container has perspective: 1000px for depth
 *
 * Use Cases:
 * - Cinematic title sequences
 * - Poetic subtitle displays
 * - Artistic text reveals
 * - Dream-like narrative overlays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
  TranscriptionWord,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- PRESET PARAMS SCHEMA ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Caption data with words array containing timing and text'),

  font: z
    .string()
    .optional()
    .default('Inter:200:normal')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:200:normal")',
    ),

  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color for all words'),

  fontSize: z
    .number()
    .optional()
    .default(48)
    .describe('Base font size in pixels'),

  defaultImpact: z
    .number()
    .min(0.5)
    .max(2)
    .optional()
    .default(1.0)
    .describe(
      'Default impact multiplier when word.impact is not available (affects drift speed)',
    ),

  highImpactDurationPercent: z
    .number()
    .min(0.5)
    .max(1.5)
    .optional()
    .default(0.8)
    .describe(
      'Duration multiplier for high-impact words (slower drift = more weight)',
    ),

  normalImpactDurationPercent: z
    .number()
    .min(0.3)
    .max(1)
    .optional()
    .default(0.6)
    .describe('Duration multiplier for normal-impact words (faster drift)'),

  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .default(2)
    .describe('Maximum blur intensity in pixels at word edges'),

  perspectiveDepth: z
    .number()
    .min(500)
    .max(2000)
    .optional()
    .default(1000)
    .describe('Perspective depth in pixels for 3D effect'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- PRESET EXECUTION FUNCTION ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    textColor,
    fontSize,
    defaultImpact,
    highImpactDurationPercent,
    normalImpactDurationPercent,
    blurIntensity,
    perspectiveDepth,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

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

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter:200:normal');

  // Collect all word components across all captions
  const allWordComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionDuration = caption.duration;

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;

      // Determine drift speed based on impact
      // If caption has metadata.impact, use it; otherwise use defaultImpact
      const wordImpact = caption.metadata?.impact ?? defaultImpact;

      // High impact = slower drift (more "weight")
      // Determine duration multiplier: higher impact → longer duration (slower drift)
      const isHighImpact = wordImpact > 1.1;
      const durationMultiplier = isHighImpact
        ? highImpactDurationPercent
        : normalImpactDurationPercent;

      // Word drift duration is a percentage of caption duration
      const wordDriftDuration = captionDuration * durationMultiplier;

      // Calculate effect start time (relative to caption start)
      // Word should start drifting when it appears (word.start)
      const effectStart = word.start;

      // Create drift effect: translateX from 110 (right) to -110 (left)
      // Blur effect: 2px → 0px (center) → 2px
      // Center clarity at 50% progress
      const driftEffect = {
        id: `drift-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: effectStart,
          duration: wordDriftDuration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            // Horizontal drift: right to left
            { key: 'translateX', val: '110%', prog: 0 },
            { key: 'translateX', val: '-110%', prog: 1 },

            // Blur effect: blur at edges, clear at center
            { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 0.5 },
            { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 1 },
          ],
        },
      };

      // Create TextAtom for this word
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            whiteSpace: 'nowrap',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
          className: 'absolute font-light tracking-widest',
        },
        context: {
          timing: {
            start: caption.absoluteStart, // Positioned at caption's absolute start
            duration: captionDuration, // Lasts for caption duration
          },
        },
        effects: [driftEffect],
      };

      allWordComponents.push(wordComponent);
    });
  });

  // Create root container with perspective for depth
  const rootContainer: RenderableComponentData = {
    id: 'underwater-drift-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center overflow-hidden',
        style: {
          perspective: `${perspectiveDepth}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0
          ? Math.max(...captions.map((c) => c.absoluteEnd))
          : 10,
      },
    },
    childrenData: allWordComponents as RenderableComponentData[],
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

// --- PRESET METADATA ---

const presetMetadata: PresetMetadata = {
  id: 'underwaterDriftTypokinetics',
  title: 'Underwater Drift Typokinetics',
  description:
    'A sophisticated word-by-word typokinetics preset that creates a dreamlike underwater reading experience. Each word from caption data drifts horizontally at different speeds based on impact weight - impactful words move slower with more visual presence. Features staggered cascade entry timing, independent horizontal drift animations, and a cinematographic blur-to-focus effect as words pass through the center of the screen. The overall effect mimics reading text underwater with fluid, floating motion at varying depths.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typokinetics',
    'captions',
    'subtitles',
    'drift',
    'underwater',
    'dreamlike',
    'blur',
    'focus',
    'cinematic',
    'staggered',
    'cascade',
    'horizontal',
    'motion',
    'depth',
    'perspective',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Floating words drift slowly',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            id: 'word-1',
            text: 'Floating',
            start: 0,
            end: 0.8,
            duration: 0.8,
            absoluteStart: 0,
            absoluteEnd: 0.8,
          },
          {
            id: 'word-2',
            text: 'words',
            start: 0.8,
            end: 1.5,
            duration: 0.7,
            absoluteStart: 0.8,
            absoluteEnd: 1.5,
          },
          {
            id: 'word-3',
            text: 'drift',
            start: 1.5,
            end: 2.2,
            duration: 0.7,
            absoluteStart: 1.5,
            absoluteEnd: 2.2,
          },
          {
            id: 'word-4',
            text: 'slowly',
            start: 2.2,
            end: 3,
            duration: 0.8,
            absoluteStart: 2.2,
            absoluteEnd: 3,
          },
        ],
        metadata: {
          impact: 1.5,
        },
      },
    ],
    font: 'Inter:200:normal',
    textColor: '#ffffff',
    fontSize: 48,
    defaultImpact: 1.0,
    highImpactDurationPercent: 0.8,
    normalImpactDurationPercent: 0.6,
    blurIntensity: 2,
    perspectiveDepth: 1000,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- PRESET EXPORT ---

export const underwaterDriftTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
