/**
 * Hexagonal Honeycomb Mask Transition Preset
 *
 * A visually striking transition effect where the outgoing video is masked by animated hexagonal
 * shapes arranged in a honeycomb grid pattern. Hexagons shrink and disappear with staggered timing,
 * creating a dissolving pattern from center outward to reveal the incoming video beneath.
 *
 * Features:
 * - **Honeycomb Grid Pattern**: 15 hexagons positioned in authentic honeycomb layout
 * - **Staggered Animation**: Hexagons animate from center outward with 50ms delays
 * - **Dual Transform**: Scale (1 → 0) and rotate (0° → 30°) for organic movement
 * - **Incoming Video Zoom**: Subtle zoom-in effect (1.1 → 1) during reveal
 * - **Warm Color Overlay**: Semi-transparent orange overlay that fades during transition
 * - **Multiply Blend Mode**: Creates visual depth and professional mask effects
 *
 * Use cases:
 * - Professional video transitions with geometric aesthetics
 * - Content reveals with organic, nature-inspired patterns
 * - Creative transitions for lifestyle, design, or brand content
 * - Artistic video editing requiring unique mask-based transitions
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
    .describe('Source URL of the incoming video that will be revealed'),
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video that will be masked'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition effect in seconds'),
  hexagonSize: z
    .number()
    .default(200)
    .describe('Size of each hexagon in pixels'),
  staggerDelay: z
    .number()
    .default(0.05)
    .describe('Delay between each hexagon animation start in seconds'),
  rotationAmount: z
    .number()
    .default(30)
    .describe('Amount of rotation for hexagons in degrees'),
  overlayOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity of the warm orange overlay at start'),
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
    hexagonSize,
    staggerDelay,
    rotationAmount,
    overlayOpacity,
  } = params;

  // Get viewport dimensions
  const viewportWidth = props.config?.width || 1920;
  const viewportHeight = props.config?.height || 1080;

  // Calculate honeycomb grid positions
  // Honeycomb layout uses offset rows for authentic hexagonal tessellation
  const calculateHoneycombPositions = (): Array<{ x: number; y: number }> => {
    const positions: Array<{ x: number; y: number }> = [];
    const cols = 5;
    const rows = 3;
    const hexWidth = hexagonSize * 0.866; // width = size * sqrt(3)/2
    const hexHeight = hexagonSize * 0.75; // height offset for honeycomb

    // Center the grid
    const gridWidth = (cols - 1) * hexWidth;
    const gridHeight = (rows - 1) * hexHeight;
    const startX = (viewportWidth - gridWidth) / 2;
    const startY = (viewportHeight - gridHeight) / 2;

    // Generate honeycomb positions (center hex + 2 rings)
    // Center hexagon
    positions.push({
      x: viewportWidth / 2,
      y: viewportHeight / 2,
    });

    // Ring 1 (6 hexagons around center)
    const ring1Angles = [0, 60, 120, 180, 240, 300];
    const ring1Radius = hexWidth;
    ring1Angles.forEach((angle) => {
      const radian = (angle * Math.PI) / 180;
      positions.push({
        x: viewportWidth / 2 + ring1Radius * Math.cos(radian),
        y: viewportHeight / 2 + ring1Radius * Math.sin(radian),
      });
    });

    // Ring 2 (8 hexagons around ring 1)
    const ring2Positions = [
      { x: 0, y: -2 },
      { x: 1.5, y: -1.3 },
      { x: 1.5, y: 0.7 },
      { x: 0, y: 2 },
      { x: -1.5, y: 1.3 },
      { x: -1.5, y: -0.7 },
      { x: 0.8, y: -2 },
      { x: -0.8, y: 2 },
    ];
    ring2Positions.forEach((offset) => {
      positions.push({
        x: viewportWidth / 2 + offset.x * hexWidth,
        y: viewportHeight / 2 + offset.y * hexHeight,
      });
    });

    return positions.slice(0, 15); // Ensure we have exactly 15
  };

  const hexagonPositions = calculateHoneycombPositions();

  // Create hexagon SVG path
  const hexagonSvg = `<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg' style='width: 100%; height: 100%;'><polygon points='50,5 93.3,27.5 93.3,72.5 50,95 6.7,72.5 6.7,27.5' fill='black'/></svg>`;

  // Create hexagon mask atoms with staggered timing
  const hexagonMasks = hexagonPositions.map((pos, index) => {
    const effectStart = index * staggerDelay;
    const effectDuration = 0.8;

    return {
      id: `hexagon-mask-${index}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: hexagonSvg,
        className: 'absolute',
        style: {
          width: `${hexagonSize}px`,
          height: `${hexagonSize}px`,
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none' as const,
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
          id: `hexagon-effect-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: effectStart,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [`hexagon-mask-${index}`],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationAmount, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create incoming video with zoom-in effect
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        zIndex: 1,
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
        id: 'incoming-zoom-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 1.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create outgoing video
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Create hexagon mask container with multiply blend mode
  const hexagonMaskContainer: RenderableComponentData = {
    id: 'hexagon-mask-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 3,
          mixBlendMode: 'multiply' as const,
          pointerEvents: 'none' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: hexagonMasks as RenderableComponentData[],
  };

  // Create outgoing video container
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [outgoingVideo, hexagonMaskContainer] as RenderableComponentData[],
  };

  // Create warm overlay
  const warmOverlay: RenderableComponentData = {
    id: 'warm-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 bg-orange-500',
      style: {
        zIndex: 4,
        opacity: overlayOpacity,
        pointerEvents: 'none' as const,
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
        id: 'overlay-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['warm-overlay'],
          ranges: [
            { key: 'opacity', val: overlayOpacity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'hexagonal-honeycomb-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden' as const,
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
      incomingVideo,
      outgoingVideoContainer,
      warmOverlay,
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
  id: 'hexagonal-honeycomb-mask-transition',
  title: 'Hexagonal Honeycomb Mask Transition',
  description:
    'A stunning transition effect where the outgoing video is masked by animated hexagonal shapes in a honeycomb grid pattern that shrink and disappear with staggered timing from center outward to reveal the incoming video with a subtle zoom effect',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'hexagon',
    'honeycomb',
    'mask',
    'geometric',
    'animated',
    'video',
    'reveal',
    'stagger',
  ],
  defaultInputParams: {
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    transitionDuration: 1.5,
    hexagonSize: 200,
    staggerDelay: 0.05,
    rotationAmount: 30,
    overlayOpacity: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hexagonalHoneycombMaskTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
