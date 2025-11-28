/**
 * Double Exposure Flash Transition Preset
 *
 * This preset creates a dreamy, artistic double-exposure flash transition between two videos.
 * It uses pulsing white flashes as blend catalysts to shift video prominence, with RGB channel
 * splitting during flashes for psychedelic effects, floating light particles for ethereal quality,
 * and time displacement between videos for ghost-like trailing effects.
 *
 * Features:
 * - **Artistic Double-Exposure Blending**: Both videos start at 50% opacity and blend progressively
 * - **Pulsing Flash Effects**: Five soft flash pulses that shift video prominence (0.5/0.5 → 1/0)
 * - **RGB Channel Splitting**: Three duplicate video layers with red/green/blue filters for psychedelic effects
 * - **Floating Light Particles**: 10-15 small circles with random positions and float animations
 * - **Time Displacement**: Incoming video playback at 0.95 rate for slight desync and ghost-like trailing
 * - **Alternating Blend Modes**: Videos use screen and overlay blend modes for artistic effects
 * - **Soft Gaussian Blur Flashes**: White flashes with blur for dreamy quality
 * - **Extended Overlap**: 2-second overlap duration for full artistic blend development
 *
 * Use cases:
 * - Creating dreamy transitions between video clips
 * - Artistic music video transitions
 * - Experimental narrative film effects
 * - Psychedelic visual storytelling
 * - Memory/flashback sequences with ethereal quality
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
  overlapDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds (extended for artistic blend)'),
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
    overlapDuration,
  } = params;

  // Calculate total composition duration
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - overlapDuration;

  // Flash timing (5 flashes during the overlap)
  const flashTimes = [0, 0.4, 0.8, 1.2, 1.5]; // Relative to overlap start
  const flashDurations = [0.2, 0.2, 0.2, 0.2, 0.5]; // Last flash is longest

  // Opacity progression for videos during flashes
  const opacityProgression = [
    { outgoing: 0.5, incoming: 0.5 }, // Start
    { outgoing: 0.4, incoming: 0.6 }, // Flash 1
    { outgoing: 0.3, incoming: 0.7 }, // Flash 2
    { outgoing: 0.15, incoming: 0.85 }, // Flash 3
    { outgoing: 0, incoming: 1 }, // Flash 4 (final)
  ];

  // Create flash effects for outgoing video
  const createOutgoingFlashEffects = () => {
    const effects: any[] = [];

    // Initial opacity (start at 0.5)
    effects.push({
      id: 'outgoing-opacity-init',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: flashTimes[0],
        mode: 'provider',
        targetIds: ['outgoing-video-layer'],
        ranges: [
          { key: 'opacity', val: 0.5, prog: 0 },
          { key: 'opacity', val: 0.5, prog: 1 },
        ],
      },
    });

    // Progressive opacity changes during flashes
    for (let i = 0; i < flashTimes.length - 1; i++) {
      const startTime = flashTimes[i];
      const endTime = flashTimes[i + 1];
      const duration = endTime - startTime;
      const startOpacity = opacityProgression[i].outgoing;
      const endOpacity = opacityProgression[i + 1].outgoing;

      effects.push({
        id: `outgoing-opacity-${i}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: startTime,
          duration: duration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'opacity', val: startOpacity, prog: 0 },
            { key: 'opacity', val: endOpacity, prog: 1 },
          ],
        },
      });
    }

    // Final fade out
    const lastFlashIndex = flashTimes.length - 1;
    effects.push({
      id: 'outgoing-opacity-final',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: flashTimes[lastFlashIndex],
        duration: flashDurations[lastFlashIndex],
        mode: 'provider',
        targetIds: ['outgoing-video-layer'],
        ranges: [
          { key: 'opacity', val: opacityProgression[lastFlashIndex].outgoing, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    });

    return effects;
  };

  // Create flash effects for incoming video
  const createIncomingFlashEffects = () => {
    const effects: any[] = [];

    // Initial opacity (start at 0.5)
    effects.push({
      id: 'incoming-opacity-init',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: flashTimes[0],
        mode: 'provider',
        targetIds: ['incoming-video-layer'],
        ranges: [
          { key: 'opacity', val: 0.5, prog: 0 },
          { key: 'opacity', val: 0.5, prog: 1 },
        ],
      },
    });

    // Progressive opacity changes during flashes
    for (let i = 0; i < flashTimes.length - 1; i++) {
      const startTime = flashTimes[i];
      const endTime = flashTimes[i + 1];
      const duration = endTime - startTime;
      const startOpacity = opacityProgression[i].incoming;
      const endOpacity = opacityProgression[i + 1].incoming;

      effects.push({
        id: `incoming-opacity-${i}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: startTime,
          duration: duration,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'opacity', val: startOpacity, prog: 0 },
            { key: 'opacity', val: endOpacity, prog: 1 },
          ],
        },
      });
    }

    // Final fade in
    const lastFlashIndex = flashTimes.length - 1;
    effects.push({
      id: 'incoming-opacity-final',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: flashTimes[lastFlashIndex],
        duration: flashDurations[lastFlashIndex],
        mode: 'provider',
        targetIds: ['incoming-video-layer'],
        ranges: [
          { key: 'opacity', val: opacityProgression[lastFlashIndex].incoming, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    });

    return effects;
  };

  // Create RGB split effects (pulse during flashes)
  const createRGBSplitEffects = () => {
    const effects: any[] = [];

    for (let i = 0; i < flashTimes.length; i++) {
      effects.push({
        id: `rgb-split-pulse-${i}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: flashTimes[i],
          duration: flashDurations[i],
          mode: 'provider',
          targetIds: ['rgb-split-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    }

    return effects;
  };

  // Create flash layer effects
  const createFlashEffects = () => {
    const effects: any[] = [];

    for (let i = 0; i < flashTimes.length; i++) {
      effects.push({
        id: `flash-${i}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: flashTimes[i],
          duration: flashDurations[i],
          mode: 'provider',
          targetIds: ['flash-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: i === flashTimes.length - 1 ? 0.3 : 0.4, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    }

    return effects;
  };

  // Create particle float animations
  const createParticleEffects = (particleId: string, index: number) => {
    const floatDistance = 30 + Math.random() * 50;
    const floatDuration = 1.5 + Math.random() * 1.5;
    const delay = Math.random() * 0.5;

    return [
      {
        id: `${particleId}-float`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: delay,
          duration: overlapDuration - delay,
          mode: 'provider',
          targetIds: [particleId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -floatDistance, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: `${particleId}-opacity`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [particleId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6 + Math.random() * 0.4, prog: 0.3 },
            { key: 'opacity', val: 0.6 + Math.random() * 0.4, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ];
  };

  // Create particles
  const particles: RenderableComponentData[] = [];
  const particleCount = 12;
  const particlePositions = [
    { left: '15%', top: '20%' },
    { left: '35%', top: '40%' },
    { left: '55%', top: '15%' },
    { left: '75%', top: '60%' },
    { left: '25%', top: '70%' },
    { left: '65%', top: '35%' },
    { left: '85%', top: '25%' },
    { left: '45%', top: '80%' },
    { left: '10%', top: '50%' },
    { left: '90%', top: '45%' },
    { left: '50%', top: '10%' },
    { left: '70%', top: '75%' },
  ];

  for (let i = 0; i < particleCount; i++) {
    const particleId = `particle-${i + 1}`;
    const size = 5 + Math.random() * 8;
    const blur = 1 + Math.random() * 2;
    const position = particlePositions[i] || { left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` };

    particles.push({
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background-color: rgba(255,255,255,0.7); filter: blur(${blur}px);"></div>`,
        className: 'absolute',
        style: {
          left: position.left,
          top: position.top,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: createParticleEffects(particleId, i),
    } as RenderableComponentData);
  }

  // Build the composition
  const childrenData: RenderableComponentData[] = [
    // Outgoing video layer
    {
      id: 'outgoing-video-layer',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
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
      effects: createOutgoingFlashEffects(),
    } as RenderableComponentData,

    // Incoming video layer (with time displacement)
    {
      id: 'incoming-video-layer',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        playbackRate: 0.95,
        style: {
          mixBlendMode: 'overlay',
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - overlapDuration,
          duration: incomingVideoDuration + overlapDuration,
        },
      },
      effects: createIncomingFlashEffects(),
    } as RenderableComponentData,

    // RGB split container
    {
      id: 'rgb-split-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: createRGBSplitEffects(),
      childrenData: [
        // Red layer
        {
          id: 'rgb-red-layer',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            className: 'absolute inset-0 w-full h-full object-cover',
            fit: 'cover',
            playbackRate: 0.95,
            style: {
              filter: 'saturate(0) brightness(1.2) sepia(1) hue-rotate(330deg)',
              mixBlendMode: 'multiply',
              opacity: 0.6,
              transform: 'translateX(-3px)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration,
            },
          },
        } as RenderableComponentData,

        // Green layer
        {
          id: 'rgb-green-layer',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            className: 'absolute inset-0 w-full h-full object-cover',
            fit: 'cover',
            playbackRate: 0.95,
            style: {
              filter: 'saturate(0) brightness(1.2) sepia(1) hue-rotate(90deg)',
              mixBlendMode: 'screen',
              opacity: 0.6,
              transform: 'translateY(2px)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration,
            },
          },
        } as RenderableComponentData,

        // Blue layer
        {
          id: 'rgb-blue-layer',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            className: 'absolute inset-0 w-full h-full object-cover',
            fit: 'cover',
            playbackRate: 0.95,
            style: {
              filter: 'saturate(0) brightness(1.2) sepia(1) hue-rotate(210deg)',
              mixBlendMode: 'screen',
              opacity: 0.6,
              transform: 'translateX(3px)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Particle container
    {
      id: 'particle-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - overlapDuration,
          duration: overlapDuration,
        },
      },
      childrenData: particles,
    } as RenderableComponentData,

    // Flash layer
    {
      id: 'flash-layer',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background-color: rgba(255,255,255,1); filter: blur(20px);"></div>',
        className: 'absolute inset-0',
        style: {
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: createFlashEffects(),
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'double-exposure-flash-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000',
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
  id: 'double-exposure-flash-transition',
  title: 'Double Exposure Flash Transition',
  description:
    'An experimental dreamy transition that creates artistic double-exposure blends between two videos using pulsing white flashes as blend catalysts. Features RGB channel splitting for psychedelic effects, floating light particles for ethereal quality, alternating blend modes, and slight time displacement for ghost-like trailing. Five progressive flash pulses shift video prominence from 50/50 to full incoming.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'double-exposure',
    'flash',
    'artistic',
    'dreamy',
    'psychedelic',
    'rgb-split',
    'particles',
    'experimental',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    overlapDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const doubleExposureFlashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
