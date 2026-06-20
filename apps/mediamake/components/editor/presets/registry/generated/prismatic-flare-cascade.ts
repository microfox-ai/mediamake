/**
 * Prismatic Flare Cascade Transition Preset
 *
 * A stunning diagonal transition featuring multiple rainbow-tinted light flares
 * that cascade across the frame. During the 1.8-second transition, warm prismatic
 * light leaks (amber, coral, gold, magenta) create a cascading wipe effect.
 *
 * Features:
 * - Diagonal cascade of 5 staggered prismatic flares (warm hues)
 * - Outgoing image: hue-rotate 0→45deg, brightness 1→3, opacity fade
 * - Incoming image: progressive reveal with warm toning
 * - Screen blend mode flares for additive light effect
 * - Saturated color treatment (1.5x) for vibrant prismatic look
 * - Custom easing for smooth, organic light refraction feel
 *
 * Use cases:
 * - Image-to-image transitions with warm, energetic feel
 * - Video transitions with prismatic light leak aesthetic
 * - Creative wipes mimicking lens flare or light refraction
 * - Energetic scene changes with cascading motion
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingImage: z
    .object({
      src: z.string().describe('Source URL of outgoing image'),
    })
    .describe('Outgoing image configuration'),
  incomingImage: z
    .object({
      src: z.string().describe('Source URL of incoming image'),
    })
    .describe('Incoming image configuration'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingImage, incomingImage, transitionDuration } = params;

  // Flare colors: warm yellows, oranges, magentas, corals, golds
  const flareConfigs = [
    {
      id: 'flare-1',
      gradient:
        'linear-gradient(135deg, rgba(255,191,0,0.9), rgba(255,127,80,0.8))',
      width: 300,
      blur: 60,
      zIndex: 25,
      startDelay: 0,
      duration: 1.8,
    },
    {
      id: 'flare-2',
      gradient:
        'linear-gradient(135deg, rgba(255,105,180,0.85), rgba(255,69,0,0.75))',
      width: 280,
      blur: 55,
      zIndex: 27,
      startDelay: 0.15,
      duration: 1.65,
    },
    {
      id: 'flare-3',
      gradient:
        'linear-gradient(135deg, rgba(255,215,0,0.9), rgba(255,140,0,0.8))',
      width: 320,
      blur: 65,
      zIndex: 29,
      startDelay: 0.3,
      duration: 1.5,
    },
    {
      id: 'flare-4',
      gradient:
        'linear-gradient(135deg, rgba(255,160,122,0.85), rgba(255,99,71,0.8))',
      width: 290,
      blur: 58,
      zIndex: 31,
      startDelay: 0.45,
      duration: 1.35,
    },
    {
      id: 'flare-5',
      gradient:
        'linear-gradient(135deg, rgba(255,218,185,0.9), rgba(255,160,122,0.85))',
      width: 310,
      blur: 62,
      zIndex: 33,
      startDelay: 0.6,
      duration: 1.2,
    },
  ];

  // Create flare overlays
  const flareOverlays: RenderableComponentData[] = flareConfigs.map(
    (config) => ({
      id: config.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${config.width}px; height: 200%; background: ${config.gradient}; transform: rotate(-45deg); filter: blur(${config.blur}px);"></div>`,
        className: 'absolute',
        style: {
          zIndex: config.zIndex,
          mixBlendMode: 'screen',
          left: '-150px',
          top: '-50%',
        },
      },
      context: {
        timing: {
          start: config.startDelay,
          duration: config.duration,
        },
      },
      effects: [
        {
          id: `${config.id}-sweep`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: config.duration,
            mode: 'provider',
            targetIds: [config.id],
            ranges: [
              { key: 'translateX', val: '0vw', prog: 0 },
              { key: 'translateX', val: '120vw', prog: 1 },
              { key: 'translateY', val: '0vh', prog: 0 },
              { key: 'translateY', val: '120vh', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 0.9, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Outgoing image with hue-rotate, brightness, and fade
  const outgoingImageNode: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom' as const,
    componentId: 'ImageAtom',
    data: {
      src: outgoingImage.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 10,
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
        id: 'outgoing-hue-brightness-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'filter.hue-rotate', val: '0deg', prog: 0 },
            { key: 'filter.hue-rotate', val: '45deg', prog: 0.6 },
            { key: 'filter.brightness', val: 1, prog: 0 },
            { key: 'filter.brightness', val: 3, prog: 0.7 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming image with progressive reveal and warm toning
  const incomingImageNode: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom' as const,
    componentId: 'ImageAtom',
    data: {
      src: incomingImage.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 20,
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
        id: 'incoming-reveal-warm-toning',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'filter.brightness', val: 2, prog: 0 },
            { key: 'filter.brightness', val: 1, prog: 1 },
            { key: 'filter.saturate', val: 0.8, prog: 0 },
            { key: 'filter.saturate', val: 1.2, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with saturate filter
  const rootContainer: RenderableComponentData = {
    id: 'prismatic-flare-cascade-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          filter: 'saturate(1.5)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [outgoingImageNode, incomingImageNode, ...flareOverlays],
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
  id: 'prismatic-flare-cascade',
  title: 'Prismatic Flare Cascade Transition',
  description:
    'Diagonal transition featuring multiple rainbow-tinted light flares cascading across the frame with warm prismatic light leaks creating a wipe effect',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'prismatic',
    'flare',
    'cascade',
    'light-leak',
    'diagonal',
    'warm',
    'colorful',
    'image',
  ],
  defaultInputParams: {
    outgoingImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    incomingImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    },
    transitionDuration: 1.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const prismaticFlareCascadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
