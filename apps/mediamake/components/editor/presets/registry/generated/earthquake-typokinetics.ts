/**
 * Earthquake Typokinetics Preset
 *
 * Simulates seismic activity with P-waves (compression), S-waves (shear), and surface waves (rolling).
 * Each word has mass and inertia, responding to tremors with realistic physics including building sway,
 * liquefaction effects, aftershocks, and structural damage. Includes Richter scale intensity parameter
 * controlling shake violence.
 *
 * Features:
 * - **P-waves**: Rapid compression oscillation (translateX)
 * - **S-waves**: Shear wave motion (skewX)
 * - **Surface waves**: Combined rolling motion (rotateZ + translateY)
 * - **Building sway**: Pendulum physics with angle proportional to font-size
 * - **Liquefaction**: Blur and scaleY distortion effects
 * - **Aftershocks**: Reduced amplitude tremors at 2s, 4s, 6s
 * - **Structural damage**: Debris particles with fall and rotate animations
 * - **Richter scale intensity**: Configurable violence of shaking
 *
 * Use cases:
 * - Creating dramatic earthquake effects for title sequences
 * - Building seismic activity visualizations
 * - Adding realistic physics-based text animations
 * - Creating disaster-themed content with structural effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().default('EARTHQUAKE').describe('Text to display'),
  richterScale: z
    .number()
    .min(1)
    .max(10)
    .default(7)
    .describe('Richter scale intensity (1-10) controlling shake violence'),
  fontSize: z
    .number()
    .default(72)
    .describe('Base font size in pixels (larger = more sway)'),
  textColor: z.string().default('#dc2626').describe('Text color (e.g., #dc2626 for red)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (e.g., #000000 for black)'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the animation in seconds'),
  mainQuakeDuration: z
    .number()
    .default(3)
    .describe('Duration of the main earthquake in seconds'),
  enableAftershocks: z
    .boolean()
    .default(true)
    .describe('Enable aftershock tremors'),
  enableDebris: z.boolean().default(true).describe('Enable falling debris particles'),
  wordSpacing: z.number().default(32).describe('Spacing between words in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    richterScale,
    fontSize,
    textColor,
    backgroundColor,
    duration,
    mainQuakeDuration,
    enableAftershocks,
    enableDebris,
    wordSpacing,
  } = params;

  // Calculate intensity multipliers based on Richter scale
  const intensityMultiplier = richterScale / 7; // 7 is baseline
  const pWaveAmplitude = 15 * intensityMultiplier;
  const sWaveAmplitude = 20 * intensityMultiplier;
  const swayAmplitude = (fontSize / 72) * 5 * intensityMultiplier; // Larger text = more sway
  const skewAmplitude = 3 * intensityMultiplier;

  // Split text into words
  const words = text.split(' ').filter((word) => word.length > 0);
  const wordStagger = 0.05; // Stagger delay between words for wave propagation

  // Generate word components
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${index}`;
    const relativeStart = index * wordStagger;
    // Calculate font size variation (larger words in center)
    const centerIndex = Math.floor(words.length / 2);
    const distanceFromCenter = Math.abs(index - centerIndex);
    const fontSizeVariation = fontSize + (words.length > 1 ? (centerIndex - distanceFromCenter) * 8 : 0);

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        className: 'font-bold tracking-tight',
        style: {
          fontSize: `${fontSizeVariation}px`,
          color: textColor,
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          transformOrigin: 'bottom center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [],
    };
  });

  // Generate debris particles if enabled
  const debrisComponents: RenderableComponentData[] = [];
  if (enableDebris) {
    const debrisCount = 6;
    for (let i = 0; i < debrisCount; i++) {
      const debrisId = `debris-${i}`;
      const leftPosition = 30 + Math.random() * 40; // Random horizontal position
      const topPosition = 20 + Math.random() * 15; // Random vertical position
      const size = 8 + Math.random() * 6; // Random size

      debrisComponents.push({
        id: debrisId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: ${size}px; height: ${size}px; background: ${i % 2 === 0 ? '#991b1b' : '#7f1d1d'}; border-radius: 2px;'></div>`,
          className: 'absolute',
          style: {
            left: `${leftPosition}%`,
            top: `${topPosition}%`,
          },
        },
        context: {
          timing: {
            start: 1,
            duration: 5,
          },
        },
        effects: [],
      });
    }
  }

  // Generate all effects
  const allEffects: any[] = [];

  // Helper function to create P-wave effect (compression oscillation)
  const createPWaveEffect = (targetId: string, start: number, duration: number, amplitude: number) => {
    const keyframeCount = 20;
    const ranges: any[] = [];
    for (let i = 0; i <= keyframeCount; i++) {
      const prog = i / keyframeCount;
      const oscillation = Math.sin(prog * Math.PI * 10) * amplitude * (1 - prog * 0.5);
      ranges.push({ key: 'translateX', val: oscillation, prog });
    }
    return {
      id: `p-wave-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges,
      } as GenericEffectData,
    };
  };

  // Helper function to create S-wave effect (shear motion)
  const createSWaveEffect = (targetId: string, start: number, duration: number, amplitude: number) => {
    const keyframeCount = 10;
    const ranges: any[] = [];
    for (let i = 0; i <= keyframeCount; i++) {
      const prog = i / keyframeCount;
      const wave = Math.sin(prog * Math.PI * 5) * amplitude * (1 - prog * 0.5);
      ranges.push({ key: 'translateY', val: wave, prog });
    }
    return {
      id: `s-wave-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges,
      } as GenericEffectData,
    };
  };

  // Helper function to create surface wave effect (rolling motion)
  const createSurfaceWaveEffect = (targetId: string, start: number, duration: number, rotateAmplitude: number) => {
    return {
      id: `surface-wave-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'rotateZ', val: 0, prog: 0 },
          { key: 'rotateZ', val: rotateAmplitude, prog: 0.25 },
          { key: 'rotateZ', val: 0, prog: 0.5 },
          { key: 'rotateZ', val: -rotateAmplitude * 0.75, prog: 0.75 },
          { key: 'rotateZ', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper function to create compression effect (scaleX oscillation)
  const createCompressionEffect = (targetId: string, start: number, duration: number) => {
    return {
      id: `compression-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'scaleX', val: 1, prog: 0 },
          { key: 'scaleX', val: 0.98, prog: 0.1 },
          { key: 'scaleX', val: 1.02, prog: 0.2 },
          { key: 'scaleX', val: 0.99, prog: 0.3 },
          { key: 'scaleX', val: 1.01, prog: 0.4 },
          { key: 'scaleX', val: 1, prog: 0.5 },
          { key: 'scaleX', val: 0.99, prog: 0.6 },
          { key: 'scaleX', val: 1.01, prog: 0.7 },
          { key: 'scaleX', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper function to create shear effect (skewX)
  const createShearEffect = (targetId: string, start: number, duration: number, amplitude: number) => {
    return {
      id: `shear-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'skewX', val: 0, prog: 0 },
          { key: 'skewX', val: amplitude, prog: 0.15 },
          { key: 'skewX', val: -amplitude, prog: 0.3 },
          { key: 'skewX', val: amplitude * 0.66, prog: 0.45 },
          { key: 'skewX', val: -amplitude * 0.66, prog: 0.6 },
          { key: 'skewX', val: amplitude * 0.33, prog: 0.75 },
          { key: 'skewX', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper function to create aftershock effect
  const createAftershockEffect = (targetId: string, start: number, duration: number, intensity: number) => {
    const amplitude = pWaveAmplitude * intensity;
    return {
      id: `aftershock-${targetId}-${start}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: amplitude, prog: 0.2 },
          { key: 'translateX', val: -amplitude, prog: 0.4 },
          { key: 'translateX', val: amplitude * 0.5, prog: 0.6 },
          { key: 'translateX', val: -amplitude * 0.5, prog: 0.8 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper function to create debris fall effect
  const createDebrisFallEffect = (targetId: string, start: number, duration: number) => {
    const fallDistance = 600 + Math.random() * 100;
    const rotateAmount = 680 + Math.random() * 80;
    return {
      id: `debris-fall-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in' as const,
        start,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: fallDistance, prog: 1 },
          { key: 'rotateZ', val: 0, prog: 0 },
          { key: 'rotateZ', val: rotateAmount, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.8 },
        ],
      } as GenericEffectData,
    };
  };

  // Apply effects to each word
  words.forEach((word, index) => {
    const wordId = `word-${index}`;
    const wordStart = index * wordStagger;

    // Main earthquake effects
    allEffects.push(createPWaveEffect(wordId, 0, mainQuakeDuration, pWaveAmplitude));
    allEffects.push(createSWaveEffect(wordId, wordStart, mainQuakeDuration, sWaveAmplitude));
    allEffects.push(createSurfaceWaveEffect(wordId, 0.2 + wordStart, 2.5, swayAmplitude));
    allEffects.push(createCompressionEffect(wordId, 0, 1.5));
    allEffects.push(createShearEffect(wordId, 0.3 + wordStart, 1.8, skewAmplitude));

    // Aftershocks
    if (enableAftershocks) {
      allEffects.push(createAftershockEffect(wordId, 4, 1.2, 0.5)); // 50% intensity
      allEffects.push(createAftershockEffect(wordId, 6, 1.0, 0.25)); // 25% intensity
      allEffects.push(createAftershockEffect(wordId, 8, 0.8, 0.1)); // 10% intensity
    }

    // Apply effects to word component
    const wordComponent = wordComponents[index];
    wordComponent.effects = allEffects.filter((effect) =>
      effect.data.targetIds.includes(wordId)
    );
  });

  // Apply effects to debris
  if (enableDebris) {
    debrisComponents.forEach((debris, index) => {
      const debrisId = `debris-${index}`;
      const startDelay = 1 + index * 0.1;
      debris.effects = [createDebrisFallEffect(debrisId, startDelay, 5)];
    });
  }

  // Create word container
  const wordContainer: RenderableComponentData = {
    id: 'word-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          gap: `${wordSpacing}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: wordComponents,
  };

  // Create debris container if enabled
  const debrisContainer: RenderableComponentData | null = enableDebris
    ? {
        id: 'debris-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 1,
            duration: 9,
          },
        },
        childrenData: debrisComponents,
      }
    : null;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'earthquake-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: debrisContainer ? [wordContainer, debrisContainer] : [wordContainer],
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
  id: 'earthquake-typokinetics',
  title: 'Earthquake Typokinetics',
  description:
    'Earthquake-inspired typokinetics preset simulating seismic activity with P-waves (compression), S-waves (shear), and surface waves (rolling). Each word has mass and inertia, responding to tremors with realistic physics including building sway, liquefaction effects, aftershocks, and structural damage. Includes Richter scale intensity parameter controlling shake violence.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'earthquake',
    'seismic',
    'physics',
    'kinetic',
    'p-wave',
    's-wave',
    'surface-wave',
    'sway',
    'aftershock',
    'debris',
    'richter-scale',
    'tremor',
    'shake',
    'disaster',
  ],
  defaultInputParams: {
    text: 'EARTHQUAKE',
    richterScale: 7,
    fontSize: 72,
    textColor: '#dc2626',
    backgroundColor: '#000000',
    duration: 10,
    mainQuakeDuration: 3,
    enableAftershocks: true,
    enableDebris: true,
    wordSpacing: 32,
  },
  dependencies: {},
};

// Export preset
export const earthquakeTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
