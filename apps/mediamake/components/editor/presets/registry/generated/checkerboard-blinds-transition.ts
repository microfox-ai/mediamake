/**
 * Checkerboard Blinds Transition Preset
 *
 * This preset creates a complex video transition where 48 alternating rectangular blind
 * segments (arranged in an 8x6 grid) flip like window blinds with 3D perspective. Even
 * and odd rows flip in opposite directions (rotateX positive vs negative) creating an
 * interwoven pattern. Pixelated edges dissolve during the flip, and subtle light leak
 * effects between blinds add depth. The transition reveals the incoming video through
 * coordinated blind animations with staggered wave-like timing.
 *
 * Features:
 * - **8x6 Grid Layout**: 48 blind segments arranged in CSS grid
 * - **Opposite Row Flips**: Even rows flip downward (rotateX 0→90→0), odd rows flip upward (rotateX 0→-90→0)
 * - **3D Perspective**: Container perspective(800px) for depth
 * - **Pixelated Edges**: Border styling creates pixelated edge effect during transitions
 * - **Light Leak Effects**: Subtle gradient strips between blinds with opacity animation
 * - **Wave Pattern**: Staggered timing (0.1s delays) creates wave effect across grid
 * - **Smooth Reveal**: Incoming video fades in as blinds flip
 *
 * Use cases:
 * - Creating complex video transitions with geometric patterns
 * - Building stylized video montages with depth
 * - Adding cinematic transitions between clips
 * - Creating dynamic interwoven flip effects
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
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video source'),
  video2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video source'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of transition overlap in seconds'),
  gridCols: z
    .number()
    .default(8)
    .describe('Number of columns in blind grid'),
  gridRows: z
    .number()
    .default(6)
    .describe('Number of rows in blind grid'),
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each blind segment animation in seconds'),
  perspective: z
    .number()
    .default(800)
    .describe('3D perspective value in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    gridCols,
    gridRows,
    staggerDelay,
    perspective,
  } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;
  const totalBlinds = gridCols * gridRows;

  // Helper: Create blind segment with flip animation
  const createBlindSegment = (
    index: number,
    row: number,
    col: number,
  ): RenderableComponentData => {
    const isEvenRow = row % 2 === 0;
    const segmentDelay = index * staggerDelay;

    // Transform origin: even rows center, odd rows top
    const transformOrigin = isEvenRow ? 'center' : 'top';

    // Rotation direction: even rows positive, odd rows negative
    const startRotation = 0;
    const midRotation = isEvenRow ? 90 : -90;
    const endRotation = 0;

    // Timing: flip happens during transition period
    const flipStartTime = video1.duration - transitionDuration + segmentDelay;
    const flipDuration = transitionDuration * 0.6; // Flip takes 60% of transition

    return {
      id: `blind-segment-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full overflow-hidden',
          style: {
            transformStyle: 'preserve-3d',
            transformOrigin,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            // Pixelated edges using border
            border: '1px solid rgba(255,255,255,0.1)',
            borderImage: 'linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%) 1',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `flip-effect-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: flipStartTime,
            duration: flipDuration,
            mode: 'provider',
            targetIds: [`blind-segment-${index}`],
            ranges: [
              { key: 'rotateX', val: startRotation, prog: 0 },
              { key: 'rotateX', val: midRotation, prog: 0.5 },
              { key: 'rotateX', val: endRotation, prog: 1 },
            ],
          },
        },
        // Edge dissolve effect
        {
          id: `edge-dissolve-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: flipStartTime,
            duration: flipDuration,
            mode: 'provider',
            targetIds: [`blind-segment-${index}`],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(2px)', prog: 0.5 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create light leak strip
  const createLightLeakStrip = (index: number): RenderableComponentData => {
    const stripPosition = ((index + 1) / (gridCols + 1)) * 100;
    const leakStartTime = video1.duration - transitionDuration * 0.7;
    const leakDuration = transitionDuration * 0.6;

    return {
      id: `light-leak-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-full w-[2px] pointer-events-none',
          style: {
            left: `${stripPosition}%`,
            background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,200,0.6) 30%, rgba(255,255,255,0.8) 50%, rgba(255,255,200,0.6) 70%, transparent 100%)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `light-leak-fade-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: leakStartTime,
            duration: leakDuration,
            mode: 'provider',
            targetIds: [`light-leak-${index}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Generate blind segments
  const blindSegments: RenderableComponentData[] = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const index = row * gridCols + col;
      blindSegments.push(createBlindSegment(index, row, col));
    }
  }

  // Generate light leak strips (between columns)
  const lightLeakStrips: RenderableComponentData[] = [];
  for (let i = 0; i < gridCols - 1; i++) {
    lightLeakStrips.push(createLightLeakStrip(i));
  }

  // Outgoing video layer
  const outgoingVideo: RenderableComponentData = {
    id: 'video-outgoing',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
  } as RenderableComponentData;

  // Incoming video layer (starts before outgoing ends)
  const incomingVideo: RenderableComponentData = {
    id: 'video-incoming',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video-incoming'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Blinds grid container
  const blindsGridContainer: RenderableComponentData = {
    id: 'blinds-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: blindSegments,
  } as RenderableComponentData;

  // Light leaks container
  const lightLeaksContainer: RenderableComponentData = {
    id: 'light-leaks-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: lightLeakStrips,
  } as RenderableComponentData;

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'checkerboard-blinds-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: `${perspective}px`,
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
      outgoingVideo,
      incomingVideo,
      blindsGridContainer,
      lightLeaksContainer,
    ],
  } as RenderableComponentData;

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
  id: 'checkerboard-blinds-transition',
  title: 'Checkerboard Blinds Transition',
  description: 'A complex video transition where 48 alternating rectangular blind segments (8x6 grid) flip like window blinds with 3D perspective. Even and odd rows flip in opposite directions creating an interwoven pattern. Pixelated edges dissolve during flip, and subtle light leak effects between blinds add depth.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'blinds', 'checkerboard', '3d', 'flip', 'grid', 'video'],
  defaultInputParams: {
    video1: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: 5,
    },
    transitionDuration: 1.8,
    gridCols: 8,
    gridRows: 6,
    staggerDelay: 0.1,
    perspective: 800,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const checkerboardBlindsTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
