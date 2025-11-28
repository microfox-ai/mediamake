/**
 * Particulate Fade Transition Preset
 *
 * This preset creates a granular smoke dissolution effect between two videos, simulating
 * videos breaking apart into particles and reforming from scattered particles.
 *
 * Features:
 * - **Pixelated Particle Simulation**: Progressive pixelation using scale transforms on a grid pattern
 * - **Granular Fade**: Stepped opacity transitions for particle-like dissolution
 * - **Blur Effects**: Increasing blur on outgoing, decreasing on incoming video
 * - **Saturation Changes**: Colors desaturate during dissolution, resaturate during reformation
 * - **Grain/Noise Overlay**: Enhances particle effect during transition
 * - **1.6-Second Transition**: Precise timing with stepped easing for pixelation
 *
 * Use cases:
 * - Creating granular smoke-like transitions between video clips
 * - Building particle dissolution/reformation effects
 * - Adding digital breakdown/assembly effects
 * - Creating stylized video transitions with pixelation
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of first video'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video (outgoing)'),
  video2: z
    .object({
      src: z.string().describe('Source URL of second video'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video (incoming)'),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate timing
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;
  const transitionStart = video1.duration - transitionDuration;

  // Generate noise overlay SVG (simple noise pattern)
  const generateNoiseSVG = () => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
        </filter>
        <rect width="200" height="200" filter="url(#noise)" opacity="0.15"/>
      </svg>
    `)}`;
  };

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
            fit: 'cover' as const,
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
          effects: [
            // Scale transform with steps for pixelation effect
            {
              id: 'outgoing-pixelation-scale',
              componentId: 'generic',
              data: {
                type: 'steps(4, end)' as any,
                start: transitionStart,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 0.98, prog: 0.25 },
                  { key: 'scale', val: 0.95, prog: 0.5 },
                  { key: 'scale', val: 0.9, prog: 1 },
                ],
              },
            },
            // Stepped opacity fade for granular effect
            {
              id: 'outgoing-opacity-fade',
              componentId: 'generic',
              data: {
                type: 'steps(4, end)' as any,
                start: transitionStart,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0.75, prog: 0.33 },
                  { key: 'opacity', val: 0.4, prog: 0.66 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
            // Blur effect
            {
              id: 'outgoing-blur',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: transitionStart,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'blur', val: 0, prog: 0 },
                  { key: 'blur', val: 20, prog: 1 },
                ],
              },
            },
            // Saturation desaturation
            {
              id: 'outgoing-saturation',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: transitionStart,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'saturate', val: 1, prog: 0 },
                  { key: 'saturate', val: 0, prog: 1 },
                ],
              },
            },
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
            fit: 'cover' as const,
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
          effects: [
            // Scale transform with steps for pixelation effect
            {
              id: 'incoming-pixelation-scale',
              componentId: 'generic',
              data: {
                type: 'steps(4, end)' as any,
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'scale', val: 1.1, prog: 0 },
                  { key: 'scale', val: 1.05, prog: 0.33 },
                  { key: 'scale', val: 1.02, prog: 0.66 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
            // Stepped opacity fade for granular effect
            {
              id: 'incoming-opacity-fade',
              componentId: 'generic',
              data: {
                type: 'steps(4, end)' as any,
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.35, prog: 0.33 },
                  { key: 'opacity', val: 0.7, prog: 0.66 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
            // Blur effect
            {
              id: 'incoming-blur',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'blur', val: 25, prog: 0 },
                  { key: 'blur', val: 0, prog: 1 },
                ],
              },
            },
            // Saturation resaturation
            {
              id: 'incoming-saturation',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'saturate', val: 0, prog: 0 },
                  { key: 'saturate', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Noise overlay container
    {
      id: 'noise-overlay-container',
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
      childrenData: [
        {
          id: 'noise-overlay',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 100%; height: 100%; background-image: url('${generateNoiseSVG()}'); background-size: 200px 200px; mix-blend-mode: overlay;"></div>`,
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
              id: 'noise-opacity-pulse',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['noise-overlay'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.3, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'particulate-fade-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
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
  id: 'particulate-fade-transition',
  title: 'Particulate Fade Transition',
  description:
    'A granular smoke dissolution transition between two videos with pixelated particle simulation, grain/noise overlays, and saturation changes. Videos transition through a 1.6-second overlap with stepped pixelation effects, blur, and opacity changes creating a particle dissolution/reformation effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'particulate',
    'fade',
    'smoke',
    'dissolution',
    'pixelation',
    'grain',
    'particle',
    'video',
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
    transitionDuration: 1.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const particulateFadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};