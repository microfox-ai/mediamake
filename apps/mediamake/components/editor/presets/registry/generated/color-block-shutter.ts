/**
 * Color Block Shutter Preset
 *
 * Creates a mechanical iris/shutter effect using rotating triangular or polygonal colored blades
 * that open or close from the edges toward the center. Mimics camera shutter or aperture blade effects
 * with precise, dramatic visual transitions.
 *
 * Features:
 * - **Blade Count**: Support 3-12 blades for different shutter configurations
 * - **Rotation Patterns**: Clockwise, counter-clockwise, or alternating blade rotation
 * - **Color Schemes**: Customizable color per blade for vibrant shutter effects
 * - **Shutter Action**: Open (blades rotate out) or close (blades rotate in)
 * - **Staggered Timing**: Optional blade stagger for sequential rotation
 * - **Motion Blur**: Optional motion blur for fast rotations
 * - **Rotation Speed Curves**: Smooth easing for realistic mechanical motion
 *
 * Use cases:
 * - Dramatic reveals with mechanical precision
 * - Camera-inspired transitions between scenes
 * - Creative wipes with geometric patterns
 * - Stylized opening/closing sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  bladeCount: z
    .number()
    .min(3)
    .max(12)
    .describe('Number of shutter blades (3-12)'),
  rotationPattern: z
    .enum(['clockwise', 'counter-clockwise', 'alternating'])
    .describe('Rotation pattern for blades'),
  bladeColors: z
    .array(z.string())
    .describe('Array of CSS color strings for each blade (repeats if fewer than bladeCount)'),
  shutterAction: z
    .enum(['open', 'close'])
    .describe('Whether shutter opens (blades rotate out) or closes (blades rotate in)'),
  staggered: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable staggered blade animation timing'),
  staggerDelay: z
    .number()
    .optional()
    .default(0.05)
    .describe('Delay between each blade start time in seconds (when staggered is true)'),
  motionBlur: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable motion blur effect for fast rotations'),
  duration: z
    .number()
    .optional()
    .default(1.0)
    .describe('Duration of shutter animation in seconds'),
  bladeOverlap: z
    .number()
    .optional()
    .default(0)
    .describe('Blade overlap amount in degrees for smooth transitions'),
  easingType: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .optional()
    .default('ease-in-out')
    .describe('Easing function for blade rotation'),
  targetIds: z
    .array(z.string())
    .optional()
    .default([])
    .describe('Optional target component IDs to apply shutter effect to'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    bladeCount,
    rotationPattern,
    bladeColors,
    shutterAction,
    staggered,
    staggerDelay,
    motionBlur,
    duration,
    bladeOverlap,
    easingType,
    targetIds,
  } = params;

  // Helper: Calculate blade angle
  const calculateBladeAngle = (index: number): number => {
    return (360 / bladeCount) * index;
  };

  // Helper: Get rotation for blade based on pattern
  const getBladeRotation = (index: number): number => {
    if (rotationPattern === 'clockwise') {
      return shutterAction === 'open' ? 90 : -90;
    } else if (rotationPattern === 'counter-clockwise') {
      return shutterAction === 'open' ? -90 : 90;
    } else {
      // alternating
      const isEven = index % 2 === 0;
      if (shutterAction === 'open') {
        return isEven ? 90 : -90;
      } else {
        return isEven ? -90 : 90;
      }
    }
  };

  // Helper: Get blade color
  const getBladeColor = (index: number): string => {
    return bladeColors[index % bladeColors.length];
  };

  // Create blade components with effects
  const bladeChildrenData: RenderableComponentData[] = [];

  for (let i = 0; i < bladeCount; i++) {
    const bladeAngle = calculateBladeAngle(i);
    const bladeRotation = getBladeRotation(i);
    const bladeColor = getBladeColor(i);
    const bladeStartTime = staggered ? i * (staggerDelay || 0.05) : 0;

    // Calculate clip-path for triangular blade shape
    // Blade is a triangle from center point extending outward
    const bladeWidth = 100 / bladeCount + (bladeOverlap || 0);
    const clipPathValue = `polygon(50% 50%, ${50 - bladeWidth / 2}% 0%, ${50 + bladeWidth / 2}% 0%)`;

    // Initial rotation (starting position)
    const initialRotate = shutterAction === 'open' ? 0 : bladeRotation;
    const finalRotate = shutterAction === 'open' ? bladeRotation : 0;

    const bladeId = `shutter-blade-${i}`;

    // Create blade effect ranges
    const bladeRanges = [
      // Rotation animation
      { key: 'rotate', val: initialRotate, prog: 0 },
      { key: 'rotate', val: finalRotate, prog: 1 },
      // Opacity fade in/out
      { key: 'opacity', val: shutterAction === 'open' ? 1 : 0, prog: 0 },
      { key: 'opacity', val: shutterAction === 'open' ? 0 : 1, prog: 1 },
    ];

    // Add motion blur if enabled
    if (motionBlur) {
      bladeRanges.push(
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: 'blur(4px)', prog: 0.5 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      );
    }

    // Create blade effect
    const bladeEffect = {
      id: `shutter-effect-${i}`,
      componentId: 'generic',
      data: {
        type: easingType,
        start: bladeStartTime,
        duration: duration || 1.0,
        mode: 'provider' as const,
        targetIds: [bladeId],
        ranges: bladeRanges,
      },
    };

    // Create blade HTML (using HTMLBlockAtom for SVG blade shape)
    const bladeHtml = `
      <div style="
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        transform-origin: center center;
        transform: rotate(${bladeAngle}deg);
        clip-path: ${clipPathValue};
      ">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: ${bladeColor};
          transform-origin: center center;
        "></div>
      </div>
    `;

    const bladeComponent: RenderableComponentData = {
      id: bladeId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: bladeHtml,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          zIndex: 10 + i,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: (duration || 1.0) + bladeStartTime,
        },
      },
      effects: [bladeEffect],
    };

    bladeChildrenData.push(bladeComponent);
  }

  // Create shutter container
  const shutterContainer: RenderableComponentData = {
    id: 'color-block-shutter-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          (duration || 1.0) +
          (staggered ? (bladeCount - 1) * (staggerDelay || 0.05) : 0),
      },
    },
    childrenData: bladeChildrenData,
  };

  return {
    output: {
      childrenData: [shutterContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: targetIds.length > 0 ? targetIds[0] : 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'color-block-shutter',
  title: 'Color Block Shutter',
  description:
    'Creates a mechanical iris/shutter effect using rotating triangular or polygonal colored blades that open or close from the edges toward the center. Supports 3-12 blades with customizable rotation patterns, colors, and motion blur for dramatic reveals and transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'shutter',
    'iris',
    'wipe',
    'geometric',
    'mechanical',
    'camera',
    'aperture',
    'reveal',
    'dramatic',
  ],
  defaultInputParams: {
    bladeCount: 6,
    rotationPattern: 'clockwise',
    bladeColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'],
    shutterAction: 'open',
    staggered: true,
    staggerDelay: 0.05,
    motionBlur: false,
    duration: 1.0,
    bladeOverlap: 5,
    easingType: 'ease-in-out',
    targetIds: [],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const colorBlockShutterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
