/**
 * Selective Focus Effect Preset
 *
 * This internal effect preset applies variable focus levels (sharp, mid-focus, out-of-focus) to different
 * target components, simulating tilt-shift or selective focus photography. It supports three distinct focus
 * zones with configurable blur and opacity, smooth transitions with customizable easing curves (spring for
 * natural camera movement, ease-in-out for mechanical), and animated focusShift to move the sharp zone
 * across targets sequentially over time.
 *
 * Features:
 * - **Three Focus Zones**: Sharp (no blur, full opacity), mid-focus (slight blur 3-5px, 0.8 opacity),
 *   and out-of-focus (heavy blur 10-15px, 0.4 opacity)
 * - **Target Mapping**: Precise control over which elements are in each focus zone via targetIds arrays
 * - **Smooth Transitions**: Configurable easing curves (spring, ease-in-out, linear) for focus state changes
 * - **Focus Shift Animation**: Optional parameter to animate focus changes over time, moving the sharp zone
 *   sequentially across different targets with customizable intervals
 * - **Generic Effect Type**: Returns array of effects with different configs per zone, one effect per zone
 *
 * Technical Implementation:
 * - Effect type: generic with multiple target groups
 * - Structure: Returns effects array with different configs per zone
 * - Sharp zone: { opacity: 1, filter: 'blur(0px)' }
 * - Mid zone: { opacity: 0.8, filter: 'blur(4px)' }
 * - Out zone: { opacity: 0.4, filter: 'blur(12px)' }
 *
 * Use cases:
 * - Creating tilt-shift photography effects in video compositions
 * - Directing viewer attention to specific elements through focus control
 * - Animating focus transitions between subjects (interviews, product showcases)
 * - Simulating depth-of-field camera effects
 * - Creating cinematic rack focus transitions
 *
 * ARRAY OF EFFECTS:
 * This preset returns an array of effects (one per focus zone, or multiple for focusShift sequences).
 * Extract via `_extractedEffects` when calling from parent presets.
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  zones: z
    .object({
      sharp: z
        .array(z.string())
        .describe('Array of target component IDs for sharp focus zone (no blur, full opacity)'),
      mid: z
        .array(z.string())
        .describe('Array of target component IDs for mid-focus zone (slight blur 3-5px, 0.8 opacity)'),
      out: z
        .array(z.string())
        .describe('Array of target component IDs for out-of-focus zone (heavy blur 10-15px, 0.4 opacity)'),
    })
    .describe('Focus zone configuration mapping targetIds to focus levels'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration in seconds for transitions between focus states'),
  easing: z
    .enum(['spring', 'ease-in-out', 'linear'])
    .default('spring')
    .describe('Easing curve for focus transitions (spring for natural camera movement, ease-in-out for mechanical, linear for constant speed)'),
  focusShift: z
    .object({
      enabled: z
        .boolean()
        .describe('Enable animated focus shift (moves sharp zone across targets sequentially)'),
      interval: z
        .number()
        .describe('Time interval in seconds between focus shifts'),
    })
    .optional()
    .describe('Optional focus shift animation configuration to move sharp focus across targets over time'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of effects relative to parent timeline'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Total duration of the selective focus effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    zones,
    transitionDuration,
    easing,
    focusShift,
    effectStart,
    effectDuration,
  } = params;

  const effects: any[] = [];

  // Helper function to create focus effect for a specific zone
  const createFocusEffect = (
    targetIds: string[],
    blurAmount: string,
    opacity: number,
    start: number,
    duration: number,
    effectId: string,
  ) => {
    if (targetIds.length === 0) return null;

    const effectData: GenericEffectData = {
      type: easing,
      start: start,
      duration: duration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        { key: 'opacity', val: opacity, prog: 0 },
        { key: 'opacity', val: opacity, prog: 1 },
        { key: 'filter', val: `blur(${blurAmount})`, prog: 0 },
        { key: 'filter', val: `blur(${blurAmount})`, prog: 1 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    };
  };

  // If focusShift is disabled or not provided, create static focus zones
  if (!focusShift || !focusShift.enabled) {
    // Sharp zone effect (no blur, full opacity)
    const sharpEffect = createFocusEffect(
      zones.sharp,
      '0px',
      1,
      effectStart,
      effectDuration,
      'selective-focus-sharp',
    );
    if (sharpEffect) effects.push(sharpEffect);

    // Mid-focus zone effect (slight blur 4px, 0.8 opacity)
    const midEffect = createFocusEffect(
      zones.mid,
      '4px',
      0.8,
      effectStart,
      effectDuration,
      'selective-focus-mid',
    );
    if (midEffect) effects.push(midEffect);

    // Out-of-focus zone effect (heavy blur 12px, 0.4 opacity)
    const outEffect = createFocusEffect(
      zones.out,
      '12px',
      0.4,
      effectStart,
      effectDuration,
      'selective-focus-out',
    );
    if (outEffect) effects.push(outEffect);
  } else {
    // Focus shift animation enabled - create sequential focus transitions
    const interval = focusShift.interval;
    const allTargets = [...zones.sharp, ...zones.mid, ...zones.out];
    
    if (allTargets.length === 0) {
      // No targets provided, return empty effects
      return {
        output: {
          childrenData: [
            {
              id: 'selective-focus-container',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0',
                  style: {
                    pointerEvents: 'none',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: effectDuration,
                },
              },
              effects: [],
              childrenData: [],
            } as RenderableComponentData,
          ],
        },
        options: {
          attachedToId: 'BaseScene',
        },
      };
    }

    // Calculate number of focus shifts that can fit in the duration
    const numShifts = Math.floor(effectDuration / interval);
    const actualNumShifts = Math.min(numShifts, allTargets.length);

    // Create effects for each focus shift phase
    for (let shiftIndex = 0; shiftIndex < actualNumShifts; shiftIndex++) {
      const phaseStart = effectStart + shiftIndex * interval;
      const phaseDuration = Math.min(interval, effectDuration - shiftIndex * interval);
      
      // Determine which target is sharp in this phase (cycle through targets)
      const sharpTargetIndex = shiftIndex % allTargets.length;
      const currentSharpTarget = allTargets[sharpTargetIndex];

      // Build target arrays for this phase
      const phaseSharpTargets = [currentSharpTarget];
      const phaseMidTargets: string[] = [];
      const phaseOutTargets: string[] = [];

      // Categorize remaining targets
      allTargets.forEach((target, idx) => {
        if (idx === sharpTargetIndex) return; // Skip sharp target
        
        // Targets adjacent to sharp target get mid-focus
        const distance = Math.min(
          Math.abs(idx - sharpTargetIndex),
          allTargets.length - Math.abs(idx - sharpTargetIndex)
        );
        
        if (distance === 1) {
          phaseMidTargets.push(target);
        } else {
          phaseOutTargets.push(target);
        }
      });

      // Create sharp effect for this phase with transition
      const sharpEffect = createFocusEffect(
        phaseSharpTargets,
        '0px',
        1,
        phaseStart,
        phaseDuration,
        `selective-focus-sharp-shift-${shiftIndex}`,
      );
      if (sharpEffect) effects.push(sharpEffect);

      // Create mid-focus effect for this phase
      const midEffect = createFocusEffect(
        phaseMidTargets,
        '4px',
        0.8,
        phaseStart,
        phaseDuration,
        `selective-focus-mid-shift-${shiftIndex}`,
      );
      if (midEffect) effects.push(midEffect);

      // Create out-of-focus effect for this phase
      const outEffect = createFocusEffect(
        phaseOutTargets,
        '12px',
        0.4,
        phaseStart,
        phaseDuration,
        `selective-focus-out-shift-${shiftIndex}`,
      );
      if (outEffect) effects.push(outEffect);
    }
  }

  // Return effects in container structure
  const rootContainer: RenderableComponentData = {
    id: 'selective-focus-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: effects,
    childrenData: [],
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
  id: 'selective-focus-effect',
  title: 'Selective Focus Effect',
  description:
    'Internal effect preset that applies variable focus levels (sharp, mid-focus, out-of-focus) to different target components, simulating tilt-shift or selective focus photography. Supports three focus zones with configurable blur and opacity, smooth transitions with customizable easing (spring, ease-in-out, linear), and animated focusShift to move the sharp zone across targets sequentially. This preset returns effects to be merged into the parent composition - targetIds must reference component IDs that already exist in the parent preset.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'focus', 'blur', 'tilt-shift', 'depth-of-field', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    zones: {
      sharp: ['target-1'],
      mid: ['target-2', 'target-3'],
      out: ['target-4', 'target-5'],
    },
    transitionDuration: 0.8,
    easing: 'spring',
    focusShift: {
      enabled: false,
      interval: 2,
    },
    effectStart: 0,
    effectDuration: 10,
  },
};

export const selectiveFocusEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
