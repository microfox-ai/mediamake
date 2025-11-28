/**
 * Super 8mm Film Flash Frame Transition
 *
 * Recreates the authentic bright white frames that appear in old home movie footage.
 * This transition simulates the overexposure flash that occurs when film frames are
 * overexposed or damaged, creating a nostalgic Super 8mm aesthetic.
 *
 * Features:
 * - **White Flash Peak**: Brief 0.4s overlap with white flash peaking at 0.2s
 * - **Film Gate Shadows**: Dark edge vignetting with inset box-shadow
 * - **Floating Dust Particles**: Small particles with random positions and opacity
 * - **Lens Bloom Effects**: Radial gradient overlay scaled during flash
 * - **Film Grain**: Increased grain and slight color shift on outgoing media
 * - **Authentic Timing**: Quick flash mimics real film overexposure behavior
 *
 * Use cases:
 * - Creating vintage home movie transitions
 * - Adding authentic film aesthetic to modern footage
 * - Simulating damaged or aged film effects
 * - Building retro video montages
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
      src: z.string().describe('Source URL of outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .default(0.4)
    .describe('Duration of flash transition overlap in seconds (default: 0.4s)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate BaseLayout duration (sum minus overlap)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Generate dust particle positions (7 particles at random positions)
  const dustParticles = [
    { top: '15%', left: '23%' },
    { top: '45%', left: '67%' },
    { top: '78%', left: '34%' },
    { top: '32%', left: '89%' },
    { top: '61%', left: '12%' },
    { top: '88%', left: '76%' },
    { top: '23%', left: '51%' },
  ];

  const childrenData: RenderableComponentData[] = [
    // Outgoing media container with film grain
    {
      id: 'outgoing-media-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            filter: 'contrast(1.1) brightness(1.05)',
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
        // Outgoing media
        {
          id: 'outgoing-media',
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
              duration: media1.duration,
            },
          },
        } as RenderableComponentData,
        // Film grain texture overlay
        {
          id: 'film-grain-texture',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; inset: 0; background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMDAAAAPNgEAmIGHFgAAAABJRU5ErkJggg==); opacity: 0.15; mix-blend-mode: overlay; pointer-events: none;"></div>`,
            className: 'absolute inset-0',
            style: {
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    } as RenderableComponentData,

    // Incoming media (starts during overlap)
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Flash overlay container
    {
      id: 'flash-overlay-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      childrenData: [
        // White flash overlay
        {
          id: 'flash-overlay',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div class="absolute inset-0 bg-white"></div>',
            className: 'absolute inset-0',
            style: {
              pointerEvents: 'none',
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
              id: 'flash-animation',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['flash-overlay'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.5 }, // Peak at 0.2s (50% progress)
                  { key: 'opacity', val: 0.7, prog: 1 }, // End at 0.7 opacity
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    } as RenderableComponentData,

    // Film gate shadow
    {
      id: 'film-gate-shadow',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="absolute inset-0" style="box-shadow: inset 0 0 40px 10px rgba(0,0,0,0.8), inset 0 0 60px 20px rgba(0,0,0,0.4); pointer-events: none;"></div>',
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration + 0.1,
          duration: transitionDuration - 0.1,
        },
      },
      effects: [
        {
          id: 'gate-shadow-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration - 0.1,
            mode: 'provider',
            targetIds: ['film-gate-shadow'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Dust particles container
    {
      id: 'dust-particles-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration + 0.05,
          duration: 0.3,
        },
      },
      childrenData: dustParticles.map((pos, index) => ({
        id: `dust-particle-${index}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="absolute rounded-full bg-gray-600" style="width: 2px; height: 2px; top: ${pos.top}; left: ${pos.left}; pointer-events: none;"></div>`,
          style: {
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 0.3,
          },
        },
        effects: [
          {
            id: `dust-fade-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: 0.3,
              mode: 'provider',
              targetIds: [`dust-particle-${index}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.6, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      })) as RenderableComponentData[],
    } as RenderableComponentData,

    // Bloom effect
    {
      id: 'bloom-effect',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="absolute inset-0" style="background: radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%); pointer-events: none;"></div>',
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration + 0.15,
          duration: 0.15,
        },
      },
      effects: [
        {
          id: 'bloom-scale',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.15,
            mode: 'provider',
            targetIds: ['bloom-effect'],
            ranges: [
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1.5, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'super8mm-flash-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
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
  id: 'super8mmFlashTransition',
  title: 'Super 8mm Film Flash Frame Transition',
  description:
    'Authentic Super 8mm film flash frame transition with white flash, film gate shadows, dust particles, lens bloom effects, and film grain. Recreates the bright white frames that appear in old home movie footage during a brief 0.4s overlap.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'super8mm',
    'film',
    'flash',
    'vintage',
    'retro',
    'grain',
    'dust',
    'bloom',
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
      duration: 5,
    },
    transitionDuration: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const super8mmFlashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
