/**
 * Comic Book Explosive Text Charge-Up Preset
 *
 * This preset creates a dynamic comic book style text animation where outlined text appears to be 
 * "charged up" with energy before bursting into full color. Perfect for superhero title cards 
 * and action-oriented content.
 *
 * Features:
 * - **Energy Charge-Up Phase**: Text outline trembles with increasing intensity (shake amplitude grows from ±2px to ±10px)
 * - **Particle Effects**: Small sparks/particles emit from text edges and animate outward
 * - **Explosive Fill**: Color explodes inward with scale overshoot (0 → 1.2 → 1) for impact
 * - **Dynamic Layering**: Outline text (z-10), particles (z-20), filled text (z-30)
 * - **Audio Synchronization**: Optional beat-synchronized explosion timing when audio is present
 * - **Customizable Impact**: Adjustable shake intensity, particle count, and explosion timing
 *
 * Use cases:
 * - Superhero title cards and action sequences
 * - Dynamic intro/outro screens with impact
 * - Energy-themed text reveals
 * - Comic book style transitions
 * - Action-oriented content branding
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text content to display with explosive effect'),
  
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(96)
    .optional()
    .describe('Font size in pixels'),
  
  outlineColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Color of the text outline during charge-up phase'),
  
  fillColor: z
    .string()
    .default('#FF0000')
    .optional()
    .describe('Color that explodes inward to fill the text'),
  
  particleColor: z
    .string()
    .default('#FFD700')
    .optional()
    .describe('Color of energy particles/sparks emitting from text edges'),
  
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Total animation duration in seconds'),
  
  chargeUpRatio: z
    .number()
    .min(0.3)
    .max(0.9)
    .default(0.7)
    .optional()
    .describe('Ratio of duration spent on charge-up phase (0.7 = 70% charge, 30% explosion)'),
  
  shakeIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe('Shake intensity multiplier for charge-up phase'),
  
  particleCount: z
    .number()
    .int()
    .min(4)
    .max(16)
    .default(8)
    .optional()
    .describe('Number of energy particles to generate'),
  
  explosionScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .optional()
    .describe('Peak scale during explosion overshoot (1.2 = 120% size before settling)'),
  
  audioSrc: z
    .string()
    .optional()
    .describe('Optional audio source for beat-synchronized explosion timing'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    text,
    fontSize = 96,
    outlineColor = '#000000',
    fillColor = '#FF0000',
    particleColor = '#FFD700',
    duration = 3,
    chargeUpRatio = 0.7,
    shakeIntensity = 1,
    particleCount = 8,
    explosionScale = 1.2,
    audioSrc,
  } = params;

  // Calculate phase timings
  const chargeUpDuration = duration * chargeUpRatio;
  const explosionDuration = duration * (1 - chargeUpRatio);
  const explosionStart = chargeUpDuration;

  // Optional: Analyze audio for beat synchronization
  let beatTimestamp: number | null = null;
  if (audioSrc && props.fetcher) {
    try {
      const { analysis } = await props.fetcher('/api/analyze-audio', {
        audioSrc,
      });
      if (analysis && analysis.length > 0) {
        // Find strongest beat in the charge-up phase to sync explosion
        const chargeUpBeats = analysis.filter(
          (beat: any) => beat.timestamp <= chargeUpDuration && beat.timestamp >= chargeUpDuration * 0.5
        );
        if (chargeUpBeats.length > 0) {
          const strongestBeat = chargeUpBeats.reduce((prev: any, current: any) =>
            current.intensity > prev.intensity ? current : prev
          );
          beatTimestamp = strongestBeat.timestamp;
        }
      }
    } catch (error) {
      // Audio analysis failed - use default timing
      console.warn('Audio analysis failed, using default timing');
    }
  }

  // Use beat timing if available, otherwise use calculated timing
  const actualExplosionStart = beatTimestamp ?? explosionStart;
  const actualChargeUpDuration = beatTimestamp ?? chargeUpDuration;

  // ============================================================================
  // HELPER: Generate Particle Positions
  // ============================================================================

  const generateParticlePositions = (count: number) => {
    const positions: Array<{ top: string; left: string; angle: number }> = [];
    const angleStep = 360 / count;
    
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const radian = (angle * Math.PI) / 180;
      
      // Position particles around text center with some randomness
      const distance = 100 + Math.random() * 40; // 100-140px from center
      const offsetX = Math.cos(radian) * distance;
      const offsetY = Math.sin(radian) * distance;
      
      positions.push({
        top: `calc(50% + ${offsetY}px)`,
        left: `calc(50% + ${offsetX}px)`,
        angle,
      });
    }
    
    return positions;
  };

  const particlePositions = generateParticlePositions(particleCount);

  // ============================================================================
  // OUTLINE TEXT LAYER (Z-10) - Charge-Up Phase
  // ============================================================================

  const outlineTextId = 'comic-outline-text';

  // Shake effect with increasing amplitude
  const shakeEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: actualChargeUpDuration,
    mode: 'provider',
    targetIds: [outlineTextId],
    ranges: [
      // Progressive shake intensity
      { key: 'translateX', val: 2 * shakeIntensity, prog: 0 },
      { key: 'translateX', val: -3 * shakeIntensity, prog: 0.1 },
      { key: 'translateX', val: 4 * shakeIntensity, prog: 0.2 },
      { key: 'translateX', val: -5 * shakeIntensity, prog: 0.3 },
      { key: 'translateX', val: 6 * shakeIntensity, prog: 0.4 },
      { key: 'translateX', val: -7 * shakeIntensity, prog: 0.5 },
      { key: 'translateX', val: 8 * shakeIntensity, prog: 0.6 },
      { key: 'translateX', val: -9 * shakeIntensity, prog: 0.7 },
      { key: 'translateX', val: 10 * shakeIntensity, prog: 0.8 },
      { key: 'translateX', val: -10 * shakeIntensity, prog: 0.9 },
      { key: 'translateX', val: 0, prog: 1 },
      
      { key: 'translateY', val: -2 * shakeIntensity, prog: 0 },
      { key: 'translateY', val: 3 * shakeIntensity, prog: 0.1 },
      { key: 'translateY', val: -4 * shakeIntensity, prog: 0.2 },
      { key: 'translateY', val: 5 * shakeIntensity, prog: 0.3 },
      { key: 'translateY', val: -6 * shakeIntensity, prog: 0.4 },
      { key: 'translateY', val: 7 * shakeIntensity, prog: 0.5 },
      { key: 'translateY', val: -8 * shakeIntensity, prog: 0.6 },
      { key: 'translateY', val: 9 * shakeIntensity, prog: 0.7 },
      { key: 'translateY', val: -10 * shakeIntensity, prog: 0.8 },
      { key: 'translateY', val: 10 * shakeIntensity, prog: 0.9 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // Fade out outline at explosion
  const outlineFadeEffect: GenericEffectData = {
    type: 'ease-out',
    start: actualExplosionStart,
    duration: explosionDuration * 0.3,
    mode: 'provider',
    targetIds: [outlineTextId],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  const outlineTextLayer = {
    id: outlineTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'uppercase font-black drop-shadow-2xl',
      style: {
        fontSize,
        color: 'transparent',
        WebkitTextStroke: `4px ${outlineColor}`,
        textStroke: `4px ${outlineColor}`,
        fontWeight: 900,
        position: 'absolute' as const,
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      { id: 'shake-effect', componentId: 'generic', data: shakeEffect },
      { id: 'outline-fade', componentId: 'generic', data: outlineFadeEffect },
    ],
  } as RenderableComponentData;

  // ============================================================================
  // PARTICLE LAYER (Z-20) - Energy Sparks
  // ============================================================================

  const particleChildren = particlePositions.map((pos, index) => {
    const particleId = `particle-${index}`;
    const particleSize = 6 + Math.random() * 4; // 6-10px
    
    // Particles appear during charge-up and explode outward
    const particleAppearTime = actualChargeUpDuration * 0.3 + (index / particleCount) * actualChargeUpDuration * 0.4;
    const particleAnimDuration = actualExplosionStart - particleAppearTime + explosionDuration;
    
    // Calculate explosion direction (outward from center)
    const explosionDistance = 150 + Math.random() * 50; // 150-200px
    const radian = (pos.angle * Math.PI) / 180;
    const explodeX = Math.cos(radian) * explosionDistance;
    const explodeY = Math.sin(radian) * explosionDistance;
    
    const particleEffect: GenericEffectData = {
      type: 'ease-out',
      start: particleAppearTime,
      duration: particleAnimDuration,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.1 },
        { key: 'opacity', val: 1, prog: 0.6 },
        { key: 'opacity', val: 0, prog: 1 },
        
        // Explode outward
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: explodeX * 0.2, prog: 0.6 },
        { key: 'translateX', val: explodeX, prog: 1 },
        
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: explodeY * 0.2, prog: 0.6 },
        { key: 'translateY', val: explodeY, prog: 1 },
        
        // Scale up slightly
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 1, prog: 0.1 },
        { key: 'scale', val: 1.5, prog: 1 },
      ],
    };
    
    return {
      id: particleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${particleSize}px; height: ${particleSize}px; background: ${particleColor}; border-radius: 50%; box-shadow: 0 0 ${particleSize * 2}px ${particleColor};"></div>`,
        className: 'absolute',
        style: {
          top: pos.top,
          left: pos.left,
          transform: 'translate(-50%, -50%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        { id: `particle-effect-${index}`, componentId: 'generic', data: particleEffect },
      ],
    } as RenderableComponentData;
  });

  const particleContainer = {
    id: 'particle-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: particleChildren,
  } as RenderableComponentData;

  // ============================================================================
  // FILLED TEXT LAYER (Z-30) - Explosion Effect
  // ============================================================================

  const filledTextId = 'comic-filled-text';

  // Explosive scale effect with overshoot
  const explosionEffect: GenericEffectData = {
    type: 'spring',
    start: actualExplosionStart,
    duration: explosionDuration,
    mode: 'provider',
    targetIds: [filledTextId],
    ranges: [
      // Scale from 0 to overshoot to settle
      { key: 'scale', val: 0, prog: 0 },
      { key: 'scale', val: explosionScale, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
      
      // Fade in
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.3 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  const filledTextLayer = {
    id: filledTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'uppercase font-black drop-shadow-2xl',
      style: {
        fontSize,
        color: fillColor,
        WebkitTextStroke: `4px ${outlineColor}`,
        textStroke: `4px ${outlineColor}`,
        fontWeight: 900,
        position: 'absolute' as const,
        zIndex: 30,
        filter: `drop-shadow(0 0 20px ${fillColor})`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      { id: 'explosion-effect', componentId: 'generic', data: explosionEffect },
    ],
  } as RenderableComponentData;

  // ============================================================================
  // FLASH EFFECT (Z-40) - Impact Flash
  // ============================================================================

  const flashId = 'flash-effect';

  const flashEffect: GenericEffectData = {
    type: 'ease-out',
    start: actualExplosionStart,
    duration: explosionDuration * 0.2,
    mode: 'provider',
    targetIds: [flashId],
    ranges: [
      { key: 'opacity', val: 0.8, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  const flashLayer = {
    id: flashId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: white;"></div>',
      className: 'absolute inset-0',
      style: {
        zIndex: 40,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      { id: 'flash-fade', componentId: 'generic', data: flashEffect },
    ],
  } as RenderableComponentData;

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer = {
    id: 'comic-explosive-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full flex items-center justify-center',
        style: {
          backgroundColor: 'transparent',
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
      outlineTextLayer,
      particleContainer,
      filledTextLayer,
      flashLayer,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

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
  id: 'comic-explosive-text',
  title: 'Comic Book Explosive Text Charge-Up',
  description:
    'Dynamic comic book style text animation with energy charge-up phase (trembling outline with particle effects) followed by an explosive color fill with shockwave impact. Perfect for superhero title cards and action-oriented content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'comic',
    'superhero',
    'explosive',
    'action',
    'energy',
    'shake',
    'particles',
    'title-card',
    'dynamic',
    'impact',
  ],
  defaultInputParams: {
    text: 'BAM!',
    fontSize: 96,
    outlineColor: '#000000',
    fillColor: '#FF0000',
    particleColor: '#FFD700',
    duration: 3,
    chargeUpRatio: 0.7,
    shakeIntensity: 1,
    particleCount: 8,
    explosionScale: 1.2,
  },
  dependencies: {},
};

// ============================================================================
// EXPORT
// ============================================================================

export const comicExplosiveTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
