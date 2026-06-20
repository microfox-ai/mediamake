/**
 * Page Turn Flip Transition Preset
 *
 * This preset implements a realistic page-turn transition that mimics flipping a page in a photo album.
 * The outgoing video appears to lift and rotate like a page turning, revealing the incoming video beneath.
 *
 * Features:
 * - **3D Page Turn Effect**: Outgoing video rotates on Y-axis with left-edge pivot point
 * - **Realistic Shadow**: Gradient shadow effect on the turning page for depth
 * - **3D Perspective**: Enhanced realism with perspective transformation
 * - **Smooth Animation**: Ease-in-out timing for natural page flip motion
 * - **Configurable Overlap**: Adjustable transition duration (default 0.6s)
 * - **Media Support**: Works with both videos and images
 *
 * Use cases:
 * - Photo album style transitions
 * - Book-like page turn effects
 * - Elegant video transitions
 * - Storytelling presentations
 * - Memory/nostalgia themed videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingMedia: z
    .object({
      src: z.string().describe('Source URL of outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media configuration'),
  incomingMedia: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of page turn transition overlap in seconds'),
  perspective: z
    .number()
    .default(1500)
    .describe('Perspective value for 3D effect (default 1500px)'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Intensity of shadow gradient (0-1, default 0.2)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingMedia,
    incomingMedia,
    transitionDuration,
    perspective,
    shadowIntensity,
  } = params;

  // Calculate BaseLayout duration (total duration minus overlap)
  const baseLayoutDuration =
    outgoingMedia.duration + incomingMedia.duration - transitionDuration;

  // Determine component IDs based on media type
  const outgoingComponentId =
    outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  const childrenData: RenderableComponentData[] = [
    // Incoming video layer (bottom layer, z-index: 0)
    {
      id: 'incoming-media-layer',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingMedia.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: outgoingMedia.duration - transitionDuration,
          duration: incomingMedia.duration + transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Outgoing page container with transform-origin left center
    {
      id: 'outgoing-page-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
            zIndex: 1,
            clipPath: 'inset(0)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingMedia.duration,
        },
      },
      effects: [
        // Page turn rotation effect
        {
          id: 'page-turn-rotation',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingMedia.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-page-container'],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: -180, prog: 1 },
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Outgoing video layer
        {
          id: 'outgoing-video-layer',
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingMedia.src,
            className: 'absolute inset-0 w-full h-full object-cover',
            fit: 'cover',
            style: {
              backfaceVisibility: 'hidden',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingMedia.duration,
            },
          },
        } as RenderableComponentData,

        // Page shadow overlay
        {
          id: 'page-shadow-overlay',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-black/${Math.round(shadowIntensity * 100)} to-transparent"></div>`,
            className: 'absolute inset-0',
            style: {
              zIndex: 2,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingMedia.duration,
            },
          },
          effects: [
            // Shadow fade in during page turn
            {
              id: 'shadow-fade-in',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: outgoingMedia.duration - transitionDuration,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['page-shadow-overlay'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.5 },
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
    id: 'page-turn-flip-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: 'center center',
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
  id: 'page-turn-flip-transition',
  title: 'Page Turn Flip Transition',
  description:
    'Photo album-style page-turn transition with 3D flip effect. The outgoing video lifts and rotates like a turning page with a left-edge pivot, while the incoming video reveals underneath. Features realistic shadow gradient, 3D perspective, and smooth ease-in-out motion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'page-turn', 'flip', '3d', 'photo-album'],
  defaultInputParams: {
    outgoingMedia: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingMedia: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 0.6,
    perspective: 1500,
    shadowIntensity: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pageTurnFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
