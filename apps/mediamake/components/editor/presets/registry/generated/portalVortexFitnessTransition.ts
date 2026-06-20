/**
 * Portal Vortex Fitness Transition Preset
 *
 * This preset creates a high-intensity portal vortex transition that pulls content into a swirling
 * dimensional gateway. The effect simulates being sucked into a centrifuge with spiraling motion,
 * rotation layers, and particle effects.
 *
 * Features:
 * - **Vortex Tunnel Effect**: 5 concentric rotating layers creating a 3D tunnel illusion
 * - **Two-Phase Animation**: Suction phase (outgoing scene) and emergence phase (incoming scene)
 * - **Particle System**: 6 swirling particles simulating sweat droplets in a centrifuge
 * - **Motion Blur**: Progressive blur increasing toward the vortex center
 * - **3D Transforms**: Perspective and rotate3d for dimensional depth
 * - **Performance Optimized**: Transform-only animations with will-change hints for 60fps
 *
 * Use cases:
 * - Transitioning between workout segments or intensity zones
 * - Creating dimensional portal effects for fitness content
 * - Scene transitions with high-energy visual impact
 * - Thematic transitions for training zone changes
 */

import { Easing } from 'remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameters Schema ---

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video being sucked into the vortex'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video emerging from the vortex'),
  transitionStart: z
    .number()
    .default(0)
    .describe('Start time of the transition in seconds'),
  suctionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the suction phase in seconds'),
  emergenceDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the emergence phase in seconds'),
  vortexColor: z
    .string()
    .default('#ff6432')
    .describe('Primary color for the vortex rings (hex format)'),
  particleCount: z
    .number()
    .default(18)
    .describe('Number of particles spiraling along the vortex (6-20 recommended)'),
  maxBlur: z
    .number()
    .default(15)
    .describe('Maximum blur amount in pixels at the vortex center'),
  audioSync: z
    .boolean()
    .default(false)
    .describe('Whether to sync vortex rotation speed to audio waveform (future feature)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionStart,
    suctionDuration,
    emergenceDuration,
    vortexColor,
    particleCount,
    maxBlur,
  } = params;

  const totalDuration = suctionDuration + emergenceDuration;

  // Helper function to generate vortex ring styles
  const generateVortexRing = (
    index: number,
    totalRings: number,
  ): React.CSSProperties => {
    const scale = 1 - index * 0.2; // Decreasing scale for inner rings
    const opacity = 0.8 - index * 0.1;
    const borderWidth = 2 + index;

    return {
      position: 'absolute' as const,
      inset: '0',
      borderWidth: `${borderWidth}px`,
      borderStyle: 'solid',
      borderColor: `rgba(${hexToRgb(vortexColor)}, ${opacity})`,
      borderRadius: '50%',
      transform: `scale(${scale})`,
      transformOrigin: 'center center',
      willChange: 'transform',
      pointerEvents: 'none' as const,
    };
  };

  // Helper function to convert hex to rgb
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '255, 100, 50';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  };

  // Helper function to generate particle positions
  const generateParticlePosition = (index: number, total: number) => {
    const angle = (index / total) * 360;
    const radius = 20 + (index % 3) * 15; // Varying radii
    const top = 50 + radius * Math.sin((angle * Math.PI) / 180);
    const left = 50 + radius * Math.cos((angle * Math.PI) / 180);

    return {
      top: `${top}%`,
      left: `${left}%`,
    };
  };

  // Generate vortex layers
  const vortexLayers: RenderableComponentData[] = Array.from(
    { length: 5 },
    (_, index) => ({
      id: `vortex-layer-${index + 1}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        className: 'absolute inset-0',
        style: generateVortexRing(index, 5),
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `vortex-layer-${index + 1}-rotation-effect`,
          componentId: `vortex-layer-${index + 1}`,
          data: {
            type: 'linear',
            start: 0,
            duration: totalDuration,
            mode: 'provider',
            targetIds: [`vortex-layer-${index + 1}`],
            ranges: [
              {
                key: 'rotateZ',
                val: 0,
                prog: 0,
              },
              {
                key: 'rotateZ',
                val: 180 + index * 108, // Increasing rotation speed: 180, 288, 396, 504, 612 degrees
                prog: 1,
              },
            ],
          },
        },
      ],
    }),
  );

  // Generate particles
  const actualParticleCount = Math.min(Math.max(particleCount, 6), 20);
  const particles: RenderableComponentData[] = Array.from(
    { length: actualParticleCount },
    (_, index) => {
      const position = generateParticlePosition(index, actualParticleCount);
      const size = 5 + (index % 5); // Varying sizes 5-9px

      return {
        id: `particle-${index + 1}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          className: 'absolute',
          style: {
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: `rgba(150, 200, 255, ${0.7 + (index % 3) * 0.1})`,
            borderRadius: '50%',
            top: position.top,
            left: position.left,
            willChange: 'transform, opacity',
            pointerEvents: 'none' as const,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          // Spiral inward during suction phase
          {
            id: `particle-${index + 1}-suction-effect`,
            componentId: `particle-${index + 1}`,
            data: {
              type: 'ease-in',
              start: 0,
              duration: suctionDuration,
              mode: 'provider',
              targetIds: [`particle-${index + 1}`],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: -position.left.replace('%', ''), prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -position.top.replace('%', ''), prog: 1 },
                { key: 'rotateZ', val: 0, prog: 0 },
                { key: 'rotateZ', val: 360 + index * 30, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          // Spiral outward during emergence phase
          {
            id: `particle-${index + 1}-emergence-effect`,
            componentId: `particle-${index + 1}`,
            data: {
              type: 'ease-out',
              start: suctionDuration,
              duration: emergenceDuration,
              mode: 'provider',
              targetIds: [`particle-${index + 1}`],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'translateX', val: -position.left.replace('%', ''), prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: -position.top.replace('%', ''), prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'rotateZ', val: 360 + index * 30, prog: 0 },
                { key: 'rotateZ', val: 720 + index * 60, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      };
    },
  );

  // Outgoing video container with suction effect
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-scene-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
          willChange: 'transform, filter',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: suctionDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: suctionDuration,
          },
        },
      },
    ],
    effects: [
      {
        id: 'outgoing-suction-effect',
        componentId: 'outgoing-scene-container',
        data: {
          type: 'ease-in',
          start: 0,
          duration: suctionDuration,
          mode: 'provider',
          targetIds: ['outgoing-scene-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0, prog: 1 },
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 360, prog: 1 },
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: maxBlur, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video container with emergence effect
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-scene-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
          willChange: 'transform, filter',
        },
      },
    },
    context: {
      timing: {
        start: suctionDuration,
        duration: emergenceDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: emergenceDuration,
          },
        },
      },
    ],
    effects: [
      {
        id: 'incoming-emergence-effect',
        componentId: 'incoming-scene-container',
        data: {
          type: 'ease-out',
          start: 0,
          duration: emergenceDuration,
          mode: 'provider',
          targetIds: ['incoming-scene-container'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotateZ', val: -360, prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
            { key: 'blur', val: maxBlur, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Vortex layer system container
  const vortexLayerSystem: RenderableComponentData = {
    id: 'vortex-layer-system',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: vortexLayers as RenderableComponentData[],
    effects: [
      {
        id: 'vortex-fade-out-effect',
        componentId: 'vortex-layer-system',
        data: {
          type: 'ease-out',
          start: suctionDuration,
          duration: emergenceDuration,
          mode: 'provider',
          targetIds: ['vortex-layer-system'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Particle system container
  const particleSystem: RenderableComponentData = {
    id: 'particle-system',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 15,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: particles as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'portal-vortex-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '800px',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingContainer,
      vortexLayerSystem,
      particleSystem,
      incomingContainer,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'portalVortexFitnessTransition',
  title: 'Portal Vortex Fitness Transition',
  description:
    'High-intensity portal vortex transition that pulls content into a swirling dimensional gateway. Features 5 concentric rotating layers creating a tunnel effect, up to 20 particle elements simulating sweat droplets spiraling along the vortex path, and motion blur that intensifies toward the center. The outgoing scene gets twisted and stretched into the vortex center while the new scene emerges spinning outward, creating the sensation of entering another dimension of fitness intensity. Optimized for 60fps with transform-only animations and will-change properties.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vortex',
    'portal',
    'fitness',
    'rotation',
    '3d',
    'particles',
    'motion-blur',
    'high-intensity',
    'dimensional',
    'centrifuge',
    'spiral',
    'tunnel',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/workout1.mp4',
    incomingVideoSrc: 'https://example.com/workout2.mp4',
    transitionStart: 0,
    suctionDuration: 0.6,
    emergenceDuration: 0.6,
    vortexColor: '#ff6432',
    particleCount: 18,
    maxBlur: 15,
    audioSync: false,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const portalVortexFitnessTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
