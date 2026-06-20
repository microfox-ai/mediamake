/**
 * Scribble Dissolve Transition Preset
 *
 * This preset creates a chaotic marker scribble transition effect where the outgoing video
 * gets progressively covered with hand-drawn scribble overlays that eventually fade away
 * to reveal the incoming video. The scribbles animate in waves with varying stroke widths,
 * directions, and speeds to create an organic, hand-made aesthetic.
 *
 * Features:
 * - **Wave-based scribble animation**: Scribbles appear in staggered waves (light, medium, heavy)
 * - **Organic variation**: Random stroke widths (2-8px), bezier curve paths, turbulence filters
 * - **Progressive coverage**: Sparse initial scribbles become increasingly dense
 * - **Fade-out reveal**: All scribbles fade simultaneously to reveal incoming video
 * - **Brightness reduction**: Outgoing video dims from 100% to 50% during transition
 * - **Customizable timing**: Configurable overlap duration and wave timings
 *
 * Use cases:
 * - Creating artistic transitions between video clips
 * - Adding hand-drawn aesthetic to content
 * - Building creative dissolve effects for montages
 * - Implementing marker-style reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  overlapDuration: z
    .number()
    .default(1.4)
    .describe('Duration of the transition overlap in seconds'),
  scribbleCount: z
    .number()
    .min(10)
    .max(30)
    .default(18)
    .describe('Number of scribble overlays (10-30)'),
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
    overlapDuration,
    scribbleCount,
  } = params;

  // Calculate total transition duration
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - overlapDuration;

  // Helper: Generate random bezier curve path
  const generateScribblePath = (index: number): string => {
    const width = 1920;
    const height = 1080;

    // Randomize start position
    const startX = (Math.random() * width * 0.8 + width * 0.1).toFixed(0);
    const startY = (Math.random() * height * 0.8 + height * 0.1).toFixed(0);

    // Generate 2-4 curve segments
    const segments = Math.floor(Math.random() * 3) + 2;
    let pathData = `M ${startX},${startY}`;

    for (let i = 0; i < segments; i++) {
      const controlX1 = (Math.random() * width).toFixed(0);
      const controlY1 = (Math.random() * height).toFixed(0);
      const endX = (Math.random() * width).toFixed(0);
      const endY = (Math.random() * height).toFixed(0);

      if (Math.random() > 0.5) {
        // Quadratic bezier
        pathData += ` Q ${controlX1},${controlY1} ${endX},${endY}`;
      } else {
        // Smooth curve with T
        pathData += ` T ${endX},${endY}`;
      }
    }

    return pathData;
  };

  // Helper: Generate stroke width (2-8px)
  const generateStrokeWidth = (): number => {
    return Math.floor(Math.random() * 7) + 2;
  };

  // Helper: Generate stroke color (dark grays/blacks)
  const generateStrokeColor = (): string => {
    const colors = ['#1a1a1a', '#2a2a2a', '#0a0a0a', '#333333'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Helper: Determine wave timing based on index
  const getWaveTiming = (
    index: number,
    total: number,
  ): { start: number; duration: number } => {
    // Divide scribbles into 3 waves
    const waveSize = Math.ceil(total / 3);
    const waveIndex = Math.floor(index / waveSize);

    // Wave 1: 0-0.4s (light coverage)
    // Wave 2: 0.15-0.6s (medium coverage)
    // Wave 3: 0.3-0.8s (heavy coverage)
    const waveTimings = [
      { start: 0, duration: 0.4 },
      { start: 0.15, duration: 0.45 },
      { start: 0.3, duration: 0.5 },
    ];

    const timing = waveTimings[Math.min(waveIndex, 2)];

    // Add slight randomization within wave
    const jitter = (Math.random() - 0.5) * 0.1;

    return {
      start: Math.max(0, timing.start + jitter),
      duration: timing.duration,
    };
  };

  // Generate scribble overlays
  const scribbles: RenderableComponentData[] = [];

  for (let i = 0; i < scribbleCount; i++) {
    const scribbleId = `scribble-${i + 1}`;
    const pathData = generateScribblePath(i);
    const strokeWidth = generateStrokeWidth();
    const strokeColor = generateStrokeColor();
    const waveTiming = getWaveTiming(i, scribbleCount);

    // Create scribble with SVG path
    const scribbleSvg = `
      <svg width='100%' height='100%' viewBox='0 0 1920 1080' style='position: absolute; top: 0; left: 0;'>
        <defs>
          <filter id='turbulence-${i}'>
            <feTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='2' result='turbulence'/>
            <feDisplacementMap in='SourceGraphic' in2='turbulence' scale='3' xChannelSelector='R' yChannelSelector='G'/>
          </filter>
        </defs>
        <path 
          d='${pathData}' 
          stroke='${strokeColor}' 
          stroke-width='${strokeWidth}' 
          fill='none' 
          stroke-linecap='round' 
          stroke-linejoin='round'
          filter='url(#turbulence-${i})'
        />
      </svg>
    `;

    // Scribble draw-on effect (strokeDashoffset animation via opacity keyframes)
    const drawOnEffect = {
      id: `draw-on-${scribbleId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: outgoingVideoDuration - overlapDuration + waveTiming.start,
        duration: waveTiming.duration,
        mode: 'provider',
        targetIds: [scribbleId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    // Scribble fade-out effect (all scribbles fade out 0.8-1.4s)
    const fadeOutEffect = {
      id: `fade-out-${scribbleId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: outgoingVideoDuration - overlapDuration + 0.8,
        duration: 0.6,
        mode: 'provider',
        targetIds: [scribbleId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };

    scribbles.push({
      id: scribbleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: scribbleSvg,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [drawOnEffect, fadeOutEffect],
    } as RenderableComponentData);
  }

  // Outgoing video with brightness reduction
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        zIndex: 1,
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
        id: 'brightness-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideoDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 0.5, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video revealed through scribble gaps
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        zIndex: 2,
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - overlapDuration,
        duration: incomingVideoDuration + overlapDuration,
      },
    },
  };

  // Scribbles container with mix-blend-mode
  const scribblesContainer: RenderableComponentData = {
    id: 'scribbles-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 3,
          mixBlendMode: 'darken',
          overflow: 'visible',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: scribbles,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'scribble-dissolve-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideo, scribblesContainer],
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
  id: 'scribble-dissolve-transition',
  title: 'Scribble Dissolve Transition',
  description:
    'A chaotic marker scribble transition where the outgoing video gets progressively covered with hand-drawn scribble overlays that fade away to reveal the incoming video. Features organic variations in stroke width, direction, and speed for a truly hand-made aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'scribble',
    'dissolve',
    'hand-drawn',
    'marker',
    'artistic',
    'organic',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    overlapDuration: 1.4,
    scribbleCount: 18,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const scribbleDissolveTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
