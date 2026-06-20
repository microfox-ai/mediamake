/**
 * Velocity Field Motion Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset applies motion blur and distortion effects based on simulated vector fields.
 * It creates swirling, turbulent motion blur patterns that make content appear caught in a high-speed vortex
 * or wind tunnel. Supports multiple field types (linear, radial, spiral, turbulent) with configurable strength,
 * turbulence, and optional chromatic distortion and heat shimmer effects.
 *
 * Features:
 * - Vector field simulation (linear, radial, spiral, turbulent)
 * - Position-dependent directional motion blur
 * - Subtle position drift following field vectors
 * - Optional chromatic aberration distortion
 * - Optional heat shimmer via SVG turbulence
 * - Complex AnimationRange calculations based on field position
 *
 * Use cases:
 * - Creating vortex/whirlpool effects on text or images
 * - Wind tunnel motion blur simulations
 * - High-speed turbulent motion effects
 * - Abstract swirling visual effects
 * - Energy field distortions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the velocity field effect to'),
  fieldType: z
    .enum(['linear', 'radial', 'spiral', 'turbulent'])
    .describe(
      'Type of vector field: linear (directional), radial (outward/inward), spiral (rotating), turbulent (chaotic)',
    ),
  fieldStrength: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Strength of the velocity field motion (0.1 = subtle, 5 = extreme)'),
  turbulence: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Amount of turbulence/noise in the field (0 = smooth, 1 = chaotic)'),
  chromaticDistortion: z
    .boolean()
    .default(false)
    .describe('Enable chromatic aberration distortion during peak velocity'),
  heatShimmer: z
    .boolean()
    .default(false)
    .describe('Enable heat shimmer distortion effect via SVG turbulence'),
  fieldCenter: z
    .object({
      x: z
        .number()
        .min(0)
        .max(1)
        .default(0.5)
        .describe('Horizontal center of the field (0 = left, 1 = right)'),
      y: z
        .number()
        .min(0)
        .max(1)
        .default(0.5)
        .describe('Vertical center of the field (0 = top, 1 = bottom)'),
    })
    .default({ x: 0.5, y: 0.5 })
    .describe('Center point of the velocity field (normalized coordinates)'),
  duration: z
    .number()
    .min(0.5)
    .max(30)
    .default(3)
    .describe('Duration of the effect in seconds'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to component timeline'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    fieldType,
    fieldStrength,
    turbulence,
    chromaticDistortion,
    heatShimmer,
    fieldCenter,
    duration,
    effectStart,
  } = params;

  // Helper function to calculate vector field direction and magnitude based on position
  const calculateFieldVector = (
    normalizedX: number,
    normalizedY: number,
    time: number,
  ): { angle: number; magnitude: number } => {
    const dx = normalizedX - fieldCenter.x;
    const dy = normalizedY - fieldCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Add time-based animation to the field
    const animTime = time * Math.PI * 2;

    let angle = 0;
    let magnitude = 0;

    switch (fieldType) {
      case 'linear':
        // Linear field flows in one direction (horizontal sweep)
        angle = Math.PI / 4 + Math.sin(animTime) * 0.3;
        magnitude = fieldStrength * (0.7 + Math.sin(animTime + normalizedX * Math.PI) * 0.3);
        break;

      case 'radial':
        // Radial field expands/contracts from center
        angle = Math.atan2(dy, dx);
        magnitude = fieldStrength * distance * (0.8 + Math.sin(animTime) * 0.2);
        break;

      case 'spiral':
        // Spiral field rotates around center
        angle = Math.atan2(dy, dx) + distance * Math.PI + animTime * 0.5;
        magnitude = fieldStrength * (0.5 + distance * 0.5) * (0.8 + Math.sin(animTime) * 0.2);
        break;

      case 'turbulent':
        // Turbulent field with chaotic motion
        const noiseX = Math.sin(normalizedX * 10 + animTime * 2) * Math.cos(normalizedY * 8);
        const noiseY = Math.cos(normalizedX * 8 + animTime * 1.5) * Math.sin(normalizedY * 10);
        angle = Math.atan2(noiseY + dy, noiseX + dx);
        magnitude =
          fieldStrength *
          (0.6 + Math.abs(noiseX + noiseY) * 0.4) *
          (1 + turbulence * Math.sin(animTime * 3));
        break;
    }

    // Add turbulence noise to all field types
    const turbulenceNoise =
      turbulence * (Math.sin(normalizedX * 20 + animTime * 4) * 0.5 + 0.5);
    angle += turbulenceNoise * Math.PI * 0.5;
    magnitude *= 1 + turbulenceNoise * 0.3;

    return { angle, magnitude };
  };

  // Helper function to generate motion blur filter based on field vector
  const generateMotionBlurRanges = (targetId: string) => {
    const ranges = [];

    // Sample multiple points throughout the animation
    const samplePoints = 8;
    for (let i = 0; i <= samplePoints; i++) {
      const prog = i / samplePoints;
      const time = prog;

      // Calculate field vector for center position (approximate)
      const { angle, magnitude } = calculateFieldVector(0.5, 0.5, time);

      // Convert angle to blur direction
      const blurX = Math.cos(angle) * magnitude * 10;
      const blurY = Math.sin(angle) * magnitude * 10;

      // Create directional motion blur using drop-shadow
      const blurIntensity = Math.min(magnitude * 5, 20);
      const blurFilter = `drop-shadow(${blurX}px ${blurY}px ${blurIntensity}px rgba(0,0,0,0.3)) blur(${blurIntensity * 0.3}px)`;

      ranges.push({ key: 'filter', val: blurFilter, prog });
    }

    return ranges;
  };

  // Helper function to generate position drift ranges
  const generatePositionDriftRanges = () => {
    const ranges = [];

    const samplePoints = 10;
    for (let i = 0; i <= samplePoints; i++) {
      const prog = i / samplePoints;
      const time = prog;

      // Calculate drift based on field
      const { angle, magnitude } = calculateFieldVector(0.5, 0.5, time);

      const driftX = Math.cos(angle) * magnitude * 5 * fieldStrength;
      const driftY = Math.sin(angle) * magnitude * 5 * fieldStrength;

      ranges.push({ key: 'translateX', val: driftX, prog });
      ranges.push({ key: 'translateY', val: driftY, prog });
    }

    return ranges;
  };

  // Helper function to generate chromatic distortion ranges
  const generateChromaticRanges = () => {
    const ranges = [];

    if (!chromaticDistortion) return ranges;

    const samplePoints = 6;
    for (let i = 0; i <= samplePoints; i++) {
      const prog = i / samplePoints;
      const time = prog;

      const { magnitude } = calculateFieldVector(0.5, 0.5, time);

      // Peak chromatic distortion at high velocities
      const chromaticIntensity = Math.min(magnitude * 3, 1);
      const offset = chromaticIntensity * 4;

      // Use drop-shadow to simulate chromatic aberration
      const chromaticFilter = `drop-shadow(${offset}px 0px 0px rgba(255,0,0,0.5)) drop-shadow(-${offset}px 0px 0px rgba(0,255,255,0.5))`;

      ranges.push({ key: 'filter', val: chromaticFilter, prog });
    }

    return ranges;
  };

  // Create effects array
  const effects = [];

  // 1. Main motion blur and drift effect
  for (const targetId of targetIds) {
    const motionBlurRanges = generateMotionBlurRanges(targetId);
    const driftRanges = generatePositionDriftRanges();

    const fieldEffectData: GenericEffectData = {
      type: 'linear',
      start: effectStart,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [...motionBlurRanges, ...driftRanges],
    };

    effects.push({
      id: `velocity-field-${targetId}`,
      componentId: 'generic',
      data: fieldEffectData,
    });

    // 2. Optional chromatic distortion effect
    if (chromaticDistortion) {
      const chromaticRanges = generateChromaticRanges();

      if (chromaticRanges.length > 0) {
        const chromaticEffectData: GenericEffectData = {
          type: 'ease-in-out',
          start: effectStart,
          duration: duration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: chromaticRanges,
        };

        effects.push({
          id: `chromatic-${targetId}`,
          componentId: 'generic',
          data: chromaticEffectData,
        });
      }
    }
  }

  // 3. Optional heat shimmer effect (SVG turbulence)
  let shimmerComponent: RenderableComponentData | null = null;

  if (heatShimmer) {
    const svgTurbulence = `
      <svg style="position: absolute; width: 0; height: 0;">
        <defs>
          <filter id="velocity-heat-shimmer">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02 0.05"
              numOctaves="3"
              result="turbulence"
            >
              <animate
                attributeName="baseFrequency"
                dur="${duration}s"
                values="0.02 0.05; 0.04 0.08; 0.02 0.05"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="turbulence"
              scale="${fieldStrength * 20}"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    `;

    shimmerComponent = {
      id: 'velocity-shimmer-svg',
      componentId: 'HTMLBlockAtom',
      type: 'atom' as const,
      data: {
        html: svgTurbulence,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none' as const,
          zIndex: 1000,
        },
      },
      context: {
        timing: {
          start: effectStart,
          duration: duration,
        },
      },
    } as RenderableComponentData;
  }

  // Construct output container with effects
  const childrenData: RenderableComponentData[] = [];

  if (shimmerComponent) {
    childrenData.push(shimmerComponent);
  }

  const rootContainer: RenderableComponentData = {
    id: 'velocityField-effect-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: 0,
        },
      },
    },
    effects: effects,
    childrenData: childrenData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'velocityFieldEffect',
  title: 'Velocity Field Motion Effect',
  description:
    'Internal effect preset that generates motion blur and distortion effects based on simulated vector fields (linear, radial, spiral, turbulent). Creates swirling, vortex-like motion patterns with optional chromatic distortion and heat shimmer effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'internal',
    'generic',
    'motion-blur',
    'velocity',
    'vortex',
    'turbulent',
    'distortion',
    'heat-shimmer',
    'chromatic',
    'vector-field',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    fieldType: 'spiral',
    fieldStrength: 1,
    turbulence: 0.3,
    chromaticDistortion: false,
    heatShimmer: false,
    fieldCenter: { x: 0.5, y: 0.5 },
    duration: 3,
    effectStart: 0,
  },
};

// Export preset
export const velocityFieldEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
