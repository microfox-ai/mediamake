/**
 * Contact Sheet Transition Preset
 *
 * This preset creates a film-inspired transition where videos appear as negatives on a light table.
 * The outgoing video inverts colors and shifts to a grid position at thumbnail scale, while semi-transparent
 * ghost copies appear at different positions. The incoming video emerges from an inverted thumbnail state
 * and scales up to full frame with normal colors.
 *
 * Features:
 * - Film negative effect with invert filter
 * - Grid positioning and thumbnail scaling
 * - Multiple ghost copies at different positions
 * - Bright backlight gradient effect
 * - Film sprocket holes on sides for authenticity
 * - Smooth transitions with blend modes
 *
 * Use cases:
 * - Film-style video transitions
 * - Contact sheet aesthetic for video montages
 * - Creative transitions between video clips
 * - Retro film effects
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
  transitionDuration: z
    .number()
    .default(1.1)
    .describe('Duration of the transition overlap in seconds'),
  sprocketPattern: z
    .string()
    .optional()
    .describe('Optional URL for film sprocket pattern image'),
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
    transitionDuration,
    sprocketPattern,
  } = params;

  // Calculate total duration: outgoing + incoming - overlap
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Transition start time (relative to outgoing video)
  const transitionStartTime = outgoingVideoDuration - transitionDuration;

  // Ghost copy timings (staggered during transition)
  const ghost1StartTime = outgoingVideoDuration - 0.8;
  const ghost2StartTime = outgoingVideoDuration - 0.7;
  const ghost3StartTime = outgoingVideoDuration - 0.6;

  const childrenData: RenderableComponentData[] = [
    // Backlight glow effect
    {
      id: 'backlight-glow',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "&lt;div style='position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(240,240,240,0.3) 70%, transparent 100%);pointer-events:none;'&gt;&lt;/div&gt;",
        className: 'absolute inset-0',
        style: {},
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,

    // Left sprocket holes (if pattern provided)
    ...(sprocketPattern
      ? [
          {
            id: 'left-sprockets',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: sprocketPattern,
              className: 'absolute top-0 bottom-0 left-0 w-8 opacity-50',
              style: {
                objectFit: 'fill',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          } as RenderableComponentData,
        ]
      : []),

    // Right sprocket holes (if pattern provided)
    ...(sprocketPattern
      ? [
          {
            id: 'right-sprockets',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: sprocketPattern,
              className: 'absolute top-0 bottom-0 right-0 w-8 opacity-50',
              style: {
                objectFit: 'fill',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          } as RenderableComponentData,
        ]
      : []),

    // Outgoing video with transition effects
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        fit: 'cover',
        className: 'absolute w-full h-full object-cover',
        style: {
          mixBlendMode: 'multiply',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-transition',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStartTime,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'invert(0)', prog: 0 },
              { key: 'filter', val: 'invert(1)', prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.3, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -200, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -150, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Ghost copy 1
    {
      id: 'ghost-copy-1',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        fit: 'cover',
        className: 'absolute w-full h-full object-cover',
        style: {
          opacity: 0.3,
          mixBlendMode: 'multiply',
          filter: 'invert(1)',
          transform: 'scale(0.3) translateX(-350px) translateY(-200px)',
        },
      },
      context: {
        timing: {
          start: ghost1StartTime,
          duration: 0.5,
        },
      },
    } as RenderableComponentData,

    // Ghost copy 2
    {
      id: 'ghost-copy-2',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        fit: 'cover',
        className: 'absolute w-full h-full object-cover',
        style: {
          opacity: 0.3,
          mixBlendMode: 'multiply',
          filter: 'invert(1)',
          transform: 'scale(0.3) translateX(100px) translateY(-300px)',
        },
      },
      context: {
        timing: {
          start: ghost2StartTime,
          duration: 0.4,
        },
      },
    } as RenderableComponentData,

    // Ghost copy 3
    {
      id: 'ghost-copy-3',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        fit: 'cover',
        className: 'absolute w-full h-full object-cover',
        style: {
          opacity: 0.3,
          mixBlendMode: 'multiply',
          filter: 'invert(1)',
          transform: 'scale(0.3) translateX(-100px) translateY(200px)',
        },
      },
      context: {
        timing: {
          start: ghost3StartTime,
          duration: 0.35,
        },
      },
    } as RenderableComponentData,

    // Incoming video with transition effects
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        fit: 'cover',
        className: 'absolute w-full h-full object-cover',
        style: {
          mixBlendMode: 'multiply',
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: incomingVideoDuration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-transition',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to incoming video start
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: 'invert(1)', prog: 0 },
              { key: 'filter', val: 'invert(0)', prog: 1 },
              { key: 'scale', val: 0.3, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'translateX', val: 200, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 150, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'contact-sheet-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gradient-to-br from-gray-100 to-white overflow-hidden',
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
  id: 'contact-sheet-transition',
  title: 'Contact Sheet Transition',
  description:
    'A film-inspired transition where videos appear as negatives on a light table. The outgoing video inverts colors and shifts to a grid position at thumbnail scale while semi-transparent ghost copies appear at different positions. The incoming video emerges from an inverted thumbnail state and scales up to full frame with normal colors. Features a bright backlight effect and film sprocket holes for authenticity.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'film', 'negative', 'contact-sheet', 'vintage'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    transitionDuration: 1.1,
    sprocketPattern: '',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const contactSheetTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
