/**
 * Typokinetic Particle Explosion Preset
 *
 * This preset creates a dramatic particle explosion effect where text explodes into hundreds of small
 * particle elements that scatter chaotically before magnetically reassembling into the original text.
 * Think of it like a controlled explosion in After Effects where each letter breaks into 20-30 div
 * particles that fly outward with physics-based motion, then reverse their trajectories to reform.
 *
 * Features:
 * - **Particle Explosion**: Each word breaks into 20-30 small particles
 * - **Chaotic Scatter**: Particles fly outward with randomized trajectories
 * - **Magnetic Reassembly**: Particles accelerate back to reform the text
 * - **Staggered Animation**: Words explode sequentially with configurable offsets
 * - **Physics-Based Motion**: Varying sizes, rotation, and motion blur
 * - **GPU Acceleration**: Uses transform3d and will-change for performance
 *
 * Use cases:
 * - High-impact title reveals
 * - Dramatic text transitions
 * - Tech/gaming content
 * - Music video lyrics
 * - Action-packed intros
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ===========================
// PARAMETERS SCHEMA
// ===========================

const presetParams = z.object({
  text: z.string().describe('Text to explode into particles (e.g., "EXPLOSIVE TEXT")'),
  
  // Timing Configuration
  duration: z.number().min(2).max(5).default(2.5).describe('Total duration per word in seconds'),
  staggerDelay: z.number().min(0.1).max(0.3).default(0.15).describe('Delay between word explosions in seconds (100-300ms recommended)'),
  
  // Particle Configuration
  particlesPerWord: z.number().min(20).max(30).default(25).describe('Number of particles per word (20-30 recommended)'),
  particleSize: z.number().min(2).max(6).default(4).describe('Size of each particle in pixels'),
  
  // Explosion Configuration
  explosionDistance: z.number().min(150).max(300).default(200).describe('Maximum distance particles fly outward in pixels'),
  explosionIntensity: z.number().min(0.5).max(2).default(1).describe('Intensity multiplier for explosion force'),
  rotationRange: z.number().min(0).max(1080).default(720).describe('Maximum rotation in degrees during flight'),
  
  // Motion Configuration
  motionBlur: z.number().min(0).max(3).default(2).describe('Maximum motion blur in pixels'),
  scaleRange: z.object({
    min: z.number().min(0.05).max(0.2).default(0.1),
    max: z.number().min(0.2).max(0.4).default(0.3),
  }).default({ min: 0.1, max: 0.3 }).describe('Scale range for particles during explosion (0.1-0.3 of original)'),
  
  // Visual Configuration
  particleColor: z.string().default('#ffffff').describe('Color of particles (CSS color)'),
  textColor: z.string().default('#ffffff').describe('Color of original text before explosion'),
  fontSize: z.number().min(24).max(120).default(48).describe('Font size in pixels'),
  fontWeight: z.union([z.string(), z.number()]).default('700').describe('Font weight (e.g., "700", "bold")'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "Roboto:600:italic")'),
  
  // Phase Timing (as percentages)
  stablePhase: z.number().min(0).max(0.5).default(0.2).describe('Stable phase duration as percentage of total (0-20% default)'),
  explosionPhase: z.number().min(0.3).max(0.7).default(0.6).describe('End of explosion phase as percentage (20-60% default)'),
  
  // Performance
  useGPUAcceleration: z.boolean().default(true).describe('Use GPU acceleration (will-change-transform)'),
});

// ===========================
// PRESET EXECUTION
// ===========================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  
  // Helper: Parse font string
  const parseFontString = (fontString?: string) => {
    if (!fontString) return { family: 'Inter', style: {}, weights: undefined };
    
    const parts = fontString.split(':');
    const family = parts[0] || 'Inter';
    const fontStyle: any = {};
    let weights: string[] | undefined;
    
    if (parts.length > 1) {
      const weight = parseInt(parts[1], 10);
      if (!isNaN(weight)) {
        fontStyle.fontWeight = weight;
        weights = [parts[1]];
      }
    }
    
    if (parts.length > 2) {
      fontStyle.fontStyle = parts[2];
    }
    
    return { family, style: fontStyle, weights };
  };
  
  // Helper: Generate random value between min and max
  const randomRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };
  
  // Parse font
  const fontConfig = parseFontString(params.font);
  
  // Split text into words
  const words = params.text.trim().split(/\s+/);
  
  // Calculate phase timings
  const stableEnd = params.stablePhase;
  const explosionEnd = params.explosionPhase;
  
  // Build word components
  const wordComponents: RenderableComponentData[] = [];
  
  words.forEach((word, wordIndex) => {
    const wordId = `word-${wordIndex}`;
    const wordStart = wordIndex * params.staggerDelay;
    
    // Create base text (becomes invisible after explosion)
    const baseTextId = `base-text-${wordIndex}`;
    const baseText: RenderableComponentData = {
      id: baseTextId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: params.fontWeight,
          color: params.textColor,
          ...fontConfig.style,
        },
        font: {
          family: fontConfig.family,
          weights: fontConfig.weights,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    };
    
    // Create particles for this word
    const particleChildren: RenderableComponentData[] = [baseText];
    const particleIds: string[] = [];
    
    for (let i = 0; i < params.particlesPerWord; i++) {
      const particleId = `particle-${wordIndex}-${i}`;
      particleIds.push(particleId);
      
      const particle: RenderableComponentData = {
        id: particleId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute rounded-full ${params.useGPUAcceleration ? 'will-change-transform' : ''}`,
            style: {
              width: `${params.particleSize}px`,
              height: `${params.particleSize}px`,
              backgroundColor: params.particleColor,
              left: '50%',
              top: '50%',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      };
      
      particleChildren.push(particle);
    }
    
    // Create word container
    const wordContainer: RenderableComponentData = {
      id: wordId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
        },
      },
      context: {
        timing: {
          start: wordStart,
          duration: params.duration,
        },
      },
      childrenData: particleChildren,
    };
    
    // Create effects for this word
    
    // Effect 1: Fade out base text at stable phase end
    const fadeTextEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [baseTextId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: stableEnd },
        { key: 'opacity', val: 0, prog: stableEnd + 0.01 },
      ],
    };
    
    // Effect 2: Particle explosion and reassembly
    const particleRanges: any[] = [];
    
    // For each particle, generate unique random values
    particleIds.forEach(() => {
      const explosionX = randomRange(-params.explosionDistance, params.explosionDistance) * params.explosionIntensity;
      const explosionY = randomRange(-params.explosionDistance, params.explosionDistance) * params.explosionIntensity;
      const rotation = randomRange(0, params.rotationRange);
      const scale = randomRange(params.scaleRange.min, params.scaleRange.max);
      
      // Stable phase (0 - stableEnd)
      particleRanges.push(
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'scale', val: 1, prog: 0 },
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'opacity', val: 0, prog: 0 },
      );
      
      // Appear at stable end
      particleRanges.push(
        { key: 'opacity', val: 1, prog: stableEnd }
      );
      
      // Explosion phase (stableEnd - explosionEnd)
      particleRanges.push(
        { key: 'translateX', val: explosionX, prog: explosionEnd },
        { key: 'translateY', val: explosionY, prog: explosionEnd },
        { key: 'scale', val: scale, prog: explosionEnd },
        { key: 'rotate', val: rotation, prog: explosionEnd },
        { key: 'opacity', val: 0.8, prog: explosionEnd }
      );
      
      // Reassembly phase (explosionEnd - 1.0)
      particleRanges.push(
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'rotate', val: 0, prog: 1 },
        { key: 'opacity', val: 1, prog: 1 }
      );
    });
    
    const particleEffect: GenericEffectData = {
      type: 'ease-out',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: particleIds,
      ranges: particleRanges,
    };
    
    // Effect 3: Motion blur
    const blurRanges: any[] = [
      { key: 'blur', val: 0, prog: 0 },
      { key: 'blur', val: 0, prog: stableEnd },
      { key: 'blur', val: params.motionBlur, prog: (stableEnd + explosionEnd) / 2 },
      { key: 'blur', val: params.motionBlur, prog: explosionEnd },
      { key: 'blur', val: 0, prog: 1 },
    ];
    
    const blurEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: particleIds,
      ranges: blurRanges,
    };
    
    // Attach effects to word container
    wordContainer.effects = [
      {
        id: `fade-text-${wordIndex}`,
        componentId: 'generic',
        data: fadeTextEffect,
      },
      {
        id: `particle-explosion-${wordIndex}`,
        componentId: 'generic',
        data: particleEffect,
      },
      {
        id: `blur-${wordIndex}`,
        componentId: 'generic',
        data: blurEffect,
      },
    ];
    
    wordComponents.push(wordContainer);
  });
  
  // Create words container
  const wordsContainer: RenderableComponentData = {
    id: 'words-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row gap-4 items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration + (words.length - 1) * params.staggerDelay,
      },
    },
    childrenData: wordComponents,
  };
  
  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetic-particle-explosion-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration + (words.length - 1) * params.staggerDelay,
      },
    },
    childrenData: [wordsContainer],
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

// ===========================
// PRESET METADATA
// ===========================

const presetMetadata: PresetMetadata = {
  id: 'typokinetic-particle-explosion',
  title: 'Typokinetic Particle Explosion',
  description: 'Text explodes into hundreds of small particle elements that scatter chaotically before magnetically reassembling. Each word breaks into 20-30 div particles with physics-based motion, random rotation, and motion blur. Particles fly outward during explosion (20-60%), then accelerate back during reassembly (60-100%) with magnetic attraction effect. Words explode sequentially with 150ms stagger.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'particles', 'explosion', 'animation', 'text', 'dramatic', 'physics', 'reassembly'],
  dependencies: {},
  defaultInputParams: {
    text: 'EXPLOSIVE TEXT',
    duration: 2.5,
    staggerDelay: 0.15,
    particlesPerWord: 25,
    particleSize: 4,
    explosionDistance: 200,
    explosionIntensity: 1,
    rotationRange: 720,
    motionBlur: 2,
    scaleRange: { min: 0.1, max: 0.3 },
    particleColor: '#ffffff',
    textColor: '#ffffff',
    fontSize: 48,
    fontWeight: '700',
    font: 'Inter:700',
    stablePhase: 0.2,
    explosionPhase: 0.6,
    useGPUAcceleration: true,
  },
};

// ===========================
// EXPORT
// ===========================

export const typokineticParticleExplosionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
