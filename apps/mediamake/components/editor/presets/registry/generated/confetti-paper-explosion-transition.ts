/**
 * Confetti Paper Explosion Transition Preset
 *
 * A celebratory transition effect where the outgoing video shatters into hundreds of small
 * paper-like confetti pieces that scatter in all directions with physics-based animation.
 *
 * Features:
 * - 20x20 grid fragmentation (400 pieces)
 * - Two-sided rendering: video content on front, paper texture on back
 * - Randomized size (scale 0.5-1.2), rotation speeds, and trajectories
 * - Radial explosion timing from center outward
 * - Gravity acceleration and wind drift (sine wave)
 * - Depth sorting via z-index based on size
 * - Spring physics for initial explosion, ease-out for settling
 * - 2.3 second total duration with particle physics
 *
 * Use cases:
 * - Celebratory transitions between video clips
 * - Party/event video transitions
 * - Achievement reveal animations
 * - Festive content transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video that will shatter into confetti pieces'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video that will be revealed as pieces clear'),
  paperTextureSrc: z.string().optional().describe('Optional paper texture image URL for the back side of confetti pieces (defaults to white)'),
  transitionDuration: z.number().default(2.3).describe('Total duration of the confetti transition in seconds'),
  gridSize: z.number().default(20).describe('Grid size for fragmentation (NxN grid, default 20x20 = 400 pieces)'),
  explosionIntensity: z.number().min(0.5).max(2).default(1).describe('Multiplier for explosion velocities and effects'),
  windStrength: z.number().min(0).max(2).default(0.5).describe('Strength of horizontal wind drift effect'),
  gravityStrength: z.number().min(0.5).max(2).default(1).describe('Strength of gravity acceleration'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    paperTextureSrc,
    transitionDuration,
    gridSize,
    explosionIntensity,
    windStrength,
    gravityStrength,
  } = params;

  const config = props.config || { width: 1920, height: 1080 };
  const width = config.width;
  const height = config.height;

  // Helper: Generate random value in range
  const random = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper: Calculate radial distance from center
  const getRadialDistance = (x: number, y: number, centerX: number, centerY: number): number => {
    const dx = x - centerX;
    const dy = y - centerY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate fragment dimensions
  const fragmentWidth = width / gridSize;
  const fragmentHeight = height / gridSize;
  const centerX = width / 2;
  const centerY = height / 2;

  // Calculate maximum radial distance for normalization
  const maxRadialDistance = Math.sqrt(centerX * centerX + centerY * centerY);

  // Generate fragments
  const fragments: RenderableComponentData[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const fragmentIndex = row * gridSize + col;
      const fragmentId = `confetti-fragment-${fragmentIndex}`;

      // Position
      const x = col * fragmentWidth;
      const y = row * fragmentHeight;
      const fragmentCenterX = x + fragmentWidth / 2;
      const fragmentCenterY = y + fragmentHeight / 2;

      // Calculate radial distance from center
      const radialDistance = getRadialDistance(fragmentCenterX, fragmentCenterY, centerX, centerY);
      const normalizedDistance = radialDistance / maxRadialDistance;

      // Radial delay: pieces near center explode first
      const radialDelay = normalizedDistance * 0.3; // 0-0.3s delay

      // Random properties
      const scale = random(0.5, 1.2);
      const rotateXSpeed = random(-720, 720); // degrees
      const rotateYSpeed = random(-720, 720);
      const rotateZSpeed = random(-360, 360);

      // Explosion velocity (direction from center)
      const dx = fragmentCenterX - centerX;
      const dy = fragmentCenterY - centerY;
      const angle = Math.atan2(dy, dx);
      const velocity = random(100, 300) * explosionIntensity;
      const translateXEnd = dx + Math.cos(angle) * velocity;
      const translateYEnd = dy + Math.sin(angle) * velocity;

      // Gravity effect (additional translateY)
      const gravityDistance = random(300, 600) * gravityStrength;

      // Wind drift (sine wave for organic movement)
      const windFrequency = random(0.5, 1.5);
      const windAmplitude = random(20, 60) * windStrength;

      // Z-index based on size (larger pieces appear closer)
      const zIndex = Math.round(scale * 100);

      // Create fragment container with two-sided rendering
      const fragment: RenderableComponentData = {
        id: fragmentId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            style: {
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: `${fragmentWidth}px`,
              height: `${fragmentHeight}px`,
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'visible',
              zIndex: zIndex + 10, // Base z-index above incoming video
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
            id: `${fragmentId}-explosion`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: radialDelay,
              duration: 0.5, // Spring explosion phase
              mode: 'provider',
              targetIds: [fragmentId],
              ranges: [
                // Initial burst outward
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: translateXEnd, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: translateYEnd, prog: 1 },
                // Start rotation
                { key: 'rotateX', val: 0, prog: 0 },
                { key: 'rotateX', val: rotateXSpeed * 0.3, prog: 1 },
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: rotateYSpeed * 0.3, prog: 1 },
                { key: 'rotateZ', val: 0, prog: 0 },
                { key: 'rotateZ', val: rotateZSpeed * 0.3, prog: 1 },
                // Scale variation
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: scale, prog: 1 },
              ],
            },
          },
          {
            id: `${fragmentId}-float`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: radialDelay + 0.5,
              duration: transitionDuration - radialDelay - 0.5, // Remaining time for floating
              mode: 'provider',
              targetIds: [fragmentId],
              ranges: [
                // Continue movement with gravity
                { key: 'translateX', val: translateXEnd, prog: 0 },
                { key: 'translateX', val: translateXEnd + windAmplitude * Math.sin(windFrequency * Math.PI), prog: 0.5 },
                { key: 'translateX', val: translateXEnd + windAmplitude * Math.sin(windFrequency * Math.PI * 2), prog: 1 },
                { key: 'translateY', val: translateYEnd, prog: 0 },
                { key: 'translateY', val: translateYEnd + gravityDistance, prog: 1 },
                // Continue rotation (accumulate)
                { key: 'rotateX', val: rotateXSpeed * 0.3, prog: 0 },
                { key: 'rotateX', val: rotateXSpeed, prog: 1 },
                { key: 'rotateY', val: rotateYSpeed * 0.3, prog: 0 },
                { key: 'rotateY', val: rotateYSpeed, prog: 1 },
                { key: 'rotateZ', val: rotateZSpeed * 0.3, prog: 0 },
                { key: 'rotateZ', val: rotateZSpeed, prog: 1 },
                // Maintain scale
                { key: 'scale', val: scale, prog: 0 },
                { key: 'scale', val: scale, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          // Front face: video content
          {
            id: `${fragmentId}-front`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: outgoingVideoSrc,
              fit: 'cover',
              muted: true,
              className: 'w-full h-full object-cover',
              style: {
                position: 'absolute',
                clipPath: `inset(${y}px ${width - x - fragmentWidth}px ${height - y - fragmentHeight}px ${x}px)`,
                backfaceVisibility: 'hidden',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          } as RenderableComponentData,
          // Back face: paper texture
          {
            id: `${fragmentId}-back`,
            type: 'atom',
            componentId: paperTextureSrc ? 'ImageAtom' : 'HTMLBlockAtom',
            data: paperTextureSrc
              ? {
                  src: paperTextureSrc,
                  className: 'w-full h-full object-cover',
                  style: {
                    position: 'absolute',
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                  },
                }
              : {
                  html: '<div style="width: 100%; height: 100%; background-color: #ffffff;"></div>',
                  style: {
                    position: 'absolute',
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
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
      };

      fragments.push(fragment);
    }
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'confetti-paper-explosion-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-visible w-full h-full',
        style: {
          position: 'relative',
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
      // Incoming video (revealed as pieces clear)
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            position: 'absolute',
            inset: '0',
            zIndex: 0,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Fragments container
      {
        id: 'fragments-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 overflow-visible',
            style: {
              zIndex: 1,
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
        childrenData: fragments,
      } as RenderableComponentData,
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
  id: 'confetti-paper-explosion-transition',
  title: 'Confetti Paper Explosion Transition',
  description:
    'A celebratory transition where the outgoing video shatters into hundreds of paper-like confetti pieces that scatter with physics-based animation. Features two-sided fragment rendering (video on front, paper texture on back), randomized trajectories with gravity and wind drift, radial explosion timing from center outward, and organic floating behavior. Incoming video is revealed as pieces clear. 2.3 second transition with spring physics for explosion and ease-out for settling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'confetti',
    'explosion',
    'particles',
    'physics',
    'celebratory',
    'paper',
    'shatter',
    'video',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    paperTextureSrc: undefined,
    transitionDuration: 2.3,
    gridSize: 20,
    explosionIntensity: 1,
    windStrength: 0.5,
    gravityStrength: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const confettiPaperExplosionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
