/**
 * Explosive Breathing Animation Preset
 *
 * A tension-building breathing animation that starts subtle and builds to dramatic crescendos.
 * Perfect for countdowns, loading sequences, anticipation builders, and reveal intros.
 *
 * Features:
 * - Progressive scale amplitudes from barely noticeable (100-102%) to powerful pulses (100-140%)
 * - Decreasing cycle durations from 3s to 0.8s as intensity builds
 * - Camera shake effects at high intensity using translateX/Y with random values
 * - Motion blur via filter that builds from blur(0px) to blur(2px) at peaks
 * - Five distinct phases with exponentially increasing intensity
 * - Performance optimized with will-change transforms
 *
 * Use cases:
 * - Countdown sequences
 * - Loading screens with mounting tension
 * - Anticipation building before reveals
 * - Anxiety or excitement builder effects
 * - Heart rate / breathing visualization
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetId: z
    .string()
    .default('explosive-breathing-target')
    .describe('ID of the component to apply breathing animation to'),
  totalDuration: z
    .number()
    .min(5)
    .max(30)
    .default(18)
    .describe('Total duration of the explosive breathing sequence in seconds'),
  startScale: z
    .number()
    .min(1.0)
    .max(1.05)
    .default(1.02)
    .describe('Starting scale amplitude (subtle breathing - e.g., 1.02 = 102%)'),
  peakScale: z
    .number()
    .min(1.2)
    .max(1.5)
    .default(1.4)
    .describe('Peak scale amplitude (maximum pulse - e.g., 1.4 = 140%)'),
  enableShake: z
    .boolean()
    .default(true)
    .describe('Enable camera shake effects during peak intensity'),
  shakeIntensity: z
    .number()
    .min(1)
    .max(20)
    .default(10)
    .describe('Maximum shake distance in pixels at peak intensity'),
  enableMotionBlur: z
    .boolean()
    .default(true)
    .describe('Enable motion blur effect during peak intensity'),
  maxBlurAmount: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum blur amount in pixels at peak intensity'),
  phases: z
    .number()
    .int()
    .min(3)
    .max(7)
    .default(5)
    .describe('Number of intensity phases in the progression'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    totalDuration,
    startScale,
    peakScale,
    enableShake,
    shakeIntensity,
    enableMotionBlur,
    maxBlurAmount,
    phases,
  } = params;

  // Calculate phase durations and parameters
  const calculatePhaseParams = () => {
    const phaseData = [];
    let currentTime = 0;

    for (let i = 0; i < phases; i++) {
      const progress = i / (phases - 1); // 0 to 1
      const expProgress = Math.pow(progress, 1.5); // Exponential growth

      // Scale amplitude grows exponentially
      const scaleMin = 1;
      const scaleMax = startScale + (peakScale - startScale) * expProgress;

      // Cycle duration decreases exponentially
      const cycleDuration = 3 - 2.2 * expProgress; // 3s to 0.8s

      // Number of cycles in this phase
      const phaseDuration = totalDuration / phases;
      const cyclesInPhase = Math.max(1, Math.floor(phaseDuration / cycleDuration));
      const actualPhaseDuration = cyclesInPhase * cycleDuration;

      // Shake starts at phase 3 (60% through)
      const shakeEnabled = enableShake && progress >= 0.6;
      const shakeAmount = shakeEnabled ? shakeIntensity * (expProgress - 0.6) / 0.4 : 0;

      // Blur starts at phase 4 (80% through)
      const blurEnabled = enableMotionBlur && progress >= 0.8;
      const blurAmount = blurEnabled ? maxBlurAmount * (expProgress - 0.8) / 0.2 : 0;

      phaseData.push({
        index: i,
        start: currentTime,
        duration: actualPhaseDuration,
        cycleDuration,
        cycles: cyclesInPhase,
        scaleMin,
        scaleMax,
        shakeAmount,
        blurAmount,
        progress,
      });

      currentTime += actualPhaseDuration;
    }

    return phaseData;
  };

  const phaseData = calculatePhaseParams();

  // Build effects for all phases
  const buildPhaseEffects = () => {
    const effects: any[] = [];

    phaseData.forEach((phase) => {
      // Build breathing cycle effect
      const ranges: Array<{ key: string; val: any; prog: number }> = [];

      // Create breathing keyframes for this phase
      for (let cycle = 0; cycle <= phase.cycles; cycle++) {
        const cycleProg = cycle / phase.cycles;

        // Exhale (scale down to 1)
        ranges.push({
          key: 'scale',
          val: phase.scaleMin,
          prog: cycleProg,
        });

        // Inhale (scale up to max)
        if (cycle < phase.cycles) {
          const midProg = (cycle + 0.5) / phase.cycles;
          ranges.push({
            key: 'scale',
            val: phase.scaleMax,
            prog: midProg,
          });
        }
      }

      // Add shake if enabled for this phase
      if (phase.shakeAmount > 0) {
        // Generate random shake pattern
        const shakeKeyframes = 8;
        for (let i = 0; i <= shakeKeyframes; i++) {
          const prog = i / shakeKeyframes;
          const randomX = (Math.random() - 0.5) * 2 * phase.shakeAmount;
          const randomY = (Math.random() - 0.5) * 2 * phase.shakeAmount;

          ranges.push({
            key: 'translateX',
            val: randomX,
            prog,
          });

          ranges.push({
            key: 'translateY',
            val: randomY,
            prog,
          });
        }
      }

      // Add blur if enabled for this phase
      if (phase.blurAmount > 0) {
        // Blur pulses with breathing
        for (let cycle = 0; cycle <= phase.cycles; cycle++) {
          const cycleProg = cycle / phase.cycles;

          // Low blur at exhale
          ranges.push({
            key: 'filter',
            val: `blur(0px)`,
            prog: cycleProg,
          });

          // High blur at peak inhale
          if (cycle < phase.cycles) {
            const midProg = (cycle + 0.5) / phase.cycles;
            ranges.push({
              key: 'filter',
              val: `blur(${phase.blurAmount}px)`,
              prog: midProg,
            });
          }
        }
      }

      // Create effect for this phase
      const phaseEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: phase.start,
        duration: phase.duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges,
      };

      effects.push({
        id: `explosive-breathing-phase-${phase.index}`,
        componentId: 'generic',
        data: phaseEffect,
      });
    });

    return effects;
  };

  const effects = buildPhaseEffects();

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'explosive-breathing-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-visible w-full h-full',
        style: {
          willChange: 'transform, filter',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects,
    childrenData: [
      {
        id: 'breathing-content-wrapper',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              willChange: 'transform, filter',
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
            id: targetId,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'flex items-center justify-center w-full h-full',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            childrenData: [],
          } as RenderableComponentData,
        ] as RenderableComponentData[],
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
  id: 'explosive-breathing-animation',
  title: 'Explosive Breathing Animation',
  description:
    'A tension-building breathing animation that starts subtle and builds to dramatic crescendos. Features progressive scale amplitudes from barely noticeable (100-102%) to powerful pulses (100-140%), with decreasing cycle durations from 3s to 0.8s. Includes camera shake effects and motion blur at peak intensity. Perfect for countdowns, loading sequences, anticipation builders, and reveal intros.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'animation',
    'breathing',
    'tension',
    'crescendo',
    'countdown',
    'loading',
    'anticipation',
    'reveal',
    'anxiety',
    'excitement',
    'progressive',
    'cinematic',
    'dramatic',
  ],
  dependencies: {},
  defaultInputParams: {
    targetId: 'explosive-breathing-target',
    totalDuration: 18,
    startScale: 1.02,
    peakScale: 1.4,
    enableShake: true,
    shakeIntensity: 10,
    enableMotionBlur: true,
    maxBlurAmount: 2,
    phases: 5,
  },
};

// Export preset
export const explosiveBreathingAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
