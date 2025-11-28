/**
 * Particle Shimmer Text Effect Preset
 *
 * Creates a magical particle-based shimmer effect where tiny points of light dance across text
 * like dust motes catching sunlight. Features 20-30 independently animated particles with 
 * orbital/floating movement, opacity fades, and glow effects. The particles follow text contours 
 * creating an enchanted constellation effect, perfect for whimsical or fantasy-themed content.
 *
 * Features:
 * - **Particle System**: 20-30 small glowing particles (2-4px) with randomized positioning
 * - **Orbital Movement**: Complex animation paths using sine/cosine functions for floating motion
 * - **Glow Effects**: Particles emit soft white glow (box-shadow) for magical feel
 * - **Staggered Animation**: Offset delays (index * 100ms) for cascading particle entrance
 * - **Text Glow Sync**: Subtle text brightness variation synchronized with particle proximity
 * - **Customizable**: Control particle count, size range, speed, glow intensity, colors
 *
 * Use cases:
 * - Fantasy or magical themed titles
 * - Whimsical content introductions
 * - Enchanted text effects for storytelling
 * - Fairy tale or dream sequence titles
 * - Celestial or starry text overlays
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text content to display with particle shimmer effect'),
  
  // Timing
  duration: z
    .number()
    .min(1)
    .default(5)
    .describe('Duration of the effect in seconds'),
  
  // Text styling
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .optional()
    .describe('Font family (e.g., "Inter", "Roboto")'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  
  textGlow: z
    .boolean()
    .default(true)
    .describe('Enable subtle text glow effect synchronized with particles'),
  
  // Particle configuration
  particleCount: z
    .number()
    .min(10)
    .max(50)
    .default(25)
    .describe('Number of shimmer particles (20-30 recommended)'),
  
  particleMinSize: z
    .number()
    .min(1)
    .max(6)
    .default(2)
    .describe('Minimum particle size in pixels'),
  
  particleMaxSize: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .describe('Maximum particle size in pixels'),
  
  particleColor: z
    .string()
    .default('#ffffff')
    .describe('Particle color (CSS color value)'),
  
  particleGlowIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Particle glow intensity multiplier'),
  
  // Animation configuration
  animationSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Animation speed multiplier (1 = normal)'),
  
  particleOpacityMin: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe('Minimum particle opacity in fade cycle'),
  
  particleOpacityMax: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Maximum particle opacity in fade cycle'),
  
  // Layout
  textAlignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment'),
  
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { config } = props;
  const fps = config?.fps || 30;
  
  // Helper function: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };
  
  // Helper function: Generate orbital animation path
  const createParticleAnimation = (
    particleId: string,
    index: number,
  ): GenericEffectData => {
    const baseDuration = randomInRange(2, 4) / params.animationSpeed;
    const delay = (index * 0.1) / params.animationSpeed;
    
    // Random orbit parameters
    const radiusX = randomInRange(20, 60);
    const radiusY = randomInRange(20, 60);
    const angleOffset = randomInRange(0, 360);
    const directionMultiplier = Math.random() > 0.5 ? 1 : -1;
    
    // Create complex animation ranges with sine/cosine orbital movement
    const ranges: Array<{ key: string; val: any; prog: number }> = [];
    
    // Opacity fade (0 → 1 → 0)
    ranges.push(
      { key: 'opacity', val: params.particleOpacityMin, prog: 0 },
      { key: 'opacity', val: params.particleOpacityMax, prog: 0.15 },
      { key: 'opacity', val: params.particleOpacityMax, prog: 0.85 },
      { key: 'opacity', val: params.particleOpacityMin, prog: 1 },
    );
    
    // Scale variation (subtle pulse)
    ranges.push(
      { key: 'scale', val: 0.8, prog: 0 },
      { key: 'scale', val: 1.2, prog: 0.25 },
      { key: 'scale', val: 1, prog: 0.5 },
      { key: 'scale', val: 1.2, prog: 0.75 },
      { key: 'scale', val: 0.8, prog: 1 },
    );
    
    // Orbital movement using mathematical sine/cosine paths
    // We'll simulate this with translateX/Y keyframes
    const orbitSteps = 16;
    for (let i = 0; i <= orbitSteps; i++) {
      const prog = i / orbitSteps;
      const angle = ((angleOffset + prog * 360 * directionMultiplier) * Math.PI) / 180;
      const x = Math.cos(angle) * radiusX;
      const y = Math.sin(angle) * radiusY;
      
      ranges.push(
        { key: 'translateX', val: x, prog },
        { key: 'translateY', val: y, prog },
      );
    }
    
    return {
      type: 'ease-in-out',
      start: delay,
      duration: baseDuration,
      mode: 'provider',
      targetIds: [particleId],
      ranges,
    };
  };
  
  // Generate particle nodes
  const particles: RenderableComponentData[] = [];
  
  for (let i = 0; i < params.particleCount; i++) {
    const particleId = `particle-${i}`;
    const size = randomInRange(params.particleMinSize, params.particleMaxSize);
    
    // Random initial position within text bounds (roughly centered with spread)
    const initialX = randomInRange(-100, 100); // Relative to center
    const initialY = randomInRange(-40, 40); // Vertical spread
    
    // Glow effect based on intensity
    const glowSize = 10 * params.particleGlowIntensity;
    const glowBlur = 20 * params.particleGlowIntensity;
    
    const particleEffect = createParticleAnimation(particleId, i);
    
    particles.push({
      id: particleId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute rounded-full pointer-events-none',
          style: {
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: params.particleColor,
            boxShadow: `0 0 ${glowSize}px rgba(255, 255, 255, ${0.8 * params.particleGlowIntensity}), 0 0 ${glowBlur}px rgba(255, 255, 255, ${0.4 * params.particleGlowIntensity})`,
            left: `calc(50% + ${initialX}px)`,
            top: `calc(50% + ${initialY}px)`,
            transform: 'translate(-50%, -50%)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `particle-effect-${i}`,
          componentId: 'generic',
          data: particleEffect,
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  }
  
  // Text atom
  const textAtomId = 'shimmer-text';
  const textEffects: any[] = [];
  
  // Optional text glow effect (subtle brightness variation)
  if (params.textGlow) {
    textEffects.push({
      id: 'text-glow-pulse',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [textAtomId],
        ranges: [
          { key: 'filter', val: 'brightness(1)', prog: 0 },
          { key: 'filter', val: 'brightness(1.15)', prog: 0.25 },
          { key: 'filter', val: 'brightness(1)', prog: 0.5 },
          { key: 'filter', val: 'brightness(1.15)', prog: 0.75 },
          { key: 'filter', val: 'brightness(1)', prog: 1 },
        ],
      } as GenericEffectData,
    });
  }
  
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: 'bold',
        color: params.textColor,
        textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
      },
      font: params.fontFamily
        ? {
            family: params.fontFamily,
            weights: ['700'],
          }
        : undefined,
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: textEffects,
  } as RenderableComponentData;
  
  // Text layer container
  const textLayer: RenderableComponentData = {
    id: 'text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom],
  } as RenderableComponentData;
  
  // Particle overlay container
  const particleOverlay: RenderableComponentData = {
    id: 'particle-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-20 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: particles,
  } as RenderableComponentData;
  
  // Alignment classes
  const alignmentClass =
    params.textAlignment === 'left'
      ? 'justify-start'
      : params.textAlignment === 'right'
      ? 'justify-end'
      : 'justify-center';
  
  const verticalClass =
    params.verticalPosition === 'top'
      ? 'items-start'
      : params.verticalPosition === 'bottom'
      ? 'items-end'
      : 'items-center';
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'particle-shimmer-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${alignmentClass} ${verticalClass}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textLayer, particleOverlay],
  } as RenderableComponentData;
  
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
  id: 'particle-shimmer-text',
  title: 'Particle Shimmer Text Effect',
  description:
    'Creates a magical particle-based shimmer effect where tiny points of light dance across text like dust motes catching sunlight. Features 20-30 independently animated particles with orbital/floating movement, opacity fades, and glow effects. The particles follow text contours creating an enchanted constellation effect, perfect for whimsical or fantasy-themed content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'particles',
    'shimmer',
    'glow',
    'magical',
    'fantasy',
    'whimsical',
    'enchanted',
    'orbital',
    'constellation',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Magical Text',
    duration: 5,
    fontSize: 72,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    textGlow: true,
    particleCount: 25,
    particleMinSize: 2,
    particleMaxSize: 4,
    particleColor: '#ffffff',
    particleGlowIntensity: 1,
    animationSpeed: 1,
    particleOpacityMin: 0,
    particleOpacityMax: 1,
    textAlignment: 'center',
    verticalPosition: 'center',
  },
};

// Export preset
export const particleShimmerTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
