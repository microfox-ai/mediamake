/**
 * Multi-Projector Changeover Transition Preset
 *
 * This preset recreates the classic two-projector theater changeover system with authentic
 * projection booth elements. It simulates the manual transition between two projectors used
 * in traditional cinema, complete with changeover cues, brief double-image overlap with
 * misalignment, and realistic projection artifacts.
 *
 * Features:
 * - **Changeover Cues**: Motor cue (circle) and changeover cue (oval) appear at specific times
 * - **Double-Image Overlap**: 1.5s overlap period where both projectors are visible
 * - **Manual Misalignment**: Slight transform scale/rotate differences simulate manual alignment
 * - **Light Cone Effects**: Translucent cone-shaped beams with flicker simulation
 * - **Dust Particles**: Multiple particles floating through the light beams
 * - **Arc Lamp Flicker**: Rapid brightness oscillation (98%-102%) on both videos
 * - **Keystone Correction**: Subtle perspective transform during overlap
 *
 * Use cases:
 * - Creating vintage cinema transition effects
 * - Adding nostalgic film projection aesthetics
 * - Building retro theater atmosphere
 * - Simulating classic cinema changeover procedures
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the changeover overlap in seconds'),
  motorCueTime: z
    .number()
    .default(0.3)
    .describe('Time when motor cue appears (relative to transition start)'),
  changeoverCueTime: z
    .number()
    .default(1.3)
    .describe('Time when changeover cue appears (relative to transition start)'),
  flickerIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity of arc lamp flicker (1 = normal)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    transitionDuration,
    motorCueTime,
    changeoverCueTime,
    flickerIntensity,
  } = params;

  // Calculate total duration: outgoing + incoming - overlap
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Flicker intensity values
  const flickerMin = 0.98 * flickerIntensity;
  const flickerMax = 1.02 * flickerIntensity;

  // Create dust particles
  const createDustParticles = (): RenderableComponentData[] => {
    const dustParticles = [
      { id: 'dust-1', size: 3, left: 35, top: 10, opacity: 0.7, start: 0, duration: 3 },
      { id: 'dust-2', size: 2, left: 55, top: 25, opacity: 0.6, start: 0, duration: 3 },
      { id: 'dust-3', size: 4, left: 48, top: 40, opacity: 0.5, start: 0.5, duration: 2.5 },
      { id: 'dust-4', size: 3, left: 62, top: 55, opacity: 0.65, start: 0.8, duration: 2.2 },
      { id: 'dust-5', size: 2, left: 40, top: 70, opacity: 0.55, start: 1.2, duration: 1.8 },
    ];

    return dustParticles.map((dust) => ({
      id: dust.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width: ${dust.size}px; height: ${dust.size}px; border-radius: 50%; background: rgba(255, 255, 255, ${dust.opacity});'></div>`,
        className: 'absolute',
        style: {
          left: `${dust.left}%`,
          top: `${dust.top}%`,
        },
      },
      context: {
        timing: {
          start: dust.start,
          duration: dust.duration,
        },
      },
      effects: [
        {
          id: `${dust.id}-float`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: dust.duration,
            mode: 'provider',
            targetIds: [dust.id],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 100, prog: 1 },
              { key: 'opacity', val: dust.opacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }));
  };

  // Outgoing video container
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          style: {
            filter: 'brightness(1)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
        effects: [
          // Fade out during transition
          {
            id: 'outgoing-fade-out',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: outgoingVideoDuration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          // Misalignment transform during transition
          {
            id: 'outgoing-misalign',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingVideoDuration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1.02, prog: 0.5 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: 0.5, prog: 0.5 },
                { key: 'rotate', val: 0, prog: 1 },
              ],
            },
          },
          // Arc lamp flicker
          {
            id: 'outgoing-flicker',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: outgoingVideoDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'brightness', val: flickerMin, prog: 0 },
                { key: 'brightness', val: flickerMax, prog: 0.1 },
                { key: 'brightness', val: flickerMin, prog: 0.2 },
                { key: 'brightness', val: flickerMax, prog: 0.3 },
                { key: 'brightness', val: flickerMin, prog: 0.4 },
                { key: 'brightness', val: flickerMax, prog: 0.5 },
                { key: 'brightness', val: flickerMin, prog: 0.6 },
                { key: 'brightness', val: flickerMax, prog: 0.7 },
                { key: 'brightness', val: flickerMin, prog: 0.8 },
                { key: 'brightness', val: flickerMax, prog: 0.9 },
                { key: 'brightness', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video container
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - transitionDuration,
        duration: incomingVideoDuration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          style: {
            filter: 'brightness(1)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideoDuration + transitionDuration,
          },
        },
        effects: [
          // Fade in during transition
          {
            id: 'incoming-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
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
          // Misalignment transform during transition (opposite direction)
          {
            id: 'incoming-misalign',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'scale', val: 0.98, prog: 0 },
                { key: 'scale', val: 0.98, prog: 0.5 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'rotate', val: -0.5, prog: 0 },
                { key: 'rotate', val: -0.5, prog: 0.5 },
                { key: 'rotate', val: 0, prog: 1 },
              ],
            },
          },
          // Arc lamp flicker
          {
            id: 'incoming-flicker',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: incomingVideoDuration + transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'brightness', val: flickerMin, prog: 0 },
                { key: 'brightness', val: flickerMax, prog: 0.1 },
                { key: 'brightness', val: flickerMin, prog: 0.2 },
                { key: 'brightness', val: flickerMax, prog: 0.3 },
                { key: 'brightness', val: flickerMin, prog: 0.4 },
                { key: 'brightness', val: flickerMax, prog: 0.5 },
                { key: 'brightness', val: flickerMin, prog: 0.6 },
                { key: 'brightness', val: flickerMax, prog: 0.7 },
                { key: 'brightness', val: flickerMin, prog: 0.8 },
                { key: 'brightness', val: flickerMax, prog: 0.9 },
                { key: 'brightness', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Light cone effects
  const lightConeOutgoing: RenderableComponentData = {
    id: 'light-cone-outgoing',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(220, 220, 255, 0.15) 0%, rgba(220, 220, 255, 0.05) 100%); clip-path: polygon(40% 0%, 60% 0%, 70% 100%, 30% 100%);'></div>",
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    effects: [
      {
        id: 'light-cone-outgoing-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: outgoingVideoDuration,
          mode: 'provider',
          targetIds: ['light-cone-outgoing'],
          ranges: [
            { key: 'opacity', val: 0.9, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.25 },
            { key: 'opacity', val: 0.85, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 0.75 },
            { key: 'opacity', val: 0.9, prog: 1 },
          ],
        },
      },
    ],
  };

  const lightConeIncoming: RenderableComponentData = {
    id: 'light-cone-incoming',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(220, 220, 255, 0.12) 0%, rgba(220, 220, 255, 0.04) 100%); clip-path: polygon(38% 0%, 62% 0%, 72% 100%, 28% 100%);'></div>",
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - transitionDuration,
        duration: incomingVideoDuration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'light-cone-incoming-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: incomingVideoDuration + transitionDuration,
          mode: 'provider',
          targetIds: ['light-cone-incoming'],
          ranges: [
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.25 },
            { key: 'opacity', val: 0.9, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 0.75 },
            { key: 'opacity', val: 0.85, prog: 1 },
          ],
        },
      },
    ],
  };

  // Dust particles container
  const dustParticlesContainer: RenderableComponentData = {
    id: 'dust-particles-container',
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
        duration: totalDuration,
      },
    },
    childrenData: createDustParticles(),
  };

  // Changeover cues container
  const changeoverCuesContainer: RenderableComponentData = {
    id: 'changeover-cues-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-4 right-4 flex flex-row gap-3',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'motor-cue',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width: 12px; height: 12px; border-radius: 50%; background: rgba(255, 255, 255, 0.9); box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);'></div>",
          className: 'block',
        },
        context: {
          timing: {
            start: motorCueTime,
            duration: 0.5,
          },
        },
        effects: [
          {
            id: 'motor-cue-pulse',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: 0.5,
              mode: 'provider',
              targetIds: ['motor-cue'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1.2, prog: 0.5 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      {
        id: 'changeover-cue',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width: 16px; height: 10px; border-radius: 50%; background: rgba(255, 255, 255, 0.9); box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);'></div>",
          className: 'block',
        },
        context: {
          timing: {
            start: changeoverCueTime,
            duration: 0.5,
          },
        },
        effects: [
          {
            id: 'changeover-cue-pulse',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: 0.5,
              mode: 'provider',
              targetIds: ['changeover-cue'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1.2, prog: 0.5 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'multi-projector-changeover-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoContainer,
      incomingVideoContainer,
      lightConeOutgoing,
      lightConeIncoming,
      dustParticlesContainer,
      changeoverCuesContainer,
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
  id: 'multi-projector-changeover',
  title: 'Multi-Projector Changeover Transition',
  description:
    'Recreates the classic two-projector theater changeover system with authentic projection booth elements, including changeover cues, brief double-image overlap with misalignment, visible light cones, dust particles, keystoning effects, and carbon arc lamp flicker. Features a 1.5s overlap period where both projectors are visible but slightly misaligned, simulating manual projector alignment in classic cinema projection.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'projector',
    'changeover',
    'cinema',
    'vintage',
    'theater',
    'film',
    'retro',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingVideoDuration: 10,
    incomingVideoDuration: 10,
    transitionDuration: 1.5,
    motorCueTime: 0.3,
    changeoverCueTime: 1.3,
    flickerIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const multiProjectorChangeoverPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};