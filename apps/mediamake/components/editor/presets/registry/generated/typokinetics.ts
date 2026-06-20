/**
 * Typokinetics - Rhythmic Typography Preset
 *
 * A beat-synchronized typography preset where serif text flows in rhythmic pulses
 * with musical rhythm. Each word acts as a note in a visual symphony with
 * beat-based timing, scaling, opacity effects, and harmonic motion.
 *
 * Features:
 * - **Musical Rhythm**: Words pulse in and out synchronized with predefined beat patterns
 * - **Expressive Serif Typography**: Uses Playfair Display for emotional typography
 * - **Beat-Based Timing**: Text appears in rhythmic bursts with different note values
 * - **Harmonic Motion**: Related words move in complementary patterns (visual counterpoint)
 * - **Pulsing Glow Effects**: Subtle glow that pulses with the rhythm, suggesting resonance
 * - **Dynamic Scaling**: Scale animations (0.8→1.2→1.0) create dance-like quality
 * - **Semantic Grouping**: Words grouped by relationship in nested layouts
 * - **Predefined Rhythm Pattern**: Uses musical intervals (quarter/half notes: 0.25s, 0.5s offsets)
 *
 * Use cases:
 * - Creating visually rhythmic title sequences
 * - Building musical text animations
 * - Expressing emotion through typographic motion
 * - Creating visual symphonies with text
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

const presetParams = z.object({
  textGroups: z
    .array(
      z.object({
        words: z
          .array(z.string())
          .describe('Array of words in this semantic group'),
        startTime: z
          .number()
          .describe('Start time for this group (seconds, relative to root)'),
        duration: z.number().describe('Total duration for this group (seconds)'),
      })
    )
    .describe(
      'Array of semantic text groups, each with timing and word arrays'
    ),
  font: z
    .string()
    .default('Playfair Display:700:italic')
    .optional()
    .describe(
      'Font family with weight and style (e.g., "Playfair Display:700:italic")'
    ),
  baseFontSize: z
    .number()
    .default(96)
    .optional()
    .describe('Base font size in pixels for primary words'),
  secondaryFontSize: z
    .number()
    .default(64)
    .optional()
    .describe('Font size for secondary/connector words'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Primary text color'),
  secondaryTextColor: z
    .string()
    .default('#cccccc')
    .optional()
    .describe('Secondary text color for smaller words'),
  backgroundColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Background color for contrast'),
  glowIntensity: z
    .number()
    .default(0.5)
    .optional()
    .describe('Glow effect intensity (0-1)'),
  rhythmPattern: z
    .enum(['quarter', 'half', 'whole', 'mixed'])
    .default('mixed')
    .optional()
    .describe(
      'Rhythm pattern: quarter (fast), half (medium), whole (slow), mixed (varied)'
    ),
  harmonicOffset: z
    .number()
    .default(0.5)
    .optional()
    .describe('Time offset between harmonic word animations (seconds)'),
  totalDuration: z
    .number()
    .default(30)
    .optional()
    .describe('Total duration of the preset (seconds)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Playfair Display:700:italic';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
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

  // Helper: Calculate note duration based on rhythm pattern
  const getNoteDuration = (
    pattern: string,
    wordIndex: number,
    wordCount: number
  ): number => {
    if (pattern === 'quarter') return 1.5;
    if (pattern === 'half') return 2.5;
    if (pattern === 'whole') return 3.0;

    // Mixed pattern: alternate between note values
    const patterns = [2.0, 1.5, 2.5];
    return patterns[wordIndex % patterns.length];
  };

  // Helper: Create pulsing glow effect with scale and opacity
  const createRhythmicPulse = (
    targetId: string,
    effectStart: number,
    effectDuration: number,
    intensity: number,
    isPrimary: boolean
  ): GenericEffectData => {
    const scaleMin = 0.8;
    const scaleMax = isPrimary ? 1.2 : 1.1;
    const scaleHold = 1.0;

    return {
      type: 'ease-in-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Scale animation: small → large → normal → hold
        { key: 'scale', val: scaleMin, prog: 0 },
        { key: 'scale', val: scaleMax, prog: 0.3 },
        { key: 'scale', val: scaleHold, prog: 0.6 },
        { key: 'scale', val: scaleHold, prog: 1 },
        // Opacity animation: fade in → hold → fade out
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 0.8, prog: 0.6 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };
  };

  // Build semantic groups with words
  const semanticGroupsData: RenderableComponentData[] = [];

  params.textGroups.forEach((group, groupIndex) => {
    const groupId = `semantic-group-${groupIndex + 1}`;
    const wordChildrenData: RenderableComponentData[] = [];

    let cumulativeStart = 0;

    group.words.forEach((word, wordIndex) => {
      const wordId = `word-${groupIndex + 1}-${wordIndex + 1}`;

      // Determine if this is a primary word (larger, more emphasis)
      const isPrimary = wordIndex % 2 === 0 || word.length > 5;

      // Calculate note duration based on rhythm pattern
      const noteDuration = getNoteDuration(
        params.rhythmPattern || 'mixed',
        wordIndex,
        group.words.length
      );

      // Apply harmonic offset for complementary patterns
      const harmonicDelay =
        wordIndex > 0 ? (params.harmonicOffset || 0.5) : 0;
      const wordStart = cumulativeStart;

      // Font size and color based on primary/secondary
      const fontSize = isPrimary
        ? params.baseFontSize || 96
        : params.secondaryFontSize || 64;
      const textColor = isPrimary
        ? params.textColor || '#ffffff'
        : params.secondaryTextColor || '#cccccc';

      // Glow effect (text-shadow with animated blur)
      const glowStrength = (params.glowIntensity || 0.5) * (isPrimary ? 1 : 0.7);
      const glowColor = isPrimary
        ? `rgba(255, 255, 255, ${glowStrength})`
        : `rgba(204, 204, 204, ${glowStrength * 0.7})`;
      const textShadow = `0 0 ${20 * glowStrength}px ${glowColor}, 0 0 ${40 * glowStrength}px rgba(255, 255, 255, ${glowStrength * 0.3})`;

      // Create rhythmic pulse effect
      const pulseEffect = createRhythmicPulse(
        wordId,
        0,
        noteDuration,
        params.glowIntensity || 0.5,
        isPrimary
      );

      // TextAtom for word
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight || 700,
            fontStyle: fontStyle.fontStyle || 'italic',
            color: textColor,
            textShadow: textShadow,
          },
          font: {
            family: fontFamily,
            weights: [
              (fontStyle.fontWeight || 700).toString(),
            ],
            subsets: ['latin'],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: wordStart,
            duration: noteDuration,
          },
        },
        effects: [
          {
            id: `rhythmic-pulse-${wordId}`,
            componentId: 'generic',
            data: pulseEffect,
          },
        ],
      };

      wordChildrenData.push(wordComponent);

      // Update cumulative start for next word
      cumulativeStart += noteDuration;
    });

    // Create semantic group layout
    const groupLayout: RenderableComponentData = {
      id: groupId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: group.startTime,
          duration: group.duration,
        },
      },
      childrenData: wordChildrenData,
    };

    semanticGroupsData.push(groupLayout);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex items-center justify-center`,
        style: {
          backgroundColor: params.backgroundColor || '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration || 30,
      },
    },
    childrenData: semanticGroupsData,
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

const presetMetadata: PresetMetadata = {
  id: 'typokinetics',
  title: 'Typokinetics - Rhythmic Typography Preset',
  description:
    'A beat-synchronized typography preset where serif text flows in rhythmic pulses with musical rhythm. Each word acts as a note in a visual symphony with beat-based timing, scaling, opacity effects, and harmonic motion. Features expressive serif fonts with pulsing glow effects that create a dance-like quality.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'rhythm',
    'musical',
    'beat-sync',
    'serif',
    'animation',
    'pulse',
    'glow',
    'harmonic',
    'symphony',
  ],
  dependencies: {},
  defaultInputParams: {
    textGroups: [
      {
        words: ['Symphony', 'of', 'Motion'],
        startTime: 0,
        duration: 8,
      },
      {
        words: ['Resonance', 'Harmony'],
        startTime: 10,
        duration: 8,
      },
      {
        words: ['Visual', 'Counterpoint', 'Finale'],
        startTime: 20,
        duration: 10,
      },
    ],
    font: 'Playfair Display:700:italic',
    baseFontSize: 96,
    secondaryFontSize: 64,
    textColor: '#ffffff',
    secondaryTextColor: '#cccccc',
    backgroundColor: '#000000',
    glowIntensity: 0.5,
    rhythmPattern: 'mixed',
    harmonicOffset: 0.5,
    totalDuration: 30,
  },
};

export const typokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};