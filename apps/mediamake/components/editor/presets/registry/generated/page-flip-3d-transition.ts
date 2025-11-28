/**
 * 3D Page Flip Transition Preset
 *
 * Creates a cinematic book page-turning transition effect that simulates realistic
 * 3D page flipping with perspective transforms, dynamic shadows, and natural easing.
 * The outgoing content lifts and curves as it rotates around a vertical spine axis,
 * revealing the incoming content beneath.
 *
 * Features:
 * - Realistic 3D perspective transform with page curl effect
 * - Dynamic shadow system: cast shadows and self-shadowing on curved page
 * - Natural animation arc: slow start, acceleration, gentle deceleration
 * - Configurable flip direction (left-to-right or right-to-left)
 * - Optional subtle paper texture overlay during flip
 * - GPU-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Book-style photo albums and galleries
 * - Story-telling transitions with narrative flow
 * - Educational content with chapter transitions
 * - Magazine-style layouts
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
    .describe('Media item to transition from'),

  incomingMedia: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Media item to transition to'),

  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of page flip transition in seconds'),

  flipDirection: z
    .enum(['left-to-right', 'right-to-left'])
    .default('left-to-right')
    .describe('Direction of page flip'),

  paperTexture: z
    .object({
      enabled: z.boolean().default(false).describe('Enable paper texture overlay'),
      src: z.string().optional().describe('Paper texture image URL'),
      opacity: z.number().min(0).max(1).default(0.15).describe('Texture opacity'),
    })
    .default({ enabled: false, opacity: 0.15 })
    .describe('Optional paper texture overlay configuration'),

  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of shadow effects (0 = none, 1 = maximum)'),
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
    flipDirection,
    paperTexture,
    shadowIntensity,
  } = params;

  // Calculate timing
  const baseLayoutDuration =
    outgoingMedia.duration + incomingMedia.duration - transitionDuration;

  const outgoingStart = 0;
  const outgoingDuration = outgoingMedia.duration;
  const incomingStart = outgoingMedia.duration - transitionDuration;
  const incomingDuration = incomingMedia.duration + transitionDuration;

  // Determine transform origin based on flip direction
  const transformOrigin =
    flipDirection === 'left-to-right' ? 'left center' : 'right center';
  const rotateDirection = flipDirection === 'left-to-right' ? -180 : 180;

  // Determine component IDs
  const outgoingComponentId =
    outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Create outgoing page effects
  const outgoingPageEffects = [
    // Main flip rotation
    {
      id: 'outgoing-page-flip',
      componentId: 'generic' as const,
      data: {
        type: 'cubic-bezier' as const,
        start: outgoingDuration - transitionDuration,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-page-container'],
        ranges: [
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: rotateDirection * 0.15, prog: 0.25 },
          { key: 'rotateY', val: rotateDirection * 0.9, prog: 0.5 },
          { key: 'rotateY', val: rotateDirection, prog: 1 },
        ],
      },
    },
    // Self-shadow on curved portion
    {
      id: 'outgoing-self-shadow',
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: outgoingDuration - transitionDuration,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-shadow-overlay'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: shadowIntensity * 0.8, prog: 0.3 },
          { key: 'opacity', val: shadowIntensity * 0.5, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
  ];

  // Create incoming page effects
  const incomingPageEffects = [
    // Initial state (behind outgoing page)
    {
      id: 'incoming-page-initial',
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: 0,
        duration: 0.01,
        mode: 'provider' as const,
        targetIds: ['incoming-page-container'],
        ranges: [
          { key: 'rotateY', val: 180, prog: 0 },
          { key: 'rotateY', val: 180, prog: 1 },
        ],
      },
    },
    // Reveal as outgoing page flips
    {
      id: 'incoming-page-reveal',
      componentId: 'generic' as const,
      data: {
        type: 'cubic-bezier' as const,
        start: 0,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-page-container'],
        ranges: [
          { key: 'rotateY', val: 180, prog: 0 },
          { key: 'rotateY', val: 0, prog: 1 },
        ],
      },
    },
    // Shadow fades out as page settles
    {
      id: 'incoming-shadow-fade',
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration: transitionDuration * 0.6,
        mode: 'provider' as const,
        targetIds: ['incoming-shadow-overlay'],
        ranges: [
          { key: 'opacity', val: shadowIntensity * 0.6, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
  ];

  // Create surface shadow effects
  const surfaceShadowEffects = [
    {
      id: 'surface-shadow-animation',
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: incomingStart,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: ['surface-shadow-layer'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: shadowIntensity * 0.4, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
  ];

  // Create paper texture effects (if enabled)
  const paperTextureEffects = paperTexture.enabled
    ? [
        {
          id: 'paper-texture-animation',
          componentId: 'generic' as const,
          data: {
            type: 'ease-in-out' as const,
            start: incomingStart,
            duration: transitionDuration,
            mode: 'provider' as const,
            targetIds: ['paper-texture-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: paperTexture.opacity, prog: 0.3 },
              { key: 'opacity', val: paperTexture.opacity * 0.5, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ]
    : [];

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing page
    {
      id: 'outgoing-page-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            transformOrigin: transformOrigin,
            backfaceVisibility: 'hidden',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: outgoingDuration,
        },
      },
      effects: outgoingPageEffects,
      childrenData: [
        // Outgoing media content
        {
          id: 'outgoing-media',
          type: 'atom' as const,
          componentId: outgoingComponentId,
          data: {
            src: outgoingMedia.src,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingDuration,
            },
          },
        },
        // Self-shadow gradient on outgoing page
        {
          id: 'outgoing-shadow-overlay',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                background:
                  flipDirection === 'left-to-right'
                    ? 'linear-gradient(to right, rgba(0,0,0,0.3) 0%, transparent 30%)'
                    : 'linear-gradient(to left, rgba(0,0,0,0.3) 0%, transparent 30%)',
                opacity: 0,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingDuration,
            },
          },
          childrenData: [],
        },
      ] as RenderableComponentData[],
    },
    // Incoming page
    {
      id: 'incoming-page-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            transformOrigin: transformOrigin,
            backfaceVisibility: 'hidden',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      effects: incomingPageEffects,
      childrenData: [
        // Incoming media content
        {
          id: 'incoming-media',
          type: 'atom' as const,
          componentId: incomingComponentId,
          data: {
            src: incomingMedia.src,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingDuration,
            },
          },
        },
        // Shadow gradient on incoming page
        {
          id: 'incoming-shadow-overlay',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                background:
                  flipDirection === 'left-to-right'
                    ? 'linear-gradient(to left, rgba(0,0,0,0.4) 0%, transparent 40%)'
                    : 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 40%)',
                opacity: 0,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingDuration,
            },
          },
          childrenData: [],
        },
      ] as RenderableComponentData[],
    },
    // Surface shadow (cast by turning page)
    {
      id: 'surface-shadow-layer',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)',
            opacity: 0,
            transform: 'translateY(10px)',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: transitionDuration,
        },
      },
      effects: surfaceShadowEffects,
      childrenData: [],
    },
    // Paper texture overlay (optional)
    ...(paperTexture.enabled && paperTexture.src
      ? [
          {
            id: 'paper-texture-overlay',
            type: 'atom' as const,
            componentId: 'ImageAtom',
            data: {
              src: paperTexture.src,
              className: 'absolute inset-0 w-full h-full pointer-events-none',
              style: {
                opacity: 0,
                mixBlendMode: 'multiply',
              },
            },
            context: {
              timing: {
                start: incomingStart,
                duration: transitionDuration,
              },
            },
            effects: paperTextureEffects,
          } as RenderableComponentData,
        ]
      : []),
  ];

  const rootContainer: RenderableComponentData = {
    id: 'page-flip-3d-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
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
  id: 'page-flip-3d-transition',
  title: '3D Page Flip Transition',
  description:
    'A cinematic book page-turn transition effect that simulates realistic 3D page flipping with perspective transforms, dynamic shadows, and natural easing. The outgoing content lifts and curves as it rotates around a vertical spine axis, revealing the incoming content beneath. Features self-shadowing on the turning page, cast shadows on the surface, and smooth acceleration/deceleration following a natural arc motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    '3d',
    'page-flip',
    'book',
    'cinematic',
    'perspective',
    'shadows',
  ],
  defaultInputParams: {
    outgoingMedia: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    incomingMedia: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    transitionDuration: 1.5,
    flipDirection: 'left-to-right',
    paperTexture: {
      enabled: false,
      opacity: 0.15,
    },
    shadowIntensity: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pageFlip3dTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
