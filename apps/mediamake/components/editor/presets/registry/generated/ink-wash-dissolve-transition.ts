/**
 * Ink Wash Dissolve Transition Preset
 *
 * A watercolor-inspired video transition where ink drops spread organically across the frame,
 * blending the outgoing video through wet-on-wet paint effects while revealing the incoming
 * video through translucent paint layers.
 *
 * Features:
 * - **Organic Ink Flow**: 6 ink drop origins that expand and merge with randomized timing
 * - **Wet-on-Wet Technique**: Simulates watercolor bleeding with color-burn blend modes
 * - **Paint Layer Blending**: Incoming video emerges through translucent layers using lighten mode
 * - **Color Mixing Effects**: Subtle color shifts in transition areas simulate paint mixing
 * - **Edge Distortion**: SVG turbulence filter creates organic, unpredictable shapes
 * - **Long Overlap**: 2.5-second transition duration for gradual paint flow
 * - **GPU Acceleration**: Uses transform scale3d for smooth animations
 *
 * Use cases:
 * - Creating artistic transitions between video clips
 * - Adding watercolor aesthetics to video content
 * - Building organic, painterly visual effects
 * - Transitioning between scenes with artistic flair
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
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Configuration for the outgoing video'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Configuration for the incoming video'),
  transitionDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Duration of the transition overlap in seconds'),
  inkDropCount: z
    .number()
    .int()
    .min(3)
    .max(10)
    .default(6)
    .describe('Number of ink drop origins (3-10)'),
  turbulenceIntensity: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Intensity of edge distortion (5-30)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, inkDropCount, turbulenceIntensity } = params;

  // Calculate total duration: sum of video durations minus overlap
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Generate random positions for ink drops
  const generateInkDropPositions = (count: number) => {
    const positions: Array<{ top: number; left: number; size: number; scale: number; delay: number }> = [];
    
    for (let i = 0; i < count; i++) {
      positions.push({
        top: Math.random() * 80 + 10, // 10-90%
        left: Math.random() * 80 + 10, // 10-90%
        size: Math.random() * 20 + 40, // 40-60px
        scale: Math.random() * 20 + 20, // 20-40x scale
        delay: Math.random() * 200 + 100, // 100-300ms
      });
    }
    
    return positions;
  };

  const inkDrops = generateInkDropPositions(inkDropCount);

  // Create ink drop components
  const inkDropChildren: RenderableComponentData[] = inkDrops.map((drop, index) => ({
    id: `ink-drop-${index}`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute rounded-full',
        style: {
          top: `${drop.top}%`,
          left: `${drop.left}%`,
          width: `${drop.size}px`,
          height: `${drop.size}px`,
          background: `radial-gradient(circle, rgba(${20 + index * 3},${20 + index * 2},${40 + index * 5},0.9) 0%, rgba(${40 + index * 3},${30 + index * 2},${60 + index * 5},0.7) 40%, transparent 70%)`,
          mixBlendMode: 'color-burn',
          zIndex: 10,
          filter: 'url(#turbulence)',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: `ink-drop-expand-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: drop.delay / 1000, // Convert ms to seconds
          duration: transitionDuration - (drop.delay / 1000),
          mode: 'provider',
          targetIds: [`ink-drop-${index}`],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: drop.scale, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  }));

  // SVG turbulence filter
  const svgFilter: RenderableComponentData = {
    id: 'svg-turbulence-filter',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg style="position:absolute;width:0;height:0"><defs><filter id="turbulence" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" seed="42"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${turbulenceIntensity}" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Outgoing video
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Contrast increase
      {
        id: 'outgoing-contrast',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'contrast(1) saturate(1)', prog: 0 },
            { key: 'filter', val: 'contrast(1.5) saturate(0)', prog: 1 },
          ],
        },
      },
      // Opacity fade out
      {
        id: 'outgoing-opacity',
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
    ],
  };

  // Incoming video
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        zIndex: 2,
        mixBlendMode: 'lighten',
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      // Contrast animation
      {
        id: 'incoming-contrast',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'contrast(0.5)', prog: 0 },
            { key: 'filter', val: 'contrast(1)', prog: 1 },
          ],
        },
      },
      // Opacity fade in
      {
        id: 'incoming-opacity',
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

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'ink-wash-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
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
      svgFilter,
      outgoingVideoNode,
      incomingVideoNode,
      ...inkDropChildren,
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
  id: 'ink-wash-dissolve-transition',
  title: 'Ink Wash Dissolve Transition',
  description:
    'A watercolor-inspired video transition where ink drops spread organically across the frame, blending the outgoing video through wet-on-wet paint effects while revealing the incoming video through translucent paint layers. Features 6 ink drop origins with staggered animations, color-burn blend modes, SVG turbulence for organic edge distortion, and a 2.5-second overlap for gradual paint flow.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'ink',
    'watercolor',
    'paint',
    'artistic',
    'organic',
    'dissolve',
    'blend',
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
    transitionDuration: 2.5,
    inkDropCount: 6,
    turbulenceIntensity: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const inkWashDissolveTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
