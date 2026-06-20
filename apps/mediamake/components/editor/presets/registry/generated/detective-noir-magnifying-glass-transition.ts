/**
 * Detective Noir Magnifying Glass Transition
 *
 * This preset creates a film noir inspired magnifying glass transition effect with dramatic lighting.
 * Features include:
 * - Spiral motion path for the magnifying glass lens starting from center
 * - Film noir spotlight effect revealing incoming video through the lens
 * - High-contrast black and white fade for outgoing video
 * - Warm color temperature (sepia) in lens area vs cool tones outside
 * - Increased brightness and saturation in the lens reveal area
 * - Vintage film grain texture overlay during transition
 * - Single BaseLayout container with 2.5s overlap transition period
 *
 * Use cases:
 * - Creating vintage detective story transitions
 * - Film noir style video effects
 * - Dramatic reveal transitions between video clips
 * - Adding retro cinematic flair to video montages
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
  videos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL'),
        duration: z.number().describe('Duration of the video in seconds'),
      }),
    )
    .min(2)
    .describe('Array of video objects to transition between'),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition overlap in seconds'),
  spiralRotations: z
    .number()
    .default(1)
    .describe('Number of full rotations during spiral motion'),
  lensSize: z
    .number()
    .default(200)
    .describe('Maximum size of the magnifying glass lens in percentage'),
  grainIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Intensity of film grain effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videos,
    transitionDuration,
    spiralRotations,
    lensSize,
    grainIntensity,
  } = params;

  // Calculate total duration: sum of videos minus overlap
  const totalDuration =
    videos.reduce((sum, v) => sum + v.duration, 0) - transitionDuration;

  // Base64 encoded film grain SVG texture
  const filmGrainSVG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuNSIvPjwvc3ZnPg==`;

  const childrenData: RenderableComponentData[] = [];

  // Create video layers with overlapping timing
  videos.forEach((video, index) => {
    const isOutgoing = index < videos.length - 1;
    const isIncoming = index > 0;

    // Calculate timing for this video
    let videoStart = 0;
    for (let i = 0; i < index; i++) {
      videoStart += videos[i].duration;
      if (i > 0) videoStart -= transitionDuration;
    }

    // Outgoing video layer (fades to noir black and white)
    if (isOutgoing) {
      const outgoingId = `outgoing-video-${index}`;
      childrenData.push({
        id: outgoingId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          className: 'absolute inset-0',
          style: {
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            zIndex: 1,
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: videoStart,
            duration: video.duration,
          },
        },
        effects: [
          // Grayscale effect (0 to 100%)
          {
            id: `grayscale-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: video.duration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [outgoingId],
              ranges: [
                { key: 'filter:grayscale', val: 0, prog: 0 },
                { key: 'filter:grayscale', val: 100, prog: 1 },
              ],
            },
          },
          // Brightness reduction (100% to 40%)
          {
            id: `brightness-out-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: video.duration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [outgoingId],
              ranges: [
                { key: 'filter:brightness', val: 100, prog: 0 },
                { key: 'filter:brightness', val: 40, prog: 1 },
              ],
            },
          },
          // Contrast increase (100% to 150%)
          {
            id: `contrast-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: video.duration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [outgoingId],
              ranges: [
                { key: 'filter:contrast', val: 100, prog: 0 },
                { key: 'filter:contrast', val: 150, prog: 1 },
              ],
            },
          },
          // Opacity fade
          {
            id: `opacity-out-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: video.duration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [outgoingId],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    // Incoming video layer (revealed through magnifying glass lens)
    if (isIncoming) {
      const incomingId = `incoming-video-${index}`;
      const incomingStart = videoStart - transitionDuration;

      childrenData.push({
        id: incomingId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          className: 'absolute inset-0',
          style: {
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            zIndex: 2,
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: incomingStart,
            duration: video.duration + transitionDuration,
          },
        },
        effects: [
          // Radial gradient clip-path (magnifying glass reveal)
          {
            id: `clip-reveal-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [incomingId],
              ranges: [
                { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
                { key: 'clipPath', val: `circle(${lensSize}% at 50% 50%)`, prog: 1 },
              ],
            },
          },
          // Sepia tone for warm color temperature
          {
            id: `sepia-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [incomingId],
              ranges: [
                { key: 'filter:sepia', val: 10, prog: 0 },
                { key: 'filter:sepia', val: 10, prog: 1 },
              ],
            },
          },
          // Increased brightness in lens area
          {
            id: `brightness-in-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [incomingId],
              ranges: [
                { key: 'filter:brightness', val: 130, prog: 0 },
                { key: 'filter:brightness', val: 130, prog: 1 },
              ],
            },
          },
          // Increased saturation
          {
            id: `saturate-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [incomingId],
              ranges: [
                { key: 'filter:saturate', val: 110, prog: 0 },
                { key: 'filter:saturate', val: 110, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);

      // Lens glow overlay (warm spotlight effect)
      const lensGlowId = `lens-glow-${index}`;
      childrenData.push({
        id: lensGlowId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, rgba(255, 220, 150, 0.3) 0%, transparent 50%); pointer-events: none;"></div>`,
          className: 'absolute inset-0',
          style: {
            zIndex: 3,
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: incomingStart,
            duration: transitionDuration,
          },
        },
        effects: [
          // Spiral motion - horizontal (X)
          {
            id: `spiral-x-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [lensGlowId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: 100, prog: 0.25 },
                { key: 'translateX', val: 0, prog: 0.5 },
                { key: 'translateX', val: -100, prog: 0.75 },
                { key: 'translateX', val: 0, prog: 1 },
              ],
            },
          },
          // Spiral motion - vertical (Y)
          {
            id: `spiral-y-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [lensGlowId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: 0, prog: 0.25 },
                { key: 'translateY', val: 100, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 0.75 },
                { key: 'translateY', val: -100, prog: 1 },
              ],
            },
          },
          // Spiral rotation
          {
            id: `spiral-rotate-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [lensGlowId],
              ranges: [
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: 360 * spiralRotations, prog: 1 },
              ],
            },
          },
          // Fade in/out
          {
            id: `glow-opacity-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [lensGlowId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);

      // Film grain overlay
      const grainId = `film-grain-${index}`;
      childrenData.push({
        id: grainId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background-image: url('${filmGrainSVG}'); pointer-events: none; background-repeat: repeat;"></div>`,
          className: 'absolute inset-0',
          style: {
            zIndex: 4,
            mixBlendMode: 'overlay',
          },
        },
        context: {
          timing: {
            start: incomingStart,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `grain-opacity-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [grainId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: grainIntensity, prog: 0.1 },
                { key: 'opacity', val: grainIntensity, prog: 0.9 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  });

  const rootContainer: RenderableComponentData = {
    id: 'detective-noir-magnifying-glass-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
        style: {
          overflow: 'hidden',
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
  id: 'detective-noir-magnifying-glass-transition',
  title: 'Detective Noir Magnifying Glass Transition',
  description:
    'Film noir inspired magnifying glass transition with spiral motion path, dramatic lighting effects, and vintage film grain. The lens creates a spotlight effect revealing incoming video while outgoing video fades to high-contrast noir black and white. Features warm lens glow, cool outer tones, and progressive darkening with vintage filter effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'noir',
    'magnifying-glass',
    'detective',
    'vintage',
    'film-grain',
    'spiral',
    'dramatic',
    'cinematic',
  ],
  defaultInputParams: {
    videos: [
      {
        src: 'https://example.com/video1.mp4',
        duration: 10,
      },
      {
        src: 'https://example.com/video2.mp4',
        duration: 10,
      },
    ],
    transitionDuration: 2.5,
    spiralRotations: 1,
    lensSize: 200,
    grainIntensity: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const detectiveNoirMagnifyingGlassTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};