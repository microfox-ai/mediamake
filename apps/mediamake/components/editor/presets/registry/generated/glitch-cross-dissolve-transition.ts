/**
 * Glitch Cross-Dissolve Transition
 *
 * A smooth cross-dissolve transition with digital glitch effects including RGB channel splitting,
 * opacity flickering, and animated scan lines. Creates an authentic digital interference aesthetic
 * during media switching with a 0.6-second overlap period.
 *
 * Features:
 * - Smooth cross-dissolve with 0.6s overlap
 * - RGB channel split effect at midpoint
 * - Rapid opacity flickering for digital glitch aesthetic
 * - Animated horizontal scan lines moving vertically
 * - Supports both image and video media types
 *
 * Use cases:
 * - Digital/tech content transitions
 * - Cyberpunk or futuristic video aesthetics
 * - Music video transitions
 * - Gaming content transitions
 * - Social media content with edgy style
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
  media1: z.object({
    src: z.string().describe('Source URL of outgoing media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(0.6)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration } = params;

  // Calculate BaseLayout duration (total - overlap)
  const baseLayoutDuration =
    media1.duration + media2.duration - overlapDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Build composition structure
  const childrenData: RenderableComponentData[] = [
    // Outgoing media container
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
          duration: media1.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-media',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
          effects: [
            // Opacity flicker effect during overlap
            {
              id: 'outgoing-opacity-flicker',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: media1.duration - overlapDuration,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['outgoing-media'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.25 },
                  { key: 'opacity', val: 0.8, prog: 0.4 },
                  { key: 'opacity', val: 0, prog: 0.6 },
                  { key: 'opacity', val: 0, prog: 0.85 },
                  { key: 'opacity', val: 0.9, prog: 0.95 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
            // RGB split effect at midpoint
            {
              id: 'outgoing-rgb-split',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: media1.duration - overlapDuration / 2 - 0.05,
                duration: 0.1,
                mode: 'provider',
                targetIds: ['outgoing-media'],
                ranges: [
                  {
                    key: 'filter',
                    val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'drop-shadow(-2px 0 0 red) drop-shadow(2px 0 0 cyan)',
                    prog: 0.5,
                  },
                  {
                    key: 'filter',
                    val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)',
                    prog: 1,
                  },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    // Incoming media container
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
          start: media1.duration - overlapDuration,
          duration: media2.duration + overlapDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-media',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: media2.duration + overlapDuration,
            },
          },
          effects: [
            // Opacity flicker-in effect during overlap
            {
              id: 'incoming-opacity-flicker',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['incoming-media'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.1, prog: 0.2 },
                  { key: 'opacity', val: 0, prog: 0.35 },
                  { key: 'opacity', val: 0.2, prog: 0.55 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    // Scan lines overlay container
    {
      id: 'scanlines-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: media1.duration - overlapDuration,
          duration: overlapDuration,
        },
      },
      childrenData: [
        {
          id: 'scanlines-overlay',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: "<div style='width: 100%; height: 100%; background: repeating-linear-gradient(0deg, transparent 0px, rgba(255, 255, 255, 0.03) 1px, transparent 2px, transparent 4px);'></div>",
            style: {
              width: '100%',
              height: '100%',
              opacity: 0.1,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration,
            },
          },
          effects: [
            // Vertical movement animation
            {
              id: 'scanlines-animation',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['scanlines-overlay'],
                ranges: [
                  { key: 'translateY', val: '-100%', prog: 0 },
                  { key: 'translateY', val: '100%', prog: 1 },
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
    id: 'glitch-transition-root',
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
  id: 'glitch-cross-dissolve-transition',
  title: 'Glitch Cross-Dissolve Transition',
  description:
    'A smooth cross-dissolve transition with digital glitch effects including RGB channel splitting, opacity flickering, and animated scan lines. Creates an authentic digital interference aesthetic during media switching with a 0.6-second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'crossfade',
    'rgb-split',
    'digital',
    'tech',
    'scanlines',
    'interference',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 3,
    },
    overlapDuration: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const glitchCrossDissolveTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
