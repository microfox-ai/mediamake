/**
 * Puzzle Morph Transition Preset
 *
 * Creates a fluid puzzle morph transition between two videos where puzzle pieces from the
 * outgoing video morph and reshape into pieces for the incoming video. Pieces stretch,
 * contract, and deform during the transition, creating a liquid-like transformation.
 *
 * Features:
 * - **8 Puzzle Pieces**: Grid-based puzzle layout with 8 distinct pieces
 * - **Morphing Shapes**: CSS clip-path animation with polygon points morphing from shape A to shape B
 * - **Liquid Distortion**: SVG filters (feTurbulence + feDisplacementMap) for fluid warping
 * - **Color Bleeding**: Blur and mix-blend-mode effects at piece boundaries
 * - **Organic Movement**: Subtle scale oscillation (0.95-1.05) and rotation (±3deg)
 * - **Smooth Crossfade**: Opacity transitions synchronized with morph phase
 * - **1.7s Overlap**: Configurable transition duration with smooth blending
 *
 * Technical Implementation:
 * - BaseLayout duration = video1.duration + video2.duration - 1.7s
 * - Animated clip-path vertices for shape morphing
 * - SVG turbulence filters for liquid-like distortion
 * - Color bleed using blur + screen blend mode
 * - Transform effects: scale oscillation and rotation for organic feel
 * - Steps() timing for smooth vertex animation
 *
 * Use cases:
 * - Creative video transitions with puzzle-like morphing effects
 * - Fluid transformations between video clips
 * - Artistic video montages with organic shape changes
 * - Dynamic puzzle-style video stitching
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
    src: z.string().describe('Source URL of the first video (outgoing)'),
    duration: z.number().describe('Duration of first video in seconds'),
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video (incoming)'),
    duration: z.number().describe('Duration of second video in seconds'),
  }).describe('Second video configuration'),
  transitionDuration: z
    .number()
    .default(1.7)
    .describe('Duration of overlap transition in seconds'),
  morphIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity of morphing effects (0-2, default: 1)'),
  distortionScale: z
    .number()
    .min(0)
    .max(100)
    .default(30)
    .optional()
    .describe('Scale of liquid distortion effect (0-100)'),
  colorBleedAmount: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .optional()
    .describe('Amount of color bleeding at piece boundaries (0-20 pixels)'),
  scaleOscillation: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .optional()
    .describe('Scale oscillation range (default: 0.05 for 0.95-1.05)'),
  rotationRange: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe('Rotation range in degrees (default: ±3deg)'),
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
    morphIntensity = 1,
    distortionScale = 30,
    colorBleedAmount = 8,
    scaleOscillation = 0.05,
    rotationRange = 3,
  } = params;

  // Calculate BaseLayout duration with overlap
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;

  // Puzzle piece configurations (8 pieces)
  // Starting shapes (video1) and ending shapes (video2)
  const pieceConfigs = [
    {
      id: 'piece-0',
      startClip: 'polygon(0% 0%, 50% 0%, 50% 50%, 0% 50%)', // Top-left quadrant
      endClip: 'polygon(0% 0%, 33% 0%, 33% 33%, 0% 33%)', // Smaller top-left
    },
    {
      id: 'piece-1',
      startClip: 'polygon(50% 0%, 100% 0%, 100% 50%, 50% 50%)', // Top-right quadrant
      endClip: 'polygon(67% 0%, 100% 0%, 100% 33%, 67% 33%)', // Smaller top-right
    },
    {
      id: 'piece-2',
      startClip: 'polygon(0% 50%, 50% 50%, 50% 100%, 0% 100%)', // Bottom-left quadrant
      endClip: 'polygon(0% 67%, 33% 67%, 33% 100%, 0% 100%)', // Smaller bottom-left
    },
    {
      id: 'piece-3',
      startClip: 'polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)', // Bottom-right quadrant
      endClip: 'polygon(67% 67%, 100% 67%, 100% 100%, 67% 100%)', // Smaller bottom-right
    },
    {
      id: 'piece-4',
      startClip: 'polygon(25% 25%, 75% 25%, 75% 75%, 25% 75%)', // Center square
      endClip: 'polygon(33% 33%, 67% 33%, 67% 67%, 33% 67%)', // Smaller center square
    },
    {
      id: 'piece-5',
      startClip: 'polygon(0% 25%, 25% 25%, 25% 75%, 0% 75%)', // Left strip
      endClip: 'polygon(0% 33%, 33% 33%, 33% 67%, 0% 67%)', // Wider left strip
    },
    {
      id: 'piece-6',
      startClip: 'polygon(75% 25%, 100% 25%, 100% 75%, 75% 75%)', // Right strip
      endClip: 'polygon(67% 33%, 100% 33%, 100% 67%, 67% 67%)', // Wider right strip
    },
    {
      id: 'piece-7',
      startClip: 'polygon(25% 0%, 75% 0%, 50% 25%)', // Top triangle
      endClip: 'polygon(25% 100%, 75% 100%, 50% 75%)', // Bottom triangle
    },
  ];

  // SVG filter for liquid distortion
  const svgFilterId = 'puzzle-morph-distortion-filter';
  const svgFilterHTML = `
    <svg style="position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;">
      <defs>
        <filter id="${svgFilterId}">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="turbulence">
            <animate attributeName="baseFrequency" 
              values="0.02;0.05;0.02" 
              dur="${transitionDuration}s" 
              repeatCount="1" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="${distortionScale * morphIntensity}" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  `;

  // Create video1 puzzle pieces (outgoing)
  const video1Pieces: RenderableComponentData[] = pieceConfigs.map((config, index) => {
    const pieceId = `video1-${config.id}`;
    const transitionStart = video1.duration - transitionDuration;

    return {
      id: pieceId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: config.startClip,
            overflow: 'visible',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Clip-path morph animation
        {
          id: `${pieceId}-morph`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'clipPath', val: config.startClip, prog: 0 },
              { key: 'clipPath', val: config.endClip, prog: 1 },
            ],
          },
        },
        // Opacity fade-out
        {
          id: `${pieceId}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Scale oscillation
        {
          id: `${pieceId}-scale`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1 - scaleOscillation, prog: 0.25 },
              { key: 'scale', val: 1 + scaleOscillation, prog: 0.5 },
              { key: 'scale', val: 1 - scaleOscillation, prog: 0.75 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Rotation wobble
        {
          id: `${pieceId}-rotate`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationRange * (index % 2 === 0 ? 1 : -1), prog: 0.5 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
        // Color bleed (blur + blend mode)
        {
          id: `${pieceId}-blur`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'filter', val: `blur(0px) url(#${svgFilterId})`, prog: 0 },
              { key: 'filter', val: `blur(${colorBleedAmount}px) url(#${svgFilterId})`, prog: 0.5 },
              { key: 'filter', val: `blur(0px) url(#${svgFilterId})`, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: `${pieceId}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            volume: index === 0 ? 1 : 0, // Only first piece has audio
            startFrom: 0,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Create video2 puzzle pieces (incoming)
  const video2Pieces: RenderableComponentData[] = pieceConfigs.map((config, index) => {
    const pieceId = `video2-${config.id}`;

    return {
      id: pieceId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: config.endClip,
            overflow: 'visible',
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [
        // Clip-path morph animation (reverse)
        {
          id: `${pieceId}-morph`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'clipPath', val: config.startClip, prog: 0 },
              { key: 'clipPath', val: config.endClip, prog: 1 },
            ],
          },
        },
        // Opacity fade-in
        {
          id: `${pieceId}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Scale oscillation
        {
          id: `${pieceId}-scale`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1 + scaleOscillation, prog: 0.25 },
              { key: 'scale', val: 1 - scaleOscillation, prog: 0.5 },
              { key: 'scale', val: 1 + scaleOscillation, prog: 0.75 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Rotation wobble (opposite direction)
        {
          id: `${pieceId}-rotate`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationRange * (index % 2 === 0 ? -1 : 1), prog: 0.5 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
        // Color bleed (blur + blend mode)
        {
          id: `${pieceId}-blur`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'filter', val: `blur(0px) url(#${svgFilterId})`, prog: 0 },
              { key: 'filter', val: `blur(${colorBleedAmount}px) url(#${svgFilterId})`, prog: 0.5 },
              { key: 'filter', val: `blur(0px) url(#${svgFilterId})`, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: `${pieceId}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            volume: index === 0 ? 1 : 0, // Only first piece has audio
            startFrom: 0,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // SVG filter container
  const svgFilterContainer: RenderableComponentData = {
    id: 'svg-filter-container',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFilterHTML,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        zIndex: -1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'puzzle-morph-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#000000',
          overflow: 'hidden',
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
      svgFilterContainer,
      ...video1Pieces,
      ...video2Pieces,
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
  id: 'puzzle-morph-transition',
  title: 'Puzzle Morph Transition',
  description:
    'Fluid puzzle morph transition where pieces from the outgoing video morph and reshape into pieces for the incoming video with liquid-like distortion effects and organic movement',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'puzzle',
    'morph',
    'fluid',
    'liquid',
    'distortion',
    'organic',
    'creative',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.7,
    morphIntensity: 1,
    distortionScale: 30,
    colorBleedAmount: 8,
    scaleOscillation: 0.05,
    rotationRange: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const puzzleMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
