/**
 * Underwater Bubble Displacement Transition Preset
 *
 * Creates an aquatic-themed video transition featuring rising bubble overlays with undulating wave distortions.
 * Videos fade and blur through a bubble-filled underwater environment with sinusoidal movement patterns 
 * and circular mask animations at varied speeds.
 *
 * Features:
 * - Outgoing video with wave distortion (translateY sine wave) and progressive blur
 * - 5-7 rising bubble overlays with staggered speeds and screen blend mode
 * - Incoming video emerging through bubbles with complementary wave distortion
 * - Custom timing functions for organic underwater movement
 * - 2.5-second transition overlap with smooth opacity transitions
 *
 * Use cases:
 * - Aquatic-themed video transitions
 * - Water/ocean content transitions
 * - Smooth, organic video crossfades
 * - Creating underwater ambiance in video compositions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).describe('Media type of outgoing content'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).describe('Media type of incoming content'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z.number().default(2.5).describe('Duration of transition overlap in seconds'),
  bubbleCount: z.number().min(5).max(7).default(7).describe('Number of bubble overlays (5-7)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, bubbleCount } = params;

  // Calculate base layout duration (sum of durations minus overlap)
  const baseLayoutDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Determine component IDs based on media type
  const outgoingComponentId = outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Helper: Generate bubble overlays with varied properties
  const generateBubbles = (count: number): RenderableComponentData[] => {
    const bubbles: RenderableComponentData[] = [];
    const sizes = [80, 60, 100, 70, 50, 90, 65]; // Bubble sizes in px
    const positions = [15, 35, 55, 75, 25, 45, 85]; // Left positions in %
    const speeds = [1.8, 2.2, 2.0, 2.5, 2.8, 2.3, 2.6]; // Animation durations in seconds

    for (let i = 0; i < count; i++) {
      const size = sizes[i % sizes.length];
      const leftPos = positions[i % positions.length];
      const speed = speeds[i % speeds.length];

      bubbles.push({
        id: `bubble-${i + 1}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(173, 216, 230, 0.4)); box-shadow: inset -${Math.floor(size / 8)}px -${Math.floor(size / 8)}px ${Math.floor(size / 4)}px rgba(0, 0, 0, 0.1);"></div>`,
          className: 'absolute',
          style: {
            left: `${leftPos}%`,
            bottom: '0',
            opacity: 0.6,
            mixBlendMode: 'screen' as const,
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
            id: `bubble-rise-${i + 1}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: speed,
              mode: 'provider',
              targetIds: [`bubble-${i + 1}`],
              ranges: [
                { key: 'translateY', val: '0px', prog: 0 },
                { key: 'translateY', val: '-100px', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return bubbles;
  };

  // Create child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-container',
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
          duration: outgoingVideo.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingVideo.src,
            className: 'absolute inset-0 w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideo.duration,
            },
          },
          effects: [
            // Wave distortion (sine wave translateY)
            {
              id: 'outgoing-wave-distortion',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: outgoingVideo.duration - transitionDuration,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'translateY', val: '0px', prog: 0 },
                  { key: 'translateY', val: '-10px', prog: 0.25 },
                  { key: 'translateY', val: '0px', prog: 0.5 },
                  { key: 'translateY', val: '10px', prog: 0.75 },
                  { key: 'translateY', val: '0px', prog: 1 },
                ],
              },
            },
            // Progressive blur
            {
              id: 'outgoing-blur',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: outgoingVideo.duration - transitionDuration,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'filter', val: 'blur(0px)', prog: 0 },
                  { key: 'filter', val: 'blur(6px)', prog: 1 },
                ],
              },
            },
            // Opacity fade
            {
              id: 'outgoing-fade',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: outgoingVideo.duration - transitionDuration,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0.3, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Bubble layer
    {
      id: 'bubble-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      childrenData: generateBubbles(bubbleCount),
    } as RenderableComponentData,

    // Incoming video container
    {
      id: 'incoming-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: incomingComponentId,
          data: {
            src: incomingVideo.src,
            className: 'absolute inset-0 w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
          effects: [
            // Wave distortion (complementary sine wave)
            {
              id: 'incoming-wave-distortion',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'translateY', val: '20px', prog: 0 },
                  { key: 'translateY', val: '10px', prog: 0.25 },
                  { key: 'translateY', val: '0px', prog: 0.5 },
                  { key: 'translateY', val: '-5px', prog: 0.75 },
                  { key: 'translateY', val: '0px', prog: 1 },
                ],
              },
            },
            // Blur fade-in
            {
              id: 'incoming-blur',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'filter', val: 'blur(8px)', prog: 0 },
                  { key: 'filter', val: 'blur(0px)', prog: 1 },
                ],
              },
            },
            // Opacity fade-in
            {
              id: 'incoming-fade',
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
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'underwater-bubble-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-blue-950/20',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'underwater-bubble-transition',
  title: 'Underwater Bubble Displacement Transition',
  description: 'An aquatic-themed video transition featuring rising bubble overlays with undulating wave distortions. Videos fade and blur through a bubble-filled underwater environment with sinusoidal movement patterns and circular mask animations at varied speeds.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'underwater', 'bubble', 'aquatic', 'wave', 'distortion', 'organic'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 2.5,
    bubbleCount: 7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const underwaterBubbleTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
