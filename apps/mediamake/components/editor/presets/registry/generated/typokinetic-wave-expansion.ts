/**
 * Typokinetic Wave Expansion Preset
 *
 * This preset creates a dynamic typokinetic animation where letters track outward
 * while simultaneously performing a wave motion, like text riding an invisible sine
 * wave as it expands. Inspired by liquid motion graphics and wave displacement effects.
 *
 * Features:
 * - Compound animation: translateX for expansion, translateY for wave motion
 * - Wave amplitude decreases from 30px to 0 during expansion
 * - Sine wave propagates through text creating ripple effect
 * - Hue rotation color shift during movement (0deg to 360deg)
 * - Subtle scale oscillation (0.95 to 1.05) synchronized with wave
 * - GPU-accelerated transforms for smooth performance
 * - 1.5s duration with 2-3 wave cycles during expansion
 *
 * Use cases:
 * - Music visualizers
 * - Artistic titles and intros
 * - Organic, flowing typography effects
 * - Liquid motion graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z.string().describe('Text content to animate with wave expansion effect'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (hex or rgba)'),
  expansionDistance: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Maximum horizontal expansion distance in pixels'),
  waveAmplitude: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .describe('Initial wave amplitude in pixels (decreases to 0)'),
  waveCycles: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Number of wave cycles during expansion (2-3 recommended)'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Total animation duration in seconds'),
  hueRotation: z
    .boolean()
    .default(true)
    .describe('Enable hue rotation color shift during animation'),
  scaleOscillation: z
    .boolean()
    .default(true)
    .describe('Enable subtle scale oscillation synchronized with wave'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontWeight,
    font,
    textColor,
    expansionDistance,
    waveAmplitude,
    waveCycles,
    duration,
    hueRotation,
    scaleOscillation,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {
    fontWeight: fontWeight,
  };
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = fontParts[1];
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = fontParts[1];
    }
  }

  // Split text into letters
  const letters = text.split('');
  const letterCount = letters.length;

  // Calculate center offset for expansion (letters start at center)
  const centerIndex = (letterCount - 1) / 2;

  // Create letter components
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      
      // Calculate horizontal offset from center for expansion
      const offsetFromCenter = index - centerIndex;
      const expansionX = offsetFromCenter * (expansionDistance / letterCount);

      // Wave phase offset (based on letter index)
      const wavePhase = index * 0.5;

      // Create effect ranges for compound animation
      const effectRanges = [];

      // 1. Horizontal expansion (translateX)
      effectRanges.push(
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: expansionX, prog: 1 },
      );

      // 2. Vertical wave motion (translateY) with decreasing amplitude
      // Wave formula: sin((index * 0.5) + (progress * PI * 2 * cycles)) * amplitude(progress)
      // We'll sample at multiple progress points for smooth wave
      const waveSamples = 20;
      for (let i = 0; i <= waveSamples; i++) {
        const prog = i / waveSamples;
        const waveProgress = prog * Math.PI * 2 * waveCycles;
        const amplitudeDecay = 1 - prog; // Amplitude decreases from 1 to 0
        const waveValue = Math.sin(wavePhase + waveProgress) * waveAmplitude * amplitudeDecay;
        effectRanges.push({ key: 'translateY', val: waveValue, prog });
      }

      // 3. Scale oscillation (synchronized with wave)
      if (scaleOscillation) {
        for (let i = 0; i <= waveSamples; i++) {
          const prog = i / waveSamples;
          const waveProgress = prog * Math.PI * 2 * waveCycles;
          const scaleValue = 0.95 + 0.1 * (0.5 + 0.5 * Math.sin(wavePhase + waveProgress));
          effectRanges.push({ key: 'scale', val: scaleValue, prog });
        }
      } else {
        effectRanges.push(
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        );
      }

      // 4. Hue rotation color shift
      if (hueRotation) {
        effectRanges.push(
          { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
          { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
        );
      }

      // 5. Opacity (start compressed, fade in slightly)
      effectRanges.push(
        { key: 'opacity', val: 0.7, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },
      );

      const letterEffect = {
        id: `wave-expansion-effect-${letterId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [letterId],
          ranges: effectRanges,
        },
      };

      return {
        id: letterId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block absolute transform-gpu',
            style: {
              left: '50%',
              top: '50%',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [letterEffect],
        childrenData: [
          {
            id: `text-${letterId}`,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: letter,
              className: 'block',
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: [fontStyle.fontWeight?.toString() || '700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetic-wave-expansion-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center overflow-visible',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'wave-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'typokinetic-wave-expansion',
  title: 'Typokinetic Wave Expansion',
  description:
    'Dynamic typokinetics preset where letters track outward while simultaneously performing a wave motion, like text riding an invisible sine wave as it expands. Features compound animation with translateX expansion, translateY wave motion, decreasing wave amplitude, color shift via hue rotation, and subtle scale oscillation. Perfect for music visualizers, artistic titles, or organic flowing typography.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'wave',
    'expansion',
    'liquid',
    'motion-graphics',
    'sine-wave',
    'displacement',
    'hue-rotation',
    'oscillation',
    'organic',
    'flowing',
    'music-visualizer',
    'artistic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'WAVE',
    fontSize: 72,
    fontWeight: 'bold',
    font: 'Inter:700',
    textColor: '#FFFFFF',
    expansionDistance: 200,
    waveAmplitude: 30,
    waveCycles: 2.5,
    duration: 1.5,
    hueRotation: true,
    scaleOscillation: true,
  },
};

// --- Export ---
export const typokineticWaveExpansionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
