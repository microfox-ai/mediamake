/**
 * Magazine Flip Transition Preset
 *
 * Creates a realistic magazine page-flip transition between two media items.
 * The outgoing media folds from right to left with a 3D rotation effect, while
 * the incoming media unfolds from left to right. Features realistic moving shadows
 * across the 'page' during the flip, and a subtle paper texture overlay.
 *
 * Technical Features:
 * - 3D perspective transform for realistic page-folding effect
 * - Configurable transition duration with overlap
 * - Moving shadow that sweeps across the page during transition
 * - Optional paper texture overlay during flip
 * - Custom cubic-bezier easing for natural page-turn motion
 * - Brightness adjustment during fold for depth effect
 *
 * Use cases:
 * - Magazine-style transitions for image galleries
 * - E-magazine or digital publication effects
 * - Photo album transitions with paper feel
 * - Professional presentation transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of first media (outgoing)'),
      type: z.enum(['image', 'video']).describe('Type of first media'),
      duration: z.number().describe('Duration of first media in seconds'),
    })
    .describe('First media item (outgoing/folding page)'),

  media2: z
    .object({
      src: z.string().describe('Source URL of second media (incoming)'),
      type: z.enum(['image', 'video']).describe('Type of second media'),
      duration: z.number().describe('Duration of second media in seconds'),
    })
    .describe('Second media item (incoming/unfolding page)'),

  transitionDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.9)
    .describe('Duration of the page flip transition in seconds'),

  showPaperTexture: z
    .boolean()
    .default(false)
    .optional()
    .describe('Show subtle paper texture overlay during transition'),

  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Intensity of moving shadow (0 = transparent, 1 = opaque)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;
  const shadowIntensity = params.shadowIntensity ?? 0.3;
  const showPaperTexture = params.showPaperTexture ?? false;

  // Calculate total duration: media1 + media2 - overlap
  const totalDuration = media1.duration + media2.duration - transitionDuration;

  // Determine component IDs for media atoms
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Timing calculations
  const outgoingStart = 0;
  const outgoingDuration = media1.duration;
  const incomingStart = media1.duration - transitionDuration;
  const incomingDuration = media2.duration + transitionDuration;
  const shadowStart = incomingStart;
  const shadowDuration = transitionDuration;

  // Effect start times (relative to component timing)
  const outgoingEffectStart = media1.duration - transitionDuration;
  const incomingEffectStart = 0; // Relative to incoming media start

  const childrenData: RenderableComponentData[] = [];

  // Outgoing media container with 3D fold effect
  childrenData.push({
    id: 'magazine-flip-outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'left center',
        },
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    childrenData: [
      {
        id: 'magazine-flip-outgoing-media',
        type: 'atom',
        componentId: media1ComponentId,
        data: {
          src: media1.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          // 3D rotation effect (fold from right to left)
          {
            id: 'outgoing-fold-transform',
            componentId: 'generic',
            data: {
              type: 'custom',
              start: outgoingEffectStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['magazine-flip-outgoing-media'],
              ranges: [
                { key: 'rotateY', val: '0deg', prog: 0 },
                { key: 'rotateY', val: '-180deg', prog: 1 },
              ],
              props: {
                customEasing: 'cubic-bezier(0.6, 0.04, 0.98, 0.34)',
              },
            },
          },
          // Brightness reduction during fold (for depth effect)
          {
            id: 'outgoing-brightness',
            componentId: 'generic',
            data: {
              type: 'custom',
              start: outgoingEffectStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['magazine-flip-outgoing-media'],
              ranges: [
                { key: 'brightness', val: 1, prog: 0 },
                { key: 'brightness', val: 0.7, prog: 0.5 },
                { key: 'brightness', val: 0.5, prog: 1 },
              ],
              props: {
                customEasing: 'cubic-bezier(0.6, 0.04, 0.98, 0.34)',
              },
            },
          },
        ],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);

  // Incoming media container with 3D unfold effect
  childrenData.push({
    id: 'magazine-flip-incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'right center',
        },
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    childrenData: [
      {
        id: 'magazine-flip-incoming-media',
        type: 'atom',
        componentId: media2ComponentId,
        data: {
          src: media2.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration,
          },
        },
        effects: [
          // 3D rotation effect (unfold from left to right)
          {
            id: 'incoming-unfold-transform',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: incomingEffectStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['magazine-flip-incoming-media'],
              ranges: [
                { key: 'rotateY', val: '180deg', prog: 0 },
                { key: 'rotateY', val: '0deg', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);

  // Moving shadow overlay during transition
  childrenData.push({
    id: 'magazine-flip-shadow-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    context: {
      timing: {
        start: shadowStart,
        duration: shadowDuration,
      },
    },
    childrenData: [
      {
        id: 'magazine-flip-shadow',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width:100%;height:100%;background:linear-gradient(to right, transparent, rgba(0,0,0,${shadowIntensity}), transparent);"></div>`,
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: shadowDuration,
          },
        },
        effects: [
          // Animate shadow from left to right
          {
            id: 'shadow-move',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: shadowDuration,
              mode: 'provider',
              targetIds: ['magazine-flip-shadow'],
              ranges: [
                { key: 'translateX', val: '-100%', prog: 0 },
                { key: 'translateX', val: '100%', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);

  // Optional paper texture overlay
  if (showPaperTexture) {
    childrenData.push({
      id: 'magazine-flip-paper-texture',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3CfeColorMatrix type=\'saturate\' values=\'0\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'repeat',
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: shadowStart,
          duration: shadowDuration,
        },
      },
      effects: [
        // Fade in/out paper texture during transition
        {
          id: 'paper-texture-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: shadowDuration,
            mode: 'provider',
            targetIds: ['magazine-flip-paper-texture'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const rootContainer: RenderableComponentData = {
    id: 'magazine-flip-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '2000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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
  id: 'magazine-flip-transition',
  title: 'Magazine Flip Transition',
  description:
    'A 3D page-flip transition that simulates turning pages in a magazine. Outgoing media folds from right to left with a rotateY transform, while incoming media unfolds from left to right. Features realistic moving shadows and optional paper texture overlay during the transition.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'magazine',
    'flip',
    'page-turn',
    '3d',
    'fold',
    'paper',
    'shadow',
  ],
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
    transitionDuration: 0.9,
    showPaperTexture: false,
    shadowIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const magazineFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
