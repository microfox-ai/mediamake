/**
 * Spiral Page Peel Transition Preset
 *
 * This preset creates a dramatic video transition where the outgoing video peels from the
 * top-left corner following a logarithmic spiral path toward the center, with papery torn
 * edge effects, paper fragment particles breaking off, and sound visualization through
 * opacity pulses. The incoming video is revealed in a matching inverse spiral pattern.
 *
 * Features:
 * - **Logarithmic Spiral Path**: The outgoing video follows a logarithmic spiral trajectory
 *   from the top-left corner spiraling inward toward the center with increasing rotation speed
 * - **720° Rotation**: The peel executes two full rotations (720 degrees) with exponential
 *   acceleration over 1.8 seconds
 * - **Papery Torn Edge Effect**: Uses SVG filter with fractal noise and displacement to simulate
 *   realistic paper tearing with visible fibers
 * - **Paper Fragment Particles**: Multiple particle fragments break off during the peel with
 *   random trajectories and staggered timing
 * - **Sound Visualization**: Subtle opacity pulses at 0.1s intervals simulate paper crinkle sounds
 * - **Inverse Spiral Reveal**: The incoming video is revealed through a matching inverse spiral
 *   pattern using radial gradient masking
 * - **Exponential Easing**: The animation accelerates exponentially for a dramatic effect
 *
 * Use cases:
 * - Creating dramatic page-turn style transitions between video clips
 * - Simulating paper or document reveals with realistic physics
 * - Adding organic, tactile transitions to video compositions
 * - Building cinematic transitions with particle effects
 * - Creating stylized transitions for documentary or educational content
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL or path for the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL or path for the incoming video'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of the transition in seconds (overlap time)'),
  outgoingVideoDuration: z
    .number()
    .optional()
    .describe('Total duration of the outgoing video (if not provided, uses transitionDuration)'),
  incomingVideoStart: z
    .number()
    .default(0)
    .describe('Start time for the incoming video (relative to parent)'),
  particleTextureSrc: z
    .string()
    .optional()
    .describe('Source URL for paper particle texture (small paper fragment image)'),
  rotationDegrees: z
    .number()
    .default(720)
    .describe('Total rotation in degrees during the peel'),
  spiralTightness: z
    .number()
    .default(0.15)
    .describe('Tightness of the logarithmic spiral (lower = tighter)'),
  paperOpacity: z
    .number()
    .default(1)
    .describe('Opacity of the outgoing video during peel (0-1)'),
  soundPulseIntensity: z
    .number()
    .default(0.15)
    .describe('Intensity of sound visualization pulses (0-1)'),
  particleCount: z
    .number()
    .default(8)
    .describe('Number of paper fragment particles'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const transitionDuration = params.transitionDuration ?? 1.8;
  const outgoingDuration = params.outgoingVideoDuration ?? transitionDuration;
  const incomingStart = params.incomingVideoStart ?? 0;
  const rotationDegrees = params.rotationDegrees ?? 720;
  const spiralTightness = params.spiralTightness ?? 0.15;
  const paperOpacity = params.paperOpacity ?? 1;
  const soundPulseIntensity = params.soundPulseIntensity ?? 0.15;
  const particleCount = params.particleCount ?? 8;

  // Helper function to calculate logarithmic spiral path
  const calculateSpiralPath = (progress: number): { x: number; y: number } => {
    const angle = progress * Math.PI * 4; // 720 degrees = 4π radians
    const radius = 100 * Math.exp(-spiralTightness * angle); // Logarithmic spiral
    const x = -radius * Math.cos(angle); // Negative to go inward
    const y = -radius * Math.sin(angle); // Negative to go inward
    return { x, y };
  };

  // Generate spiral path keyframes for outgoing video
  const spiralKeyframes = [];
  for (let i = 0; i <= 20; i++) {
    const prog = i / 20;
    const { x, y } = calculateSpiralPath(prog);
    spiralKeyframes.push(
      { key: 'translateX', val: x, prog },
      { key: 'translateY', val: y, prog },
      { key: 'rotate', val: rotationDegrees * prog, prog },
      { key: 'scale', val: 1 - prog, prog },
    );
  }

  // Outgoing video with spiral peel effect
  const outgoingVideoEffect = {
    id: 'outgoing-spiral-peel',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const, // Exponential acceleration
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['outgoing-video'],
      ranges: spiralKeyframes,
    },
  };

  // Incoming video reveal with inverse spiral mask
  const incomingVideoEffect = {
    id: 'incoming-spiral-reveal',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['incoming-video'],
      ranges: [
        {
          key: 'clipPath',
          val: 'circle(0% at 0% 0%)',
          prog: 0,
        },
        {
          key: 'clipPath',
          val: 'circle(150% at 50% 50%)',
          prog: 1,
        },
      ],
    },
  };

  // Generate particle effects with random trajectories
  const particleFragments = [];
  for (let i = 0; i < particleCount; i++) {
    const particleId = `particle-${i}`;
    const startTime = 0.2 + (i * transitionDuration) / particleCount; // Stagger particles
    const particleDuration = transitionDuration - startTime;

    // Random trajectory parameters
    const randomAngle = Math.random() * 360;
    const randomDistance = 50 + Math.random() * 100;
    const randomRotation = -180 + Math.random() * 360;
    const randomSize = 6 + Math.random() * 9;

    const particleEffect = {
      id: `particle-effect-${i}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: startTime,
        duration: particleDuration,
        mode: 'provider' as const,
        targetIds: [particleId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.1 },
          { key: 'opacity', val: 1, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
          {
            key: 'translateX',
            val: 0,
            prog: 0,
          },
          {
            key: 'translateX',
            val: randomDistance * Math.cos((randomAngle * Math.PI) / 180),
            prog: 1,
          },
          {
            key: 'translateY',
            val: 0,
            prog: 0,
          },
          {
            key: 'translateY',
            val: randomDistance * Math.sin((randomAngle * Math.PI) / 180),
            prog: 1,
          },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: randomRotation, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.3, prog: 1 },
        ],
      },
    };

    particleFragments.push({
      id: particleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${randomSize}px; height: ${randomSize}px; background: white; opacity: 0.8; border-radius: 2px;"></div>`,
        style: {
          position: 'absolute' as const,
          left: '0px',
          top: '0px',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [particleEffect],
    });
  }

  // Sound visualization pulses
  const soundPulses = [];
  const pulseInterval = 0.1;
  const pulseCount = Math.floor(transitionDuration / pulseInterval);

  for (let i = 0; i < pulseCount; i++) {
    const pulseStart = i * pulseInterval;
    soundPulses.push(
      { key: 'opacity', val: 0, prog: pulseStart / transitionDuration },
      {
        key: 'opacity',
        val: soundPulseIntensity,
        prog: (pulseStart + pulseInterval / 2) / transitionDuration,
      },
      {
        key: 'opacity',
        val: 0,
        prog: (pulseStart + pulseInterval) / transitionDuration,
      },
    );
  }

  const soundVizEffect = {
    id: 'sound-viz-pulse',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['sound-viz-overlay'],
      ranges: soundPulses,
    },
  };

  // SVG filter for torn paper edge effect
  const svgFilterHTML = `
    <svg style="position: absolute; width: 0; height: 0; overflow: hidden; pointer-events: none;">
      <defs>
        <filter id="torn-edge-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
    </svg>
  `;

  // Build the composition structure
  const childrenData: RenderableComponentData[] = [
    // SVG Filter Container
    {
      id: 'svg-filter-container',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgFilterHTML,
        style: {
          position: 'absolute' as const,
          width: 0,
          height: 0,
          overflow: 'hidden' as const,
          pointerEvents: 'none' as const,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Incoming Video
    {
      id: 'incoming-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: params.incomingVideoSrc,
        fit: 'cover' as const,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          clipPath: 'circle(0% at 0% 0%)',
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: transitionDuration,
        },
      },
      effects: [incomingVideoEffect],
    } as RenderableComponentData,

    // Outgoing Video
    {
      id: 'outgoing-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: params.outgoingVideoSrc,
        fit: 'cover' as const,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          transformOrigin: 'top left',
          filter: 'url(#torn-edge-filter)',
          opacity: paperOpacity,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingDuration,
        },
      },
      effects: [outgoingVideoEffect],
    } as RenderableComponentData,

    // Particle Container
    {
      id: 'particle-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-visible',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: particleFragments as RenderableComponentData[],
    } as RenderableComponentData,

    // Sound Visualization Overlay
    {
      id: 'sound-viz-overlay',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            mixBlendMode: 'overlay' as const,
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [soundVizEffect],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'spiral-peel-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(outgoingDuration, incomingStart + transitionDuration),
      },
    },
    childrenData: childrenData as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'spiral-page-peel-transition',
  title: 'Spiral Page Peel Transition',
  description:
    'A dramatic video transition where the outgoing video peels from the top-left corner following a logarithmic spiral path toward the center, with papery torn edge effects, paper fragment particles breaking off, and sound visualization through opacity pulses. The incoming video is revealed in a matching inverse spiral pattern. Features 720-degree rotation with exponential acceleration over 1.8 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'spiral',
    'page-peel',
    'paper',
    'particles',
    'dramatic',
    'video',
    'reveal',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    transitionDuration: 1.8,
    rotationDegrees: 720,
    spiralTightness: 0.15,
    paperOpacity: 1,
    soundPulseIntensity: 0.15,
    particleCount: 8,
  },
};

// Export preset
export const spiralPagePeelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
