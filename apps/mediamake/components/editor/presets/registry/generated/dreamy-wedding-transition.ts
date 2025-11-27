/**
 * Dreamy Wedding Transition Preset
 *
 * A soft, ethereal dissolve transition effect designed for wedding videos. Creates a romantic
 * 'cloud wipe' effect where scenes melt into each other through overlapping opacity fades,
 * gaussian blur animations, and subtle scale breathing. Includes a warm amber color overlay
 * at the transition peak to enhance the romantic mood. Perfect for memory-like transitions
 * with graceful, non-jarring timing that matches emotional wedding video pacing.
 *
 * Features:
 * - Soft cross-fade with overlapping opacity animations
 * - Gaussian blur effect (0px → 8px → 0px) for dreamy transitions
 * - Subtle scale breathing (1.0 → 1.05 → 1.0) to add life
 * - Warm amber overlay at transition peak for romantic mood
 * - Slow, graceful timing (2.5s total duration)
 * - GPU-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Wedding video transitions between ceremony moments
 * - Romantic montage sequences
 * - Memory-style photo slideshows
 * - Elegant video storytelling
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
  scene1Src: z.string().describe('Source URL or path for the first scene (video or image)'),
  scene2Src: z.string().describe('Source URL or path for the second scene (video or image)'),
  transitionDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Total duration of the transition effect in seconds'),
  blurIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Peak blur intensity in pixels (default: 8px)'),
  scaleIntensity: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.05)
    .describe('Peak scale value for breathing effect (default: 1.05)'),
  overlayOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Peak opacity of the warm overlay (default: 0.3)'),
  overlayColor: z
    .string()
    .default('bg-amber-50')
    .describe('Tailwind color class for the warm overlay (default: bg-amber-50)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    scene1Src,
    scene2Src,
    transitionDuration,
    blurIntensity,
    scaleIntensity,
    overlayOpacity,
    overlayColor,
  } = params;

  // Helper function to determine component type from source
  const getComponentType = (src: string): 'VideoAtom' | 'ImageAtom' => {
    const videoExtensions = /\.(mp4|webm|mov|avi|mkv)$/i;
    return videoExtensions.test(src) ? 'VideoAtom' : 'ImageAtom';
  };

  const scene1ComponentId = getComponentType(scene1Src);
  const scene2ComponentId = getComponentType(scene2Src);

  // Calculate timing values
  const fadeOutDuration = 2.0; // Scene 1 fades out over 2 seconds
  const fadeInStart = 0.5; // Scene 2 starts fading in at 0.5s
  const fadeInDuration = 1.5; // Scene 2 fades in over 1.5 seconds (from 0.5s to 2s)

  // Build the component tree
  const childrenData: RenderableComponentData[] = [
    // Scene 1 wrapper - fades out with blur and scale
    {
      id: 'scene-1-wrapper',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            willChange: 'opacity, filter, transform',
            transform: 'translate3d(0, 0, 0)', // GPU acceleration
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
          id: 'scene-1-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: fadeOutDuration,
            mode: 'provider',
            targetIds: ['scene-1-wrapper'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: 'scene-1-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['scene-1-wrapper'],
            ranges: [
              { key: 'filter', val: `blur(0px)`, prog: 0 },
              { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0.5 },
              { key: 'filter', val: `blur(0px)`, prog: 1 },
            ],
          },
        },
        {
          id: 'scene-1-scale',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['scene-1-wrapper'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: scaleIntensity, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'scene-1-content',
          type: 'atom',
          componentId: scene1ComponentId,
          data: {
            src: scene1Src,
            className: 'w-full h-full object-cover',
            ...(scene1ComponentId === 'VideoAtom' && {
              fit: 'cover' as const,
            }),
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

    // Scene 2 wrapper - fades in with blur and scale
    {
      id: 'scene-2-wrapper',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            opacity: 0,
            willChange: 'opacity, filter, transform',
            transform: 'translate3d(0, 0, 0)', // GPU acceleration
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
          id: 'scene-2-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: fadeInStart,
            duration: fadeInDuration,
            mode: 'provider',
            targetIds: ['scene-2-wrapper'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'scene-2-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['scene-2-wrapper'],
            ranges: [
              { key: 'filter', val: `blur(0px)`, prog: 0 },
              { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0.5 },
              { key: 'filter', val: `blur(0px)`, prog: 1 },
            ],
          },
        },
        {
          id: 'scene-2-scale',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['scene-2-wrapper'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: scaleIntensity, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'scene-2-content',
          type: 'atom',
          componentId: scene2ComponentId,
          data: {
            src: scene2Src,
            className: 'w-full h-full object-cover',
            ...(scene2ComponentId === 'VideoAtom' && {
              fit: 'cover' as const,
            }),
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

    // Warm overlay - fades in and out at transition peak
    {
      id: 'warm-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 ${overlayColor} mix-blend-soft-light pointer-events-none`,
          style: {
            opacity: 0,
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
          id: 'warm-overlay-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['warm-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: overlayOpacity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'dreamy-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'dreamy-wedding-transition',
  title: 'Dreamy Wedding Transition',
  description:
    'A soft, ethereal dissolve transition effect designed for wedding videos. Creates a romantic cloud wipe effect where scenes melt into each other through overlapping opacity fades, gaussian blur animations, and subtle scale breathing. Includes a warm amber color overlay at the transition peak to enhance the romantic mood. Perfect for memory-like transitions with graceful, non-jarring timing that matches emotional wedding video pacing.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wedding', 'romantic', 'blur', 'fade', 'dreamy', 'elegant'],
  defaultInputParams: {
    scene1Src: 'https://example.com/wedding-ceremony.mp4',
    scene2Src: 'https://example.com/wedding-reception.mp4',
    transitionDuration: 2.5,
    blurIntensity: 8,
    scaleIntensity: 1.05,
    overlayOpacity: 0.3,
    overlayColor: 'bg-amber-50',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const dreamyWeddingTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
