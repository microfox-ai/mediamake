/**
 * Matrix Digital Rain Typokinetics Preset
 *
 * This preset creates an advanced Matrix-style digital rain effect using meaningful text
 * instead of random characters. It implements a complex compositing setup with multiple
 * text columns falling at different speeds, horizontal drift with sine-wave motion,
 * cascading opacity, color transitions, focus wave brightness scanning, and glitch effects.
 *
 * Features:
 * - **12-Column Grid Layout**: CSS Grid with 12 columns for organized text streams
 * - **Organic Motion**: Text falls with sine-wave horizontal drift (±20px) for curved paths
 * - **Cascading Opacity**: Fade in from 0 → 1 at 20% height, fade to 0.3 at bottom
 * - **Color Transition**: Animated from bright green rgb(0,255,0) to darker rgb(0,150,0)
 * - **Focus Wave Effect**: Moving brightness filter (1 → 1.5 → 1) with column staggering
 * - **Glitch Effects**: Occasional rapid translateX shifts (±5px) and textShadow flicker
 * - **Variable Timing**: Random start delays (0-2s) and durations (3-8s) per text element
 * - **Caption Integration**: Optional caption data parsing with impact-based distribution
 *
 * Use cases:
 * - Creating Matrix-style digital rain effects with meaningful text
 * - Building cyberpunk or tech-themed video intros/outros
 * - Adding digital/data visualization aesthetics
 * - Creating animated text backgrounds with depth and motion
 * - Simulating unstable data transmission effects
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

// ============================================================================
// PRESET PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(10)
    .describe('Duration of the preset in seconds'),
  captions: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z
          .array(
            z.object({
              text: z.string(),
              start: z.number(),
              absoluteStart: z.number(),
              end: z.number(),
              absoluteEnd: z.number(),
              duration: z.number(),
            }),
          )
          .optional(),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .optional()
    .describe('Optional caption data for meaningful text distribution'),
  defaultTexts: z
    .array(z.string())
    .default([
      'SYSTEM',
      'ACCESS',
      'GRANTED',
      'DATA',
      'STREAM',
      'NEURAL',
      'NETWORK',
      'ACTIVE',
      'PROTOCOL',
      'MATRIX',
      'ONLINE',
      'CYBER',
      'SPACE',
      'NODE',
      'DIGITAL',
      'RAIN',
      'SIGNAL',
      'CODE',
      'FLOW',
      'SYNC',
      'QUANTUM',
      'LINK',
      'VIRTUAL',
      'REALITY',
      'TERMINAL',
      'ENGAGE',
      'NOW',
    ])
    .describe('Default text content when captions are not provided'),
  textColor: z
    .string()
    .default('rgb(0, 255, 0)')
    .describe('Starting text color (bright green)'),
  textColorEnd: z
    .string()
    .default('rgb(0, 150, 0)')
    .describe('Ending text color (darker green)'),
  fontSize: z
    .number()
    .min(12)
    .max(36)
    .default(18)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('monospace')
    .describe('Font family (monospace recommended for Matrix style)'),
  driftAmount: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Horizontal drift amount in pixels (±)'),
  focusWaveIntensity: z
    .number()
    .min(1)
    .max(2)
    .default(1.5)
    .describe('Focus wave brightness peak intensity'),
  glitchFrequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Glitch effect frequency (0-1, higher = more frequent)'),
  minDuration: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .describe('Minimum fall duration in seconds'),
  maxDuration: z
    .number()
    .min(5)
    .max(15)
    .default(8)
    .describe('Maximum fall duration in seconds'),
  columnsCount: z
    .number()
    .min(6)
    .max(20)
    .default(12)
    .describe('Number of text columns'),
  textsPerColumn: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Number of text elements per column (when not using captions)'),
});

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    captions,
    defaultTexts,
    textColor,
    textColorEnd,
    fontSize,
    fontFamily,
    driftAmount,
    focusWaveIntensity,
    glitchFrequency,
    minDuration,
    maxDuration,
    columnsCount,
    textsPerColumn,
  } = params;

  // ============================================================================
  // HELPER FUNCTIONS (defined inside presetExecution)
  // ============================================================================

  /**
   * Generate random number within range
   */
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  /**
   * Parse captions to extract words with impact scores
   */
  const extractWordsFromCaptions = (
    captionData: TranscriptionSentence[],
  ): Array<{ text: string; impact: number }> => {
    const words: Array<{ text: string; impact: number }> = [];

    captionData.forEach((caption) => {
      const impact = caption.metadata?.impact ?? 1.0;
      if (caption.words && caption.words.length > 0) {
        caption.words.forEach((word) => {
          words.push({
            text: word.text,
            impact,
          });
        });
      } else {
        // Fallback: split caption text by spaces
        const captionWords = caption.text.split(/\s+/).filter((w) => w.length > 0);
        captionWords.forEach((word) => {
          words.push({
            text: word,
            impact,
          });
        });
      }
    });

    return words;
  };

  /**
   * Distribute words across columns based on impact scores
   */
  const distributeWordsAcrossColumns = (
    words: Array<{ text: string; impact: number }>,
    numColumns: number,
  ): string[][] => {
    const columns: string[][] = Array.from({ length: numColumns }, () => []);
    
    // Sort words by impact (high to low) for balanced distribution
    const sortedWords = [...words].sort((a, b) => b.impact - a.impact);
    
    // Distribute words round-robin to balance columns
    sortedWords.forEach((word, index) => {
      const columnIndex = index % numColumns;
      columns[columnIndex].push(word.text);
    });

    return columns;
  };

  /**
   * Generate default text distribution when captions not provided
   */
  const generateDefaultDistribution = (
    texts: string[],
    numColumns: number,
    textsPerCol: number,
  ): string[][] => {
    const columns: string[][] = Array.from({ length: numColumns }, () => []);
    
    let textIndex = 0;
    for (let col = 0; col < numColumns; col++) {
      for (let i = 0; i < textsPerCol; i++) {
        columns[col].push(texts[textIndex % texts.length]);
        textIndex++;
      }
    }

    return columns;
  };

  /**
   * Create falling text effect with drift, opacity, color, focus wave, and glitch
   */
  const createFallingTextEffect = (
    targetId: string,
    columnIndex: number,
    textIndex: number,
    fallDuration: number,
    startDelay: number,
  ): GenericEffectData[] => {
    const effects: GenericEffectData[] = [];
    
    // Calculate sine wave parameters for horizontal drift
    const driftFrequency = randomInRange(0.5, 1.5); // cycles per second
    const driftPhase = randomInRange(0, Math.PI * 2); // random starting phase

    // Main falling animation with drift and opacity cascade
    effects.push({
      type: 'linear',
      start: startDelay,
      duration: fallDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Vertical fall: -100% to 120%
        { key: 'translateY', val: '-100%', prog: 0 },
        { key: 'translateY', val: '120%', prog: 1 },
        
        // Horizontal drift (sine wave motion): start, peak, return pattern
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: driftAmount * Math.sin(driftPhase), prog: 0.25 },
        { key: 'translateX', val: driftAmount * Math.sin(driftPhase + Math.PI / 2), prog: 0.5 },
        { key: 'translateX', val: driftAmount * Math.sin(driftPhase + Math.PI), prog: 0.75 },
        { key: 'translateX', val: driftAmount * Math.sin(driftPhase + Math.PI * 1.5), prog: 1 },
        
        // Cascading opacity: fade in at top, peak at 20%, fade to 0.3 at bottom
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
        { key: 'opacity', val: 0.8, prog: 0.5 },
        { key: 'opacity', val: 0.3, prog: 1 },
        
        // Color transition: bright green to darker green
        { key: 'color', val: textColor, prog: 0 },
        { key: 'color', val: textColorEnd, prog: 1 },
      ],
    });

    // Focus wave effect (brightness filter)
    // Stagger timing based on column index for wave effect across columns
    const focusWaveDelay = startDelay + (columnIndex * 0.1);
    const focusWaveDuration = fallDuration * 0.3; // Wave passes through middle portion
    const focusWaveStart = focusWaveDelay + fallDuration * 0.2; // Start at 20% of fall

    effects.push({
      type: 'ease-in-out',
      start: focusWaveStart,
      duration: focusWaveDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'filter', val: 'brightness(1)', prog: 0 },
        { key: 'filter', val: `brightness(${focusWaveIntensity})`, prog: 0.5 },
        { key: 'filter', val: 'brightness(1)', prog: 1 },
      ],
    });

    // Glitch effect (occasional)
    // Randomly apply glitch based on frequency
    const shouldGlitch = Math.random() < glitchFrequency;
    if (shouldGlitch) {
      const glitchStart = startDelay + randomInRange(fallDuration * 0.3, fallDuration * 0.7);
      const glitchDuration = randomInRange(0.05, 0.15);
      const glitchShift = randomInRange(-5, 5);

      effects.push({
        type: 'linear',
        start: glitchStart,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Rapid horizontal shift
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: glitchShift, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
          
          // Text shadow flicker
          { key: 'textShadow', val: 'none', prog: 0 },
          { key: 'textShadow', val: `0 0 8px ${textColor}, 0 0 12px ${textColor}`, prog: 0.5 },
          { key: 'textShadow', val: 'none', prog: 1 },
        ],
      });
    }

    return effects;
  };

  // ============================================================================
  // TEXT DISTRIBUTION LOGIC
  // ============================================================================

  let columnTexts: string[][];

  if (captions && captions.length > 0) {
    // Use caption data
    const words = extractWordsFromCaptions(captions);
    columnTexts = distributeWordsAcrossColumns(words, columnsCount);
  } else {
    // Use default texts
    columnTexts = generateDefaultDistribution(defaultTexts, columnsCount, textsPerColumn);
  }

  // ============================================================================
  // BUILD COLUMN STRUCTURE
  // ============================================================================

  const columnComponents: RenderableComponentData[] = [];

  columnTexts.forEach((texts, columnIndex) => {
    const columnId = `matrix-column-${columnIndex}`;
    const textComponents: RenderableComponentData[] = [];

    texts.forEach((text, textIndex) => {
      const textId = `matrix-text-${columnIndex}-${textIndex}`;
      const fallDuration = randomInRange(minDuration, maxDuration);
      const startDelay = randomInRange(0, 2);

      // Create text effects
      const textEffects = createFallingTextEffect(
        textId,
        columnIndex,
        textIndex,
        fallDuration,
        startDelay,
      );

      // Create text atom
      const textAtom: RenderableComponentData = {
        id: textId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text,
          className: 'absolute whitespace-nowrap',
          style: {
            fontSize: `${fontSize}px`,
            fontFamily,
            color: textColor,
            fontWeight: 'bold',
          },
          font: {
            family: fontFamily,
            weights: ['700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: textEffects.map((effectData, effectIndex) => ({
          id: `${textId}-effect-${effectIndex}`,
          componentId: 'generic',
          data: effectData,
        })),
      };

      textComponents.push(textAtom);
    });

    // Create column container
    const columnContainer: RenderableComponentData = {
      id: columnId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden h-full',
          style: {},
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: textComponents,
    };

    columnComponents.push(columnContainer);
  });

  // ============================================================================
  // BUILD GRID CONTAINER
  // ============================================================================

  const gridContainer: RenderableComponentData = {
    id: 'matrix-grid-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `grid grid-cols-${columnsCount} gap-2 h-full`,
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: columnComponents,
  };

  // ============================================================================
  // BUILD ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'matrix-rain-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [gridContainer],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'matrixDigitalRainTypokinetics',
  title: 'Matrix Digital Rain Typokinetics',
  description:
    'Advanced Matrix-style digital rain effect with meaningful text, organic curved motion paths, cascading opacity, color transitions, focus wave scanning, and glitch effects. Features 12-column grid layout with variable timing and optional caption integration.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'matrix',
    'digital-rain',
    'typokinetics',
    'animated-text',
    'grid',
    'cyberpunk',
    'tech',
    'glitch',
    'focus-wave',
    'cascading',
    'motion',
    'drift',
    'green-text',
    'monospace',
  ],
  dependencies: {},
  defaultInputParams: {
    duration: 10,
    defaultTexts: [
      'SYSTEM',
      'ACCESS',
      'GRANTED',
      'DATA',
      'STREAM',
      'NEURAL',
      'NETWORK',
      'ACTIVE',
      'PROTOCOL',
      'MATRIX',
      'ONLINE',
      'CYBER',
      'SPACE',
      'NODE',
      'DIGITAL',
      'RAIN',
      'SIGNAL',
      'CODE',
      'FLOW',
      'SYNC',
      'QUANTUM',
      'LINK',
      'VIRTUAL',
      'REALITY',
      'TERMINAL',
      'ENGAGE',
      'NOW',
    ],
    textColor: 'rgb(0, 255, 0)',
    textColorEnd: 'rgb(0, 150, 0)',
    fontSize: 18,
    fontFamily: 'monospace',
    driftAmount: 20,
    focusWaveIntensity: 1.5,
    glitchFrequency: 0.3,
    minDuration: 3,
    maxDuration: 8,
    columnsCount: 12,
    textsPerColumn: 3,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const matrixDigitalRainTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
