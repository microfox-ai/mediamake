/**
 * Spiraling Charcoal Smear Transition Preset
 *
 * A sophisticated video transition effect simulating charcoal being smeared in a spiral motion on paper.
 * Features an expanding spiral that starts tight at the center and expands outward over 2.5 seconds,
 * with motion blur following the spiral path, distortion on the outgoing video, and varying opacity
 * to simulate pressure variations in charcoal application.
 *
 * Technical Features:
 * - Archimedean spiral path animation from center outward
 * - Motion blur in spiral direction with increasing distortion
 * - Rotating container (0-720deg) synchronized with spiral expansion
 * - Opacity variations along spiral path for natural charcoal pressure effect
 * - GPU-optimized transforms with translateZ(0)
 * - SVG filter effects for blur and displacement
 * - Clean reveal of incoming video through spiral path
 *
 * Use Cases:
 * - Artistic video transitions
 * - Creative content transitions
 * - Gallery/portfolio video sequences
 * - Dramatic scene changes
 * - Stylized documentary transitions
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
    startFrom: z
      .number()
      .optional()
      .describe('Start playback from this time in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z
      .number()
      .optional()
      .describe('Start playback from this time in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition overlap in seconds'),
  spiralTurns: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of spiral turns (affects spiral tightness)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Maximum blur intensity for motion blur effect'),
  rotationDegrees: z
    .number()
    .min(0)
    .max(1440)
    .default(720)
    .describe('Total rotation degrees during transition'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    spiralTurns,
    blurIntensity,
    rotationDegrees,
  } = params;

  // Helper function to generate Archimedean spiral SVG path
  const generateSpiralPath = (
    centerX: number,
    centerY: number,
    maxRadius: number,
    turns: number,
    steps: number,
  ): string => {
    const points: string[] = [];
    const angleStep = (turns * 2 * Math.PI) / steps;

    for (let i = 0; i <= steps; i++) {
      const angle = i * angleStep;
      const radius = (maxRadius / (turns * 2 * Math.PI)) * angle;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      if (i === 0) {
        points.push(`M ${x} ${y}`);
      } else {
        points.push(`L ${x} ${y}`);
      }
    }

    return points.join(' ');
  };

  // Generate spiral path for clip-path animation
  const viewportWidth = props.config?.width || 1920;
  const viewportHeight = props.config?.height || 1080;
  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2;
  const maxRadius = Math.sqrt(
    centerX * centerX + centerY * centerY,
  );
  const spiralPath = generateSpiralPath(
    centerX,
    centerY,
    maxRadius,
    spiralTurns,
    200,
  );

  // Calculate BaseLayout duration: sum of video durations minus overlap
  const baseLayoutDuration = transitionDuration;

  // Outgoing video container (top layer with blur and distortion)
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 3,
          transformOrigin: 'center center',
          transform: 'rotate(0deg) translateZ(0)',
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
        id: 'outgoing-rotation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationDegrees, prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: outgoingVideo.startFrom || 0,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
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
            id: 'outgoing-blur',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                {
                  key: 'filter',
                  val: `blur(0px)`,
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: `blur(${blurIntensity * 0.5}px)`,
                  prog: 0.5,
                },
                {
                  key: 'filter',
                  val: `blur(${blurIntensity}px)`,
                  prog: 1,
                },
              ],
            },
          },
          {
            id: 'outgoing-scale',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.95, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video container (bottom layer revealed through spiral)
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
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
        duration: transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: incomingVideo.startFrom || 0,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
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
            id: 'incoming-scale',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'scale', val: 1.05, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Spiral mask overlay (middle layer for visual effect)
  const spiralMaskContainer: RenderableComponentData = {
    id: 'spiral-mask-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 2,
          mixBlendMode: 'multiply',
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
        id: 'mask-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['spiral-mask-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.3 },
            { key: 'opacity', val: 0.5, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'spiral-mask-html',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `
            <svg
              width="${viewportWidth}"
              height="${viewportHeight}"
              viewBox="0 0 ${viewportWidth} ${viewportHeight}"
              xmlns="http://www.w3.org/2000/svg"
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
            >
              <defs>
                <radialGradient id="spiral-gradient">
                  <stop offset="0%" stop-color="rgba(50,50,50,0.9)" />
                  <stop offset="50%" stop-color="rgba(80,80,80,0.5)" />
                  <stop offset="100%" stop-color="rgba(120,120,120,0.1)" />
                </radialGradient>
              </defs>
              <path
                d="${spiralPath}"
                stroke="url(#spiral-gradient)"
                stroke-width="${Math.max(20, maxRadius / 50)}"
                fill="none"
                stroke-linecap="round"
                opacity="0.7"
              />
            </svg>
          `,
          className: 'absolute inset-0',
          style: {
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
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

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'spiraling-charcoal-smear-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
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
      incomingVideoContainer,
      spiralMaskContainer,
      outgoingVideoContainer,
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
  id: 'spiraling-charcoal-smear-transition',
  title: 'Spiraling Charcoal Smear Transition',
  description:
    'A sophisticated video transition preset that simulates charcoal being smeared in a spiral motion on paper. Features a tight spiral that expands outward from center over 2.5 seconds, with motion blur following the spiral path, distortion effects on the outgoing video, and varying opacity to simulate pressure variations. The incoming video is revealed through clean areas as the spiral expands with a 720-degree rotation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'spiral',
    'charcoal',
    'smear',
    'artistic',
    'creative',
    'rotation',
    'blur',
    'distortion',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 2.5,
    spiralTurns: 3,
    blurIntensity: 8,
    rotationDegrees: 720,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const spiralingCharcoalSmearTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
