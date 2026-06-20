/**
 * Dynamic Text Collision Explosion Preset
 *
 * This preset creates a dramatic text collision effect where multiple text elements converge from
 * different screen edges at high velocity, collide at the center with an impact freeze effect,
 * then scatter apart with physics-based particle motion. It simulates a video editor's particle
 * explosion effect using text elements as particles.
 *
 * Features:
 * - **High-Velocity Convergence**: Text particles accelerate from off-screen using cubic-bezier easing
 * - **Impact Freeze Effect**: Brief freeze-frame at collision point with scale emphasis
 * - **Physics-Based Scatter**: Explosive outward motion with rotation and scale variations
 * - **Screen Shake**: Rapid oscillation effect at moment of impact
 * - **Fade-Out Dissipation**: Text fades as particles reach screen edges
 *
 * Technical Implementation:
 * - Three-phase animation: convergence (0-40%), impact (40-45%), scatter (45-100%)
 * - GPU-accelerated transforms (translateX/Y, scale, rotate, opacity)
 * - Provider mode effects with targetIds for direct component targeting
 * - Relative timing throughout for proper composition
 *
 * Use cases:
 * - Dynamic title reveals with explosive energy
 * - High-impact video transitions
 * - Action-packed intro sequences
 * - Energy-filled logo reveals
 * - Dramatic text announcements
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  texts: z
    .array(z.string())
    .default([
      'IMPACT',
      'CLASH',
      'BURST',
      'STRIKE',
      'FORCE',
      'POWER',
    ])
    .describe('Array of text strings to animate as particles (6-12 recommended)'),
  
  duration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Total animation duration in seconds (2-3 recommended)'),
  
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Base font size in pixels for text particles'),
  
  colors: z
    .array(z.string())
    .default([
      '#ffffff',
      '#ff6b6b',
      '#4ecdc4',
      '#ffe66d',
      '#a29bfe',
      '#fd79a8',
    ])
    .describe('Array of colors for text particles (hex or rgba)'),
  
  fontWeight: z
    .enum(['400', '500', '600', '700', '800', '900'])
    .default('700')
    .describe('Font weight for text particles'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for text particles'),
  
  impactScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.3)
    .describe('Scale multiplier at impact moment (1.2-1.5 recommended)'),
  
  scatterSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Speed multiplier for scatter phase (0.5=slow, 2=fast)'),
  
  rotationIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Rotation intensity during scatter (0=none, 1=maximum)'),
  
  shakeIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Screen shake intensity at impact (0=none, 1=maximum)'),
  
  enableShake: z
    .boolean()
    .default(true)
    .describe('Enable screen shake effect at impact moment'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    texts,
    duration,
    fontSize,
    colors,
    fontWeight,
    fontFamily,
    impactScale,
    scatterSpeed,
    rotationIntensity,
    shakeIntensity,
    enableShake,
  } = params;

  // Helper: Calculate initial off-screen positions for particles
  const calculateInitialPositions = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2;
    const distance = 200; // Distance off-screen
    
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Helper: Calculate scatter directions (opposite of convergence)
  const calculateScatterPositions = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2;
    const baseDistance = 150;
    const variation = Math.random() * 50; // Add randomness
    const distance = (baseDistance + variation) * scatterSpeed;
    
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Helper: Generate random rotation
  const generateRotation = (index: number) => {
    const baseRotations = [540, -720, 360, -540, 680, -620];
    const rotation = baseRotations[index % baseRotations.length];
    return rotation * rotationIntensity;
  };

  // Create text particle components
  const textParticles = texts.map((text, index) => {
    const particleId = `text-particle-${index}`;
    const color = colors[index % colors.length];
    const initialPos = calculateInitialPositions(index, texts.length);
    const scatterPos = calculateScatterPositions(index, texts.length);
    const rotation = generateRotation(index);

    // Create animation effect for this particle
    const particleEffect: GenericEffectData = {
      type: 'cubic-bezier',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        // Convergence phase (0-40%): Move from off-screen to center
        { key: 'translateX', val: initialPos.x, prog: 0 },
        { key: 'translateX', val: 0, prog: 0.4 },
        // Impact freeze phase (40-45%): Hold at center
        { key: 'translateX', val: 0, prog: 0.45 },
        // Scatter phase (45-100%): Explode outward
        { key: 'translateX', val: scatterPos.x, prog: 1 },
        
        // Y-axis movement
        { key: 'translateY', val: initialPos.y, prog: 0 },
        { key: 'translateY', val: 0, prog: 0.4 },
        { key: 'translateY', val: 0, prog: 0.45 },
        { key: 'translateY', val: scatterPos.y, prog: 1 },
        
        // Scale: normal → impact scale → shrink
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: impactScale, prog: 0.4 },
        { key: 'scale', val: impactScale, prog: 0.45 },
        { key: 'scale', val: 0.6, prog: 1 },
        
        // Rotation: start at impact, spin during scatter
        { key: 'rotate', val: 0, prog: 0.45 },
        { key: 'rotate', val: rotation, prog: 1 },
        
        // Opacity: fade out during scatter
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.8 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    const particleComponent: RenderableComponentData = {
      id: particleId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        className: 'absolute',
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: color,
          textAlign: 'center',
          willChange: 'transform, opacity',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `particle-effect-${index}`,
          componentId: 'generic',
          data: particleEffect,
        },
      ],
    };

    return particleComponent;
  });

  // Create screen shake effect (applied to container)
  const shakeEffect: GenericEffectData | null = enableShake ? {
    type: 'linear',
    start: duration * 0.4, // Start at impact (40%)
    duration: duration * 0.05, // Brief shake (5% of total)
    mode: 'provider',
    targetIds: ['collision-container'],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: -10 * shakeIntensity, prog: 0.2 },
      { key: 'translateX', val: 10 * shakeIntensity, prog: 0.4 },
      { key: 'translateX', val: -5 * shakeIntensity, prog: 0.6 },
      { key: 'translateX', val: 5 * shakeIntensity, prog: 0.8 },
      { key: 'translateX', val: 0, prog: 1 },
      
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -8 * shakeIntensity, prog: 0.2 },
      { key: 'translateY', val: 8 * shakeIntensity, prog: 0.4 },
      { key: 'translateY', val: -4 * shakeIntensity, prog: 0.6 },
      { key: 'translateY', val: 4 * shakeIntensity, prog: 0.8 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  } : null;

  // Main container with all particles
  const rootContainer: RenderableComponentData = {
    id: 'collision-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: shakeEffect ? [
      {
        id: 'shake-effect',
        componentId: 'generic',
        data: shakeEffect,
      },
    ] : [],
    childrenData: textParticles as RenderableComponentData[],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'textCollisionExplosion',
  title: 'Dynamic Text Collision Explosion',
  description:
    'Multiple text elements converge from screen edges at high velocity, collide at center with dramatic impact freeze effect, then scatter apart with physics-based rotation and fade-out motion',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'collision',
    'explosion',
    'particles',
    'kinetic',
    'impact',
    'dynamic',
    'freeze-frame',
    'scatter',
    'physics',
    'high-motion',
    'dramatic',
    'energy',
    'explosive',
  ],
  dependencies: {},
  defaultInputParams: {
    texts: ['IMPACT', 'CLASH', 'BURST', 'STRIKE', 'FORCE', 'POWER'],
    duration: 2.5,
    fontSize: 48,
    colors: ['#ffffff', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8'],
    fontWeight: '700',
    fontFamily: 'Inter',
    impactScale: 1.3,
    scatterSpeed: 1,
    rotationIntensity: 1,
    shakeIntensity: 0.7,
    enableShake: true,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const textCollisionExplosionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
