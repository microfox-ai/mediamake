/**
 * PatternEcho Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Generates a trailing echo/ghost effect for moving elements through clever use of opacity
 * and transform delays. Creates 3-5 'echo' states that follow the main animation with
 * decreasing opacity and slight position/scale offsets.
 *
 * Features:
 * - Creates staggered keyframes for each echo level
 * - Progressive opacity reduction (1 - i*echoFade)
 * - Position drift per echo (i*echoOffset)
 * - Progressive blur to simulate motion blur (i*2px)
 * - Scale reduction per echo (1 - i*0.05)
 * - Works especially well with text for motion trail effects
 *
 * Technical Implementation:
 * - Uses generic effect type with calculated echo keyframes
 * - Each echo level uses AnimationRange with staggered progress values
 * - Duration calculated as params.duration + (echoCount * echoDelay / 1000)
 * - Mode: 'provider' with targetIds for direct component targeting
 *
 * Use Cases:
 * - Motion trail effects for text animations
 * - Ghost/echo effects for moving elements
 * - Dynamic trail visualization
 * - Kinetic typography with trailing effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the echo effect to'),
  echoCount: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of echo states to generate (1-5)'),
  echoDelay: z
    .number()
    .default(50)
    .describe('Delay in milliseconds between each echo level'),
  echoFade: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.2)
    .describe('Opacity reduction per echo level (0-0.5)'),
  echoOffset: z
    .number()
    .default(5)
    .describe('Position drift in pixels per echo level'),
  duration: z
    .number()
    .optional()
    .describe('Base duration in seconds (defaults to 2)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const echoCount = params.echoCount ?? 3;
  const echoDelay = params.echoDelay ?? 50;
  const echoFade = params.echoFade ?? 0.2;
  const echoOffset = params.echoOffset ?? 5;
  const baseDuration = params.duration ?? 2;
  const effectStart = params.effectStart ?? 0;

  // Calculate total duration: base duration + time for all echoes
  const totalDuration = baseDuration + (echoCount * echoDelay) / 1000;

  // Generate echo keyframes
  // Each echo level creates keyframes at staggered progress points
  const generateEchoKeyframes = () => {
    const opacityRanges = [];
    const translateXRanges = [];
    const blurRanges = [];
    const scaleRanges = [];

    // Start with initial state
    opacityRanges.push({ key: 'opacity', val: 1, prog: 0 });
    translateXRanges.push({ key: 'translateX', val: 0, prog: 0 });
    blurRanges.push({ key: 'blur', val: '0px', prog: 0 });
    scaleRanges.push({ key: 'scale', val: 1, prog: 0 });

    // Generate echo levels
    for (let i = 1; i <= echoCount; i++) {
      const progress = i / (echoCount + 1); // Distribute evenly across duration

      // Opacity: progressively fade out
      const opacity = Math.max(0, 1 - i * echoFade);
      opacityRanges.push({
        key: 'opacity',
        val: opacity,
        prog: progress,
      });

      // TranslateX: progressive position drift
      const translateX = i * echoOffset;
      translateXRanges.push({
        key: 'translateX',
        val: translateX,
        prog: progress,
      });

      // Blur: progressive blur to simulate motion blur
      const blurAmount = i * 2;
      blurRanges.push({
        key: 'blur',
        val: `${blurAmount}px`,
        prog: progress,
      });

      // Scale: progressive scale reduction
      const scale = Math.max(0.5, 1 - i * 0.05);
      scaleRanges.push({
        key: 'scale',
        val: scale,
        prog: progress,
      });
    }

    // End state (return to initial for smooth looping if needed)
    opacityRanges.push({ key: 'opacity', val: 1, prog: 1 });
    translateXRanges.push({ key: 'translateX', val: 0, prog: 1 });
    blurRanges.push({ key: 'blur', val: '0px', prog: 1 });
    scaleRanges.push({ key: 'scale', val: 1, prog: 1 });

    return [
      ...opacityRanges,
      ...translateXRanges,
      ...blurRanges,
      ...scaleRanges,
    ];
  };

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-out',
    start: effectStart,
    duration: totalDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: generateEchoKeyframes(),
  };

  // Create effect node
  const effect = {
    id: params.effectId || `pattern-echo-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'pattern-echo-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'pattern-echo-effect',
  title: 'PatternEcho Internal Effect',
  description:
    'Internal effect preset that generates a trailing echo/ghost effect for moving elements through calculated opacity, transform, blur, and scale keyframes. Creates 3-5 echo states that follow the main animation with decreasing opacity and progressive offsets. Works especially well with text for motion trail effects. Outputs effect configuration data to be attached to target components.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'echo', 'trail', 'motion', 'ghost', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['text-component'],
    echoCount: 3,
    echoDelay: 50,
    echoFade: 0.2,
    echoOffset: 5,
    duration: 2,
    effectStart: 0,
  },
};

// Export preset
export const patternEchoEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
