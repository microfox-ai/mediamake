/**
 * Particle Dispersion Grid Transition Preset
 *
 * Creates a 4x4 grid of videos that break apart into 25 particles each (400 total pieces)
 * during a 3-second transition. Particles explode outward from center with varying velocities,
 * rotations, and motion blur, then coalesce into new videos.
 *
 * Features:
 * - 4x4 grid of video cells (16 videos)
 * - Each cell divides into 5x5 sub-grid (25 segments per video, 400 total)
 * - Particle explosion with custom vectors from center
 * - Ripple effect based on distance from grid center
 * - Motion blur and opacity effects during movement
 * - Video swap at midpoint for seamless transition
 * - Performance optimized with will-change and preserve-3d
 *
 * Use cases:
 * - Creating dramatic video grid transitions
 * - Building particle-based video effects
 * - Implementing ripple transition effects
 * - Creating multi-video mosaic transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  initialVideos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL for initial grid'),
        startFrom: z.number().optional().describe('Start time in video'),
        playbackRate: z.number().optional().describe('Playback speed'),
      }),
    )
    .length(16)
    .describe('16 video sources for initial 4x4 grid'),

  finalVideos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL for final grid'),
        startFrom: z.number().optional().describe('Start time in video'),
        playbackRate: z.number().optional().describe('Playback speed'),
      }),
    )
    .length(16)
    .describe('16 video sources for final 4x4 grid'),

  transitionDuration: z
    .number()
    .default(3)
    .describe('Total transition duration in seconds'),

  explosionIntensity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Intensity of particle explosion (distance multiplier)'),

  timingSpreadMultiplier: z
    .number()
    .default(0.1)
    .describe('Delay multiplier for ripple effect (seconds per distance unit)'),

  rotationIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Rotation intensity during explosion'),

  blurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Maximum blur amount in pixels during movement'),

  opacityMin: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Minimum opacity during movement'),

  trackName: z
    .string()
    .default('particle-grid-transition')
    .describe('Track name for ID generation'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    initialVideos,
    finalVideos,
    transitionDuration,
    explosionIntensity,
    timingSpreadMultiplier,
    rotationIntensity,
    blurAmount,
    opacityMin,
    trackName,
  } = params;

  // Helper: Calculate distance from grid center (1.5, 1.5)
  const calculateDistanceFromCenter = (row: number, col: number): number => {
    return Math.sqrt(Math.pow(row - 1.5, 2) + Math.pow(col - 1.5, 2));
  };

  // Helper: Calculate explosion vector from segment position
  const calculateExplosionVector = (
    cellRow: number,
    cellCol: number,
    segRow: number,
    segCol: number,
  ): { x: number; y: number } => {
    // Cell center in grid coordinates
    const cellCenterX = cellCol + 0.5;
    const cellCenterY = cellRow + 0.5;

    // Segment position within cell (0-1 range)
    const segPosX = segCol / 5;
    const segPosY = segRow / 5;

    // Global segment position
    const globalX = cellCol + segPosX;
    const globalY = cellRow + segPosY;

    // Vector from grid center (1.5, 1.5)
    const vecX = globalX - 1.5;
    const vecY = globalY - 1.5;

    // Normalize and scale
    const magnitude = Math.sqrt(vecX * vecX + vecY * vecY) || 1;
    return {
      x: (vecX / magnitude) * explosionIntensity * 100,
      y: (vecY / magnitude) * explosionIntensity * 100,
    };
  };

  // Helper: Calculate rotation for particle
  const calculateRotation = (
    cellRow: number,
    cellCol: number,
    segRow: number,
    segCol: number,
  ): number => {
    const angle = Math.atan2(cellRow - 1.5, cellCol - 1.5);
    return angle * rotationIntensity * 180;
  };

  // Build all 16 cells with 25 segments each
  const cellsChildren: RenderableComponentData[] = [];

  for (let cellRow = 0; cellRow < 4; cellRow++) {
    for (let cellCol = 0; cellCol < 4; cellCol++) {
      const cellIndex = cellRow * 4 + cellCol;
      const cellId = `${trackName}-cell-${cellRow}-${cellCol}`;
      const initialVideo = initialVideos[cellIndex];
      const finalVideo = finalVideos[cellIndex];

      // Calculate delay for this cell based on distance from center
      const cellDistance = calculateDistanceFromCenter(cellRow, cellCol);
      const cellDelay = cellDistance * timingSpreadMultiplier;

      // Create 25 segments for this cell
      const segmentsChildren: RenderableComponentData[] = [];

      for (let segRow = 0; segRow < 5; segRow++) {
        for (let segCol = 0; segCol < 5; segCol++) {
          const segmentId = `${cellId}-segment-${segRow}-${segCol}`;
          const explosionVector = calculateExplosionVector(
            cellRow,
            cellCol,
            segRow,
            segCol,
          );
          const rotation = calculateRotation(cellRow, cellCol, segRow, segCol);

          // Segment positioning
          const topPercent = segRow * 20;
          const leftPercent = segCol * 20;

          // Clip path to show only this segment
          const clipPath = `inset(${segRow * 20}% ${100 - (segCol + 1) * 20}% ${100 - (segRow + 1) * 20}% ${segCol * 20}%)`;

          // Background position for video alignment
          const backgroundPositionX = -(segCol * 20);
          const backgroundPositionY = -(segRow * 20);

          // Phase 1: Explosion (0-1s relative to cell)
          // Phase 2: Hold dispersed (1-2s)
          // Phase 3: Coalesce (2-3s)

          // Video switches at 1.5s (midpoint)
          const segment: RenderableComponentData = {
            id: segmentId,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                style: {
                  position: 'absolute',
                  width: '20%',
                  height: '20%',
                  top: `${topPercent}%`,
                  left: `${leftPercent}%`,
                  clipPath: clipPath,
                  transformStyle: 'preserve-3d',
                  willChange: 'transform',
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
              // Initial video (0-1.5s)
              {
                id: `${segmentId}-initial`,
                type: 'atom',
                componentId: 'VideoAtom',
                data: {
                  src: initialVideo.src,
                  startFrom: initialVideo.startFrom ?? 0,
                  playbackRate: initialVideo.playbackRate ?? 1,
                  fit: 'cover',
                  muted: true,
                  style: {
                    position: 'absolute',
                    width: '500%',
                    height: '500%',
                    top: `${backgroundPositionY}%`,
                    left: `${backgroundPositionX}%`,
                    objectFit: 'cover',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: 1.5,
                  },
                },
              } as RenderableComponentData,
              // Final video (1.5-3s)
              {
                id: `${segmentId}-final`,
                type: 'atom',
                componentId: 'VideoAtom',
                data: {
                  src: finalVideo.src,
                  startFrom: finalVideo.startFrom ?? 0,
                  playbackRate: finalVideo.playbackRate ?? 1,
                  fit: 'cover',
                  muted: true,
                  style: {
                    position: 'absolute',
                    width: '500%',
                    height: '500%',
                    top: `${backgroundPositionY}%`,
                    left: `${backgroundPositionX}%`,
                    objectFit: 'cover',
                  },
                },
                context: {
                  timing: {
                    start: 1.5,
                    duration: 1.5,
                  },
                },
              } as RenderableComponentData,
            ],
            effects: [
              // Phase 1: Explosion (0-1s)
              {
                id: `${segmentId}-explode`,
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: cellDelay,
                  duration: 1,
                  mode: 'provider',
                  targetIds: [segmentId],
                  ranges: [
                    // Translate
                    {
                      key: 'translateX',
                      val: 0,
                      prog: 0,
                    },
                    {
                      key: 'translateX',
                      val: explosionVector.x,
                      prog: 1,
                    },
                    {
                      key: 'translateY',
                      val: 0,
                      prog: 0,
                    },
                    {
                      key: 'translateY',
                      val: explosionVector.y,
                      prog: 1,
                    },
                    // Scale down
                    {
                      key: 'scale',
                      val: 1,
                      prog: 0,
                    },
                    {
                      key: 'scale',
                      val: 0.8,
                      prog: 1,
                    },
                    // Rotate
                    {
                      key: 'rotate',
                      val: 0,
                      prog: 0,
                    },
                    {
                      key: 'rotate',
                      val: rotation,
                      prog: 1,
                    },
                    // Blur
                    {
                      key: 'filter',
                      val: 'blur(0px)',
                      prog: 0,
                    },
                    {
                      key: 'filter',
                      val: `blur(${blurAmount}px)`,
                      prog: 1,
                    },
                    // Opacity
                    {
                      key: 'opacity',
                      val: 1,
                      prog: 0,
                    },
                    {
                      key: 'opacity',
                      val: opacityMin,
                      prog: 1,
                    },
                  ],
                },
              },
              // Phase 3: Coalesce (2-3s)
              {
                id: `${segmentId}-coalesce`,
                componentId: 'generic',
                data: {
                  type: 'ease-in',
                  start: 2 + cellDelay,
                  duration: 1,
                  mode: 'provider',
                  targetIds: [segmentId],
                  ranges: [
                    // Translate back
                    {
                      key: 'translateX',
                      val: explosionVector.x,
                      prog: 0,
                    },
                    {
                      key: 'translateX',
                      val: 0,
                      prog: 1,
                    },
                    {
                      key: 'translateY',
                      val: explosionVector.y,
                      prog: 0,
                    },
                    {
                      key: 'translateY',
                      val: 0,
                      prog: 1,
                    },
                    // Scale back to 1
                    {
                      key: 'scale',
                      val: 0.8,
                      prog: 0,
                    },
                    {
                      key: 'scale',
                      val: 1,
                      prog: 1,
                    },
                    // Rotate back
                    {
                      key: 'rotate',
                      val: rotation,
                      prog: 0,
                    },
                    {
                      key: 'rotate',
                      val: 0,
                      prog: 1,
                    },
                    // Blur remove
                    {
                      key: 'filter',
                      val: `blur(${blurAmount}px)`,
                      prog: 0,
                    },
                    {
                      key: 'filter',
                      val: 'blur(0px)',
                      prog: 1,
                    },
                    // Opacity restore
                    {
                      key: 'opacity',
                      val: opacityMin,
                      prog: 0,
                    },
                    {
                      key: 'opacity',
                      val: 1,
                      prog: 1,
                    },
                  ],
                },
              },
            ],
          };

          segmentsChildren.push(segment);
        }
      }

      // Cell container
      const cell: RenderableComponentData = {
        id: cellId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative overflow-hidden',
            style: {
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: segmentsChildren,
      };

      cellsChildren.push(cell);
    }
  }

  // Grid container
  const gridContainer: RenderableComponentData = {
    id: `${trackName}-grid-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid grid-cols-4 gap-0.5 w-full h-full',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: cellsChildren,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [gridContainer],
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
  id: 'particle-grid-transition-4x4',
  title: 'Particle Dispersion Grid Transition',
  description:
    'A 4x4 grid of videos that break apart into 25 particles each (400 total pieces) during a 3-second transition. Particles explode outward from center with varying velocities, rotations, and motion blur, then coalesce into new videos. Features ripple effect based on distance from center with staggered timing offsets.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'particle',
    'grid',
    'video',
    'explosion',
    'dispersion',
    'ripple',
    'mosaic',
  ],
  defaultInputParams: {
    initialVideos: Array(16)
      .fill(null)
      .map((_, i) => ({
        src: `https://example.com/video-initial-${i}.mp4`,
        startFrom: 0,
        playbackRate: 1,
      })),
    finalVideos: Array(16)
      .fill(null)
      .map((_, i) => ({
        src: `https://example.com/video-final-${i}.mp4`,
        startFrom: 0,
        playbackRate: 1,
      })),
    transitionDuration: 3,
    explosionIntensity: 1.5,
    timingSpreadMultiplier: 0.1,
    rotationIntensity: 1,
    blurAmount: 2,
    opacityMin: 0.7,
    trackName: 'particle-grid-transition',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const particleGridTransition4x4Preset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
