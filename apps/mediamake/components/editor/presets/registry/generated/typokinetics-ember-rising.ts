/**
 * Typokinetics Ember Rising Preset
 *
 * Creates a captivating "ember rising from fire" effect where caption words materialize
 * as glowing embers from the bottom of the screen, floating upward like sparks from a campfire.
 * Features realistic physics with initial fast rise that decelerates, flickering intensity,
 * heat distortion shimmer, random horizontal drift, depth layering, and dramatic burn-out effects.
 *
 * Visual Features:
 * - Glowing ember appearance with orange-to-gray color transitions
 * - Flickering intensity (opacity pulsing between 0.4-1.0)
 * - Rising motion with ease-out physics (faster start, slower as they rise)
 * - Subtle horizontal drift (sine wave ±15px)
 * - Heat shimmer distortion (rapid scaleX oscillation 0.98-1.02)
 * - Text glow effect via textShadow
 * - Burnout mechanic: 20% of words fade to opacity 0 before reaching top
 * - Three depth layers (far/mid/near) with different sizes and dimness
 * - Ember bursts: High-impact words trigger simultaneous appearance of multiple embers
 * - Gradient background: Orange-900 to Gray-900 (fire to smoke)
 *
 * Technical Implementation:
 * - Root container: BaseLayout with gradient background
 * - Three z-indexed layers for depth (far=1, mid=2, near=3)
 * - Words positioned absolutely at bottom with random horizontal start
 * - Effects: translateY (100% to -120%), translateX (sine drift), opacity flicker,
 *   scale pulse, color animation, and scaleX shimmer
 * - Rise duration: 4-7s randomized per word
 * - High-impact words (from caption metadata) glow brighter and last longer
 *
 * Use Cases:
 * - Poetic or dramatic content
 * - Music videos with emotional lyrics
 * - Storytelling with visual metaphor
 * - Spiritual or philosophical content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// --- Parameter Schema ---
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),

  fontSize: z
    .number()
    .min(12)
    .max(60)
    .default(28)
    .optional()
    .describe('Base font size for mid-layer embers (px)'),

  font: z
    .string()
    .default('Inter:600')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Roboto:600", "Inter:700")',
    ),

  emberColor: z
    .string()
    .default('rgb(251,146,60)')
    .optional()
    .describe('Starting ember color (bright orange)'),

  burnoutRate: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Fraction of words that burn out before reaching top (0-1)'),

  driftAmount: z
    .number()
    .min(0)
    .max(50)
    .default(15)
    .optional()
    .describe('Horizontal drift range in pixels (±value)'),

  shimmerFrequency: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .optional()
    .describe('Duration of one heat shimmer oscillation cycle (seconds)'),

  impactMultiplier: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .optional()
    .describe(
      'Multiplier for high-impact words (brighter, longer duration, larger size)',
    ),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { captions, fontSize, font, emberColor, burnoutRate, driftAmount, shimmerFrequency, impactMultiplier } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter:600');

  // Helper: Random number generator
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  // Helper: Determine depth layer for word
  const getDepthLayer = (wordIndex: number, totalWords: number) => {
    const ratio = wordIndex / totalWords;
    if (ratio < 0.3) return 'far';
    if (ratio < 0.7) return 'mid';
    return 'near';
  };

  // Helper: Layer properties
  const layerProps = {
    far: { fontSize: fontSize! * 0.64, opacity: 0.5, zIndex: 1 },
    mid: { fontSize: fontSize!, opacity: 0.8, zIndex: 2 },
    near: { fontSize: fontSize! * 1.43, opacity: 1, zIndex: 3 },
  };

  // Collect all words across captions with metadata
  interface EmberWord {
    word: { text: string; start: number; absoluteStart: number; duration: number };
    captionAbsoluteStart: number;
    captionDuration: number;
    isHighImpact: boolean;
    layer: 'far' | 'mid' | 'near';
  }

  const allEmberWords: EmberWord[] = [];
  let wordIndex = 0;

  captions.forEach((caption) => {
    const isHighImpact = (caption.metadata?.impact ?? 1) > 1;
    const totalWords = caption.words.length;

    caption.words.forEach((word) => {
      const layer = getDepthLayer(wordIndex, captions.reduce((sum, c) => sum + c.words.length, 0));
      allEmberWords.push({
        word,
        captionAbsoluteStart: caption.absoluteStart,
        captionDuration: caption.duration,
        isHighImpact,
        layer,
      });
      wordIndex++;
    });
  });

  // Create ember word components
  const emberComponents: RenderableComponentData[] = [];

  allEmberWords.forEach((emberWord, index) => {
    const { word, captionAbsoluteStart, captionDuration, isHighImpact, layer } = emberWord;
    const layerConfig = layerProps[layer];

    // Randomize parameters
    const riseDuration = random(4, 7);
    const shouldBurnOut = Math.random() < burnoutRate!;
    const horizontalStart = random(10, 90); // % from left
    const driftPhaseOffset = random(0, Math.PI * 2); // Random sine phase

    // Calculate impact
    const impact = isHighImpact ? impactMultiplier! : 1;
    const wordFontSize = layerConfig.fontSize * impact;
    const glowIntensity = 10 * impact;

    // Word ID
    const wordId = `ember-word-${index}`;

    // Effects
    const effects: any[] = [];

    // 1. Rise effect (translateY: 100% to -120%)
    const riseEffect: GenericEffectData = {
      type: 'ease-out',
      start: word.start,
      duration: riseDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'translateY', val: 100, prog: 0 },  // Start at bottom (100% = below viewport)
        { key: 'translateY', val: -120, prog: 1 }, // End above viewport
      ],
    };
    effects.push({
      id: `${wordId}-rise`,
      componentId: 'generic',
      data: riseEffect,
    });

    // 2. Horizontal drift (sine wave ±driftAmount)
    const driftEffect: GenericEffectData = {
      type: 'linear',
      start: word.start,
      duration: riseDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'translateX', val: Math.sin(driftPhaseOffset) * driftAmount!, prog: 0 },
        { key: 'translateX', val: Math.sin(driftPhaseOffset + Math.PI / 2) * driftAmount!, prog: 0.25 },
        { key: 'translateX', val: Math.sin(driftPhaseOffset + Math.PI) * driftAmount!, prog: 0.5 },
        { key: 'translateX', val: Math.sin(driftPhaseOffset + (3 * Math.PI) / 2) * driftAmount!, prog: 0.75 },
        { key: 'translateX', val: Math.sin(driftPhaseOffset + 2 * Math.PI) * driftAmount!, prog: 1 },
      ],
    };
    effects.push({
      id: `${wordId}-drift`,
      componentId: 'generic',
      data: driftEffect,
    });

    // 3. Flicker effect (opacity 0.4 to 1 randomly)
    const flickerKeyframes = [];
    const flickerSteps = 20;
    for (let i = 0; i <= flickerSteps; i++) {
      const prog = i / flickerSteps;
      const opacity = random(0.4, 1);
      flickerKeyframes.push({ key: 'opacity', val: opacity, prog });
    }
    const flickerEffect: GenericEffectData = {
      type: 'linear',
      start: word.start,
      duration: riseDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: flickerKeyframes,
    };
    effects.push({
      id: `${wordId}-flicker`,
      componentId: 'generic',
      data: flickerEffect,
    });

    // 4. Scale pulsing (0.9 to 1.1)
    const scaleEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: word.start,
      duration: riseDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 0.9, prog: 0 },
        { key: 'scale', val: 1.1, prog: 0.5 },
        { key: 'scale', val: 0.9, prog: 1 },
      ],
    };
    effects.push({
      id: `${wordId}-scale`,
      componentId: 'generic',
      data: scaleEffect,
    });

    // 5. Color animation (bright orange -> pale orange -> gray)
    const colorEffect: GenericEffectData = {
      type: 'ease-out',
      start: word.start,
      duration: riseDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'color', val: emberColor!, prog: 0 },
        { key: 'color', val: 'rgb(254,215,170)', prog: 0.6 },
        { key: 'color', val: 'rgb(156,163,175)', prog: 1 },
      ],
    };
    effects.push({
      id: `${wordId}-color`,
      componentId: 'generic',
      data: colorEffect,
    });

    // 6. Heat shimmer (scaleX oscillation 0.98-1.02)
    const shimmerCycles = Math.ceil(riseDuration / shimmerFrequency!);
    const shimmerKeyframes = [];
    for (let i = 0; i <= shimmerCycles * 4; i++) {
      const prog = Math.min(i / (shimmerCycles * 4), 1);
      const phase = (i % 4) / 4; // 0, 0.25, 0.5, 0.75 repeating
      const scaleX = 1 + 0.02 * Math.sin(phase * Math.PI * 2);
      shimmerKeyframes.push({ key: 'scaleX', val: scaleX, prog });
    }
    const shimmerEffect: GenericEffectData = {
      type: 'linear',
      start: word.start,
      duration: riseDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: shimmerKeyframes,
    };
    effects.push({
      id: `${wordId}-shimmer`,
      componentId: 'generic',
      data: shimmerEffect,
    });

    // 7. Burn out effect (20% of words fade to 0 before reaching top)
    if (shouldBurnOut) {
      const burnoutStart = word.start + riseDuration * 0.6;
      const burnoutDuration = riseDuration * 0.4;
      const burnoutEffect: GenericEffectData = {
        type: 'ease-in',
        start: burnoutStart,
        duration: burnoutDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };
      effects.push({
        id: `${wordId}-burnout`,
        componentId: 'generic',
        data: burnoutEffect,
      });
    }

    // Create word component
    const wordComponent: RenderableComponentData = {
      id: wordId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            bottom: 0,
            left: `${horizontalStart}%`,
          },
        },
      },
      context: {
        timing: {
          start: captionAbsoluteStart,
          duration: captionDuration + 7, // Extended to allow full rise
        },
      },
      effects: effects,
      childrenData: [
        {
          id: `${wordId}-text`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              color: emberColor,
              fontSize: `${wordFontSize}px`,
              fontWeight: fontStyle.fontWeight || 600,
              textShadow: `0 0 ${glowIntensity}px currentColor`,
            },
            font: {
              family: fontFamily,
              weights: [String(fontStyle.fontWeight || 600)],
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;

    emberComponents.push(wordComponent);
  });

  // Group components by layer
  const farLayerComponents = emberComponents.filter((c) =>
    allEmberWords.find(
      (w) => `ember-word-${allEmberWords.indexOf(w)}` === c.id && w.layer === 'far',
    ),
  );
  const midLayerComponents = emberComponents.filter((c) =>
    allEmberWords.find(
      (w) => `ember-word-${allEmberWords.indexOf(w)}` === c.id && w.layer === 'mid',
    ),
  );
  const nearLayerComponents = emberComponents.filter((c) =>
    allEmberWords.find(
      (w) => `ember-word-${allEmberWords.indexOf(w)}` === c.id && w.layer === 'near',
    ),
  );

  // Root container with gradient background
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-ember-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-t from-orange-900 to-gray-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(...captions.map((c) => c.absoluteEnd)) + 7,
      },
    },
    childrenData: [
      // Far layer (z-index: 1)
      {
        id: 'far-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: { zIndex: 1 },
          },
        },
        childrenData: farLayerComponents,
      } as RenderableComponentData,
      // Mid layer (z-index: 2)
      {
        id: 'mid-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: { zIndex: 2 },
          },
        },
        childrenData: midLayerComponents,
      } as RenderableComponentData,
      // Near layer (z-index: 3)
      {
        id: 'near-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: { zIndex: 3 },
          },
        },
        childrenData: nearLayerComponents,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-ember-rising',
  title: 'Typokinetics Ember Rising',
  description:
    'Dynamic typokinetic preset where caption words materialize as glowing embers rising from bottom with realistic physics, flicker effects, heat distortion, depth layers, and ember bursts. Words float upward with varying intensity, drift, and burnout patterns.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'typokinetics',
    'ember',
    'fire',
    'particles',
    'kinetic',
    'depth',
    'physics',
    'glow',
    'flicker',
    'dramatic',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    captions: [],
    fontSize: 28,
    font: 'Inter:600',
    emberColor: 'rgb(251,146,60)',
    burnoutRate: 0.2,
    driftAmount: 15,
    shimmerFrequency: 0.1,
    impactMultiplier: 1.2,
  },
};

// --- Export ---
export const typokineticsEmberRisingPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
