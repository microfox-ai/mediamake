/**
 * Diagonal Paint Swipe Transition Preset
 *
 * This preset creates a diagonal paint brush stroke transition that sweeps from top-left 
 * to bottom-right corner. Features include:
 * - Thick main brush stroke with semi-transparent feathered edges
 * - Multiple paint drip details moving at different speeds
 * - 3D rotation effects on both outgoing and incoming videos
 * - 1.6 second overlap showing paint building up thickness
 * - Realistic paint texture with depth and shadows
 *
 * Use cases:
 * - Creative video transitions with artistic flair
 * - Music video scene changes
 * - Social media content with unique transitions
 * - Artistic presentations and portfolios
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters schema
const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing (first) video'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming (second) video'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Duration of the overlap/transition period in seconds'),
  brushStrokeWidth: z
    .number()
    .default(150)
    .describe('Width of the main brush stroke in pixels'),
  paintColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the paint brush stroke (hex or rgb)'),
  dripCount: z
    .number()
    .default(3)
    .describe('Number of paint drips along the brush edge'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    transitionDuration,
    brushStrokeWidth,
    paintColor,
    dripCount,
  } = params;

  // Calculate base layout duration (total minus overlap)
  const baseLayoutDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Parse paint color for gradient variations
  const createGradient = (baseColor: string) => {
    // Simple color manipulation for gradient
    return `linear-gradient(90deg, ${baseColor}f2 0%, ${baseColor} 50%, ${baseColor}f2 100%)`;
  };

  // Helper to create paint drip components
  const createPaintDrips = (count: number): RenderableComponentData[] => {
    const drips: RenderableComponentData[] = [];
    for (let i = 0; i < count; i++) {
      const dripId = `paint-drip-${i + 1}`;
      const width = 6 + Math.random() * 4; // 6-10px
      const height = 45 + Math.random() * 35; // 45-80px
      const leftPos = 30 + i * 20; // Spread along diagonal
      const topPos = 20 + i * 20;
      const speedMultiplier = 0.9 + Math.random() * 0.3; // 0.9-1.2x

      drips.push({
        id: dripId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${width}px`,
              height: `${height}px`,
              background: `linear-gradient(to bottom, ${paintColor}cc 0%, transparent 100%)`,
              borderRadius: `${width / 2}px`,
              zIndex: 6,
              left: `${leftPos}%`,
              top: `${topPos}%`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: baseLayoutDuration,
          },
        },
        effects: [
          {
            id: `${dripId}-animation`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration * speedMultiplier,
              mode: 'provider',
              targetIds: [dripId],
              ranges: [
                { key: 'translateY', val: -50, prog: 0 },
                { key: 'translateY', val: 0, prog: 0.3 },
                { key: 'translateY', val: height * 0.5, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.2 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    return drips;
  };

  // Outgoing video container with 3D rotation effect
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-3d-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideoDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -25, prog: 1 },
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-30%', prog: 1 },
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
          src: outgoingVideoSrc,
          fit: 'cover',
          muted: true,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Incoming video container with 3D rotation and mask effects
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 3,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - transitionDuration,
        duration: incomingVideoDuration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-3d-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'rotateY', val: 25, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            { key: 'translateX', val: '30%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-clip-mask-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(-100% -100%, -90% -90%, 200% 200%, 210% 210%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0% 0%, 10% 10%, 110% 110%, 100% 100%)',
              prog: 0.5,
            },
            {
              key: 'clipPath',
              val: 'polygon(100% 100%, 110% 110%, 0% 0%, -10% -10%)',
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
          src: incomingVideoSrc,
          fit: 'cover',
          muted: true,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideoDuration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Brush stroke container with main stroke and feathered edges
  const brushStrokeContainer: RenderableComponentData = {
    id: 'brush-stroke-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      // Main opaque brush stroke
      {
        id: 'brush-stroke-main',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: '200%',
              height: `${brushStrokeWidth}px`,
              background: createGradient(paintColor),
              transform: 'rotate(45deg)',
              transformOrigin: 'center center',
              boxShadow:
                '0 8px 32px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.8)',
              borderRadius: '4px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: baseLayoutDuration,
          },
        },
        effects: [
          {
            id: 'brush-stroke-swipe-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingVideoDuration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['brush-stroke-main'],
              ranges: [
                { key: 'translateX', val: '-150%', prog: 0 },
                { key: 'translateX', val: '0%', prog: 0.4 },
                { key: 'translateX', val: '150%', prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Semi-transparent feathered edge
      {
        id: 'brush-stroke-edge-feather',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: '200%',
              height: `${brushStrokeWidth + 30}px`,
              background: `linear-gradient(90deg, transparent 0%, ${paintColor}4d 20%, ${paintColor}80 50%, ${paintColor}4d 80%, transparent 100%)`,
              transform: 'rotate(45deg)',
              transformOrigin: 'center center',
              filter: 'blur(8px) drop-shadow(0 0 20px rgba(0,0,0,0.4))',
              borderRadius: '8px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: baseLayoutDuration,
          },
        },
        effects: [
          {
            id: 'brush-stroke-feather-swipe-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingVideoDuration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['brush-stroke-edge-feather'],
              ranges: [
                { key: 'translateX', val: '-150%', prog: 0 },
                { key: 'translateX', val: '0%', prog: 0.4 },
                { key: 'translateX', val: '150%', prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.6, prog: 0.15 },
                { key: 'opacity', val: 0.6, prog: 0.85 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Create paint drips
  const paintDrips = createPaintDrips(dripCount);

  // Root container with perspective for 3D effects
  const rootContainer: RenderableComponentData = {
    id: 'diagonal-paint-swipe-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px',
        },
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
      brushStrokeContainer,
      ...paintDrips,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'diagonal-paint-swipe-transition',
  title: 'Diagonal Paint Swipe Transition',
  description:
    'A diagonal paint brush swipe transition that sweeps from top-left to bottom-right corner with realistic multi-layer paint texture. Features a thick brush stroke with semi-transparent feathered edges, 3D rotation effects on both outgoing and incoming videos, and animated paint drips along the brush edge. The 1.6 second overlap shows paint building up before sweeping across to reveal the incoming video.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'paint',
    'diagonal',
    'swipe',
    'brush',
    'artistic',
    '3d',
    'rotation',
    'drip',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    transitionDuration: 1.6,
    brushStrokeWidth: 150,
    paintColor: '#ffffff',
    dripCount: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const diagonalPaintSwipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
