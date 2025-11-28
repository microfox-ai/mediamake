/**
 * Bit-Shift Glitch Transition Preset
 *
 * Creates a psychedelic bit-shift glitch transition where the image's RGB color channels
 * shift their bit positions, creating digital solarization effects and color distortions.
 * Implements bit manipulation visually through color channel math with stepped color
 * quantization (full → 8-bit → 4-bit → full) and binary code rain overlays during peak distortion.
 *
 * Features:
 * - RGB channel separation with individual bit-shift effects
 * - Red channel: contrast(300%) brightness(2) hue-rotate(45deg) - intense shift left
 * - Green channel: invert(100%) sepia(50%) - bitwise inversion
 * - Blue channel: brightness(0.3) contrast(200%) - subtle shift right
 * - Matrix-style binary rain overlays during peak distortion
 * - Stepped color quantization: full → 8-bit → 4-bit → full
 * - 3 overlapping bit-shift waves (0.3s each with 0.1s overlap)
 * - Total duration: 1.5s transition
 *
 * Use Cases:
 * - Digital glitch transitions between media
 * - Cyberpunk/tech-themed visual effects
 * - Psychedelic color distortion sequences
 * - Data corruption visualization
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  image: z.object({
    src: z.string().describe('Source URL or path of the image to apply glitch effect to'),
  }).describe('Image source configuration'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Total duration of the bit-shift glitch transition in seconds'),
  bitShiftWaveDuration: z
    .number()
    .default(0.3)
    .describe('Duration of each individual bit-shift wave in seconds'),
  waveOverlapDuration: z
    .number()
    .default(0.1)
    .describe('Overlap duration between consecutive bit-shift waves in seconds'),
  binaryRainColumns: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe('Number of binary rain columns (5-20 for performance)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    image,
    transitionDuration,
    bitShiftWaveDuration,
    waveOverlapDuration,
    binaryRainColumns,
  } = params;

  // Generate random binary strings for rain effect
  const generateBinaryString = (lines: number): string => {
    return Array(lines)
      .fill(0)
      .map(() => {
        return Array(8)
          .fill(0)
          .map(() => (Math.random() > 0.5 ? '1' : '0'))
          .join('');
      })
      .join('\n');
  };

  // Create binary rain columns
  const binaryRainChildrenData: RenderableComponentData[] = Array(binaryRainColumns)
    .fill(0)
    .map((_, index) => {
      const columnId = `rain-col-${index}`;
      const staggerDelay = index * 0.05; // Stagger rain columns

      return {
        id: columnId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: generateBinaryString(8),
          className: 'text-green-400 font-mono text-xs leading-tight',
          style: {
            whiteSpace: 'pre-line' as const,
            willChange: 'transform, opacity',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `rain-fall-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: staggerDelay,
              duration: transitionDuration - staggerDelay,
              mode: 'provider',
              targetIds: [columnId],
              ranges: [
                { key: 'translateY', val: '-100%', prog: 0 },
                { key: 'translateY', val: '100%', prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0.7, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });

  // Calculate wave timings
  const wave1Start = 0;
  const wave2Start = bitShiftWaveDuration - waveOverlapDuration;
  const wave3Start = wave2Start + bitShiftWaveDuration - waveOverlapDuration;

  // Red channel (bit-shift left - intense)
  const redChannelLayer: RenderableComponentData = {
    id: 'red-channel-layer',
    type: 'atom' as const,
    componentId: 'ImageAtom',
    data: {
      src: image.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        mixBlendMode: 'screen' as const,
        willChange: 'filter, transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Wave 1: Red channel bit-shift
      {
        id: 'red-wave-1',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: wave1Start,
          duration: bitShiftWaveDuration,
          mode: 'provider',
          targetIds: ['red-channel-layer'],
          ranges: [
            { key: 'filter', val: 'contrast(100%) brightness(1) hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'contrast(300%) brightness(2) hue-rotate(45deg)', prog: 0.5 },
            { key: 'filter', val: 'contrast(100%) brightness(1) hue-rotate(0deg)', prog: 1 },
          ],
        },
      },
      // Wave 2: Red channel secondary pulse
      {
        id: 'red-wave-2',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: wave2Start,
          duration: bitShiftWaveDuration,
          mode: 'provider',
          targetIds: ['red-channel-layer'],
          ranges: [
            { key: 'filter', val: 'contrast(100%) brightness(1) hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'contrast(250%) brightness(1.8) hue-rotate(30deg)', prog: 0.5 },
            { key: 'filter', val: 'contrast(100%) brightness(1) hue-rotate(0deg)', prog: 1 },
          ],
        },
      },
      // Wave 3: Red channel final shift
      {
        id: 'red-wave-3',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: wave3Start,
          duration: bitShiftWaveDuration,
          mode: 'provider',
          targetIds: ['red-channel-layer'],
          ranges: [
            { key: 'filter', val: 'contrast(100%) brightness(1) hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'contrast(200%) brightness(1.5) hue-rotate(20deg)', prog: 0.5 },
            { key: 'filter', val: 'contrast(100%) brightness(1) hue-rotate(0deg)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Green channel (bit-invert)
  const greenChannelLayer: RenderableComponentData = {
    id: 'green-channel-layer',
    type: 'atom' as const,
    componentId: 'ImageAtom',
    data: {
      src: image.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        mixBlendMode: 'screen' as const,
        willChange: 'filter, transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Wave 1: Green channel inversion
      {
        id: 'green-wave-1',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: wave1Start,
          duration: bitShiftWaveDuration,
          mode: 'provider',
          targetIds: ['green-channel-layer'],
          ranges: [
            { key: 'filter', val: 'invert(0%) sepia(0%)', prog: 0 },
            { key: 'filter', val: 'invert(100%) sepia(50%)', prog: 0.5 },
            { key: 'filter', val: 'invert(0%) sepia(0%)', prog: 1 },
          ],
        },
      },
      // Wave 2: Green channel secondary inversion
      {
        id: 'green-wave-2',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: wave2Start,
          duration: bitShiftWaveDuration,
          mode: 'provider',
          targetIds: ['green-channel-layer'],
          ranges: [
            { key: 'filter', val: 'invert(0%) sepia(0%)', prog: 0 },
            { key: 'filter', val: 'invert(80%) sepia(40%)', prog: 0.5 },
            { key: 'filter', val: 'invert(0%) sepia(0%)', prog: 1 },
          ],
        },
      },
      // Wave 3: Green channel final inversion
      {
        id: 'green-wave-3',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: wave3Start,
          duration: bitShiftWaveDuration,
          mode: 'provider',
          targetIds: ['green-channel-layer'],
          ranges: [
            { key: 'filter', val: 'invert(0%) sepia(0%)', prog: 0 },
            { key: 'filter', val: 'invert(60%) sepia(30%)', prog: 0.5 },
            { key: 'filter', val: 'invert(0%) sepia(0%)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Blue channel (bit-shift right - subtle)
  const blueChannelLayer: RenderableComponentData = {
    id: 'blue-channel-layer',
    type: 'atom' as const,
    componentId: 'ImageAtom',
    data: {
      src: image.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        mixBlendMode: 'screen' as const,
        willChange: 'filter, transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Wave 1: Blue channel bit-shift
      {
        id: 'blue-wave-1',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: wave1Start,
          duration: bitShiftWaveDuration,
          mode: 'provider',
          targetIds: ['blue-channel-layer'],
          ranges: [
            { key: 'filter', val: 'brightness(1) contrast(100%)', prog: 0 },
            { key: 'filter', val: 'brightness(0.3) contrast(200%)', prog: 0.5 },
            { key: 'filter', val: 'brightness(1) contrast(100%)', prog: 1 },
          ],
        },
      },
      // Wave 2: Blue channel secondary shift
      {
        id: 'blue-wave-2',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: wave2Start,
          duration: bitShiftWaveDuration,
          mode: 'provider',
          targetIds: ['blue-channel-layer'],
          ranges: [
            { key: 'filter', val: 'brightness(1) contrast(100%)', prog: 0 },
            { key: 'filter', val: 'brightness(0.4) contrast(180%)', prog: 0.5 },
            { key: 'filter', val: 'brightness(1) contrast(100%)', prog: 1 },
          ],
        },
      },
      // Wave 3: Blue channel final shift
      {
        id: 'blue-wave-3',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: wave3Start,
          duration: bitShiftWaveDuration,
          mode: 'provider',
          targetIds: ['blue-channel-layer'],
          ranges: [
            { key: 'filter', val: 'brightness(1) contrast(100%)', prog: 0 },
            { key: 'filter', val: 'brightness(0.5) contrast(150%)', prog: 0.5 },
            { key: 'filter', val: 'brightness(1) contrast(100%)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Binary rain container
  const binaryRainContainer: RenderableComponentData = {
    id: 'binary-rain-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none flex flex-row justify-around overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: binaryRainChildrenData,
  };

  // Quantization overlay (color reduction effect)
  const quantizationOverlay: RenderableComponentData = {
    id: 'quantization-overlay',
    type: 'atom' as const,
    componentId: 'ImageAtom',
    data: {
      src: image.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        pointerEvents: 'none' as const,
        willChange: 'filter',
        mixBlendMode: 'overlay' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Step 1: Full color → 8-bit
      {
        id: 'quantize-8bit',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.3,
          duration: 0.2,
          mode: 'provider',
          targetIds: ['quantization-overlay'],
          ranges: [
            { key: 'filter', val: 'contrast(100%) saturate(100%)', prog: 0 },
            { key: 'filter', val: 'contrast(150%) saturate(150%) brightness(0.95)', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
      // Step 2: 8-bit → 4-bit
      {
        id: 'quantize-4bit',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.7,
          duration: 0.2,
          mode: 'provider',
          targetIds: ['quantization-overlay'],
          ranges: [
            { key: 'filter', val: 'contrast(150%) saturate(150%) brightness(0.95)', prog: 0 },
            { key: 'filter', val: 'contrast(200%) saturate(200%) brightness(0.9) posterize(4)', prog: 1 },
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 1 },
          ],
        },
      },
      // Step 3: 4-bit → Full color
      {
        id: 'quantize-restore',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 1.2,
          duration: 0.3,
          mode: 'provider',
          targetIds: ['quantization-overlay'],
          ranges: [
            { key: 'filter', val: 'contrast(200%) saturate(200%) brightness(0.9) posterize(4)', prog: 0 },
            { key: 'filter', val: 'contrast(100%) saturate(100%) brightness(1)', prog: 1 },
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'bit-shift-glitch-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      redChannelLayer,
      greenChannelLayer,
      blueChannelLayer,
      binaryRainContainer,
      quantizationOverlay,
    ] as RenderableComponentData[],
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
  id: 'bit-shift-glitch-transition',
  title: 'Bit-Shift Glitch Transition',
  description:
    'Psychedelic bit-shift transition with RGB channel manipulation, binary rain overlays, and stepped color quantization (8-bit → 4-bit → full). Visualizes bitwise operations through channel shifts, digital solarization, and matrix-style binary code rain during peak distortion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'bit-shift',
    'rgb',
    'digital',
    'psychedelic',
    'solarization',
    'matrix',
    'binary',
    'quantization',
    'cyberpunk',
    'tech',
  ],
  defaultInputParams: {
    image: {
      src: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1920&h=1080&fit=crop',
    },
    transitionDuration: 1.5,
    bitShiftWaveDuration: 0.3,
    waveOverlapDuration: 0.1,
    binaryRainColumns: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const bitShiftGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
