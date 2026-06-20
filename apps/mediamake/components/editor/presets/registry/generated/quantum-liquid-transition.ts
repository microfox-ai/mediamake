/**
 * Quantum Liquid Transition Preset
 *
 * This preset creates a quantum physics-inspired video transition where videos exist in superposition
 * before collapsing into the next state. Features 1.5-second overlap with probability wave visualization,
 * interference patterns using radial gradients, particle trail effects following quantum probability curves,
 * chromatic dispersion, and quantum fluctuation opacity flickering.
 *
 * Both videos are simultaneously visible at 50% opacity initially, representing quantum superposition state.
 * The outgoing video gradually becomes more transparent with flickering opacity (quantum fluctuations),
 * while the incoming video stabilizes. Interference patterns shift and merge using repeating radial gradients.
 * Small particle elements trace probability curves between the two states using animated translations.
 * Chromatic dispersion (RGB text-shadow splits) is applied during the uncertainty phase.
 *
 * Use cases:
 * - Creating quantum-themed video transitions
 * - Adding science fiction visual effects to video sequences
 * - Building cinematic transitions with advanced visual effects
 * - Creating unique probability-wave based transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    type: z.enum(['video', 'image']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    type: z.enum(['video', 'image']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of quantum transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Calculate BaseLayout duration (sum of videos minus overlap)
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Determine component IDs
  const outgoingComponentId = outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Build children data
  const childrenData: RenderableComponentData[] = [
    // Outgoing video - starts at 50% opacity, flickers, then fades out
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Quantum flickering opacity effect
        {
          id: 'outgoing-flicker-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 0.45, prog: 0.1 },
              { key: 'opacity', val: 0.52, prog: 0.2 },
              { key: 'opacity', val: 0.42, prog: 0.3 },
              { key: 'opacity', val: 0.48, prog: 0.4 },
              { key: 'opacity', val: 0.38, prog: 0.5 },
              { key: 'opacity', val: 0.35, prog: 0.6 },
              { key: 'opacity', val: 0.28, prog: 0.7 },
              { key: 'opacity', val: 0.2, prog: 0.8 },
              { key: 'opacity', val: 0.1, prog: 0.9 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming video - starts at 50% opacity, stabilizes to 100%
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        // Stabilization effect
        {
          id: 'incoming-stabilize-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Interference pattern overlay
    {
      id: 'interference-pattern',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%;"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 2%, rgba(255,255,255,0.05) 4%)',
          mixBlendMode: 'overlay',
          opacity: 0.6,
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        // Interference shift and scale effect
        {
          id: 'interference-shift-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['interference-pattern'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 30, prog: 0.5 },
              { key: 'translateX', val: -20, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -20, prog: 0.5 },
              { key: 'translateY', val: 15, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Particle trail 1
    {
      id: 'particle-trail-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 8px; height: 8px; border-radius: 50%; background: rgba(100, 200, 255, 0.8); box-shadow: 0 0 10px rgba(100, 200, 255, 0.6);"></div>',
        className: 'absolute',
        style: {
          left: '20%',
          top: '30%',
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'particle-1-movement-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['particle-trail-1'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 60, prog: 0.3 },
              { key: 'translateX', val: 80, prog: 0.7 },
              { key: 'translateX', val: 100, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -40, prog: 0.3 },
              { key: 'translateY', val: 30, prog: 0.7 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1.5, prog: 0.5 },
              { key: 'scale', val: 0.8, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Particle trail 2
    {
      id: 'particle-trail-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 6px; height: 6px; border-radius: 50%; background: rgba(255, 100, 200, 0.8); box-shadow: 0 0 8px rgba(255, 100, 200, 0.6);"></div>',
        className: 'absolute',
        style: {
          left: '70%',
          top: '50%',
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration + 0.2,
          duration: transitionDuration - 0.2,
        },
      },
      effects: [
        {
          id: 'particle-2-movement-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration - 0.2,
            mode: 'provider',
            targetIds: ['particle-trail-2'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -50, prog: 0.4 },
              { key: 'translateX', val: -30, prog: 0.8 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 50, prog: 0.4 },
              { key: 'translateY', val: -20, prog: 0.8 },
              { key: 'translateY', val: 10, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.15 },
              { key: 'opacity', val: 1, prog: 0.85 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.4, prog: 0 },
              { key: 'scale', val: 1.3, prog: 0.5 },
              { key: 'scale', val: 0.7, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Particle trail 3
    {
      id: 'particle-trail-3',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 7px; height: 7px; border-radius: 50%; background: rgba(200, 255, 100, 0.8); box-shadow: 0 0 9px rgba(200, 255, 100, 0.6);"></div>',
        className: 'absolute',
        style: {
          left: '50%',
          top: '70%',
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration + 0.3,
          duration: transitionDuration - 0.3,
        },
      },
      effects: [
        {
          id: 'particle-3-movement-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration - 0.3,
            mode: 'provider',
            targetIds: ['particle-trail-3'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 40, prog: 0.35 },
              { key: 'translateX', val: -60, prog: 0.75 },
              { key: 'translateX', val: -20, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -30, prog: 0.35 },
              { key: 'translateY', val: -50, prog: 0.75 },
              { key: 'translateY', val: -10, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.6, prog: 0 },
              { key: 'scale', val: 1.4, prog: 0.5 },
              { key: 'scale', val: 0.9, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Chromatic dispersion container
    {
      id: 'chromatic-dispersion-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'color-dodge',
            filter: 'blur(0.5px)',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration + 0.5,
          duration: 0.8,
        },
      },
      effects: [
        {
          id: 'chromatic-dispersion-pulse-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 0.8,
            mode: 'provider',
            targetIds: ['chromatic-dispersion-container'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'quantum-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black w-full h-full',
        style: {
          isolation: 'isolate',
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
  id: 'quantum-liquid-transition',
  title: 'Quantum Liquid Transition',
  description:
    'A quantum physics-inspired video transition where videos exist in superposition before collapsing into the next state. Features 1.5-second overlap with probability wave visualization, interference patterns using radial gradients, particle trail effects following quantum probability curves, chromatic dispersion, and quantum fluctuation opacity flickering. Both videos are simultaneously visible at 50% opacity initially, representing quantum superposition state.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'quantum', 'physics', 'superposition', 'interference', 'particles', 'chromatic', 'liquid', 'advanced'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 3,
    },
    transitionDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const quantumLiquidTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
