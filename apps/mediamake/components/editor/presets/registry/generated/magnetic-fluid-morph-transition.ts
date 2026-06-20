/**
 * Magnetic Fluid Morph Transition Preset
 *
 * This preset creates a ferrofluid-inspired transition effect between two videos.
 * The outgoing video breaks apart into blob-like shapes that gravitate toward edges,
 * while the incoming video coalesces from the center. Features:
 *
 * - **Blob Morphing**: clip-path polygon animations create fluid blob effects
 * - **Turbulence Distortion**: skewX/skewY oscillations simulate magnetic interference
 * - **Metallic Sheen**: Pulsing contrast and brightness filters
 * - **1.8s Overlap**: Precise timing for seamless morph transition
 *
 * Technical Implementation:
 * - Outgoing video: clip-path morphs from rectangle to irregular blobs, skew oscillates ±5deg,
 *   contrast 100%→150%→0%, brightness pulses, opacity fades to 0
 * - Incoming video: clip-path from circle(10%) to full rectangle, scale 0.5→1,
 *   brightness 150%→100%
 * - Both videos start 1.8s before transition completes for overlap
 *
 * Use cases:
 * - Creative video transitions with organic, fluid feel
 * - Sci-fi or abstract visual effects
 * - Dynamic content switches with high visual impact
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
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    startFrom: z.number().optional().describe('Start time of outgoing video (seconds)'),
    endAt: z.number().optional().describe('End time of outgoing video (seconds)'),
    volume: z.number().min(0).max(1).default(1).describe('Volume level (0-1)'),
    muted: z.boolean().default(false).describe('Whether to mute the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video (seconds)'),
  }).describe('Configuration for the outgoing video'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video (seconds)'),
    endAt: z.number().optional().describe('End time of incoming video (seconds)'),
    volume: z.number().min(0).max(1).default(1).describe('Volume level (0-1)'),
    muted: z.boolean().default(false).describe('Whether to mute the incoming video'),
    duration: z.number().describe('Duration of the incoming video (seconds)'),
  }).describe('Configuration for the incoming video'),
  
  transitionDuration: z.number().default(1.8).describe('Duration of the transition overlap (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;
  
  // Calculate total composition duration (accounting for overlap)
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;
  
  // Timing for incoming video (starts before outgoing ends)
  const incomingStartTime = outgoingVideo.duration - transitionDuration;
  
  // Create outgoing video with morph effects
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom,
      endAt: outgoingVideo.endAt,
      volume: outgoingVideo.volume,
      muted: outgoingVideo.muted,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        inset: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Blob morph effect (clip-path animation)
      {
        id: 'outgoing-blob-morph',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Start: full rectangle
            { key: 'clipPath', val: 'inset(0)', prog: 0 },
            // Mid: irregular blob shapes (gravitating toward edges)
            { key: 'clipPath', val: 'polygon(0% 20%, 15% 0%, 85% 0%, 100% 30%, 100% 70%, 80% 100%, 20% 100%, 0% 80%)', prog: 0.5 },
            // End: fragmented blobs at edges
            { key: 'clipPath', val: 'polygon(0% 0%, 10% 0%, 5% 10%, 0% 10%, 90% 0%, 100% 0%, 100% 15%, 95% 5%)', prog: 1 },
          ],
        },
      },
      // Turbulence effect (skew oscillation)
      {
        id: 'outgoing-turbulence',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'skewX', val: '0deg', prog: 0 },
            { key: 'skewX', val: '5deg', prog: 0.15 },
            { key: 'skewX', val: '-5deg', prog: 0.35 },
            { key: 'skewX', val: '3deg', prog: 0.55 },
            { key: 'skewX', val: '-3deg', prog: 0.75 },
            { key: 'skewX', val: '0deg', prog: 1 },
            { key: 'skewY', val: '0deg', prog: 0 },
            { key: 'skewY', val: '-4deg', prog: 0.2 },
            { key: 'skewY', val: '4deg', prog: 0.4 },
            { key: 'skewY', val: '-2deg', prog: 0.6 },
            { key: 'skewY', val: '2deg', prog: 0.8 },
            { key: 'skewY', val: '0deg', prog: 1 },
          ],
        },
      },
      // Metallic sheen (contrast + brightness pulse)
      {
        id: 'outgoing-sheen',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Contrast animation
            { key: 'filter', val: 'contrast(100%) brightness(100%)', prog: 0 },
            { key: 'filter', val: 'contrast(150%) brightness(120%)', prog: 0.3 },
            { key: 'filter', val: 'contrast(130%) brightness(110%)', prog: 0.5 },
            { key: 'filter', val: 'contrast(80%) brightness(90%)', prog: 0.7 },
            { key: 'filter', val: 'contrast(0%) brightness(50%)', prog: 1 },
          ],
        },
      },
      // Fade out (opacity)
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
            { key: 'opacity', val: 0.8, prog: 0.3 },
            { key: 'opacity', val: 0.4, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };
  
  // Create incoming video with coalesce effects
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom,
      endAt: incomingVideo.endAt,
      volume: incomingVideo.volume,
      muted: incomingVideo.muted,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        inset: 0,
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingVideo.duration,
      },
    },
    effects: [
      // Coalesce effect (clip-path from circle to rectangle)
      {
        id: 'incoming-coalesce',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            // Start: small circle at center
            { key: 'clipPath', val: 'circle(10% at 50% 50%)', prog: 0 },
            // Mid: expanding circle
            { key: 'clipPath', val: 'circle(40% at 50% 50%)', prog: 0.4 },
            // Near end: merging into rectangle
            { key: 'clipPath', val: 'inset(5% 5% 5% 5% round 20px)', prog: 0.7 },
            // End: full rectangle
            { key: 'clipPath', val: 'inset(0)', prog: 1 },
          ],
        },
      },
      // Scale effect (starts small, grows to full)
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 0.8, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Brightness effect (starts bright, normalizes)
      {
        id: 'incoming-brightness',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'brightness(150%)', prog: 0 },
            { key: 'filter', val: 'brightness(120%)', prog: 0.4 },
            { key: 'filter', val: 'brightness(100%)', prog: 1 },
          ],
        },
      },
    ],
  };
  
  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'magnetic-fluid-morph-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
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
    childrenData: [outgoingVideoNode, incomingVideoNode] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'magnetic-fluid-morph-transition',
  title: 'Magnetic Fluid Morph Transition',
  description: 'A ferrofluid-inspired transition where videos break apart into blob-like shapes that gravitate toward edges (outgoing) and coalesce from center (incoming). Features clip-path polygon morphing, turbulence-like skew oscillations, and metallic sheen effects with pulsing contrast/brightness during the 1.8s overlap.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'ferrofluid', 'magnetic', 'morph', 'blob', 'fluid', 'organic', 'sci-fi'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      volume: 1,
      muted: false,
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      volume: 1,
      muted: false,
      duration: 10,
    },
    transitionDuration: 1.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const magneticFluidMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
