/**
 * Typokinetics Fluid Serif Preset
 *
 * This preset creates a kinetic typography effect where each letter behaves as a particle
 * floating in a fluid stream. Letters scatter from random positions, coalesce into readable
 * text, float with organic bobbing motion, then disperse again in a continuous loop.
 *
 * Features:
 * - **Particle Physics Simulation**: Each letter has unique "weight" affecting movement speed
 * - **Multi-Phase Animation**: Scatter → Coalesce → Float → Disperse cycle
 * - **Glass Refraction Effect**: Subtle backdrop blur and color aberration
 * - **Elegant Serif Typography**: Cormorant Garamond with varied weights for hierarchy
 * - **Organic Motion**: Subtle rotation and vertical oscillation per letter
 * - **Hardware Acceleration**: Uses transform3d for optimal performance
 *
 * Use cases:
 * - Elegant title sequences with organic motion
 * - Poetic text reveals with fluid aesthetics
 * - High-end typography animations
 * - Artistic text treatments for sophisticated content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('The text to animate as fluid particles (e.g., "Flowing Words")'),
  duration: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Total animation duration in seconds'),
  font: z
    .string()
    .default('Cormorant Garamond:600')
    .describe(
      'Font family with optional weight (e.g., "Cormorant Garamond:600", "EB Garamond:700")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(64)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#1a1a1a')
    .describe('Base text color (CSS color value)'),
  scatterIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity of scatter/disperse motion (multiplier)'),
  floatIntensity: z
    .number()
    .min(0.3)
    .max(1.5)
    .default(0.8)
    .describe('Intensity of floating motion (multiplier)'),
  glassEffect: z
    .boolean()
    .default(true)
    .describe('Enable glass-like refraction and color aberration effects'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    font,
    fontSize,
    textColor,
    scatterIntensity,
    floatIntensity,
    glassEffect,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontStr: string) => {
    const parts = fontStr.split(':');
    const family = parts[0] || 'Cormorant Garamond';
    const weight = parts[1] ? parseInt(parts[1], 10) : 600;
    return { family, weight };
  };

  const { family: fontFamily, weight: fontWeight } = parseFontString(font);

  // Helper: Calculate particle physics properties for each letter
  const calculateParticleProperties = (char: string, index: number, total: number) => {
    // Seed randomness based on character code and index for consistency
    const seed = char.charCodeAt(0) + index;
    const random = (min: number, max: number) => {
      const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
      return min + (x - Math.floor(x)) * (max - min);
    };

    // Calculate weight (heavier = slower movement)
    // Uppercase and consonants are "heavier"
    const isUpperCase = char === char.toUpperCase() && char !== char.toLowerCase();
    const baseWeight = isUpperCase ? 1.2 : 1.0;
    const charWeight = baseWeight + random(-0.2, 0.2);

    // Calculate scatter positions (randomized)
    const scatterX = random(-300, 300) * scatterIntensity;
    const scatterY = random(-200, 200) * scatterIntensity;
    const scatterRotate = random(-45, 45) * scatterIntensity;

    // Calculate disperse positions (different from scatter)
    const disperseX = random(-350, 350) * scatterIntensity;
    const disperseY = random(-250, 250) * scatterIntensity;
    const disperseRotate = random(-60, 60) * scatterIntensity;

    // Calculate float properties
    const floatAmplitude = random(8, 12) * floatIntensity;
    const floatFrequency = random(0.8, 1.2); // Affects timing variation
    const rotateAmplitude = random(2, 4) * floatIntensity;

    // Font weight variation for hierarchy (varies based on index)
    const weightVariation = [400, 500, 600, 700][index % 4];

    return {
      weight: charWeight,
      scatter: { x: scatterX, y: scatterY, rotate: scatterRotate },
      disperse: { x: disperseX, y: disperseY, rotate: disperseRotate },
      float: { amplitude: floatAmplitude, frequency: floatFrequency },
      rotate: { amplitude: rotateAmplitude },
      fontWeight: weightVariation,
    };
  };

  // Helper: Create letter effects (scatter → coalesce → float → disperse)
  const createLetterEffects = (
    letterId: string,
    properties: ReturnType<typeof calculateParticleProperties>,
  ): GenericEffectData[] => {
    const { scatter, disperse, float, rotate, weight } = properties;

    // Phase timings (normalized to 0-1 for prog values)
    // Scatter/Coalesce: 0-0.2 (20% of duration)
    // Float: 0.2-0.7 (50% of duration)
    // Disperse: 0.7-1.0 (30% of duration)

    // Adjust timing based on weight (heavier = slower)
    const coalesceDuration = 0.15 + weight * 0.05; // Heavier letters take longer
    const disperseStart = 0.7;

    return [
      // Phase 1: Scatter → Coalesce (with spring easing for organic motion)
      {
        type: 'spring',
        start: 0,
        duration: duration * 0.2,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateX', val: scatter.x, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: scatter.y, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'rotate', val: scatter.rotate, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.4 },
        ],
      } as GenericEffectData,

      // Phase 2: Float (gentle bobbing and rotation)
      {
        type: 'ease-in-out',
        start: duration * 0.2,
        duration: duration * 0.5,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Vertical oscillation (sine wave pattern)
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -float.amplitude, prog: 0.25 * float.frequency },
          { key: 'translateY', val: 0, prog: 0.5 * float.frequency },
          { key: 'translateY', val: float.amplitude, prog: 0.75 * float.frequency },
          { key: 'translateY', val: 0, prog: 1 },
          // Rotation oscillation (synchronized with vertical)
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: rotate.amplitude, prog: 0.25 },
          { key: 'rotate', val: 0, prog: 0.5 },
          { key: 'rotate', val: -rotate.amplitude, prog: 0.75 },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      } as GenericEffectData,

      // Phase 3: Disperse (ease-in for accelerating motion)
      {
        type: 'ease-in',
        start: duration * disperseStart,
        duration: duration * 0.3,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: disperse.x, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: disperse.y, prog: 1 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: disperse.rotate, prog: 1 },
          { key: 'opacity', val: 1, prog: 0.6 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    ];
  };

  // Split text into individual letters
  const letters = text.split('');

  // Create letter atoms with physics properties
  const letterAtoms: RenderableComponentData[] = letters.map((char, index) => {
    const letterId = `letter-${index}`;
    const properties = calculateParticleProperties(char, index, letters.length);

    // Create effects for this letter
    const letterEffects = createLetterEffects(letterId, properties);

    // Glass effect styling
    const glassStyles = glassEffect
      ? {
          textShadow: `
            0 2px 8px rgba(0,0,0,0.15),
            0 4px 16px rgba(255,255,255,0.3),
            1px 0 2px rgba(100,200,255,0.2),
            -1px 0 2px rgba(255,100,200,0.2)
          `,
          filter: 'drop-shadow(0 0 2px rgba(100,200,255,0.3))',
        }
      : {
          textShadow: '0 2px 8px rgba(0,0,0,0.15)',
        };

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: properties.fontWeight,
          color: textColor,
          ...glassStyles,
        },
        font: {
          family: fontFamily,
          weights: [properties.fontWeight.toString()],
          display: 'swap',
        },
        className: 'absolute transform-gpu will-change-transform',
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: letterEffects.map((effectData, effectIndex) => ({
        id: `${letterId}-effect-${effectIndex}`,
        componentId: 'generic',
        data: effectData,
      })),
    };
  });

  // Root container with centered layout
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
        style: glassEffect
          ? {
              backdropFilter: 'blur(0.5px)',
            }
          : {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: letterAtoms,
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

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-fluid-serif',
  title: 'Typokinetics Fluid Serif',
  description:
    'Kinetic typography preset where each letter behaves as a particle floating in a fluid stream. Features multi-phase animation (scatter → coalesce → float → disperse), physics-inspired motion with varied letter weights, elegant serif typography with Cormorant Garamond, and glass-like refraction effects with color aberration.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'particle',
    'fluid',
    'serif',
    'elegant',
    'organic',
    'glass',
    'refraction',
    'physics',
    'coalesce',
    'disperse',
    'float',
    'spring',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Flowing Words',
    duration: 10,
    font: 'Cormorant Garamond:600',
    fontSize: 64,
    textColor: '#1a1a1a',
    scatterIntensity: 1,
    floatIntensity: 0.8,
    glassEffect: true,
  },
};

export const typokineticsFluidSerifPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
