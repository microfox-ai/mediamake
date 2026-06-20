/**
 * Impact-Reactive Slam Shake Preset
 *
 * A physics-based text shake effect triggered by imaginary impacts with violent
 * trembling, directional shaking, compression/rebound, and debris-like behavior.
 *
 * Features:
 * - **Impact-driven displacement**: Initial dramatic displacement (20-30px) based on angle
 * - **Directional shaking**: X-axis dominant for horizontal hits, Y-axis for vertical
 * - **Compression effect**: Text briefly squashes (scaleY: 0.8-1.2) on impact then rebounds
 * - **Oscillation decay**: 5-7 bounces reducing amplitude by 40% each cycle
 * - **Letter independence**: Individual letters rotate/shift with varying delays (0-0.1s)
 * - **Spring physics easing**: Realistic energy transfer and dissipation
 * - **Motion blur**: Subtle blur during maximum velocity moments
 * - **Configurable parameters**: Impact angle (0-360), force (0-1), decay rate
 *
 * Use cases:
 * - Action movie titles with explosion shockwaves
 * - Dramatic text reveals with physical impact
 * - Bass-reactive audio visualizations
 * - High-energy content transitions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameters schema with comprehensive descriptions
const presetParams = z.object({
  text: z.string().describe('Text content to display with impact shake effect'),
  
  // Impact configuration
  impactAngle: z
    .number()
    .min(0)
    .max(360)
    .default(45)
    .describe('Impact angle in degrees (0=right, 90=down, 180=left, 270=up)'),
  
  impactForce: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Impact force multiplier (0=gentle, 1=maximum)'),
  
  decayRate: z
    .number()
    .min(0.3)
    .max(0.8)
    .default(0.6)
    .describe('Amplitude decay per bounce (0.6=40% reduction each cycle)'),
  
  // Timing
  impactTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Time when impact occurs (seconds, relative to parent)'),
  
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the shake effect sequence (seconds)'),
  
  // Typography
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  
  fontWeight: z
    .enum(['400', '700', '900'])
    .default('900')
    .describe('Font weight (900 recommended for impact)'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or CSS color)'),
  
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight (e.g., "Impact:900", "BebasNeue")'),
  
  // Effect tuning
  letterDelayVariation: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.1)
    .describe('Random delay variation per letter in seconds (0-0.2s)'),
  
  letterIntensityVariation: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1.2)
    .describe('Intensity multiplier variation per letter (0.8-1.2x)'),
  
  enableMotionBlur: z
    .boolean()
    .default(true)
    .describe('Enable motion blur during peak velocity'),
  
  // Visual enhancements
  textShadow: z
    .boolean()
    .default(true)
    .describe('Enable dramatic text shadow for depth'),
  
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color behind text'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    impactAngle,
    impactForce,
    decayRate,
    impactTime,
    duration,
    fontSize,
    fontWeight,
    textColor,
    font,
    letterDelayVariation,
    letterIntensityVariation,
    enableMotionBlur,
    textShadow,
    backgroundColor,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = font || 'Impact';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = parseInt(fontWeight, 10);
  }

  // Helper: Calculate directional displacement based on angle
  const calculateDisplacement = (angle: number, force: number) => {
    const radians = (angle * Math.PI) / 180;
    const maxDisplacement = 30 * force; // 20-30px scaled by force
    
    return {
      x: Math.cos(radians) * maxDisplacement,
      y: Math.sin(radians) * maxDisplacement,
      // Determine axis dominance
      xDominant: Math.abs(Math.cos(radians)) > Math.abs(Math.sin(radians)),
    };
  };

  // Helper: Generate oscillation keyframes with decay
  const generateOscillations = (
    initialDisplacement: { x: number; y: number; xDominant: boolean },
    bounceCount: number = 6,
    decay: number = 0.6,
  ) => {
    const keyframes: Array<{
      prog: number;
      translateX: number;
      translateY: number;
      scaleY: number;
      rotate: number;
    }> = [];

    // Initial impact (prog 0)
    keyframes.push({
      prog: 0,
      translateX: 0,
      translateY: 0,
      scaleY: 1,
      rotate: 0,
    });

    // Impact hit (prog 0.05)
    keyframes.push({
      prog: 0.05,
      translateX: initialDisplacement.x,
      translateY: initialDisplacement.y,
      scaleY: 0.8, // Compression
      rotate: initialDisplacement.xDominant ? 5 : -5,
    });

    // Oscillations with decay
    for (let i = 0; i < bounceCount; i++) {
      const progress = 0.05 + ((i + 1) / bounceCount) * 0.95;
      const amplitude = Math.pow(decay, i + 1);
      
      // Alternate direction with decay
      const direction = i % 2 === 0 ? -1 : 1;
      
      keyframes.push({
        prog: progress,
        translateX: initialDisplacement.x * amplitude * direction,
        translateY: initialDisplacement.y * amplitude * direction,
        scaleY: 1 + (0.2 * amplitude * (i % 2 === 0 ? 1 : -1)), // Bounce between 0.8-1.2
        rotate: (15 * amplitude * direction) * (initialDisplacement.xDominant ? 1 : -1),
      });
    }

    // Final settle (prog 1)
    keyframes.push({
      prog: 1,
      translateX: 0,
      translateY: 0,
      scaleY: 1,
      rotate: 0,
    });

    return keyframes;
  };

  // Helper: Generate letter-specific effects with independence
  const createLetterEffect = (
    letterId: string,
    letterIndex: number,
    totalLetters: number,
  ) => {
    const displacement = calculateDisplacement(impactAngle, impactForce);
    const oscillations = generateOscillations(displacement, 6, decayRate);

    // Random delay and intensity variation per letter
    const randomDelay = Math.random() * letterDelayVariation;
    const intensityMultiplier = 
      0.8 + Math.random() * (letterIntensityVariation - 0.8);

    // Build effect ranges
    const ranges: Array<{ key: string; val: any; prog: number }> = [];

    oscillations.forEach((kf) => {
      ranges.push(
        { key: 'translateX', val: kf.translateX * intensityMultiplier, prog: kf.prog },
        { key: 'translateY', val: kf.translateY * intensityMultiplier, prog: kf.prog },
        { key: 'scaleY', val: kf.scaleY, prog: kf.prog },
        { key: 'rotate', val: kf.rotate * intensityMultiplier, prog: kf.prog },
      );
    });

    // Motion blur during peak velocity (prog 0.05-0.3)
    if (enableMotionBlur) {
      ranges.push(
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: `blur(${4 * impactForce}px)`, prog: 0.05 },
        { key: 'filter', val: `blur(${2 * impactForce}px)`, prog: 0.15 },
        { key: 'filter', val: 'blur(0px)', prog: 0.3 },
      );
    }

    return {
      id: `letter-shake-effect-${letterId}`,
      componentId: 'generic' as const,
      data: {
        type: 'spring' as const,
        start: impactTime + randomDelay,
        duration: duration - randomDelay,
        mode: 'provider' as const,
        targetIds: [letterId],
        ranges,
      },
    };
  };

  // Split text into letters
  const letters = text.split('');
  const letterComponents: RenderableComponentData[] = letters.map((letter, index) => {
    const letterId = `impact-shake-letter-${index}`;

    const letterEffect = createLetterEffect(letterId, index, letters.length);

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom' as const,
      data: {
        text: letter === ' ' ? '\u00A0' : letter, // Preserve spaces
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          fontWeight: fontStyle.fontWeight,
          display: 'inline-block',
          transformOrigin: 'center bottom',
          ...(textShadow
            ? { textShadow: '0 8px 24px rgba(0,0,0,0.6)' }
            : {}),
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight?.toString() || fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration + impactTime,
        },
      },
      effects: [letterEffect],
    } as RenderableComponentData;
  });

  // Root container for letter layout
  const rootContainer: RenderableComponentData = {
    id: 'impact-shake-root',
    type: 'layout' as const,
    componentId: 'BaseLayout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          position: 'relative' as const,
          ...(backgroundColor ? { backgroundColor } : {}),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + impactTime,
      },
    },
    childrenData: [
      {
        id: 'letter-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout' as const,
        data: {
          containerProps: {
            className: 'flex flex-row items-center justify-center transform-gpu',
            style: {
              gap: '0px',
              transformOrigin: 'center center',
            },
          },
          repeatChildrenProps: {
            className: 'inline-block transform-gpu',
            style: {
              transformOrigin: 'center bottom',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration + impactTime,
          },
        },
        childrenData: letterComponents,
      } as RenderableComponentData,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'impactReactiveSlamShake',
  title: 'Impact-Reactive Slam Shake',
  description:
    'A violent, physics-based text shake effect triggered by imaginary impacts. Features directional shaking based on impact angle (X/Y axis dominant), compression/rebound effects (scaleY 0.8-1.2), decreasing oscillations with 40% decay per bounce, and debris-like independent letter motion with rotation. Includes spring physics easing, motion blur at peak velocity, and configurable parameters for angle (0-360), force (0-1), and decay rate. Perfect for action movie titles, dramatic reveals, and bass-reactive audio visualizations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'shake',
    'impact',
    'physics',
    'motion',
    'dramatic',
    'action',
    'energy',
    'compression',
    'oscillation',
    'spring',
    'directional',
    'decay',
    'letter-animation',
    'motion-blur',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'IMPACT',
    impactAngle: 45,
    impactForce: 0.8,
    decayRate: 0.6,
    impactTime: 0,
    duration: 3,
    fontSize: 72,
    fontWeight: '900',
    textColor: '#ffffff',
    font: 'Impact:900',
    letterDelayVariation: 0.1,
    letterIntensityVariation: 1.2,
    enableMotionBlur: true,
    textShadow: true,
  },
};

// Export preset
export const impactReactiveSlamShakePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
