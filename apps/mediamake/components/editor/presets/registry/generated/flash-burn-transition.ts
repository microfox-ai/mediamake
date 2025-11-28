/**
 * Flash Burn Transition Preset
 *
 * This preset creates a cinematic flash burn transition that mimics old projector film catching fire.
 * The effect features a rapid overexposure to white, dispersing light particles, and warm color grading.
 *
 * Features:
 * - **Rapid White Flash**: Outgoing video suddenly overexposes to pure white at 0.3s
 * - **Dispersing Light Particles**: 7 circular light particles scatter outward from random positions
 * - **Warm Color Grading**: Sepia and hue-rotate filters applied during transition
 * - **Explosive Animation**: Cubic-bezier easing for dynamic particle movement
 * - **Precise Timing**: 0.8 second total transition with choreographed effects
 *
 * Use cases:
 * - Creating cinematic transitions between video clips
 * - Mimicking vintage film projector effects
 * - Adding dramatic scene changes with fire/burn aesthetic
 * - Building retro-styled video sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    type: z.enum(['video', 'image']).describe('Media type'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    type: z.enum(['video', 'image']).describe('Media type'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of flash burn transition in seconds'),
  flashIntensity: z
    .number()
    .min(3)
    .max(7)
    .default(5)
    .describe('Brightness intensity for white flash (3-7)'),
  flashBlur: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Blur amount in pixels for flash effect'),
  particleCount: z
    .number()
    .min(5)
    .max(7)
    .default(7)
    .describe('Number of light particles (5-7)'),
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
    flashIntensity,
    flashBlur,
    particleCount,
  } = params;

  // Calculate timing points
  const flashStartTime = 0.3; // Flash starts at 0.3s
  const flashHoldDuration = 0.2; // Hold white for 0.2s
  const flashEndTime = flashStartTime + flashHoldDuration; // 0.5s
  const particleStartTime = flashEndTime; // Particles start when flash ends

  // Calculate base layout duration (overlap transition)
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Determine component IDs
  const outgoingComponentId =
    outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Generate random particle positions and directions
  const generateParticleData = () => {
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      // Random starting position (center-ish area)
      const startX = 40 + Math.random() * 20; // 40-60%
      const startY = 40 + Math.random() * 20; // 40-60%

      // Random direction and distance for scattering
      const angle = (Math.random() * 360 * Math.PI) / 180;
      const distance = 100 + Math.random() * 200; // pixels
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance;

      // Staggered timing offset
      const timingOffset = i * 0.05; // 0s, 0.05s, 0.1s, etc.

      particles.push({
        id: `particle-${i + 1}`,
        startX: `${startX}%`,
        startY: `${startY}%`,
        endX: `${endX}px`,
        endY: `${endY}px`,
        timingOffset,
      });
    }
    return particles;
  };

  const particleData = generateParticleData();

  // Build children data
  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 z-10 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Warm color grading during transition
        {
          id: 'warm-grading-out',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: flashStartTime,
            duration: transitionDuration - flashStartTime,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              {
                key: 'filter',
                val: 'sepia(0) hue-rotate(0deg)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'sepia(0.3) hue-rotate(15deg)',
                prog: 0.3,
              },
              {
                key: 'filter',
                val: 'sepia(0.3) hue-rotate(15deg)',
                prog: 1,
              },
            ],
          },
        },
        // Rapid brightness spike to white
        {
          id: 'flash-burn',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: flashStartTime,
            duration: 0.1, // Very rapid spike
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              {
                key: 'filter',
                val: `brightness(1) blur(0px) sepia(0) hue-rotate(0deg)`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `brightness(${flashIntensity}) blur(${flashBlur}px) sepia(0.3) hue-rotate(15deg)`,
                prog: 1,
              },
            ],
          },
        },
        // Hold white flash
        {
          id: 'flash-hold',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: flashStartTime + 0.1,
            duration: flashHoldDuration - 0.1,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              {
                key: 'filter',
                val: `brightness(${flashIntensity}) blur(${flashBlur}px) sepia(0.3) hue-rotate(15deg)`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `brightness(${flashIntensity}) blur(${flashBlur}px) sepia(0.3) hue-rotate(15deg)`,
                prog: 1,
              },
            ],
          },
        },
        // Fade out to complete transition
        {
          id: 'fade-out-final',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: flashEndTime,
            duration: transitionDuration - flashEndTime,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingVideo.src,
        className: 'absolute inset-0 z-20 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        // Start invisible
        {
          id: 'initial-hidden',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: particleStartTime,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Fade in through dispersing particles
        {
          id: 'fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: particleStartTime,
            duration: transitionDuration - particleStartTime,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Warm color grading during transition
        {
          id: 'warm-grading-in',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: particleStartTime,
            duration: transitionDuration - particleStartTime,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              {
                key: 'filter',
                val: 'sepia(0.3) hue-rotate(15deg)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'sepia(0) hue-rotate(0deg)',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Light particles
    ...particleData.map((particle) => ({
      id: particle.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute w-8 h-8 rounded-full z-30',
        style: {
          left: particle.startX,
          top: particle.startY,
          background:
            'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,237,200,0.8) 40%, rgba(255,200,150,0.4) 70%, rgba(255,200,150,0) 100%)',
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        // Initial state (invisible before flash)
        {
          id: `${particle.id}-initial`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: particleStartTime + particle.timingOffset,
            mode: 'provider',
            targetIds: [particle.id],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
            ],
          },
        },
        // Explosive scatter animation
        {
          id: `${particle.id}-scatter`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: particleStartTime + particle.timingOffset,
            duration: transitionDuration - particleStartTime - particle.timingOffset,
            mode: 'provider',
            targetIds: [particle.id],
            ranges: [
              // Scale: burst from 0 to 2
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 2, prog: 0.3 },
              { key: 'scale', val: 1.5, prog: 1 },
              // Opacity: fade in then out
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              // Translate: scatter outward
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: particle.endX, prog: 1 },
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: particle.endY, prog: 1 },
            ],
          },
        },
      ],
    })) as RenderableComponentData[],
  ];

  const rootContainer: RenderableComponentData = {
    id: 'flash-burn-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData,
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
  id: 'flash-burn-transition',
  title: 'Flash Burn Transition',
  description:
    'A cinematic flash burn transition that mimics old projector film catching fire. Features rapid overexposure to white, dispersing light particles, and warm color grading.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'flash',
    'burn',
    'cinematic',
    'vintage',
    'film',
    'particles',
    'light',
    'fire',
    'projector',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 0.8,
    flashIntensity: 5,
    flashBlur: 2,
    particleCount: 7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const flashBurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
