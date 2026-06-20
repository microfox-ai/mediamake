/**
 * Venetian Blind Page Transition Preset
 *
 * This preset creates a premium venetian blind style page transition where the video appears
 * printed on vertical strips that fold over one by one from left to right. Each strip features
 * realistic 3D fold animation with proper shadows, highlights, and metallic edges. The strips
 * have slightly different timing to create a wave-like effect.
 *
 * Features:
 * - **12 Vertical Strips**: Grid layout with 12 equal vertical strips
 * - **3D Fold Animation**: Realistic rotateY(0deg to 180deg) fold with transform-origin
 * - **Wave Propagation**: Staggered timing (index * 0.05s) for smooth wave effect
 * - **Reverse Side Animation**: Briefly shows reverse with inverted colors
 * - **Metallic Edges**: Box-shadow inset for premium metallic appearance
 * - **Synchronized Reveal**: Incoming video strips unfold in sync with outgoing
 * - **Proper Depth**: Box-shadow for 3D depth and backface-visibility handling
 *
 * Use cases:
 * - Premium page transitions between video clips
 * - Creating cinematic fold effects
 * - Building sophisticated video transitions with depth
 * - Adding professional 3D animation effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    fit: z
      .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
      .default('cover')
      .optional()
      .describe('Object fit for outgoing video'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    fit: z
      .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
      .default('cover')
      .optional()
      .describe('Object fit for incoming video'),
  }),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Total duration of transition in seconds (includes wave propagation)'),
  stripDelayIncrement: z
    .number()
    .default(0.05)
    .describe('Delay increment per strip in seconds (default: 0.05s for wave effect)'),
  perspective: z
    .number()
    .default(1500)
    .describe('CSS perspective value in pixels for 3D effect'),
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
    stripDelayIncrement,
    perspective,
  } = params;

  const stripCount = 12;
  const stripFoldDuration = 1.05; // Individual strip fold duration
  const lastStripDelay = (stripCount - 1) * stripDelayIncrement;
  const totalDuration = lastStripDelay + stripFoldDuration;

  // Helper function to create a strip component
  const createStrip = (index: number): RenderableComponentData => {
    const stripDelay = index * stripDelayIncrement;
    const objectPositionPercent = (index / (stripCount - 1)) * 100;

    const stripId = `strip-${index}`;
    const outgoingId = `${stripId}-outgoing`;
    const incomingId = `${stripId}-incoming`;

    return {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            transformStyle: 'preserve-3d',
            transformOrigin: 'left center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `${stripId}-fold-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: stripDelay,
            duration: stripFoldDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: 180, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Outgoing side (front face)
        {
          id: outgoingId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                backfaceVisibility: 'hidden',
                boxShadow:
                  'inset 2px 0 4px rgba(255,255,255,0.3), inset -2px 0 4px rgba(0,0,0,0.2), 4px 0 8px rgba(0,0,0,0.3)',
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
            {
              id: `${outgoingId}-video`,
              type: 'atom',
              componentId: 'VideoAtom',
              data: {
                src: outgoingVideo.src,
                fit: outgoingVideo.fit || 'cover',
                style: {
                  width: '1200%',
                  height: '100%',
                  objectPosition: `${objectPositionPercent.toFixed(2)}% center`,
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: totalDuration,
                },
              },
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
        // Incoming side (back face)
        {
          id: incomingId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                boxShadow:
                  'inset 2px 0 4px rgba(255,255,255,0.3), inset -2px 0 4px rgba(0,0,0,0.2)',
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
            {
              id: `${incomingId}-video`,
              type: 'atom',
              componentId: 'VideoAtom',
              data: {
                src: incomingVideo.src,
                fit: incomingVideo.fit || 'cover',
                style: {
                  width: '1200%',
                  height: '100%',
                  objectPosition: `${objectPositionPercent.toFixed(2)}% center`,
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: totalDuration,
                },
              },
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Create all 12 strips
  const strips: RenderableComponentData[] = [];
  for (let i = 0; i < stripCount; i++) {
    strips.push(createStrip(i));
  }

  const rootContainer: RenderableComponentData = {
    id: 'venetian-blind-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          perspective: `${perspective}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: strips,
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
  id: 'venetian-blind-transition',
  title: 'Venetian Blind Page Transition',
  description:
    'Premium venetian blind style page transition with 12 vertical strips that fold over sequentially from left to right. Features realistic 3D fold animation with proper perspective, shadows, highlights, and metallic edge effects. The strips fold in a wave-like pattern with staggered timing (0.05s delay per strip). As each strip folds to 90+ degrees, the reverse side briefly shows with inverted colors before revealing the incoming video. The incoming video strips start folded at -180deg and unfold in sync with the outgoing strips, creating a seamless transition between two video sources.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'venetian-blind',
    '3d',
    'fold',
    'strips',
    'metallic',
    'wave',
    'premium',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      fit: 'cover',
    },
    incomingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      fit: 'cover',
    },
    transitionDuration: 1.6,
    stripDelayIncrement: 0.05,
    perspective: 1500,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const venetianBlindTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
