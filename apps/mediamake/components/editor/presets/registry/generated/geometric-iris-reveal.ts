/**
 * Geometric Iris Reveal Preset
 *
 * Creates a mechanical aperture effect using 12 triangular blades that rotate and expand from center
 * like origami unfolding. Features metallic gradients, 3D depth, synchronized motion with mechanical snap,
 * and servo-motor micro-vibrations for a premium engineered feel.
 *
 * Features:
 * - 12 triangular blades arranged in circular pattern
 * - Combined rotation (90° outward) and translation (radial expansion)
 * - 3D depth with rotateX transformation
 * - Metallic gradient styling with highlights and shadows
 * - Micro-vibration effects simulating servo motor movement
 * - Spring-based easing for mechanical snap feel
 * - Staggered timing for fluid cascading motion
 * - Precise 1.8 second duration with optimal timing
 *
 * Use cases:
 * - Premium video intros/outros
 * - Product reveal animations
 * - Channel branding transitions
 * - Mechanical/tech-themed content
 * - High-end corporate presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  trackName: z
    .string()
    .default('iris-reveal')
    .describe('Name of the track (used for component IDs)'),
  duration: z
    .number()
    .min(1)
    .max(5)
    .default(1.8)
    .describe('Duration of the iris reveal animation in seconds'),
  bladeCount: z
    .number()
    .min(6)
    .max(16)
    .default(12)
    .describe('Number of triangular blades (6-16)'),
  bladeWidth: z
    .number()
    .min(100)
    .max(300)
    .default(200)
    .describe('Width of each blade in pixels'),
  bladeHeight: z
    .number()
    .min(200)
    .max(500)
    .default(400)
    .describe('Height of each blade in pixels'),
  rotationAmount: z
    .number()
    .min(45)
    .max(120)
    .default(90)
    .describe('Amount of rotation in degrees for each blade'),
  expansionDistance: z
    .number()
    .min(100)
    .max(400)
    .default(200)
    .describe('Distance blades move outward in pixels'),
  metallic: z
    .boolean()
    .default(true)
    .describe('Apply metallic gradient styling to blades'),
  vibrationIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Intensity of micro-vibration effects (0-1)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .describe('Delay between blade animations in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackName,
    duration,
    bladeCount,
    bladeWidth,
    bladeHeight,
    rotationAmount,
    expansionDistance,
    metallic,
    vibrationIntensity,
    staggerDelay,
  } = params;

  // Calculate angle between blades
  const angleStep = 360 / bladeCount;

  // Timing breakdown for precise mechanical motion
  const rotationDuration = 0.8; // Blade rotation phase
  const translationStart = 0.2; // Translation starts 0.2s in
  const translationDuration = 1.0; // Translation phase
  const flipStart = 0.4; // 3D flip starts 0.4s in
  const flipDuration = 1.0; // 3D flip phase
  const vibrationStart = 0.05; // Vibration starts early
  const vibrationDuration = 0.1; // Short vibration burst

  // Metallic gradient
  const metallicGradient = metallic
    ? 'linear-gradient(135deg, #aaaaaa 0%, #666666 50%, #333333 100%)'
    : 'linear-gradient(135deg, #808080 0%, #404040 100%)';

  // Create blade components
  const blades: RenderableComponentData[] = [];
  const bladeEffects: RenderableComponentData[] = [];

  for (let i = 0; i < bladeCount; i++) {
    const bladeId = `${trackName}-blade-${i}`;
    const initialRotation = i * angleStep;
    const stagger = i * staggerDelay;

    // Create blade HTMLBlockAtom (using HTML instead of deprecated ShapeAtom)
    const blade: RenderableComponentData = {
      id: bladeId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute',
        style: {
          width: `${bladeWidth}px`,
          height: `${bladeHeight}px`,
          top: '50%',
          left: '50%',
          transformOrigin: 'bottom center',
          background: metallicGradient,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', // Triangle shape
          boxShadow:
            '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 -2px 4px rgba(255, 255, 255, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transformStyle: 'preserve-3d',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [],
    };

    blades.push(blade);

    // Initial rotation effect (instant positioning)
    const initialEffect: RenderableComponentData = {
      id: `${bladeId}-initial`,
      type: 'atom' as const,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: 0,
        mode: 'provider',
        targetIds: [bladeId],
        ranges: [
          { key: 'rotateZ', val: initialRotation, prog: 0 },
          { key: 'translateX', val: -50, prog: 0 }, // Center adjustment
          { key: 'translateY', val: -100, prog: 0 }, // Start position (closed)
        ],
      },
    };
    bladeEffects.push(initialEffect);

    // Rotation animation (mechanical snap)
    const rotationEffect: RenderableComponentData = {
      id: `${bladeId}-rotation`,
      type: 'atom' as const,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Spring tension easing
        start: stagger,
        duration: rotationDuration,
        mode: 'provider',
        targetIds: [bladeId],
        ranges: [
          { key: 'rotateZ', val: initialRotation, prog: 0 },
          { key: 'rotateZ', val: initialRotation + rotationAmount, prog: 1 },
        ],
      },
    };
    bladeEffects.push(rotationEffect);

    // Translation animation (outward expansion)
    const translationEffect: RenderableComponentData = {
      id: `${bladeId}-translation`,
      type: 'atom' as const,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        start: translationStart + stagger,
        duration: translationDuration,
        mode: 'provider',
        targetIds: [bladeId],
        ranges: [
          { key: 'translateY', val: -100, prog: 0 },
          { key: 'translateY', val: -100 - expansionDistance, prog: 1 },
        ],
      },
    };
    bladeEffects.push(translationEffect);

    // 3D flip effect (depth)
    const flipEffect: RenderableComponentData = {
      id: `${bladeId}-flip`,
      type: 'atom' as const,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: flipStart + stagger,
        duration: flipDuration,
        mode: 'provider',
        targetIds: [bladeId],
        ranges: [
          { key: 'rotateX', val: 0, prog: 0 },
          { key: 'rotateX', val: 15, prog: 1 }, // 15° tilt for depth
        ],
      },
    };
    bladeEffects.push(flipEffect);

    // Micro-vibration effect (servo motor simulation)
    if (vibrationIntensity > 0) {
      const vibrationEffect: RenderableComponentData = {
        id: `${bladeId}-vibration`,
        type: 'atom' as const,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: vibrationStart + stagger,
          duration: vibrationDuration,
          mode: 'provider',
          targetIds: [bladeId],
          ranges: [
            {
              key: 'scale',
              val: 1 - 0.02 * vibrationIntensity,
              prog: 0,
            },
            {
              key: 'scale',
              val: 1 + 0.02 * vibrationIntensity,
              prog: 0.25,
            },
            {
              key: 'scale',
              val: 1 - 0.02 * vibrationIntensity,
              prog: 0.5,
            },
            {
              key: 'scale',
              val: 1 + 0.02 * vibrationIntensity,
              prog: 0.75,
            },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      };
      bladeEffects.push(vibrationEffect);
    }
  }

  // Container layout
  const container: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden flex items-center justify-center',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: blades,
    effects: bladeEffects,
  };

  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'geometric-iris-reveal',
  title: 'Geometric Iris Reveal',
  description:
    'A mechanical aperture effect using 12 triangular blades that rotate and expand from center like origami unfolding. Features metallic gradients, 3D depth, synchronized motion with mechanical snap, and servo-motor micro-vibrations for a premium engineered feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'reveal',
    'geometric',
    'mechanical',
    'iris',
    'aperture',
    'premium',
    'engineering',
    '3d',
    'metallic',
  ],
  dependencies: {},
  defaultInputParams: {
    trackName: 'iris-reveal',
    duration: 1.8,
    bladeCount: 12,
    bladeWidth: 200,
    bladeHeight: 400,
    rotationAmount: 90,
    expansionDistance: 200,
    metallic: true,
    vibrationIntensity: 1,
    staggerDelay: 0.02,
  },
};

export const geometricIrisRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
