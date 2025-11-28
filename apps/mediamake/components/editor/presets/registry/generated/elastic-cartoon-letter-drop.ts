/**
 * Elastic Cartoon Letter Drop Preset
 *
 * This preset creates a cartoon-style letter drop animation with exaggerated squash and stretch
 * principles from traditional animation. Each letter undergoes a multi-phase animation sequence:
 * 
 * Animation Phases:
 * 1. Anticipation: Slight upward movement (10px) before dropping
 * 2. Acceleration: Letters stretch vertically (scaleY: 1.3) as they fall with gravity
 * 3. Impact: Letters squash horizontally (scaleX: 1.3, scaleY: 0.7) upon landing
 * 4. Settle: Multiple diminishing bounces with exponential decay back to normal proportions
 *
 * Features:
 * - Personality Variations: Each letter can tumble (rotate), spin, or wobble independently
 * - Motion Lines: Comic-style speed lines appear during the fastest part of the fall
 * - Elastic Easing: Uses cubic-bezier(0.68, -0.55, 0.265, 1.55) for bouncy cartoon feel
 * - Follow-Through: Secondary bounces diminish over time using exponential decay
 * - Transform Origin: Set to 'bottom center' for proper squash/stretch deformation
 *
 * Use Cases:
 * - Creating playful title animations
 * - Adding personality to text reveals
 * - Building cartoon-style intros
 * - Creating energetic logo animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  BaseLayoutData,
  TextAtomData,
  GenericEffectData,
  HTMLBlockAtomData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter Schema
const presetParams = z.object({
  text: z.string().describe('Text to animate with letter drop effect'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:700", "BebasNeue")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the text (CSS color value)'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.8)
    .describe(
      'Total animation duration in seconds (1.5s main drop + 0.3s settling)',
    ),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Delay between each letter starting (seconds)'),
  personalityMode: z
    .enum(['tumble', 'spin', 'wobble', 'mixed', 'none'])
    .default('mixed')
    .describe('Personality animation for letters'),
  showMotionLines: z
    .boolean()
    .default(true)
    .describe('Show comic-style motion lines during fall'),
  impact: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for effects (0.5 = subtle, 2 = extreme)'),
});

// Preset Execution Function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10) || 700;
    }
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
    }
  } else {
    fontStyle.fontWeight = 700;
  }

  // Split text into letters
  const letters = params.text.split('');

  // Helper function to generate personality rotation
  const getPersonalityRotation = (
    index: number,
    mode: string,
  ): { rotation: number; spinSpeed: number } => {
    if (mode === 'none') return { rotation: 0, spinSpeed: 0 };

    const seed = index * 31; // Pseudo-random based on index
    const randomMode = ['tumble', 'spin', 'wobble'][seed % 3];
    const effectiveMode = mode === 'mixed' ? randomMode : mode;

    switch (effectiveMode) {
      case 'tumble':
        return { rotation: (seed % 40) - 20, spinSpeed: 0 }; // -20 to +20 degrees
      case 'spin':
        return { rotation: 0, spinSpeed: 360 + (seed % 180) }; // 360-540 degrees
      case 'wobble':
        return { rotation: (seed % 20) - 10, spinSpeed: 0 }; // -10 to +10 degrees
      default:
        return { rotation: 0, spinSpeed: 0 };
    }
  };

  // Helper function to calculate bounce physics
  const calculateBounces = (
    startTime: number,
    mainDropDuration: number,
  ): Array<{ time: number; height: number; squash: number }> => {
    const bounces: Array<{ time: number; height: number; squash: number }> = [];
    const impactTime = startTime + mainDropDuration;
    const settlingDuration = 0.3;
    const numBounces = 3;

    for (let i = 1; i <= numBounces; i++) {
      const progress = i / numBounces;
      const decay = Math.pow(0.4, i); // Exponential decay
      const bounceHeight = -50 * decay * params.impact; // Negative = upward
      const squashAmount = 0.85 + (1 - 0.85) * progress; // Gradually return to 1
      const bounceTime =
        impactTime + (settlingDuration / numBounces) * i;

      bounces.push({
        time: bounceTime,
        height: bounceHeight,
        squash: squashAmount,
      });
    }

    return bounces;
  };

  // Create letter components
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      const motionLinesContainerId = `motion-lines-${index}`;
      const staggerStart = index * params.staggerDelay;

      // Personality
      const { rotation, spinSpeed } = getPersonalityRotation(
        index,
        params.personalityMode,
      );

      // Animation timing phases (relative to letter start)
      const anticipationDuration = 0.2;
      const accelerationDuration = 0.4;
      const impactStart = anticipationDuration + accelerationDuration;
      const impactDuration = 0.2;
      const settleStart = impactStart + impactDuration;

      // Calculate bounce physics
      const bounces = calculateBounces(settleStart, impactStart);

      // Create main letter animation effect
      const letterEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Phase 1: Anticipation (0-0.2s) - slight upward movement
          { key: 'translateY', val: -10 * params.impact, prog: 0 },
          {
            key: 'translateY',
            val: -10 * params.impact,
            prog: anticipationDuration / params.duration,
          },

          // Phase 2: Acceleration (0.2-0.6s) - stretch and fall
          {
            key: 'translateY',
            val: 0,
            prog: impactStart / params.duration,
          },
          {
            key: 'scaleY',
            val: 1.3 * params.impact,
            prog: (anticipationDuration + 0.15) / params.duration,
          },
          {
            key: 'scaleX',
            val: 0.8,
            prog: (anticipationDuration + 0.15) / params.duration,
          },

          // Phase 3: Impact (0.6-0.8s) - squash on landing
          {
            key: 'scaleY',
            val: 0.7,
            prog: impactStart / params.duration,
          },
          {
            key: 'scaleX',
            val: 1.3 * params.impact,
            prog: impactStart / params.duration,
          },
          {
            key: 'translateY',
            val: 0,
            prog: impactStart / params.duration,
          },

          // Phase 4: Settle - diminishing bounces
          ...bounces.flatMap((bounce, i) => [
            {
              key: 'translateY',
              val: bounce.height,
              prog: bounce.time / params.duration,
            },
            {
              key: 'scaleY',
              val: bounce.squash,
              prog: bounce.time / params.duration,
            },
            {
              key: 'scaleX',
              val: 2 - bounce.squash,
              prog: bounce.time / params.duration,
            },
          ]),

          // Final state - return to normal
          { key: 'scaleY', val: 1, prog: 1 },
          { key: 'scaleX', val: 1, prog: 1 },
          { key: 'translateY', val: 0, prog: 1 },

          // Rotation/spin
          ...(rotation !== 0 || spinSpeed !== 0
            ? [
                { key: 'rotate', val: 0, prog: 0 },
                {
                  key: 'rotate',
                  val: rotation + spinSpeed,
                  prog: impactStart / params.duration,
                },
                { key: 'rotate', val: rotation, prog: 1 },
              ]
            : []),
        ],
      };

      // Create motion lines effects (only during acceleration phase)
      const motionLineEffects: GenericEffectData[] = params.showMotionLines
        ? [0, 1, 2].map((lineIndex) => ({
            type: 'linear',
            start: anticipationDuration + 0.1,
            duration: 0.25,
            mode: 'provider',
            targetIds: [`motion-line-${index}-${lineIndex}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scaleX', val: 0, prog: 0 },
              { key: 'scaleX', val: 1, prog: 0.5 },
              { key: 'scaleX', val: 0, prog: 1 },
            ],
          }))
        : [];

      // Motion lines container
      const motionLinesContainer: RenderableComponentData = {
        id: motionLinesContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              top: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              zIndex: 0,
            },
          },
        } as BaseLayoutData,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: params.showMotionLines
          ? [
              {
                id: `motion-line-${index}-0`,
                type: 'atom',
                componentId: 'HTMLBlockAtom',
                data: {
                  html: '<div></div>',
                  className:
                    'h-0.5 bg-gradient-to-r from-transparent via-current to-transparent',
                  style: {
                    position: 'absolute',
                    width: '20px',
                    opacity: 0,
                    color: params.textColor,
                    top: '20px',
                  },
                } as HTMLBlockAtomData,
                context: {
                  timing: {
                    start: 0,
                    duration: params.duration,
                  },
                },
              },
              {
                id: `motion-line-${index}-1`,
                type: 'atom',
                componentId: 'HTMLBlockAtom',
                data: {
                  html: '<div></div>',
                  className:
                    'h-0.5 bg-gradient-to-r from-transparent via-current to-transparent',
                  style: {
                    position: 'absolute',
                    width: '16px',
                    opacity: 0,
                    color: params.textColor,
                    top: '28px',
                  },
                } as HTMLBlockAtomData,
                context: {
                  timing: {
                    start: 0,
                    duration: params.duration,
                  },
                },
              },
              {
                id: `motion-line-${index}-2`,
                type: 'atom',
                componentId: 'HTMLBlockAtom',
                data: {
                  html: '<div></div>',
                  className:
                    'h-0.5 bg-gradient-to-r from-transparent via-current to-transparent',
                  style: {
                    position: 'absolute',
                    width: '12px',
                    opacity: 0,
                    color: params.textColor,
                    top: '36px',
                  },
                } as HTMLBlockAtomData,
                context: {
                  timing: {
                    start: 0,
                    duration: params.duration,
                  },
                },
              },
            ]
          : [],
        effects: motionLineEffects.map((effectData, idx) => ({
          id: `motion-line-effect-${index}-${idx}`,
          componentId: 'generic',
          data: effectData,
        })),
      };

      // Letter wrapper
      return {
        id: `letter-wrapper-${index}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
            },
          },
        } as BaseLayoutData,
        context: {
          timing: {
            start: staggerStart,
            duration: params.duration,
          },
        },
        childrenData: [
          motionLinesContainer,
          {
            id: letterId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: letter === ' ' ? '\u00A0' : letter,
              style: {
                transformOrigin: 'bottom center',
                display: 'inline-block',
                fontSize: `${params.fontSize}px`,
                fontWeight: fontStyle.fontWeight,
                fontStyle: fontStyle.fontStyle,
                color: params.textColor,
                willChange: 'transform, opacity',
              },
              font: {
                family: fontFamily,
                weights: [fontStyle.fontWeight?.toString() || '700'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
          },
        ] as RenderableComponentData[],
        effects: [
          {
            id: `letter-effect-${index}`,
            componentId: 'generic',
            data: letterEffect,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'elastic-letter-drop-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-end justify-center w-full h-full',
        style: {
          overflow: 'hidden',
        },
      },
    } as BaseLayoutData,
    context: {
      timing: {
        start: 0,
        duration:
          params.duration + letters.length * params.staggerDelay,
      },
    },
    childrenData: [
      {
        id: 'letters-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row items-end justify-center',
            style: {
              gap: '4px',
              position: 'relative',
            },
          },
        } as BaseLayoutData,
        context: {
          timing: {
            start: 0,
            duration:
              params.duration + letters.length * params.staggerDelay,
          },
        },
        childrenData: letterComponents,
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

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'elastic-cartoon-letter-drop',
  title: 'Elastic Cartoon Letter Drop',
  description:
    'Cartoon-style letter drop animation with exaggerated squash and stretch principles. Features multi-phase animation including anticipation (slight upward movement), acceleration with vertical stretch, impact squash, and follow-through with diminishing bounces. Each letter has unique personality with optional tumbling, spinning, or wobbling. Comic-style motion lines appear during the fastest descent. Uses elastic easing for bouncy cartoon feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'cartoon',
    'squash',
    'stretch',
    'letter-drop',
    'bounce',
    'elastic',
    'motion-lines',
    'personality',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'BOUNCE!',
    font: 'BebasNeue:700',
    fontSize: 72,
    textColor: '#FFFFFF',
    duration: 1.8,
    staggerDelay: 0.05,
    personalityMode: 'mixed',
    showMotionLines: true,
    impact: 1,
  },
};

// Export Preset
export const elasticCartoonLetterDropPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
