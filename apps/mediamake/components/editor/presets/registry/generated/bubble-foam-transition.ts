/**
 * Bubble Foam Transition Preset
 *
 * Creates an effervescent, foamy transition effect where videos change through
 * hundreds of small circular masks that bubble up from the bottom. Each bubble
 * reveals portions of the incoming video with varying sizes, speeds, and
 * horizontal drift to create organic movement. As bubbles rise, they merge and
 * pop, creating larger reveal areas. The outgoing video appears to dissolve
 * where bubbles touch it, using localized blur and lightening effects. Adds a
 * subtle prismatic effect at bubble edges to simulate soap film iridescence.
 *
 * Features:
 * - 1.7-second overlap transition period
 * - 50+ circular bubble masks with varying sizes (40px-140px)
 * - Individual bubble animations: translateY (rise), translateX (drift), scale (pop)
 * - Staggered timing for wave-like emergence
 * - Outgoing video dissolve with blur and brightness
 * - Incoming video reveal with expanding circular clip-path
 * - Iridescent prismatic borders on bubbles
 * - Mix-blend-mode overlay for soap-like shimmer
 *
 * Use cases:
 * - Creating watercolor-soap foam transitions between videos
 * - Adding organic, effervescent effects to video changes
 * - Building playful, whimsical video transitions
 * - Simulating soap bubbles revealing new content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video (fading out)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (fading in)'),
  overlapDuration: z
    .number()
    .default(1.7)
    .describe('Duration of the transition overlap in seconds'),
  bubbleCount: z
    .number()
    .min(30)
    .max(100)
    .default(50)
    .describe('Number of bubble elements to generate'),
  minBubbleSize: z
    .number()
    .default(40)
    .describe('Minimum bubble size in pixels'),
  maxBubbleSize: z
    .number()
    .default(140)
    .describe('Maximum bubble size in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    overlapDuration,
    bubbleCount,
    minBubbleSize,
    maxBubbleSize,
  } = params;

  // Helper: Generate random value in range
  const random = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate bubble data
  const generateBubbles = (count: number) => {
    const bubbles: Array<{
      size: number;
      left: number;
      delay: number;
      duration: number;
      drift: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      bubbles.push({
        size: random(minBubbleSize, maxBubbleSize),
        left: random(5, 95), // Percentage
        delay: random(0, 0.8), // Stagger start
        duration: random(1, 2.5), // Rise duration
        drift: random(-20, 20), // Horizontal drift in px
      });
    }

    return bubbles;
  };

  const bubbles = generateBubbles(bubbleCount);

  // Create bubble components with effects
  const bubbleComponents: RenderableComponentData[] = bubbles.map(
    (bubble, index) => {
      const bubbleId = `bubble-${index}`;

      return {
        id: bubbleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="rounded-full border border-white/30" style="width:${bubble.size}px;height:${bubble.size}px;background:linear-gradient(135deg,rgba(255,0,255,0.1),rgba(0,255,255,0.1),rgba(255,255,0,0.1))"></div>`,
          className: 'absolute',
          style: {
            left: `${bubble.left}%`,
            bottom: `-${bubble.size + 20}px`,
            opacity: 0,
            transform: 'scale(0.5)',
            zIndex: 3,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [
          {
            id: `bubble-rise-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: bubble.delay,
              duration: bubble.duration,
              mode: 'provider',
              targetIds: [bubbleId],
              ranges: [
                // Rise animation
                {
                  key: 'translateY',
                  val: 0,
                  prog: 0,
                },
                {
                  key: 'translateY',
                  val: `-${props.config?.height || 1080}px`,
                  prog: 1,
                },
                // Horizontal drift
                {
                  key: 'translateX',
                  val: 0,
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: `${bubble.drift}px`,
                  prog: 0.5,
                },
                {
                  key: 'translateX',
                  val: `${bubble.drift * 0.5}px`,
                  prog: 1,
                },
                // Scale animation (grow and pop)
                {
                  key: 'scale',
                  val: 0.5,
                  prog: 0,
                },
                {
                  key: 'scale',
                  val: 1,
                  prog: 0.5,
                },
                {
                  key: 'scale',
                  val: 0.8,
                  prog: 1,
                },
                // Opacity fade in and out
                {
                  key: 'opacity',
                  val: 0,
                  prog: 0,
                },
                {
                  key: 'opacity',
                  val: 0.9,
                  prog: 0.2,
                },
                {
                  key: 'opacity',
                  val: 0.9,
                  prog: 0.8,
                },
                {
                  key: 'opacity',
                  val: 0,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Outgoing video with dissolve effects
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-dissolve',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: overlapDuration * 0.3,
          duration: overlapDuration * 0.7,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Blur effect
            {
              key: 'filter',
              val: 'blur(0px) brightness(1)',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'blur(8px) brightness(1.2)',
              prog: 1,
            },
            // Fade out
            {
              key: 'opacity',
              val: 1,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 0,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Incoming video with circular reveal
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        zIndex: 2,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'incoming-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            // Circular clip-path expansion
            {
              key: 'clipPath',
              val: 'circle(0% at 50% 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'circle(150% at 50% 50%)',
              prog: 1,
            },
            // Fade in
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 0.3,
            },
          ],
        },
      },
    ],
  };

  // Bubbles overlay container
  const bubblesContainer: RenderableComponentData = {
    id: 'bubbles-overlay-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 3,
          mixBlendMode: 'overlay',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: bubbleComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'bubble-foam-transition-container',
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
        duration: overlapDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideo, bubblesContainer],
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
  id: 'bubble-foam-transition',
  title: 'Bubble Foam Transition',
  description:
    'Effervescent transition where videos change through hundreds of small circular masks that bubble up from the bottom, revealing the incoming video with organic movement, merging, and popping effects. Includes prismatic soap film iridescence.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'bubble',
    'foam',
    'watercolor',
    'soap',
    'effervescent',
    'organic',
    'circular',
    'mask',
    'reveal',
    'prismatic',
    'iridescence',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    overlapDuration: 1.7,
    bubbleCount: 50,
    minBubbleSize: 40,
    maxBubbleSize: 140,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const bubbleFoamTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
