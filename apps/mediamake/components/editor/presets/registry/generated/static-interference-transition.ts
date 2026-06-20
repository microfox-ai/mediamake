/**
 * Static Interference Transition Preset
 *
 * Simulates signal loss/interference effect between two broadcast videos.
 * Creates waves of static washing across the screen, with horizontal roll effects,
 * alternating video visibility, and audio visualization bars during peak interference.
 *
 * Features:
 * - Outgoing video experiences increasing static (rapid visibility alternation)
 * - Incoming video emerges through decreasing static (inverse pattern)
 * - Pulsing static waves using radial gradients expanding from center
 * - Horizontal roll effect (vertical slip oscillation)
 * - Audio visualization bars spiking during max interference
 * - Peak static filters (contrast 300%, brightness 150%)
 * - Repeating linear gradient static overlays
 *
 * Use cases:
 * - Creating broadcast signal loss transitions
 * - Simulating TV static/interference effects
 * - Building retro analog video transitions
 * - Adding dramatic disruption effects between clips
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the interference transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total base layout duration (accounting for 1s overlap)
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;

  // Transition starts 1s before video1 ends
  const transitionStart = video1.duration - transitionDuration;

  // ============================================================================
  // EFFECTS - Rapid alternating opacity for static effect
  // ============================================================================

  // Outgoing video: Increasing static (opacity alternates rapidly)
  const outgoingStaticEffect = {
    id: 'outgoing-static-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: transitionStart, // Relative to parent (video1 starts at 0)
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['outgoing-video'],
      ranges: [
        // Rapid alternation at 0.05s intervals (20 keyframes per second)
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 0.05 },
        { key: 'opacity', val: 1, prog: 0.1 },
        { key: 'opacity', val: 0.3, prog: 0.15 },
        { key: 'opacity', val: 1, prog: 0.2 },
        { key: 'opacity', val: 0.3, prog: 0.25 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 0.3, prog: 0.35 },
        { key: 'opacity', val: 1, prog: 0.4 },
        { key: 'opacity', val: 0.3, prog: 0.45 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 0.3, prog: 0.55 },
        { key: 'opacity', val: 1, prog: 0.6 },
        { key: 'opacity', val: 0.3, prog: 0.65 },
        { key: 'opacity', val: 1, prog: 0.7 },
        { key: 'opacity', val: 0.3, prog: 0.75 },
        { key: 'opacity', val: 1, prog: 0.8 },
        { key: 'opacity', val: 0.3, prog: 0.85 },
        { key: 'opacity', val: 1, prog: 0.9 },
        { key: 'opacity', val: 0.3, prog: 0.95 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Incoming video: Decreasing static (inverse pattern)
  const incomingStaticEffect = {
    id: 'incoming-static-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0, // Relative to incoming video start
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['incoming-video'],
      ranges: [
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.05 },
        { key: 'opacity', val: 0.3, prog: 0.1 },
        { key: 'opacity', val: 1, prog: 0.15 },
        { key: 'opacity', val: 0.3, prog: 0.2 },
        { key: 'opacity', val: 1, prog: 0.25 },
        { key: 'opacity', val: 0.3, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 0.35 },
        { key: 'opacity', val: 0.3, prog: 0.4 },
        { key: 'opacity', val: 1, prog: 0.45 },
        { key: 'opacity', val: 0.3, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 0.55 },
        { key: 'opacity', val: 0.3, prog: 0.6 },
        { key: 'opacity', val: 1, prog: 0.65 },
        { key: 'opacity', val: 0.3, prog: 0.7 },
        { key: 'opacity', val: 1, prog: 0.75 },
        { key: 'opacity', val: 0.3, prog: 0.8 },
        { key: 'opacity', val: 1, prog: 0.85 },
        { key: 'opacity', val: 0.3, prog: 0.9 },
        { key: 'opacity', val: 1, prog: 0.95 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Horizontal roll effect (oscillating translateY)
  const rollEffect = {
    id: 'roll-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0, // Relative to transition container
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['outgoing-video', 'incoming-video'],
      ranges: [
        { key: 'translateY', val: '0px', prog: 0 },
        { key: 'translateY', val: '-20px', prog: 0.125 },
        { key: 'translateY', val: '0px', prog: 0.25 },
        { key: 'translateY', val: '20px', prog: 0.375 },
        { key: 'translateY', val: '0px', prog: 0.5 },
        { key: 'translateY', val: '-20px', prog: 0.625 },
        { key: 'translateY', val: '0px', prog: 0.75 },
        { key: 'translateY', val: '20px', prog: 0.875 },
        { key: 'translateY', val: '0px', prog: 1 },
      ],
    },
  };

  // Peak static filter effect
  const peakStaticFilterEffect = {
    id: 'peak-static-filter',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: transitionDuration * 0.4, // Peak at 40%-60% of transition
      duration: transitionDuration * 0.2,
      mode: 'provider' as const,
      targetIds: ['interference-container'],
      ranges: [
        { key: 'filter', val: 'contrast(100%) brightness(100%)', prog: 0 },
        { key: 'filter', val: 'contrast(300%) brightness(150%)', prog: 0.5 },
        { key: 'filter', val: 'contrast(100%) brightness(100%)', prog: 1 },
      ],
    },
  };

  // ============================================================================
  // STATIC WAVE EFFECTS (radial gradients expanding)
  // ============================================================================

  const staticWave1Effect = {
    id: 'static-wave-1-scale',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['static-wave-1'],
      ranges: [
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 2, prog: 1 },
        { key: 'opacity', val: 0.8, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  const staticWave2Effect = {
    id: 'static-wave-2-scale',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: transitionDuration * 0.7,
      mode: 'provider' as const,
      targetIds: ['static-wave-2'],
      ranges: [
        { key: 'scale', val: 0.7, prog: 0 },
        { key: 'scale', val: 2.2, prog: 1 },
        { key: 'opacity', val: 0.6, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  const staticWave3Effect = {
    id: 'static-wave-3-scale',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: transitionDuration * 0.5,
      mode: 'provider' as const,
      targetIds: ['static-wave-3'],
      ranges: [
        { key: 'scale', val: 0.9, prog: 0 },
        { key: 'scale', val: 2.5, prog: 1 },
        { key: 'opacity', val: 0.4, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // ============================================================================
  // AUDIO BAR EFFECTS (spiking during peak interference)
  // ============================================================================

  const createAudioBarEffect = (barId: string, peakHeight: string) => ({
    id: `${barId}-spike`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: transitionDuration * 0.6,
      mode: 'provider' as const,
      targetIds: [barId],
      ranges: [
        { key: 'height', val: '10%', prog: 0 },
        { key: 'height', val: peakHeight, prog: 0.3 },
        { key: 'height', val: '20%', prog: 0.6 },
        { key: 'height', val: peakHeight, prog: 0.8 },
        { key: 'height', val: '10%', prog: 1 },
      ],
    },
  });

  // ============================================================================
  // STATIC OVERLAY EFFECTS (animate opacity)
  // ============================================================================

  const staticOverlay1Effect = {
    id: 'static-overlay-1-flicker',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['static-overlay-1'],
      ranges: [
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.25 },
        { key: 'opacity', val: 0.4, prog: 0.5 },
        { key: 'opacity', val: 0.8, prog: 0.75 },
        { key: 'opacity', val: 0.3, prog: 1 },
      ],
    },
  };

  const staticOverlay2Effect = {
    id: 'static-overlay-2-flicker',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['static-overlay-2'],
      ranges: [
        { key: 'opacity', val: 0.4, prog: 0 },
        { key: 'opacity', val: 0.6, prog: 0.3 },
        { key: 'opacity', val: 0.9, prog: 0.6 },
        { key: 'opacity', val: 0.5, prog: 0.9 },
        { key: 'opacity', val: 0.4, prog: 1 },
      ],
    },
  };

  const staticOverlay3Effect = {
    id: 'static-overlay-3-flicker',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['static-overlay-3'],
      ranges: [
        { key: 'opacity', val: 0.2, prog: 0 },
        { key: 'opacity', val: 0.5, prog: 0.2 },
        { key: 'opacity', val: 0.3, prog: 0.4 },
        { key: 'opacity', val: 0.7, prog: 0.7 },
        { key: 'opacity', val: 0.2, prog: 1 },
      ],
    },
  };

  // ============================================================================
  // CHILDREN DATA STRUCTURE
  // ============================================================================

  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
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
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
          effects: [outgoingStaticEffect],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Transition effects container (starts at video1.duration - 1)
    {
      id: 'transition-effects-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [rollEffect, peakStaticFilterEffect],
      childrenData: [
        // Static overlays
        {
          id: 'static-overlays-container',
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
              duration: transitionDuration,
            },
          },
          childrenData: [
            {
              id: 'static-overlay-1',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0',
                  style: {
                    background: 'repeating-linear-gradient(0deg, black 0px, white 2px, black 4px)',
                    mixBlendMode: 'overlay',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
              effects: [staticOverlay1Effect],
            } as RenderableComponentData,
            {
              id: 'static-overlay-2',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0',
                  style: {
                    background: 'repeating-linear-gradient(90deg, black 0px, white 3px, black 6px)',
                    mixBlendMode: 'overlay',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
              effects: [staticOverlay2Effect],
            } as RenderableComponentData,
            {
              id: 'static-overlay-3',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0',
                  style: {
                    background: 'repeating-linear-gradient(45deg, transparent 0px, rgba(255,255,255,0.1) 1px, transparent 2px)',
                    mixBlendMode: 'screen',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
              effects: [staticOverlay3Effect],
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,

        // Static wave effects container
        {
          id: 'wave-effects-container',
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
              duration: transitionDuration,
            },
          },
          childrenData: [
            {
              id: 'static-wave-1',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0',
                  style: {
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, transparent 50%)',
                    mixBlendMode: 'overlay',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
              effects: [staticWave1Effect],
            } as RenderableComponentData,
            {
              id: 'static-wave-2',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0',
                  style: {
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.6) 0%, transparent 40%)',
                    mixBlendMode: 'screen',
                  },
                },
              },
              context: {
                timing: {
                  start: transitionDuration * 0.3,
                  duration: transitionDuration * 0.7,
                },
              },
              effects: [staticWave2Effect],
            } as RenderableComponentData,
            {
              id: 'static-wave-3',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0',
                  style: {
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, transparent 30%)',
                    mixBlendMode: 'overlay',
                  },
                },
              },
              context: {
                timing: {
                  start: transitionDuration * 0.5,
                  duration: transitionDuration * 0.5,
                },
              },
              effects: [staticWave3Effect],
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,

        // Audio visualization bars container
        {
          id: 'audio-bars-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute bottom-0 left-0 right-0 flex flex-row justify-around items-end',
              style: {
                height: '100px',
                gap: '10px',
                padding: '0 20px',
              },
            },
          },
          context: {
            timing: {
              start: transitionDuration * 0.2,
              duration: transitionDuration * 0.6,
            },
          },
          childrenData: [
            {
              id: 'audio-bar-1',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'bg-white',
                  style: {
                    width: '10%',
                    height: '30%',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration * 0.6,
                },
              },
              effects: [createAudioBarEffect('audio-bar-1', '60%')],
            } as RenderableComponentData,
            {
              id: 'audio-bar-2',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'bg-white',
                  style: {
                    width: '10%',
                    height: '50%',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration * 0.6,
                },
              },
              effects: [createAudioBarEffect('audio-bar-2', '90%')],
            } as RenderableComponentData,
            {
              id: 'audio-bar-3',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'bg-white',
                  style: {
                    width: '10%',
                    height: '80%',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration * 0.6,
                },
              },
              effects: [createAudioBarEffect('audio-bar-3', '100%')],
            } as RenderableComponentData,
            {
              id: 'audio-bar-4',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'bg-white',
                  style: {
                    width: '10%',
                    height: '60%',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration * 0.6,
                },
              },
              effects: [createAudioBarEffect('audio-bar-4', '85%')],
            } as RenderableComponentData,
            {
              id: 'audio-bar-5',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'bg-white',
                  style: {
                    width: '10%',
                    height: '40%',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration * 0.6,
                },
              },
              effects: [createAudioBarEffect('audio-bar-5', '70%')],
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming video container
    {
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
          duration: video2.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
          effects: [incomingStaticEffect],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'interference-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black overflow-hidden',
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
    childrenData,
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

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
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'static-interference-transition',
  title: 'Static Interference Transition',
  description:
    'Creates a broadcast signal loss effect between two videos with waves of static, horizontal roll, and audio visualization bars during the transition period',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'static', 'interference', 'broadcast', 'glitch', 'signal-loss', 'retro'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    transitionDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const staticInterferenceTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
