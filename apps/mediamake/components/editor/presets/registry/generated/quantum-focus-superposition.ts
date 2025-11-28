/**
 * Quantum Focus Superposition Text Preset
 *
 * A scientifically-inspired text reveal effect where characters exist in probability 
 * blur states that oscillate like wave functions before collapsing into sharp focus 
 * on beat moments.
 *
 * Features:
 * - **Wave Function Blur**: Each character oscillates with phase-shifted blur waves 
 *   using sinusoidal calculations, simulating quantum superposition states
 * - **Particle Scatter**: Multiple box-shadow effects create probability cloud-like 
 *   scatter during blur phases, making letters appear as quantum particle distributions
 * - **Measurement Grid Overlay**: Repeating-linear-gradient grid that fades as 
 *   certainty increases, representing the measurement process
 * - **Sudden Collapse**: Step timing functions create decisive, instantaneous transitions 
 *   at beat points, mimicking quantum wavefunction collapse
 * - **Phase-Shifted Oscillations**: Each character has different phase offsets, creating 
 *   a wave interference pattern across the text
 * - **Beat Synchronization**: Audio analysis with precise timestamp alignment for collapse moments
 *
 * Use cases:
 * - Scientific/physics-themed content
 * - Futuristic technology presentations
 * - Quantum computing explainers
 * - Abstract data visualization intros
 * - High-tech brand reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  GenericEffectData,
  TextAtomData,
  HTMLBlockAtomData,
} from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('QUANT')
    .describe('Text to display with quantum superposition effect'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the effect in seconds'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size in pixels for the text'),
  font: z
    .string()
    .default('IBM Plex Mono')
    .describe(
      'Font family (e.g., "IBM Plex Mono", "Roboto Mono:700", "JetBrains Mono:600")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or rgba)'),
  glowColor: z
    .string()
    .default('#00c8ff')
    .describe('Glow/shadow color for quantum effect (hex or rgba)'),
  backgroundColor: z
    .string()
    .default('#0a0a0f')
    .describe('Background color (hex or rgba)'),
  gridColor: z
    .string()
    .default('rgba(0,255,200,0.08)')
    .describe('Measurement grid overlay color'),
  gridSize: z
    .number()
    .default(50)
    .describe('Grid cell size in pixels'),
  oscillationFrequency: z
    .number()
    .default(2)
    .describe('Wave oscillation frequency (cycles per duration)'),
  maxBlur: z
    .number()
    .default(15)
    .describe('Maximum blur amount in pixels during oscillation'),
  phaseShift: z
    .number()
    .default(0.3)
    .describe('Phase shift between characters (fraction of 2π)'),
  collapsePoints: z
    .array(z.number())
    .default([3, 6, 9])
    .describe(
      'Timestamps (in seconds) when collapse happens - overridden by audio beats if provided',
    ),
  audioSrc: z
    .string()
    .optional()
    .describe('Optional audio source URL for beat-synced collapse timing'),
  particleScatterIntensity: z
    .number()
    .default(3)
    .describe('Intensity of particle scatter effect (shadow spread)'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    text,
    duration,
    fontSize,
    font,
    textColor,
    glowColor,
    backgroundColor,
    gridColor,
    gridSize,
    oscillationFrequency,
    maxBlur,
    phaseShift,
    collapsePoints: defaultCollapsePoints,
    audioSrc,
    particleScatterIntensity,
  } = params;

  const { fetcher } = props;

  // Parse font string (format: "FontName:weight")
  const fontString = font || 'IBM Plex Mono';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10) || 300
    : 300;

  // Get beat timestamps from audio analysis if provided
  let collapsePoints = defaultCollapsePoints;
  if (audioSrc && fetcher) {
    try {
      const { analysis } = await fetcher('/api/analyze-audio', {
        audioSrc,
      });

      if (analysis && analysis.length > 0) {
        // Select high-impact beats for collapse points
        const impactfulBeats = analysis
          .filter((beat: any) => beat.intensity > 0.6)
          .sort((a: any, b: any) => b.intensity - a.intensity)
          .slice(0, 5)
          .map((beat: any) => beat.timestamp)
          .sort((a: number, b: number) => a - b);

        if (impactfulBeats.length > 0) {
          collapsePoints = impactfulBeats;
        }
      }
    } catch (error) {
      console.warn('Audio analysis failed, using default collapse points');
    }
  }

  // Split text into characters
  const characters = text.split('');

  // Helper: Create wave function blur effect for a character
  const createWaveFunctionEffect = (
    charId: string,
    charIndex: number,
  ): GenericEffectData[] => {
    const effects: GenericEffectData[] = [];

    // Phase offset for this character
    const phase = charIndex * phaseShift * Math.PI * 2;

    // Number of collapse cycles
    const cycles = collapsePoints.length;

    // Create oscillation segments between collapse points
    for (let i = 0; i <= cycles; i++) {
      const segmentStart = i === 0 ? 0 : collapsePoints[i - 1];
      const segmentEnd = i === cycles ? duration : collapsePoints[i];
      const segmentDuration = segmentEnd - segmentStart;

      if (segmentDuration <= 0) continue;

      // Oscillation effect (blur waves)
      const oscillationRanges: any[] = [];
      const steps = 20; // Number of keyframes for smooth oscillation

      for (let step = 0; step <= steps; step++) {
        const prog = step / steps;
        const time = segmentStart + prog * segmentDuration;

        // Calculate wave function value
        const waveValue =
          Math.sin(
            (time / duration) * oscillationFrequency * Math.PI * 2 + phase,
          ) *
            0.5 +
          0.5;

        // Blur oscillates
        const blurValue = i < cycles ? waveValue * maxBlur : 0;

        // Opacity oscillates slightly (0.5-1) until collapse, then solid 1
        const opacityValue = i < cycles ? 0.5 + waveValue * 0.5 : 1;

        // Scale oscillates slightly (0.98-1.02) until collapse, then 1
        const scaleValue = i < cycles ? 0.98 + waveValue * 0.04 : 1;

        oscillationRanges.push(
          { key: 'blur', val: `${blurValue}px`, prog },
          { key: 'opacity', val: opacityValue, prog },
          { key: 'scale', val: scaleValue, prog },
        );
      }

      effects.push({
        type: i === cycles - 1 ? 'linear' : 'linear',
        start: segmentStart,
        duration: segmentDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: oscillationRanges,
      });

      // Add sudden collapse effect at collapse point
      if (i < cycles) {
        effects.push({
          type: 'linear',
          start: collapsePoints[i] - 0.05,
          duration: 0.1,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            { key: 'blur', val: `${maxBlur}px`, prog: 0 },
            { key: 'blur', val: '0px', prog: 1 },
            { key: 'opacity', val: 0.5, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        });
      }
    }

    return effects;
  };

  // Helper: Create particle scatter shadow effect
  const createParticleScatter = (charIndex: number): string => {
    const phase = charIndex * phaseShift * Math.PI * 2;
    const shadows: string[] = [];

    // Base glow
    shadows.push(`0 0 20px ${glowColor}`);

    // Particle scatter offsets
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + phase;
      const distance = particleScatterIntensity * (i + 1);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const opacity = 0.15 - i * 0.02;

      shadows.push(
        `${x.toFixed(1)}px ${y.toFixed(1)}px 0 rgba(0,255,200,${opacity})`,
      );
      shadows.push(
        `${-x.toFixed(1)}px ${-y.toFixed(1)}px 0 rgba(255,0,200,${opacity})`,
      );
    }

    return shadows.join(', ');
  };

  // Create character atoms with wave effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;

      return {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize,
            fontWeight,
            color: textColor,
            textShadow: createParticleScatter(index),
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: createWaveFunctionEffect(charId, index).map((effectData) => ({
          id: `wave-effect-${charId}-${Math.random()}`,
          componentId: 'generic',
          data: effectData,
        })),
      } as RenderableComponentData;
    },
  );

  // Create measurement grid overlay with fade effect
  const gridOverlayId = 'measurement-grid-overlay';
  const gridOverlay: RenderableComponentData = {
    id: gridOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent ${
        gridSize - 1
      }px,${gridColor} ${gridSize}px),repeating-linear-gradient(90deg,transparent,transparent ${
        gridSize - 1
      }px,${gridColor} ${gridSize}px);mix-blend-mode:screen;"></div>`,
      style: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      },
    } as HTMLBlockAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'grid-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: duration * 0.3,
          mode: 'provider',
          targetIds: [gridOverlayId],
          ranges: [
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  } as RenderableComponentData;

  // Text container with grid layout
  const textContainerId = 'text-container';
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `grid gap-0`,
        style: {
          gridTemplateColumns: `repeat(${characters.length}, auto)`,
          position: 'relative',
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: characterComponents,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'quantum-focus-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [gridOverlay, textContainer],
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
  id: 'quantum-focus-superposition',
  title: 'Quantum Focus Superposition Text',
  description:
    'A scientifically-inspired text reveal effect where characters exist in probability blur states that oscillate like wave functions before collapsing into sharp focus on beat moments. Features phase-shifted blur waves per character, particle-like scatter shadows simulating probability clouds, measurement grid overlays that fade as certainty increases, and sudden decisive collapse transitions synchronized to audio beats.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'quantum',
    'physics',
    'science',
    'futuristic',
    'blur',
    'wave',
    'collapse',
    'beat-sync',
    'particles',
    'grid',
    'measurement',
    'superposition',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'QUANT',
    duration: 10,
    fontSize: 120,
    font: 'IBM Plex Mono',
    textColor: '#ffffff',
    glowColor: '#00c8ff',
    backgroundColor: '#0a0a0f',
    gridColor: 'rgba(0,255,200,0.08)',
    gridSize: 50,
    oscillationFrequency: 2,
    maxBlur: 15,
    phaseShift: 0.3,
    collapsePoints: [3, 6, 9],
    particleScatterIntensity: 3,
  },
};

export const quantumFocusSuperpositionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
