/**
 * YouTube Thumbnail Zoom Focus Transition
 *
 * A high-impact transition optimized for YouTube video thumbnails featuring:
 * - Dramatic zoom effect: Outgoing image scales up (1.0→1.15) while fading out
 * - Simultaneous blur increase (0→4px) creating a "diving into" effect
 * - Incoming image starts scaled/blurred (1.2, 6px) then sharpens to focus (1.0, 0px)
 * - Continuous zoom-through-portal effect with 475ms overlap
 * - Punchy YouTube-style pacing for fast transitions
 * - Subtle vignette darkening at transition peak
 * - GPU-accelerated transforms for smooth performance
 *
 * Technical Details:
 * - BaseLayout duration: media1.duration + media2.duration - 475ms overlap
 * - Outgoing exit effects: 0.55rel to 1rel (last 45% of media1 duration)
 * - Incoming entrance effects: 0rel to 0.45rel (first 45% of media2 duration)
 * - Both use ease-out easing for smooth deceleration
 * - Vignette overlay animates 0→0.3→0 during overlap period
 *
 * Use Cases:
 * - YouTube video thumbnail transitions
 * - Fast-paced video edits
 * - Image reveal effects
 * - Portal-style scene transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  image1: z
    .object({
      src: z.string().describe('Source URL of first image'),
      duration: z
        .number()
        .min(1)
        .describe('Duration of first image in seconds'),
    })
    .describe('First image (outgoing)'),
  image2: z
    .object({
      src: z.string().describe('Source URL of second image'),
      duration: z
        .number()
        .min(1)
        .describe('Duration of second image in seconds'),
    })
    .describe('Second image (incoming)'),
  overlapDuration: z
    .number()
    .min(0.3)
    .max(1.0)
    .default(0.475)
    .describe('Transition overlap duration in seconds (450-500ms recommended)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, overlapDuration } = params;

  // Calculate timing
  const baseLayoutDuration = image1.duration + image2.duration - overlapDuration;

  // Outgoing image transition starts at 55% of its duration (last 45%)
  const outgoingTransitionStart = image1.duration * 0.55;
  const outgoingTransitionDuration = image1.duration * 0.45;

  // Incoming image starts before media1 ends (overlap)
  const incomingImageStart = image1.duration - overlapDuration;
  const incomingImageDuration = image2.duration + overlapDuration;

  // Incoming transition covers first 45% of its visible duration
  const incomingTransitionDuration = incomingImageDuration * 0.45;

  // Vignette timing (during overlap only)
  const vignetteStart = incomingImageStart;
  const vignetteDuration = overlapDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing image
    {
      id: 'youtube-thumbnail-zoom-outgoing',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          willChange: 'transform, opacity, filter',
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: image1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-zoom-fade-blur',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingTransitionStart,
            duration: outgoingTransitionDuration,
            mode: 'provider',
            targetIds: ['youtube-thumbnail-zoom-outgoing'],
            ranges: [
              // Scale up dramatically
              { key: 'scale', val: 1.0, prog: 0 },
              { key: 'scale', val: 1.15, prog: 1 },
              // Fade out
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              // Blur increase
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(4px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming image
    {
      id: 'youtube-thumbnail-zoom-incoming',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          willChange: 'transform, opacity, filter',
          zIndex: 2,
        },
      },
      context: {
        timing: {
          start: incomingImageStart,
          duration: incomingImageDuration,
        },
      },
      effects: [
        {
          id: 'incoming-zoom-fade-blur',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0, // Relative to incoming image start
            duration: incomingTransitionDuration,
            mode: 'provider',
            targetIds: ['youtube-thumbnail-zoom-incoming'],
            ranges: [
              // Scale down to normal
              { key: 'scale', val: 1.2, prog: 0 },
              { key: 'scale', val: 1.0, prog: 1 },
              // Fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              // Blur decrease (sharpen)
              { key: 'filter', val: 'blur(6px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Vignette overlay (darkens during transition peak)
    {
      id: 'youtube-thumbnail-zoom-vignette',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: radial-gradient(circle, transparent 40%, rgba(0, 0, 0, 0.7) 100%);"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 3,
        },
      },
      context: {
        timing: {
          start: vignetteStart,
          duration: vignetteDuration,
        },
      },
      effects: [
        {
          id: 'vignette-fade',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: vignetteDuration,
            mode: 'provider',
            targetIds: ['youtube-thumbnail-zoom-vignette'],
            ranges: [
              // Fade in to peak
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              // Fade out
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'youtube-thumbnail-zoom-focus-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
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
  id: 'youtube-thumbnail-zoom-focus',
  title: 'YouTube Thumbnail Zoom Focus Transition',
  description:
    'Cross-fade transition for YouTube thumbnails with dramatic zoom-through-portal effect. Outgoing image scales up (1.0→1.15) while fading out with blur (0→4px), creating a diving-into effect. Incoming image starts scaled/blurred (1.2, 6px) then sharpens to focus (1.0, 0px). 475ms overlap for punchy YouTube pacing with subtle vignette darkening at transition peak. Optimized for GPU acceleration.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'youtube',
    'thumbnail',
    'zoom',
    'focus',
    'blur',
    'fade',
    'image',
    'portal',
    'vignette',
  ],
  defaultInputParams: {
    image1: {
      src: 'https://example.com/thumbnail1.jpg',
      duration: 3,
    },
    image2: {
      src: 'https://example.com/thumbnail2.jpg',
      duration: 3,
    },
    overlapDuration: 0.475,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const youtubeThumbnailZoomFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
