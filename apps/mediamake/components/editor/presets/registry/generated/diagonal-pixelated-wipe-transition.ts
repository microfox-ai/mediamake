/**
 * Diagonal Pixelated Wipe Transition Preset
 *
 * This preset creates a smooth diagonal wipe transition with pixelated edge treatment.
 * Videos transition through a 45-degree angled sweep with the leading edge dissolving 
 * into pixel blocks. The transition edge features a feathered pixelation effect that's 
 * 200px wide, creating a soft dissolve between the two videos.
 *
 * Features:
 * - Diagonal wipe from top-left to bottom-right
 * - Feathered pixelation effect at transition edge (200px wide)
 * - Uses transform animations for smooth movement
 * - Backdrop filters create pixelation effect
 * - Ease-in-out timing accelerates through the middle
 * - 2-second overlap period between videos
 *
 * Technical approach:
 * - Single BaseLayout container holds both videos
 * - Outgoing video visible throughout
 * - Incoming video revealed by animated diagonal mask
 * - Multiple overlay layers with staggered backdrop-filter effects
 * - Transform animations move mask and pixel layers across screen
 *
 * Use cases:
 * - Creating stylized video transitions
 * - Building dynamic video sequences
 * - Adding cinematic wipe effects
 * - Creating pixelated dissolve transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(2)
    .describe('Duration of transition overlap in seconds'),
  pixelEdgeWidth: z
    .number()
    .default(200)
    .describe('Width of pixelated edge effect in pixels'),
  pixelLayers: z
    .number()
    .default(4)
    .describe('Number of pixel effect layers (more = smoother gradient)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, pixelEdgeWidth, pixelLayers } =
    params;

  // Calculate total duration: sum of videos minus overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Transition starts when video1 is about to end
  const transitionStartTime = video1.duration - overlapDuration;

  // Calculate pixel layer width
  const layerWidth = pixelEdgeWidth / pixelLayers;

  // Create pixel edge layers with staggered effects
  const pixelEdgeLayers: RenderableComponentData[] = [];

  for (let i = 0; i < pixelLayers; i++) {
    const layerIndex = i + 1;
    const blurAmount = 4 - (i * 3) / pixelLayers; // 4px to 1px
    const contrast = 200 - (i * 75) / pixelLayers; // 200% to 125%
    const opacity = 1 - (i * 0.6) / pixelLayers; // 1 to 0.4
    const layerOffset = i * (layerWidth / pixelLayers); // Stagger offset

    pixelEdgeLayers.push({
      id: `pixel-edge-layer-${layerIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: `${layerWidth}px`,
            height: '300%',
            transform: 'rotate(45deg)',
            transformOrigin: 'center center',
            top: '-100%',
            left: '-100%',
            backdropFilter: `blur(${blurAmount}px) contrast(${contrast}%)`,
            WebkitBackdropFilter: `blur(${blurAmount}px) contrast(${contrast}%)`,
            opacity: opacity,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: `pixel-layer-${layerIndex}-translate`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: layerOffset / 1000, // Slight stagger (milliseconds to seconds)
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [`pixel-edge-layer-${layerIndex}`],
            ranges: [
              { key: 'translateX', val: '-150%', prog: 0 },
              { key: 'translateX', val: '150%', prog: 1 },
              { key: 'translateY', val: '-150%', prog: 0 },
              { key: 'translateY', val: '150%', prog: 1 },
              { key: 'opacity', val: opacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create diagonal mask layer (black layer that moves to reveal video2)
  const diagonalMaskLayer: RenderableComponentData = {
    id: 'diagonal-mask-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '300%',
          height: '300%',
          backgroundColor: '#000000',
          transform: 'rotate(45deg)',
          transformOrigin: 'center center',
          top: '-100%',
          left: '-100%',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'mask-translate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['diagonal-mask-layer'],
          ranges: [
            { key: 'translateX', val: '-150%', prog: 0 },
            { key: 'translateX', val: '150%', prog: 1 },
            { key: 'translateY', val: '-150%', prog: 0 },
            { key: 'translateY', val: '150%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Pixel edge container holds mask and pixel layers
  const pixelEdgeContainer: RenderableComponentData = {
    id: 'pixel-edge-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 3,
          pointerEvents: 'none',
          mixBlendMode: 'normal',
        },
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: overlapDuration,
      },
    },
    childrenData: [diagonalMaskLayer, ...pixelEdgeLayers],
  };

  // Outgoing video (video1)
  const outgoingVideo: RenderableComponentData = {
    id: 'video-outgoing',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
  };

  // Incoming video (video2)
  const incomingVideo: RenderableComponentData = {
    id: 'video-incoming',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: video2.duration + overlapDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'diagonal-wipe-root',
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
    childrenData: [outgoingVideo, incomingVideo, pixelEdgeContainer],
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
  id: 'diagonal-pixelated-wipe-transition',
  title: 'Diagonal Pixelated Wipe Transition',
  description:
    'A smooth diagonal wipe transition with a feathered pixelation effect at the leading edge. Two videos overlap for 2 seconds while an angled sweep moves from top-left to bottom-right. The transition edge features multiple staggered layers using backdrop-filter blur and contrast to create a dissolving pixel block effect across a 200px-wide feathered zone. Uses CSS transform animations with ease-in-out easing that accelerates through the middle of the transition.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wipe', 'diagonal', 'pixelated', 'video'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 2,
    pixelEdgeWidth: 200,
    pixelLayers: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const diagonalPixelatedWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
