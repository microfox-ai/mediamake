/**
 * Pulsating Saturation Effect Preset
 *
 * SINGLE EFFECT:
 * An internal effect preset that generates a rhythmic saturation pulse effect
 * for any target element. Animates CSS filter saturation values in a smooth,
 * breathing-like pattern, creating a vibrant pulsing sensation.
 *
 * Features:
 * - Smooth breathing-like saturation animation from desaturated to oversaturated
 * - Customizable pulse speed and intensity
 * - Subtle brightness boost at peak saturation for extra vibrancy
 * - Organic ease-in-out easing for natural motion
 * - Support for infinite or specific pulse count
 *
 * Technical Details:
 * - Uses generic AnimationRange[] with filter: saturate(X) values
 * - Cycles from minSaturation → maxSaturation → minSaturation
 * - Adds brightness filter at peak saturation for vibrancy
 * - Provider mode targeting user-specified component IDs
 *
 * Use cases:
 * - Creating vibrant pulsing effects on images, videos, or text
 * - Adding rhythmic visual interest to static content
 * - Synchronizing visual pulse with music or beats
 * - Creating attention-grabbing effects for key elements
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { UniversalEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Params Schema ---

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the pulsating saturation effect to'),
  pulseDuration: z
    .number()
    .default(2)
    .describe('Duration of a single pulse cycle in seconds (default: 2s)'),
  minSaturation: z
    .number()
    .default(0.5)
    .describe('Minimum saturation value in the pulse cycle (default: 0.5, desaturated)'),
  maxSaturation: z
    .number()
    .default(2.0)
    .describe('Maximum saturation value in the pulse cycle (default: 2.0, oversaturated)'),
  pulseCount: z
    .union([z.number(), z.literal('infinite')])
    .default('infinite')
    .describe(
      'Number of pulse cycles or "infinite" for continuous pulsing (default: infinite)',
    ),
});

// --- Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    pulseDuration,
    minSaturation,
    maxSaturation,
    pulseCount,
  } = params;

  // Calculate total duration
  const totalDuration =
    pulseCount === 'infinite' ? 3600 : pulseDuration * pulseCount; // 1 hour for infinite

  // Helper function to create a single pulse effect
  const createPulseEffect = (
    effectId: string,
    startTime: number,
  ): UniversalEffectData => {
    // Calculate brightness boost at peak saturation (subtle)
    const peakBrightness = 1.0 + (maxSaturation - 1.0) * 0.15; // ~15% brightness boost

    return {
      type: 'ease-in-out', // Organic breathing motion
      start: startTime,
      duration: pulseDuration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        // Saturation cycle: min → max → min
        {
          key: 'filter',
          val: `saturate(${minSaturation}) brightness(1)`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `saturate(${maxSaturation}) brightness(${peakBrightness})`,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: `saturate(${minSaturation}) brightness(1)`,
          prog: 1,
        },
      ],
    };
  };

  // Generate pulse effects
  const effects: any[] = [];

  if (pulseCount === 'infinite') {
    // Create a single long-running pulse effect
    const effectData = createPulseEffect('pulsating-saturation-effect', 0);
    effects.push({
      id: 'pulsating-saturation-effect',
      componentId: 'generic',
      data: effectData,
    });
  } else {
    // Create multiple pulse effects with staggered start times
    for (let i = 0; i < pulseCount; i++) {
      const startTime = i * pulseDuration;
      const effectData = createPulseEffect(
        `pulsating-saturation-effect-${i}`,
        startTime,
      );
      effects.push({
        id: `pulsating-saturation-effect-${i}`,
        componentId: 'generic',
        data: effectData,
      });
    }
  }

  // Create container with effects
  const rootContainer: RenderableComponentData = {
    id: 'pulsating-saturation-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'hidden', // Hidden container for internal effect preset
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'pulsating-saturation-effect',
  title: 'Pulsating Saturation Effect',
  description:
    'Internal effect preset that generates a rhythmic saturation pulse effect for any target element. Animates CSS filter saturation values in a smooth, breathing-like pattern with customizable pulse speed, intensity, and subtle brightness boost at peak saturation.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'saturation', 'pulse', 'breathing', 'vibrant', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-component'],
    pulseDuration: 2,
    minSaturation: 0.5,
    maxSaturation: 2.0,
    pulseCount: 'infinite',
  },
};

// --- Export ---

export const pulsatingSaturationEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
