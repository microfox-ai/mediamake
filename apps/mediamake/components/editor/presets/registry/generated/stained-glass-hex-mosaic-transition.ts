/**
 * Stained Glass Hexagon Mosaic Transition
 *
 * This preset creates a sophisticated stained glass mosaic transition effect where both videos are
 * fragmented into a honeycomb grid of hexagonal cells. Each hexagon independently blurs, shifts, and
 * tints with hue-rotate to simulate colored glass, revealing the incoming video beneath.
 *
 * Features:
 * - Honeycomb Grid: 35 hexagonal segments tessellated across the viewport
 * - Individual Timing: Each hexagon has random delay (0-0.8s) for staggered animation
 * - Blur Transition: Outgoing video hexagons blur from 0px to 20px
 * - Separation Effect: Hexagons translate randomly (-5px to 5px) creating gaps
 * - Color Tinting: Subtle hue-rotate (-30deg to 30deg) for stained glass effect
 * - Edge Lighting: Inset box-shadow animations for refraction effects
 * - Incoming Sharpening: Incoming video blurs in and sharpens as hexagons disappear
 *
 * Technical Implementation:
 * - BaseLayout with 2.3s overlap
 * - CSS clip-path for hexagonal tessellation
 * - Per-hexagon object-position for correct video segments
 * - Generic effects for blur, opacity, transform, hue-rotate, and box-shadow
 * - Custom properties for dynamic hexagon coordinates
 *
 * Use cases:
 * - Creative video transitions
 * - Stained glass visual effects
 * - Mosaic-style reveals
 * - Artistic video montages
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
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  overlapDuration: z
    .number()
    .default(2.3)
    .describe('Duration of the transition overlap in seconds'),
  hexagonCount: z
    .number()
    .default(35)
    .describe('Number of hexagonal segments (default: 35)'),
  maxBlur: z
    .number()
    .default(20)
    .describe('Maximum blur amount for outgoing hexagons in pixels'),
  maxTranslate: z
    .number()
    .default(5)
    .describe('Maximum translate distance for hexagons in pixels'),
  maxHueRotate: z
    .number()
    .default(30)
    .describe('Maximum hue rotation angle for color tinting in degrees'),
  incomingBlur: z
    .number()
    .default(25)
    .describe('Initial blur amount for incoming video in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    overlapDuration,
    hexagonCount,
    maxBlur,
    maxTranslate,
    maxHueRotate,
    incomingBlur,
  } = params;

  // Calculate total duration (sum of video durations minus overlap)
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Helper function: Generate hexagon clip-path for tessellation
  const generateHexagonClipPath = (col: number, row: number, cols: number, rows: number): string => {
    // Standard hexagon points (flat-top orientation)
    return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
  };

  // Helper function: Calculate hexagon position and size
  const calculateHexagonLayout = (index: number, cols: number, rows: number) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    // Hexagon dimensions (percentage-based for tessellation)
    const hexWidth = 100 / cols;
    const hexHeight = 100 / rows;
    
    // Offset every other row for tessellation
    const offsetX = (row % 2) * (hexWidth / 2);
    const left = col * hexWidth + offsetX;
    const top = row * hexHeight;
    
    return {
      left: `${left}%`,
      top: `${top}%`,
      width: `${hexWidth}%`,
      height: `${hexHeight}%`,
    };
  };

  // Helper function: Calculate object-position for video segment
  const calculateObjectPosition = (col: number, row: number, cols: number, rows: number): string => {
    // Map hexagon position to video segment
    const xPercent = (col / (cols - 1)) * 100;
    const yPercent = (row / (rows - 1)) * 100;
    return `${xPercent}% ${yPercent}%`;
  };

  // Helper function: Generate random value in range
  const random = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Calculate grid dimensions (approximate square grid)
  const cols = Math.ceil(Math.sqrt(hexagonCount * 1.5));
  const rows = Math.ceil(hexagonCount / cols);

  // Generate hexagon containers
  const hexagonChildren: RenderableComponentData[] = [];

  for (let i = 0; i < hexagonCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const layout = calculateHexagonLayout(i, cols, rows);
    const objectPosition = calculateObjectPosition(col, row, cols, rows);
    
    // Random animation parameters
    const delay = random(0, 0.8);
    const translateX = random(-maxTranslate, maxTranslate);
    const translateY = random(-maxTranslate, maxTranslate);
    const hueRotate = random(-maxHueRotate, maxHueRotate);

    const hexagonId = `hex-${i}`;
    const videoSegmentId = `hex-video-${i}`;

    hexagonChildren.push({
      id: hexagonId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: layout.left,
            top: layout.top,
            width: layout.width,
            height: layout.height,
            clipPath: generateHexagonClipPath(col, row, cols, rows),
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      childrenData: [
        {
          id: videoSegmentId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            style: {
              width: `${cols * 100}%`,
              height: `${rows * 100}%`,
              objectPosition: objectPosition,
              position: 'absolute',
              left: `${-col * 100}%`,
              top: `${-row * 100}%`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration,
            },
          },
          effects: [],
        } as RenderableComponentData,
      ],
      effects: [
        // Blur effect: 0px → 20px (0-0.7 of overlap)
        {
          id: `blur-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: delay,
            duration: overlapDuration * 0.7,
            mode: 'provider',
            targetIds: [videoSegmentId],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${maxBlur}px)`, prog: 1 },
            ],
          },
        },
        // Opacity effect: 1 → 0 (0.5-0.9 of overlap)
        {
          id: `opacity-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: overlapDuration * 0.5 + delay,
            duration: overlapDuration * 0.4,
            mode: 'provider',
            targetIds: [videoSegmentId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Transform translate effect with random x/y
        {
          id: `translate-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: delay,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [videoSegmentId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: translateX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: translateY, prog: 1 },
            ],
          },
        },
        // Hue-rotate effect for color tinting
        {
          id: `hue-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: delay,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [videoSegmentId],
            ranges: [
              { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
              { key: 'filter', val: `hue-rotate(${hueRotate}deg)`, prog: 1 },
            ],
          },
        },
        // Edge lighting effect (inset box-shadow)
        {
          id: `edge-light-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: delay,
            duration: overlapDuration * 0.5,
            mode: 'provider',
            targetIds: [hexagonId],
            ranges: [
              { key: 'boxShadow', val: 'inset 0 0 0px rgba(255,255,255,0)', prog: 0 },
              { key: 'boxShadow', val: 'inset 0 0 10px rgba(255,255,255,0.5)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Incoming video layer (below hexagons)
  const incomingVideoId = 'incoming-video';
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: video1.duration - overlapDuration,
        duration: video2.duration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: incomingVideoId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + overlapDuration,
          },
        },
        effects: [
          // Blur effect: 25px → 0px (0-0.6 of overlap)
          {
            id: 'incoming-blur',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration * 0.6,
              mode: 'provider',
              targetIds: [incomingVideoId],
              ranges: [
                { key: 'filter', val: `blur(${incomingBlur}px)`, prog: 0 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
          // Scale effect: 0.98 → 1.0 (0-0.8 of overlap)
          {
            id: 'incoming-scale',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration * 0.8,
              mode: 'provider',
              targetIds: [incomingVideoId],
              ranges: [
                { key: 'scale', val: 0.98, prog: 0 },
                { key: 'scale', val: 1.0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Hexagon grid container (above incoming video)
  const hexagonGridContainer: RenderableComponentData = {
    id: 'hexagon-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - overlapDuration,
        duration: overlapDuration,
      },
    },
    childrenData: hexagonChildren,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'stained-glass-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [incomingVideoLayer, hexagonGridContainer],
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
  id: 'stained-glass-hex-mosaic-transition',
  title: 'Stained Glass Hexagon Mosaic Transition',
  description:
    'A sophisticated transition effect that fragments both videos into a honeycomb grid of 35+ hexagonal cells. The outgoing video hexagons individually blur, shift with subtle translates, and tint with hue-rotate to simulate stained glass, revealing the incoming video beneath. Features per-hexagon random timing delays, edge lighting effects via inset box-shadows, and the incoming video sharpening from a blur as hexagons disappear. Creates an elegant stained glass mosaic dissolve effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'stained-glass', 'hexagon', 'mosaic', 'video', 'creative'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 2.3,
    hexagonCount: 35,
    maxBlur: 20,
    maxTranslate: 5,
    maxHueRotate: 30,
    incomingBlur: 25,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const stainedGlassHexMosaicTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
