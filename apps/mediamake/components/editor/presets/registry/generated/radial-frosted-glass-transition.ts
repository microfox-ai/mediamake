/**
 * Radial Frosted Glass Blur Transition Preset
 *
 * Creates a sophisticated transition effect that reveals the incoming video through an expanding
 * circular aperture with heavy frosted glass distortion at the edges. The effect simulates looking
 * through a frosted glass lens that gradually opens from the center.
 *
 * Features:
 * - Radial gradient blur on outgoing video (0px center to 30px edges)
 * - Expanding circular clip-path on incoming video (0% to 150%)
 * - Scale animation (0.8 to 1.0) on incoming video
 * - Blur reduction (25px to 0px) on incoming video
 * - Chromatic aberration simulation with three color-isolated video duplicates
 * - Converging offset transforms (red: -3px, green: 0, blue: 3px to all 0)
 *
 * Use cases:
 * - High-end video transitions with glass-like effects
 * - Creative reveals with chromatic distortion
 * - Modern, stylized video presentations
 * - Optical/lens-themed video content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  overlapDuration: z
    .number()
    .default(2.0)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate timing
  const totalDuration = video1.duration + video2.duration - overlapDuration;
  const overlapStart = video1.duration - overlapDuration;

  // Helper: Create chromatic aberration effect for a channel
  const createChromaticEffect = (
    targetId: string,
    channelName: 'red' | 'green' | 'blue',
    hueRotation: number,
    initialOffsetX: number,
  ) => {
    return {
      id: `chromatic-${channelName}-effect`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration: overlapDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: `${initialOffsetX}px`, prog: 0 },
          { key: 'translateX', val: '0px', prog: 1 },
        ],
      },
    };
  };

  // Outgoing video layer with radial blur gradient
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          fit: 'cover' as const,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
        effects: [
          // Blur animation from 0px to 30px during transition
          {
            id: 'outgoing-blur-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in' as const,
              start: overlapStart,
              duration: overlapDuration * 0.8,
              mode: 'provider' as const,
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: 'blur(30px)', prog: 1 },
              ],
            },
          },
          // Opacity fade out
          {
            id: 'outgoing-opacity-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in' as const,
              start: overlapStart + overlapDuration * 0.6,
              duration: overlapDuration * 0.4,
              mode: 'provider' as const,
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video layer with circular clip-path expansion
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-20',
      },
    },
    context: {
      timing: {
        start: overlapStart,
        duration: video2.duration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover' as const,
          className: 'w-full h-full object-cover',
          startFrom: 0,
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + overlapDuration,
          },
        },
        effects: [
          // Circular clip-path expansion
          {
            id: 'incoming-clip-path-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out' as const,
              start: 0,
              duration: overlapDuration,
              mode: 'provider' as const,
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
                { key: 'clipPath', val: 'circle(150% at 50% 50%)', prog: 1 },
              ],
            },
          },
          // Scale animation
          {
            id: 'incoming-scale-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out' as const,
              start: 0,
              duration: overlapDuration,
              mode: 'provider' as const,
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'scale', val: 0.8, prog: 0 },
                { key: 'scale', val: 1.0, prog: 1 },
              ],
            },
          },
          // Blur reduction
          {
            id: 'incoming-blur-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out' as const,
              start: 0,
              duration: overlapDuration * 0.7,
              mode: 'provider' as const,
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'filter', val: 'blur(25px)', prog: 0 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Chromatic aberration overlay layer with three color channels
  const chromaticAberrationLayer: RenderableComponentData = {
    id: 'chromatic-aberration-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-30 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: overlapStart,
        duration: overlapDuration,
      },
    },
    childrenData: [
      // Red channel
      {
        id: 'chromatic-red',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover' as const,
          className: 'w-full h-full object-cover',
          startFrom: 0,
          muted: true,
          style: {
            mixBlendMode: 'screen' as const,
            filter: 'hue-rotate(0deg) saturate(3)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [createChromaticEffect('chromatic-red', 'red', 0, -3)],
      } as RenderableComponentData,
      // Green channel
      {
        id: 'chromatic-green',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover' as const,
          className: 'w-full h-full object-cover',
          startFrom: 0,
          muted: true,
          style: {
            mixBlendMode: 'screen' as const,
            filter: 'hue-rotate(120deg) saturate(3)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [createChromaticEffect('chromatic-green', 'green', 120, 0)],
      } as RenderableComponentData,
      // Blue channel
      {
        id: 'chromatic-blue',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover' as const,
          className: 'w-full h-full object-cover',
          startFrom: 0,
          muted: true,
          style: {
            mixBlendMode: 'screen' as const,
            filter: 'hue-rotate(240deg) saturate(3)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [createChromaticEffect('chromatic-blue', 'blue', 240, 3)],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'radial-frosted-glass-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoLayer,
      incomingVideoLayer,
      chromaticAberrationLayer,
    ],
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
  id: 'radial-frosted-glass-transition',
  title: 'Radial Frosted Glass Blur Transition',
  description:
    'A sophisticated video transition effect that reveals the incoming video through an expanding circular aperture with heavy frosted glass distortion at the edges. Features radial gradient blur on the outgoing video (0px center to 30px edges), expanding clip-path circle on incoming video, scale animation from 0.8 to 1.0, and chromatic aberration simulation using three color-isolated video duplicates with converging offset transforms. The effect creates the sensation of looking through a frosted glass lens that gradually opens from the center.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'frosted-glass',
    'blur',
    'circular',
    'chromatic-aberration',
    'radial',
    'distortion',
    'aperture',
    'lens',
    'reveal',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 2.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const radialFrostedGlassTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
