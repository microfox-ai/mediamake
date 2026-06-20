/**
 * Carousel Slide with Depth Transition Preset
 *
 * This preset creates a 3D carousel transition that slides images horizontally with perspective tilt.
 * The outgoing image slides left while gaining perspective tilt (rotateY 0 to 25deg) and reducing
 * opacity/scale, while the incoming image enters from right with opposite tilt (rotateY -25deg to 0deg).
 * Includes parallax depth with a subtle background blur layer that shifts in the opposite direction at 30% speed,
 * and reflection effects at the bottom using gradient mask.
 *
 * Features:
 * - **3D Perspective**: 1500px perspective container with preserve-3d transform style
 * - **Carousel Movement**: Horizontal slide with rotateY tilt for depth effect
 * - **Parallax Background**: Blurred background layer moving at 30% speed
 * - **Reflection Effects**: Bottom reflections with scaleY(-1) and gradient mask
 * - **Smooth Overlap**: 650ms overlap with custom cubic-bezier for natural carousel momentum
 * - **Z-Index Layering**: Incoming (z-20), outgoing (z-10), reflections (z-5)
 *
 * Use cases:
 * - Creating 3D carousel image transitions
 * - Building immersive depth-based slideshows
 * - Adding cinematic perspective effects
 * - Creating realistic carousel momentum
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing image/video'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming image/video'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(0.65)
    .describe('Duration of transition overlap in seconds (default: 650ms)'),
  backgroundBlurAmount: z
    .number()
    .default(20)
    .describe('Background blur amount in pixels'),
  reflectionOpacity: z
    .number()
    .default(0.3)
    .describe('Opacity of reflection effect (0-1)'),
  reflectionHeight: z
    .number()
    .default(0.33)
    .describe('Height of reflection as fraction of image height (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    overlapDuration,
    backgroundBlurAmount,
    reflectionOpacity,
    reflectionHeight,
  } = params;

  // Calculate BaseLayout duration: sum of media durations minus overlap
  const baseLayoutDuration = media1.duration + media2.duration - overlapDuration;

  // Custom cubic-bezier for natural carousel momentum
  const easingType = 'ease-in-out';
  
  // Determine component IDs based on media type
  const getComponentId = (type: 'image' | 'video') =>
    type === 'video' ? 'VideoAtom' : 'ImageAtom';

  const media1ComponentId = getComponentId(media1.type);
  const media2ComponentId = getComponentId(media2.type);

  // Calculate transition timing (outgoing: 0.5rel to 1rel of overlap duration)
  const outgoingTransitionStart = media1.duration - overlapDuration;
  const outgoingTransitionEnd = media1.duration;
  const outgoingTransitionDuration = overlapDuration;

  // Incoming: 0rel to 0.5rel of overlap duration
  const incomingTransitionDuration = overlapDuration;

  // Background parallax: moves at 30% speed throughout entire duration
  const backgroundParallaxDistance = 30; // 30% of main movement

  const childrenData: RenderableComponentData[] = [
    // Background blur layer (z-index: 0)
    {
      id: 'background-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 0,
            filter: `blur(${backgroundBlurAmount}px)`,
            opacity: 0.6,
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
      childrenData: [
        {
          id: 'background-image',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: baseLayoutDuration,
            },
          },
          effects: [
            {
              id: 'background-parallax',
              componentId: 'generic',
              data: {
                type: easingType,
                start: outgoingTransitionStart,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['background-image'],
                ranges: [
                  { key: 'translateX', val: '0%', prog: 0 },
                  { key: 'translateX', val: `${backgroundParallaxDistance}%`, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Outgoing container (z-index: 10)
    {
      id: 'outgoing-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 10,
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      childrenData: [
        // Outgoing main image
        {
          id: 'outgoing-main-image',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
          effects: [
            {
              id: 'outgoing-transition',
              componentId: 'generic',
              data: {
                type: easingType,
                start: outgoingTransitionStart,
                duration: outgoingTransitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-main-image'],
                ranges: [
                  { key: 'translateX', val: '0%', prog: 0 },
                  { key: 'translateX', val: '-100%', prog: 1 },
                  { key: 'rotateY', val: 0, prog: 0 },
                  { key: 'rotateY', val: 25, prog: 1 },
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 0.9, prog: 1 },
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Outgoing reflection
        {
          id: 'outgoing-reflection',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            className: 'absolute w-full object-cover',
            style: {
              bottom: 0,
              height: `${reflectionHeight * 100}%`,
              transform: 'scaleY(-1)',
              opacity: reflectionOpacity,
              zIndex: 5,
              maskImage: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
          effects: [
            {
              id: 'outgoing-reflection-transition',
              componentId: 'generic',
              data: {
                type: easingType,
                start: outgoingTransitionStart,
                duration: outgoingTransitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-reflection'],
                ranges: [
                  { key: 'translateX', val: '0%', prog: 0 },
                  { key: 'translateX', val: '-100%', prog: 1 },
                  { key: 'rotateY', val: 0, prog: 0 },
                  { key: 'rotateY', val: 25, prog: 1 },
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 0.9, prog: 1 },
                  { key: 'opacity', val: reflectionOpacity, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming container (z-index: 20)
    {
      id: 'incoming-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 20,
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: media1.duration - overlapDuration,
          duration: media2.duration + overlapDuration,
        },
      },
      childrenData: [
        // Incoming main image
        {
          id: 'incoming-main-image',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: media2.duration + overlapDuration,
            },
          },
          effects: [
            {
              id: 'incoming-transition',
              componentId: 'generic',
              data: {
                type: easingType,
                start: 0,
                duration: incomingTransitionDuration,
                mode: 'provider',
                targetIds: ['incoming-main-image'],
                ranges: [
                  { key: 'translateX', val: '100%', prog: 0 },
                  { key: 'translateX', val: '0%', prog: 1 },
                  { key: 'rotateY', val: -25, prog: 0 },
                  { key: 'rotateY', val: 0, prog: 1 },
                  { key: 'scale', val: 0.9, prog: 0 },
                  { key: 'scale', val: 1, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Incoming reflection
        {
          id: 'incoming-reflection',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            className: 'absolute w-full object-cover',
            style: {
              bottom: 0,
              height: `${reflectionHeight * 100}%`,
              transform: 'scaleY(-1)',
              opacity: reflectionOpacity,
              zIndex: 5,
              maskImage: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: media2.duration + overlapDuration,
            },
          },
          effects: [
            {
              id: 'incoming-reflection-transition',
              componentId: 'generic',
              data: {
                type: easingType,
                start: 0,
                duration: incomingTransitionDuration,
                mode: 'provider',
                targetIds: ['incoming-reflection'],
                ranges: [
                  { key: 'translateX', val: '100%', prog: 0 },
                  { key: 'translateX', val: '0%', prog: 1 },
                  { key: 'rotateY', val: -25, prog: 0 },
                  { key: 'rotateY', val: 0, prog: 1 },
                  { key: 'scale', val: 0.9, prog: 0 },
                  { key: 'scale', val: 1, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: reflectionOpacity, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'carousel-slide-depth-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1500px',
          transformStyle: 'preserve-3d',
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
  id: 'carousel-slide-depth',
  title: 'Carousel Slide with Depth',
  description:
    '3D carousel transition that slides images horizontally with perspective tilt (rotateY), parallax depth background blur layer, reflection effects with gradient mask, and smooth 650ms overlap using custom cubic-bezier easing for natural carousel momentum.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'carousel', '3d', 'perspective', 'parallax', 'reflection', 'depth'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    overlapDuration: 0.65,
    backgroundBlurAmount: 20,
    reflectionOpacity: 0.3,
    reflectionHeight: 0.33,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const carouselSlideDepthPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};