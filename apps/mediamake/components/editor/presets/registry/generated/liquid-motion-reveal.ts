/**
 * Liquid Motion Reveal Transition Preset
 *
 * A fluid transition effect where the main video appears to melt and flow like liquid mercury 
 * to the corner while b-roll emerges from underneath. Features organic wave-like distortion 
 * simulated through blur and scale effects, refractive glass-like edges during the flow animation, 
 * and a subtle wobble settle effect like a water droplet coming to rest.
 *
 * Features:
 * - **Liquid Flow Animation**: Main video flows to corner with mercury-like motion
 * - **Organic Distortion**: Wave-like ripples simulated through blur and scale effects
 * - **B-Roll Reveal**: Secondary content emerges from underneath with complementary effects
 * - **Glass Edge Effects**: Refractive glass-like edges during the flow animation
 * - **Wobble Settle**: Subtle oscillation effect like a water droplet coming to rest
 * - **Configurable Positioning**: Control corner position and scale of settled video
 * - **Adjustable Timing**: Customize flow duration and wobble settle timing
 *
 * Use cases:
 * - Creating elegant video-to-PIP transitions
 * - Revealing secondary content with organic motion
 * - Adding high-end polish to video compositions
 * - Building fluid storytelling sequences
 */

import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// Parameter schema
const presetParams = z.object({
  videoSrc: z.string().describe('Source URL or path for the main video'),
  brollSrc: z.string().describe('Source URL or path for the b-roll video or image'),
  flowDuration: z
    .number()
    .default(1.8)
    .describe('Duration of the main liquid flow animation in seconds'),
  wobbleDuration: z
    .number()
    .default(0.5)
    .describe('Duration of the wobble settle effect in seconds'),
  settledScale: z
    .number()
    .default(0.35)
    .describe('Final scale of the settled video (0-1, where 1 is full screen)'),
  settledPositionX: z
    .number()
    .default(38)
    .describe('Final X position as percentage (0-50, where 50 is right edge)'),
  settledPositionY: z
    .number()
    .default(35)
    .describe('Final Y position as percentage (0-50, where 50 is bottom edge)'),
  peakBlur: z
    .number()
    .default(6)
    .describe('Peak blur intensity during flow (in pixels)'),
  glassEdgeDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the glass edge overlay effect in seconds'),
  brollRevealDelay: z
    .number()
    .default(0.1)
    .describe('Delay before b-roll starts revealing (relative to flow start)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videoSrc,
    brollSrc,
    flowDuration,
    wobbleDuration,
    settledScale,
    settledPositionX,
    settledPositionY,
    peakBlur,
    glassEdgeDuration,
    brollRevealDelay,
  } = params;

  const totalDuration = flowDuration + wobbleDuration;

  // B-roll layer with fade-in, scale, and blur effects
  const brollLayer: RenderableComponentData = {
    id: 'broll-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'fill',
      },
    },
    effects: [
      {
        id: 'broll-fade',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['broll-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: brollRevealDelay / totalDuration },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'broll-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['broll-layer'],
          ranges: [
            { key: 'scale', val: 1.15, prog: 0 },
            { key: 'scale', val: 1.1, prog: 0.3 },
            { key: 'scale', val: 1.05, prog: 0.6 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'broll-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['broll-layer'],
          ranges: [
            { key: 'filter', val: 'blur(8px)', prog: 0 },
            { key: 'filter', val: 'blur(4px)', prog: 0.3 },
            { key: 'filter', val: 'blur(0px)', prog: 0.6 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'broll-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: brollSrc,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'fill',
          },
        },
      },
    ],
  };

  // Main video layer with liquid flow effects
  const videoLayer: RenderableComponentData = {
    id: 'video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'fill',
      },
    },
    effects: [
      {
        id: 'video-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flowDuration,
          mode: 'provider',
          targetIds: ['video-layer'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.05, prog: 0.15 },
            { key: 'scale', val: 0.9, prog: 0.4 },
            { key: 'scale', val: settledScale, prog: 0.7 },
            { key: 'scale', val: settledScale, prog: 1 },
          ],
        },
      },
      {
        id: 'video-translateX',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flowDuration,
          mode: 'provider',
          targetIds: ['video-layer'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '5%', prog: 0.15 },
            { key: 'translateX', val: '25%', prog: 0.4 },
            { key: 'translateX', val: `${settledPositionX}%`, prog: 0.7 },
            { key: 'translateX', val: `${settledPositionX}%`, prog: 1 },
          ],
        },
      },
      {
        id: 'video-translateY',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flowDuration,
          mode: 'provider',
          targetIds: ['video-layer'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '-5%', prog: 0.15 },
            { key: 'translateY', val: '20%', prog: 0.4 },
            { key: 'translateY', val: `${settledPositionY}%`, prog: 0.7 },
            { key: 'translateY', val: `${settledPositionY}%`, prog: 1 },
          ],
        },
      },
      {
        id: 'video-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flowDuration,
          mode: 'provider',
          targetIds: ['video-layer'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${peakBlur * 0.5}px)`, prog: 0.2 },
            { key: 'filter', val: `blur(${peakBlur}px)`, prog: 0.4 },
            { key: 'filter', val: 'blur(2px)', prog: 0.7 },
            { key: 'filter', val: 'blur(0px)', prog: 0.85 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: 'video-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flowDuration,
          mode: 'provider',
          targetIds: ['video-layer'],
          ranges: [
            { key: 'rotate', val: '0deg', prog: 0 },
            { key: 'rotate', val: '-2deg', prog: 0.3 },
            { key: 'rotate', val: '3deg', prog: 0.5 },
            { key: 'rotate', val: '-1deg', prog: 0.7 },
            { key: 'rotate', val: '0deg', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'main-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: videoSrc,
          className: 'w-full h-full object-cover rounded-lg',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'fill',
          },
        },
      },
    ],
  };

  // Wobble container for settle effect
  const wobbleContainer: RenderableComponentData = {
    id: 'wobble-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-15 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: flowDuration,
        duration: wobbleDuration,
      },
    },
    effects: [
      {
        id: 'wobble-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: wobbleDuration,
          mode: 'provider',
          targetIds: ['video-layer'],
          ranges: [
            { key: 'scale', val: settledScale * 1.03, prog: 0 },
            { key: 'scale', val: settledScale * 0.98, prog: 0.25 },
            { key: 'scale', val: settledScale * 1.01, prog: 0.5 },
            { key: 'scale', val: settledScale * 0.995, prog: 0.75 },
            { key: 'scale', val: settledScale, prog: 1 },
          ],
        },
      },
      {
        id: 'wobble-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: wobbleDuration,
          mode: 'provider',
          targetIds: ['video-layer'],
          ranges: [
            { key: 'rotate', val: '1.5deg', prog: 0 },
            { key: 'rotate', val: '-1deg', prog: 0.3 },
            { key: 'rotate', val: '0.5deg', prog: 0.6 },
            { key: 'rotate', val: '-0.2deg', prog: 0.85 },
            { key: 'rotate', val: '0deg', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Glass edge overlay
  const glassEdgeOverlay: RenderableComponentData = {
    id: 'glass-edge-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-20 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0.3,
        duration: glassEdgeDuration,
      },
    },
    effects: [
      {
        id: 'glass-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: glassEdgeDuration,
          mode: 'provider',
          targetIds: ['glass-edge-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.2 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0.4, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'glass-edge-inner',
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shapeType: 'rectangle',
          className: 'absolute rounded-xl',
          style: {
            width: `${settledScale * 100}vw`,
            height: `${settledScale * 100}vh`,
            bottom: `${100 - settledPositionY - settledScale * 50}vh`,
            right: `${100 - settledPositionX - settledScale * 50}vw`,
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'fill',
          },
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-motion-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [brollLayer, videoLayer, wobbleContainer, glassEdgeOverlay],
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
  id: 'liquid-motion-reveal',
  title: 'Liquid Motion Reveal Transition',
  description:
    'A fluid transition effect where the main video appears to melt and flow like liquid mercury to the corner while b-roll emerges from underneath. Features organic wave-like distortion, refractive glass-like edges, and a subtle wobble settle effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'liquid',
    'fluid',
    'reveal',
    'broll',
    'motion',
    'organic',
    'glass',
    'wobble',
    'mercury',
    'pip',
  ],
  defaultInputParams: {
    videoSrc: 'https://example.com/main-video.mp4',
    brollSrc: 'https://example.com/broll-video.mp4',
    flowDuration: 1.8,
    wobbleDuration: 0.5,
    settledScale: 0.35,
    settledPositionX: 38,
    settledPositionY: 35,
    peakBlur: 6,
    glassEdgeDuration: 1.5,
    brollRevealDelay: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const liquidMotionRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
