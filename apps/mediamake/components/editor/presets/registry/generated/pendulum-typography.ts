/**
 * Pendulum Typography Preset
 *
 * Creates hypnotic text animation where words swing like clock pendulums with realistic physics.
 * Each word hangs from an invisible pivot point with gravity-based motion. Longer words have
 * longer pendulum strings resulting in slower swing periods. Features Newton's Cradle momentum
 * transfer effect between adjacent words and natural damping where swings gradually decrease
 * over time. Creates a meditative, mesmerizing visual experience.
 *
 * Features:
 * - Realistic pendulum physics using sine functions with gravity constant
 * - Dynamic pendulum lengths based on word length (longer strings = slower periods)
 * - Newton's Cradle momentum transfer between adjacent words
 * - Natural damping where swings gradually decrease over time
 * - Pivot points positioned above viewport with negative top values
 * - Subtle string stretch effect at swing extremes
 * - Transform-origin set to pivot point for accurate rotation
 * - 3D perspective for depth effect
 *
 * Use cases:
 * - Creating meditative, hypnotic text animations
 * - Building physics-based typography effects
 * - Creating soothing subtitle presentations
 * - Adding calming visual experiences to content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfex/datamotion';

// Parameter schema
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
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
          }),
        ),
      }),
    )
    .describe('Array of caption sentences with word timing data'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Base font size for words in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the text (CSS color value)'),

  pivotHeight: z
    .number()
    .min(-200)
    .max(-20)
    .default(-100)
    .describe(
      'Height of pivot point above viewport (negative value, higher = more space)',
    ),

  minStringLength: z
    .number()
    .min(100)
    .max(300)
    .default(150)
    .describe('Minimum pendulum string length in pixels'),

  maxStringLength: z
    .number()
    .min(200)
    .max(500)
    .default(300)
    .describe('Maximum pendulum string length in pixels'),

  swingAmplitude: z
    .number()
    .min(5)
    .max(45)
    .default(20)
    .describe('Maximum swing angle in degrees'),

  dampingFactor: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe(
      'Damping factor for swing decay (0 = no damping, 1 = immediate stop)',
    ),

  gravityConstant: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Gravity constant multiplier (affects swing speed)'),

  cradle: z
    .boolean()
    .default(true)
    .describe(
      'Enable Newton\'s Cradle momentum transfer effect between words',
    ),

  phaseOffset: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe(
      'Phase offset between adjacent words for Newton\'s Cradle effect (0-1)',
    ),

  showStrings: z
    .boolean()
    .default(true)
    .describe('Show visual pendulum strings'),

  stringColor: z
    .string()
    .default('rgba(255,255,255,0.3)')
    .describe('Color of the pendulum strings'),

  stringWidth: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Width of the pendulum strings in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
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

  // Helper: Calculate pendulum length based on word length
  const calculatePendulumLength = (wordLength: number): number => {
    const minLen = params.minStringLength;
    const maxLen = params.maxStringLength;
    // Longer words get longer strings
    const normalized = Math.min(wordLength / 15, 1); // Normalize to 0-1 (15 chars = max)
    return minLen + normalized * (maxLen - minLen);
  };

  // Helper: Calculate swing period based on pendulum length (T = 2π√(L/g))
  const calculatePeriod = (length: number): number => {
    const g = 9.8 * params.gravityConstant; // Gravity constant
    return 2 * Math.PI * Math.sqrt(length / (g * 100)); // Scale for visual effect
  };

  const allWordComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const words = caption.words || [];
    if (words.length === 0) return;

    words.forEach((word, wordIndex) => {
      const wordId = `pendulum-word-${captionIndex}-${wordIndex}`;
      const wordLength = word.text.length;

      // Calculate pendulum properties
      const stringLength = calculatePendulumLength(wordLength);
      const period = calculatePeriod(stringLength);
      const amplitude = params.swingAmplitude;

      // Newton's Cradle phase offset
      const phaseShift = params.cradle ? wordIndex * params.phaseOffset : 0;

      // Position word horizontally (evenly spaced)
      const totalWords = words.length;
      const spacing = 100 / (totalWords + 1);
      const leftPosition = spacing * (wordIndex + 1);

      // Create container for word + string
      const wordContainerId = `${wordId}-container`;

      // Pendulum swing effect with damping
      const swingEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: word.duration,
        mode: 'provider',
        targetIds: [wordContainerId],
        ranges: [] as any[],
      };

      // Generate keyframes for pendulum motion
      const keyframeCount = 20;
      for (let i = 0; i <= keyframeCount; i++) {
        const progress = i / keyframeCount;
        const time = progress * word.duration;

        // Damping: exponential decay
        const dampingDecay = Math.exp(-params.dampingFactor * time);

        // Pendulum equation: θ(t) = A * cos(2πt/T + φ) * e^(-bt)
        const angle =
          amplitude *
          Math.cos((2 * Math.PI * time) / period + phaseShift * 2 * Math.PI) *
          dampingDecay;

        swingEffect.ranges.push({
          key: 'rotateZ',
          val: angle,
          prog: progress,
        });

        // Subtle string stretch at extremes
        const stretchFactor = 1 + Math.abs(Math.sin((Math.PI * time) / period)) * 0.02;
        swingEffect.ranges.push({
          key: 'translateY',
          val: (stretchFactor - 1) * stringLength * 0.5,
          prog: progress,
        });
      }

      // Word container (pivot point)
      const wordContainer: RenderableComponentData = {
        id: wordContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              top: `${params.pivotHeight}px`,
              left: `${leftPosition}%`,
              width: 'auto',
              height: `${Math.abs(params.pivotHeight) + stringLength + 100}px`,
              transformOrigin: 'center top',
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        effects: [
          {
            id: `${wordId}-swing`,
            componentId: 'generic',
            data: swingEffect,
          },
        ],
        childrenData: [] as RenderableComponentData[],
      };

      // Visual string
      if (params.showStrings) {
        const stringElement: RenderableComponentData = {
          id: `${wordId}-string`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute',
              style: {
                width: `${params.stringWidth}px`,
                height: `${stringLength}px`,
                backgroundColor: params.stringColor,
                top: '0',
                left: '50%',
                transform: 'translateX(-50%)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
          childrenData: [],
        };
        (wordContainer.childrenData as RenderableComponentData[]).push(stringElement);
      }

      // Text atom at end of string
      const textAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            position: 'absolute',
            top: `${stringLength}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: `${params.fontSize}px`,
            fontWeight: fontStyle.fontWeight || 700,
            fontStyle: fontStyle.fontStyle || 'normal',
            color: params.textColor,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: word.duration,
          },
        },
        childrenData: [],
      };

      (wordContainer.childrenData as RenderableComponentData[]).push(textAtom);

      allWordComponents.push(wordContainer);
    });
  });

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'pendulum-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative h-full w-full overflow-hidden',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center top',
        },
      },
    },
    context: {
      timing: {
        start: captions[0]?.absoluteStart || 0,
        duration:
          (captions[captions.length - 1]?.absoluteEnd || 0) -
          (captions[0]?.absoluteStart || 0),
      },
    },
    childrenData: [
      {
        id: 'pendulum-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration:
              (captions[captions.length - 1]?.absoluteEnd || 0) -
              (captions[0]?.absoluteStart || 0),
          },
        },
        childrenData: allWordComponents as RenderableComponentData[],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
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
  id: 'pendulum-typography',
  title: 'Pendulum Typography',
  description:
    'Hypnotic text animation where words swing like clock pendulums with realistic physics. Each word hangs from an invisible pivot point with gravity-based motion. Longer words have longer pendulum strings resulting in slower swing periods. Features Newton\'s Cradle momentum transfer effect between adjacent words and natural damping where swings gradually decrease over time. Creates a meditative, mesmerizing visual experience.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'pendulum',
    'physics',
    'hypnotic',
    'meditative',
    'gravity',
    'swing',
    'damping',
    'newtons-cradle',
    'captions',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Words swing like pendulums',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            text: 'Words',
            start: 0,
            end: 0.8,
            duration: 0.8,
            absoluteStart: 0,
            absoluteEnd: 0.8,
          },
          {
            text: 'swing',
            start: 0.8,
            end: 1.5,
            duration: 0.7,
            absoluteStart: 0.8,
            absoluteEnd: 1.5,
          },
          {
            text: 'like',
            start: 1.5,
            end: 2.0,
            duration: 0.5,
            absoluteStart: 1.5,
            absoluteEnd: 2.0,
          },
          {
            text: 'pendulums',
            start: 2.0,
            end: 3.0,
            duration: 1.0,
            absoluteStart: 2.0,
            absoluteEnd: 3.0,
          },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#ffffff',
    pivotHeight: -100,
    minStringLength: 150,
    maxStringLength: 300,
    swingAmplitude: 20,
    dampingFactor: 0.15,
    gravityConstant: 1,
    cradle: true,
    phaseOffset: 0.15,
    showStrings: true,
    stringColor: 'rgba(255,255,255,0.3)',
    stringWidth: 2,
  },
};

// Export preset
export const pendulumTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
