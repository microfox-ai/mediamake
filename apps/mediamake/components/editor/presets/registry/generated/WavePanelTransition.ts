/**
 * Wave Panel Transition Preset
 *
 * This preset creates an organic wave panel transition inspired by ocean waves and fabric ripples.
 * Horizontal panel strips undulate across the screen with sine wave motion, creating a continuous
 * wave effect flowing from top to bottom. Features variable amplitude (stronger in middle, gentler
 * at edges), rotation effects based on wave position, flowing color gradient, secondary vertical
 * floating, and subtle opacity variation.
 *
 * Features:
 * - **Sine Wave Motion**: Panels move horizontally with mathematically calculated sine wave patterns
 * - **Variable Amplitude**: Stronger wave motion in center panels, gentler at edges
 * - **Phase Offset**: Each row is offset by π/4 for smooth cascading wave effect
 * - **Rotation Effects**: Panels tilt ±5° based on wave derivative (direction of movement)
 * - **Color Flow**: Hue-rotate filter creates flowing gradient effect through the wave cycle
 * - **Vertical Float**: Secondary translateY animation for organic floating motion
 * - **Opacity Variation**: Subtle 0.8 → 1 → 0.8 opacity following wave peaks
 * - **Seamless Looping**: 3-second wave cycle designed for seamless repetition
 *
 * Use cases:
 * - Artistic transition between scenes or segments
 * - Ambient background for creative content
 * - Abstract visual interludes
 * - Meditation or relaxation video backgrounds
 * - Modern motion graphics transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of one complete wave cycle in seconds'),
  panelCount: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe('Number of horizontal panel strips'),
  centerAmplitude: z
    .number()
    .min(20)
    .max(200)
    .default(100)
    .describe('Wave amplitude for center panels in pixels'),
  edgeAmplitude: z
    .number()
    .min(10)
    .max(100)
    .default(50)
    .describe('Wave amplitude for edge panels in pixels'),
  phaseOffset: z
    .number()
    .min(0.1)
    .max(1.5)
    .default(0.785)
    .describe('Phase offset between rows in radians (π/4 = 0.785)'),
  verticalFloat: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Vertical floating range in pixels (±value)'),
  maxRotation: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .describe('Maximum rotation tilt in degrees'),
  gradientColors: z
    .object({
      from: z.string().default('#3B82F6'),
      via: z.string().default('#9333EA'),
      to: z.string().default('#EC4899'),
    })
    .default({
      from: '#3B82F6',
      via: '#9333EA',
      to: '#EC4899',
    })
    .describe('Gradient color stops (from-via-to)'),
  minOpacity: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.8)
    .describe('Minimum opacity during wave cycle'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    panelCount,
    centerAmplitude,
    edgeAmplitude,
    phaseOffset,
    verticalFloat,
    maxRotation,
    gradientColors,
    minOpacity,
  } = params;

  // Helper function to calculate amplitude based on panel position
  const calculateAmplitude = (index: number): number => {
    const centerIndex = panelCount / 2;
    const distanceFromCenter = Math.abs(index - centerIndex);
    const normalizedDistance = distanceFromCenter / centerIndex;
    // Interpolate between center and edge amplitude
    return centerAmplitude - (centerAmplitude - edgeAmplitude) * normalizedDistance;
  };

  // Helper function to calculate sine wave values at keyframes
  const calculateSineWave = (
    amplitude: number,
    phase: number,
    progress: number,
  ): number => {
    const frequency = 1; // One complete cycle
    const angle = 2 * Math.PI * frequency * progress + phase;
    return amplitude * Math.sin(angle);
  };

  // Helper function to calculate rotation based on wave derivative
  const calculateRotation = (
    amplitude: number,
    phase: number,
    progress: number,
  ): number => {
    const frequency = 1;
    const angle = 2 * Math.PI * frequency * progress + phase;
    // Derivative of sine is cosine (rate of change = direction)
    const derivative = Math.cos(angle);
    return maxRotation * derivative;
  };

  // Helper function to calculate opacity variation
  const calculateOpacity = (progress: number): number => {
    // Peak at 0.5 progress (middle of cycle)
    const peakPosition = 0.5;
    const distanceFromPeak = Math.abs(progress - peakPosition);
    // Normalize distance (0 at peak, 0.5 at edges)
    const normalizedDistance = distanceFromPeak / peakPosition;
    // Interpolate opacity
    return 1 - (1 - minOpacity) * normalizedDistance;
  };

  // Create panel children
  const panelChildren: RenderableComponentData[] = [];

  for (let i = 0; i < panelCount; i++) {
    const panelHeight = 100 / panelCount;
    const topPosition = i * panelHeight;
    const amplitude = calculateAmplitude(i);
    const phase = i * phaseOffset;

    // Calculate keyframe values (0%, 25%, 50%, 75%, 100%)
    const keyframes = [0, 0.25, 0.5, 0.75, 1];
    const translateXValues = keyframes.map((prog) =>
      calculateSineWave(amplitude, phase, prog),
    );
    const rotateZValues = keyframes.map((prog) =>
      calculateRotation(amplitude, phase, prog),
    );
    const opacityValues = keyframes.map((prog) => calculateOpacity(prog));

    // Secondary vertical float with different frequency
    const verticalPhase = phase * 0.7; // Different frequency
    const translateYValues = keyframes.map((prog) => {
      const angle = 2 * Math.PI * 0.8 * prog + verticalPhase;
      return verticalFloat * Math.sin(angle);
    });

    // Hue rotation for color flow (0deg to 360deg)
    const hueRotateValues = keyframes.map((prog) => prog * 360);

    // Build effect ranges for all properties
    const effectRanges = [];

    // TranslateX ranges
    for (let k = 0; k < keyframes.length; k++) {
      effectRanges.push({
        key: 'translateX',
        val: translateXValues[k],
        prog: keyframes[k],
      });
    }

    // TranslateY ranges
    for (let k = 0; k < keyframes.length; k++) {
      effectRanges.push({
        key: 'translateY',
        val: translateYValues[k],
        prog: keyframes[k],
      });
    }

    // RotateZ ranges
    for (let k = 0; k < keyframes.length; k++) {
      effectRanges.push({
        key: 'rotateZ',
        val: rotateZValues[k],
        prog: keyframes[k],
      });
    }

    // Opacity ranges
    for (let k = 0; k < keyframes.length; k++) {
      effectRanges.push({
        key: 'opacity',
        val: opacityValues[k],
        prog: keyframes[k],
      });
    }

    // Hue-rotate filter ranges
    for (let k = 0; k < keyframes.length; k++) {
      effectRanges.push({
        key: 'filter',
        val: `hue-rotate(${hueRotateValues[k]}deg)`,
        prog: keyframes[k],
      });
    }

    const panelId = `wave-panel-${i}`;

    const panelComponent: RenderableComponentData = {
      id: panelId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="absolute w-full bg-gradient-to-r" style="top: ${topPosition}%; height: ${panelHeight}%; background: linear-gradient(to right, ${gradientColors.from}, ${gradientColors.via}, ${gradientColors.to});"></div>`,
        className: 'absolute w-full',
        style: {
          top: `${topPosition}%`,
          height: `${panelHeight}%`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `wave-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [panelId],
            ranges: effectRanges,
          },
        },
      ],
    };

    panelChildren.push(panelComponent);
  }

  const rootContainer: RenderableComponentData = {
    id: 'wave-panel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: panelChildren,
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
  id: 'WavePanelTransition',
  title: 'Wave Panel Transition',
  description:
    'Organic wave panel transition with horizontal strips undulating across the screen using sine wave motion. Features variable amplitude (stronger center, gentler edges), rotation effects based on wave position, flowing color gradient via hue-rotate filter, secondary vertical floating, and subtle opacity variation. Perfect for ambient or artistic content with seamless looping capability.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wave', 'panel', 'sine', 'organic', 'artistic', 'ambient'],
  defaultInputParams: {
    duration: 3,
    panelCount: 10,
    centerAmplitude: 100,
    edgeAmplitude: 50,
    phaseOffset: 0.785,
    verticalFloat: 20,
    maxRotation: 5,
    gradientColors: {
      from: '#3B82F6',
      via: '#9333EA',
      to: '#EC4899',
    },
    minOpacity: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const WavePanelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};