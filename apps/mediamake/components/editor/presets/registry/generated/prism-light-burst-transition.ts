/**
 * Prism Light Burst Transition
 *
 * This preset creates a dramatic video transition effect where the outgoing video
 * explodes into prismatic light rays that scatter outward from the center, then
 * converge to form the incoming video. The effect simulates light spectrum dispersion
 * with radial video strips, each with unique hue rotations creating a rainbow prism effect.
 *
 * Features:
 * - **Radial Explosion**: Video splits into 12 pie-slice shapes that burst from center
 * - **Spectrum Dispersion**: Each slice has unique hue-rotation (0-360deg) for prismatic effect
 * - **Spiral Animation**: Slices rotate and scale during burst/convergence with staggered timing
 * - **Lens Flare Glow**: Blurred duplicate layers with screen blend mode create glow effects
 * - **Gradient Sweep**: Animated gradient overlay simulates light streak across the burst
 * - **Dual Phase**: Burst phase (outgoing) and convergence phase (incoming) with smooth easing
 *
 * Technical Implementation:
 * - 12 VideoAtom instances per video with clip-path creating pie-slice shapes
 * - Transform animations: scale 0→1.5→1 and rotate for spiral effect
 * - Each slice has filter: hue-rotate() distributed evenly (0deg to 330deg in 30deg increments)
 * - 2 duplicate atoms with blur(10-20px) and reduced opacity for glow
 * - Radial-gradient background for light burst ambiance
 * - Provider mode effects targeting specific slice IDs
 *
 * Use Cases:
 * - Cinematic video transitions between clips
 * - Music video effects with psychedelic color dispersion
 * - Abstract transitions for creative content
 * - Light-themed transitions for high-energy content
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
    type: z.enum(['video', 'image']).default('video').describe('Media type of outgoing video'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type of incoming video'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z.number().min(0.3).max(2).default(0.9).describe('Total duration of the transition in seconds'),
  
  numSlices: z.number().min(8).max(20).default(12).describe('Number of radial slices (pie segments)'),
  
  peakBurstScale: z.number().min(1.2).max(2).default(1.5).describe('Maximum scale at burst peak (1 = normal, 1.5 = 150%)'),
  
  spiralRotation: z.number().min(0).max(720).default(180).describe('Rotation amount in degrees for spiral effect'),
  
  staggerDelay: z.number().min(0).max(0.05).default(0.02).describe('Stagger delay between slices in seconds'),
  
  enableGlow: z.boolean().default(true).describe('Enable lens flare glow effects'),
  
  enableGradientSweep: z.boolean().default(true).describe('Enable animated gradient sweep overlay'),
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
    numSlices,
    peakBurstScale,
    spiralRotation,
    staggerDelay,
    enableGlow,
    enableGradientSweep,
  } = params;

  // Calculate timing phases
  const burstPhaseDuration = transitionDuration * 0.5; // 0 to 50%
  const convergencePhaseDuration = transitionDuration * 0.5; // 50% to 100%

  // Helper: Generate pie-slice clip-path for radial segments
  const generateClipPath = (index: number, total: number): string => {
    const angleStep = 360 / total;
    const startAngle = index * angleStep;
    const endAngle = (index + 1) * angleStep;
    
    // Convert angles to radians
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    
    // Calculate edge points on circle (center at 50%, 50%)
    const x1 = 50 + 50 * Math.cos(startRad);
    const y1 = 50 + 50 * Math.sin(startRad);
    const x2 = 50 + 50 * Math.cos(endRad);
    const y2 = 50 + 50 * Math.sin(endRad);
    
    return `polygon(50% 50%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
  };

  // Helper: Generate hue-rotate value for slice
  const generateHueRotate = (index: number, total: number): number => {
    return (index * 360) / total;
  };

  // Determine component IDs
  const outgoingComponentId = outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Generate outgoing video slices
  const outgoingSlices: RenderableComponentData[] = [];
  for (let i = 0; i < numSlices; i++) {
    const sliceId = `outgoing-slice-${i}`;
    const clipPath = generateClipPath(i, numSlices);
    const hueRotate = generateHueRotate(i, numSlices);
    const stagger = i * staggerDelay;

    outgoingSlices.push({
      id: sliceId,
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingVideo.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          clipPath: clipPath,
          filter: `hue-rotate(${hueRotate}deg)`,
          transformOrigin: 'center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Burst: scale 1 → peakBurstScale, rotate, fade out
        {
          id: `burst-${sliceId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: stagger,
            duration: burstPhaseDuration - stagger,
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: peakBurstScale, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: spiralRotation * (i % 2 === 0 ? 1 : -1), prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Generate incoming video slices
  const incomingSlices: RenderableComponentData[] = [];
  for (let i = 0; i < numSlices; i++) {
    const sliceId = `incoming-slice-${i}`;
    const clipPath = generateClipPath(i, numSlices);
    const hueRotate = generateHueRotate(i, numSlices);
    const stagger = i * staggerDelay;

    incomingSlices.push({
      id: sliceId,
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingVideo.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          clipPath: clipPath,
          filter: `hue-rotate(${hueRotate}deg)`,
          transformOrigin: 'center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Convergence: scale peakBurstScale → 1, rotate, fade in
        {
          id: `converge-${sliceId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: burstPhaseDuration + stagger,
            duration: convergencePhaseDuration - stagger,
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              { key: 'scale', val: peakBurstScale, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'rotate', val: spiralRotation * (i % 2 === 0 ? -1 : 1), prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Glow effect layers
  const glowLayers: RenderableComponentData[] = [];
  if (enableGlow) {
    // Glow layer 1 (outgoing)
    glowLayers.push({
      id: 'glow-layer-1',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingVideo.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          filter: 'blur(15px)',
          opacity: 0.4,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
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
          id: 'glow-1-peak',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glow-layer-1'],
            ranges: [
              { key: 'opacity', val: 0.4, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);

    // Glow layer 2 (incoming)
    glowLayers.push({
      id: 'glow-layer-2',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingVideo.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          filter: 'blur(20px)',
          opacity: 0.3,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
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
          id: 'glow-2-peak',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glow-layer-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Gradient sweep overlay
  const gradientSweep: RenderableComponentData[] = [];
  if (enableGradientSweep) {
    gradientSweep.push({
      id: 'gradient-sweep-element',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '200%',
            height: '100%',
            left: '-100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 55%, transparent 100%)',
            mixBlendMode: 'overlay',
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
      effects: [
        {
          id: 'sweep-translate',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['gradient-sweep-element'],
            ranges: [
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '100%', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  }

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'prism-light-burst-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, rgba(0,0,0,0.9) 100%)',
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
      // Outgoing slices
      {
        id: 'outgoing-container',
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
            duration: transitionDuration,
          },
        },
        childrenData: outgoingSlices,
      } as RenderableComponentData,
      // Incoming slices
      {
        id: 'incoming-container',
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
            duration: transitionDuration,
          },
        },
        childrenData: incomingSlices,
      } as RenderableComponentData,
      // Glow effects
      ...(enableGlow
        ? [
            {
              id: 'glow-container',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0 pointer-events-none',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
              childrenData: glowLayers,
            } as RenderableComponentData,
          ]
        : []),
      // Gradient sweep
      ...(enableGradientSweep
        ? [
            {
              id: 'gradient-sweep-container',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0 pointer-events-none overflow-hidden',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
              childrenData: gradientSweep,
            } as RenderableComponentData,
          ]
        : []),
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
  id: 'prism-light-burst-transition',
  title: 'Prism Light Burst Transition',
  description:
    'A dramatic video transition where the outgoing video explodes into 12 prismatic light ray slices that scatter outward from center, each with unique hue-rotation simulating light spectrum dispersion. Slices converge to form the incoming video with lens flare glow effects created by blurred duplicate layers and animated gradient sweeps.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'prism',
    'light',
    'burst',
    'spectrum',
    'radial',
    'explosion',
    'cinematic',
    'colorful',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    transitionDuration: 0.9,
    numSlices: 12,
    peakBurstScale: 1.5,
    spiralRotation: 180,
    staggerDelay: 0.02,
    enableGlow: true,
    enableGradientSweep: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const prismLightBurstTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
