/**
 * Ripped Paper Strip Transition Preset
 *
 * This preset creates a horizontal paper-shredding transition where the outgoing video
 * is torn away in 8 horizontal strips with rough, fibrous edges, stop-motion jerkiness,
 * and floating paper fiber particles. The strips reveal the incoming video underneath,
 * which has a subtle paper texture overlay.
 *
 * Features:
 * - 8 horizontal strips with rough, fibrous edges
 * - Stop-motion jerkiness using steps(3) easing
 * - Random rotation on each strip as it tears away
 * - Floating paper fiber particles
 * - Incoming video with subtle paper texture overlay
 * - Alternating left/right strip movement
 *
 * Use cases:
 * - Creating dramatic paper-tearing transitions between videos
 * - Adding tactile, analog feel to digital content
 * - Building creative video montages with unique transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  paperTextureSrc: z
    .string()
    .optional()
    .describe('Source URL of paper texture overlay (optional)'),
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the overlap transition in seconds'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    paperTextureSrc,
    transitionDuration,
    outgoingVideoDuration,
    incomingVideoDuration,
  } = params;

  // Calculate total duration (with overlap)
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Number of horizontal strips
  const numStrips = 8;
  const stripHeight = 100 / numStrips; // Percentage height per strip

  // Random rotation values for each strip (in degrees, range -15 to 15)
  const stripRotations = [
    -12, 8, -15, 10, -8, 14, -11, 9,
  ];

  // Alternating translateX directions and distances (in percentage)
  const stripTranslations = [
    -120, 130, -110, 125, -115, 135, -105, 120,
  ];

  // Staggered start times for strip animations
  const stripStartTimes = [
    0, 0.1, 0.15, 0.25, 0.3, 0.4, 0.45, 0.5,
  ];

  // Create strip containers with video atoms
  const stripContainers: RenderableComponentData[] = [];

  for (let i = 0; i < numStrips; i++) {
    const stripId = `strip-container-${i}`;
    const videoId = `strip-video-${i}`;
    const topPosition = i * stripHeight;

    // Create strip container
    const stripContainer: RenderableComponentData = {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            width: '100%',
            height: `${stripHeight}%`,
            top: `${topPosition}%`,
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideoSrc,
            fit: 'cover',
            className: 'absolute inset-0',
            style: {
              marginTop: `${-topPosition}%`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideoDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: `strip-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'steps(3)',
            start: outgoingVideoDuration - transitionDuration + stripStartTimes[i],
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: stripTranslations[i], prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: stripRotations[i], prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.9 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    stripContainers.push(stripContainer);
  }

  // Create particle effects (floating paper fibers)
  const numParticles = 5;
  const particlePositions = [
    { left: '15%', top: '20%' },
    { left: '45%', top: '35%' },
    { left: '70%', top: '50%' },
    { left: '30%', top: '65%' },
    { left: '85%', top: '75%' },
  ];
  const particleStartTimes = [0.1, 0.25, 0.4, 0.55, 0.7];
  const particleDurations = [1.4, 1.25, 1.1, 0.95, 0.8];

  const particles: RenderableComponentData[] = [];

  for (let i = 0; i < numParticles; i++) {
    const particleId = `particle-${i}`;
    const pos = particlePositions[i];

    const particle: RenderableComponentData = {
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width:${3 + Math.random() * 2}px;height:${6 + Math.random() * 3}px;background:#fff;opacity:${0.5 + Math.random() * 0.2};"></div>`,
        className: 'absolute',
        style: {
          left: pos.left,
          top: pos.top,
          zIndex: 15,
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - transitionDuration + particleStartTimes[i],
          duration: particleDurations[i],
        },
      },
      effects: [
        {
          id: `particle-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: particleDurations[i],
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 70 + Math.random() * 80, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: -160 + Math.random() * 200, prog: 1 },
              { key: 'opacity', val: 0.5 + Math.random() * 0.2, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    particles.push(particle);
  }

  // Create incoming video with paper texture overlay
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
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
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: outgoingVideoDuration - transitionDuration,
            duration: incomingVideoDuration + transitionDuration,
          },
        },
      } as RenderableComponentData,
      ...(paperTextureSrc
        ? [
            {
              id: 'paper-texture-overlay',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: paperTextureSrc,
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  opacity: 0.15,
                  mixBlendMode: 'multiply',
                  zIndex: 1,
                },
              },
              context: {
                timing: {
                  start: outgoingVideoDuration - transitionDuration,
                  duration: incomingVideoDuration + transitionDuration,
                },
              },
            } as RenderableComponentData,
          ]
        : []),
    ],
  };

  // Assemble root container
  const rootContainer: RenderableComponentData = {
    id: 'ripped-paper-strip-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
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
      incomingVideoContainer,
      ...stripContainers,
      ...particles,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'ripped-paper-strip-transition',
  title: 'Ripped Paper Strip Transition',
  description:
    'A horizontal paper-shredding transition where the outgoing video is torn away in 8 strips with rough fibrous edges, stop-motion jerkiness, and floating paper fiber particles, revealing the incoming video with a subtle paper texture overlay underneath',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'paper', 'strips', 'analog', 'creative'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    paperTextureSrc: 'https://example.com/paper-texture.jpg',
    transitionDuration: 1.2,
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const rippedPaperStripTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
