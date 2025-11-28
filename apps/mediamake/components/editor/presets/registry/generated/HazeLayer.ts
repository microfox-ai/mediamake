/**
 * HazeLayer Combined Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 *
 * This internal effect preset stacks multiple atmospheric effects to create depth and dimension.
 * It returns an array of three generic effects with staggered timing for natural, asynchronous movement:
 *
 * 1. **Blur Effect**: Gaussian blur animation cycling from 0 to configurable max blur (default 4px)
 * 2. **Drift Effect**: Horizontal drift using translateX with ease-in-out easing
 * 3. **Opacity Effect**: Misty fade oscillating between configurable min opacity and 1.0
 *
 * Each effect has slightly different timing (controlled by stagger parameter) to create
 * a more organic, layered atmospheric effect. The effects are designed to be applied to
 * the same target components to create a comprehensive haze appearance.
 *
 * Features:
 * - **Configurable Parameters**: Control drift distance, speed, blur range, opacity range, and stagger timing
 * - **Staggered Start Times**: Each effect starts with a delay for asynchronous movement
 * - **Different Durations**: Effects have varying durations (base, 1.2x, 0.8x) for natural feel
 * - **Ease-in-out Transitions**: Smooth, cyclical animations
 *
 * Use cases:
 * - Creating atmospheric depth in backgrounds
 * - Adding subtle motion to static elements
 * - Building layered fog/mist effects
 * - Enhancing environmental mood and dimension
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the haze effects to'),
  driftDistance: z
    .number()
    .default(30)
    .describe('Maximum horizontal drift distance in pixels'),
  driftSpeed: z
    .number()
    .default(4000)
    .describe('Base duration for drift effect in milliseconds (blur uses this, drift uses 1.2x, opacity uses 0.8x)'),
  blurRange: z
    .number()
    .default(4)
    .describe('Maximum blur amount in pixels (effect cycles from 0 to this value)'),
  opacityMin: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Minimum opacity value for the misty fade effect (0-1)'),
  stagger: z
    .number()
    .default(200)
    .describe('Delay in milliseconds between effect start times (drift starts after 1x stagger, opacity after 2x stagger)'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    targetIds,
    driftDistance = 30,
    driftSpeed = 4000,
    blurRange = 4,
    opacityMin = 0.7,
    stagger = 200,
    effectIdPrefix = 'haze',
  } = params;

  // Convert milliseconds to seconds for Remotion timing
  const driftSpeedSec = driftSpeed / 1000;
  const staggerSec = stagger / 1000;

  // Effect 1: Gaussian Blur Animation (0 to blurRange)
  const blurEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0, // Starts immediately
    duration: driftSpeedSec,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'filter', val: 'blur(0px)', prog: 0 },
      { key: 'filter', val: `blur(${blurRange}px)`, prog: 0.5 },
      { key: 'filter', val: 'blur(0px)', prog: 1 },
    ],
  };

  // Effect 2: Horizontal Drift (translateX -driftDistance to +driftDistance)
  const driftEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: staggerSec, // Starts after stagger delay
    duration: driftSpeedSec * 1.2, // 20% longer duration for different timing
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'translateX', val: -driftDistance, prog: 0 },
      { key: 'translateX', val: 0, prog: 0.5 },
      { key: 'translateX', val: driftDistance, prog: 1 },
    ],
  };

  // Effect 3: Opacity Fade (opacityMin to 1.0)
  const opacityEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: staggerSec * 2, // Starts after 2x stagger delay
    duration: driftSpeedSec * 0.8, // 20% shorter duration for different timing
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'opacity', val: opacityMin, prog: 0 },
      { key: 'opacity', val: 1.0, prog: 0.5 },
      { key: 'opacity', val: opacityMin, prog: 1 },
    ],
  };

  // Create effect nodes with unique IDs
  const effects = [
    {
      id: `${effectIdPrefix}-blur-${targetIds.join('-')}`,
      componentId: 'generic',
      data: blurEffect,
    },
    {
      id: `${effectIdPrefix}-drift-${targetIds.join('-')}`,
      componentId: 'generic',
      data: driftEffect,
    },
    {
      id: `${effectIdPrefix}-opacity-${targetIds.join('-')}`,
      componentId: 'generic',
      data: opacityEffect,
    },
  ];

  // Calculate total duration needed to contain all effects
  const maxEffectEnd = Math.max(
    driftSpeedSec,
    staggerSec + driftSpeedSec * 1.2,
    staggerSec * 2 + driftSpeedSec * 0.8,
  );

  // Root container with minimal duration to hold the effects
  const rootContainer = {
    id: 'haze-layer-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: maxEffectEnd,
      },
    },
    effects: effects,
    childrenData: [],
  } as RenderableComponentData;

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
  id: 'HazeLayer',
  title: 'HazeLayer Combined Effect',
  description:
    'An internal effect preset that stacks multiple atmospheric effects (gaussian blur cycling 0-4px, horizontal drift with translateX, misty fade with opacity oscillation) to create depth and dimension. Returns an array of effect objects with configurable drift distance, speed, blur range, opacity min, and stagger delays for natural asynchronous movement.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'atmospheric', 'haze', 'blur', 'drift', 'opacity', 'internal', 'generic', 'combined'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    driftDistance: 30,
    driftSpeed: 4000,
    blurRange: 4,
    opacityMin: 0.7,
    stagger: 200,
  },
};

export const HazeLayerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
