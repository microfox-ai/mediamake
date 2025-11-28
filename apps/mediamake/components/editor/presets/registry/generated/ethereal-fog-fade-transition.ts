/**
 * Ethereal Fog Fade Transition Preset
 *
 * Creates a dreamlike dissolve between videos using layered opacity and scale animations
 * with a misty intermediate state. The outgoing video scales down (1 to 0.9) while becoming
 * transparent and blurred, creating a receding fog effect. The incoming video emerges from
 * an oversized blurred state (scale 1.15 to 1) with gentle opacity fade.
 *
 * Features:
 * - **Fog Effect**: Outgoing video recedes with blur, scale-down, and opacity fade
 * - **Emergence Effect**: Incoming video emerges from oversized blurred state
 * - **Vignette Overlay**: Radial gradient vignette enhances atmospheric quality
 * - **Pulsing Fog Density**: Subtle opacity variations simulate fog movement
 * - **3-Second Transition**: Slow, dreamlike dissolve
 *
 * Technical Specifications:
 * - BaseLayout duration = video1.duration + video2.duration - 3s overlap
 * - Outgoing: scale 1→0.9, opacity keyframes [1, 0.7, 0.3, 0], blur 0→25px
 * - Incoming: scale 1.15→1, opacity keyframes [0, 0.2, 0.6, 1], blur 35px→0
 * - Vignette: radial-gradient overlay, opacity 0→0.5→0 over transition
 *
 * Use cases:
 * - Dreamlike video transitions
 * - Atmospheric mood shifts
 * - Ethereal visual storytelling
 * - Soft, misty scene changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(3)
    .describe('Duration of the fog transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total composition duration
  // Total = video1.duration + video2.duration - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Transition starts at this point in the composition
  const transitionStart = video1.duration - transitionDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video wrapper
    {
      id: 'outgoing-video-wrapper',
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
        } as RenderableComponentData,
      ],
      effects: [
        // Scale down effect (1 → 0.9)
        {
          id: 'outgoing-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-wrapper'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.9, prog: 1 },
            ],
          },
        },
        // Opacity fade with keyframes
        {
          id: 'outgoing-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-wrapper'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.33 },
              { key: 'opacity', val: 0.3, prog: 0.66 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Blur effect (0 → 25px)
        {
          id: 'outgoing-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-wrapper'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(25px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video wrapper
    {
      id: 'incoming-video-wrapper',
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
        } as RenderableComponentData,
      ],
      effects: [
        // Scale effect (1.15 → 1)
        {
          id: 'incoming-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-wrapper'],
            ranges: [
              { key: 'scale', val: 1.15, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Opacity fade with keyframes
        {
          id: 'incoming-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-wrapper'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.2, prog: 0.33 },
              { key: 'opacity', val: 0.6, prog: 0.66 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Blur effect (35px → 0)
        {
          id: 'incoming-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-wrapper'],
            ranges: [
              { key: 'filter', val: 'blur(35px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Vignette overlay
    {
      id: 'vignette-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 z-30 pointer-events-none',
          style: {
            background:
              'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.6) 100%)',
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      childrenData: [],
      effects: [
        // Vignette opacity animation (0 → 0.5 → 0)
        {
          id: 'vignette-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['vignette-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Fog pulsing effect (subtle variations)
        {
          id: 'fog-pulse-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0.5,
            duration: transitionDuration - 1,
            mode: 'provider',
            targetIds: ['vignette-overlay'],
            ranges: [
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 0.65, prog: 0.25 },
              { key: 'opacity', val: 0.5, prog: 0.5 },
              { key: 'opacity', val: 0.6, prog: 0.75 },
              { key: 'opacity', val: 0.5, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'ethereal-fog-fade-transition-container',
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
  id: 'ethereal-fog-fade-transition',
  title: 'Ethereal Fog Fade Transition',
  description:
    'Creates a dreamlike dissolve between videos using layered opacity and scale animations with a misty intermediate state. The outgoing video scales down (1 to 0.9) while becoming transparent and blurred, creating a receding fog effect. The incoming video emerges from an oversized blurred state (scale 1.15 to 1) with gentle opacity fade. Includes subtle vignette effect and pulsing opacity variations to simulate fog density changes. Implements a 3-second slow transition with smooth blending.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'fog', 'fade', 'ethereal', 'dreamlike', 'blur', 'atmospheric'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    transitionDuration: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const etherealFogFadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
