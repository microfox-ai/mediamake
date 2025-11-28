/**
 * Reality Distortion Warp Shake Preset
 * 
 * A sci-fi inspired reality-distortion warping shake effect that makes text appear 
 * to phase in and out of existence, trembling between dimensions. Features:
 * - Multiple ghost layers with chromatic aberration (red/blue color shifts)
 * - Phase shifting oscillations with interference patterns (±10px offsets at different frequencies)
 * - Periodic phase jumps (teleporting to random positions every 2-3s)
 * - Reality distortion effects (scale oscillation 0.95-1.05, rotate wobble ±5deg)
 * - Probability cloud effect with trailing ghost images
 * - Opacity pulsing (main text 0.7-1.0, ghosts fade independently)
 * 
 * Perfect for sci-fi portals, supernatural contexts, and otherworldly atmospheres.
 * Uses transform and opacity only for GPU performance, leverages blend modes for chromatic effects.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display with reality warp effect'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontWeight: z.union([z.string(), z.number()]).default('700').describe('Font weight'),
  textColor: z.string().default('#FFFFFF').describe('Main text color'),
  fontFamily: z.string().default('Inter').describe('Font family name'),
  duration: z.number().default(10).describe('Duration of the effect in seconds'),
  
  // Phase shift parameters
  phaseCount: z.number().min(1).max(5).default(3).describe('Number of ghost layers (1-5)'),
  phaseShiftIntensity: z.number().min(0.1).max(2).default(1).describe('Phase shift intensity multiplier'),
  
  // Phase jump parameters
  phaseJumpFrequency: z.number().min(1).max(5).default(2.5).describe('Frequency of phase jumps in seconds (every N seconds)'),
  phaseJumpDistance: z.number().min(20).max(100).default(50).describe('Distance of phase jumps in pixels'),
  
  // Distortion parameters
  distortionIntensity: z.number().min(0.1).max(2).default(1).describe('Overall distortion intensity multiplier'),
  scaleOscillationAmount: z.number().min(0).max(0.2).default(0.05).describe('Scale oscillation amount (0.95-1.05 by default)'),
  rotationWobbleAmount: z.number().min(0).max(15).default(5).describe('Rotation wobble in degrees'),
  
  // Visual parameters
  ghostOpacities: z.array(z.number().min(0).max(1)).default([0.3, 0.2, 0.1]).describe('Opacity values for each ghost layer'),
  mainTextOpacityRange: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).default([0.7, 1.0]).describe('Main text opacity range [min, max]'),
  
  // Chromatic aberration colors
  chromaticColors: z.array(z.string()).default([
    'rgba(150, 0, 255, 0.6)',
    'rgba(255, 50, 50, 0.7)', 
    'rgba(0, 100, 255, 0.8)'
  ]).describe('Colors for chromatic aberration ghost layers'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to create phase shift effect
  const createPhaseShiftEffect = (
    targetId: string,
    effectId: string,
    frequency: number,
    amplitude: number,
    axis: 'x' | 'y'
  ): any => {
    const key = axis === 'x' ? 'translateX' : 'translateY';
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key, val: -amplitude, prog: 0 },
          { key, val: amplitude, prog: 0.25 },
          { key, val: -amplitude, prog: 0.5 },
          { key, val: amplitude, prog: 0.75 },
          { key, val: -amplitude, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper function to create phase jump effect
  const createPhaseJumpEffect = (
    targetId: string,
    effectId: string,
    jumpTime: number
  ): any => {
    const jumpDistance = params.phaseJumpDistance;
    const jumpDuration = 0.5; // Spring back duration
    
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: jumpTime,
        duration: jumpDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Random jump in X and Y
          { key: 'translateX', val: (Math.random() - 0.5) * jumpDistance * 2, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: (Math.random() - 0.5) * jumpDistance * 2, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper function to create scale oscillation effect
  const createScaleOscillationEffect = (
    targetId: string,
    effectId: string,
    period: number
  ): any => {
    const scaleAmount = params.scaleOscillationAmount * params.distortionIntensity;
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'scale', val: 1 - scaleAmount, prog: 0 },
          { key: 'scale', val: 1 + scaleAmount, prog: 0.5 },
          { key: 'scale', val: 1 - scaleAmount, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper function to create rotation wobble effect
  const createRotationWobbleEffect = (
    targetId: string,
    effectId: string,
    period: number
  ): any => {
    const rotationAmount = params.rotationWobbleAmount * params.distortionIntensity;
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'rotate', val: -rotationAmount, prog: 0 },
          { key: 'rotate', val: rotationAmount, prog: 0.33 },
          { key: 'rotate', val: -rotationAmount, prog: 0.67 },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper function to create opacity pulsing effect
  const createOpacityPulsingEffect = (
    targetId: string,
    effectId: string,
    isMainText: boolean,
    ghostIndex?: number
  ): any => {
    let minOpacity: number, maxOpacity: number;
    
    if (isMainText) {
      [minOpacity, maxOpacity] = params.mainTextOpacityRange;
    } else {
      // For ghosts, fade in and out independently
      const baseOpacity = params.ghostOpacities[ghostIndex ?? 0] ?? 0.2;
      minOpacity = baseOpacity * 0.5;
      maxOpacity = baseOpacity;
    }
    
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: minOpacity, prog: 0 },
          { key: 'opacity', val: maxOpacity, prog: 0.25 },
          { key: 'opacity', val: minOpacity, prog: 0.5 },
          { key: 'opacity', val: maxOpacity, prog: 0.75 },
          { key: 'opacity', val: minOpacity, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Create ghost layers
  const ghostLayers: RenderableComponentData[] = [];
  const actualPhaseCount = Math.min(params.phaseCount, params.ghostOpacities.length, params.chromaticColors.length);
  
  // Phase shift frequencies for interference patterns
  const phaseFrequencies = [0.5, 0.7, 1.1]; // seconds per cycle
  
  for (let i = 0; i < actualPhaseCount; i++) {
    const ghostId = `reality-warp-ghost-${i}`;
    const zIndex = i * 2; // 0, 2, 4, ...
    const opacity = params.ghostOpacities[i];
    const color = params.chromaticColors[i];
    const frequency = phaseFrequencies[i % phaseFrequencies.length];
    
    // Calculate phase shift amplitude
    const baseAmplitude = 10 * params.phaseShiftIntensity;
    const amplitudeX = baseAmplitude * (1 + i * 0.2);
    const amplitudeY = baseAmplitude * (1 + i * 0.3);
    
    // Create effects for this ghost layer
    const ghostEffects: any[] = [];
    
    // Phase shift X
    ghostEffects.push(createPhaseShiftEffect(ghostId, `${ghostId}-phase-x`, frequency, amplitudeX, 'x'));
    
    // Phase shift Y
    ghostEffects.push(createPhaseShiftEffect(ghostId, `${ghostId}-phase-y`, frequency * 1.2, amplitudeY, 'y'));
    
    // Scale oscillation (different period for each layer)
    ghostEffects.push(createScaleOscillationEffect(ghostId, `${ghostId}-scale`, frequency * 2));
    
    // Rotation wobble (different period for each layer)
    ghostEffects.push(createRotationWobbleEffect(ghostId, `${ghostId}-rotate`, frequency * 1.5));
    
    // Opacity pulsing
    ghostEffects.push(createOpacityPulsingEffect(ghostId, `${ghostId}-opacity`, false, i));
    
    // Phase jumps (occur at different times for each layer)
    const jumpInterval = params.phaseJumpFrequency;
    const numJumps = Math.floor(params.duration / jumpInterval);
    for (let j = 0; j < numJumps; j++) {
      const jumpTime = j * jumpInterval + (i * 0.3); // Offset each layer
      if (jumpTime < params.duration - 0.5) {
        ghostEffects.push(createPhaseJumpEffect(ghostId, `${ghostId}-jump-${j}`, jumpTime));
      }
    }
    
    ghostLayers.push({
      id: ghostId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: params.fontSize,
          fontWeight: params.fontWeight,
          color: color,
        },
        font: {
          family: params.fontFamily,
          weights: [params.fontWeight.toString()],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: ghostEffects,
    } as RenderableComponentData);
  }

  // Create main text layer
  const mainTextId = 'reality-warp-main-text';
  const mainTextEffects: any[] = [];
  
  // Main text also has phase shifts (subtle)
  mainTextEffects.push(createPhaseShiftEffect(mainTextId, `${mainTextId}-phase-x`, 0.8, 3 * params.phaseShiftIntensity, 'x'));
  mainTextEffects.push(createPhaseShiftEffect(mainTextId, `${mainTextId}-phase-y`, 1.0, 3 * params.phaseShiftIntensity, 'y'));
  
  // Main text distortions
  mainTextEffects.push(createScaleOscillationEffect(mainTextId, `${mainTextId}-scale`, 1.5));
  mainTextEffects.push(createRotationWobbleEffect(mainTextId, `${mainTextId}-rotate`, 2.0));
  
  // Main text opacity pulsing
  mainTextEffects.push(createOpacityPulsingEffect(mainTextId, `${mainTextId}-opacity`, true));
  
  // Main text phase jumps
  const jumpInterval = params.phaseJumpFrequency;
  const numJumps = Math.floor(params.duration / jumpInterval);
  for (let j = 0; j < numJumps; j++) {
    const jumpTime = j * jumpInterval;
    if (jumpTime < params.duration - 0.5) {
      mainTextEffects.push(createPhaseJumpEffect(mainTextId, `${mainTextId}-jump-${j}`, jumpTime));
    }
  }
  
  const mainTextLayer: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.textColor,
        textShadow: '0 0 20px rgba(100, 200, 255, 0.5)',
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight.toString()],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: mainTextEffects,
  } as RenderableComponentData;

  // Create wrapper containers with proper styling
  const styledGhostLayers = ghostLayers.map((ghost, index) => {
    const zIndex = index * 2;
    return {
      id: `${ghost.id}-container`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center pointer-events-none select-none',
          style: {
            zIndex,
            mixBlendMode: 'screen' as const,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [ghost],
    } as RenderableComponentData;
  });

  const mainTextContainer: RenderableComponentData = {
    id: `${mainTextId}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [mainTextLayer],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'reality-warp-container',
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
        duration: params.duration,
      },
    },
    childrenData: [
      ...styledGhostLayers,
      mainTextContainer,
    ] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'reality-warp-shake',
  title: 'Reality Distortion Warp Shake',
  description: 'A sci-fi inspired reality-distortion warping shake effect that makes text appear to phase in and out of existence, trembling between dimensions. Features probability cloud ghost images with chromatic aberration, periodic phase jumps where text teleports to new positions, and increasing instability. Perfect for sci-fi portals, supernatural contexts, and otherworldly atmospheres.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'effect',
    'sci-fi',
    'reality-distortion',
    'phase-shift',
    'glitch',
    'chromatic-aberration',
    'warp',
    'shake',
    'supernatural',
    'otherworldly',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'REALITY SHIFT',
    fontSize: 72,
    fontWeight: '700',
    textColor: '#FFFFFF',
    fontFamily: 'Inter',
    duration: 10,
    phaseCount: 3,
    phaseShiftIntensity: 1,
    phaseJumpFrequency: 2.5,
    phaseJumpDistance: 50,
    distortionIntensity: 1,
    scaleOscillationAmount: 0.05,
    rotationWobbleAmount: 5,
    ghostOpacities: [0.3, 0.2, 0.1],
    mainTextOpacityRange: [0.7, 1.0],
    chromaticColors: [
      'rgba(150, 0, 255, 0.6)',
      'rgba(255, 50, 50, 0.7)',
      'rgba(0, 100, 255, 0.8)',
    ],
  },
};

export const realityWarpShakePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
