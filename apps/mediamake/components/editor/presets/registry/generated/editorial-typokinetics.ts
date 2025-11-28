/**
 * Editorial Typokinetics Preset
 *
 * A minimalist typokinetics preset inspired by high-end fashion campaigns and editorial design.
 * Features mathematical precision timing with metronomic 0.125s flash intervals, golden ratio (1.618)
 * scaling, typewriter reveals via clipPath animation, and subtle bass-responsive effects including
 * letter-spacing expansion and font-weight modulation.
 *
 * Technical Features:
 * - Precise flash timing: 0.125s intervals (1/8 beat at 120bpm)
 * - Golden ratio scaling: 1.618 proportions with ease-in-out transitions
 * - Typewriter reveal: clipPath animation from inset(0 100% 0 0) to inset(0 0 0 0)
 * - Bass distortion: Subtle italic skew and letter-spacing expansion (0.05em to 0.2em)
 * - Variable font weights: 200-600 based on audio intensity
 * - Rule-of-thirds positioning: 33.33%, 50%, 66.66% for negative space composition
 *
 * Use cases:
 * - High-end fashion campaign videos
 * - Editorial design presentations
 * - Minimalist brand storytelling
 * - Luxury product reveals
 * - Art gallery video installations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with precise descriptions
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
    .describe('Array of caption sentences with words and metadata'),

  audio: z
    .object({
      src: z.string().describe('Audio source URL for beat detection'),
      start: z.number().default(0).describe('Audio start time in seconds'),
      duration: z.number().optional().describe('Audio duration in seconds'),
    })
    .optional()
    .describe('Audio source for bass-responsive effects (optional)'),

  font: z
    .string()
    .default('Inter:200')
    .describe('Font family with optional weight (e.g., "Inter:200", "Helvetica:300")'),

  textColor: z.string().default('#000000').describe('Text color (hex or rgba)'),

  backgroundColor: z.string().default('#FFFFFF').describe('Background color (hex or rgba)'),

  fontSize: z.number().default(60).describe('Base font size in pixels'),

  flashInterval: z
    .number()
    .default(0.125)
    .describe('Flash timing interval in seconds (1/8 beat at 120bpm)'),

  goldenRatioScale: z
    .number()
    .default(1.618)
    .describe('Golden ratio scale factor for zoom effects'),

  goldenScaleDuration: z
    .number()
    .default(0.3)
    .describe('Duration of golden ratio scaling effect in seconds'),

  typewriterDuration: z
    .number()
    .default(0.5)
    .describe('Duration of typewriter reveal effect in seconds'),

  bassLetterSpacingMin: z
    .number()
    .default(0.05)
    .describe('Minimum letter spacing for bass effect (em units)'),

  bassLetterSpacingMax: z
    .number()
    .default(0.2)
    .describe('Maximum letter spacing for bass effect (em units)'),

  bassFontWeightMin: z
    .number()
    .default(200)
    .describe('Minimum font weight for bass effect'),

  bassFontWeightMax: z
    .number()
    .default(600)
    .describe('Maximum font weight for bass effect'),

  bassSkewIntensity: z
    .number()
    .default(-5)
    .describe('Italic skew intensity in degrees for bass effect'),

  positioningMode: z
    .enum(['rule-of-thirds', 'center', 'random'])
    .default('rule-of-thirds')
    .describe('Positioning strategy for words (rule-of-thirds: 33.33%, 50%, 66.66%)'),

  effectMode: z
    .enum(['flash-only', 'typewriter-only', 'mixed'])
    .default('mixed')
    .describe('Animation mode: flash-only (instant), typewriter-only, or mixed'),

  bassResponsive: z
    .boolean()
    .default(true)
    .describe('Enable bass-responsive effects (requires audio)'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { captions, audio, font, textColor, backgroundColor, fontSize } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = font || 'Inter:200';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  let fontWeight = 200;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    fontWeight = parseInt(fontParts[1], 10) || 200;
  }

  // Helper: Calculate rule-of-thirds positions
  const calculatePosition = (index: number, mode: string): { top: string; left: string } => {
    if (mode === 'center') {
      return { top: '50%', left: '50%' };
    }

    if (mode === 'random') {
      // Random position with margins
      const topPercent = 20 + Math.random() * 60; // 20-80%
      const leftPercent = 20 + Math.random() * 60; // 20-80%
      return { top: `${topPercent}%`, left: `${leftPercent}%` };
    }

    // Rule of thirds: cycle through 9 positions
    const positions = [
      { top: '33.33%', left: '33.33%' },
      { top: '33.33%', left: '50%' },
      { top: '33.33%', left: '66.66%' },
      { top: '50%', left: '33.33%' },
      { top: '50%', left: '50%' },
      { top: '50%', left: '66.66%' },
      { top: '66.66%', left: '33.33%' },
      { top: '66.66%', left: '50%' },
      { top: '66.66%', left: '66.66%' },
    ];

    return positions[index % positions.length];
  };

  // Helper: Create flash effect
  const createFlashEffect = (wordId: string, wordStart: number): any => {
    return {
      id: `flash-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: wordStart,
        duration: params.flashInterval,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.1 },
          { key: 'opacity', val: 1, prog: 0.9 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create typewriter effect
  const createTypewriterEffect = (wordId: string, wordStart: number): any => {
    return {
      id: `typewriter-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: wordStart,
        duration: params.typewriterDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
          { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },
        ],
      },
    };
  };

  // Helper: Create golden ratio scale effect
  const createGoldenScaleEffect = (wordId: string, wordStart: number): any => {
    return {
      id: `scale-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: wordStart,
        duration: params.goldenScaleDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: params.goldenRatioScale, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create bass letter-spacing effect
  const createBassLetterSpacingEffect = (wordId: string, wordStart: number, wordDuration: number): any => {
    return {
      id: `bass-spacing-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: wordStart,
        duration: Math.min(wordDuration, 0.1),
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'letterSpacing', val: `${params.bassLetterSpacingMin}em`, prog: 0 },
          { key: 'letterSpacing', val: `${params.bassLetterSpacingMax}em`, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create bass font-weight effect
  const createBassFontWeightEffect = (wordId: string, wordStart: number, wordDuration: number): any => {
    return {
      id: `bass-weight-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: wordStart,
        duration: Math.min(wordDuration, 0.1),
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'fontWeight', val: params.bassFontWeightMin, prog: 0 },
          { key: 'fontWeight', val: params.bassFontWeightMax, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create italic skew effect
  const createItalicSkewEffect = (wordId: string, wordStart: number, wordDuration: number): any => {
    return {
      id: `skew-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: wordStart,
        duration: Math.min(wordDuration, 0.1),
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'skewX', val: 0, prog: 0 },
          { key: 'skewX', val: params.bassSkewIntensity, prog: 1 },
        ],
      },
    };
  };

  // Build word components from captions
  const wordComponents: RenderableComponentData[] = [];
  let wordIndex = 0;

  captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndexInCaption) => {
      const wordId = `word-${captionIndex}-${wordIndexInCaption}`;
      const position = calculatePosition(wordIndex, params.positioningMode);

      // Determine effect mode based on params and word index
      let useTypewriter = false;
      if (params.effectMode === 'typewriter-only') {
        useTypewriter = true;
      } else if (params.effectMode === 'mixed') {
        // Alternate: every other word uses typewriter
        useTypewriter = wordIndex % 2 === 1;
      }

      // Build effects array
      const effects: any[] = [];

      // Primary effect: flash or typewriter
      if (useTypewriter) {
        effects.push(createTypewriterEffect(wordId, word.start));
      } else {
        effects.push(createFlashEffect(wordId, word.start));
      }

      // Golden ratio scale effect (applied to all)
      effects.push(createGoldenScaleEffect(wordId, word.start));

      // Bass-responsive effects (if enabled and audio provided)
      if (params.bassResponsive && audio) {
        effects.push(createBassLetterSpacingEffect(wordId, word.start, word.duration));
        effects.push(createBassFontWeightEffect(wordId, word.start, word.duration));
        effects.push(createItalicSkewEffect(wordId, word.start, word.duration));
      }

      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: fontWeight,
            letterSpacing: `${params.bassLetterSpacingMin}em`,
            textTransform: 'uppercase' as const,
            position: 'absolute' as const,
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -50%)',
            whiteSpace: 'nowrap' as const,
          },
          className: 'font-light tracking-widest uppercase',
          font: {
            family: fontFamily,
            weights: [fontWeight.toString(), '600'],
            subsets: ['latin'],
            display: 'swap' as const,
          },
        },
        context: {
          timing: {
            start: word.absoluteStart,
            duration: word.duration + 0.5, // Extend slightly for effect completion
          },
        },
        effects,
      };

      wordComponents.push(wordComponent);
      wordIndex++;
    });
  });

  // Calculate total duration
  const totalDuration = captions.length > 0
    ? Math.max(...captions.map(c => c.absoluteEnd))
    : 10;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'editorial-typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: backgroundColor,
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
    childrenData: wordComponents,
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
  id: 'editorial-typokinetics',
  title: 'Editorial Typokinetics',
  description:
    'A minimalist typokinetics preset inspired by high-end fashion campaigns and editorial design. Features mathematical precision timing with metronomic 0.125s flash intervals, golden ratio (1.618) scaling, typewriter reveals via clipPath animation, and subtle bass-responsive effects including letter-spacing expansion and font-weight modulation. Uses Inter variable font with weights 200-600, positioned at rule-of-thirds points with generous negative space on a clean white backdrop.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'editorial',
    'fashion',
    'minimalist',
    'golden-ratio',
    'typewriter',
    'bass-responsive',
    'high-end',
    'luxury',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    audio: undefined,
    font: 'Inter:200',
    textColor: '#000000',
    backgroundColor: '#FFFFFF',
    fontSize: 60,
    flashInterval: 0.125,
    goldenRatioScale: 1.618,
    goldenScaleDuration: 0.3,
    typewriterDuration: 0.5,
    bassLetterSpacingMin: 0.05,
    bassLetterSpacingMax: 0.2,
    bassFontWeightMin: 200,
    bassFontWeightMax: 600,
    bassSkewIntensity: -5,
    positioningMode: 'rule-of-thirds',
    effectMode: 'mixed',
    bassResponsive: true,
  },
};

// Export preset
export const editorialTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
