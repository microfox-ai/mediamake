/**
 * Gyroscopic Gimbal Transition Preset
 *
 * This preset creates a complex 3-axis gimbal transition between two videos, simulating pitch (X-axis),
 * yaw (Y-axis), and roll (Z-axis) rotations. The outgoing video tumbles away with simultaneous rotations
 * using different easing functions, while the incoming video unwinds from inverse rotations. The transition
 * includes metallic sheen overlays that sweep across the videos and radial vignette effects that intensify
 * during peak rotation, creating a cinematic 3D effect.
 *
 * Features:
 * - **3-Axis Rotation**: Simultaneous X, Y, Z rotations with independent timing functions
 * - **Complex Easing**: X-axis (ease-in), Y-axis (linear), Z-axis (ease-out) for dynamic motion
 * - **Inverse Unwinding**: Incoming video starts with negative rotations and unwinds to normal
 * - **Metallic Sheen**: Animated gradient overlays simulate reflective surfaces during rotation
 * - **Radial Vignette**: Darkens corners during peak rotation with dynamic opacity
 * - **3D Perspective**: transform-style: preserve-3d and perspective: 1200px for depth
 * - **Clean 3D Rendering**: backface-visibility: hidden prevents rendering artifacts
 * - **Synchronized Timing**: 1.5-second overlap with all effects perfectly timed
 *
 * Use cases:
 * - Creating cinematic transitions between video clips
 * - Simulating camera gimbal movements for dynamic storytelling
 * - Adding mechanical/industrial-style transitions to montages
 * - Building futuristic or tech-themed video presentations
 * - Enhancing sports or action video sequences with dynamic motion
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video (video transitioning out)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (video transitioning in)'),
  outgoingDuration: z
    .number()
    .min(0.1)
    .describe('Duration of the outgoing video in seconds'),
  incomingDuration: z
    .number()
    .min(0.1)
    .describe('Duration of the incoming video in seconds'),
  overlapDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Duration of the transition overlap in seconds (default: 1.5s)'),
  rotateXDegrees: z
    .number()
    .min(0)
    .max(720)
    .default(360)
    .describe('X-axis rotation degrees for outgoing video (pitch, default: 360)'),
  rotateYDegrees: z
    .number()
    .min(0)
    .max(720)
    .default(270)
    .describe('Y-axis rotation degrees for outgoing video (yaw, default: 270)'),
  rotateZDegrees: z
    .number()
    .min(0)
    .max(720)
    .default(450)
    .describe('Z-axis rotation degrees for outgoing video (roll, default: 450)'),
  perspectiveDistance: z
    .number()
    .min(500)
    .max(3000)
    .default(1200)
    .describe('CSS perspective distance in pixels (default: 1200px)'),
  sheenSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for metallic sheen animation (default: 1)'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Maximum opacity of vignette at peak rotation (default: 0.5)'),
  trackName: z
    .string()
    .default('gyro-gimbal-transition')
    .describe('Track name for unique IDs (default: gyro-gimbal-transition)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingDuration,
    incomingDuration,
    overlapDuration,
    rotateXDegrees,
    rotateYDegrees,
    rotateZDegrees,
    perspectiveDistance,
    sheenSpeed,
    vignetteIntensity,
    trackName,
  } = params;

  // Calculate total transition duration (both videos minus overlap)
  const totalDuration = outgoingDuration + incomingDuration - overlapDuration;

  // Incoming video starts before outgoing ends (overlap)
  const incomingStartTime = outgoingDuration - overlapDuration;

  // Create outgoing video container with 3-axis rotation effects
  const outgoingContainer: RenderableComponentData = {
    id: `${trackName}-outgoing-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      // X-axis rotation (pitch) - ease-in
      {
        id: `${trackName}-outgoing-rotateX`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [`${trackName}-outgoing-container`],
          ranges: [
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: rotateXDegrees, prog: 1 },
          ],
        },
      },
      // Y-axis rotation (yaw) - linear
      {
        id: `${trackName}-outgoing-rotateY`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [`${trackName}-outgoing-container`],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: rotateYDegrees, prog: 1 },
          ],
        },
      },
      // Z-axis rotation (roll) - ease-out
      {
        id: `${trackName}-outgoing-rotateZ`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [`${trackName}-outgoing-container`],
          ranges: [
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: rotateZDegrees, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      // Outgoing video atom
      {
        id: `${trackName}-outgoing-video`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
      // Metallic sheen overlay for outgoing
      {
        id: `${trackName}-outgoing-sheen`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            mixBlendMode: 'overlay',
          },
        },
        context: {
          timing: {
            start: outgoingDuration - overlapDuration,
            duration: overlapDuration,
          },
        },
        effects: [
          {
            id: `${trackName}-outgoing-sheen-translate`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: overlapDuration / sheenSpeed,
              mode: 'provider',
              targetIds: [`${trackName}-outgoing-sheen`],
              ranges: [
                { key: 'translateX', val: '-100%', prog: 0 },
                { key: 'translateX', val: '100%', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Radial vignette for outgoing
      {
        id: `${trackName}-outgoing-vignette`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)',
          },
        },
        context: {
          timing: {
            start: outgoingDuration - overlapDuration,
            duration: overlapDuration,
          },
        },
        effects: [
          {
            id: `${trackName}-outgoing-vignette-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: [`${trackName}-outgoing-vignette`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: vignetteIntensity, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Create incoming video container with inverse rotation effects (unwinding)
  const incomingContainer: RenderableComponentData = {
    id: `${trackName}-incoming-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingDuration + overlapDuration,
      },
    },
    effects: [
      // X-axis rotation (pitch) - inverse, ease-out (opposite of outgoing)
      {
        id: `${trackName}-incoming-rotateX`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [`${trackName}-incoming-container`],
          ranges: [
            { key: 'rotateX', val: -rotateXDegrees, prog: 0 },
            { key: 'rotateX', val: 0, prog: 1 },
          ],
        },
      },
      // Y-axis rotation (yaw) - inverse, linear
      {
        id: `${trackName}-incoming-rotateY`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [`${trackName}-incoming-container`],
          ranges: [
            { key: 'rotateY', val: -rotateYDegrees, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
      // Z-axis rotation (roll) - inverse, ease-in (opposite of outgoing)
      {
        id: `${trackName}-incoming-rotateZ`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [`${trackName}-incoming-container`],
          ranges: [
            { key: 'rotateZ', val: -rotateZDegrees, prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      // Incoming video atom
      {
        id: `${trackName}-incoming-video`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration + overlapDuration,
          },
        },
      } as RenderableComponentData,
      // Metallic sheen overlay for incoming
      {
        id: `${trackName}-incoming-sheen`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            mixBlendMode: 'overlay',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [
          {
            id: `${trackName}-incoming-sheen-translate`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: overlapDuration / sheenSpeed,
              mode: 'provider',
              targetIds: [`${trackName}-incoming-sheen`],
              ranges: [
                { key: 'translateX', val: '-100%', prog: 0 },
                { key: 'translateX', val: '100%', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Radial vignette for incoming
      {
        id: `${trackName}-incoming-vignette`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [
          {
            id: `${trackName}-incoming-vignette-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: [`${trackName}-incoming-vignette`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: vignetteIntensity, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          perspective: `${perspectiveDistance}px`,
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingContainer, incomingContainer],
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
  id: 'gyroscopic-gimbal-transition',
  title: 'Gyroscopic Gimbal Transition',
  description:
    'A 3-axis gimbal transition preset that simulates pitch (X), yaw (Y), and roll (Z) rotations simultaneously. The outgoing video rotates with different timing functions (ease-in, linear, ease-out) while the incoming video unwinds from inverse rotations. Features metallic sheen overlays and radial vignette effects during rotation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'gimbal',
    '3d',
    'rotation',
    'cinematic',
    'mechanical',
    'complex',
    'multi-axis',
    'sheen',
    'vignette',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingDuration: 5,
    incomingDuration: 5,
    overlapDuration: 1.5,
    rotateXDegrees: 360,
    rotateYDegrees: 270,
    rotateZDegrees: 450,
    perspectiveDistance: 1200,
    sheenSpeed: 1,
    vignetteIntensity: 0.5,
    trackName: 'gyro-gimbal-transition',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const gyroscopicGimbalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
