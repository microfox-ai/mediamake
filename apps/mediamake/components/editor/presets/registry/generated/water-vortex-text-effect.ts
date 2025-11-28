/**
 * Water Vortex Text Effect Preset
 *
 * A mesmerizing water vortex text animation where letters spiral and stretch as if being
 * pulled into a whirlpool. Features:
 * 
 * - Continuous spiraling motion with varying orbital radii per letter
 * - Dynamic pull phases with spring physics easing for realistic pullback
 * - Stretch distortion toward vortex center using skewX transforms
 * - Subtle rotation of entire text block to enhance whirlpool effect
 * - Alternating calm periods (2s, small radius) and pull periods (0.5s, large radius)
 * - Motion blur during rapid movement
 * - Each letter follows its own orbital path creating complex swirling patterns
 * 
 * Use cases:
 * - Creating dynamic water/whirlpool text effects
 * - Flush-style transitions for video editing
 * - Mesmerizing text animations for intros/outros
 * - Abstract visual effects for creative content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text to display with vortex effect'),
  
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(72)
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter:700" for weight 700)'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(10)
    .describe('Total duration of the effect in seconds'),
  
  vortexIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Overall vortex intensity multiplier (affects all motion)'),
  
  orbitalRadiusBase: z
    .number()
    .min(10)
    .max(200)
    .default(50)
    .describe('Base orbital radius in pixels for letter spiraling'),
  
  pullIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Intensity of pull phases (multiplier for orbital radius)'),
  
  rotationSpeed: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Speed of overall text block rotation (0 = no rotation)'),
  
  skewIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Maximum skewX distortion in degrees during pull phases'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    textColor,
    duration,
    vortexIntensity,
    orbitalRadiusBase,
    pullIntensity,
    rotationSpeed,
    skewIntensity,
  } = params;

  // Helper: Parse font string (format: "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const family = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const weight = fontString.includes(':')
      ? fontString.split(':')[1]
      : '400';
    return { family, weight };
  };

  const { family: fontFamilyName, weight: fontWeight } = parseFontString(fontFamily);

  // Helper: Calculate vortex phases (calm and pull periods)
  const calculateVortexPhases = (totalDuration: number) => {
    const phases: Array<{ start: number; duration: number; isPull: boolean; radiusMultiplier: number }> = [];
    let currentTime = 0;
    
    // Alternate between calm (2s) and pull (0.5s) periods
    const calmDuration = 2;
    const pullDuration = 0.5;
    
    while (currentTime < totalDuration) {
      // Calm period
      if (currentTime + calmDuration <= totalDuration) {
        phases.push({
          start: currentTime,
          duration: calmDuration,
          isPull: false,
          radiusMultiplier: 1,
        });
        currentTime += calmDuration;
      } else {
        // Last partial calm period
        const remaining = totalDuration - currentTime;
        if (remaining > 0) {
          phases.push({
            start: currentTime,
            duration: remaining,
            isPull: false,
            radiusMultiplier: 1,
          });
        }
        break;
      }
      
      // Pull period
      if (currentTime + pullDuration <= totalDuration) {
        phases.push({
          start: currentTime,
          duration: pullDuration,
          isPull: true,
          radiusMultiplier: pullIntensity,
        });
        currentTime += pullDuration;
      } else {
        // Last partial pull period
        const remaining = totalDuration - currentTime;
        if (remaining > 0) {
          phases.push({
            start: currentTime,
            duration: remaining,
            isPull: true,
            radiusMultiplier: pullIntensity,
          });
        }
        break;
      }
    }
    
    return phases;
  };

  const vortexPhases = calculateVortexPhases(duration);

  // Split text into letters
  const letters = text.split('');

  // Create letter atoms with vortex effects
  const letterComponents: RenderableComponentData[] = letters.map((letter, index) => {
    const letterId = `vortex-letter-${index}`;
    
    // Calculate unique orbital properties per letter
    const letterIndex = index;
    const totalLetters = letters.length;
    const normalizedIndex = letterIndex / Math.max(totalLetters - 1, 1);
    
    // Orbital radius varies by index (inner to outer letters)
    const orbitalRadius = orbitalRadiusBase * (0.5 + normalizedIndex * 0.5) * vortexIntensity;
    
    // Rotation speed varies by index (faster for outer letters)
    const rotationSpeedMultiplier = 0.8 + normalizedIndex * 0.4;
    
    // Angular offset for initial position
    const initialAngle = (letterIndex / totalLetters) * 360;

    // Create effects for each vortex phase
    const letterEffects: any[] = [];

    vortexPhases.forEach((phase, phaseIndex) => {
      const { start, duration: phaseDuration, isPull, radiusMultiplier } = phase;
      
      // Calculate phase-specific orbital radius
      const phaseRadius = orbitalRadius * radiusMultiplier;
      
      // Rotation: 0deg to 360deg during phase
      const rotationStart = (phaseIndex * 360) % 360;
      const rotationEnd = ((phaseIndex + 1) * 360) % 360;
      
      // Easing type based on phase
      const easingType = isPull ? 'spring' : 'ease-in-out';
      
      // Calculate orbital motion using sine/cosine
      const numKeyframes = isPull ? 5 : 3; // More keyframes for pull phases
      const ranges: any[] = [];
      
      for (let k = 0; k <= numKeyframes; k++) {
        const prog = k / numKeyframes;
        const angle = initialAngle + rotationStart + (rotationEnd - rotationStart) * prog;
        const angleRad = (angle * Math.PI) / 180;
        
        // Orbital position
        const x = Math.cos(angleRad) * phaseRadius * rotationSpeedMultiplier;
        const y = Math.sin(angleRad) * phaseRadius * rotationSpeedMultiplier;
        
        // Scale during pull phases (1 to 0.8)
        const scale = isPull ? 1 - 0.2 * Math.sin(prog * Math.PI) : 1;
        
        // Skew based on angular position
        const skew = Math.sin(angleRad * 2) * skewIntensity * (isPull ? 1 : 0.3);
        
        // Motion blur during rapid movement (pull phases)
        const blur = isPull ? 0.5 + 0.5 * Math.sin(prog * Math.PI) : 0;
        
        ranges.push(
          { key: 'translateX', val: x, prog },
          { key: 'translateY', val: y, prog },
          { key: 'scale', val: scale, prog },
          { key: 'skewX', val: skew, prog },
          { key: 'filter', val: `blur(${blur}px)`, prog },
        );
      }
      
      letterEffects.push({
        id: `vortex-effect-${letterId}-phase-${phaseIndex}`,
        componentId: 'generic',
        data: {
          type: easingType,
          start: start,
          duration: phaseDuration,
          mode: 'provider',
          targetIds: [letterId],
          ranges,
        } as GenericEffectData,
      });
    });

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter,
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          fontWeight: fontWeight,
          position: 'absolute',
          transformOrigin: 'center center',
        },
        font: {
          family: fontFamilyName,
          weights: [fontWeight],
        },
        className: 'transform-gpu will-change-transform',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: letterEffects,
    } as RenderableComponentData;
  });

  // Create container with overall rotation effect
  const containerRotationEffects: any[] = [];
  
  if (rotationSpeed > 0) {
    const totalRotation = rotationSpeed * 360 * (duration / 10); // Scale rotation to duration
    containerRotationEffects.push({
      id: 'container-rotation',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: ['vortex-text-wrapper'],
        ranges: [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: totalRotation, prog: 1 },
        ],
      } as GenericEffectData,
    });
  }

  const textWrapper: RenderableComponentData = {
    id: 'vortex-text-wrapper',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative transform-gpu will-change-transform',
        style: {
          transformOrigin: 'center center',
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: letterComponents,
    effects: containerRotationEffects,
  };

  const rootContainer: RenderableComponentData = {
    id: 'water-vortex-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center w-full h-full',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textWrapper],
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
  id: 'water-vortex-text-effect',
  title: 'Water Vortex Text Effect',
  description:
    'A mesmerizing water vortex text animation where letters spiral and stretch as if being pulled into a whirlpool. Features continuous spiraling motion with varying orbital radii and speeds per letter, stretch distortion toward vortex center during pull phases, subtle overall rotation, and alternating calm/pull periods with spring physics for realistic pullback.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'vortex',
    'whirlpool',
    'spiral',
    'water',
    'flush',
    'kinetic',
    'motion',
    'distortion',
    'rotation',
    'dynamic',
  ],
  defaultInputParams: {
    text: 'VORTEX',
    fontSize: 72,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    duration: 10,
    vortexIntensity: 1,
    orbitalRadiusBase: 50,
    pullIntensity: 1.5,
    rotationSpeed: 1,
    skewIntensity: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const waterVortexTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
