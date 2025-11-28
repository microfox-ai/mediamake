/**
 * TextKerningCascade Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset generates cascading letter-spacing animations for text elements.
 * It animates individual characters' letterSpacing property to create a wave-like expansion/contraction
 * effect that flows through the text. Each character gets its own effect with staggered timing based on
 * the cascade direction.
 *
 * Features:
 * - Four cascade directions: left-to-right, right-to-left, center-out, random
 * - Elastic overshoot for bouncy spacing adjustment
 * - Complementary opacity fade-in synchronized with spacing changes
 * - Subtle translateY bounce for dimensional depth
 * - Configurable spacing range, cascade speed, and elasticity
 *
 * Returns an array of AnimationRange[] effects (one per character).
 *
 * Use case:
 * Apply to text components where targetIds is an array of character component IDs. Each character
 * will animate its letterSpacing, opacity, and translateY properties in a cascading sequence.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of character component IDs to animate'),
  startSpacing: z
    .number()
    .describe('Initial letter-spacing in em units (e.g., 0)'),
  endSpacing: z
    .number()
    .describe('Final letter-spacing in em units (e.g., 0.2)'),
  cascadeDirection: z
    .enum(['left-to-right', 'right-to-left', 'center-out', 'random'])
    .describe(
      'Direction of cascade: left-to-right, right-to-left, center-out, or random',
    ),
  cascadeSpeed: z
    .number()
    .describe('Delay in milliseconds between each character animation'),
  elasticity: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Bounce factor for elastic overshoot (0 = no bounce, 1 = max bounce)',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    startSpacing,
    endSpacing,
    cascadeDirection,
    cascadeSpeed,
    elasticity,
  } = params;

  // Helper function to calculate character order based on cascade direction
  const calculateCharacterOrder = (
    count: number,
    direction: typeof cascadeDirection,
  ): number[] => {
    const indices = Array.from({ length: count }, (_, i) => i);

    switch (direction) {
      case 'left-to-right':
        return indices; // Natural order [0, 1, 2, ...]

      case 'right-to-left':
        return indices.reverse(); // Reversed [n-1, n-2, ..., 0]

      case 'center-out': {
        // Start from center and expand outward
        const center = Math.floor(count / 2);
        const ordered: number[] = [];
        for (let i = 0; i < count; i++) {
          const offset = Math.floor(i / 2);
          const index = i % 2 === 0 ? center + offset : center - offset - 1;
          if (index >= 0 && index < count) {
            ordered.push(index);
          }
        }
        return ordered;
      }

      case 'random': {
        // Shuffle using Fisher-Yates algorithm
        const shuffled = [...indices];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }

      default:
        return indices;
    }
  };

  // Calculate character order
  const characterOrder = calculateCharacterOrder(
    targetIds.length,
    cascadeDirection,
  );

  // Create effects array (one effect per character)
  const effects = targetIds.map((charId, originalIndex) => {
    // Find the cascade index for this character
    const cascadeIndex = characterOrder.indexOf(originalIndex);

    // Calculate timing: each character starts after cascadeSpeed * cascadeIndex milliseconds
    const effectStart = (cascadeIndex * cascadeSpeed) / 1000; // Convert ms to seconds
    const effectDuration = 0.8; // 800ms base duration

    // Calculate elastic overshoot spacing
    const overshootSpacing = endSpacing * (1 + elasticity);

    // Create effect data
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [charId],
      ranges: [
        // Letter-spacing animation with elastic overshoot
        { key: 'letterSpacing', val: `${startSpacing}em`, prog: 0 },
        { key: 'letterSpacing', val: `${overshootSpacing}em`, prog: 0.7 },
        { key: 'letterSpacing', val: `${endSpacing}em`, prog: 1 },

        // Opacity fade-in (completes by 40% of animation)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.4 },

        // TranslateY bounce (subtle ±5px movement)
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 0, prog: 0.3 },
        { key: 'translateY', val: -5, prog: 0.6 }, // Bounce up
        { key: 'translateY', val: 0, prog: 1 }, // Settle back
      ],
    };

    return {
      id: `text-kerning-cascade-${charId}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return effects wrapped in container structure
  // The system will extract these effects via _extractedEffects
  return {
    output: {
      childrenData: [
        {
          id: 'text-kerning-cascade-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10, // Placeholder duration
            },
          },
        } as RenderableComponentData,
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'text-kerning-cascade-effect',
  title: 'TextKerningCascade',
  description:
    'Internal effect preset for precise letter-spacing animations in text elements. Creates cascading expansion/contraction effects on individual character letterSpacing with complementary opacity fade-in and translateY bounce for dimensional depth. Accepts parameters for startSpacing, endSpacing, cascadeDirection, cascadeSpeed, and elasticity. Returns an effects array where each effect targets a character ID with AnimationRange[] for letterSpacing (with elastic overshoot), opacity (fade-in during spacing), and translateY (subtle bounce). The preset expects targetIds to be an array of character component IDs that the consumer preset has already created as individual TextAtom components.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'text',
    'kerning',
    'letter-spacing',
    'cascade',
    'typography',
    'animation',
    'internal',
    'generic',
  ],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['char-0', 'char-1', 'char-2', 'char-3', 'char-4'],
    startSpacing: 0,
    endSpacing: 0.2,
    cascadeDirection: 'left-to-right',
    cascadeSpeed: 50,
    elasticity: 0.3,
  },
};

// Export preset
export const textKerningCascadeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
