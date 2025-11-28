/**
 * Lighthouse Beam Transition Preset
 *
 * Atmospheric transition inspired by a lighthouse beam sweeping across foggy scenes.
 * The videos transition through a rotating light sweep effect where a bright beam
 * reveals the incoming video while casting the outgoing into shadow.
 *
 * Features:
 * - **Rotating Beam Effect**: Conic-gradient mask rotates 360 degrees with mechanical stutters
 * - **Flickering Light**: Opacity dips during rotation stutters for old lighthouse ambiance
 * - **Color Grading**: Blue-tinted shadows on outgoing, warm yellow tones on incoming
 * - **Fog Particles**: Drifting circular fog elements with blur for atmospheric moodiness
 * - **Mechanical Authenticity**: Rotation stutters at 90deg and 180deg simulate struggling mechanism
 *
 * Use cases:
 * - Cinematic transitions between video clips
 * - Atmospheric storytelling effects
 * - Nautical or coastal themed content
 * - Moody, dramatic scene changes
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingDuration: z.number().describe('Duration of outgoing video in seconds'),
  incomingDuration: z.number().describe('Duration of incoming video in seconds'),
  transitionDuration: z.number().default(3).describe('Duration of the beam sweep transition (default 3s)'),
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
    transitionDuration 
  } = params;

  // Calculate total duration (overlap transition)
  const totalDuration = outgoingDuration + incomingDuration - transitionDuration;
  
  // Transition start time (when incoming video begins)
  const transitionStart = outgoingDuration - transitionDuration;

  // Stutter timings (relative to transition start)
  const stutter1Time = transitionStart + (transitionDuration * 0.3); // ~90deg mark
  const stutter2Time = transitionStart + (transitionDuration * 0.5); // ~180deg mark
  const stutterDuration = 0.1; // 100ms pause

  // Fog particles configuration
  const fogParticles = [
    { size: 120, top: '20%', left: '10%', speed: 30 },
    { size: 100, top: '50%', left: '70%', speed: 45 },
    { size: 90, top: '70%', left: '30%', speed: 35 },
    { size: 110, top: '35%', left: '85%', speed: 40 },
  ];

  const childrenData: RenderableComponentData[] = [
    // Outgoing Video Layer (blue-tinted shadow)
    {
      id: 'lighthouse-outgoing-video-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            filter: 'sepia(20%) hue-rotate(200deg) brightness(0.7)',
            zIndex: 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingDuration,
        },
      },
      childrenData: [
        {
          id: 'lighthouse-outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideoSrc,
            className: 'absolute inset-0 w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingDuration,
            },
          },
        } as RenderableComponentData,
        // Rotating beam mask (shows outgoing through beam)
        {
          id: 'lighthouse-beam-mask-outgoing',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; inset: 0; background: black; mask-image: conic-gradient(from 0deg at 50% 50%, transparent 0deg, black 30deg, transparent 60deg); -webkit-mask-image: conic-gradient(from 0deg at 50% 50%, transparent 0deg, black 30deg, transparent 60deg); pointer-events: none;"></div>`,
            className: 'absolute inset-0',
            style: {
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming Video Layer (warm yellow tones)
    {
      id: 'lighthouse-incoming-video-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            filter: 'sepia(30%) hue-rotate(30deg) brightness(1.2)',
            zIndex: 2,
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingDuration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'lighthouse-incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            className: 'absolute inset-0 w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingDuration + transitionDuration,
            },
          },
        } as RenderableComponentData,
        // Inverse beam mask (hides incoming except through beam)
        {
          id: 'lighthouse-beam-mask-incoming',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; inset: 0; background: white; mask-image: conic-gradient(from 0deg at 50% 50%, black 0deg, transparent 30deg, black 60deg); -webkit-mask-image: conic-gradient(from 0deg at 50% 50%, black 0deg, transparent 30deg, black 60deg); pointer-events: none;"></div>`,
            className: 'absolute inset-0',
            style: {
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingDuration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Fog Particles Container
    {
      id: 'lighthouse-fog-particles-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            pointerEvents: 'none',
            zIndex: 3,
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      childrenData: fogParticles.map((particle, index) => ({
        id: `lighthouse-fog-particle-${index + 1}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${particle.size}px; height: ${particle.size}px; border-radius: 50%; background: rgba(255, 255, 255, 0.3); filter: blur(40px); position: absolute; top: ${particle.top}; left: ${particle.left};"></div>`,
          className: 'absolute',
          style: {
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `lighthouse-fog-drift-${index + 1}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [`lighthouse-fog-particle-${index + 1}`],
              ranges: [
                { key: 'translateX', val: '0px', prog: 0 },
                { key: 'translateX', val: `${particle.speed}px`, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData)),
    } as RenderableComponentData,
  ];

  // Add rotation and flicker effects to both beam masks
  const rotationEffect = {
    id: 'lighthouse-beam-rotation',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: transitionStart,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['lighthouse-beam-mask-outgoing', 'lighthouse-beam-mask-incoming'],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 90, prog: 0.3 }, // First stutter
        { key: 'rotate', val: 90, prog: 0.333 }, // Hold
        { key: 'rotate', val: 180, prog: 0.5 }, // Second stutter
        { key: 'rotate', val: 180, prog: 0.533 }, // Hold
        { key: 'rotate', val: 360, prog: 1 },
      ],
    },
  };

  const flickerEffect1 = {
    id: 'lighthouse-flicker-1',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: stutter1Time,
      duration: stutterDuration,
      mode: 'provider',
      targetIds: ['lighthouse-incoming-video-layer'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  const flickerEffect2 = {
    id: 'lighthouse-flicker-2',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: stutter2Time,
      duration: stutterDuration,
      mode: 'provider',
      targetIds: ['lighthouse-incoming-video-layer'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  const rootContainer: RenderableComponentData = {
    id: 'lighthouse-beam-transition-root',
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
        duration: totalDuration,
      },
    },
    childrenData,
    effects: [rotationEffect, flickerEffect1, flickerEffect2],
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
  id: 'lighthouse-beam-transition',
  title: 'Lighthouse Beam Transition',
  description: 'Atmospheric transition with rotating lighthouse beam sweeping across foggy scenes. Features conic-gradient mask, flickering light effect, color grading (blue shadows, warm beam), particle fog drift, and mechanical stutters at rotation points for old lighthouse ambiance.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'lighthouse', 'beam', 'fog', 'atmospheric', 'cinematic', 'nautical', 'sweep', 'mask'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingDuration: 10,
    incomingDuration: 10,
    transitionDuration: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const lighthouseBeamTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};