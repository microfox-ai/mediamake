/**
 * Hexagonal Honeycomb Transition Preset
 *
 * This preset creates a stunning 3D hexagonal honeycomb transition effect where the screen
 * fills with hexagonal cells that flip to reveal the new video. Each hexagon rotates in 3D
 * with the outgoing video on one side and the incoming video on the other.
 *
 * Features:
 * - **3D Hexagon Grid**: Generates a honeycomb pattern of hexagonal cells
 * - **3D Rotation**: Each hexagon rotates 180 degrees using perspective transforms
 * - **Wave Propagation**: Flip animation spreads from a configurable origin point
 * - **Dramatic Edge-On Moment**: Brief pause at 90 degrees for dramatic effect
 * - **Scaling Effect**: Hexagons scale up during rotation for added impact
 * - **Glow Effects**: Subtle glow appears during the flip
 * - **Configurable Origin**: Choose where the wave starts (center, corner, etc.)
 *
 * Use cases:
 * - Creating dynamic transitions between video clips
 * - Adding cinematic effects to video sequences
 * - Building engaging scene transitions for presentations
 * - Enhancing video storytelling with visual flair
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(2)
    .describe('Duration of transition overlap in seconds'),
  hexagonRows: z
    .number()
    .default(7)
    .describe('Number of hexagon rows in the grid'),
  hexagonCols: z
    .number()
    .default(10)
    .describe('Number of hexagon columns in the grid'),
  hexagonWidth: z
    .number()
    .default(120)
    .describe('Width of each hexagon in pixels'),
  hexagonHeight: z
    .number()
    .default(104)
    .describe('Height of each hexagon in pixels'),
  originPoint: z
    .enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'])
    .default('center')
    .describe('Origin point for wave propagation'),
  maxStaggerDelay: z
    .number()
    .default(0.8)
    .describe('Maximum stagger delay for wave propagation in seconds'),
  flipDuration: z
    .number()
    .default(0.7)
    .describe('Duration of each hexagon flip animation in seconds'),
  scaleIntensity: z
    .number()
    .default(1.1)
    .describe('Scale multiplier at flip midpoint'),
  glowIntensity: z
    .number()
    .default(20)
    .describe('Glow blur radius in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to calculate distance from origin
  const calculateDistance = (
    row: number,
    col: number,
    rows: number,
    cols: number,
    origin: string,
  ): number => {
    let originRow = 0;
    let originCol = 0;

    switch (origin) {
      case 'center':
        originRow = rows / 2;
        originCol = cols / 2;
        break;
      case 'top-left':
        originRow = 0;
        originCol = 0;
        break;
      case 'top-right':
        originRow = 0;
        originCol = cols - 1;
        break;
      case 'bottom-left':
        originRow = rows - 1;
        originCol = 0;
        break;
      case 'bottom-right':
        originRow = rows - 1;
        originCol = cols - 1;
        break;
    }

    const dx = col - originCol;
    const dy = row - originRow;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper function to calculate hexagon position in honeycomb grid
  const calculateHexPosition = (
    row: number,
    col: number,
    hexWidth: number,
    hexHeight: number,
  ): { x: number; y: number } => {
    const horizontalSpacing = hexWidth * 0.75;
    const verticalSpacing = hexHeight;
    const x = col * horizontalSpacing;
    const y = row * verticalSpacing + (col % 2 === 1 ? verticalSpacing / 2 : 0);
    return { x, y };
  };

  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    hexagonRows,
    hexagonCols,
    hexagonWidth,
    hexagonHeight,
    originPoint,
    maxStaggerDelay,
    flipDuration,
    scaleIntensity,
    glowIntensity,
  } = params;

  const containerWidth = props.config?.width || 1920;
  const containerHeight = props.config?.height || 1080;

  // Calculate total duration
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Calculate maximum distance for normalization
  let maxDistance = 0;
  for (let row = 0; row < hexagonRows; row++) {
    for (let col = 0; col < hexagonCols; col++) {
      const distance = calculateDistance(
        row,
        col,
        hexagonRows,
        hexagonCols,
        originPoint,
      );
      if (distance > maxDistance) maxDistance = distance;
    }
  }

  // Generate hexagon cells
  const hexagonCells: RenderableComponentData[] = [];

  for (let row = 0; row < hexagonRows; row++) {
    for (let col = 0; col < hexagonCols; col++) {
      const { x, y } = calculateHexPosition(
        row,
        col,
        hexagonWidth,
        hexagonHeight,
      );
      const distance = calculateDistance(
        row,
        col,
        hexagonRows,
        hexagonCols,
        originPoint,
      );
      const normalizedDistance =
        maxDistance > 0 ? distance / maxDistance : 0;
      const staggerDelay = normalizedDistance * maxStaggerDelay;
      const flipStart =
        outgoingVideo.duration - overlapDuration + staggerDelay;

      const hexId = `hexagon-${row}-${col}`;

      // Calculate object position to align video with cell grid position
      const objectPosX = (-x / containerWidth) * 100;
      const objectPosY = (-y / containerHeight) * 100;

      hexagonCells.push({
        id: hexId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${hexagonWidth}px`,
              height: `${hexagonHeight}px`,
              left: `${x}px`,
              top: `${y}px`,
              clipPath:
                'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
              perspective: '1000px',
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
          // Outgoing video face (front)
          {
            id: `${hexId}-outgoing`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: outgoingVideo.src,
              fit: 'cover',
              className: 'absolute inset-0 w-full h-full',
              style: {
                objectPosition: `${objectPosX}% ${objectPosY}%`,
                backfaceVisibility: 'hidden',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: outgoingVideo.duration,
              },
            },
          } as RenderableComponentData,
          // Incoming video face (back)
          {
            id: `${hexId}-incoming`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: incomingVideo.src,
              fit: 'cover',
              className: 'absolute inset-0 w-full h-full',
              style: {
                objectPosition: `${objectPosX}% ${objectPosY}%`,
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              },
            },
            context: {
              timing: {
                start: outgoingVideo.duration - overlapDuration,
                duration: incomingVideo.duration + overlapDuration,
              },
            },
          } as RenderableComponentData,
        ],
        effects: [
          // Rotation effect with edge-on pause
          {
            id: `${hexId}-flip`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: flipStart,
              duration: flipDuration,
              mode: 'provider',
              targetIds: [hexId],
              ranges: [
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: 85, prog: 0.45 },
                { key: 'rotateY', val: 90, prog: 0.5 }, // Edge-on moment
                { key: 'rotateY', val: 95, prog: 0.55 },
                { key: 'rotateY', val: 180, prog: 1 },
              ],
            },
          },
          // Scale effect
          {
            id: `${hexId}-scale`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: flipStart,
              duration: flipDuration,
              mode: 'provider',
              targetIds: [hexId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: scaleIntensity, prog: 0.5 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
          // Glow effect
          {
            id: `${hexId}-glow`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: flipStart,
              duration: flipDuration,
              mode: 'provider',
              targetIds: [hexId],
              ranges: [
                {
                  key: 'filter',
                  val: 'drop-shadow(0 0 0px rgba(255,255,255,0))',
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: `drop-shadow(0 0 ${glowIntensity}px rgba(255,255,255,0.5))`,
                  prog: 0.5,
                },
                {
                  key: 'filter',
                  val: 'drop-shadow(0 0 0px rgba(255,255,255,0))',
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  const rootContainer: RenderableComponentData = {
    id: 'hexagonal-honeycomb-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: hexagonCells,
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
  id: 'hexagonal-honeycomb-transition',
  title: 'Hexagonal Honeycomb Transition',
  description:
    'A 3D hexagonal honeycomb transition where hexagonal cells flip to reveal the new video with wave propagation, scaling, and glow effects',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'hexagon', 'honeycomb', '3d', 'flip', 'wave'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 2,
    hexagonRows: 7,
    hexagonCols: 10,
    hexagonWidth: 120,
    hexagonHeight: 104,
    originPoint: 'center',
    maxStaggerDelay: 0.8,
    flipDuration: 0.7,
    scaleIntensity: 1.1,
    glowIntensity: 20,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hexagonalHoneycombTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
