/**
 * Holographic Glass Panel Slide Transition
 *
 * Creates a cinematic transition effect where two videos appear as holographic glass panels
 * sliding past each other on separate layers in 3D space. Features:
 * - Diagonal sliding motion with 3D perspective transforms
 * - Gradient blur effects strongest at leading edges (0-40px blur gradient)
 * - Rainbow refraction strip with backdrop blur at intersection zone
 * - Pulsing edge glow effects during overlap period
 * - Perspective transforms creating floating glass panel effect
 *
 * Use cases:
 * - Cinematic video transitions with depth
 * - High-end promotional content
 * - Tech/futuristic video presentations
 * - Creative video montages
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
  video1: z.object({
    src: z.string().describe('Source URL of first video'),
    duration: z.number().describe('Duration of first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of second video'),
    duration: z.number().describe('Duration of second video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.6)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Outgoing video starts at 0, lasts for video1.duration
  const outgoingStart = 0;
  const outgoingDuration = video1.duration;

  // Incoming video starts at (video1.duration - overlapDuration), lasts for video2.duration
  const incomingStart = video1.duration - overlapDuration;
  const incomingDuration = video2.duration;

  // Refraction strip starts at same time as incoming video, lasts for overlap duration
  const refractionStart = incomingStart;
  const refractionDuration = overlapDuration;

  // Build outgoing video container with 3D transform effects
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    effects: [
      // 3D transform effect (translateX, translateY, rotateY)
      {
        id: 'outgoing-3d-transform',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration - overlapDuration, // Start when overlap begins
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-150%', prog: 1 },
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '-50%', prog: 1 },
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -25, prog: 1 },
          ],
        },
      },
      // Edge glow effect
      {
        id: 'outgoing-glow',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration * 0.8,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            {
              key: 'boxShadow',
              val: '0 0 0px rgba(100,200,255,0)',
              prog: 0,
            },
            {
              key: 'boxShadow',
              val: '0 0 30px rgba(100,200,255,0.6)',
              prog: 1,
            },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
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
          // Gradient blur effect (0-40px)
          {
            id: 'outgoing-blur',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingDuration - overlapDuration,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'blur', val: '0px', prog: 0 },
                { key: 'blur', val: '40px', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Build incoming video container with 3D transform effects
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    effects: [
      // 3D transform effect (translateX, translateY, rotateY) - opposite direction
      {
        id: 'incoming-3d-transform',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Start immediately when incoming container appears
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'translateX', val: '150%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
            { key: 'translateY', val: '50%', prog: 0 },
            { key: 'translateY', val: '0%', prog: 1 },
            { key: 'rotateY', val: 25, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
      // Edge glow effect - delayed start
      {
        id: 'incoming-glow',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: overlapDuration * 0.2,
          duration: overlapDuration * 0.8,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            {
              key: 'boxShadow',
              val: '0 0 30px rgba(255,100,200,0.6)',
              prog: 0,
            },
            {
              key: 'boxShadow',
              val: '0 0 0px rgba(255,100,200,0)',
              prog: 1,
            },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
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
          // Inverse gradient blur effect (40px-0px)
          {
            id: 'incoming-blur',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'blur', val: '40px', prog: 0 },
                { key: 'blur', val: '0px', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Build refraction strip with rainbow gradient and backdrop blur
  const refractionStrip: RenderableComponentData = {
    id: 'refraction-strip',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '150px',
          height: '120%',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%) rotate(-30deg)',
          background:
            'linear-gradient(90deg, rgba(255,0,0,0.3), rgba(255,165,0,0.3), rgba(255,255,0,0.3), rgba(0,255,0,0.3), rgba(0,0,255,0.3), rgba(75,0,130,0.3), rgba(238,130,238,0.3))',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          zIndex: 3,
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: refractionStart,
        duration: refractionDuration,
      },
    },
    effects: [
      // Opacity fade in/out
      {
        id: 'refraction-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: refractionDuration,
          mode: 'provider',
          targetIds: ['refraction-strip'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.15 },
            { key: 'opacity', val: 1, prog: 0.85 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Position animation following intersection
      {
        id: 'refraction-position',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: refractionDuration,
          mode: 'provider',
          targetIds: ['refraction-strip'],
          ranges: [
            { key: 'translateX', val: '100%', prog: 0 },
            { key: 'translateX', val: '-200%', prog: 1 },
          ],
        },
      },
      // Hue rotation for rainbow color shift
      {
        id: 'refraction-hue',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: refractionDuration,
          mode: 'provider',
          targetIds: ['refraction-strip'],
          ranges: [
            { key: 'hueRotate', val: 0, prog: 0 },
            { key: 'hueRotate', val: 360, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'holographic-glass-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '2000px',
          perspectiveOrigin: 'center center',
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
    childrenData: [
      outgoingVideoContainer,
      incomingVideoContainer,
      refractionStrip,
    ],
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
  id: 'holographic-glass-panel-transition',
  title: 'Holographic Glass Panel Slide Transition',
  description:
    'Cinematic transition where videos appear as holographic glass panels sliding diagonally with refractive distortions, gradient blur, and pulsing edge glows',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'holographic',
    'glass',
    'cinematic',
    '3d',
    'perspective',
    'refraction',
    'blur',
    'glow',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const holographicGlassPanelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
