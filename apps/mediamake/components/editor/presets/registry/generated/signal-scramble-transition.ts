/**
 * Signal Scramble Transition Preset
 *
 * Simulates encrypted video decryption between clips with sliding puzzle-piece segments.
 * The outgoing video becomes increasingly scrambled as segments slide to random positions,
 * then the incoming video decrypts into view as segments slide from random positions to
 * correct grid positions.
 *
 * Features:
 * - 5x4 grid of video segments (20 total pieces)
 * - Cascading animation delays creating wave-like effect
 * - Elastic easing (cubic-bezier) for bouncy motion
 * - Digital noise and encryption artifacts
 * - Color shifts and binary code overlays
 * - 1.4s overlap transition period
 *
 * Technical:
 * - BaseLayout with overflow-hidden container
 * - Segments use absolute positioning with clip-path for grid subdivision
 * - Random translate positions for scramble/unscramble effects
 * - Animation delays based on grid position (row * 0.1s + col * 0.05s)
 * - Filter effects for digital artifacts
 *
 * Use cases:
 * - Dramatic transitions between video clips
 * - Tech/cyberpunk themed content
 * - Data processing visualizations
 * - Encryption/decryption sequences
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
  }),
  video2: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.4)
    .describe('Duration of transition overlap in seconds'),
  gridRows: z.number().default(4).describe('Number of grid rows'),
  gridCols: z.number().default(5).describe('Number of grid columns'),
  scrambleIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity of scramble effect (multiplier for random positions)'),
  showEncryptionOverlay: z
    .boolean()
    .default(true)
    .describe('Show green digital noise overlay during transition'),
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
    gridRows,
    gridCols,
    scrambleIntensity,
    showEncryptionOverlay,
  } = params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Helper: Generate random position for scrambling
  const getRandomPosition = (
    row: number,
    col: number,
    intensity: number,
  ): { x: number; y: number } => {
    const seed = row * gridCols + col;
    const pseudoRandom = (n: number) =>
      Math.abs(Math.sin(n * 12.9898 + 78.233) * 43758.5453) % 1;

    const maxOffset = 150 * intensity;
    const x = (pseudoRandom(seed * 2) - 0.5) * 2 * maxOffset;
    const y = (pseudoRandom(seed * 3) - 0.5) * 2 * maxOffset;

    return { x, y };
  };

  // Helper: Generate random hue rotation for digital artifacts
  const getRandomHueRotate = (row: number, col: number): number => {
    const seed = row * gridCols + col;
    const pseudoRandom = Math.abs(
      Math.sin(seed * 45.678 + 123.456) * 43758.5453,
    );
    return (pseudoRandom % 1) * 60 - 30; // -30 to +30 degrees
  };

  // Create grid segments for outgoing video
  const outgoingSegments: RenderableComponentData[] = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const segmentId = `outgoing-segment-${row}-${col}`;
      const randomPos = getRandomPosition(row, col, scrambleIntensity);
      const hueRotate = getRandomHueRotate(row, col);
      const animationDelay = row * 0.1 + col * 0.05;

      // Calculate clip-path for this segment
      const clipLeft = (col / gridCols) * 100;
      const clipRight = ((gridCols - col - 1) / gridCols) * 100;
      const clipTop = (row / gridRows) * 100;
      const clipBottom = ((gridRows - row - 1) / gridRows) * 100;

      outgoingSegments.push({
        id: segmentId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute overflow-hidden',
            style: {
              left: `${clipLeft}%`,
              top: `${clipTop}%`,
              width: `${100 / gridCols}%`,
              height: `${100 / gridRows}%`,
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
          {
            id: `scramble-out-${segmentId}`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              mode: 'provider',
              targetIds: [segmentId],
              start: video1.duration - transitionDuration + animationDelay,
              duration: transitionDuration - animationDelay,
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: randomPos.x, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: randomPos.y, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 0.9 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: `video-out-${row}-${col}`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video1.src,
              className: 'w-full h-full',
              fit: 'cover',
              style: {
                objectFit: 'cover',
                position: 'absolute',
                left: `${-clipLeft}%`,
                top: `${-clipTop}%`,
                width: `${gridCols * 100}%`,
                height: `${gridRows * 100}%`,
                filter: `contrast(150%) brightness(90%) hue-rotate(${hueRotate}deg)`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: video1.duration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData);
    }
  }

  // Create grid segments for incoming video
  const incomingSegments: RenderableComponentData[] = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const segmentId = `incoming-segment-${row}-${col}`;
      const randomPos = getRandomPosition(row, col, scrambleIntensity);
      const hueRotate = getRandomHueRotate(row, col);
      const animationDelay = row * 0.1 + col * 0.05;

      // Calculate clip-path for this segment
      const clipLeft = (col / gridCols) * 100;
      const clipRight = ((gridCols - col - 1) / gridCols) * 100;
      const clipTop = (row / gridRows) * 100;
      const clipBottom = ((gridRows - row - 1) / gridRows) * 100;

      incomingSegments.push({
        id: segmentId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute overflow-hidden',
            style: {
              left: `${clipLeft}%`,
              top: `${clipTop}%`,
              width: `${100 / gridCols}%`,
              height: `${100 / gridRows}%`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: `scramble-in-${segmentId}`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              mode: 'provider',
              targetIds: [segmentId],
              start: animationDelay,
              duration: transitionDuration - animationDelay,
              ranges: [
                { key: 'translateX', val: randomPos.x, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: randomPos.y, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: `video-in-${row}-${col}`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video2.src,
              className: 'w-full h-full',
              fit: 'cover',
              startFrom: 0,
              style: {
                objectFit: 'cover',
                position: 'absolute',
                left: `${-clipLeft}%`,
                top: `${-clipTop}%`,
                width: `${gridCols * 100}%`,
                height: `${gridRows * 100}%`,
                filter: `contrast(150%) brightness(90%) hue-rotate(${hueRotate}deg)`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: video2.duration + transitionDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData);
    }
  }

  // Create encryption overlay (green digital noise)
  const encryptionOverlay: RenderableComponentData[] = showEncryptionOverlay
    ? [
        {
          id: 'encryption-overlay',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; inset: 0; background: rgba(0, 255, 0, 0.05); pointer-events: none; mix-blend-mode: screen; font-family: 'Courier New', monospace; font-size: 12px; color: rgba(0, 255, 0, 0.3); overflow: hidden; line-height: 1.2;">
              ${'1010101010'.repeat(50)}
            </div>`,
            className: 'absolute inset-0',
            style: {
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: video1.duration - transitionDuration,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'encryption-flicker',
              componentId: 'generic',
              data: {
                type: 'linear',
                mode: 'provider',
                targetIds: ['encryption-overlay'],
                start: 0,
                duration: transitionDuration,
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.8, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ]
    : [];

  // Build composition structure
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: outgoingSegments,
  };

  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    childrenData: incomingSegments,
  };

  const rootContainer: RenderableComponentData = {
    id: 'signal-scramble-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden bg-black w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoContainer,
      incomingVideoContainer,
      ...encryptionOverlay,
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
  id: 'signal-scramble-transition',
  title: 'Signal Scramble Transition',
  description:
    'Simulates encrypted video decryption between clips with sliding puzzle-piece segments, cascading animation delays, digital noise, and encryption artifacts',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'scramble',
    'encryption',
    'grid',
    'puzzle',
    'tech',
    'cyberpunk',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 1.4,
    gridRows: 4,
    gridCols: 5,
    scrambleIntensity: 1,
    showEncryptionOverlay: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const signalScrambleTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};