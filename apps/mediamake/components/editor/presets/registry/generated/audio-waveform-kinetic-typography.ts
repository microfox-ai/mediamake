/**
 * Audio Waveform Kinetic Typography Preset
 *
 * This preset creates text characters that move with rhythmic, musical timing inspired by audio 
 * waveform visualization. Perfect for music video titles, each character has its own 'frequency' 
 * of oscillation during entry, creating a harmonious but complex motion pattern.
 *
 * Features:
 * - Character-level animation with unique frequency and amplitude per letter
 * - Oscillating entry using sine wave calculations with dampening
 * - Mathematical dampening function: amplitude * Math.exp(-damping * time)
 * - 5-7 oscillation cycles with exponentially decreasing amplitude
 * - Subtle rotation oscillation at half the frequency of vertical movement
 * - Optional subtle opacity oscillation synchronized with movement
 * - GPU-accelerated transforms for smooth performance
 * - Rhythmic stagger timing (0.04s base) for cascading wave effect
 *
 * Use cases:
 * - Music video titles with beat-synchronized motion
 * - Rhythmic text animations for audio content
 * - Dynamic typography that feels alive and musical
 * - Audio-reactive text overlays with organic motion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  text: z.string().describe('Text content to animate with waveform kinetics'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color in hex or rgba format'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration for complete dampening cycle in seconds'),
  staggerDelay: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.04)
    .describe('Delay between character animations in seconds'),
  damping: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Dampening rate (higher = faster decay)'),
  amplitudeMin: z
    .number()
    .min(10)
    .max(50)
    .default(20)
    .describe('Minimum vertical oscillation amplitude in pixels'),
  amplitudeMax: z
    .number()
    .min(20)
    .max(100)
    .default(40)
    .describe('Maximum vertical oscillation amplitude in pixels'),
  frequencyMin: z
    .number()
    .min(0.5)
    .max(5)
    .default(1)
    .describe('Minimum oscillation frequency in Hz'),
  frequencyMax: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Maximum oscillation frequency in Hz'),
  rotationMax: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .describe('Maximum rotation oscillation in degrees'),
  enableOpacityOscillation: z
    .boolean()
    .default(true)
    .describe('Enable subtle opacity oscillation synchronized with movement'),
  opacityMin: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.8)
    .describe('Minimum opacity during oscillation'),
  opacityMax: z
    .number()
    .min(0.8)
    .max(1)
    .default(1)
    .describe('Maximum opacity during oscillation'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    textColor,
    duration,
    staggerDelay,
    damping,
    amplitudeMin,
    amplitudeMax,
    frequencyMin,
    frequencyMax,
    rotationMax,
    enableOpacityOscillation,
    opacityMin,
    opacityMax,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontStr: string) => {
    const fontParts = fontStr.split(':');
    const family = fontParts[0];
    let fontWeight: number | undefined;
    let fontStyle: 'normal' | 'italic' = 'normal';

    if (fontParts.length > 1) {
      fontWeight = parseInt(fontParts[1], 10);
    }
    if (fontParts.length > 2) {
      fontStyle = fontParts[2] as 'normal' | 'italic';
    }

    return { family, fontWeight, fontStyle };
  };

  const { family, fontWeight, fontStyle } = parseFontString(fontFamily);

  // Generate unique frequency and amplitude for each character
  const generateCharacterParams = (index: number, totalChars: number) => {
    // Use pseudo-random but deterministic values based on character index
    const seed = (index * 137.508) % 1; // Golden angle for distribution
    const frequency = frequencyMin + seed * (frequencyMax - frequencyMin);
    const amplitude = amplitudeMin + seed * (amplitudeMax - amplitudeMin);

    return { frequency, amplitude };
  };

  // Generate dampened oscillation keyframes using mathematical formula
  const generateOscillationRanges = (
    amplitude: number,
    frequency: number,
    totalDuration: number,
    dampingRate: number,
  ) => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const oscillationCount = Math.round(frequency * totalDuration);
    const clampedCount = Math.max(5, Math.min(7, oscillationCount));

    // Generate oscillation cycles with exponential dampening
    for (let i = 0; i <= clampedCount; i++) {
      const progress = i / clampedCount;
      const time = progress * totalDuration;

      // Dampening formula: amplitude * exp(-damping * time)
      const dampedAmplitude = amplitude * Math.exp(-dampingRate * time);

      // Sine wave for oscillation (alternating positive/negative)
      const direction = i % 2 === 0 ? 1 : -1;
      const value = direction * dampedAmplitude;

      ranges.push({
        key: 'translateY',
        val: value,
        prog: progress,
      });
    }

    // Ensure final position is at rest
    ranges.push({
      key: 'translateY',
      val: 0,
      prog: 1,
    });

    return ranges;
  };

  // Generate rotation oscillation at half frequency
  const generateRotationRanges = (
    maxRotation: number,
    frequency: number,
    totalDuration: number,
    dampingRate: number,
  ) => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const rotationCycles = Math.round((frequency / 2) * totalDuration);
    const clampedCycles = Math.max(3, Math.min(5, rotationCycles));

    for (let i = 0; i <= clampedCycles; i++) {
      const progress = i / clampedCycles;
      const time = progress * totalDuration;

      // Dampened rotation amplitude
      const dampedRotation = maxRotation * Math.exp(-dampingRate * time);

      // Alternating rotation direction
      const direction = i % 2 === 0 ? 1 : -1;
      const value = direction * dampedRotation;

      ranges.push({
        key: 'rotate',
        val: value,
        prog: progress,
      });
    }

    ranges.push({
      key: 'rotate',
      val: 0,
      prog: 1,
    });

    return ranges;
  };

  // Generate opacity oscillation ranges
  const generateOpacityRanges = (
    minOpacity: number,
    maxOpacity: number,
    frequency: number,
    totalDuration: number,
  ) => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const opacityCycles = Math.round(frequency * totalDuration);
    const clampedCycles = Math.max(4, Math.min(6, opacityCycles));

    for (let i = 0; i <= clampedCycles; i++) {
      const progress = i / clampedCycles;

      // Oscillate between min and max, dampening toward max
      const dampFactor = Math.exp(-1.5 * progress);
      const range = (maxOpacity - minOpacity) * dampFactor;
      const value =
        i % 2 === 0
          ? maxOpacity - range
          : minOpacity + range * 0.5;

      ranges.push({
        key: 'opacity',
        val: value,
        prog: progress,
      });
    }

    ranges.push({
      key: 'opacity',
      val: maxOpacity,
      prog: 1,
    });

    return ranges;
  };

  // Split text into characters
  const characters = text.split('');

  // Create character containers with individual effects
  const characterContainers = characters.map((char, index) => {
    const charId = `audio-waveform-char-${index}`;
    const charParams = generateCharacterParams(index, characters.length);

    // Generate oscillation ranges for this character
    const translateYRanges = generateOscillationRanges(
      charParams.amplitude,
      charParams.frequency,
      duration,
      damping,
    );

    const rotationRanges = generateRotationRanges(
      rotationMax,
      charParams.frequency,
      duration,
      damping,
    );

    // Build effects array
    const effects = [
      {
        id: `translate-effect-${charId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: duration,
          mode: 'provider' as const,
          targetIds: [charId],
          ranges: translateYRanges,
        },
      },
      {
        id: `rotation-effect-${charId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: duration,
          mode: 'provider' as const,
          targetIds: [charId],
          ranges: rotationRanges,
        },
      },
    ];

    // Add opacity oscillation if enabled
    if (enableOpacityOscillation) {
      const opacityRanges = generateOpacityRanges(
        opacityMin,
        opacityMax,
        charParams.frequency,
        duration,
      );

      effects.push({
        id: `opacity-effect-${charId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: duration,
          mode: 'provider' as const,
          targetIds: [charId],
          ranges: opacityRanges,
        },
      });
    }

    return {
      id: `char-container-${index}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'transform-gpu will-change-transform',
        },
      },
      context: {
        timing: {
          start: index * staggerDelay,
          duration: duration,
        },
      },
      effects,
      childrenData: [
        {
          id: charId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: char,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight || 700,
              fontStyle: fontStyle,
              color: textColor,
            },
            font: {
              family: family,
              weights: fontWeight ? [fontWeight.toString()] : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer = {
    id: 'audio-waveform-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + characters.length * staggerDelay,
      },
    },
    childrenData: [
      {
        id: 'text-row-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row items-center gap-1',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration + characters.length * staggerDelay,
          },
        },
        childrenData: characterContainers,
      } as RenderableComponentData,
    ],
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
  id: 'audioWaveformKineticTypography',
  title: 'Audio Waveform Kinetic Typography',
  description:
    'Typokinetic preset with audio waveform-inspired character animations. Each character oscillates with unique frequency (1-3Hz) and amplitude (20-40px) during entry, with exponential dampening creating guitar-string-like vibration decay. Features synchronized vertical translation, rotation, and opacity oscillations for harmonious, musical motion patterns.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'audio',
    'waveform',
    'oscillation',
    'music',
    'rhythmic',
    'dampening',
    'animated',
    'text',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MUSIC',
    fontSize: 64,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    duration: 3,
    staggerDelay: 0.04,
    damping: 2,
    amplitudeMin: 20,
    amplitudeMax: 40,
    frequencyMin: 1,
    frequencyMax: 3,
    rotationMax: 5,
    enableOpacityOscillation: true,
    opacityMin: 0.8,
    opacityMax: 1,
  },
};

export const audioWaveformKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
