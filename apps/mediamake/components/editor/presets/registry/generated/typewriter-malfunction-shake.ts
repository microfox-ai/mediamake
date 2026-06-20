/**
 * Typewriter Malfunction Shake Preset
 *
 * A vintage film noir typewriter effect where text trembles as if typed on a broken
 * mechanical keyboard. Features micro-bounces on character landing, irregular rhythm
 * suggesting mechanical failure, occasional double-strikes with offset duplicates,
 * vertical carriage bounce patterns, and random stuck-key violent shaking.
 *
 * Features:
 * - **Character Landing Bounce**: Each letter arrives with micro-bounce animation
 * - **Continuous Mechanical Shake**: Jittery horizontal shake using steps(1) for mechanical feel
 * - **Stuck Key Effect**: Random letters shake violently before settling
 * - **Double-Strike Effect**: Brief duplicate text layer with offset and opacity
 * - **Vertical Carriage Bounce**: Subtle oscillation mimicking carriage return mechanism
 * - **Typewriter Aesthetic**: Monospace font with vintage styling
 *
 * Use cases:
 * - Creating vintage film noir title sequences
 * - Building retro typewriter text effects
 * - Adding mechanical malfunction aesthetics
 * - Creating nostalgic title cards with dynamic glitches
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .optional()
    .describe('Static text to display (overrides captions if provided)'),
  captions: z
    .array(z.any())
    .optional()
    .describe(
      'Array of caption objects with text, start, duration, and words array',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#E0E0E0')
    .describe('Text color (vintage cream/gray recommended)'),
  backgroundColor: z
    .string()
    .default('#0a0a0a')
    .describe('Background color (dark recommended for noir aesthetic)'),
  malfunctionFrequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Probability of stuck-key malfunction per letter (0-1)'),
  malfunctionIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Intensity multiplier for malfunction effects'),
  doubleStrikeEnabled: z
    .boolean()
    .default(true)
    .describe('Enable double-strike duplicate text effect'),
  carriageBounceEnabled: z
    .boolean()
    .default(true)
    .describe('Enable vertical carriage bounce effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    captions,
    fontSize,
    textColor,
    backgroundColor,
    malfunctionFrequency,
    malfunctionIntensity,
    doubleStrikeEnabled,
    carriageBounceEnabled,
  } = params;

  // Helper: Generate seeded pseudo-random number (0-1) based on index
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  // Helper: Calculate bounce keyframes for landing effect
  const generateLandingBounce = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    const bounceDuration = Math.min(0.4, duration * 0.8);
    return {
      type: 'ease-out',
      start: startTime,
      duration: bounceDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Y bounce: from -5px to overshoot 2px, settle to 0
        { key: 'translateY', val: -5, prog: 0 },
        { key: 'translateY', val: 2, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
        // Opacity fade-in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ],
    };
  };

  // Helper: Generate continuous mechanical shake
  const generateContinuousShake = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    const shakeFrames = 20; // Number of shake keyframes
    const ranges = [];
    for (let i = 0; i <= shakeFrames; i++) {
      const prog = i / shakeFrames;
      const shakeSeed = (targetId.charCodeAt(0) || 1) * (i + 1);
      const shakeX = (seededRandom(shakeSeed) - 0.5) * 2; // -1 to 1px
      ranges.push({ key: 'translateX', val: shakeX, prog });
    }
    return {
      type: 'linear', // Use linear with many keyframes for steps-like feel
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper: Generate stuck-key violent shake
  const generateStuckKeyShake = (
    targetId: string,
    startTime: number,
  ): GenericEffectData => {
    const shakeDuration = 0.3 * malfunctionIntensity;
    const shakeAmplitude = 5 * malfunctionIntensity;
    const shakeFrames = 10;
    const ranges = [];
    for (let i = 0; i <= shakeFrames; i++) {
      const prog = i / shakeFrames;
      const shakeSeed = (targetId.charCodeAt(0) || 1) * (i + 10);
      const shakeX = (seededRandom(shakeSeed) - 0.5) * 2 * shakeAmplitude;
      const shakeY = (seededRandom(shakeSeed + 100) - 0.5) * 2 * shakeAmplitude;
      ranges.push({ key: 'translateX', val: shakeX, prog });
      ranges.push({ key: 'translateY', val: shakeY, prog });
    }
    return {
      type: 'linear',
      start: startTime,
      duration: shakeDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper: Generate carriage bounce effect
  const generateCarriageBounce = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    const bounceFrames = 20;
    const ranges = [];
    for (let i = 0; i <= bounceFrames; i++) {
      const prog = i / bounceFrames;
      const time = prog * duration;
      const bounceY = Math.sin(time * Math.PI * 2 * 2) * 2; // ±2px at 0.5s period
      ranges.push({ key: 'translateY', val: bounceY, prog });
    }
    return {
      type: 'linear',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Build child components based on text or captions
  const buildTextComponents = (): RenderableComponentData[] => {
    if (text) {
      // Static text mode - render word-by-word with sequential timing
      const words = text.split(' ');
      const wordDuration = 0.3; // Time per word
      const totalDuration = words.length * wordDuration + 2;

      const wordComponents = words.map((word, index) => {
        const wordId = `typewriter-word-${index}`;
        const wordStart = index * wordDuration;
        const isStuck = seededRandom(index * 7) < malfunctionFrequency;

        const effects: any[] = [];

        // Landing bounce
        effects.push(generateLandingBounce(wordId, wordStart, wordDuration));

        // Continuous shake (starts after landing)
        effects.push(
          generateContinuousShake(
            wordId,
            wordStart + 0.4,
            totalDuration - wordStart - 0.4,
          ),
        );

        // Stuck key shake
        if (isStuck) {
          const stuckStart = wordStart + 0.1;
          effects.push(generateStuckKeyShake(wordId, stuckStart));
        }

        return {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word,
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              fontWeight: 'normal',
              marginRight: '0.5em',
            },
            font: {
              family: 'Courier Prime',
              weights: ['400', '700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          effects: effects.map((effectData) => ({
            id: `${wordId}-effect-${effects.indexOf(effectData)}`,
            componentId: 'generic',
            data: effectData,
          })),
        };
      });

      return wordComponents;
    } else if (captions && captions.length > 0) {
      // Caption mode - render word-by-word from caption data
      const allWords: RenderableComponentData[] = [];
      let globalIndex = 0;

      (captions as TranscriptionSentence[]).forEach((caption) => {
        caption.words.forEach((word) => {
          const wordId = `typewriter-word-${globalIndex}`;
          const isStuck =
            seededRandom(globalIndex * 7) < malfunctionFrequency;

          const effects: any[] = [];

          // Landing bounce
          effects.push(
            generateLandingBounce(wordId, word.start, word.duration),
          );

          // Continuous shake (starts after landing)
          const shakeStart = word.start + Math.min(0.3, word.duration * 0.5);
          const shakeDuration = word.duration - (shakeStart - word.start);
          if (shakeDuration > 0) {
            effects.push(
              generateContinuousShake(wordId, shakeStart, shakeDuration),
            );
          }

          // Stuck key shake
          if (isStuck) {
            const stuckStart = word.start + 0.1;
            effects.push(generateStuckKeyShake(wordId, stuckStart));
          }

          allWords.push({
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                fontWeight: 'normal',
                marginRight: '0.5em',
              },
              font: {
                family: 'Courier Prime',
                weights: ['400', '700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: effects.map((effectData) => ({
              id: `${wordId}-effect-${effects.indexOf(effectData)}`,
              componentId: 'generic',
              data: effectData,
            })),
          });

          globalIndex++;
        });
      });

      return allWords;
    } else {
      // Fallback: render "TYPEWRITER" as placeholder
      const wordId = 'typewriter-word-0';
      return [
        {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: 'TYPEWRITER',
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              fontWeight: 'normal',
            },
            font: {
              family: 'Courier Prime',
              weights: ['400', '700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 5,
            },
          },
          effects: [
            {
              id: `${wordId}-landing`,
              componentId: 'generic',
              data: generateLandingBounce(wordId, 0, 0.4),
            },
            {
              id: `${wordId}-shake`,
              componentId: 'generic',
              data: generateContinuousShake(wordId, 0.4, 4.6),
            },
          ],
        },
      ];
    }
  };

  const wordComponents = buildTextComponents();

  // Calculate total duration
  const totalDuration = text
    ? wordComponents.length * 0.3 + 2
    : captions && captions.length > 0
      ? Math.max(...(captions as TranscriptionSentence[]).map((c) => c.end))
      : 5;

  // Main text container
  const mainTextContainerId = 'typewriter-main-container';
  const mainTextContainer: RenderableComponentData = {
    id: mainTextContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row flex-wrap items-center justify-center',
        style: {
          gap: '0.3em',
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
    effects: carriageBounceEnabled
      ? [
          {
            id: `${mainTextContainerId}-carriage`,
            componentId: 'generic',
            data: generateCarriageBounce(
              mainTextContainerId,
              0,
              totalDuration,
            ),
          },
        ]
      : [],
  };

  // Double-strike duplicate layer
  const doubleStrikeLayer: RenderableComponentData | null =
    doubleStrikeEnabled
      ? ({
          id: 'typewriter-double-strike',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className:
                'absolute inset-0 flex flex-row flex-wrap items-center justify-center pointer-events-none',
              style: {
                gap: '0.3em',
                transform: 'translate(2px, 1px)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          childrenData: wordComponents.map((word, index) => ({
            ...word,
            id: `${word.id}-double`,
            effects: [], // No effects on duplicate
          })),
          effects: [
            {
              id: 'double-strike-pulse',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: totalDuration,
                mode: 'provider',
                targetIds: ['typewriter-double-strike'],
                ranges: Array.from({ length: 20 }, (_, i) => {
                  const prog = i / 19;
                  const seed = i * 13;
                  const opacity = seededRandom(seed) > 0.7 ? 0.5 : 0;
                  return { key: 'opacity', val: opacity, prog };
                }),
              } as GenericEffectData,
            },
          ],
        } as RenderableComponentData)
      : null;

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-malfunction-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: backgroundColor,
          perspective: '1000px',
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
        id: 'typewriter-text-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative font-mono tracking-wider',
            style: {},
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [
          mainTextContainer,
          ...(doubleStrikeLayer ? [doubleStrikeLayer] : []),
        ],
      },
    ],
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

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'typewriter-malfunction-shake',
  title: 'Typewriter Malfunction Shake',
  description:
    'A vintage film noir typewriter effect where text trembles as if typed on a broken mechanical keyboard. Features micro-bounces on character landing, irregular rhythm suggesting mechanical failure, occasional double-strikes with offset duplicates, vertical carriage bounce patterns, and random stuck-key violent shaking. Creates an authentic vintage aesthetic with mechanical precision interrupted by chaotic malfunctions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typewriter',
    'malfunction',
    'vintage',
    'noir',
    'mechanical',
    'shake',
    'glitch',
    'retro',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'BREAKING NEWS FROM THE PRECINCT',
    fontSize: 48,
    textColor: '#E0E0E0',
    backgroundColor: '#0a0a0a',
    malfunctionFrequency: 0.3,
    malfunctionIntensity: 1.5,
    doubleStrikeEnabled: true,
    carriageBounceEnabled: true,
  },
};

// Export
export const typewriterMalfunctionShakePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
