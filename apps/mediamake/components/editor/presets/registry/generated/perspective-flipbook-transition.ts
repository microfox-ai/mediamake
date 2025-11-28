/**
 * Perspective Flip Book Transition Preset
 *
 * Creates a 3D flip book animation where videos appear as pages rapidly flipping in sequence.
 * Features multiple intermediate 'pages' that flip quickly with staggered timing, creating
 * the illusion of a book with pages turning. Each page has varying rotation speeds and depths
 * for realistic page flutter effects.
 *
 * Features:
 * - 3D perspective transformation (1800px depth)
 * - 4 layers: outgoing video, 2 intermediate pages, incoming video
 * - Staggered timing with delays (0s, 0.15s, 0.3s, 0.45s)
 * - Varying rotation speeds for realistic flutter
 * - Depth separation using translateZ
 * - Dynamic drop-shadow that increases during flip
 * - Semi-transparent intermediate pages with blur
 *
 * Use cases:
 * - Creating dramatic page-turning transitions between videos
 * - Building cinematic scene changes with depth
 * - Adding realistic book-flip effects to video sequences
 * - Creating engaging transitions for storytelling content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time in seconds for outgoing video'),
      endAt: z
        .number()
        .optional()
        .describe('End time in seconds for outgoing video'),
    })
    .describe('Outgoing video configuration'),
  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time in seconds for incoming video'),
      endAt: z
        .number()
        .optional()
        .describe('End time in seconds for incoming video'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Total duration of the flip book transition in seconds'),
  perspectiveDepth: z
    .number()
    .min(1000)
    .max(3000)
    .default(1800)
    .describe('Perspective depth in pixels for 3D effect'),
  intermediatePageOpacity: z
    .number()
    .min(0.1)
    .max(0.6)
    .default(0.3)
    .describe('Opacity of intermediate page layers'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    perspectiveDepth,
    intermediatePageOpacity,
  } = params;

  // Staggered timing configuration
  const outgoingDelay = 0;
  const intermediate1Delay = 0.15;
  const intermediate2Delay = 0.3;
  const incomingDelay = 0.45;

  // Rotation angles for each layer
  const outgoingRotation = -170;
  const intermediate1Rotation = -175;
  const intermediate2Rotation = -165;
  const incomingStartRotation = -180;
  const incomingEndRotation = 0;

  // Effect durations (varying speeds)
  const outgoingEffectDuration = 0.8;
  const intermediate1EffectDuration = 0.9;
  const intermediate2EffectDuration = 1.0;
  const incomingEffectDuration = 1.2;

  // Depth offsets for Z-axis separation
  const outgoingZ = 20;
  const intermediate1Z = 10;
  const intermediate2Z = 5;
  const incomingZ = 0;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video layer
    {
      id: 'outgoing-video-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          },
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
          id: 'outgoing-flip-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingDelay,
            duration: outgoingEffectDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-layer'],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: outgoingRotation, prog: 1 },
              { key: 'translateZ', val: outgoingZ, prog: 0 },
              { key: 'translateZ', val: outgoingZ, prog: 1 },
              {
                key: 'filter',
                val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'drop-shadow(20px 20px 30px rgba(0,0,0,0.4))',
                prog: 0.5,
              },
              {
                key: 'filter',
                val: 'drop-shadow(30px 30px 40px rgba(0,0,0,0.5))',
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            startFrom: outgoingVideo.startFrom,
            endAt: outgoingVideo.endAt,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Intermediate page 1
    {
      id: 'intermediate-page-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            opacity: intermediatePageOpacity,
            filter: 'blur(2px)',
            backgroundColor: '#e8e8e8',
          },
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
          id: 'intermediate-1-flip-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: intermediate1Delay,
            duration: intermediate1EffectDuration,
            mode: 'provider',
            targetIds: ['intermediate-page-1'],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: intermediate1Rotation, prog: 1 },
              { key: 'translateZ', val: intermediate1Z, prog: 0 },
              { key: 'translateZ', val: intermediate1Z, prog: 1 },
              {
                key: 'filter',
                val: 'blur(2px) drop-shadow(0px 0px 0px rgba(0,0,0,0))',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'blur(2px) drop-shadow(15px 15px 25px rgba(0,0,0,0.35))',
                prog: 0.5,
              },
              {
                key: 'filter',
                val: 'blur(2px) drop-shadow(25px 25px 35px rgba(0,0,0,0.45))',
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Intermediate page 2
    {
      id: 'intermediate-page-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            opacity: intermediatePageOpacity,
            filter: 'blur(1.5px)',
            backgroundColor: '#f0f0f0',
          },
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
          id: 'intermediate-2-flip-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: intermediate2Delay,
            duration: intermediate2EffectDuration,
            mode: 'provider',
            targetIds: ['intermediate-page-2'],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: intermediate2Rotation, prog: 1 },
              { key: 'translateZ', val: intermediate2Z, prog: 0 },
              { key: 'translateZ', val: intermediate2Z, prog: 1 },
              {
                key: 'filter',
                val: 'blur(1.5px) drop-shadow(0px 0px 0px rgba(0,0,0,0))',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'blur(1.5px) drop-shadow(12px 12px 20px rgba(0,0,0,0.3))',
                prog: 0.5,
              },
              {
                key: 'filter',
                val: 'blur(1.5px) drop-shadow(20px 20px 30px rgba(0,0,0,0.4))',
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Incoming video layer
    {
      id: 'incoming-video-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          },
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
          id: 'incoming-flip-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: incomingDelay,
            duration: incomingEffectDuration,
            mode: 'provider',
            targetIds: ['incoming-video-layer'],
            ranges: [
              { key: 'rotateY', val: incomingStartRotation, prog: 0 },
              { key: 'rotateY', val: incomingEndRotation, prog: 1 },
              { key: 'translateZ', val: incomingZ, prog: 0 },
              { key: 'translateZ', val: incomingZ, prog: 1 },
              {
                key: 'filter',
                val: 'drop-shadow(30px 30px 40px rgba(0,0,0,0.5))',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'drop-shadow(15px 15px 25px rgba(0,0,0,0.3))',
                prog: 0.5,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            startFrom: incomingVideo.startFrom,
            endAt: incomingVideo.endAt,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'perspective-flipbook-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          perspective: `${perspectiveDepth}px`,
          perspectiveOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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
  id: 'perspective-flipbook-transition',
  title: 'Perspective Flip Book Transition',
  description:
    '3D flip book animation with multiple intermediate pages creating a realistic page-flipping effect. Outgoing and incoming videos appear as pages in a book that flip in rapid sequence with staggered timing, varying rotation speeds, and depth separation. Features dynamic shadows and blur effects for realism.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    '3d',
    'flip',
    'book',
    'page',
    'perspective',
    'depth',
    'stagger',
    'cinematic',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      startFrom: 0,
      endAt: 10,
    },
    incomingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      startFrom: 0,
      endAt: 10,
    },
    transitionDuration: 1.2,
    perspectiveDepth: 1800,
    intermediatePageOpacity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const perspectiveFlipbookTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
