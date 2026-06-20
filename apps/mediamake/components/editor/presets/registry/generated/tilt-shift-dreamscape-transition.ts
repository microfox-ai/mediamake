/**
 * Tilt-Shift Dreamscape Transition Preset
 *
 * This preset creates a stunning transition that manipulates depth of field to simulate
 * a miniature world effect transitioning into reality. The outgoing video develops a
 * tilt-shift blur where the top and bottom thirds become progressively more blurred
 * while the center remains sharp, creating a toy-like appearance. During the transition,
 * a subtle kaleidoscope effect is added using transform rotations and duplicated layers
 * with low opacity. The incoming video emerges through this distorted reality, starting
 * with an extreme tilt-shift effect that gradually normalizes. The dreamy quality is
 * enhanced with floating light particles and a subtle color shift toward pastel tones.
 *
 * Features:
 * - Progressive tilt-shift blur on top/bottom thirds creating miniature effect
 * - Kaleidoscope effect using duplicated video layers with rotation
 * - Floating light particles on bezier curves during transition
 * - Pastel color overlay using soft-light blend mode
 * - Inverse tilt-shift effect on incoming video that normalizes
 * - Smooth crossfade during transition overlap
 *
 * Use cases:
 * - Creating dreamlike transitions between video clips
 * - Adding miniature/toy-like visual effects
 * - Building surreal video sequences
 * - Creating artistic transitions with depth manipulation
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
  media1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2.2)
    .describe('Duration of the transition overlap in seconds'),
  particleCount: z
    .number()
    .default(8)
    .min(4)
    .max(20)
    .describe('Number of floating particles during transition'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration, particleCount } = params;

  // Calculate base layout duration (overlap reduces total duration)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Calculate transition timing
  const transitionStart = media1.duration - transitionDuration;

  // Helper function to create particle components
  const createParticles = (count: number): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    
    // Predefined start positions (percentage-based)
    const startPositions = [
      { x: 20, y: 10 },
      { x: 60, y: 80 },
      { x: 10, y: 50 },
      { x: 70, y: 15 },
      { x: 40, y: 30 },
      { x: 85, y: 60 },
      { x: 30, y: 45 },
      { x: 55, y: 25 },
      { x: 15, y: 70 },
      { x: 75, y: 90 },
      { x: 45, y: 60 },
      { x: 65, y: 35 },
      { x: 25, y: 80 },
      { x: 80, y: 20 },
      { x: 35, y: 65 },
      { x: 90, y: 45 },
      { x: 50, y: 55 },
      { x: 20, y: 85 },
      { x: 70, y: 40 },
      { x: 40, y: 75 },
    ];

    // Predefined end positions (percentage-based)
    const endPositions = [
      { x: 80, y: 70 },
      { x: 30, y: 20 },
      { x: 90, y: 40 },
      { x: 25, y: 85 },
      { x: 60, y: 75 },
      { x: 15, y: 35 },
      { x: 90, y: 90 },
      { x: 45, y: 55 },
      { x: 75, y: 25 },
      { x: 35, y: 65 },
      { x: 85, y: 50 },
      { x: 20, y: 30 },
      { x: 65, y: 15 },
      { x: 50, y: 80 },
      { x: 30, y: 45 },
      { x: 10, y: 60 },
      { x: 70, y: 35 },
      { x: 55, y: 70 },
      { x: 40, y: 20 },
      { x: 80, y: 55 },
    ];

    // Particle sizes (px)
    const sizes = [8, 6, 10, 7, 9, 5, 8, 7, 6, 9, 8, 7, 10, 6, 9, 7, 8, 5, 9, 8];

    for (let i = 0; i < count; i++) {
      const staggerStart = i * 0.1;
      const particleDuration = transitionDuration - staggerStart;
      const size = sizes[i % sizes.length];
      const startPos = startPositions[i % startPositions.length];
      const endPos = endPositions[i % endPositions.length];

      particles.push({
        id: `particle-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class='rounded-full bg-white/10' style='width: ${size}px; height: ${size}px;'></div>`,
          className: 'absolute',
        },
        context: {
          timing: {
            start: staggerStart,
            duration: particleDuration,
          },
        },
        effects: [
          {
            id: `particle-${i}-movement`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: particleDuration,
              mode: 'provider',
              targetIds: [`particle-${i}`],
              ranges: [
                { key: 'translateX', val: `${startPos.x}vw`, prog: 0 },
                { key: 'translateX', val: `${endPos.x}vw`, prog: 1 },
                { key: 'translateY', val: `${startPos.y}vh`, prog: 0 },
                { key: 'translateY', val: `${endPos.y}vh`, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Create outgoing video container with tilt-shift effects
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    childrenData: [
      // Main outgoing video
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: media1.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
      } as RenderableComponentData,
      // Kaleidoscope duplicated video layer
      {
        id: 'kaleidoscope-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: media1.src,
          className: 'absolute inset-0 w-full h-full object-cover opacity-20',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
        effects: [
          {
            id: 'kaleidoscope-rotation',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: media1.duration,
              mode: 'provider',
              targetIds: ['kaleidoscope-video'],
              ranges: [
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: 180, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Top blur third
      {
        id: 'tilt-shift-top-blur',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div class='absolute top-0 h-1/3 w-full backdrop-blur-md' style='pointer-events: none;'></div>",
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
        effects: [
          {
            id: 'blur-intensity-top',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: media1.duration,
              mode: 'provider',
              targetIds: ['tilt-shift-top-blur'],
              ranges: [
                { key: 'backdropFilter', val: 'blur(0px)', prog: 0 },
                { key: 'backdropFilter', val: 'blur(12px)', prog: 0.5 },
                { key: 'backdropFilter', val: 'blur(16px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Bottom blur third
      {
        id: 'tilt-shift-bottom-blur',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div class='absolute bottom-0 h-1/3 w-full backdrop-blur-md' style='pointer-events: none;'></div>",
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
        effects: [
          {
            id: 'blur-intensity-bottom',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: media1.duration,
              mode: 'provider',
              targetIds: ['tilt-shift-bottom-blur'],
              ranges: [
                { key: 'backdropFilter', val: 'blur(0px)', prog: 0 },
                { key: 'backdropFilter', val: 'blur(12px)', prog: 0.5 },
                { key: 'backdropFilter', val: 'blur(16px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Pastel color overlay
      {
        id: 'color-overlay',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div class='absolute inset-0 bg-gradient-to-b from-pink-200/30 to-blue-200/30' style='mix-blend-mode: soft-light; pointer-events: none;'></div>",
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video container with inverse tilt-shift
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: media2.duration + transitionDuration,
      },
    },
    childrenData: [
      // Incoming video
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: media2.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: media2.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-fade',
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
        ],
      } as RenderableComponentData,
      // Incoming top blur (starts intense, normalizes)
      {
        id: 'incoming-tilt-shift-top-blur',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div class='absolute top-0 h-1/3 w-full backdrop-blur-xl' style='pointer-events: none;'></div>",
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: media2.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-blur-normalize-top',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-tilt-shift-top-blur'],
              ranges: [
                { key: 'backdropFilter', val: 'blur(24px)', prog: 0 },
                { key: 'backdropFilter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Incoming bottom blur (starts intense, normalizes)
      {
        id: 'incoming-tilt-shift-bottom-blur',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div class='absolute bottom-0 h-1/3 w-full backdrop-blur-xl' style='pointer-events: none;'></div>",
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: media2.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-blur-normalize-bottom',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-tilt-shift-bottom-blur'],
              ranges: [
                { key: 'backdropFilter', val: 'blur(24px)', prog: 0 },
                { key: 'backdropFilter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Create particles container
  const particlesContainer: RenderableComponentData = {
    id: 'particles-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    childrenData: createParticles(particleCount),
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'tilt-shift-dreamscape-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingVideoContainer,
      incomingVideoContainer,
      particlesContainer,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'tilt-shift-dreamscape-transition',
  title: 'Tilt-Shift Dreamscape Transition',
  description:
    'Manipulates depth of field to create a miniature world effect transitioning into reality. Features progressive tilt-shift blur on top/bottom thirds, kaleidoscope rotation effects, floating light particles on bezier curves, and pastel color shifts. The outgoing video develops a toy-like appearance while the incoming video emerges through distorted reality with normalizing effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'tilt-shift',
    'depth-of-field',
    'miniature',
    'dreamscape',
    'kaleidoscope',
    'particles',
    'blur',
    'pastel',
    'artistic',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2.2,
    particleCount: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const tiltShiftDreamscapeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
