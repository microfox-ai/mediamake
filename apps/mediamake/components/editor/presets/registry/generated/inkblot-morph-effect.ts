/**
 * InkBlotMorphEffect - Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 * This internal effect preset morphs components like spreading ink blots with organic, 
 * asymmetric distortion. It combines multiple filter animations (contrast shifts, blur 
 * variations, custom SVG turbulence filters) with asymmetric transform animations 
 * (translateX, translateY, rotate) to create an organic ink-spreading effect.
 *
 * The effect generates dynamic keyframes based on morphComplexity parameter, creating
 * a non-linear progression that mimics thick ink spreading unevenly on absorbent paper
 * with natural flow patterns and organic edges.
 *
 * Features:
 * - Dynamic keyframe generation based on morphComplexity (3-10 keyframes)
 * - Combined filter effects: contrast (100-150%), blur (0-4px), SVG turbulence
 * - Asymmetric transforms with sine-wave progressions for X/Y translations
 * - Oscillating rotation between -3deg and 3deg
 * - Custom cubic-bezier easing based on inkViscosity parameter
 * - Optional color matrix filter based on blotColor
 *
 * Use cases:
 * - Creating organic ink-blot morphing effects
 * - Adding natural, asymmetric distortion animations
 * - Building fluid, viscous transformation effects
 * - Simulating thick ink spreading on paper
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the ink blot morph effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to the parent component (seconds)'),
  effectDuration: z
    .number()
    .describe('Duration of the ink blot morph effect (seconds)'),
  morphComplexity: z
    .number()
    .min(3)
    .max(10)
    .default(6)
    .describe('Number of keyframes to generate for the morph animation (3-10)'),
  morphAsymmetry: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('How different X and Y translations are (0 = symmetric, 1 = maximum asymmetry)'),
  inkViscosity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe('Controls timing and easing - lower values create quick fluid motion, higher values create slow sticky motion'),
  blotColor: z
    .string()
    .optional()
    .describe('Optional color to apply via color matrix filter (CSS color string)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate custom cubic-bezier based on inkViscosity
  const generateEasingType = (viscosity: number): 'ease-in' | 'ease-out' | 'ease-in-out' => {
    if (viscosity < 0.3) return 'ease-out'; // Quick, fluid
    if (viscosity > 0.7) return 'ease-in'; // Slow, sticky
    return 'ease-in-out'; // Balanced
  };

  // Helper function: Generate sine-wave progression for asymmetric translations
  const generateSineProgression = (index: number, total: number, phase: number = 0): number => {
    const baseProgress = index / (total - 1);
    return Math.sin((baseProgress + phase) * Math.PI);
  };

  // Helper function: Generate turbulence SVG filter
  const generateTurbulenceFilter = (intensity: number, seed: number): string => {
    return `url(#turbulence-${seed})`;
  };

  // Helper function: Parse color to RGB for color matrix
  const parseColorToRGB = (color: string): [number, number, number] => {
    // Simple hex parser
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16) / 255;
        const g = parseInt(hex[1] + hex[1], 16) / 255;
        const b = parseInt(hex[2] + hex[2], 16) / 255;
        return [r, g, b];
      } else if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        return [r, g, b];
      }
    }
    // Default to black if parsing fails
    return [0, 0, 0];
  };

  const {
    targetIds,
    effectStart,
    effectDuration,
    morphComplexity,
    morphAsymmetry,
    inkViscosity,
    blotColor,
    effectId,
  } = params;

  const easingType = generateEasingType(inkViscosity);
  const keyframeCount = Math.floor(morphComplexity);

  // Generate filter animation ranges
  const filterRanges: Array<{ key: string; val: any; prog: number }> = [];

  // Contrast progression: 100% -> 150% -> 100%
  for (let i = 0; i < keyframeCount; i++) {
    const prog = i / (keyframeCount - 1);
    const contrastValue = prog < 0.5 
      ? 100 + (50 * (prog * 2)) // Rise to 150%
      : 150 - (50 * ((prog - 0.5) * 2)); // Fall back to 100%
    
    filterRanges.push({
      key: 'contrast',
      val: `${contrastValue}%`,
      prog,
    });
  }

  // Blur progression: 0 -> 4px with noise (sine wave variation)
  for (let i = 0; i < keyframeCount; i++) {
    const prog = i / (keyframeCount - 1);
    const sineVariation = generateSineProgression(i, keyframeCount, 0.25);
    const blurValue = 2 + (2 * Math.abs(sineVariation)); // Range 0-4px with noise
    
    filterRanges.push({
      key: 'blur',
      val: `${blurValue.toFixed(2)}px`,
      prog,
    });
  }

  // SVG turbulence filter (will be combined with other filters)
  const turbulenceSeed = Math.floor(Math.random() * 1000);
  const turbulenceIntensity = 0.02 + (morphAsymmetry * 0.03); // 0.02-0.05 based on asymmetry

  // Add color matrix if blotColor is provided
  if (blotColor) {
    const [r, g, b] = parseColorToRGB(blotColor);
    for (let i = 0; i < keyframeCount; i++) {
      const prog = i / (keyframeCount - 1);
      const intensity = generateSineProgression(i, keyframeCount, 0);
      const colorIntensity = 0.5 + (0.5 * Math.abs(intensity));
      
      // Color matrix filter to tint toward blotColor
      filterRanges.push({
        key: 'colorMatrix',
        val: `${r * colorIntensity} 0 0 0 0 0 ${g * colorIntensity} 0 0 0 0 0 ${b * colorIntensity} 0 0 0 0 0 1 0`,
        prog,
      });
    }
  }

  // Generate asymmetric transform ranges
  const transformRanges: Array<{ key: string; val: any; prog: number }> = [];

  // TranslateX: -5% to 5% with sine-wave progression
  for (let i = 0; i < keyframeCount; i++) {
    const prog = i / (keyframeCount - 1);
    const sineValue = generateSineProgression(i, keyframeCount, 0);
    const translateXValue = sineValue * 5; // -5% to 5%
    
    transformRanges.push({
      key: 'translateX',
      val: `${translateXValue.toFixed(2)}%`,
      prog,
    });
  }

  // TranslateY: -3% to 8% with different sine-wave progression (asymmetry)
  for (let i = 0; i < keyframeCount; i++) {
    const prog = i / (keyframeCount - 1);
    const phaseShift = morphAsymmetry * 0.5; // More asymmetry = more phase difference
    const sineValue = generateSineProgression(i, keyframeCount, phaseShift);
    const translateYValue = -3 + ((sineValue + 1) * 5.5); // -3% to 8%
    
    transformRanges.push({
      key: 'translateY',
      val: `${translateYValue.toFixed(2)}%`,
      prog,
    });
  }

  // Generate rotation ranges (separate effect for cleaner composition)
  const rotationRanges: Array<{ key: string; val: any; prog: number }> = [];

  // Rotate: oscillating between -3deg and 3deg
  for (let i = 0; i < keyframeCount; i++) {
    const prog = i / (keyframeCount - 1);
    const sineValue = generateSineProgression(i, keyframeCount, 0.1);
    const rotateValue = sineValue * 3; // -3deg to 3deg
    
    rotationRanges.push({
      key: 'rotate',
      val: `${rotateValue.toFixed(2)}deg`,
      prog,
    });
  }

  // Combine filter and transform ranges into one effect
  const combinedFilterTransformRanges = [...filterRanges, ...transformRanges];

  // Create the primary combined effect (filters + transforms)
  const combinedEffect: GenericEffectData = {
    type: easingType,
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: combinedFilterTransformRanges,
  };

  // Create the secondary rotation effect
  const rotationEffect: GenericEffectData = {
    type: easingType,
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: rotationRanges,
  };

  // Create effect nodes
  const effects = [
    {
      id: effectId ? `${effectId}-combined` : `inkblot-morph-combined-${targetIds.join('-')}`,
      componentId: 'generic',
      data: combinedEffect,
    },
    {
      id: effectId ? `${effectId}-rotation` : `inkblot-morph-rotation-${targetIds.join('-')}`,
      componentId: 'generic',
      data: rotationEffect,
    },
  ];

  // Add SVG turbulence definition as an HTMLBlockAtom
  const svgDefs = {
    id: effectId ? `${effectId}-svg-defs` : `inkblot-morph-svg-defs-${targetIds.join('-')}`,
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: `
        <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
          <defs>
            <filter id="turbulence-${turbulenceSeed}">
              <feTurbulence 
                type="fractalNoise" 
                baseFrequency="${turbulenceIntensity}" 
                numOctaves="3" 
                seed="${turbulenceSeed}"
              />
              <feDisplacementMap in="SourceGraphic" scale="20" />
            </filter>
          </defs>
        </svg>
      `,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        zIndex: -1,
      },
    },
    context: {
      timing: {
        start: effectStart,
        duration: effectDuration,
      },
    },
  };

  return {
    output: {
      childrenData: [
        {
          id: effectId ? `${effectId}-container` : 'inkblot-morph-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                overflow: 'hidden',
              },
            },
          },
          effects: effects,
          childrenData: [svgDefs],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'inkblot-morph-effect',
  title: 'InkBlotMorphEffect',
  description: 'Internal effect preset that morphs components like spreading ink blots with organic, asymmetric distortion. Combines filter animations (contrast shifts 100-150%, blur 0-4px with noise, custom SVG turbulence) with asymmetric transforms (translateX -5% to 5%, translateY -3% to 8%, rotate -3deg to 3deg using sine-wave progressions). Parameters include morphComplexity (keyframe count 3-10), morphAsymmetry (X/Y translation difference 0-1), inkViscosity (timing/easing 0.1-1), and optional blotColor (color matrix filter). Creates organic ink-spreading effect with natural flow patterns.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'filter', 'morph', 'organic', 'ink', 'distortion'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    effectStart: 0,
    effectDuration: 3,
    morphComplexity: 6,
    morphAsymmetry: 0.6,
    inkViscosity: 0.5,
  },
};

export const inkblotMorphEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};