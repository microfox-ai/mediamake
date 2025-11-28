/**
 * Chemical Fade Transition Preset
 *
 * Mimics the look of film stock that has been chemically treated or partially developed,
 * creating organic, unpredictable fade patterns between shots. Features irregular color 
 * shifts from chemical reactions, solarization effects where parts of the image invert, 
 * and organic blob-like shapes where chemicals have pooled or reacted differently across 
 * the film surface.
 *
 * Features:
 * - Realistic color degradation (cyans fading first, then magentas, leaving yellow-orange cast)
 * - Solarization effects with invert filter animating in waves
 * - Organic blob-like shapes with difference/exclusion blend modes
 * - Chemical pooling overlays with radial gradients
 * - Edge burn patterns with feathered masks
 * - 2-second overlap transition period
 *
 * Use cases:
 * - Artistic film-to-digital transitions
 * - Vintage analog film effects
 * - Experimental video transitions
 * - Music videos with retro aesthetic
 * - Creative storytelling with chemical processing metaphors
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of transition overlap in seconds (default: 2s)'),
  chemicalIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity of chemical effects (0 = subtle, 1 = normal, 2 = extreme)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, chemicalIntensity } = params;

  // Calculate timing
  const baseLayoutDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;
  const incomingStartTime = outgoingVideo.duration - transitionDuration;

  // Chemical effect parameters based on intensity
  const intensity = chemicalIntensity ?? 1;
  const blobOpacity = 0.3 * intensity;
  const poolingOpacity = 0.25 * intensity;
  const solarizationStrength = 50 * intensity;

  const childrenData: RenderableComponentData[] = [];

  // ============================
  // Outgoing Video with Chemical Degradation
  // ============================
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Color degradation: Red channel fades first (cyans), then green (magentas), leaving yellow-orange
      {
        id: 'color-degradation',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Cyan fades (reduce red and green, keep blue)
            { key: 'filter', val: 'sepia(0%) saturate(100%) hue-rotate(0deg) brightness(1)', prog: 0 },
            { key: 'filter', val: 'sepia(20%) saturate(80%) hue-rotate(10deg) brightness(0.9)', prog: 0.3 },
            // Magenta shifts (reduce green more)
            { key: 'filter', val: 'sepia(40%) saturate(60%) hue-rotate(20deg) brightness(0.7)', prog: 0.6 },
            // Yellow-orange cast remains
            { key: 'filter', val: 'sepia(60%) saturate(40%) hue-rotate(30deg) brightness(0.5)', prog: 1 },
          ],
        },
      },
      // Opacity fade out
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Solarization wave effect (invert filter)
      {
        id: 'solarization',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration * 0.6,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'invert(0%)', prog: 0 },
            { key: 'filter', val: `invert(${solarizationStrength}%)`, prog: 0.5 },
            { key: 'filter', val: 'invert(0%)', prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(outgoingVideoNode);

  // ============================
  // Incoming Video with Chemical Fog
  // ============================
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      // Initial color cast (sepia + high saturation)
      {
        id: 'initial-color-cast',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'sepia(30%) saturate(150%) brightness(0.8)', prog: 0 },
            { key: 'filter', val: 'sepia(0%) saturate(100%) brightness(1)', prog: 1 },
          ],
        },
      },
      // Opacity fade in
      {
        id: 'incoming-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(incomingVideoNode);

  // ============================
  // Chemical Blob Masks (3 organic blobs)
  // ============================
  const blob1: RenderableComponentData = {
    id: 'chemical-blob-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 300px; height: 300px; border-radius: 47% 53% 42% 58% / 53% 45% 55% 47%; background: radial-gradient(circle, rgba(255,100,150,${blobOpacity * 1.5}) 0%, rgba(100,50,200,${blobOpacity}) 100%);"></div>`,
      className: 'absolute',
      style: {
        top: '10%',
        left: '20%',
        mixBlendMode: 'difference',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'blob1-animation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['chemical-blob-1'],
          ranges: [
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1.2, prog: 0.5 },
            { key: 'scale', val: 0.8, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const blob2: RenderableComponentData = {
    id: 'chemical-blob-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 250px; height: 250px; border-radius: 38% 62% 55% 45% / 48% 59% 41% 52%; background: radial-gradient(circle, rgba(0,200,255,${blobOpacity * 1.2}) 0%, rgba(150,100,255,${blobOpacity}) 100%);"></div>`,
      className: 'absolute',
      style: {
        bottom: '15%',
        right: '25%',
        mixBlendMode: 'exclusion',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'blob2-animation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['chemical-blob-2'],
          ranges: [
            { key: 'scale', val: 0.7, prog: 0 },
            { key: 'scale', val: 1, prog: 0.6 },
            { key: 'scale', val: 0.5, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const blob3: RenderableComponentData = {
    id: 'chemical-blob-3',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 350px; height: 200px; border-radius: 42% 58% 65% 35% / 60% 45% 55% 40%; background: radial-gradient(ellipse, rgba(255,200,50,${blobOpacity}) 0%, rgba(255,100,100,${blobOpacity * 0.7}) 100%);"></div>`,
      className: 'absolute',
      style: {
        top: '50%',
        right: '10%',
        mixBlendMode: 'difference',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'blob3-animation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['chemical-blob-3'],
          ranges: [
            { key: 'scale', val: 0.6, prog: 0 },
            { key: 'scale', val: 1.3, prog: 0.4 },
            { key: 'scale', val: 0.7, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.25 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(blob1, blob2, blob3);

  // ============================
  // Chemical Pooling Overlays (2 radial gradients)
  // ============================
  const pooling1: RenderableComponentData = {
    id: 'chemical-pooling-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 400px; height: 400px; background: radial-gradient(circle at 30% 40%, rgba(0,255,255,${poolingOpacity * 1.5}) 0%, transparent 60%); filter: blur(0px);"></div>`,
      className: 'absolute',
      style: {
        top: '20%',
        left: '10%',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'pooling1-animation',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['chemical-pooling-1'],
          ranges: [
            { key: 'filter', val: 'blur(20px)', prog: 0 },
            { key: 'filter', val: 'blur(5px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const pooling2: RenderableComponentData = {
    id: 'chemical-pooling-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 500px; height: 500px; background: radial-gradient(circle at 70% 60%, rgba(255,0,255,${poolingOpacity}) 0%, transparent 65%); filter: blur(0px);"></div>`,
      className: 'absolute',
      style: {
        bottom: '10%',
        right: '15%',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'pooling2-animation',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['chemical-pooling-2'],
          ranges: [
            { key: 'filter', val: 'blur(25px)', prog: 0 },
            { key: 'filter', val: 'blur(8px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.4 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(pooling1, pooling2);

  // ============================
  // Edge Burn Effects (feathered masks)
  // ============================
  const edgeBurnTop: RenderableComponentData = {
    id: 'edge-burn-top',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 80px; background: linear-gradient(180deg, rgba(0,0,0,${0.4 * intensity}) 0%, transparent 100%);"></div>`,
      className: 'absolute top-0 left-0',
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'edge-burn-top-animation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['edge-burn-top'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const edgeBurnBottom: RenderableComponentData = {
    id: 'edge-burn-bottom',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 80px; background: linear-gradient(0deg, rgba(0,0,0,${0.4 * intensity}) 0%, transparent 100%);"></div>`,
      className: 'absolute bottom-0 left-0',
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'edge-burn-bottom-animation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['edge-burn-bottom'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(edgeBurnTop, edgeBurnBottom);

  // ============================
  // Root Container
  // ============================
  const rootContainer: RenderableComponentData = {
    id: 'chemical-fade-transition-root',
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
  id: 'chemical-fade-transition',
  title: 'Chemical Fade Transition',
  description:
    'A cinematic transition mimicking chemical film processing with organic color degradation, solarization effects, chemical blob masks, and unpredictable fade patterns. Features realistic color channel degradation (cyan→magenta→yellow), chemical pooling overlays, and edge burn effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'chemical',
    'film',
    'analog',
    'vintage',
    'organic',
    'solarization',
    'color-degradation',
    'artistic',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2,
    chemicalIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const chemicalFadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
