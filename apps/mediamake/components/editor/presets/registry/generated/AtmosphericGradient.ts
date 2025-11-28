/**
 * Atmospheric Gradient Overlay Effect Preset
 *
 * This internal effect preset creates dynamic gradient overlays simulating heat haze color shifts.
 * It uses generic effects to animate background gradient properties, creating shifting color bands
 * that move vertically like heat waves.
 *
 * Features:
 * - Animated linear-gradient with rotating angles
 * - Color stop positions that shift to create flowing atmospheric effects
 * - Subtle backdrop-filter blur animations for additional depth
 * - Opacity pulsing to enhance the heat distortion illusion
 * - Configurable blend modes for different visual effects
 * - Customizable gradient colors, flow speed, and opacity
 *
 * Technical Implementation:
 * - Uses generic effects with provider mode to animate background, opacity, and backdrop-filter
 * - Animates linear-gradient angles and color stops for flowing color bands
 * - Creates translucent, flowing color layer that enhances heat distortion
 *
 * Use cases:
 * - Adding atmospheric depth to video compositions
 * - Creating heat haze effects for summer/desert themes
 * - Enhancing visual interest with flowing color overlays
 * - Building dynamic gradient backgrounds with subtle animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply the atmospheric gradient effect to'),
  gradientColors: z
    .array(z.string())
    .default(['rgba(255,100,0,0.1)', 'rgba(255,200,0,0.05)', 'rgba(255,150,50,0.08)'])
    .describe('Array of RGBA color strings for the gradient stops'),
  flowSpeed: z
    .number()
    .default(5000)
    .describe('Animation duration in milliseconds for one complete flow cycle'),
  gradientAngle: z
    .number()
    .default(180)
    .describe('Initial rotation angle of the linear gradient in degrees'),
  blendMode: z
    .string()
    .default('screen')
    .describe('CSS mix-blend-mode value for overlay blending (screen, overlay, soft-light, etc.)'),
  opacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Base opacity strength of the gradient overlay (0-1)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Duration of the effect in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate gradient string with animated color stops
  const generateGradientKeyframes = () => {
    const colors = params.gradientColors;
    const angleStart = params.gradientAngle;
    const angleEnd = angleStart + 360; // Full rotation

    // Create keyframes that animate gradient angle and color stop positions
    const keyframes = [];

    // Keyframe at 0% - initial state
    const stopPositions0 = colors.map((_, idx) => {
      const position = (idx / (colors.length - 1)) * 100;
      return `${position}%`;
    });
    keyframes.push({
      prog: 0,
      angle: angleStart,
      stops: stopPositions0,
    });

    // Keyframe at 25% - shift positions
    const stopPositions25 = colors.map((_, idx) => {
      const position = (idx / (colors.length - 1)) * 100 + 15;
      return `${position}%`;
    });
    keyframes.push({
      prog: 0.25,
      angle: angleStart + 90,
      stops: stopPositions25,
    });

    // Keyframe at 50% - further shift
    const stopPositions50 = colors.map((_, idx) => {
      const position = (idx / (colors.length - 1)) * 100 + 30;
      return `${position}%`;
    });
    keyframes.push({
      prog: 0.5,
      angle: angleStart + 180,
      stops: stopPositions50,
    });

    // Keyframe at 75% - shift back
    const stopPositions75 = colors.map((_, idx) => {
      const position = (idx / (colors.length - 1)) * 100 + 15;
      return `${position}%`;
    });
    keyframes.push({
      prog: 0.75,
      angle: angleStart + 270,
      stops: stopPositions75,
    });

    // Keyframe at 100% - return to initial (loop seamlessly)
    keyframes.push({
      prog: 1,
      angle: angleEnd,
      stops: stopPositions0,
    });

    return keyframes;
  };

  const gradientKeyframes = generateGradientKeyframes();
  const colors = params.gradientColors;

  // Create animation ranges for background gradient
  const backgroundRanges = gradientKeyframes.map((kf) => {
    const colorStops = colors
      .map((color, idx) => `${color} ${kf.stops[idx]}`)
      .join(', ');
    return {
      key: 'background',
      val: `linear-gradient(${kf.angle}deg, ${colorStops})`,
      prog: kf.prog,
    };
  });

  // Create animation ranges for opacity pulsing
  const opacityMin = params.opacity * 0.7;
  const opacityMax = params.opacity;
  const opacityRanges = [
    { key: 'opacity', val: opacityMin, prog: 0 },
    { key: 'opacity', val: opacityMax, prog: 0.25 },
    { key: 'opacity', val: opacityMin, prog: 0.5 },
    { key: 'opacity', val: opacityMax, prog: 0.75 },
    { key: 'opacity', val: opacityMin, prog: 1 },
  ];

  // Create animation ranges for backdrop-filter blur
  const blurRanges = [
    { key: 'backdropFilter', val: 'blur(0px)', prog: 0 },
    { key: 'backdropFilter', val: 'blur(2px)', prog: 0.5 },
    { key: 'backdropFilter', val: 'blur(0px)', prog: 1 },
  ];

  // Create animation ranges for mix-blend-mode (constant)
  const blendModeRanges = [
    { key: 'mixBlendMode', val: params.blendMode, prog: 0 },
  ];

  // Combine all ranges
  const allRanges = [
    ...backgroundRanges,
    ...opacityRanges,
    ...blurRanges,
    ...blendModeRanges,
  ];

  // Convert flowSpeed from milliseconds to seconds
  const flowSpeedSeconds = params.flowSpeed / 1000;

  // Create the generic effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear for smooth continuous animation
    start: params.effectStart,
    duration: flowSpeedSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: allRanges,
  };

  // Create the effect object
  const effect = {
    id: `atmospheric-gradient-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Create container with effect
  const effectContainer: RenderableComponentData = {
    id: 'atmospheric-gradient-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none' as const,
          willChange: 'background, opacity, backdrop-filter',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.effectDuration,
      },
    },
    effects: [effect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [effectContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'AtmosphericGradient',
  title: 'Atmospheric Gradient Overlay Effect',
  description:
    'Internal effect preset creating dynamic gradient overlays simulating heat haze color shifts with vertical flowing color bands, animated gradient angles, color stop positions, and subtle backdrop-filter animations for atmospheric depth',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'gradient', 'atmospheric', 'heat-haze', 'overlay', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['atmospheric-gradient-overlay'],
    gradientColors: [
      'rgba(255,100,0,0.1)',
      'rgba(255,200,0,0.05)',
      'rgba(255,150,50,0.08)',
    ],
    flowSpeed: 5000,
    gradientAngle: 180,
    blendMode: 'screen',
    opacity: 0.3,
    effectStart: 0,
    effectDuration: 10,
  },
};

export const AtmosphericGradientPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
