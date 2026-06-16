/**
 * Typokinetics Highway Night Drive Preset
 *
 * This preset creates a dynamic kinetic typography effect where words emerge from fog/mist
 * in the distance and rush past like road signs on a highway at night. Features include:
 *
 * - **Depth-based blur and opacity**: Words start heavily blurred and low opacity (fog),
 *   then rapidly clarify as they approach the "headlight zone" where they become fully
 *   visible and bright with a glow effect.
 * - **Motion blur stretch**: As words pass by, they stretch horizontally (scaleX) and
 *   fade back into darkness.
 * - **Lateral positioning variance**: Words don't all follow the same center path - some
 *   pass on the left, some on the right, creating a dynamic scene.
 * - **Close calls**: 10% of words scale dramatically (2.5x) with shorter duration (2s)
 *   for a more intense effect.
 * - **Lane positioning**: Keywords (from caption metadata) take the center lane, while
 *   others are distributed to left/right lanes.
 *
 * Use cases:
 * - Creating kinetic typography effects for music videos
 * - Building dynamic text animations for social media content
 * - Adding highway/road-themed text effects to videos
 * - Creating immersive text experiences with depth and motion
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

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
            keyword: z.string().optional(),
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing data'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),

  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),

  normalDuration: z
    .number()
    .min(2)
    .max(6)
    .default(3.5)
    .describe('Duration for normal words in seconds'),

  closeCallDuration: z
    .number()
    .min(1)
    .max(4)
    .default(2)
    .describe('Duration for close-call words in seconds'),

  closeCallProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Probability of a word being a close-call (0-1)'),

  closeCallScale: z
    .number()
    .min(1.5)
    .max(4)
    .default(2.5)
    .describe('Scale multiplier for close-call words'),

  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Glow intensity in headlight zone (0-1)'),

  lateralRange: z
    .number()
    .min(10)
    .max(50)
    .default(30)
    .describe('Percentage range for lateral movement (-lateralRange% to +lateralRange%)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    normalDuration,
    closeCallDuration,
    closeCallProbability,
    closeCallScale,
    glowIntensity,
    lateralRange,
  } = params;

  // Parse font string
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Random lateral position (-lateralRange% to +lateralRange%)
  const getRandomLateralPosition = (): number => {
    return (Math.random() * 2 - 1) * lateralRange;
  };

  // Helper: Determine lane position based on keyword metadata
  const getLanePosition = (
    caption: TranscriptionSentence,
    wordIndex: number,
  ): number => {
    // If word is a keyword, center lane
    const keyword = caption.metadata?.keyword?.toLowerCase();
    const wordText = caption.words[wordIndex].text.toLowerCase();

    if (keyword && wordText === keyword) {
      return 0; // Center lane
    }

    // Otherwise, random left/right
    return getRandomLateralPosition();
  };

  // Helper: Check if word is close-call
  const isCloseCall = (): boolean => {
    return Math.random() < closeCallProbability;
  };

  // Helper: Create effect for a word
  const createWordEffect = (
    wordId: string,
    word: TranscriptionSentence['words'][0],
    duration: number,
    lateralX: number,
    isCloseCallWord: boolean,
  ): GenericEffectData => {
    // Phase durations (percentages of total duration)
    const approachPhase = 0.4; // 0-40%
    const headlightPhase = 0.2; // 40-60%
    const exitPhase = 0.4; // 60-100%

    // Scale values
    const maxScale = isCloseCallWord ? closeCallScale : 1;

    // Glow effect in headlight zone
    const glowShadow = `0 0 ${20 * glowIntensity}px rgba(255,255,255,${glowIntensity})`;

    return {
      type: 'linear',
      start: word.start,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // === APPROACH PHASE (0-40%): Emerge from fog ===
        // Start: Heavy blur, low opacity, small scale, far back (translateZ)
        { key: 'blur', val: '15px', prog: 0 },
        { key: 'opacity', val: 0.1, prog: 0 },
        { key: 'scale', val: 0.3, prog: 0 },
        { key: 'translateX', val: `${lateralX}%`, prog: 0 },
        { key: 'translateZ', val: -500, prog: 0 },

        // Mid-approach: Blur reducing, opacity increasing
        {
          key: 'blur',
          val: '8px',
          prog: approachPhase * 0.5,
        },
        {
          key: 'opacity',
          val: 0.4,
          prog: approachPhase * 0.5,
        },
        {
          key: 'scale',
          val: 0.6,
          prog: approachPhase * 0.5,
        },
        {
          key: 'translateZ',
          val: -250,
          prog: approachPhase * 0.5,
        },

        // End of approach (40%): Almost at headlight zone
        { key: 'blur', val: '2px', prog: approachPhase },
        { key: 'opacity', val: 0.8, prog: approachPhase },
        { key: 'scale', val: 0.9, prog: approachPhase },
        { key: 'translateZ', val: -50, prog: approachPhase },
        { key: 'translateX', val: `${lateralX}%`, prog: approachPhase },

        // === HEADLIGHT ZONE (40-60%): Fully visible and bright ===
        { key: 'blur', val: '0px', prog: approachPhase + 0.01 },
        { key: 'opacity', val: 1, prog: approachPhase + 0.01 },
        { key: 'scale', val: maxScale, prog: approachPhase + 0.01 },
        { key: 'translateZ', val: 0, prog: approachPhase + 0.01 },
        { key: 'textShadow', val: glowShadow, prog: approachPhase + 0.01 },
        { key: 'translateX', val: `${lateralX}%`, prog: approachPhase + 0.01 },

        // Hold in headlight zone
        {
          key: 'blur',
          val: '0px',
          prog: approachPhase + headlightPhase - 0.01,
        },
        {
          key: 'opacity',
          val: 1,
          prog: approachPhase + headlightPhase - 0.01,
        },
        {
          key: 'scale',
          val: maxScale,
          prog: approachPhase + headlightPhase - 0.01,
        },
        {
          key: 'translateZ',
          val: 0,
          prog: approachPhase + headlightPhase - 0.01,
        },
        {
          key: 'textShadow',
          val: glowShadow,
          prog: approachPhase + headlightPhase - 0.01,
        },
        {
          key: 'translateX',
          val: `${lateralX}%`,
          prog: approachPhase + headlightPhase - 0.01,
        },

        // === EXIT PHASE (60-100%): Pass by and fade ===
        // Start exit: Word passes by, begins to stretch and blur
        {
          key: 'blur',
          val: '4px',
          prog: approachPhase + headlightPhase + 0.01,
        },
        {
          key: 'opacity',
          val: 0.8,
          prog: approachPhase + headlightPhase + 0.01,
        },
        {
          key: 'scaleX',
          val: 1.2,
          prog: approachPhase + headlightPhase + 0.01,
        },
        { key: 'scaleY', val: maxScale, prog: approachPhase + headlightPhase + 0.01 },
        {
          key: 'translateZ',
          val: 100,
          prog: approachPhase + headlightPhase + 0.01,
        },
        {
          key: 'textShadow',
          val: 'none',
          prog: approachPhase + headlightPhase + 0.01,
        },
        {
          key: 'translateX',
          val: `${lateralX * 1.5}%`,
          prog: approachPhase + headlightPhase + 0.01,
        },

        // Mid-exit: More stretch, more blur, fading
        {
          key: 'blur',
          val: '6px',
          prog: approachPhase + headlightPhase + exitPhase * 0.5,
        },
        {
          key: 'opacity',
          val: 0.4,
          prog: approachPhase + headlightPhase + exitPhase * 0.5,
        },
        {
          key: 'scaleX',
          val: 1.4,
          prog: approachPhase + headlightPhase + exitPhase * 0.5,
        },
        {
          key: 'scaleY',
          val: maxScale * 0.9,
          prog: approachPhase + headlightPhase + exitPhase * 0.5,
        },
        {
          key: 'translateZ',
          val: 250,
          prog: approachPhase + headlightPhase + exitPhase * 0.5,
        },
        {
          key: 'translateX',
          val: `${lateralX * 2}%`,
          prog: approachPhase + headlightPhase + exitPhase * 0.5,
        },

        // End: Fade to darkness, heavy blur, stretched
        { key: 'blur', val: '8px', prog: 1 },
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'scaleX', val: 1.5, prog: 1 },
        { key: 'scaleY', val: maxScale * 0.8, prog: 1 },
        { key: 'translateZ', val: 500, prog: 1 },
        { key: 'translateX', val: `${lateralX * 3}%`, prog: 1 },
      ],
    };
  };

  // Build word components
  const wordComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const isCloseCallWord = isCloseCall();
      const duration = isCloseCallWord ? closeCallDuration : normalDuration;
      const lateralX = getLanePosition(caption, wordIndex);

      // Create word effect
      const wordEffect = createWordEffect(
        wordId,
        word,
        duration,
        lateralX,
        isCloseCallWord,
      );

      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: fontSize,
            color: textColor,
            ...fontStyle,
            fontWeight: fontStyle.fontWeight || 700,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        },
        context: {
          timing: {
            start: word.absoluteStart,
            duration: duration,
          },
        },
        effects: [
          {
            id: `effect-${wordId}`,
            componentId: 'generic',
            data: wordEffect,
          },
        ],
      };

      wordComponents.push(wordComponent);
    });
  });

  // Root container with fog layers
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-highway-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          captions.length > 0
            ? Math.max(
                ...captions.flatMap((c) =>
                  c.words.map((w) => {
                    const isCloseCallWord = isCloseCall();
                    const duration = isCloseCallWord
                      ? closeCallDuration
                      : normalDuration;
                    return w.absoluteStart + duration;
                  }),
                ),
              )
            : 10,
      },
    },
    childrenData: [
      // Fog layer back
      {
        id: 'fog-layer-back',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0) 60%)',
              zIndex: 1,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration:
              captions.length > 0
                ? Math.max(
                    ...captions.flatMap((c) =>
                      c.words.map((w) => {
                        const isCloseCallWord = isCloseCall();
                        const duration = isCloseCallWord
                          ? closeCallDuration
                          : normalDuration;
                        return w.absoluteStart + duration;
                      }),
                    ),
                  )
                : 10,
          },
        },
        childrenData: [],
      },
      // Words container
      {
        id: 'words-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              zIndex: 2,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration:
              captions.length > 0
                ? Math.max(
                    ...captions.flatMap((c) =>
                      c.words.map((w) => {
                        const isCloseCallWord = isCloseCall();
                        const duration = isCloseCallWord
                          ? closeCallDuration
                          : normalDuration;
                        return w.absoluteStart + duration;
                      }),
                    ),
                  )
                : 10,
          },
        },
        childrenData: wordComponents,
      },
      // Fog layer front
      {
        id: 'fog-layer-front',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.9) 100%)',
              zIndex: 3,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration:
              captions.length > 0
                ? Math.max(
                    ...captions.flatMap((c) =>
                      c.words.map((w) => {
                        const isCloseCallWord = isCloseCall();
                        const duration = isCloseCallWord
                          ? closeCallDuration
                          : normalDuration;
                        return w.absoluteStart + duration;
                      }),
                    ),
                  )
                : 10,
          },
        },
        childrenData: [],
      },
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-highway',
  title: 'Typokinetics Highway Night Drive',
  description:
    'Dynamic kinetic typography preset simulating words emerging from fog in the distance and rushing past like road signs on a highway at night. Features depth-based blur, opacity transitions, horizontal stretch motion blur, lateral positioning variance, dramatic scaling for close calls, and glow effects in the headlight zone.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'highway',
    'night',
    'fog',
    'motion-blur',
    'depth',
    'dynamic',
    'glow',
    'road-signs',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 1.0,
          },
          {
            id: 'word-2',
            text: 'world',
            start: 1.0,
            absoluteStart: 1.0,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.5,
          },
        ],
        metadata: {
          keyword: 'Hello',
        },
      },
    ],
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#FFFFFF',
    normalDuration: 3.5,
    closeCallDuration: 2,
    closeCallProbability: 0.1,
    closeCallScale: 2.5,
    glowIntensity: 0.8,
    lateralRange: 30,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const typokineticsHighwayPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
