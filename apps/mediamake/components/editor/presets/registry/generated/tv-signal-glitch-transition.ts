/**
 * TV Signal Interference Transition Preset
 *
 * Creates a retro analog TV signal loss transition with horizontal hold problems,
 * color banding, and RGB glitch aesthetics. Simulates old TV signal interference
 * with modern visual effects during 0.8s overlap between two images.
 *
 * Features:
 * - Horizontal sync loss (vertical roll effect)
 * - Color banding with horizontal stripes
 * - RGB channel vertical separation
 * - Static/noise overlay
 * - Audio-reactive-style visual stuttering
 * - Incoming signal stabilization animation
 *
 * Use cases:
 * - Retro-styled YouTube content transitions
 * - Music video scene changes
 * - Gaming content with glitch aesthetics
 * - Social media videos with vintage TV effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  image1: z.object({
    src: z.string().describe('Source URL of first image (outgoing)'),
    duration: z.number().describe('Duration of first image in seconds'),
  }),
  image2: z.object({
    src: z.string().describe('Source URL of second image (incoming)'),
    duration: z.number().describe('Duration of second image in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, transitionDuration } = params;

  // Calculate total duration (sum of durations minus overlap)
  const totalDuration = image1.duration + image2.duration - transitionDuration;

  // Calculate timing for incoming image (starts before outgoing ends)
  const incomingStart = image1.duration - transitionDuration;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'tv-signal-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gray-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Outgoing image container
      {
        id: 'outgoing-image-container',
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
            duration: image1.duration,
          },
        },
        childrenData: [
          {
            id: 'outgoing-image',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: image1.src,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: image1.duration,
              },
            },
            effects: [
              // Vertical roll effect (simulating horizontal hold problems)
              {
                id: 'outgoing-vertical-roll',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: image1.duration - transitionDuration,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['outgoing-image'],
                  ranges: [
                    { key: 'translateY', val: '0%', prog: 0 },
                    { key: 'translateY', val: '100%', prog: 0.125 },
                    { key: 'translateY', val: '-50%', prog: 0.25 },
                    { key: 'translateY', val: '30%', prog: 0.375 },
                    { key: 'translateY', val: '-100%', prog: 0.5 },
                    { key: 'translateY', val: '50%', prog: 0.625 },
                    { key: 'translateY', val: '0%', prog: 0.75 },
                    { key: 'translateY', val: '-200%', prog: 1 },
                  ],
                },
              },
              // Opacity stutter effect
              {
                id: 'outgoing-opacity-stutter',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: image1.duration - transitionDuration,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['outgoing-image'],
                  ranges: [
                    { key: 'opacity', val: 1, prog: 0 },
                    { key: 'opacity', val: 1, prog: 0.2 },
                    { key: 'opacity', val: 0.7, prog: 0.25 },
                    { key: 'opacity', val: 0.9, prog: 0.35 },
                    { key: 'opacity', val: 0.5, prog: 0.5 },
                    { key: 'opacity', val: 0.8, prog: 0.6 },
                    { key: 'opacity', val: 0.3, prog: 0.75 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,

      // Incoming image container
      {
        id: 'incoming-image-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: incomingStart,
            duration: image2.duration + transitionDuration,
          },
        },
        childrenData: [
          {
            id: 'incoming-image',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: image2.src,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: image2.duration + transitionDuration,
              },
            },
            effects: [
              // Stabilization effect (signal gradually finding channel)
              {
                id: 'incoming-stabilization',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['incoming-image'],
                  ranges: [
                    { key: 'translateY', val: '200%', prog: 0 },
                    { key: 'translateY', val: '-30%', prog: 0.2 },
                    { key: 'translateY', val: '50%', prog: 0.4 },
                    { key: 'translateY', val: '-10%', prog: 0.6 },
                    { key: 'translateY', val: '20%', prog: 0.8 },
                    { key: 'translateY', val: '0%', prog: 1 },
                  ],
                },
              },
              // Opacity fade in
              {
                id: 'incoming-opacity-fade',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['incoming-image'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 0.5, prog: 0.5 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,

      // Noise overlay (static/interference)
      {
        id: 'noise-overlay-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              zIndex: 25,
              mixBlendMode: 'overlay',
            },
          },
        },
        context: {
          timing: {
            start: incomingStart,
            duration: transitionDuration,
          },
        },
        childrenData: [
          {
            id: 'noise-overlay',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: "<div style='width:100%;height:100%;background:repeating-linear-gradient(0deg,rgba(255,255,255,0.05) 0px,rgba(0,0,0,0.05) 1px,transparent 2px,rgba(255,255,255,0.03) 3px);'></div>",
              className: 'w-full h-full',
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
            effects: [
              {
                id: 'noise-flicker',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['noise-overlay'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 0.3, prog: 0.15 },
                    { key: 'opacity', val: 0.1, prog: 0.35 },
                    { key: 'opacity', val: 0.4, prog: 0.6 },
                    { key: 'opacity', val: 0.2, prog: 0.8 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,

      // Color banding overlay
      {
        id: 'color-banding-overlay',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width:100%;height:100%;background:repeating-linear-gradient(0deg,rgba(255,0,0,0.15) 0px,rgba(0,255,0,0.15) 20px,rgba(0,0,255,0.15) 40px,rgba(255,255,0,0.15) 60px);background-size:100% 200%;mix-blend-mode:color-dodge;'></div>",
          className: 'absolute inset-0 pointer-events-none',
        },
        context: {
          timing: {
            start: incomingStart,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'banding-scroll',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['color-banding-overlay'],
              ranges: [
                { key: 'backgroundPositionY', val: '0%', prog: 0 },
                { key: 'backgroundPositionY', val: '100%', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,

      // RGB separation layers (vertical separation for unique look)
      // Red layer
      {
        id: 'rgb-red-layer',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width:100%;height:100%;background:transparent;box-shadow:0 -3px 0 rgba(255,0,0,0.3);mix-blend-mode:screen;'></div>",
          className: 'absolute inset-0 pointer-events-none',
        },
        context: {
          timing: {
            start: incomingStart,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,

      // Green layer
      {
        id: 'rgb-green-layer',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width:100%;height:100%;background:transparent;box-shadow:0 0 0 rgba(0,255,0,0.3);mix-blend-mode:screen;'></div>",
          className: 'absolute inset-0 pointer-events-none',
        },
        context: {
          timing: {
            start: incomingStart,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,

      // Blue layer
      {
        id: 'rgb-blue-layer',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width:100%;height:100%;background:transparent;box-shadow:0 3px 0 rgba(0,0,255,0.3);mix-blend-mode:screen;'></div>",
          className: 'absolute inset-0 pointer-events-none',
        },
        context: {
          timing: {
            start: incomingStart,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'tv-signal-glitch-transition',
  title: 'TV Signal Interference Transition',
  description:
    'Retro analog TV signal loss transition with horizontal hold problems, color banding, RGB vertical separation, and noise overlays. Simulates old TV signal interference with modern glitch aesthetics during 0.8s overlap between two images.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'tv-signal',
    'glitch',
    'retro',
    'analog',
    'rgb-split',
    'interference',
    'vintage',
  ],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    transitionDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const tvSignalGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
