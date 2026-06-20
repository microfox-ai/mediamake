/**
 * Watercolor Brush Transition Preset
 *
 * This preset creates a beautiful watercolor painting transition effect that simulates
 * wet paint bleeding and blending between two video clips. The transition mimics the organic
 * flow of watercolor paint on textured paper in time-lapse, with the following features:
 *
 * Features:
 * - **Wet Brush Strokes**: Multiple expanding radial gradient masks that simulate wet paint spreading
 * - **Color Bleeding**: Natural color mixing at transition boundaries using multiply blend mode
 * - **Paper Texture Overlay**: Textured paper overlay with overlay blend mode for authenticity
 * - **Water Droplets**: Animated water droplets with backdrop blur that appear and fade
 * - **Chromatic Aberration**: RGB channel separation at wet edges for realistic paint flow
 * - **Progressive Blur**: Blur transitions that simulate paint diffusion
 * - **Color Bleed Overlay**: Radial gradient overlay that enhances the watercolor bleeding effect
 *
 * Technical Implementation:
 * - Two VideoAtom components with multiply blend mode for natural color mixing
 * - Multiple animated mask layers using radial gradients with screen blend mode
 * - Water droplets with scale and opacity animations
 * - Chromatic aberration layers with slight translateX offsets and hue rotation
 * - Paper texture overlay with overlay blend mode
 * - Progressive blur effects on both video layers during transition
 * - All animations use provider mode with targetIds for clean DOM structure
 *
 * Use Cases:
 * - Creating artistic transitions between video clips
 * - Adding painterly effects to video content
 * - Building elegant scene transitions
 * - Creating watercolor-style video presentations
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
    src: z.string().describe('Source URL of the first video clip'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video clip (outgoing)'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the second video clip'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video clip (incoming)'),
  
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of the watercolor transition effect in seconds'),
  
  paperTexture: z
    .string()
    .optional()
    .describe('Optional paper texture image URL for overlay effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, paperTexture } = params;

  // Calculate BaseLayout duration (with overlap)
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Transition start time for incoming video
  const incomingStart = outgoingVideo.duration - transitionDuration;

  // Build child components
  const childrenData: RenderableComponentData[] = [];

  // Paper texture overlay (if provided)
  if (paperTexture) {
    childrenData.push({
      id: 'paper-texture-overlay',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: paperTexture,
        className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
          opacity: 0.3,
          zIndex: 50,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
    } as RenderableComponentData);
  }

  // Outgoing video layer
  childrenData.push({
    id: 'outgoing-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      muted: true,
      style: {
        mixBlendMode: 'multiply',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Fade out during transition
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Progressive blur during transition
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(8px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Incoming video layer
  childrenData.push({
    id: 'incoming-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      muted: true,
      style: {
        mixBlendMode: 'multiply',
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      // Fade in during transition
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Progressive blur during transition
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'filter', val: 'blur(8px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Brush mask layers (3 overlapping radial gradients)
  const brushMasks = [
    {
      id: 'brush-mask-1',
      width: '120%',
      height: '120%',
      top: '-10%',
      left: '-10%',
      gradient: 'radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 40%, transparent 70%)',
      delay: 0,
    },
    {
      id: 'brush-mask-2',
      width: '100%',
      height: '100%',
      top: '0%',
      left: '0%',
      gradient: 'radial-gradient(ellipse at 30% 70%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 50%, transparent 75%)',
      delay: 0.1,
    },
    {
      id: 'brush-mask-3',
      width: '140%',
      height: '80%',
      top: '10%',
      left: '-20%',
      gradient: 'radial-gradient(ellipse at 70% 40%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 45%, transparent 70%)',
      delay: 0.2,
    },
  ];

  brushMasks.forEach((mask) => {
    childrenData.push({
      id: mask.id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute rounded-full pointer-events-none',
          style: {
            width: mask.width,
            height: mask.height,
            top: mask.top,
            left: mask.left,
            background: mask.gradient,
            mixBlendMode: 'screen',
            transform: 'scale(0.5)',
            opacity: 0,
            zIndex: 20,
          },
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
          id: `${mask.id}-expand`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: mask.delay,
            duration: transitionDuration - mask.delay,
            mode: 'provider',
            targetIds: [mask.id],
            ranges: [
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 2, prog: 1 },
            ],
          },
        },
        {
          id: `${mask.id}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: mask.delay,
            duration: transitionDuration - mask.delay,
            mode: 'provider',
            targetIds: [mask.id],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 0.8, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  });

  // Water droplets (8 droplets with staggered animations)
  const waterDroplets = [
    { id: 'droplet-1', top: '15%', left: '20%', size: 30, delay: 0.2 },
    { id: 'droplet-2', top: '35%', left: '70%', size: 20, delay: 0.4 },
    { id: 'droplet-3', top: '60%', left: '40%', size: 25, delay: 0.6 },
    { id: 'droplet-4', top: '80%', left: '25%', size: 18, delay: 0.8 },
    { id: 'droplet-5', top: '45%', left: '85%', size: 22, delay: 1.0 },
    { id: 'droplet-6', top: '25%', left: '55%', size: 28, delay: 0.3 },
    { id: 'droplet-7', top: '70%', left: '65%', size: 24, delay: 0.5 },
    { id: 'droplet-8', top: '50%', left: '15%', size: 26, delay: 0.7 },
  ];

  waterDroplets.forEach((droplet) => {
    childrenData.push({
      id: droplet.id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute rounded-full pointer-events-none',
          style: {
            width: `${droplet.size}px`,
            height: `${droplet.size}px`,
            top: droplet.top,
            left: droplet.left,
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(4px)',
            transform: 'scale(0)',
            opacity: 0,
            zIndex: 30,
          },
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
          id: `${droplet.id}-scale`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: droplet.delay,
            duration: 0.8,
            mode: 'provider',
            targetIds: [droplet.id],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1.0, prog: 1 },
            ],
          },
        },
        {
          id: `${droplet.id}-opacity`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: droplet.delay,
            duration: 0.8,
            mode: 'provider',
            targetIds: [droplet.id],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  });

  // Chromatic aberration layers (red and blue channel separation)
  // Red channel (left shift)
  childrenData.push({
    id: 'chromatic-red-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
      fit: 'cover',
      muted: true,
      style: {
        mixBlendMode: 'screen',
        opacity: 0,
        transform: 'translateX(-2px)',
        filter: 'saturate(1.5) hue-rotate(-10deg)',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'chromatic-red-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionDuration * 0.5,
          duration: 0.6,
          mode: 'provider',
          targetIds: ['chromatic-red-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.15, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Blue channel (right shift)
  childrenData.push({
    id: 'chromatic-blue-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
      fit: 'cover',
      muted: true,
      style: {
        mixBlendMode: 'screen',
        opacity: 0,
        transform: 'translateX(2px)',
        filter: 'saturate(1.5) hue-rotate(10deg)',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'chromatic-blue-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionDuration * 0.5,
          duration: 0.6,
          mode: 'provider',
          targetIds: ['chromatic-blue-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.15, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Color bleed overlay
  childrenData.push({
    id: 'color-bleed-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(255,248,240,0.15) 70%, rgba(255,248,240,0.3) 100%)',
          mixBlendMode: 'overlay',
          opacity: 0,
          zIndex: 15,
        },
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
        id: 'color-bleed-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['color-bleed-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  } as RenderableComponentData);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#f5f3ef',
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
  id: 'watercolor-brush-transition',
  title: 'Watercolor Brush Transition',
  description: 'A watercolor brush transition effect that simulates wet paint bleeding and blending between two video clips. Features organic brush stroke masks that expand and merge, water droplet effects with backdrop blur, paper texture overlay, color bleeding at transition boundaries, and subtle chromatic aberration at wet edges. The transition mimics time-lapse watercolor painting on textured paper with natural color mixing and spreading effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'watercolor', 'artistic', 'painterly', 'organic', 'bleeding', 'paper-texture'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.8,
    paperTexture: 'https://example.com/paper-texture.jpg',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const watercolorBrushTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};