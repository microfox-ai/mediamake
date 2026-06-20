/**
 * Wash Transition Preset
 *
 * Creates a wash transition where the outgoing video appears to be washed with water,
 * causing its ink/colors to run downward in streams, revealing a pristine incoming video underneath.
 * The wash effect starts from the top with water flowing downward, creating vertical streaks of running color.
 *
 * Features:
 * - Outgoing video's saturation increases dramatically before bleeding out
 * - Vertical motion blur simulating running ink
 * - Mask-image with linear-gradient strips animating downward at different speeds
 * - Incoming video with wet glossy effect that dries to normal appearance
 * - Multiple thin water streams with opacity gradients
 * - Transform scaleY for drip elongation effect
 * - 2-second overlap period with GPU-accelerated transforms
 *
 * Use cases:
 * - Creative transitions between videos
 * - Artistic water-wash effect for video content
 * - Colorful ink-running visual effects
 * - Revealing pristine content from washed-out content
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
    .describe('Duration of the transition overlap in seconds (default: 2s)'),
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

  // Calculate total duration: outgoing + incoming - overlap
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - overlapDuration;

  // Incoming video starts before outgoing ends (overlap)
  const incomingVideoStart = outgoingVideoDuration - overlapDuration;

  // Water streams - 8 streams with varying properties
  const waterStreams: RenderableComponentData[] = [
    {
      id: 'stream-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 3px; height: 40px; background: linear-gradient(to bottom, rgba(100, 149, 237, 0.4), transparent); border-radius: 2px;'></div>",
        className: 'transform origin-top',
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'effect-stream-1-scaleY',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 1.8,
            mode: 'provider',
            targetIds: ['stream-1'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 3, prog: 0.5 },
              { key: 'scaleY', val: 5, prog: 1 },
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'stream-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 4px; height: 50px; background: linear-gradient(to bottom, rgba(70, 130, 180, 0.5), transparent); border-radius: 2px;'></div>",
        className: 'transform origin-top',
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'effect-stream-2-scaleY',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0.1,
            duration: 1.7,
            mode: 'provider',
            targetIds: ['stream-2'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 3.5, prog: 0.5 },
              { key: 'scaleY', val: 6, prog: 1 },
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'stream-3',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 2px; height: 35px; background: linear-gradient(to bottom, rgba(65, 105, 225, 0.3), transparent); border-radius: 2px;'></div>",
        className: 'transform origin-top',
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'effect-stream-3-scaleY',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0.05,
            duration: 1.6,
            mode: 'provider',
            targetIds: ['stream-3'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 2.8, prog: 0.5 },
              { key: 'scaleY', val: 4.5, prog: 1 },
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'stream-4',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 3px; height: 45px; background: linear-gradient(to bottom, rgba(95, 158, 160, 0.4), transparent); border-radius: 2px;'></div>",
        className: 'transform origin-top',
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'effect-stream-4-scaleY',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0.15,
            duration: 1.85,
            mode: 'provider',
            targetIds: ['stream-4'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 3.2, prog: 0.5 },
              { key: 'scaleY', val: 5.5, prog: 1 },
              { key: 'opacity', val: 0.75, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'stream-5',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 4px; height: 55px; background: linear-gradient(to bottom, rgba(100, 149, 237, 0.5), transparent); border-radius: 2px;'></div>",
        className: 'transform origin-top',
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'effect-stream-5-scaleY',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0.08,
            duration: 1.9,
            mode: 'provider',
            targetIds: ['stream-5'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 3.8, prog: 0.5 },
              { key: 'scaleY', val: 6.5, prog: 1 },
              { key: 'opacity', val: 0.85, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'stream-6',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 3px; height: 40px; background: linear-gradient(to bottom, rgba(70, 130, 180, 0.4), transparent); border-radius: 2px;'></div>",
        className: 'transform origin-top',
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'effect-stream-6-scaleY',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0.12,
            duration: 1.75,
            mode: 'provider',
            targetIds: ['stream-6'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 3, prog: 0.5 },
              { key: 'scaleY', val: 5, prog: 1 },
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'stream-7',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 2px; height: 38px; background: linear-gradient(to bottom, rgba(65, 105, 225, 0.35), transparent); border-radius: 2px;'></div>",
        className: 'transform origin-top',
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'effect-stream-7-scaleY',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0.18,
            duration: 1.65,
            mode: 'provider',
            targetIds: ['stream-7'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 2.5, prog: 0.5 },
              { key: 'scaleY', val: 4.2, prog: 1 },
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'stream-8',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 4px; height: 48px; background: linear-gradient(to bottom, rgba(95, 158, 160, 0.45), transparent); border-radius: 2px;'></div>",
        className: 'transform origin-top',
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'effect-stream-8-scaleY',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0.2,
            duration: 1.8,
            mode: 'provider',
            targetIds: ['stream-8'],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 3.3, prog: 0.5 },
              { key: 'scaleY', val: 5.8, prog: 1 },
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // Water streams container
  const waterStreamsContainer: RenderableComponentData = {
    id: 'water-streams-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'flex-start',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - overlapDuration,
        duration: overlapDuration,
      },
    },
    childrenData: waterStreams,
  };

  // Incoming video with wet glossy effect
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
        start: incomingVideoStart,
        duration: incomingVideoDuration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideoDuration + overlapDuration,
          },
        },
        effects: [
          {
            id: 'effect-incoming-wet-look',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'filter:contrast', val: 1.3, prog: 0 },
                { key: 'filter:contrast', val: 1, prog: 1 },
                { key: 'filter:brightness', val: 1.1, prog: 0 },
                { key: 'filter:brightness', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Outgoing video with wash effects
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
        duration: outgoingVideoDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
        effects: [
          {
            id: 'effect-outgoing-saturation',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingVideoDuration - 1.5,
              duration: 1.5,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'filter:saturate', val: 1, prog: 0 },
                { key: 'filter:saturate', val: 2, prog: 0.3 },
                { key: 'filter:saturate', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: 'effect-outgoing-vertical-blur',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: outgoingVideoDuration - 1.5,
              duration: 1.5,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'filter:blur-y', val: 0, prog: 0 },
                { key: 'filter:blur-y', val: 8, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
    effects: [
      {
        id: 'effect-outgoing-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingVideoDuration - overlapDuration,
          duration: overlapDuration,
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

  // Root container with gradient background
  const rootContainer: RenderableComponentData = {
    id: 'wash-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(173, 216, 230, 0.1) 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      incomingVideoContainer,
      outgoingVideoContainer,
      waterStreamsContainer,
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

const presetMetadata: PresetMetadata = {
  id: 'wash-transition',
  title: 'Wash Transition',
  description:
    'A sophisticated wash transition where the outgoing video appears to be washed with water, causing its ink/colors to run downward in streams, revealing a pristine incoming video underneath. Features vertical motion blur, saturation effects, running color streams, and a wet-to-dry glossy effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'wash',
    'water',
    'ink-run',
    'color-bleed',
    'vertical-blur',
    'saturation',
    'wet-effect',
    'streams',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    outgoingVideoDuration: 10,
    incomingVideoDuration: 10,
    overlapDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const washTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};