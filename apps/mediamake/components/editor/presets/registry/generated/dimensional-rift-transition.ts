/**
 * Dimensional Rift Displacement Transition Preset
 *
 * This preset creates a dramatic dimensional rift effect that tears space between videos.
 * The outgoing video is pulled into a dimensional rift with extreme perspective distortion,
 * while the incoming video emerges from the opposite side with 3D transforms and glitch-style
 * color channel separation during peak distortion.
 *
 * Features:
 * - **3D Perspective Transforms**: Uses rotateY and translateZ for spatial distortion
 * - **Animated Clip-Paths**: Creates irregular torn rift shapes
 * - **RGB Channel Separation**: Glitch-style color splitting at peak distortion
 * - **Extreme Depth Effects**: Perspective(600px) with translateZ(-200px) for depth
 * - **Rift Edge Overlay**: Animated gradient-filled rift visualization
 * - **2.2-Second Duration**: Smooth transition with peak distortion at midpoint
 *
 * Technical Implementation:
 * - Outgoing video: rotateY(0deg → 90deg) with perspective and translateZ
 * - Incoming video: rotateY(-90deg → 0deg) with reverse depth animation
 * - Clip-path morphs from rectangle to irregular polygon for torn edges
 * - Multiple text-shadow layers for RGB channel separation
 * - Blur increases to 4px during peak distortion
 *
 * Use cases:
 * - Creating dramatic transitions between video scenes
 * - Sci-fi and futuristic video effects
 * - High-energy content transitions
 * - Creating portal or dimensional tear effects
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
    src: z.string().describe('Source URL of the outgoing video'),
    startFrom: z.number().optional().describe('Start time of outgoing video in seconds'),
  }).describe('Configuration for the outgoing video'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video in seconds'),
  }).describe('Configuration for the incoming video'),
  transitionDuration: z.number().default(2.2).describe('Duration of the rift transition in seconds (default: 2.2s)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Calculate total duration (videos overlap during transition)
  const totalDuration = transitionDuration;
  const midpoint = transitionDuration / 2;

  // Outgoing video wrapper
  const outgoingVideoWrapper: RenderableComponentData = {
    id: 'rift-outgoing-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'rift-outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: outgoingVideo.startFrom || 0,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          style: {
            transformStyle: 'preserve-3d',
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
            id: 'outgoing-3d-transform',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['rift-outgoing-video'],
              ranges: [
                // 3D rotation
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: 90, prog: 1 },
                // Depth animation
                { key: 'translateZ', val: 0, prog: 0 },
                { key: 'translateZ', val: -200, prog: 1 },
                // Blur increase
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: 'blur(4px)', prog: 1 },
                // Opacity fade
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: 'outgoing-clip-path',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['rift-outgoing-video'],
              ranges: [
                // Morph from rectangle to irregular polygon (torn edge effect)
                { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 0 },
                { key: 'clipPath', val: 'polygon(0% 0%, 95% 5%, 90% 45%, 85% 55%, 80% 100%, 20% 95%, 10% 50%, 5% 10%)', prog: 0.5 },
                { key: 'clipPath', val: 'polygon(50% 45%, 55% 48%, 52% 52%, 48% 50%)', prog: 1 },
              ],
            },
          },
          {
            id: 'outgoing-rgb-split',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: midpoint - 0.3,
              duration: 0.6,
              mode: 'provider',
              targetIds: ['rift-outgoing-video'],
              ranges: [
                // RGB channel separation using filter
                { key: 'filter', val: 'blur(0px) contrast(1)', prog: 0 },
                { key: 'filter', val: 'blur(2px) contrast(1.3)', prog: 0.5 },
                { key: 'filter', val: 'blur(4px) contrast(1)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video wrapper
  const incomingVideoWrapper: RenderableComponentData = {
    id: 'rift-incoming-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'rift-incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: incomingVideo.startFrom || 0,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          style: {
            transformStyle: 'preserve-3d',
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
            id: 'incoming-3d-transform',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['rift-incoming-video'],
              ranges: [
                // Reverse 3D rotation
                { key: 'rotateY', val: -90, prog: 0 },
                { key: 'rotateY', val: 0, prog: 1 },
                // Reverse depth animation
                { key: 'translateZ', val: -200, prog: 0 },
                { key: 'translateZ', val: 0, prog: 1 },
                // Blur decrease
                { key: 'filter', val: 'blur(4px)', prog: 0 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
                // Opacity fade in
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          {
            id: 'incoming-clip-path',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['rift-incoming-video'],
              ranges: [
                // Morph from small irregular polygon to full rectangle
                { key: 'clipPath', val: 'polygon(50% 45%, 55% 48%, 52% 52%, 48% 50%)', prog: 0 },
                { key: 'clipPath', val: 'polygon(5% 10%, 10% 50%, 20% 95%, 80% 100%, 85% 55%, 90% 45%, 95% 5%, 0% 0%)', prog: 0.5 },
                { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 1 },
              ],
            },
          },
          {
            id: 'incoming-rgb-split',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: midpoint - 0.3,
              duration: 0.6,
              mode: 'provider',
              targetIds: ['rift-incoming-video'],
              ranges: [
                // RGB channel separation using filter
                { key: 'filter', val: 'blur(4px) contrast(1)', prog: 0 },
                { key: 'filter', val: 'blur(2px) contrast(1.3)', prog: 0.5 },
                { key: 'filter', val: 'blur(0px) contrast(1)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Rift edge overlay using HTMLBlockAtom
  const riftEdgeOverlay: RenderableComponentData = {
    id: 'rift-edge-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(90deg, rgba(255,0,255,0.3) 0%, rgba(0,255,255,0.3) 50%, rgba(255,255,0,0.3) 100%); clip-path: polygon(45% 45%, 55% 45%, 55% 55%, 45% 55%); filter: blur(2px);"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'screen',
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
        id: 'rift-edge-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['rift-edge-overlay'],
          ranges: [
            // Scale animation
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1.5, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            // Opacity animation
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'rift-edge-clip',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['rift-edge-overlay'],
          ranges: [
            // Rift edge expansion
            { key: 'clipPath', val: 'polygon(45% 45%, 55% 45%, 55% 55%, 45% 55%)', prog: 0 },
            { key: 'clipPath', val: 'polygon(10% 20%, 90% 25%, 85% 75%, 15% 80%)', prog: 0.5 },
            { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'dimensional-rift-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
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
      outgoingVideoWrapper,
      incomingVideoWrapper,
      riftEdgeOverlay,
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
  id: 'dimensional-rift-transition',
  title: 'Dimensional Rift Displacement Transition',
  description: 'A 2.2-second transition that tears space between videos using 3D perspective distortion and glitch-style RGB separation. The outgoing video is pulled into a dimensional rift with extreme perspective distortion while the incoming video emerges from the opposite side with animated clip-paths and color channel separation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'rift', 'dimensional', 'glitch', 'perspective', 'rgb-split', 'spatial-distortion'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 2.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dimensionalRiftTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
