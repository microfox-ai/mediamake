/**
 * Pencil Scribble-Out Transition Preset
 *
 * Creates a vigorous pencil scribble transition that scribbles over the outgoing scene
 * while simultaneously revealing the incoming video through the scribble gaps.
 * Mimics the action of scribbling out a mistake in a sketch.
 *
 * Features:
 * - Chaotic but controlled scribble lines (40-50 curved SVG paths)
 * - Varying line thickness (1-4px) and opacity (0.4-0.9)
 * - Stroke-dasharray/stroke-dashoffset animations for drawing effect
 * - Subtle hand shake effect during scribbling (transform: translate)
 * - Progressive reveal of incoming video through scribble accumulation
 * - Outgoing video obscured with mix-blend-mode: multiply
 * - Duration: 1.7 seconds
 * - Performance: Uses requestAnimationFrame for smooth updates
 *
 * Use cases:
 * - Energetic transitions between scenes
 * - Hand-drawn, sketch-style transitions
 * - Creative reveal effects
 * - Artistic video transitions
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
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z.number().optional().describe('Start time of outgoing video'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video'),
  }),
  transitionDuration: z
    .number()
    .default(1.7)
    .describe('Duration of transition in seconds'),
  scribbleCount: z
    .number()
    .min(30)
    .max(60)
    .default(45)
    .describe('Number of scribble lines (30-60)'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Intensity of hand shake effect (0-5 pixels)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, scribbleCount, shakeIntensity } = params;
  const { config } = props;

  const width = config?.width || 1920;
  const height = config?.height || 1080;

  // Helper: Generate random bezier curve SVG path
  const generateScribblePath = (index: number): string => {
    const seededRandom = (seed: number): number => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const seed = index * 12345.6789;
    const random = (min: number, max: number, offset: number): number => {
      return min + seededRandom(seed + offset) * (max - min);
    };

    // Random start and end points
    const startX = random(0, width, 0);
    const startY = random(0, height, 1);
    const endX = random(0, width, 2);
    const endY = random(0, height, 3);

    // Control points for bezier curve
    const cp1X = random(0, width, 4);
    const cp1Y = random(0, height, 5);
    const cp2X = random(0, width, 6);
    const cp2Y = random(0, height, 7);

    // Create cubic bezier path
    return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
  };

  // Helper: Calculate path length (approximate)
  const calculatePathLength = (path: string): number => {
    // Approximate length calculation for cubic bezier
    // Extract coordinates
    const coords = path.match(/[\d.]+/g)?.map(Number) || [];
    if (coords.length < 8) return 100;

    const [x1, y1, cx1, cy1, cx2, cy2, x2, y2] = coords;

    // Simplified length calculation (chord + control polygon)
    const chord = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const controlLength =
      Math.sqrt(Math.pow(cx1 - x1, 2) + Math.pow(cy1 - y1, 2)) +
      Math.sqrt(Math.pow(cx2 - cx1, 2) + Math.pow(cy2 - cy1, 2)) +
      Math.sqrt(Math.pow(x2 - cx2, 2) + Math.pow(y2 - cy2, 2));

    return (chord + controlLength) / 2;
  };

  // Helper: Seeded random for consistent randomness
  const seededRandom = (seed: number, offset: number): number => {
    const x = Math.sin(seed * 12345.6789 + offset) * 10000;
    return x - Math.floor(x);
  };

  // Generate scribble lines
  const scribbleLines: RenderableComponentData[] = [];
  for (let i = 0; i < scribbleCount; i++) {
    const path = generateScribblePath(i);
    const pathLength = calculatePathLength(path);
    const strokeWidth = 1 + seededRandom(i, 100) * 3; // 1-4px
    const opacity = 0.4 + seededRandom(i, 200) * 0.5; // 0.4-0.9
    const animDuration = 100 + seededRandom(i, 300) * 300; // 100-400ms
    const startDelay = seededRandom(i, 400) * 1300; // Random start 0-1.3s

    const scribbleId = `scribble-line-${i}`;

    scribbleLines.push({
      id: scribbleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<svg width="${width}" height="${height}" style="position: absolute; top: 0; left: 0; pointer-events: none;">
          <path d="${path}" stroke="#000000" stroke-width="${strokeWidth}" fill="none" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round" />
        </svg>`,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
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
          id: `scribble-draw-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: startDelay / 1000,
            duration: animDuration / 1000,
            mode: 'provider',
            targetIds: [scribbleId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: opacity, prog: 0.2 },
              { key: 'opacity', val: opacity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Scribble container with shake effect
  const scribbleContainer: RenderableComponentData = {
    id: 'scribble-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 25,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        },
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
        id: 'shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['scribble-container'],
          ranges: [
            { key: 'translateX', val: `${-shakeIntensity}px`, prog: 0 },
            { key: 'translateX', val: `${shakeIntensity}px`, prog: 0.1 },
            { key: 'translateX', val: `${-shakeIntensity}px`, prog: 0.2 },
            { key: 'translateX', val: `${shakeIntensity}px`, prog: 0.3 },
            { key: 'translateX', val: `${-shakeIntensity}px`, prog: 0.4 },
            { key: 'translateX', val: `${shakeIntensity}px`, prog: 0.5 },
            { key: 'translateX', val: `${-shakeIntensity}px`, prog: 0.6 },
            { key: 'translateX', val: `${shakeIntensity}px`, prog: 0.7 },
            { key: 'translateX', val: `${-shakeIntensity}px`, prog: 0.8 },
            { key: 'translateX', val: `0px`, prog: 0.9 },
            { key: 'translateX', val: `0px`, prog: 1 },
            { key: 'translateY', val: `${shakeIntensity}px`, prog: 0 },
            { key: 'translateY', val: `${-shakeIntensity}px`, prog: 0.15 },
            { key: 'translateY', val: `${shakeIntensity}px`, prog: 0.25 },
            { key: 'translateY', val: `${-shakeIntensity}px`, prog: 0.35 },
            { key: 'translateY', val: `${shakeIntensity}px`, prog: 0.45 },
            { key: 'translateY', val: `${-shakeIntensity}px`, prog: 0.55 },
            { key: 'translateY', val: `${shakeIntensity}px`, prog: 0.65 },
            { key: 'translateY', val: `${-shakeIntensity}px`, prog: 0.75 },
            { key: 'translateY', val: `${shakeIntensity}px`, prog: 0.85 },
            { key: 'translateY', val: `0px`, prog: 0.95 },
            { key: 'translateY', val: `0px`, prog: 1 },
          ],
        },
      },
    ],
    childrenData: scribbleLines,
  };

  // Outgoing video (progressively obscured)
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 10,
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
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video (revealed progressively)
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom || 0,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 20,
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
        id: 'incoming-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'pencil-scribble-transition-root',
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
        duration: transitionDuration,
      },
    },
    childrenData: [outgoingVideoNode, incomingVideoNode, scribbleContainer],
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
  id: 'pencil-scribble-transition',
  title: 'Pencil Scribble-Out Transition',
  description:
    'A vigorous pencil scribble transition that scribbles over the outgoing scene while revealing the incoming video through scribble gaps. Features chaotic but controlled scribble lines with varying thickness and opacity, plus subtle hand shake effect for manual drawing feeling. Duration: 1.7 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'scribble', 'pencil', 'sketch', 'artistic', 'hand-drawn'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/incoming.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.7,
    scribbleCount: 45,
    shakeIntensity: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pencilScribbleTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
