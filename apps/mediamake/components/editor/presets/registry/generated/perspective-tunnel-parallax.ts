/**
 * Perspective Tunnel Parallax Preset
 *
 * Creates a 3D tunnel illusion with concentric rings scaling from a central vanishing point,
 * mimicking the classic sci-fi star field effect seen in video editing.
 *
 * Features:
 * - **3D Tunnel Effect**: 6 concentric rings scale and rotate from center vanishing point
 * - **Parallax Motion**: Each layer has different scale and rotation speeds creating depth
 * - **Color Shifts**: Gradients shift from cool (distant/cyan) to warm (near/red) tones
 * - **Particle Effects**: 6 particles expand from center to edges with varying speeds
 * - **Radial Vignette**: Darkens edges to enhance depth perception
 * - **Scanlines Overlay**: Retro-futuristic aesthetic with horizontal scan lines
 * - **CSS Perspective**: Enhanced 3D effect using CSS perspective property
 * - **Mix Blend Modes**: Screen blending creates glowing, additive effects
 *
 * Use cases:
 * - Sci-fi video intros and transitions
 * - Music visualizers with pulsing effects
 * - Retro-futuristic title sequences
 * - Background effects for tech/gaming content
 * - Abstract motion graphics
 */

import { z } from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ==================== PARAMS SCHEMA ====================

const presetParams = z.object({
  duration: z
    .number()
    .default(10)
    .describe('Duration of the tunnel animation in seconds'),
  rotationSpeed: z
    .number()
    .default(1)
    .describe('Multiplier for rotation speed (0.5 = half speed, 2 = double speed)'),
  scaleSpeed: z
    .number()
    .default(1)
    .describe('Multiplier for scale animation speed'),
  pulseEffect: z
    .boolean()
    .default(true)
    .describe('Enable pulsing/breathing effect synchronized with animations'),
  particleCount: z
    .number()
    .default(6)
    .describe('Number of particle effects (1-12)'),
  scanlineOpacity: z
    .number()
    .default(0.2)
    .describe('Opacity of scanline overlay (0-1)'),
  vignetteIntensity: z
    .number()
    .default(0.7)
    .describe('Intensity of radial vignette darkening (0-1)'),
});

// ==================== EXECUTION FUNCTION ====================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    rotationSpeed,
    scaleSpeed,
    pulseEffect,
    particleCount,
    scanlineOpacity,
    vignetteIntensity,
  } = params;

  // Clamp particle count between 1 and 12
  const clampedParticleCount = Math.max(1, Math.min(12, particleCount));

  // Helper function to generate particle angle
  const getParticleAngle = (index: number, total: number): number => {
    return (index * 360) / total;
  };

  // Helper function to generate random offset for particles
  const getParticleOffset = (index: number): { x: number; y: number } => {
    const angle = getParticleAngle(index, clampedParticleCount);
    const radians = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radians) * 40, // 40% offset from center
      y: Math.sin(radians) * 40,
    };
  };

  // ==================== TUNNEL LAYERS ====================

  // Layer configuration: from outermost (largest) to innermost (smallest)
  const tunnelLayers = [
    {
      id: 'tunnel-layer-1',
      ringId: 'ring-1',
      size: 64, // 256px (w-64)
      color: 'border-cyan-400/60',
      startOffset: 0,
      scaleFrom: 0.1,
      scaleTo: 2.5,
      rotateSpeed: 360 * rotationSpeed * 0.8,
    },
    {
      id: 'tunnel-layer-2',
      ringId: 'ring-2',
      size: 56, // 224px (w-56)
      color: 'border-blue-400/50',
      startOffset: 0.5,
      scaleFrom: 0.15,
      scaleTo: 2.3,
      rotateSpeed: 360 * rotationSpeed * 0.9,
    },
    {
      id: 'tunnel-layer-3',
      ringId: 'ring-3',
      size: 48, // 192px (w-48)
      color: 'border-indigo-500/40',
      startOffset: 1.0,
      scaleFrom: 0.2,
      scaleTo: 2.1,
      rotateSpeed: 360 * rotationSpeed * 1.0,
    },
    {
      id: 'tunnel-layer-4',
      ringId: 'ring-4',
      size: 40, // 160px (w-40)
      color: 'border-purple-500/35',
      startOffset: 1.5,
      scaleFrom: 0.25,
      scaleTo: 1.9,
      rotateSpeed: 360 * rotationSpeed * 1.1,
    },
    {
      id: 'tunnel-layer-5',
      ringId: 'ring-5',
      size: 32, // 128px (w-32)
      color: 'border-orange-400/30',
      startOffset: 2.0,
      scaleFrom: 0.3,
      scaleTo: 1.7,
      rotateSpeed: 360 * rotationSpeed * 1.2,
    },
    {
      id: 'tunnel-layer-6',
      ringId: 'ring-6',
      size: 24, // 96px (w-24)
      color: 'border-red-400/25',
      startOffset: 2.5,
      scaleFrom: 0.35,
      scaleTo: 1.5,
      rotateSpeed: 360 * rotationSpeed * 1.3,
    },
  ];

  const tunnelLayerComponents = tunnelLayers.map((layer) => {
    const layerId = `perspective-tunnel-${layer.id}`;
    const ringId = `perspective-tunnel-${layer.ringId}`;

    // Scale effect: small to large (moving towards viewer)
    const scaleEffect = {
      id: `${layerId}-scale-effect`,
      componentId: layerId,
      data: {
        type: 'linear' as const,
        start: layer.startOffset,
        duration: duration - layer.startOffset,
        mode: 'provider' as const,
        targetIds: [layerId],
        ranges: [
          {
            key: 'scale',
            val: layer.scaleFrom * scaleSpeed,
            prog: 0,
          },
          {
            key: 'scale',
            val: layer.scaleTo * scaleSpeed,
            prog: 1,
          },
        ],
      },
    };

    // Rotation effect
    const rotateEffect = {
      id: `${layerId}-rotate-effect`,
      componentId: layerId,
      data: {
        type: 'linear' as const,
        start: layer.startOffset,
        duration: duration - layer.startOffset,
        mode: 'provider' as const,
        targetIds: [layerId],
        ranges: [
          {
            key: 'rotate',
            val: 0,
            prog: 0,
          },
          {
            key: 'rotate',
            val: layer.rotateSpeed,
            prog: 1,
          },
        ],
      },
    };

    // Optional pulse effect (opacity oscillation)
    const pulseEffectData = pulseEffect
      ? {
          id: `${layerId}-pulse-effect`,
          componentId: layerId,
          data: {
            type: 'linear' as const,
            start: layer.startOffset,
            duration: duration - layer.startOffset,
            mode: 'provider' as const,
            targetIds: [layerId],
            ranges: [
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.25 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 0.75 },
              { key: 'opacity', val: 0.6, prog: 1 },
            ],
          },
        }
      : null;

    const effects = [scaleEffect, rotateEffect];
    if (pulseEffectData) effects.push(pulseEffectData);

    // Ring (child element)
    const ring: RenderableComponentData = {
      id: ringId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `w-${layer.size} h-${layer.size} rounded-full border-2 ${layer.color} mix-blend-screen`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
    };

    // Layer container
    const layerContainer: RenderableComponentData = {
      id: layerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center will-change-transform',
          style: {
            transformOrigin: 'center center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects,
      childrenData: [ring],
    };

    return layerContainer;
  });

  // ==================== PARTICLES ====================

  const particleComponents = Array.from({ length: clampedParticleCount }, (_, index) => {
    const particleId = `perspective-tunnel-particle-${index + 1}`;
    const offset = getParticleOffset(index);

    // Particle moves from center (50%, 50%) to edge based on angle
    const moveEffect = {
      id: `${particleId}-move-effect`,
      componentId: particleId,
      data: {
        type: 'ease-out' as const,
        start: index * 0.2, // Stagger particle start times
        duration: duration - index * 0.2,
        mode: 'provider' as const,
        targetIds: [particleId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: offset.x * 10, prog: 1 }, // Move outward
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: offset.y * 10, prog: 1 },
        ],
      },
    };

    // Scale particle as it moves outward
    const scaleParticleEffect = {
      id: `${particleId}-scale-effect`,
      componentId: particleId,
      data: {
        type: 'ease-out' as const,
        start: index * 0.2,
        duration: duration - index * 0.2,
        mode: 'provider' as const,
        targetIds: [particleId],
        ranges: [
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 3, prog: 1 },
        ],
      },
    };

    // Fade out as particle reaches edge
    const opacityEffect = {
      id: `${particleId}-opacity-effect`,
      componentId: particleId,
      data: {
        type: 'linear' as const,
        start: index * 0.2,
        duration: duration - index * 0.2,
        mode: 'provider' as const,
        targetIds: [particleId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 1, prog: 0.6 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };

    // Determine particle color based on index
    const particleColors = [
      'bg-cyan-300',
      'bg-blue-300',
      'bg-purple-300',
      'bg-orange-300',
      'bg-pink-300',
      'bg-yellow-300',
      'bg-green-300',
      'bg-red-300',
      'bg-indigo-300',
      'bg-teal-300',
      'bg-amber-300',
      'bg-lime-300',
    ];
    const colorClass = particleColors[index % particleColors.length];
    const particleSize = index % 3 === 0 ? 'w-2 h-2' : 'w-1 h-1';

    const particle: RenderableComponentData = {
      id: particleId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute ${particleSize} rounded-full ${colorClass} mix-blend-screen top-1/2 left-1/2`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [moveEffect, scaleParticleEffect, opacityEffect],
    };

    return particle;
  });

  // ==================== OVERLAYS ====================

  // Scanlines overlay
  const scanlinesOverlay: RenderableComponentData = {
    id: 'perspective-tunnel-scanlines-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: scanlineOpacity,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: 'perspective-tunnel-vignette-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // ==================== CONTAINER STRUCTURE ====================

  // Tunnel container (holds all tunnel layers)
  const tunnelContainer: RenderableComponentData = {
    id: 'perspective-tunnel-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: tunnelLayerComponents,
  };

  // Particles container
  const particlesContainer: RenderableComponentData = {
    id: 'perspective-tunnel-particles-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: particleComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'perspective-tunnel-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center bg-black',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      tunnelContainer,
      particlesContainer,
      scanlinesOverlay,
      vignetteOverlay,
    ] as RenderableComponentData[],
  };

  // ==================== OUTPUT ====================

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ==================== METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'perspective-tunnel-parallax',
  title: 'Perspective Tunnel Parallax',
  description:
    'Creates a 3D tunnel illusion with concentric rings scaling from a central vanishing point. Features rotating layers with color shifts from cool (distant) to warm (near) tones, particle effects moving outward, scanline overlays for retro-futuristic aesthetic, and radial vignette for depth. Uses CSS perspective and mix-blend-mode for glow effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'parallax',
    '3d',
    'tunnel',
    'sci-fi',
    'retro',
    'particles',
    'perspective',
    'vignette',
    'scanlines',
    'motion',
  ],
  defaultInputParams: {
    duration: 10,
    rotationSpeed: 1,
    scaleSpeed: 1,
    pulseEffect: true,
    particleCount: 6,
    scanlineOpacity: 0.2,
    vignetteIntensity: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ==================== EXPORT ====================

export const perspectiveTunnelParallaxPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
