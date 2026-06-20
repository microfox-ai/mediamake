/**
 * Venetian Blinds Transition Preset
 *
 * This preset creates a cinematic film noir venetian blinds transition effect.
 * It simulates horizontal strips (blinds) that slide sequentially from right to left,
 * revealing content underneath with a cascading delay pattern and subtle 3D depth rotation.
 *
 * Features:
 * - **Cascading Animation**: 10 horizontal blinds with 50ms stagger delays
 * - **Depth Rotation**: Subtle rotateY animation for 3D appearance
 * - **Shadow Effects**: Dynamic drop-shadow that fades as blinds slide out
 * - **Smooth Easing**: Ease-in-out curve over 1.5 seconds total duration
 * - **Full Coverage**: Blinds start fully closed and slide completely off-screen
 * - **GPU Acceleration**: transform-gpu and will-change-transform for performance
 *
 * Use cases:
 * - Scene transitions with cinematic flair
 * - Revealing content with dramatic effect
 * - Film noir styled video intros
 * - Professional video transitions between segments
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  numberOfBlinds: z
    .number()
    .int()
    .min(5)
    .max(20)
    .default(10)
    .describe('Number of horizontal blinds (5-20)'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Total duration of the transition in seconds'),
  staggerDelay: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Delay between each blind animation in seconds'),
  rotationDegrees: z
    .number()
    .min(-45)
    .max(45)
    .default(-15)
    .describe('Rotation angle for depth effect (-45 to 45 degrees)'),
  blindColor: z
    .string()
    .default('#1a1a1a')
    .describe('Color of the blinds (hex color)'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of the drop shadow (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    numberOfBlinds,
    transitionDuration,
    staggerDelay,
    rotationDegrees,
    blindColor,
    shadowIntensity,
  } = params;

  // Calculate blind height percentage
  const blindHeightPercent = 100 / numberOfBlinds;

  // Generate blinds
  const blinds: RenderableComponentData[] = [];

  for (let i = 0; i < numberOfBlinds; i++) {
    const topPosition = i * blindHeightPercent;
    const effectDelay = i * staggerDelay;

    const blindId = `venetian-blind-${i}`;

    const blind: RenderableComponentData = {
      id: blindId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-full left-0 transform-gpu will-change-transform',
          style: {
            height: `${blindHeightPercent}%`,
            top: `${topPosition}%`,
            backgroundColor: blindColor,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `${blindId}-slide-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: effectDelay,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [blindId],
            ranges: [
              // Slide from right to left (0% to -105% for complete hiding)
              { key: 'translateX', val: 0, prog: 0, unit: '%' },
              { key: 'translateX', val: -105, prog: 1, unit: '%' },
              // Subtle rotation for depth
              { key: 'rotateY', val: 0, prog: 0, unit: 'deg' },
              { key: 'rotateY', val: rotationDegrees, prog: 1, unit: 'deg' },
              // Drop shadow that fades as blind moves
              {
                key: 'filter',
                val: `drop-shadow(0px 4px 6px rgba(0,0,0,${shadowIntensity}))`,
                prog: 0,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0px 0px 0px transparent)',
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [],
    };

    blinds.push(blind);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'venetian-blinds-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration + (numberOfBlinds - 1) * staggerDelay,
      },
    },
    childrenData: blinds,
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
  id: 'venetian-blinds-transition',
  title: 'Venetian Blinds Transition',
  description:
    'Cinematic film noir venetian blinds transition with cascading horizontal strips that slide right-to-left with depth rotation and shadow effects, revealing content underneath',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'blinds',
    'venetian',
    'cinematic',
    'film-noir',
    'cascading',
    'horizontal',
    'depth',
    '3d',
    'shadow',
  ],
  defaultInputParams: {
    numberOfBlinds: 10,
    transitionDuration: 1.5,
    staggerDelay: 0.05,
    rotationDegrees: -15,
    blindColor: '#1a1a1a',
    shadowIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const venetianBlindsTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
