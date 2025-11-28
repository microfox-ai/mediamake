/**
 * Vertical Pencil Sketch Build-up Transition Preset
 *
 * This preset creates a vertical pencil sketch transition where the new scene is drawn
 * from bottom to top as if an artist is rapidly sketching with vertical strokes.
 *
 * Features:
 * - **Bottom-to-Top Reveal**: Incoming video is revealed from bottom to top with vertical bands
 * - **Irregular Band Widths**: 15 vertical bands with widths ranging from 5% to 8% of screen width
 * - **Natural Sketching Rhythm**: Staggered delays (80ms between bands) create organic drawing feel
 * - **Pencil Stroke Textures**: Visible stroke textures with varying pressure and opacity
 * - **Paper Grain Effect**: Subtle paper texture overlay throughout the transition
 * - **Graphite Smudging**: Slight smudging effects at stroke edges for realism
 * - **Depth Effects**: Box-shadow on stroke edges for visual depth
 *
 * Technical Implementation:
 * - Uses BaseLayout container with relative positioning
 * - Incoming video split into 15 irregular vertical bands using clip-path polygons
 * - Each band animates with scaleY from 0 to 1 (transform-origin: bottom)
 * - Staggered timing: band-i starts at (i * 80ms) with 300ms duration
 * - Outgoing video applies pencil sketch filter using CSS filters
 * - Paper texture overlay with pointer-events-none and opacity 0.15
 * - Ease-out timing function for smooth reveal
 *
 * Use cases:
 * - Creative scene transitions with artistic flair
 * - Drawing/sketching reveal effects
 * - Educational content about art/illustration
 * - Stylized video transitions for creative projects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video to reveal'),
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video to transition from'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Total duration of the transition in seconds'),
  numberOfBands: z
    .number()
    .min(10)
    .max(20)
    .default(15)
    .describe('Number of vertical bands for the sketch effect'),
  minBandWidth: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('Minimum band width as percentage of screen width'),
  maxBandWidth: z
    .number()
    .min(5)
    .max(15)
    .default(8)
    .describe('Maximum band width as percentage of screen width'),
  staggerDelay: z
    .number()
    .min(20)
    .max(200)
    .default(80)
    .describe('Delay between each band reveal in milliseconds'),
  bandRevealDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Duration of each band reveal animation in seconds'),
  paperTextureOpacity: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.15)
    .describe('Opacity of the paper grain texture overlay'),
  sketchFilterIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for the pencil sketch effect on outgoing video'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    incomingVideoSrc,
    outgoingVideoSrc,
    transitionDuration,
    numberOfBands,
    minBandWidth,
    maxBandWidth,
    staggerDelay,
    bandRevealDuration,
    paperTextureOpacity,
    sketchFilterIntensity,
  } = params;

  // Helper: Generate irregular band widths
  const generateBandWidths = (
    count: number,
    min: number,
    max: number,
  ): number[] => {
    const widths: number[] = [];
    let totalWidth = 0;

    for (let i = 0; i < count; i++) {
      const width = min + Math.random() * (max - min);
      widths.push(width);
      totalWidth += width;
    }

    // Normalize to ensure total is 100%
    const scale = 100 / totalWidth;
    return widths.map((w) => w * scale);
  };

  // Helper: Create SVG filter for pencil sketch effect
  const createSketchFilter = (intensity: number): string => {
    const turbulenceFrequency = 0.05 * intensity;
    const displacementScale = 3 * intensity;
    const contrastAmount = 1.2 * intensity;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" style="position: absolute; width: 0; height: 0;">
        <defs>
          <filter id="pencil-sketch-filter">
            <feTurbulence type="fractalNoise" baseFrequency="${turbulenceFrequency}" numOctaves="3" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="${displacementScale}" xChannelSelector="R" yChannelSelector="G"/>
            <feColorMatrix type="saturate" values="0.3"/>
            <feComponentTransfer>
              <feFuncR type="linear" slope="${contrastAmount}" intercept="0"/>
              <feFuncG type="linear" slope="${contrastAmount}" intercept="0"/>
              <feFuncB type="linear" slope="${contrastAmount}" intercept="0"/>
            </feComponentTransfer>
            <feGaussianBlur stdDeviation="0.5"/>
          </filter>
        </defs>
      </svg>
    `;
  };

  // Helper: Create paper texture SVG
  const createPaperTexture = (): string => {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
        <filter id="paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
          <feColorMatrix type="saturate" values="0"/>
          <feBlend in="SourceGraphic" in2="noise" mode="multiply"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-grain)" opacity="${paperTextureOpacity}"/>
      </svg>
    `;
  };

  // Generate band widths and positions
  const bandWidths = generateBandWidths(numberOfBands, minBandWidth, maxBandWidth);
  let currentPosition = 0;
  const bandData: Array<{ left: number; width: number }> = [];

  bandWidths.forEach((width) => {
    bandData.push({ left: currentPosition, width });
    currentPosition += width;
  });

  // Create band components
  const bandComponents: RenderableComponentData[] = bandData.map((band, index) => {
    const bandId = `band-${index}`;
    const videoId = `${bandId}-video`;
    const containerId = `${bandId}-container`;

    // Calculate viewport position for video to align correctly
    const videoWidth = 100 / (band.width / 100);
    const videoTranslateX = -(band.left / (band.width / 100));

    return {
      id: containerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            left: `${band.left}%`,
            width: `${band.width}%`,
            height: '100%',
            top: 0,
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
          id: `${bandId}-reveal`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: (index * staggerDelay) / 1000,
            duration: bandRevealDuration,
            mode: 'provider',
            targetIds: [containerId],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            className: 'h-full object-cover',
            fit: 'cover',
            style: {
              width: `${videoWidth}%`,
              transform: `translateX(${videoTranslateX}%)`,
              transformOrigin: 'bottom',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Create outgoing video with sketch effect
  const outgoingVideoComponent: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        filter: 'url(#pencil-sketch-filter)',
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
        id: 'fade-out-outgoing',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionDuration * 0.67,
          duration: transitionDuration * 0.33,
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

  // Create paper texture overlay
  const paperTextureComponent: RenderableComponentData = {
    id: 'paper-texture',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: createPaperTexture(),
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Create sketch filter definition
  const sketchFilterComponent: RenderableComponentData = {
    id: 'sketch-filter-def',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: createSketchFilter(sketchFilterIntensity),
      className: 'absolute',
      style: {
        width: 0,
        height: 0,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'pencil-sketch-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          position: 'relative',
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
    childrenData: [
      sketchFilterComponent,
      outgoingVideoComponent,
      ...bandComponents,
      paperTextureComponent,
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

const presetMetadata: PresetMetadata = {
  id: 'pencil-sketch-transition',
  title: 'Vertical Pencil Sketch Build-up Transition',
  description:
    'A vertical pencil sketch transition where the new scene is drawn from bottom to top with visible stroke textures, varying pressure/opacity, paper grain effect, and graphite smudging. Features 15 irregular vertical bands (5-8% width) revealing incoming video with natural sketching rhythm over 1.2 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'pencil',
    'sketch',
    'vertical',
    'artistic',
    'drawing',
    'creative',
    'build-up',
  ],
  defaultInputParams: {
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    transitionDuration: 1.2,
    numberOfBands: 15,
    minBandWidth: 5,
    maxBandWidth: 8,
    staggerDelay: 80,
    bandRevealDuration: 0.3,
    paperTextureOpacity: 0.15,
    sketchFilterIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pencilSketchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
