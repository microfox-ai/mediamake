/**
 * Retro Static Roll Transition Preset
 *
 * This preset simulates changing channels on an old CRT television with vertical hold problems.
 * The outgoing video rolls upward continuously while fading behind increasing static noise,
 * creating the effect of losing vertical sync. During the 1.5 second overlap, a 'channel surf'
 * effect displays brief flashes of different colored static patterns (blue, green, magenta)
 * representing different empty channels. The incoming video rolls down from the top while the
 * static gradually decreases, eventually locking into place with a subtle magnetic 'snap' effect.
 *
 * Features:
 * - Outgoing video: translateY animation from 0 to -200% with opacity fade to 0.2
 * - Static layers: 4 ImageAtoms with staggered opacity animations and exclusion blend mode
 * - Channel flash effect: Colored overlays (blue, green, magenta) with opacity spikes
 * - Incoming video: translateY from 100% to 0 with ease-out-back snap effect
 * - Static noise audio: Volume envelope matching visual static intensity
 * - GPU-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Creating nostalgic TV channel-changing transitions
 * - Simulating old television effects with vertical sync loss
 * - Building retro-style video transitions with audio-visual synchronization
 * - Adding vintage CRT television aesthetics to modern videos
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
    src: z.string().describe('Source URL of outgoing video'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of transition overlap in seconds'),
  staticTextures: z
    .array(z.string())
    .length(4)
    .optional()
    .describe('Array of 4 static texture image URLs'),
  staticAudioSrc: z
    .string()
    .optional()
    .describe('Static noise audio source URL'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration, staticTextures, staticAudioSrc } =
    params;

  // Calculate BaseLayout duration (overlap reduces total duration)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Generate placeholder static textures if not provided
  const defaultStaticTextures = [
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" opacity="0.8"/%3E%3C/svg%3E',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="2" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" opacity="0.7"/%3E%3C/svg%3E',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="5" seed="3" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" opacity="0.6"/%3E%3C/svg%3E',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="4" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" opacity="0.8"/%3E%3C/svg%3E',
  ];

  const textures = staticTextures || defaultStaticTextures;

  // Timing calculations
  const rollStartTime = media1.duration - transitionDuration;
  const incomingStartTime = media1.duration - transitionDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing media - rolls upward and fades
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 1,
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
          id: 'roll-upward-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: rollStartTime,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: '-200%', prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.2, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Static layer 1 - peaks at 0.3s
    {
      id: 'static-layer-1',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: textures[0],
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 10,
          mixBlendMode: 'exclusion',
          pointerEvents: 'none',
        },
      } as any,
      context: {
        timing: {
          start: rollStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'static-1-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['static-layer-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.2 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Static layer 2 - peaks at 0.6s
    {
      id: 'static-layer-2',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: textures[1],
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 11,
          mixBlendMode: 'exclusion',
          pointerEvents: 'none',
        },
      } as any,
      context: {
        timing: {
          start: rollStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'static-2-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['static-layer-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.4 },
              { key: 'opacity', val: 0.25, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Static layer 3 - peaks at 0.9s
    {
      id: 'static-layer-3',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: textures[2],
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 12,
          mixBlendMode: 'exclusion',
          pointerEvents: 'none',
        },
      } as any,
      context: {
        timing: {
          start: rollStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'static-3-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['static-layer-3'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.4, prog: 0.6 },
              { key: 'opacity', val: 0.2, prog: 0.85 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Channel flash - Blue (at 0.3s into transition)
    {
      id: 'channel-flash-blue',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 w-full h-full',
          style: {
            backgroundColor: '#0044ff',
            zIndex: 15,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: rollStartTime + 0.3,
          duration: 0.1,
        },
      },
      effects: [
        {
          id: 'flash-blue-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['channel-flash-blue'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Channel flash - Green (at 0.6s into transition)
    {
      id: 'channel-flash-green',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 w-full h-full',
          style: {
            backgroundColor: '#00ff44',
            zIndex: 15,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: rollStartTime + 0.6,
          duration: 0.1,
        },
      },
      effects: [
        {
          id: 'flash-green-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['channel-flash-green'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Channel flash - Magenta (at 0.9s into transition)
    {
      id: 'channel-flash-magenta',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 w-full h-full',
          style: {
            backgroundColor: '#ff00ff',
            zIndex: 15,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: rollStartTime + 0.9,
          duration: 0.1,
        },
      },
      effects: [
        {
          id: 'flash-magenta-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['channel-flash-magenta'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Incoming media - rolls down with snap effect
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 20,
        },
      } as any,
      context: {
        timing: {
          start: incomingStartTime,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'roll-down-snap-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 1.0,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'translateY', val: '100%', prog: 0 },
              { key: 'translateY', val: '-5%', prog: 0.8 },
              { key: 'translateY', val: '0%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Add static audio if provided
  if (staticAudioSrc) {
    childrenData.push({
      id: 'static-audio',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: staticAudioSrc,
        volume: 0.6,
        startFrom: 0,
      } as any,
      context: {
        timing: {
          start: rollStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'audio-volume-envelope',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['static-audio'],
            ranges: [
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const rootContainer: RenderableComponentData = {
    id: 'retro-static-roll-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full',
        style: {
          backgroundColor: '#000000',
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
  id: 'retro-static-roll-transition',
  title: 'Retro Static Roll Transition',
  description:
    'A nostalgic channel-changing transition that simulates an old CRT television losing vertical sync. Features outgoing video rolling upward with increasing static noise, colored channel flash effects (blue, green, magenta) during the overlap period, and incoming video rolling down from top with an ease-out-back "magnetic snap" effect. Includes static audio that matches visual intensity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'retro',
    'crt',
    'television',
    'static',
    'channel',
    'vintage',
    'vertical-sync',
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
    transitionDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const retroStaticRollTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};