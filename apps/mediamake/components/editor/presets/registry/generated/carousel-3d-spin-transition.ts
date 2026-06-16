/**
 * 3D Carousel Spin Transition Preset
 *
 * This preset creates a 3D cylindrical carousel transition effect where images rotate
 * around a virtual drum axis. The outgoing image rotates away to the left (rotateY -90deg)
 * while the incoming image enters from the right (rotateY 90deg), both with synchronized
 * X-axis translation and depth scaling to create a realistic cylindrical rotation illusion.
 *
 * Features:
 * - **3D Perspective Transform**: Uses perspective(1000px) on container for 3D depth
 * - **Synchronized Rotation**: Both images appear mounted on the same rotating drum
 * - **Depth Illusion**: Subtle scale reduction (to 0.9) at rotation midpoint enhances depth
 * - **Smooth Overlap**: 0.8s transition period with controlled z-index layering
 * - **Cylindrical Effect**: Combined rotateY and translateX creates barrel rotation
 *
 * Use cases:
 * - Creating immersive 3D image transitions
 * - Building carousel-style photo galleries
 * - Adding depth to slideshow presentations
 * - Creating engaging product showcase transitions
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
      src: z.string().describe('Source URL of outgoing media (image or video)'),
      type: z
        .enum(['image', 'video'])
        .optional()
        .describe('Media type (auto-detected if omitted)'),
      duration: z.number().describe('Duration of outgoing media in seconds'),
    })
    .describe('Outgoing media configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media (image or video)'),
      type: z
        .enum(['image', 'video'])
        .optional()
        .describe('Media type (auto-detected if omitted)'),
      duration: z.number().describe('Duration of incoming media in seconds'),
    })
    .describe('Incoming media configuration'),
  overlapDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe('Duration of transition overlap in seconds (both images visible)'),
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Perspective distance in pixels for 3D transform'),
  rotationAngle: z
    .number()
    .min(45)
    .max(180)
    .default(90)
    .describe('Rotation angle in degrees for carousel spin'),
  translateDistance: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Horizontal translation distance in pixels for depth effect'),
  scaleAtMidpoint: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.9)
    .describe('Scale value at rotation midpoint (creates depth illusion)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    overlapDuration,
    perspective,
    rotationAngle,
    translateDistance,
    scaleAtMidpoint,
  } = params;

  // Helper: Determine component ID based on media type or extension
  const getMediaComponentId = (
    src: string,
    type?: 'image' | 'video',
  ): 'ImageAtom' | 'VideoAtom' => {
    if (type === 'video') return 'VideoAtom';
    if (type === 'image') return 'ImageAtom';

    // Auto-detect from extension
    if (src.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i)) return 'VideoAtom';
    return 'ImageAtom';
  };

  const media1ComponentId = getMediaComponentId(media1.src, media1.type);
  const media2ComponentId = getMediaComponentId(media2.src, media2.type);

  // Calculate total duration (sum minus overlap)
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Timing calculations
  const outgoingStart = 0;
  const outgoingDuration = media1.duration;
  const outgoingEffectStart = media1.duration - overlapDuration;
  const outgoingEffectDuration = overlapDuration;

  const incomingStart = media1.duration - overlapDuration;
  const incomingDuration = media2.duration;
  const incomingEffectStart = 0; // Relative to incoming image start
  const incomingEffectDuration = overlapDuration;

  // Build outgoing media atom
  const outgoingMedia: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    effects: [],
  };

  // Build incoming media atom
  const incomingMedia: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 2,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    effects: [],
  };

  // Outgoing opacity effect
  const outgoingOpacityEffect = {
    id: 'outgoing-opacity-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: outgoingEffectStart,
      duration: outgoingEffectDuration,
      mode: 'provider' as const,
      targetIds: ['outgoing-image'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Outgoing transform effect (rotation + translation + scale)
  const outgoingTransformEffect = {
    id: 'outgoing-transform-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: outgoingEffectStart,
      duration: outgoingEffectDuration,
      mode: 'provider' as const,
      targetIds: ['outgoing-image'],
      ranges: [
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: -rotationAngle, prog: 1 },
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -translateDistance, prog: 1 },
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: scaleAtMidpoint, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Incoming opacity effect
  const incomingOpacityEffect = {
    id: 'incoming-opacity-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: incomingEffectStart,
      duration: incomingEffectDuration,
      mode: 'provider' as const,
      targetIds: ['incoming-image'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Incoming transform effect (rotation + translation + scale)
  const incomingTransformEffect = {
    id: 'incoming-transform-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: incomingEffectStart,
      duration: incomingEffectDuration,
      mode: 'provider' as const,
      targetIds: ['incoming-image'],
      ranges: [
        { key: 'rotateY', val: rotationAngle, prog: 0 },
        { key: 'rotateY', val: 0, prog: 1 },
        { key: 'translateX', val: translateDistance, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'scale', val: scaleAtMidpoint, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Attach effects to media atoms
  outgoingMedia.effects = [outgoingOpacityEffect, outgoingTransformEffect];
  incomingMedia.effects = [incomingOpacityEffect, incomingTransformEffect];

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'carousel-3d-spin-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingMedia, incomingMedia],
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
  id: 'carousel-3d-spin-transition',
  title: '3D Carousel Spin Transition',
  description:
    'A 3D cylindrical carousel transition effect that rotates images around a virtual drum axis. The outgoing image rotates away to the left (rotateY -90deg) while the incoming image enters from the right (rotateY 90deg), both with synchronized X-axis translation and depth scaling to create a realistic cylindrical rotation illusion. Uses perspective transforms and controlled z-index layering during an 0.8s overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'carousel', 'rotation', 'cylindrical'],
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
    overlapDuration: 0.8,
    perspective: 1000,
    rotationAngle: 90,
    translateDistance: 200,
    scaleAtMidpoint: 0.9,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const carousel3dSpinTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
