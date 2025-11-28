/**
 * Vintage Projector Light Leak Transition
 *
 * This preset creates a cinematic vintage film projector transition effect with vertical light leaks,
 * film artifacts, flickering, and authentic analog effects. It simulates the unstable projection
 * aesthetic of old film projectors with light bleeding, saturation reduction, sprocket hole shadows,
 * and subtle frame jitter during a 0.6s transition period.
 *
 * Features:
 * - **Vertical Light Leaks**: Multiple vertical light bands with varying speeds and intensities
 * - **Film Artifacts**: Sepia tone, reduced contrast, blur, and jitter effects on outgoing media
 * - **Overexposure Effect**: Incoming media starts overexposed and quickly stabilizes
 * - **Sprocket Holes**: Dark sprocket hole shadows at left and right edges with opacity fade
 * - **Frame Misalignment**: Subtle vertical jitter using transform animations
 * - **Blend Modes**: Realistic light interaction using 'overlay' and 'soft-light' blend modes
 * - **Short Transition Duration**: Quick 0.6s overlap for rapid vintage projector feel
 *
 * Use cases:
 * - Creating vintage film projector transitions between video clips
 * - Adding authentic analog film effects to modern content
 * - Building retro-style video presentations
 * - Simulating old cinema projection aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingMedia: z.object({
    src: z.string().describe('Source URL of outgoing media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Outgoing media configuration'),
  incomingMedia: z.object({
    src: z.string().describe('Source URL of incoming media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }).describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of transition overlap in seconds (0.6s for quick vintage feel)'),
  lightLeakIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .describe('Intensity of light leak effects (0.1-1)'),
  filmArtifactIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.8)
    .describe('Intensity of film artifact effects (0.1-1)'),
  jitterIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Intensity of frame jitter in pixels (0-5)'),
  sprocketHoleOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Opacity of sprocket hole shadows (0-1)'),
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
    lightLeakIntensity,
    filmArtifactIntensity,
    jitterIntensity,
    sprocketHoleOpacity,
  } = params;

  // Calculate BaseLayout duration
  const baseLayoutDuration =
    outgoingMedia.duration + incomingMedia.duration - transitionDuration;

  // Determine component IDs
  const outgoingComponentId =
    outgoingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingMedia.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate timing for jitter keyframes (24fps intervals)
  const jitterKeyframes = [];
  const fps = 24;
  const jitterInterval = 1 / fps;
  const numJitterFrames = Math.floor(transitionDuration / jitterInterval);

  for (let i = 0; i <= numJitterFrames; i++) {
    const prog = i / numJitterFrames;
    const randomY = (Math.random() - 0.5) * 2 * jitterIntensity;
    jitterKeyframes.push({
      key: 'translateY',
      val: `${randomY}px`,
      prog,
    });
  }

  // Outgoing media container with film artifacts
  const outgoingMediaContainer: RenderableComponentData = {
    id: 'outgoing-media-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingMedia.duration,
      },
    },
    effects: [
      // Sepia tone effect
      {
        id: 'sepia-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingMedia.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media-container'],
          ranges: [
            {
              key: 'filter',
              val: 'sepia(0) contrast(1) blur(0px)',
              prog: 0,
            },
            {
              key: 'filter',
              val: `sepia(${0.3 * filmArtifactIntensity}) contrast(${1 - 0.2 * filmArtifactIntensity}) blur(${1 * filmArtifactIntensity}px)`,
              prog: 1,
            },
          ],
        },
      },
      // Frame jitter effect
      {
        id: 'jitter-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingMedia.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media-container'],
          ranges: jitterKeyframes,
        },
      },
      // Fade out during transition
      {
        id: 'fade-out-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingMedia.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-media',
        type: 'atom',
        componentId: outgoingComponentId,
        data: {
          src: outgoingMedia.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingMedia.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Incoming media container with overexposure effect
  const incomingMediaContainer: RenderableComponentData = {
    id: 'incoming-media-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: outgoingMedia.duration - transitionDuration,
        duration: incomingMedia.duration + transitionDuration,
      },
    },
    effects: [
      // Overexposure to normal brightness
      {
        id: 'overexposure-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: ['incoming-media-container'],
          ranges: [
            { key: 'filter', val: 'brightness(1.8) contrast(0.6)', prog: 0 },
            { key: 'filter', val: 'brightness(1) contrast(1)', prog: 1 },
          ],
        },
      },
      // Fade in during transition
      {
        id: 'fade-in-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-media',
        type: 'atom',
        componentId: incomingComponentId,
        data: {
          src: incomingMedia.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingMedia.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Light leak overlays
  const lightLeak1: RenderableComponentData = {
    id: 'light-leak-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(to right, transparent, rgba(254, 240, 138, ${0.8 * lightLeakIntensity}), transparent);"></div>`,
      className: 'absolute h-full w-8',
      style: {
        left: '10%',
        mixBlendMode: 'overlay',
        opacity: 0.7 * lightLeakIntensity,
      },
    },
    context: {
      timing: {
        start: outgoingMedia.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'light-leak-1-move',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['light-leak-1'],
          ranges: [
            { key: 'translateX', val: '-50px', prog: 0 },
            { key: 'translateX', val: '100px', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7 * lightLeakIntensity, prog: 0.3 },
            { key: 'opacity', val: 0.7 * lightLeakIntensity, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const lightLeak2: RenderableComponentData = {
    id: 'light-leak-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(to right, transparent, rgba(255, 237, 213, ${0.6 * lightLeakIntensity}), transparent);"></div>`,
      className: 'absolute h-full w-12',
      style: {
        left: '40%',
        mixBlendMode: 'soft-light',
        opacity: 0.6 * lightLeakIntensity,
      },
    },
    context: {
      timing: {
        start: outgoingMedia.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'light-leak-2-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration * 0.8,
          mode: 'provider',
          targetIds: ['light-leak-2'],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '150px', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6 * lightLeakIntensity, prog: 0.2 },
            { key: 'opacity', val: 0.6 * lightLeakIntensity, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const lightLeak3: RenderableComponentData = {
    id: 'light-leak-3',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(to right, transparent, rgba(254, 252, 232, ${0.7 * lightLeakIntensity}), transparent);"></div>`,
      className: 'absolute h-full w-10',
      style: {
        left: '70%',
        mixBlendMode: 'overlay',
        opacity: 0.5 * lightLeakIntensity,
      },
    },
    context: {
      timing: {
        start: outgoingMedia.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'light-leak-3-move',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: ['light-leak-3'],
          ranges: [
            { key: 'translateX', val: '-100px', prog: 0 },
            { key: 'translateX', val: '50px', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5 * lightLeakIntensity, prog: 0.4 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Sprocket holes
  const sprocketLeft: RenderableComponentData = {
    id: 'sprocket-left',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 20px, transparent 20px, transparent 30px);"></div>`,
      className: 'absolute h-full w-6 left-0',
      style: {
        opacity: sprocketHoleOpacity,
      },
    },
    context: {
      timing: {
        start: outgoingMedia.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'sprocket-left-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['sprocket-left'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: sprocketHoleOpacity, prog: 0.3 },
            { key: 'opacity', val: sprocketHoleOpacity, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const sprocketRight: RenderableComponentData = {
    id: 'sprocket-right',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 20px, transparent 20px, transparent 30px);"></div>`,
      className: 'absolute h-full w-6 right-0',
      style: {
        opacity: sprocketHoleOpacity,
      },
    },
    context: {
      timing: {
        start: outgoingMedia.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'sprocket-right-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['sprocket-right'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: sprocketHoleOpacity, prog: 0.3 },
            { key: 'opacity', val: sprocketHoleOpacity, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vintage-projector-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingMediaContainer,
      incomingMediaContainer,
      lightLeak1,
      lightLeak2,
      lightLeak3,
      sprocketLeft,
      sprocketRight,
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
  id: 'vintage-projector-light-leak-transition',
  title: 'Vintage Projector Light Leak Transition',
  description:
    'A cinematic vintage film projector transition featuring vertical light leaks, film artifacts, flickering, and authentic analog effects. Creates an unstable projection aesthetic with light bleeding, saturation reduction, sprocket hole shadows, and subtle frame jitter during a 0.6s transition period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vintage',
    'projector',
    'film',
    'light-leak',
    'analog',
    'retro',
    'cinematic',
    'artifacts',
  ],
  defaultInputParams: {
    outgoingMedia: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingMedia: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 0.6,
    lightLeakIntensity: 0.7,
    filmArtifactIntensity: 0.8,
    jitterIntensity: 2,
    sprocketHoleOpacity: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vintageProjectorLightLeakTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
