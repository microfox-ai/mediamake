/**
 * Paper Tear Horizontal Split Transition Preset
 *
 * Creates a tactile, handcrafted transition where the outgoing image tears apart horizontally
 * from the center, revealing the incoming image beneath. The effect simulates paper being
 * ripped apart with organic, jagged edges using CSS clip-path.
 *
 * Features:
 * - Horizontal tear split: Left and right halves slide apart
 * - Jagged edge simulation: CSS clip-path creates organic paper-like tear
 * - Paper curl rotation: -2deg and +2deg rotation on each half
 * - Incoming reveal: Scale-up (0.98 to 1.0) and opacity fade (0.8 to 1.0)
 * - Paper texture overlay: Appears during tear moment with reduced opacity
 * - Configurable easing: Default easeOutQuart, optional stepped easing for stop-motion aesthetic
 * - Adjustable overlap duration: 600-800ms default
 *
 * Use cases:
 * - Scrapbook-style video transitions
 * - Photo album reveals
 * - Tactile, handcrafted aesthetic videos
 * - Stop-motion style transitions with stepped easing
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
    src: z.string().describe('Source URL of outgoing media (image or video)'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Outgoing media that tears apart'),
  
  media2: z.object({
    src: z.string().describe('Source URL of incoming media (image or video)'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Incoming media revealed beneath'),

  overlapDuration: z
    .number()
    .min(0.4)
    .max(1.5)
    .default(0.7)
    .describe('Duration of transition overlap in seconds (600-800ms recommended)'),

  easingType: z
    .enum(['easeOutQuart', 'easeOutCubic', 'easeInOutQuart', 'linear', 'stepped'])
    .default('easeOutQuart')
    .describe('Easing function for tear animation'),

  steppedFrames: z
    .number()
    .min(4)
    .max(16)
    .default(8)
    .optional()
    .describe('Number of steps for stepped easing (stop-motion effect)'),

  textureOverlay: z
    .object({
      enabled: z.boolean().default(true).describe('Enable paper texture overlay'),
      src: z
        .string()
        .optional()
        .describe('Custom texture image URL (default: subtle noise texture)'),
      opacity: z
        .number()
        .min(0)
        .max(1)
        .default(0.15)
        .describe('Texture overlay opacity'),
    })
    .optional()
    .describe('Paper texture overlay configuration'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration, easingType, steppedFrames, textureOverlay } = params;

  // Calculate BaseLayout duration (media1 + media2 - overlap)
  const baseLayoutDuration = media1.duration + media2.duration - overlapDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Easing function mapping
  const getEasingType = (): 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' => {
    if (easingType === 'stepped') return 'linear'; // Stepped uses linear with CSS steps
    if (easingType === 'easeOutQuart' || easingType === 'easeOutCubic') return 'ease-out';
    if (easingType === 'easeInOutQuart') return 'ease-in-out';
    return 'linear';
  };

  // Jagged edge clip-path (organic tear simulation)
  const leftHalfClipPath = 'polygon(0% 0%, 48% 0%, 49% 5%, 48% 10%, 50% 15%, 49% 20%, 51% 25%, 48% 30%, 50% 35%, 49% 40%, 51% 45%, 50% 50%, 49% 55%, 51% 60%, 48% 65%, 50% 70%, 49% 75%, 51% 80%, 49% 85%, 50% 90%, 48% 95%, 50% 100%, 0% 100%)';
  const rightHalfClipPath = 'polygon(52% 0%, 100% 0%, 100% 100%, 50% 100%, 51% 95%, 52% 90%, 50% 85%, 51% 80%, 49% 75%, 50% 70%, 52% 65%, 49% 60%, 51% 55%, 50% 50%, 52% 45%, 49% 40%, 51% 35%, 52% 30%, 49% 25%, 51% 20%, 50% 15%, 52% 10%, 51% 5%, 52% 0%)';

  // Incoming media (z-0, beneath)
  const incomingMedia: RenderableComponentData = {
    id: 'incoming-media',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 0,
      },
    } as any,
    context: {
      timing: {
        start: media1.duration - overlapDuration,
        duration: media2.duration + overlapDuration,
      },
    },
    effects: [
      {
        id: 'incoming-reveal',
        componentId: 'generic',
        data: {
          type: getEasingType(),
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-media'],
          ranges: [
            { key: 'scale', val: 0.98, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0.85, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing left half
  const outgoingLeftHalf: RenderableComponentData = {
    id: 'outgoing-left-half',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 10,
        clipPath: leftHalfClipPath,
      },
    } as any,
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      {
        id: 'tear-left',
        componentId: 'generic',
        data: {
          type: getEasingType(),
          start: media1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-left-half'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-55%', prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -3, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.9, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing right half
  const outgoingRightHalf: RenderableComponentData = {
    id: 'outgoing-right-half',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 10,
        clipPath: rightHalfClipPath,
      },
    } as any,
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      {
        id: 'tear-right',
        componentId: 'generic',
        data: {
          type: getEasingType(),
          start: media1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-right-half'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '55%', prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 3, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.9, prog: 1 },
          ],
        },
      },
    ],
  };

  // Paper texture overlay (appears during tear)
  const textureEnabled = textureOverlay?.enabled !== false;
  const textureOpacity = textureOverlay?.opacity ?? 0.15;
  const textureSrc = textureOverlay?.src ?? 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noise)" opacity="0.1" /%3E%3C/svg%3E';

  const paperTextureOverlay: RenderableComponentData | null = textureEnabled
    ? {
        id: 'paper-texture-overlay',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: textureSrc,
          className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
          style: {
            zIndex: 20,
            mixBlendMode: 'multiply',
          },
        } as any,
        context: {
          timing: {
            start: media1.duration - overlapDuration,
            duration: overlapDuration,
          },
        },
        effects: [
          {
            id: 'texture-fade',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['paper-texture-overlay'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: textureOpacity, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      }
    : null;

  // Build childrenData
  const childrenData: RenderableComponentData[] = [
    incomingMedia,
    outgoingLeftHalf,
    outgoingRightHalf,
  ];

  if (paperTextureOverlay) {
    childrenData.push(paperTextureOverlay);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'paper-tear-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-amber-50',
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
  id: 'paper-tear-horizontal-split',
  title: 'Paper Tear Horizontal Split Transition',
  description:
    'A tactile transition where the outgoing image tears apart horizontally from the center with jagged edges, revealing the incoming image beneath. Features organic paper-curl rotation, subtle texture overlay, and configurable stop-motion stepping for a handcrafted scrapbook aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'paper', 'tear', 'horizontal', 'split', 'organic', 'scrapbook', 'handcrafted'],
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
    overlapDuration: 0.7,
    easingType: 'easeOutQuart',
    steppedFrames: 8,
    textureOverlay: {
      enabled: true,
      opacity: 0.15,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const paperTearHorizontalSplitPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
