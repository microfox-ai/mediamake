/**
 * Particle Dissolution Transition Preset
 *
 * A sophisticated video transition where the outgoing video breaks apart into a grid of 64 square particles (8x8)
 * that float upward with physics-like properties (random rotation, horizontal drift, variable speeds) while fading out.
 * Simultaneously reveals the incoming video with a vignette effect that clears as particles disappear.
 * Includes motion blur on fast-moving particles for cinematic quality.
 *
 * Features:
 * - 8x8 grid of particles (64 total) from outgoing video
 * - Physics-like particle animation (float upward, rotate, drift horizontally)
 * - Randomized delays and durations for organic dissolution
 * - Motion blur on faster-moving particles
 * - Incoming video fades in with vignette effect that clears
 * - Overflow visible to allow particles to float outside bounds
 *
 * Use cases:
 * - Creative video transitions
 * - Dynamic scene changes
 * - Dramatic reveals
 * - Cinematic video editing
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  transitionDuration: z.number().default(1.5).describe('Duration of the transition effect in seconds'),
  gridSize: z.number().default(8).describe('Grid size (8x8 = 64 particles)'),
  particleFloatRange: z.object({
    min: z.number().default(-100).describe('Minimum upward float distance in pixels'),
    max: z.number().default(-300).describe('Maximum upward float distance in pixels'),
  }),
  particleDriftRange: z.object({
    min: z.number().default(-50).describe('Minimum horizontal drift in pixels'),
    max: z.number().default(50).describe('Maximum horizontal drift in pixels'),
  }),
  particleRotateRange: z.object({
    min: z.number().default(-180).describe('Minimum rotation in degrees'),
    max: z.number().default(180).describe('Maximum rotation in degrees'),
  }),
  particleDelayRange: z.object({
    min: z.number().default(0).describe('Minimum delay in seconds'),
    max: z.number().default(0.4).describe('Maximum delay in seconds'),
  }),
  particleDurationRange: z.object({
    min: z.number().default(0.8).describe('Minimum animation duration in seconds'),
    max: z.number().default(1.4).describe('Maximum animation duration in seconds'),
  }),
  motionBlurRange: z.object({
    min: z.number().default(0).describe('Minimum motion blur in pixels'),
    max: z.number().default(4).describe('Maximum motion blur in pixels'),
  }),
  particleZIndexRange: z.object({
    min: z.number().default(10).describe('Minimum z-index for particles'),
    max: z.number().default(74).describe('Maximum z-index for particles'),
  }),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    gridSize,
    particleFloatRange,
    particleDriftRange,
    particleRotateRange,
    particleDelayRange,
    particleDurationRange,
    motionBlurRange,
    particleZIndexRange,
  } = params;

  // Calculate BaseLayout duration
  const baseLayoutDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper function to generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper function to generate random integer in range
  const randomIntInRange = (min: number, max: number): number => {
    return Math.floor(randomInRange(min, max + 1));
  };

  // Generate particles
  const particlesData: RenderableComponentData[] = [];
  const cellWidth = 100 / gridSize; // Percentage
  const cellHeight = 100 / gridSize; // Percentage

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const particleId = `particle-${row}-${col}`;

      // Random animation parameters
      const translateY = randomInRange(particleFloatRange.min, particleFloatRange.max);
      const translateX = randomInRange(particleDriftRange.min, particleDriftRange.max);
      const rotate = randomInRange(particleRotateRange.min, particleRotateRange.max);
      const delay = randomInRange(particleDelayRange.min, particleDelayRange.max);
      const duration = randomInRange(particleDurationRange.min, particleDurationRange.max);
      const blur = randomInRange(motionBlurRange.min, motionBlurRange.max);
      const zIndex = randomIntInRange(particleZIndexRange.min, particleZIndexRange.max);

      // Calculate clip path for this particle
      const clipLeft = col * cellWidth;
      const clipTop = row * cellHeight;
      const clipRight = 100 - (col + 1) * cellWidth;
      const clipBottom = 100 - (row + 1) * cellHeight;

      const particleData: RenderableComponentData = {
        id: particleId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          muted: true,
          loop: false,
          className: 'w-full h-full object-cover',
          style: {
            position: 'absolute',
            width: `${cellWidth}%`,
            height: `${cellHeight}%`,
            top: `${clipTop}%`,
            left: `${clipLeft}%`,
            clipPath: `inset(${clipTop}% ${clipRight}% ${clipBottom}% ${clipLeft}%)`,
            objectFit: 'cover',
            willChange: 'transform',
            zIndex: zIndex,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
        effects: [
          {
            id: `${particleId}-transform`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: delay,
              duration: duration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: translateY, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: translateX, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: rotate, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'filter_blur', val: 0, prog: 0 },
                { key: 'filter_blur', val: blur, prog: 0.5 },
                { key: 'filter_blur', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };

      particlesData.push(particleData);
    }
  }

  // Particles container
  const particlesContainer: RenderableComponentData = {
    id: 'particles-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: particlesData,
  };

  // Incoming video
  const incomingVideoData: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      muted: true,
      loop: false,
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'vignette-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter_brightness', val: 0.6, prog: 0 },
            { key: 'filter_brightness', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'particle-dissolution-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-visible',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [incomingVideoData, particlesContainer],
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
  id: 'particle-dissolution-transition',
  title: 'Particle Dissolution Transition',
  description:
    'A sophisticated video transition where the outgoing video breaks apart into a grid of 64 square particles (8x8) that float upward with physics-like properties (random rotation, horizontal drift, variable speeds) while fading out. Simultaneously reveals the incoming video with a vignette effect that clears as particles disappear. Includes motion blur on fast-moving particles for cinematic quality.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'particles', 'dissolution', 'video', 'cinematic', 'physics'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 5,
    },
    transitionDuration: 1.5,
    gridSize: 8,
    particleFloatRange: {
      min: -100,
      max: -300,
    },
    particleDriftRange: {
      min: -50,
      max: 50,
    },
    particleRotateRange: {
      min: -180,
      max: 180,
    },
    particleDelayRange: {
      min: 0,
      max: 0.4,
    },
    particleDurationRange: {
      min: 0.8,
      max: 1.4,
    },
    motionBlurRange: {
      min: 0,
      max: 4,
    },
    particleZIndexRange: {
      min: 10,
      max: 74,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const particleDissolutionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
