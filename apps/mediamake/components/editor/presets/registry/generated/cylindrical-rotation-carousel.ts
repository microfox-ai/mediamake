/**
 * Cylindrical Rotation Carousel Transition Preset
 *
 * A dynamic cylindrical rotation carousel with exaggerated perspective for YouTube-style impact.
 * This transition features fast 0.5 second overlap with aggressive rotation angles (rotateY -120deg 
 * for outgoing, 120deg to 0 for incoming) to create a dramatic spinning effect.
 *
 * Features:
 * - Fast 0.5s overlap with aggressive rotation angles
 * - RotateX tilt (±5deg) during transition for dynamic 3D feel
 * - Scale punch effect where incoming overshoots to 1.05 before settling
 * - Closer perspective (600px) for dramatic depth distortion
 * - Subtle drop shadow that intensifies during rotation
 * - Outgoing uses ease-out timing, incoming uses ease-in-out for smooth landing
 *
 * Use cases:
 * - Creating dramatic transitions between media items
 * - Building engaging video sequences with 3D effects
 * - Adding cinematic rotation effects to slideshows
 * - Creating YouTube-style impact transitions
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
    duration: z.number().describe('Duration of outgoing media in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming media (image or video)'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration of incoming media in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(0.5)
    .describe('Duration of transition overlap in seconds (default: 0.5s)'),
  perspective: z
    .number()
    .default(600)
    .describe('Perspective distance in pixels for 3D effect (default: 600px)'),
  rotationAngle: z
    .number()
    .default(120)
    .describe('Rotation angle in degrees (default: 120deg)'),
  tiltAngle: z
    .number()
    .default(5)
    .describe('RotateX tilt angle in degrees (default: 5deg)'),
  scaleOvershoot: z
    .number()
    .default(1.05)
    .describe('Scale overshoot value for punch effect (default: 1.05)'),
  shadowIntensity: z
    .number()
    .default(0.4)
    .describe('Drop shadow intensity (0-1, default: 0.4)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    transitionDuration,
    perspective,
    rotationAngle,
    tiltAngle,
    scaleOvershoot,
    shadowIntensity,
  } = params;

  // Calculate BaseLayout duration
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate timing values
  const outgoingEffectStart = media1.duration - transitionDuration;
  const incomingStart = media1.duration - transitionDuration;
  const incomingDuration = media2.duration;

  // Shadow configuration
  const maxShadowBlur = 40;
  const maxShadowOffset = 20;
  const shadowColor = `rgba(0,0,0,${shadowIntensity})`;

  const childrenData: RenderableComponentData[] = [
    // Outgoing media
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 5,
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
            type: 'ease-out',
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
        // Transform: rotateY(-120deg), rotateX(5deg), scale(0.7)
        {
          id: 'outgoing-transform',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'rotateY', val: '0deg', prog: 0 },
              { key: 'rotateY', val: `${-rotationAngle}deg`, prog: 1 },
              { key: 'rotateX', val: '0deg', prog: 0 },
              { key: 'rotateX', val: `${tiltAngle}deg`, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.7, prog: 1 },
            ],
          },
        },
        // Box shadow effect
        {
          id: 'outgoing-shadow',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingEffectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 0 },
              {
                key: 'boxShadow',
                val: `0 ${maxShadowOffset}px ${maxShadowBlur}px ${shadowColor}`,
                prog: 0.5,
              },
              { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming media
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10,
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
            type: 'ease-in-out',
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
        // Transform with overshoot: rotateY(120deg -> 0), rotateX(-5deg -> 0), scale(0.7 -> 1.05 -> 1)
        {
          id: 'incoming-transform',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 0.7,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'rotateY', val: `${rotationAngle}deg`, prog: 0 },
              { key: 'rotateY', val: '0deg', prog: 0.7 },
              { key: 'rotateY', val: '0deg', prog: 1 },
              { key: 'rotateX', val: `${-tiltAngle}deg`, prog: 0 },
              { key: 'rotateX', val: '0deg', prog: 0.7 },
              { key: 'rotateX', val: '0deg', prog: 1 },
              { key: 'scale', val: 0.7, prog: 0 },
              { key: 'scale', val: scaleOvershoot, prog: 0.7 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Box shadow effect
        {
          id: 'incoming-shadow',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 0 },
              {
                key: 'boxShadow',
                val: `0 ${maxShadowOffset}px ${maxShadowBlur}px ${shadowColor}`,
                prog: 0.5,
              },
              {
                key: 'boxShadow',
                val: `0 10px 20px rgba(0,0,0,${shadowIntensity * 0.5})`,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'cylindrical-rotation-carousel-container',
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
  id: 'cylindrical-rotation-carousel',
  title: 'Cylindrical Rotation Carousel Transition',
  description:
    'A dynamic cylindrical rotation carousel with exaggerated perspective for YouTube-style impact. Features fast 0.5s overlap with aggressive rotation angles (rotateY ±120deg), rotateX tilt (±5deg), scale punch effect (1.05 overshoot), and intensifying drop shadow for 3D cylinder illusion. Perspective set to 600px for dramatic depth distortion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'carousel', 'rotation', '3d', 'cylindrical', 'youtube'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 3,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 3,
    },
    transitionDuration: 0.5,
    perspective: 600,
    rotationAngle: 120,
    tiltAngle: 5,
    scaleOvershoot: 1.05,
    shadowIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cylindricalRotationCarouselPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
