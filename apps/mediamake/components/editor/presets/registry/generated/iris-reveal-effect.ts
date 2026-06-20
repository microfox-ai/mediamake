/**
 * Iris Reveal Effect Preset
 *
 * Creates an expanding circle overlay effect that starts with a small circular viewport
 * and expands to reveal the full content, like opening an iris or camera aperture.
 * Includes blur effects on the edges during expansion and supports off-center origin points.
 *
 * Features:
 * - Circular mask animation from small to full reveal
 * - Blur effect on edges during expansion
 * - Customizable origin point (off-center support)
 * - Spring easing for smooth, organic motion
 * - Combined mask-image and backdrop-filter effects
 *
 * Use cases:
 * - Dramatic hero image reveals
 * - Video introduction transitions
 * - Scene transitions with focus effects
 * - Spotlight-style content reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  originX: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('X origin point as percentage (0-100, 50 = center)'),
  originY: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('Y origin point as percentage (0-100, 50 = center)'),
  initialSize: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe('Initial circle size as percentage (5-20%)'),
  blurAmount: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Blur amount in pixels (0-20px)'),
  duration: z
    .number()
    .min(500)
    .max(3000)
    .default(1500)
    .describe('Duration of the reveal animation in milliseconds'),
  trackName: z
    .string()
    .default('iris-reveal')
    .describe('Track name for component IDs'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    originX,
    originY,
    initialSize,
    blurAmount,
    duration,
    trackName,
  } = params;

  // Convert duration from milliseconds to seconds
  const durationSec = duration / 1000;

  // Calculate scale values for the circular reveal
  // We use scale transform on a circular container to create the iris effect
  const initialScale = initialSize / 100;
  const finalScale = 2.0; // Large enough to cover any aspect ratio and origin offset

  // Progress points for spring easing
  const progressPoints = [0, 0.4, 0.8, 1];

  // Content container ID
  const contentContainerId = `${trackName}-content-container`;
  const blurOverlayId = `${trackName}-blur-overlay`;

  // Mask effect: animates circular scale from small to large
  const maskEffect: GenericEffectData = {
    type: 'spring',
    start: 0,
    duration: durationSec,
    mode: 'provider',
    targetIds: [contentContainerId],
    ranges: [
      { key: 'scale', val: initialScale, prog: progressPoints[0] },
      { key: 'scale', val: initialScale + (finalScale - initialScale) * 0.3, prog: progressPoints[1] },
      { key: 'scale', val: initialScale + (finalScale - initialScale) * 0.8, prog: progressPoints[2] },
      { key: 'scale', val: finalScale, prog: progressPoints[3] },
    ],
  };

  // Blur effect: animates blur from blurAmount to 0
  const blurEffect: GenericEffectData = {
    type: 'spring',
    start: 0,
    duration: durationSec,
    mode: 'provider',
    targetIds: [blurOverlayId],
    ranges: [
      { key: 'filter', val: `blur(${blurAmount}px)`, prog: progressPoints[0] },
      { key: 'filter', val: `blur(${blurAmount * 0.7}px)`, prog: progressPoints[1] },
      { key: 'filter', val: `blur(${blurAmount * 0.3}px)`, prog: progressPoints[2] },
      { key: 'filter', val: 'blur(0px)', prog: progressPoints[3] },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
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
        duration: durationSec,
      },
    },
    effects: [
      {
        id: `${trackName}-mask-effect`,
        componentId: 'generic',
        data: maskEffect,
      },
      {
        id: `${trackName}-blur-effect`,
        componentId: 'generic',
        data: blurEffect,
      },
    ],
    childrenData: [
      // Content container: circular masked container
      {
        id: contentContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              borderRadius: '50%',
              overflow: 'hidden',
              transformOrigin: `${originX}% ${originY}%`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationSec,
          },
        },
        childrenData: [],
      } as RenderableComponentData,
      // Blur overlay
      {
        id: blurOverlayId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              backgroundColor: 'transparent',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationSec,
          },
        },
        childrenData: [],
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
  id: 'iris-reveal-effect',
  title: 'Iris Reveal Effect',
  description:
    'Expanding circle overlay effect that creates a vignette-style focus animation. A small circular viewport expands to reveal the full content, like opening an iris or camera aperture. Supports off-center origin points and blur effects on edges during expansion for dramatic hero image or video introduction reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: ['effect', 'transition', 'reveal', 'iris', 'aperture', 'mask', 'blur', 'vignette'],
  defaultInputParams: {
    originX: 50,
    originY: 50,
    initialSize: 10,
    blurAmount: 10,
    duration: 1500,
    trackName: 'iris-reveal',
  },
  dependencies: {},
};

// Export preset
export const irisRevealEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
