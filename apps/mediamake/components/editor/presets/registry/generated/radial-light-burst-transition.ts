/**
 * Radial Light Burst Transition Preset
 *
 * This preset creates an ethereal radial light burst transition effect that simulates
 * a heavenly glow expanding from the center. The outgoing video scales down while a
 * radial gradient overlay expands, creating a light burst effect. As the light peaks,
 * the incoming video fades in with a dreamy glow filter. Floating particle-like
 * elements drift upward during the transition to enhance the ethereal atmosphere.
 *
 * Features:
 * - **Radial Light Burst**: White-to-transparent gradient expands from center
 * - **Scaling Outgoing Video**: Scales from 100% to 80% during transition
 * - **Dreamy Glow Effect**: Drop-shadow with soft white/pink tones on incoming video
 * - **Floating Particles**: 8 semi-transparent circles that drift upward
 * - **Smooth Overlap**: 1.5-second transition overlap between videos
 *
 * Use cases:
 * - Heavenly or ethereal video transitions
 * - Dream sequence transitions
 * - Spiritual or meditation content transitions
 * - Romantic or emotional scene changes
 * - Light-themed brand transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of transition overlap in seconds'),
  particleCount: z
    .number()
    .min(5)
    .max(12)
    .default(8)
    .describe('Number of floating particles (5-12)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration, particleCount } = params;

  // Calculate BaseLayout duration
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Generate random x positions for particles
  const generateParticlePositions = (count: number): string[] => {
    const positions: string[] = [];
    for (let i = 0; i < count; i++) {
      // Random position between 10% and 90%
      const xPos = 10 + Math.random() * 80;
      positions.push(`${xPos}%`);
    }
    return positions;
  };

  const particlePositions = generateParticlePositions(particleCount);

  // Create particle elements
  const particles: RenderableComponentData[] = particlePositions.map(
    (xPos, index) => ({
      id: `particle-${index}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute w-8 h-8 rounded-full',
        style: {
          backgroundColor: 'rgba(255,255,255,0.2)',
          left: xPos,
          bottom: '0',
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `particle-float-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`particle-${index}`],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -200, prog: 1 },
              { key: 'opacity', val: 0.2, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  const childrenData: RenderableComponentData[] = [
    // Outgoing video
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
      effects: [
        {
          id: 'outgoing-scale-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.8, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Radial gradient overlay
    {
      id: 'radial-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'radial-gradient(circle at center, rgba(255,255,255,0.6) 0%, transparent 50%, transparent 100%)',
          },
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'radial-expand',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['radial-overlay'],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 3, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
    // Particles container
    {
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
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      childrenData: particles,
    } as RenderableComponentData,
    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          filter: 'drop-shadow(0 0 40px rgba(255,182,193,0.5))',
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-fade-glow',
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
  ];

  const rootContainer: RenderableComponentData = {
    id: 'radial-light-burst-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
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
  id: 'radial-light-burst-transition',
  title: 'Radial Light Burst Transition',
  description:
    'An ethereal transition effect that simulates a heavenly light burst expanding from the center. The outgoing video scales down while a radial gradient overlay expands from the center, creating a light burst effect. As the light peaks, the incoming video fades in with a dreamy glow filter. Floating particle-like elements drift upward during the transition, enhancing the ethereal atmosphere.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'radial',
    'light-burst',
    'ethereal',
    'glow',
    'particles',
    'bokeh',
    'dreamy',
    'heavenly',
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
    transitionDuration: 1.5,
    particleCount: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const radialLightBurstTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
