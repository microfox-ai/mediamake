/**
 * Temporal Shift Glitch Effect Preset
 * 
 * Creates time displacement artifacts with frame dropping/duplicating effects using:
 * - 3D depth distortion via translateZ with perspective
 * - Rapid opacity strobing (ghost frames)
 * - Z-axis rotation for spatial confusion
 * - Spring easing for jarring temporal jumps
 * 
 * Technical Implementation:
 * - Uses transform-style: preserve-3d on parent container
 * - Perspective (800px) creates depth-based distortion
 * - TranslateZ ranges from -50px to 50px
 * - RotateZ ranges from -15deg to 15deg
 * - Opacity strobes between 0 and 1 based on frameDropRate
 * - Spring easing creates jarring, unpredictable temporal jumps
 * 
 * Use cases:
 * - Glitch effects for tech/cyberpunk content
 * - Time displacement visual effects
 * - Sci-fi temporal anomaly simulations
 * - Creative transitions with depth distortion
 * - Ghost frame effects for horror/suspense
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters with descriptions
const presetParams = z.object({
  frameDropRate: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      'Rate of frame dropping/ghosting effect (0 = smooth, 1 = maximum glitch)',
    ),
  temporalOffset: z
    .number()
    .default(100)
    .describe(
      'Temporal offset in milliseconds for displacement timing jitter',
    ),
  depthDistortion: z
    .number()
    .default(50)
    .describe(
      'Maximum depth distortion in pixels for translateZ effect (default: 50)',
    ),
  duration: z
    .number()
    .default(0.75)
    .describe('Duration of the glitch effect in seconds'),
  start: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),
  targetIds: z
    .array(z.string())
    .optional()
    .describe(
      'Array of component IDs to apply the effect to (optional, uses children if not provided)',
    ),
  children: z
    .array(z.any())
    .optional()
    .describe('Child components to wrap with glitch effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    frameDropRate = 0.5,
    temporalOffset = 100,
    depthDistortion = 50,
    duration = 0.75,
    start = 0,
    targetIds,
    children = [],
  } = params;

  // Helper function to calculate opacity strobing based on frameDropRate
  const calculateOpacityRanges = (): Array<{ key: string; val: number; prog: number }> => {
    const ranges = [];
    const numGhostFrames = Math.ceil(frameDropRate * 5); // More ghost frames with higher rate
    
    for (let i = 0; i <= numGhostFrames; i++) {
      const progress = i / numGhostFrames;
      // Alternate between visible and invisible for strobing effect
      const opacity = i % 2 === 0 ? 1 : 0;
      ranges.push({ key: 'opacity', val: opacity, prog: progress });
    }
    
    // Ensure we end at full opacity
    if (ranges[ranges.length - 1].val !== 1) {
      ranges.push({ key: 'opacity', val: 1, prog: 1 });
    }
    
    return ranges;
  };

  // Helper function to calculate depth distortion ranges
  const calculateDepthRanges = (): Array<{ key: string; val: number; prog: number }> => {
    const maxDepth = depthDistortion;
    const temporalJitter = temporalOffset / 1000; // Convert to seconds for progress calculation
    
    return [
      { key: 'translateZ', val: 0, prog: 0 },
      { key: 'translateZ', val: maxDepth, prog: 0.2 + temporalJitter * 0.1 },
      { key: 'translateZ', val: -maxDepth, prog: 0.4 + temporalJitter * 0.15 },
      { key: 'translateZ', val: maxDepth * 0.5, prog: 0.6 + temporalJitter * 0.1 },
      { key: 'translateZ', val: -maxDepth * 0.3, prog: 0.8 },
      { key: 'translateZ', val: 0, prog: 1 },
    ];
  };

  // Helper function to calculate rotation ranges for spatial confusion
  const calculateRotationRanges = (): Array<{ key: string; val: number; prog: number }> => {
    const maxRotation = 15;
    
    return [
      { key: 'rotateZ', val: 0, prog: 0 },
      { key: 'rotateZ', val: maxRotation, prog: 0.25 },
      { key: 'rotateZ', val: -maxRotation, prog: 0.5 },
      { key: 'rotateZ', val: maxRotation * 0.6, prog: 0.75 },
      { key: 'rotateZ', val: 0, prog: 1 },
    ];
  };

  // Combine all animation ranges
  const allRanges = [
    ...calculateOpacityRanges(),
    ...calculateDepthRanges(),
    ...calculateRotationRanges(),
  ];

  // Determine target IDs
  const effectTargetIds = targetIds || ['glitch-wrapper'];

  // Create the glitch effect
  const glitchEffect = {
    id: 'temporal-shift-glitch-effect',
    componentId: 'generic',
    data: {
      type: 'spring',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: effectTargetIds,
      ranges: allRanges,
    } as GenericEffectData,
  };

  // Create wrapper component with 3D transform styles
  const glitchWrapper: RenderableComponentData = {
    id: 'glitch-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [glitchEffect],
    childrenData: children as RenderableComponentData[],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'glitch-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '800px',
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: start,
        duration: duration,
      },
    },
    childrenData: [glitchWrapper],
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
  id: 'temporal-shift-glitch',
  title: 'Temporal Shift Glitch Effect',
  description:
    'Creates time displacement artifacts with 3D depth distortion, rapid opacity strobing (ghost frames), and Z-axis rotation for spatial confusion. Uses spring easing for jarring temporal jumps.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'glitch',
    'temporal',
    'time-displacement',
    '3d',
    'depth',
    'distortion',
    'ghost-frames',
    'strobing',
    'rotation',
    'spatial',
    'spring',
    'tech',
    'cyberpunk',
    'effects',
  ],
  defaultInputParams: {
    frameDropRate: 0.5,
    temporalOffset: 100,
    depthDistortion: 50,
    duration: 0.75,
    start: 0,
    children: [],
  },
  dependencies: {},
};

// Export preset
export const temporalShiftGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
