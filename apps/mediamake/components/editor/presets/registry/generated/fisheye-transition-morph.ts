/**
 * Fisheye Transition Morph Preset
 *
 * A multi-stage fisheye distortion effect that morphs between normal and fisheye view
 * using CSS perspective and transform3d. Perfect for video transitions or image galleries
 * with smooth barrel distortion animation from edges to center.
 *
 * Features:
 * - **Multi-Stage Distortion**: Configurable 3-5 distortion levels with smooth transitions
 * - **Distortion Curves**: Linear or exponential curve options for distortion progression
 * - **Hold Duration**: Configurable hold period at peak distortion
 * - **Reverse Option**: Can reverse the effect direction
 * - **Aspect Ratio Preservation**: Careful attention to maintaining aspect ratios during distortion
 * - **3D Perspective**: Uses CSS perspective and transform3d for realistic depth
 * - **Lens Effect**: Includes borderRadius animation for circular lens distortion
 *
 * Use cases:
 * - Creating dynamic transitions between video clips or images
 * - Building image gallery morphing effects
 * - Adding stylized distortion to media content
 * - Creating fish-eye lens simulation effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the fisheye morph effect to'),
  stages: z
    .number()
    .min(3)
    .max(5)
    .default(3)
    .describe('Number of distortion stages (3-5)'),
  curve: z
    .enum(['linear', 'exponential'])
    .default('exponential')
    .describe('Distortion curve type: linear or exponential progression'),
  holdDuration: z
    .number()
    .default(0.2)
    .describe(
      'Duration in seconds to hold at peak distortion (as fraction of total duration)',
    ),
  reverse: z
    .boolean()
    .default(false)
    .describe('Reverse the effect direction (distort to normal instead of normal to distort)'),
  duration: z
    .number()
    .default(2)
    .describe('Total duration of the morph effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetIds, stages, curve, holdDuration, reverse, duration } = params;

  // Helper function to calculate distortion value based on curve type
  const calculateDistortion = (progress: number, maxValue: number): number => {
    if (curve === 'exponential') {
      // Exponential curve: slow start, fast end
      return maxValue * Math.pow(progress, 2);
    }
    // Linear curve
    return maxValue * progress;
  };

  // Helper function to generate stage keyframes
  const generateStageKeyframes = () => {
    const keyframes: Array<{
      perspective: string;
      rotateY: string;
      scale: number;
      prog: number;
    }> = [];

    // Total progress sections
    const holdFraction = holdDuration;
    const morphInDuration = (1 - holdFraction) / 2; // First half
    const morphOutDuration = (1 - holdFraction) / 2; // Second half

    // Generate morph-in stages
    for (let i = 0; i <= stages; i++) {
      const stageProgress = i / stages;
      const prog = morphInDuration * stageProgress;

      // Calculate distortion values
      const perspectiveValue = 1000 - calculateDistortion(stageProgress, 800); // 1000px -> 200px
      const rotateYValue = calculateDistortion(stageProgress, 5); // 0deg -> 5deg
      const scaleValue = 1 + calculateDistortion(stageProgress, 0.3); // 1 -> 1.3

      keyframes.push({
        perspective: `${perspectiveValue}px`,
        rotateY: i % 2 === 0 ? `${rotateYValue}deg` : `${-rotateYValue}deg`, // Alternate direction
        scale: scaleValue,
        prog: reverse ? 1 - prog : prog,
      });
    }

    // Hold at peak distortion
    const peakKeyframe = keyframes[keyframes.length - 1];
    keyframes.push({
      ...peakKeyframe,
      prog: reverse
        ? 1 - (morphInDuration + holdFraction)
        : morphInDuration + holdFraction,
    });

    // Generate morph-out stages (reverse of morph-in)
    for (let i = stages - 1; i >= 0; i--) {
      const stageProgress = i / stages;
      const prog =
        morphInDuration + holdFraction + morphOutDuration * (1 - stageProgress);

      const perspectiveValue = 1000 - calculateDistortion(stageProgress, 800);
      const rotateYValue = calculateDistortion(stageProgress, 5);
      const scaleValue = 1 + calculateDistortion(stageProgress, 0.3);

      keyframes.push({
        perspective: `${perspectiveValue}px`,
        rotateY: i % 2 === 0 ? `${rotateYValue}deg` : `${-rotateYValue}deg`,
        scale: scaleValue,
        prog: reverse ? 1 - prog : prog,
      });
    }

    return keyframes;
  };

  // Generate transform ranges
  const stageKeyframes = generateStageKeyframes();
  const transformRanges = stageKeyframes.map((kf) => ({
    key: 'transform',
    val: `perspective(${kf.perspective}) rotateY(${kf.rotateY}) scale(${kf.scale})`,
    prog: kf.prog,
  }));

  // Generate borderRadius ranges for lens effect
  const borderRadiusRanges = [
    { key: 'borderRadius', val: '0%', prog: reverse ? 1 : 0 },
    {
      key: 'borderRadius',
      val: '50%',
      prog: 0.5,
    },
    { key: 'borderRadius', val: '0%', prog: reverse ? 0 : 1 },
  ];

  // Create the morph effect
  const morphEffect = {
    id: 'fisheye-morph-effect',
    componentId: 'generic',
    data: {
      type: curve === 'exponential' ? 'ease-in-out' : 'linear',
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: targetIds,
      ranges: [...transformRanges, ...borderRadiusRanges],
    },
  };

  // Create container for the effect
  const rootContainer: RenderableComponentData = {
    id: 'fisheye-morph-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [morphEffect],
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
  id: 'fisheye-transition-morph',
  title: 'Fisheye Transition Morph',
  description:
    'A multi-stage fisheye distortion effect that morphs between normal and fisheye view using CSS perspective and transform3d. Perfect for video transitions or image galleries with smooth barrel distortion animation from edges to center. Supports 3-5 distortion stages, linear/exponential curves, configurable hold duration at peak distortion, and reverse option.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'transition',
    'fisheye',
    'morph',
    'distortion',
    'perspective',
    '3d',
  ],
  defaultInputParams: {
    targetIds: ['component-1'],
    stages: 3,
    curve: 'exponential',
    holdDuration: 0.2,
    reverse: false,
    duration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const fisheyeTransitionMorphPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
