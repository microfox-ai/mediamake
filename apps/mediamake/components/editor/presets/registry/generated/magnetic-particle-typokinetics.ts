/**
 * Magnetic Field Particle Typography Preset
 *
 * This preset creates a dynamic typokinetic effect inspired by magnetic field visualizations.
 * Text characters dissolve into iron filing-like particles that flow along invisible force field
 * lines before coalescing back into readable text. Perfect for futuristic sci-fi titles and
 * holographic reconstruction effects.
 *
 * Features:
 * - Iron filing-like particle dissolution and reconstruction
 * - Bezier path animations simulating magnetic field lines
 * - Smooth arcs and spirals with curved trajectories
 * - Particle clustering and separation based on simulated forces
 * - Subtle glow effects intensifying at cluster points
 * - 15-20 particles per character with unique paths
 * - Wave effect across words with 50ms stagger
 * - Performance optimized with CSS containment
 *
 * Use Cases:
 * - Futuristic title sequences
 * - Sci-fi holographic reconstructions
 * - Tech product reveals
 * - Cyberpunk-style branding
 * - Advanced typography animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with magnetic particle effect'),
  fontSize: z
    .number()
    .default(64)
    .describe('Font size in pixels for the text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family to use (Google Font name)'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700")'),
  textColor: z
    .string()
    .default('#00ffff')
    .describe('Color of the text and particles (CSS color)'),
  duration: z
    .number()
    .min(3)
    .max(10)
    .default(4)
    .describe('Total animation duration in seconds (minimum 3s)'),
  particlesPerCharacter: z
    .number()
    .min(10)
    .max(25)
    .default(18)
    .describe('Number of particles generated per character (15-20 recommended)'),
  wordStagger: z
    .number()
    .default(0.05)
    .describe('Time delay between word animations in seconds'),
  glowIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(6)
    .describe('Maximum glow intensity at cluster points (0-10)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    duration,
    particlesPerCharacter,
    wordStagger,
    glowIntensity,
  } = params;

  // Helper function to generate random magnetic path keyframes
  const generateMagneticPath = (seed: number) => {
    // Use seed to create deterministic "random" values
    const angle = (seed * 137.5) % 360; // Golden angle for distribution
    const distance = 60 + (seed % 40); // 60-100px range
    const arc = ((seed * 73) % 60) - 30; // -30 to +30 degree arc

    const radians = (angle * Math.PI) / 180;
    const arcRadians = (arc * Math.PI) / 180;

    // Calculate bezier path points
    const x1 = Math.cos(radians) * distance * 0.6;
    const y1 = Math.sin(radians) * distance * 0.6;
    const x2 = Math.cos(radians + arcRadians) * distance;
    const y2 = Math.sin(radians + arcRadians) * distance;
    const x3 = Math.cos(radians + arcRadians * 0.5) * distance * 0.6;
    const y3 = Math.sin(radians + arcRadians * 0.5) * distance * 0.6;

    return {
      keyframes: [
        { x: 0, y: 0, prog: 0 },
        { x: x1, y: y1, prog: 0.15 },
        { x: x2, y: y2, prog: 0.35 },
        { x: x3, y: y3, prog: 0.65 },
        { x: x1 * 0.5, y: y1 * 0.5, prog: 0.85 },
        { x: 0, y: 0, prog: 1 },
      ],
      rotation: [
        { val: 0, prog: 0 },
        { val: arc * 1.5, prog: 0.25 },
        { val: arc * 0.8, prog: 0.5 },
        { val: arc * 1.2, prog: 0.75 },
        { val: 0, prog: 1 },
      ],
    };
  };

  // Helper function to create particle component
  const createParticle = (
    wordIndex: number,
    charIndex: number,
    particleIndex: number,
    particleCount: number,
    wordStart: number,
  ) => {
    const particleId = `particle-w${wordIndex}-c${charIndex}-p${particleIndex}`;
    const seed = wordIndex * 1000 + charIndex * 100 + particleIndex;
    const path = generateMagneticPath(seed);

    // Stagger particle animation slightly within character
    const particleDelay = (particleIndex / particleCount) * 0.1;

    // Create trajectory effect
    const trajectoryRanges: any[] = [];
    path.keyframes.forEach((kf) => {
      trajectoryRanges.push(
        { key: 'translateX', val: kf.x, prog: kf.prog },
        { key: 'translateY', val: kf.y, prog: kf.prog },
      );
    });
    path.rotation.forEach((rot) => {
      trajectoryRanges.push({ key: 'rotate', val: rot.val, prog: rot.prog });
    });

    // Scale animation (0 -> 1 -> 0.3 -> 1)
    trajectoryRanges.push(
      { key: 'scale', val: 0, prog: 0 },
      { key: 'scale', val: 1, prog: 0.15 },
      { key: 'scale', val: 0.3, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
    );

    const trajectoryEffect = {
      id: `trajectory-${particleId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: wordStart + particleDelay,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [particleId],
        ranges: trajectoryRanges,
      },
    };

    // Glow effect (intensifies at cluster points: 35% and 65%)
    // Only apply to every 3rd particle for performance
    const shouldGlow = particleIndex % 3 === 0;
    const glowEffect = shouldGlow
      ? {
          id: `glow-${particleId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: wordStart + particleDelay,
            duration: duration,
            mode: 'provider' as const,
            targetIds: [particleId],
            ranges: [
              {
                key: 'filter',
                val: 'drop-shadow(0 0 0px currentColor)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0 0 1px currentColor)',
                prog: 0.2,
              },
              {
                key: 'filter',
                val: `drop-shadow(0 0 ${glowIntensity}px currentColor)`,
                prog: 0.35,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0 0 2px currentColor)',
                prog: 0.5,
              },
              {
                key: 'filter',
                val: `drop-shadow(0 0 ${glowIntensity}px currentColor)`,
                prog: 0.65,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0 0 1px currentColor)',
                prog: 0.8,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0 0 0px currentColor)',
                prog: 1,
              },
            ],
          },
        }
      : null;

    const particleEffects = [trajectoryEffect];
    if (glowEffect) particleEffects.push(glowEffect);

    return {
      id: particleId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: '50%',
            top: '50%',
            width: '2px',
            height: '8px',
            background: 'linear-gradient(to bottom, currentColor, transparent)',
            borderRadius: '9999px',
            color: textColor,
            contain: 'paint' as any, // CSS containment for performance
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: particleEffects,
    } as RenderableComponentData;
  };

  // Split text into words
  const words = text.trim().split(/\s+/);

  // Create word components
  const wordComponents: RenderableComponentData[] = words.map(
    (word, wordIndex) => {
      const wordId = `word-${wordIndex}`;
      const textAtomId = `text-${wordIndex}`;
      const particleContainerId = `particles-${wordIndex}`;

      const wordStart = wordIndex * wordStagger;

      // Calculate character count for this word
      const charCount = word.length;
      const totalParticles = Math.min(
        charCount * particlesPerCharacter,
        charCount * 20,
      ); // Cap at 20 per char
      const particlesPerChar = Math.floor(totalParticles / charCount);

      // Generate particles for each character
      const particles: RenderableComponentData[] = [];
      for (let charIndex = 0; charIndex < charCount; charIndex++) {
        for (let p = 0; p < particlesPerChar; p++) {
          particles.push(
            createParticle(wordIndex, charIndex, p, particlesPerChar, wordStart),
          );
        }
      }

      // Text opacity effect (1 -> 0 -> 0 -> 1)
      const textOpacityEffect = {
        id: `text-opacity-${wordIndex}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: wordStart,
          duration: duration,
          mode: 'provider' as const,
          targetIds: [textAtomId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 0.7 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      };

      return {
        id: wordId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
            style: {
              marginRight: '0.5em',
            },
          },
        },
        context: {
          timing: {
            start: wordStart,
            duration: duration,
          },
        },
        effects: [textOpacityEffect],
        childrenData: [
          // Original text
          {
            id: textAtomId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: fontWeight,
                color: textColor,
                textTransform: 'uppercase' as any,
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
          } as RenderableComponentData,
          // Particle container
          {
            id: particleContainerId,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0',
                style: {
                  pointerEvents: 'none' as any,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            childrenData: particles,
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'magnetic-particle-typography-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + words.length * wordStagger,
      },
    },
    childrenData: [
      {
        id: 'words-wrapper',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap gap-2 justify-center items-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration + words.length * wordStagger,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData,
    ],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'magneticParticleTypokinetics',
  title: 'Magnetic Field Particle Typography',
  description:
    'Typokinetic preset where text characters dissolve into iron filing-like particles flowing along magnetic field lines. Particles move in bezier curved trajectories with glow effects, clustering and separating based on simulated magnetic forces before coalescing back into readable text. Perfect for sci-fi holographic reconstruction titles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typokinetics',
    'particles',
    'magnetic',
    'sci-fi',
    'holographic',
    'futuristic',
    'bezier',
    'curved-paths',
    'glow',
    'kinetic',
    'advanced',
  ],
  defaultInputParams: {
    text: 'MAGNETIC FIELD',
    fontSize: 64,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#00ffff',
    duration: 4,
    particlesPerCharacter: 18,
    wordStagger: 0.05,
    glowIntensity: 6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const magneticParticleTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
