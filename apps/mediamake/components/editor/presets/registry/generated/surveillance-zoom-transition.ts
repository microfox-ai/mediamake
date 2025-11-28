/**
 * Surveillance Camera Lens Zoom Transition
 *
 * A surveillance camera-inspired lens zoom transition with glitch distortion effects. Features staggered 
 * snap-zoom movements with quick jumps followed by slow drift, RGB chromatic aberration, scan lines, 
 * and digital noise. The incoming video appears through a hexagonal iris pattern simulating camera 
 * aperture blades.
 *
 * Features:
 * - Staggered snap-zoom effect with keyframe-based scale animations
 * - RGB splitting using drop-shadow filters for chromatic aberration
 * - Glitch effect using skewX transform with random values
 * - Hexagonal iris pattern for incoming video using clip-path polygon
 * - CSS scan lines overlay using repeating-linear-gradient
 * - Digital noise via SVG filter with feTurbulence
 * - Intensity-based noise animation during zoom movements
 * - 3.5s overlap period for transition
 *
 * Use cases:
 * - Thriller and suspense content
 * - Security footage style transitions
 * - Tech-themed videos
 * - Surveillance camera simulations
 * - Glitch art projects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  overlapDuration: z.number().default(3.5).describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, overlapDuration } = params;

  // Calculate BaseLayout duration
  const baseLayoutDuration = outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Calculate transition start time
  const transitionStart = outgoingVideo.duration - overlapDuration;

  // Outgoing video container with zoom and glitch effects
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
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
        duration: outgoingVideo.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Snap-zoom effect
      {
        id: 'zoom-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: outgoingVideo.duration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 2, prog: 0.2 },
            { key: 'scale', val: 1.8, prog: 0.21 },
            { key: 'scale', val: 3, prog: 0.5 },
            { key: 'scale', val: 2.7, prog: 0.51 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Opacity fade during overlap
      {
        id: 'outgoing-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
      // RGB split effect at zoom keyframes
      {
        id: 'rgb-split',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: outgoingVideo.duration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'filter', val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)', prog: 0 },
            { key: 'filter', val: 'drop-shadow(2px 0 0 red) drop-shadow(-2px 0 0 cyan)', prog: 0.2 },
            { key: 'filter', val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)', prog: 0.25 },
            { key: 'filter', val: 'drop-shadow(3px 0 0 red) drop-shadow(-3px 0 0 cyan)', prog: 0.5 },
            { key: 'filter', val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)', prog: 0.55 },
            { key: 'filter', val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)', prog: 1 },
          ],
        },
      },
      // Glitch skew effect at zoom keyframes
      {
        id: 'glitch-skew',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: outgoingVideo.duration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'skewX', val: '0deg', prog: 0 },
            { key: 'skewX', val: '5deg', prog: 0.2 },
            { key: 'skewX', val: '0deg', prog: 0.21 },
            { key: 'skewX', val: '-3deg', prog: 0.5 },
            { key: 'skewX', val: '0deg', prog: 0.51 },
            { key: 'skewX', val: '0deg', prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video container with hexagonal iris effect
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: incomingVideo.duration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideo.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Opacity fade in during overlap
      {
        id: 'incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Hexagonal iris effect
      {
        id: 'hexagonal-iris',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { 
              key: 'clipPath', 
              val: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)', 
              prog: 0 
            },
            { 
              key: 'clipPath', 
              val: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)', 
              prog: 1 
            },
          ],
        },
      },
    ],
  };

  // Scan lines overlay
  const scanLinesOverlay: RenderableComponentData = {
    id: 'scan-lines-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px); pointer-events: none; z-index: 10;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
  };

  // Digital noise overlay with SVG filter
  const digitalNoiseOverlay: RenderableComponentData = {
    id: 'digital-noise-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 11; opacity: 0.15;"><filter id="noise-filter"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#noise-filter)"/></svg>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        zIndex: 11,
        opacity: 0.15,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    effects: [
      // Noise intensity animation during zoom movements
      {
        id: 'noise-intensity',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: baseLayoutDuration,
          mode: 'provider',
          targetIds: ['digital-noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0.15, prog: 0 },
            { key: 'opacity', val: 0.4, prog: 0.2 },
            { key: 'opacity', val: 0.15, prog: 0.25 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 0.15, prog: 0.55 },
            { key: 'opacity', val: 0.15, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'surveillance-zoom-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-gray-900 w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingVideoContainer,
      incomingVideoContainer,
      scanLinesOverlay,
      digitalNoiseOverlay,
    ] as RenderableComponentData[],
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
  id: 'surveillance-zoom-transition',
  title: 'Surveillance Camera Zoom Transition',
  description: 'A surveillance camera-inspired lens zoom transition with glitch distortion effects. Features staggered snap-zoom movements with quick jumps followed by slow drift, RGB chromatic aberration, scan lines, and digital noise. The incoming video appears through a hexagonal iris pattern simulating camera aperture blades. Perfect for thriller, security footage, or tech-themed content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'surveillance', 'zoom', 'glitch', 'camera', 'security', 'rgb-split', 'hexagonal', 'iris', 'digital-noise', 'scan-lines'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    overlapDuration: 3.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const surveillanceZoomTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};