/**
 * Hand-Drawn Scribble Reveal Transition Preset
 *
 * This preset creates a hand-drawn scribble reveal transition where the incoming video
 * appears through animated marker strokes that gradually 'draw' the new scene into view.
 * The transition feels like someone is rapidly sketching the new video with a thick black
 * marker, starting from random points and expanding outward with organic, hand-drawn line
 * animations.
 *
 * Features:
 * - **Scribble Reveal Animation**: Incoming video revealed through animated scribble paths
 * - **Hand-Drawn Quality**: Rough, imperfect line quality with varying stroke widths
 * - **Organic Movement**: Slightly shaky movement to simulate hand-drawn animation
 * - **Paper Texture Overlay**: Subtle paper texture during transition for authenticity
 * - **SVG Mask Animation**: Uses SVG masks to reveal incoming video through scribble patterns
 * - **Fade-Out Outgoing**: Outgoing video fades out underneath the scribble reveal
 * - **Jitter Effects**: Slight rotation and scale variation on incoming video for hand-drawn feel
 *
 * Use cases:
 * - Creative video transitions with artistic flair
 * - Sketch-style reveals for educational content
 * - Hand-drawn animation aesthetics
 * - Organic, imperfect transition effects
 * - Artistic video montages
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
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Duration of the scribble reveal transition in seconds'),
  scribbleCount: z
    .number()
    .int()
    .min(3)
    .max(12)
    .default(6)
    .describe('Number of scribble paths to animate'),
  strokeWidthMin: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Minimum stroke width for scribble lines in pixels'),
  strokeWidthMax: z
    .number()
    .min(6)
    .max(20)
    .default(12)
    .describe('Maximum stroke width for scribble lines in pixels'),
  jitterAmount: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Amount of rotation jitter in degrees (±)'),
  scaleVariation: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .describe('Scale variation amount (e.g., 0.02 = 0.98-1.02 range)'),
  paperTextureOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Opacity of paper texture overlay'),
  strokeColor: z
    .string()
    .default('#000000')
    .describe('Color of scribble strokes'),
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
    scribbleCount,
    strokeWidthMin,
    strokeWidthMax,
    jitterAmount,
    scaleVariation,
    paperTextureOpacity,
    strokeColor,
  } = params;

  // Calculate container duration
  const containerDuration = video1.duration + video2.duration - transitionDuration;

  // Timing calculations
  const outgoingDuration = video1.duration;
  const incomingStart = video1.duration - transitionDuration;
  const incomingDuration = video2.duration + transitionDuration;

  // Get viewport dimensions
  const viewportWidth = props.config?.width || 1920;
  const viewportHeight = props.config?.height || 1080;

  // Helper: Generate random scribble path
  const generateScribblePath = (index: number, total: number): string => {
    const seed = index * 12345; // Simple pseudo-random seed
    const random = (min: number, max: number, offset: number = 0) => {
      const x = Math.sin(seed + offset) * 10000;
      return min + (max - min) * (x - Math.floor(x));
    };

    // Random start position
    const startX = random(0, viewportWidth, index * 1000);
    const startY = random(0, viewportHeight, index * 2000);

    // Generate organic scribble path with bezier curves
    let path = `M ${startX} ${startY}`;
    const segments = Math.floor(random(8, 16, index * 3000));

    for (let i = 0; i < segments; i++) {
      const offsetX = random(-200, 200, i * 100 + index * 5000);
      const offsetY = random(-200, 200, i * 200 + index * 6000);
      const cp1X = random(-150, 150, i * 150 + index * 7000);
      const cp1Y = random(-150, 150, i * 250 + index * 8000);
      const cp2X = random(-150, 150, i * 350 + index * 9000);
      const cp2Y = random(-150, 150, i * 450 + index * 10000);

      path += ` C ${startX + cp1X} ${startY + cp1Y}, ${startX + cp2X} ${startY + cp2Y}, ${startX + offsetX} ${startY + offsetY}`;
      startX += offsetX;
      startY += offsetY;
    }

    return path;
  };

  // Helper: Generate turbulence filter for organic line quality
  const generateTurbulenceFilter = (index: number): string => {
    const filterId = `turbulence-${index}`;
    return `
      <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="${index * 7}"/>
        <feDisplacementMap in="SourceGraphic" scale="3"/>
      </filter>
    `;
  };

  // Generate scribble paths
  const scribblePathsHTML: string[] = [];
  const scribbleMaskPathsHTML: string[] = [];
  const scribbleFilters: string[] = [];

  for (let i = 0; i < scribbleCount; i++) {
    const strokeWidth = strokeWidthMin + ((strokeWidthMax - strokeWidthMin) * i) / scribbleCount;
    const path = generateScribblePath(i, scribbleCount);
    const filterId = `turbulence-${i}`;

    scribbleFilters.push(generateTurbulenceFilter(i));

    // Scribble overlay paths (visible strokes)
    scribblePathsHTML.push(`
      <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
        ${generateTurbulenceFilter(i)}
        <path
          d="${path}"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
          filter="url(#${filterId})"
          style="
            stroke-dasharray: 10000;
            stroke-dashoffset: 10000;
            animation: scribble-draw-${i} ${transitionDuration}s ease-out forwards;
          "
        />
      </svg>
      <style>
        @keyframes scribble-draw-${i} {
          to { stroke-dashoffset: 0; }
        }
      </style>
    `);

    // Mask paths (white on black for reveal)
    scribbleMaskPathsHTML.push(`
      <path
        d="${path}"
        stroke="white"
        stroke-width="${strokeWidth * 2}"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        filter="url(#${filterId})"
        style="
          stroke-dasharray: 10000;
          stroke-dashoffset: 10000;
          animation: scribble-reveal-${i} ${transitionDuration}s ease-out forwards;
        "
      />
      <style>
        @keyframes scribble-reveal-${i} {
          to { stroke-dashoffset: 0; }
        }
      </style>
    `);
  }

  // SVG mask definition
  const svgMaskHTML = `
    <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
      <defs>
        ${scribbleFilters.join('')}
        <mask id="scribble-mask">
          <rect width="100%" height="100%" fill="black"/>
          ${scribbleMaskPathsHTML.join('')}
        </mask>
      </defs>
    </svg>
  `;

  // Paper texture HTML (using CSS pattern)
  const paperTextureHTML = `
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.03) 3px),
        repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.03) 3px);
      opacity: ${paperTextureOpacity};
      mix-blend-mode: multiply;
      pointer-events: none;
    "></div>
  `;

  // Build composition
  const childrenData: RenderableComponentData[] = [
    // Outgoing video (fades out)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: incomingStart,
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
    } as RenderableComponentData,

    // Incoming video container (with mask and jitter)
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 20,
            maskImage: 'url(#scribble-mask)',
            WebkitMaskImage: 'url(#scribble-mask)',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      effects: [
        // Rotation jitter
        {
          id: 'incoming-jitter-rotate',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { key: 'rotate', val: -jitterAmount, prog: 0 },
              { key: 'rotate', val: jitterAmount, prog: 0.33 },
              { key: 'rotate', val: -jitterAmount * 0.5, prog: 0.66 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
        // Scale variation
        {
          id: 'incoming-jitter-scale',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { key: 'scale', val: 1 - scaleVariation, prog: 0 },
              { key: 'scale', val: 1 + scaleVariation, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Incoming video
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingDuration,
            },
          },
        } as RenderableComponentData,

        // SVG mask layer
        {
          id: 'svg-mask-layer',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: svgMaskHTML,
            className: 'absolute inset-0 pointer-events-none',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Scribble overlay strokes
    {
      id: 'scribble-overlay-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
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
      childrenData: scribblePathsHTML.map((html, index) => ({
        id: `scribble-path-${index}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html,
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      })) as RenderableComponentData[],
    } as RenderableComponentData,

    // Paper texture overlay
    {
      id: 'paper-texture-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: paperTextureHTML,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 25,
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'scribble-reveal-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'scribble-reveal-transition',
  title: 'Hand-Drawn Scribble Reveal Transition',
  description:
    'Animated marker stroke transition revealing incoming video through organic hand-drawn scribble patterns with rough line quality and paper texture overlay',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'scribble', 'hand-drawn', 'reveal', 'artistic', 'organic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.5,
    scribbleCount: 6,
    strokeWidthMin: 4,
    strokeWidthMax: 12,
    jitterAmount: 2,
    scaleVariation: 0.02,
    paperTextureOpacity: 0.15,
    strokeColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const scribbleRevealTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
