/**
 * Wave-Form Typokinetics Preset
 *
 * This preset creates a dynamic wave-based typography animation where letters ride on a sine wave,
 * each at a different phase of the wave cycle. Letters start below the baseline, rise up above it,
 * then settle into position as the wave passes through the text line.
 *
 * Features:
 * - **Wave Motion**: Letters follow sine wave pattern with phase offset per letter
 * - **Stretch Effect**: Letters stretch vertically and compress horizontally at wave peak
 * - **Foam Particles**: Spray effect particles on touchdown with outward motion
 * - **Floating Effect**: Continuous gentle undulation after landing
 * - **Serene Aesthetic**: Aquatic, dreamy feeling perfect for fluid titles
 *
 * Technical Implementation:
 * - Wave motion using translateY following sine curve
 * - Stretch/compression using scaleY/scaleX synchronized with wave peak
 * - Particle effects using HTMLBlockAtom circles with spray animation
 * - Post-landing float using subtle translateY oscillation
 *
 * Use cases:
 * - Creating fluid, dreamy title animations
 * - Building serene, aquatic-themed text effects
 * - Adding wave-based motion typography
 * - Creating elegant floating text effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z.string().describe('Text to display with wave animation'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total animation duration in seconds'),
  waveAmplitude: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .describe('Wave amplitude (vertical movement range in pixels)'),
  wavePhaseOffset: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Phase offset between letters (controls wave spread)'),
  stretchIntensity: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.15)
    .describe('Maximum vertical stretch at wave peak'),
  foamParticleCount: z
    .number()
    .min(0)
    .max(6)
    .default(4)
    .describe('Number of foam particles per letter'),
  floatAmplitude: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Amplitude of post-landing float effect in pixels'),
  floatDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of float cycle in seconds'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    duration,
    waveAmplitude,
    wavePhaseOffset,
    stretchIntensity,
    foamParticleCount,
    floatAmplitude,
    floatDuration,
  } = params;

  // Helper: Create foam particles for a letter
  const createFoamParticles = (letterIndex: number) => {
    const particles: RenderableComponentData[] = [];
    const particleCount = Math.min(foamParticleCount, 6);

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 20 + Math.random() * 10;
      const translateX = Math.cos(angle) * distance;
      const translateY = Math.sin(angle) * distance;
      const size = 3 + Math.random() * 2;

      particles.push({
        id: `foam-particle-${letterIndex}-${i}`,
        componentId: 'HTMLBlockAtom',
        type: 'atom' as const,
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: rgba(255, 255, 255, ${0.5 + Math.random() * 0.3});"></div>`,
          className: 'absolute',
          style: {
            left: '50%',
            top: '100%',
            transform: 'translate(-50%, -50%)',
          },
        },
        effects: [
          {
            id: `foam-effect-${letterIndex}-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.6,
              mode: 'provider',
              targetIds: [`foam-particle-${letterIndex}-${i}`],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: translateX, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: translateY, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
        context: {
          timing: {
            start: 1 + letterIndex * 0.1,
            duration: 0.6,
          },
        },
      });
    }

    return particles;
  };

  // Helper: Create wave effect for a letter
  const createWaveEffect = (
    letterId: string,
    letterIndex: number,
  ): GenericEffectData => {
    const waveDuration = 2;
    const phase = letterIndex * wavePhaseOffset;

    return {
      type: 'ease-in-out',
      start: 0,
      duration: waveDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Wave motion using sine curve approximation
        { key: 'translateY', val: waveAmplitude, prog: 0 },
        { key: 'translateY', val: -waveAmplitude, prog: 0.25 },
        { key: 'translateY', val: 0, prog: 0.5 },
        { key: 'translateY', val: -waveAmplitude / 2, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };
  };

  // Helper: Create stretch effect for a letter
  const createStretchEffect = (
    letterId: string,
    letterIndex: number,
  ): GenericEffectData => {
    const waveDuration = 2;
    const compressScale = 2 - stretchIntensity;

    return {
      type: 'ease-in-out',
      start: 0,
      duration: waveDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Stretch at peak
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleY', val: stretchIntensity, prog: 0.25 },
        { key: 'scaleY', val: 1, prog: 0.5 },
        { key: 'scaleY', val: 1, prog: 1 },
        // Compress at peak
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: compressScale, prog: 0.25 },
        { key: 'scaleX', val: 1, prog: 0.5 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    };
  };

  // Helper: Create float effect for a letter
  const createFloatEffect = (
    letterId: string,
    letterIndex: number,
  ): GenericEffectData => {
    const floatStart = 2;
    const phaseOffset = (letterIndex * 0.2) % 1;

    return {
      type: 'ease-in-out',
      start: floatStart,
      duration: floatDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -floatAmplitude, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };
  };

  // Create letter components
  const letters = text.split('');
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `wave-letter-${index}`;
      const wrapperEffects = [
        {
          id: `wave-effect-${index}`,
          componentId: 'generic',
          data: createWaveEffect(letterId, index),
        },
        {
          id: `float-effect-${index}`,
          componentId: 'generic',
          data: createFloatEffect(letterId, index),
        },
      ];

      const letterEffects = [
        {
          id: `stretch-effect-${index}`,
          componentId: 'generic',
          data: createStretchEffect(letterId, index),
        },
      ];

      return {
        id: `letter-wrapper-${index}`,
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'relative',
            style: {
              display: 'inline-block',
            },
          },
        },
        effects: wrapperEffects,
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: [
          {
            id: letterId,
            componentId: 'TextAtom',
            type: 'atom' as const,
            data: {
              text: letter === ' ' ? '\u00A0' : letter,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight,
                color: textColor,
                display: 'inline-block',
              },
              font: {
                family: fontFamily,
                weights: [fontWeight],
              },
            },
            effects: letterEffects,
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
          } as RenderableComponentData,
          // Foam particles container
          {
            id: `foam-container-${index}`,
            componentId: 'BaseLayout',
            type: 'layout' as const,
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  overflow: 'visible',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
            childrenData: createFoamParticles(index),
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'wave-typo-root',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          overflow: 'visible',
          width: '100%',
          height: '100%',
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
      {
        id: 'text-container',
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'relative flex flex-row items-baseline',
            style: {
              overflow: 'visible',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: letterComponents,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'waveTypokinetics',
  title: 'Wave Typokinetics',
  description:
    'Letters ride on a sine wave with stretch effects and foam particles. Creates serene, aquatic typography perfect for dreamy titles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'wave',
    'typokinetics',
    'animation',
    'aquatic',
    'fluid',
    'serene',
    'dreamy',
    'particles',
    'foam',
    'float',
    'stretch',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'WAVE TEXT',
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    duration: 5,
    waveAmplitude: 30,
    wavePhaseOffset: 0.5,
    stretchIntensity: 1.15,
    foamParticleCount: 4,
    floatAmplitude: 3,
    floatDuration: 3,
  },
};

// --- Export ---
export const waveTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
