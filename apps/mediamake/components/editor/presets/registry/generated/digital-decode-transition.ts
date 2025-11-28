/**
 * Digital Decode Transition Preset
 *
 * Matrix-style digital decode transition where the outgoing image appears to be
 * encrypted/scrambled with green color shift and pixelation, then decodes to reveal
 * the clear incoming image. Features:
 * - Outgoing media: increasing blur (pixelation simulation), green hue shift, brightness changes, opacity fade
 * - Incoming media: starts fully blurred and desaturated, sharpens to crystal clarity
 * - Pulse/throb effect at transition midpoint (0.9s) simulating data processing completion
 * - Background: dark matrix-style green (#001100)
 *
 * Use cases:
 * - Tech/cyberpunk themed transitions
 * - Data processing or decryption visualizations
 * - Futuristic presentation transitions
 * - Matrix-style video effects
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
      type: z
        .enum(['image', 'video'])
        .optional()
        .describe('Media type (auto-detected if not provided)'),
      duration: z.number().describe('Duration of outgoing media in seconds'),
    })
    .describe('Outgoing media configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z
        .enum(['image', 'video'])
        .optional()
        .describe('Media type (auto-detected if not provided)'),
      duration: z.number().describe('Duration of incoming media in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of transition overlap in seconds'),
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

  // Determine component IDs based on media type or src extension
  const getComponentId = (
    src: string,
    type?: 'image' | 'video',
  ): 'VideoAtom' | 'ImageAtom' => {
    if (type === 'video') return 'VideoAtom';
    if (type === 'image') return 'ImageAtom';
    // Auto-detect from extension
    if (src.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'VideoAtom';
    return 'ImageAtom';
  };

  const media1ComponentId = getComponentId(media1.src, media1.type);
  const media2ComponentId = getComponentId(media2.src, media2.type);

  // Timing calculations
  const outgoingEffectStart = media1.duration - transitionDuration;
  const incomingStart = media1.duration - transitionDuration;
  const incomingDuration = media2.duration + transitionDuration;

  // Pulse timing (at 0.9s into transition = 0.8s relative to incoming start)
  const pulseStartOutgoing = media1.duration - 1.0; // 0.8s into transition
  const pulseStartIncoming = 0.8; // 0.8s relative to incoming start
  const pulseDuration = 0.2;

  const childrenData: RenderableComponentData[] = [
    // Outgoing media (z-index: 10)
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        // Opacity fade out
        {
          id: 'outgoing-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Blur (pixelation simulation)
        {
          id: 'outgoing-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'filter:blur', val: '0px', prog: 0 },
              { key: 'filter:blur', val: '4px', prog: 0.5 },
              { key: 'filter:blur', val: '12px', prog: 1 },
            ],
          },
        },
        // Brightness (flash effect)
        {
          id: 'outgoing-brightness',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'filter:brightness', val: 1, prog: 0 },
              { key: 'filter:brightness', val: 1.3, prog: 0.5 },
              { key: 'filter:brightness', val: 0.5, prog: 1 },
            ],
          },
        },
        // Hue-rotate (green color shift)
        {
          id: 'outgoing-hue-rotate',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'filter:hue-rotate', val: '0deg', prog: 0 },
              { key: 'filter:hue-rotate', val: '60deg', prog: 0.5 },
              { key: 'filter:hue-rotate', val: '120deg', prog: 1 },
            ],
          },
        },
        // Pulse effect at midpoint
        {
          id: 'outgoing-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: pulseStartOutgoing,
            duration: pulseDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.03, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming media (z-index: 20)
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      effects: [
        // Opacity fade in
        {
          id: 'incoming-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.33 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Blur (decode effect)
        {
          id: 'incoming-blur',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'filter:blur', val: '15px', prog: 0 },
              { key: 'filter:blur', val: '6px', prog: 0.5 },
              { key: 'filter:blur', val: '0px', prog: 1 },
            ],
          },
        },
        // Saturation (color restoration)
        {
          id: 'incoming-saturate',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'filter:saturate', val: 0.3, prog: 0 },
              { key: 'filter:saturate', val: 1, prog: 1 },
            ],
          },
        },
        // Pulse effect at midpoint
        {
          id: 'incoming-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: pulseStartIncoming,
            duration: pulseDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.03, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'digital-decode-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-[#001100]',
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
  id: 'digital-decode-transition',
  title: 'Digital Decode Transition',
  description:
    'Matrix-style digital decode transition with encryption/scrambling effect on outgoing image, decoding to reveal clear incoming image. Features pixelation simulation, green color shift, opacity fade, and pulse effect at transition midpoint.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'digital',
    'decode',
    'matrix',
    'encryption',
    'cyberpunk',
    'tech',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      type: 'image',
      duration: 5,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
      type: 'image',
      duration: 5,
    },
    transitionDuration: 1.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const digitalDecodeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
