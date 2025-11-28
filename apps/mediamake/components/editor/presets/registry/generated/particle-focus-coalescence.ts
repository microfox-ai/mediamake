/**
 * Particle Focus Coalescence Preset
 *
 * A physics-based text reveal effect where blurry, scattered text particles converge and sharpen
 * into readable text. Each character starts as a dispersed, heavily blurred particle with random
 * position offsets and rotation, then animates to its correct position using spring physics for
 * natural bounce/overshoot. Characters closer to center converge first, creating an organic
 * magnetic alignment effect.
 *
 * Features:
 * - **Particle-based blur convergence**: Text starts heavily blurred (20px) and dispersed
 * - **Physics-based motion**: Spring easing with natural overshoot/bounce on position lock
 * - **Staggered timing**: Characters closer to center converge first (magnetic effect)
 * - **Multi-property animation**: Blur, translateX/Y, rotation, opacity animate simultaneously
 * - **Motion blur trails**: Multiple text-shadows create particle trails during movement
 * - **GPU acceleration**: Uses transform: translate3d() for performance
 * - **Organic feel**: Random offsets and physics-based easing create natural motion
 *
 * Use cases:
 * - Dynamic title reveals with physics-based particle effects
 * - Organic text animations with natural motion
 * - Tech/sci-fi style particle coalescence effects
 * - Attention-grabbing text intros with magnetic alignment
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Params Schema ---
const presetParams = z.object({
  text: z.string().describe('Text to display with particle coalescence effect'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the entire effect in seconds'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size in pixels for the text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color in hex or rgba format'),
  initialBlur: z
    .number()
    .default(20)
    .describe('Initial blur amount in pixels for particle dispersion'),
  maxOffset: z
    .number()
    .default(20)
    .describe(
      'Maximum random position offset in pixels for particle scatter (±value)',
    ),
  maxRotation: z
    .number()
    .default(15)
    .describe('Maximum random rotation in degrees for particle scatter (±value)'),
  initialOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Initial opacity of dispersed particles (0-1)'),
  convergenceDuration: z
    .number()
    .default(1.0)
    .describe(
      'Duration in seconds for each particle to converge (physics animation length)',
    ),
  staggerDuration: z
    .number()
    .default(1.5)
    .describe(
      'Total duration in seconds for staggered start times (spread across text)',
    ),
  motionBlurIntensity: z
    .number()
    .default(3)
    .describe('Number of text-shadow layers for motion blur trail effect'),
  backgroundColor: z
    .string()
    .default('transparent')
    .describe('Background color for the container'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate distance from center for stagger timing
  const calculateCenterDistance = (
    index: number,
    totalChars: number,
  ): number => {
    const center = (totalChars - 1) / 2;
    return Math.abs(index - center);
  };

  // Helper function: Generate random offset within range
  const randomOffset = (max: number): number => {
    return (Math.random() - 0.5) * 2 * max;
  };

  // Helper function: Create motion blur text-shadow
  const createMotionBlur = (intensity: number, color: string): string => {
    const shadows: string[] = [];
    for (let i = 1; i <= intensity; i++) {
      const offset = i * 2;
      const opacity = 0.3 - i * 0.1;
      shadows.push(
        `${offset}px ${offset}px 4px rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${Math.max(0, opacity)})`,
      );
    }
    return shadows.join(', ');
  };

  // Split text into characters
  const characters = params.text.split('');
  const totalChars = characters.length;

  // Create character components with effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;

      // Calculate stagger timing based on distance from center
      const centerDistance = calculateCenterDistance(index, totalChars);
      const maxDistance = Math.ceil((totalChars - 1) / 2);
      const normalizedDistance = centerDistance / maxDistance; // 0 (center) to 1 (edges)

      // Stagger: center starts first, edges start later
      const staggerStart = normalizedDistance * params.staggerDuration;

      // Random offsets for particle scatter
      const offsetX = randomOffset(params.maxOffset);
      const offsetY = randomOffset(params.maxOffset);
      const rotation = randomOffset(params.maxRotation);

      // Create particle convergence effect
      const particleEffect: GenericEffectData = {
        type: 'spring', // Spring physics for natural bounce
        start: staggerStart, // Staggered start time
        duration: params.convergenceDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          // Blur convergence: 20px → 0px
          { key: 'filter', val: `blur(${params.initialBlur}px)`, prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
          // Position convergence: random offset → 0
          { key: 'translateX', val: offsetX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: offsetY, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          // Rotation convergence: random → 0
          { key: 'rotate', val: rotation, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
          // Opacity convergence: 0.6 → 1.0
          { key: 'opacity', val: params.initialOpacity, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      const effect = {
        id: `particle-effect-${index}`,
        componentId: 'generic',
        data: particleEffect,
      };

      // Character component
      const charComponent: RenderableComponentData = {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char === ' ' ? '\u00A0' : char, // Non-breaking space for spaces
          style: {
            fontSize: params.fontSize,
            fontWeight: params.fontWeight,
            color: params.textColor,
            display: 'inline-block',
            transform: 'translate3d(0, 0, 0)', // GPU acceleration
            willChange: 'transform, filter, opacity',
            textShadow: createMotionBlur(
              params.motionBlurIntensity,
              params.textColor,
            ),
          },
          font: {
            family: params.fontFamily,
            weights: [params.fontWeight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [effect],
      };

      return charComponent;
    },
  );

  // Container layout
  const rootContainer: RenderableComponentData = {
    id: 'particle-focus-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: 'particle-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-flex',
            style: {
              gap: '0px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: characterComponents as RenderableComponentData[],
      } as RenderableComponentData,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'particle-focus-coalescence',
  title: 'Particle Focus Coalescence',
  description:
    'A physics-based text reveal effect where blurry, scattered text particles converge and sharpen into readable text. Each character starts as a dispersed, heavily blurred particle with random position offsets and rotation, then animates to its correct position using spring physics for natural bounce/overshoot. Characters closer to center converge first, creating an organic magnetic alignment effect. Uses GPU-accelerated transforms for smooth performance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'particle',
    'physics',
    'blur',
    'convergence',
    'spring',
    'coalescence',
    'reveal',
    'motion-blur',
    'stagger',
    'magnetic',
    'gpu-accelerated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'PARTICLE FOCUS',
    duration: 5,
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    initialBlur: 20,
    maxOffset: 20,
    maxRotation: 15,
    initialOpacity: 0.6,
    convergenceDuration: 1.0,
    staggerDuration: 1.5,
    motionBlurIntensity: 3,
    backgroundColor: 'transparent',
  },
};

// --- Export ---
export const particleFocusCoalescencePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
