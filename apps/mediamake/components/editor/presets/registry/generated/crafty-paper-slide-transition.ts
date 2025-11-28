/**
 * Crafty Paper Slide Transition Preset
 *
 * This preset creates a scrapbook-style transition where videos appear as paper cutouts
 * sliding across a textured paper background. Features diagonal slide motions with paper
 * curl effects on the trailing edge, decorative washi tape borders, paper grain texture,
 * and subtle shadowing for a handcrafted aesthetic.
 *
 * Features:
 * - Diagonal slide transitions with paper curl effect
 * - Decorative washi tape borders on incoming video
 * - Textured paper gradient background
 * - Subtle paper grain filters and drop shadows
 * - Smooth bouncy slide motion with cubic-bezier easing
 * - 1.6s overlap transition period
 *
 * Use cases:
 * - Creating scrapbook-style video presentations
 * - Building memory/photo album style transitions
 * - Adding crafty aesthetic to educational content
 * - Creating nostalgic/handmade video feels
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Calculate base layout duration (subtract overlap)
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Transition start time (when incoming video begins sliding in)
  const transitionStart = outgoingVideo.duration - transitionDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            filter: 'contrast(0.95) brightness(1.05) drop-shadow(4px 4px 8px rgba(0,0,0,0.3))',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      childrenData: [
        // Outgoing video
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            fit: 'cover',
            muted: true,
            className: 'w-full h-full',
            style: {
              clipPath: 'polygon(0 0, 100% 0, 95% 95%, 0 100%)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideo.duration,
            },
          },
          effects: [
            {
              id: 'outgoing-slide-out',
              componentId: 'generic',
              data: {
                type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                start: transitionStart,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'translateX', val: '0%', prog: 0 },
                  { key: 'translateX', val: '-120%', prog: 1 },
                  { key: 'translateY', val: '0%', prog: 0 },
                  { key: 'translateY', val: '-120%', prog: 1 },
                  { key: 'rotate', val: '0deg', prog: 0 },
                  { key: 'rotate', val: '-5deg', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        // Paper curl effect overlay
        {
          id: 'curl-effect',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: "<div style='position:absolute;bottom:0;right:0;width:100px;height:100px;background:linear-gradient(135deg,transparent 50%,rgba(0,0,0,0.1) 50%);pointer-events:none;'></div>",
            style: {
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: transitionStart,
              duration: transitionDuration,
            },
          },
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
          style: {
            filter: 'contrast(0.95) brightness(1.05) drop-shadow(4px 4px 8px rgba(0,0,0,0.3))',
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      childrenData: [
        // Incoming video
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            fit: 'cover',
            muted: true,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
          effects: [
            {
              id: 'incoming-slide-in',
              componentId: 'generic',
              data: {
                type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'translateX', val: '120%', prog: 0 },
                  { key: 'translateX', val: '0%', prog: 1 },
                  { key: 'translateY', val: '120%', prog: 0 },
                  { key: 'translateY', val: '0%', prog: 1 },
                  { key: 'rotate', val: '3deg', prog: 0 },
                  { key: 'rotate', val: '0deg', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        // Washi tape border - top
        {
          id: 'washi-tape-top',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: "<div style='position:absolute;top:0;left:0;width:100%;height:20px;background:repeating-linear-gradient(90deg,#f59e0b 0px,#f59e0b 10px,#fbbf24 10px,#fbbf24 20px);opacity:0.7;pointer-events:none;'></div>",
            style: {
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
        // Washi tape border - left
        {
          id: 'washi-tape-left',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: "<div style='position:absolute;top:0;left:0;width:20px;height:100%;background:repeating-linear-gradient(0deg,#f59e0b 0px,#f59e0b 10px,#fbbf24 10px,#fbbf24 20px);opacity:0.7;pointer-events:none;'></div>",
            style: {
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'crafty-paper-slide-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-gradient-to-br from-amber-50 to-orange-50',
        style: {
          width: '100%',
          height: '100%',
          overflow: 'hidden',
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
  id: 'crafty-paper-slide-transition',
  title: 'Crafty Paper Slide Transition',
  description:
    'A scrapbook-style transition where videos appear as paper cutouts sliding across a textured background. Features diagonal slide motions with paper curl effects, decorative washi tape borders, paper grain texture, and subtle shadowing for a handcrafted aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'paper', 'scrapbook', 'crafty', 'slide', 'diagonal'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
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

export const craftyPaperSlideTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
