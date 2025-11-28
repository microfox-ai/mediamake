/**
 * Portal Vortex Circle Reveal Preset
 *
 * Creates a sci-fi portal vortex reveal effect with swirling spiral rotation,
 * particle streams, energy rings, and space-time distortion effects.
 *
 * Features:
 * - Swirling portal vortex with nested rotation layers
 * - Pulsing energy rings emanating from center
 * - Spiral particle streams with parametric motion
 * - Space-time distortion via SVG turbulence filter
 * - Radial content reveal with burn edge effect
 * - Center glow with pulsing animation
 *
 * Use cases:
 * - Revealing futuristic content and space scenes
 * - Creating dimensional travel/portal effects
 * - Sci-fi title reveals and transitions
 * - Building immersive space-themed intros
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  trackId: z
    .string()
    .default('portal-vortex-reveal')
    .describe('Unique ID for this portal vortex reveal instance'),

  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the portal reveal animation in seconds'),

  // Content reveal configuration
  content: z
    .object({
      type: z
        .enum(['image', 'video'])
        .default('image')
        .describe('Type of content to reveal'),
      src: z.string().describe('Source URL or path for the content to reveal'),
    })
    .describe('Content to reveal through the portal'),

  // Portal visual configuration
  portalStyle: z
    .object({
      primaryColor: z
        .string()
        .default('rgba(0, 255, 255, 0.6)')
        .describe('Primary color for energy rings and effects (cyan)'),
      secondaryColor: z
        .string()
        .default('rgba(138, 43, 226, 0.5)')
        .describe('Secondary color for particles and accents (purple)'),
      glowIntensity: z
        .number()
        .min(0)
        .max(1)
        .default(0.4)
        .describe('Intensity of the central glow effect'),
    })
    .optional()
    .describe('Visual styling for portal colors and glow'),

  // Animation configuration
  animation: z
    .object({
      spiralSpeed: z
        .number()
        .min(0.5)
        .max(2)
        .default(1)
        .describe('Speed multiplier for spiral rotation (1 = normal)'),
      particleCount: z
        .number()
        .min(4)
        .max(16)
        .default(8)
        .describe('Number of particle streams spiraling outward'),
      energyRingCount: z
        .number()
        .min(3)
        .max(8)
        .default(5)
        .describe('Number of pulsing energy rings'),
    })
    .optional()
    .describe('Animation timing and particle configuration'),

  // Distortion configuration
  distortion: z
    .object({
      enabled: z
        .boolean()
        .default(true)
        .describe('Enable space-time distortion effect at edges'),
      intensity: z
        .number()
        .min(0)
        .max(20)
        .default(10)
        .describe('Intensity of turbulence distortion effect'),
    })
    .optional()
    .describe('Space-time distortion effect settings'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets } = props;

  // Validate dependencies
  if (!presets || !presets['wipe-reveal']) {
    throw new Error('Required preset dependency "wipe-reveal" not found');
  }

  const {
    trackId,
    duration,
    content,
    portalStyle = {},
    animation = {},
    distortion = {},
  } = params;

  // Extract configuration with defaults
  const primaryColor = portalStyle.primaryColor || 'rgba(0, 255, 255, 0.6)';
  const secondaryColor = portalStyle.secondaryColor || 'rgba(138, 43, 226, 0.5)';
  const glowIntensity = portalStyle.glowIntensity ?? 0.4;
  const spiralSpeed = animation.spiralSpeed ?? 1;
  const particleCount = animation.particleCount ?? 8;
  const energyRingCount = animation.energyRingCount ?? 5;
  const distortionEnabled = distortion.enabled ?? true;
  const distortionIntensity = distortion.intensity ?? 10;

  // ============================================================================
  // HELPER FUNCTIONS (defined inside execution)
  // ============================================================================

  // Calculate spiral path parameters for particles
  const calculateSpiralMotion = (
    index: number,
    total: number,
    maxDistance: number,
  ) => {
    const angleOffset = (index / total) * 360; // Distribute particles around circle
    const spiralRotations = 720 * spiralSpeed; // 2 full rotations * speed

    return {
      angleOffset,
      spiralRotations,
      maxDistance,
    };
  };

  // Generate energy ring pulse timing
  const calculateRingTiming = (ringIndex: number, totalRings: number) => {
    const interval = duration / (totalRings + 1);
    const startTime = ringIndex * interval;
    const pulseDuration = Math.min(0.6, duration / totalRings);

    return {
      start: startTime,
      duration: pulseDuration,
    };
  };

  // ============================================================================
  // CALL WIPE-REVEAL SUB-PRESET FOR CONTENT REVEAL
  // ============================================================================

  const wipeRevealParams = {
    trackId: `${trackId}-content-reveal`,
    imageUrl: content.src,
    revealType: 'radial' as const,
    edgeStyle: 'burn' as const,
    revealDuration: duration,
    fit: 'cover' as const,
    backgroundColor: 'rgba(0,0,0,1)',
    burnGlow: true,
    burnGlowColor: primaryColor,
    burnGlowIntensity: 0.8,
  };

  const wipeRevealResult = await presets['wipe-reveal'](wipeRevealParams, props);

  // Extract content reveal component
  const contentRevealChildren =
    wipeRevealResult?.output?.childrenData || [];

  // ============================================================================
  // BUILD PORTAL VORTEX STRUCTURE
  // ============================================================================

  // SVG Distortion Filter (if enabled)
  const distortionFilterSVG = distortionEnabled
    ? ({
        id: `${trackId}-distortion-filter`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<svg width="0" height="0" style="position:absolute"><defs><filter id="${trackId}-turbulence"><feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" result="turbulence"/><feDisplacementMap in2="turbulence" in="SourceGraphic" scale="${distortionIntensity}" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>`,
          className: 'absolute inset-0',
          style: { pointerEvents: 'none' },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData)
    : null;

  // Center Glow Element
  const centerGlow: RenderableComponentData = {
    id: `${trackId}-center-glow`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 80px; height: 80px; background: radial-gradient(circle, ${primaryColor} 0%, ${secondaryColor.replace('0.5', '0.3')} 50%, transparent 100%); border-radius: 50%; box-shadow: 0 0 40px 10px ${primaryColor.replace('0.6', '0.4')};"></div>`,
      className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: `${trackId}-center-glow-pulse`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [`${trackId}-center-glow`],
          ranges: [
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1.3, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.8, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outer Spiral Ring
  const outerSpiralRing: RenderableComponentData = {
    id: `${trackId}-outer-spiral-ring`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 600px; height: 600px; border: 3px solid ${primaryColor.replace('0.6', '0.4')}; border-radius: 50%; box-shadow: 0 0 30px ${primaryColor.replace('0.6', '0.4')}, inset 0 0 30px ${primaryColor.replace('0.6', '0.2')};"></div>`,
      className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Inner Spiral Ring
  const innerSpiralRing: RenderableComponentData = {
    id: `${trackId}-inner-spiral-ring`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 400px; height: 400px; border: 2px solid ${secondaryColor}; border-radius: 50%; box-shadow: 0 0 20px ${secondaryColor}, inset 0 0 20px ${secondaryColor.replace('0.5', '0.3')};"></div>`,
      className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Energy Rings (pulsing outward)
  const energyRings: RenderableComponentData[] = [];
  for (let i = 0; i < energyRingCount; i++) {
    const timing = calculateRingTiming(i, energyRingCount);

    energyRings.push({
      id: `${trackId}-energy-ring-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100px; height: 100px; border: 2px solid ${primaryColor}; border-radius: 50%; box-shadow: 0 0 15px ${primaryColor.replace('0.6', '0.5')};"></div>`,
        className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `${trackId}-energy-ring-${i}-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: timing.start,
            duration: timing.duration,
            mode: 'provider',
            targetIds: [`${trackId}-energy-ring-${i}`],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 3, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Particle Streams (spiraling outward)
  const particles: RenderableComponentData[] = [];
  for (let i = 0; i < particleCount; i++) {
    const spiral = calculateSpiralMotion(i, particleCount, 300);

    // Calculate spiral path using parametric equations
    // x = r * cos(θ + offset), y = r * sin(θ + offset)
    const angleRad = (spiral.angleOffset * Math.PI) / 180;
    const maxX = Math.cos(angleRad) * spiral.maxDistance;
    const maxY = Math.sin(angleRad) * spiral.maxDistance;
    const midX = Math.cos(angleRad + Math.PI / 2) * (spiral.maxDistance * 0.5);
    const midY = Math.sin(angleRad + Math.PI / 2) * (spiral.maxDistance * 0.5);

    particles.push({
      id: `${trackId}-particle-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 4px; height: 4px; background: linear-gradient(to right, ${secondaryColor.replace('0.5', '0.8')}, ${primaryColor.replace('0.6', '0.8')}); border-radius: 50%; box-shadow: 0 0 8px ${primaryColor.replace('0.6', '0.8')};"></div>`,
        className: 'absolute top-1/2 left-1/2',
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `${trackId}-particle-${i}-spiral`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [`${trackId}-particle-${i}`],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: midX, prog: 0.5 },
              { key: 'translateX', val: maxX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: midY, prog: 0.5 },
              { key: 'translateY', val: maxY, prog: 1 },
              { key: 'rotate', val: spiral.angleOffset, prog: 0 },
              { key: 'rotate', val: spiral.angleOffset + spiral.spiralRotations, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Outer Rotation Layer (360deg/3s)
  const outerRotationLayer: RenderableComponentData = {
    id: `${trackId}-outer-rotation-layer`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: `${trackId}-outer-rotation-effect`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [`${trackId}-outer-rotation-layer`],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 360, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [outerSpiralRing],
  };

  // Inner Rotation Layer (-540deg/3s, counter-rotating)
  const innerRotationLayer: RenderableComponentData = {
    id: `${trackId}-inner-rotation-layer`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: `${trackId}-inner-rotation-effect`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [`${trackId}-inner-rotation-layer`],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -540, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [innerSpiralRing],
  };

  // Energy Rings Container
  const energyRingsContainer: RenderableComponentData = {
    id: `${trackId}-energy-rings-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: energyRings,
  };

  // Particles Container
  const particlesContainer: RenderableComponentData = {
    id: `${trackId}-particles-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: particles,
  };

  // Content Reveal Container (from wipe-reveal)
  const contentRevealContainer: RenderableComponentData = {
    id: `${trackId}-content-reveal-container`,
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
        duration,
      },
    },
    childrenData: contentRevealChildren as RenderableComponentData[],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      distortionFilterSVG,
      contentRevealContainer,
      outerRotationLayer,
      innerRotationLayer,
      energyRingsContainer,
      particlesContainer,
      centerGlow,
    ].filter(Boolean) as RenderableComponentData[],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'portal-vortex-reveal',
  title: 'Portal Vortex Circle Reveal',
  description:
    'Sci-fi portal vortex reveal with swirling spiral rotation, particle streams, energy rings, and space-time distortion effects. Creates a sense of traveling through dimensions with pulsing energy emanating from center. Perfect for futuristic content, space scenes, or dimensional transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'portal',
    'vortex',
    'reveal',
    'sci-fi',
    'spiral',
    'particles',
    'energy',
    'distortion',
    'wormhole',
    'dimensional',
    'futuristic',
    'space',
  ],
  dependencies: {
    presets: ['wipe-reveal'],
  },
  defaultInputParams: {
    trackId: 'portal-vortex-reveal',
    duration: 3,
    content: {
      type: 'image',
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    portalStyle: {
      primaryColor: 'rgba(0, 255, 255, 0.6)',
      secondaryColor: 'rgba(138, 43, 226, 0.5)',
      glowIntensity: 0.4,
    },
    animation: {
      spiralSpeed: 1,
      particleCount: 8,
      energyRingCount: 5,
    },
    distortion: {
      enabled: true,
      intensity: 10,
    },
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const portalVortexRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
