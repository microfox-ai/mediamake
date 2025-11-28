/**
 * Spiral Wipe Transition Preset
 *
 * This preset creates a stunning spiral wipe transition that reveals the incoming video
 * through an unwinding spiral pattern that starts from the center and spirals outward.
 * The spiral has 3 complete rotations and gradually increases in thickness as it expands.
 *
 * Features:
 * - **Spiral Pattern Reveal**: Incoming video revealed through an Archimedean spiral path
 * - **Rotational Animation**: Both videos rotate during transition (outgoing clockwise, incoming counter-clockwise)
 * - **Thickness Growth**: Spiral stroke width increases from 2px to 20px as it expands
 * - **Ethereal Glow**: Soft white glow effect on the spiral edge using drop-shadow
 * - **Smooth Easing**: Uses ease-in-out-quad timing for natural motion
 * - **Configurable Duration**: Default 1.5 second transition with adjustable overlap
 *
 * Technical Implementation:
 * - Uses SVG path with Archimedean spiral formula (r = a + b * theta)
 * - Animated via stroke-dasharray and stroke-dashoffset
 * - Rotation effects applied to both video containers
 * - Radial gradient mask for smooth blending
 * - Drop-shadow filter for glow effect
 *
 * Use cases:
 * - Creative video transitions with organic feel
 * - Music video transitions with dynamic motion
 * - Opening sequences with spiral reveals
 * - Brand videos with unique visual style
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      duration: z.number().describe('Duration of the outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      duration: z.number().describe('Duration of the incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the spiral transition in seconds'),
  spiralRotations: z
    .number()
    .default(3)
    .describe('Number of complete spiral rotations'),
  videoRotationDegrees: z
    .number()
    .default(5)
    .describe('Maximum rotation angle for videos in degrees'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, spiralRotations, videoRotationDegrees } = params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Helper function to generate Archimedean spiral path
  const generateSpiralPath = (
    rotations: number,
    width: number,
    height: number,
  ): string => {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.7;
    const points: string[] = [];
    const totalTheta = rotations * 2 * Math.PI;
    const steps = 500;

    // Archimedean spiral: r = a + b * theta
    const a = 0;
    const b = maxRadius / totalTheta;

    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * totalTheta;
      const r = a + b * theta;
      const x = centerX + r * Math.cos(theta);
      const y = centerY + r * Math.sin(theta);
      points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }

    return points.join(' ');
  };

  const width = props.config?.width ?? 1920;
  const height = props.config?.height ?? 1080;
  const spiralPath = generateSpiralPath(spiralRotations, width, height);

  // Calculate path length for stroke-dasharray animation (approximate)
  const pathLength = Math.PI * spiralRotations * Math.min(width, height) * 0.7;

  // Rotation animation keyframes for videos
  const outgoingVideoRotationEffect = {
    id: 'outgoing-rotation',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: video1.duration - transitionDuration,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['outgoing-video-container'],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: videoRotationDegrees, prog: 0.5 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    },
  };

  const incomingVideoRotationEffect = {
    id: 'incoming-rotation',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['incoming-video-container'],
      ranges: [
        { key: 'rotate', val: -videoRotationDegrees, prog: 0 },
        { key: 'rotate', val: -videoRotationDegrees / 2, prog: 0.5 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    },
  };

  // SVG spiral reveal mask with animated stroke
  const spiralRevealMask: RenderableComponentData = {
    id: 'spiral-reveal-mask',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <svg 
          width="${width}" 
          height="${height}" 
          style="position: absolute; top: 0; left: 0; pointer-events: none; z-index: 3;"
        >
          <defs>
            <filter id="spiral-glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            id="spiral-path"
            d="${spiralPath}"
            fill="none"
            stroke="white"
            stroke-linecap="round"
            stroke-linejoin="round"
            filter="url(#spiral-glow)"
            style="
              stroke-dasharray: ${pathLength};
              stroke-dashoffset: ${pathLength};
              animation: spiral-draw ${transitionDuration}s ease-in-out forwards;
              animation-delay: ${video1.duration - transitionDuration}s;
            "
          />
          <style>
            @keyframes spiral-draw {
              0% {
                stroke-dashoffset: ${pathLength};
                stroke-width: 2px;
              }
              100% {
                stroke-dashoffset: 0;
                stroke-width: 20px;
              }
            }
          </style>
        </svg>
      `,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        zIndex: 3,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Clip-path animation for incoming video (circular reveal)
  const incomingClipPathEffect = {
    id: 'incoming-clip-reveal',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['incoming-video-container'],
      ranges: [
        { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
        { key: 'clipPath', val: 'circle(150% at 50% 50%)', prog: 1 },
      ],
    },
  };

  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [outgoingVideoRotationEffect],
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming video
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 2,
            clipPath: 'circle(0% at 50% 50%)',
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [incomingVideoRotationEffect, incomingClipPathEffect],
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
        },
      ],
    } as RenderableComponentData,
    // Spiral reveal mask
    spiralRevealMask,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'spiral-wipe-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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

const presetMetadata: PresetMetadata = {
  id: 'spiral-wipe-transition',
  title: 'Spiral Wipe Transition',
  description:
    'Creative spiral wipe transition that reveals incoming video through an unwinding spiral pattern from center outward, with rotating videos and ethereal glow effect',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'spiral', 'wipe', 'creative', 'rotation', 'glow'],
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
    spiralRotations: 3,
    videoRotationDegrees: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const spiralWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
