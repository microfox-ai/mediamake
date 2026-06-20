/**
 * Glitch Matrix Rain Waveform Effect Preset
 *
 * A Matrix-style digital rain effect that reacts to audio frequencies in real-time.
 * Higher frequencies spawn more rain drops, bass controls fall speed, and mid-range
 * affects character randomization. Each rain drop is a small text element with random
 * characters that change as they fall, creating a pixelated overlay effect using CSS
 * mix-blend-mode.
 *
 * Features:
 * - **Audio-Reactive Rain**: Rain density increases with high frequencies
 * - **Bass-Controlled Speed**: Fall speed accelerates with bass intensity
 * - **Mid-Range Glitching**: Character randomization increases with mid-range audio
 * - **Customizable Characters**: Use any character set (katakana, numbers, symbols, etc.)
 * - **Blend Mode Overlay**: Creates a pixelated screen overlay effect
 * - **Configurable Density**: Control base number of rain columns
 * - **Dynamic Generation**: Real-time audio analysis drives rain behavior
 *
 * Use cases:
 * - Cyberpunk or tech-themed video transitions
 * - Music visualizations with digital aesthetic
 * - Hacker/tech tutorial overlays
 * - Futuristic UI overlays
 * - Audio-reactive background effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  rainDensity: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Base number of rain columns (5-50)'),
  fallSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Base descent rate in relative units (0.1-5)'),
  characterSet: z
    .array(z.string())
    .default([
      'ｱ',
      'ｲ',
      'ｳ',
      'ｴ',
      'ｵ',
      'ｶ',
      'ｷ',
      'ｸ',
      'ｹ',
      'ｺ',
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ])
    .describe(
      'Array of characters to use for rain drops (katakana, numbers, symbols)',
    ),
  glitchProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Chance of character change per frame (0-1)'),
  audioSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe('Audio reaction strength multiplier (0.1-5)'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for frequency analysis'),
  targetIds: z
    .array(z.string())
    .optional()
    .describe(
      'Optional array of component IDs to target with waveform effects',
    ),
  duration: z
    .number()
    .optional()
    .describe('Duration in seconds (defaults to audio duration)'),
  color: z
    .string()
    .default('#00ff00')
    .describe('Color of the rain characters (default: Matrix green)'),
  glowIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(16)
    .describe('Glow intensity in pixels (0-50)'),
  fontSize: z
    .number()
    .min(8)
    .max(32)
    .default(14)
    .describe('Font size of rain characters in pixels (8-32)'),
  blendMode: z
    .enum([
      'normal',
      'screen',
      'overlay',
      'multiply',
      'lighten',
      'color-dodge',
      'difference',
    ])
    .default('screen')
    .describe('CSS mix-blend-mode for overlay effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    rainDensity,
    fallSpeed,
    characterSet,
    glitchProbability,
    audioSensitivity,
    audioSrc,
    targetIds = [],
    duration,
    color,
    glowIntensity,
    fontSize,
    blendMode,
  } = params;

  const { config } = props;
  const fps = config?.fps || 30;
  const viewportHeight = config?.height || 1080;

  // Helper: Generate random character from set
  const getRandomCharacter = () => {
    return characterSet[Math.floor(Math.random() * characterSet.length)];
  };

  // Helper: Generate rain column with multiple drops
  const generateRainColumn = (columnIndex: number): RenderableComponentData => {
    const dropsPerColumn = Math.floor(Math.random() * 5) + 3; // 3-7 drops per column
    const columnDelay = Math.random() * 2; // Random start delay 0-2s

    const drops: RenderableComponentData[] = [];

    for (let i = 0; i < dropsPerColumn; i++) {
      const dropId = `rain-drop-${columnIndex}-${i}`;
      const dropDelay = columnDelay + i * (Math.random() * 0.5 + 0.3); // Staggered drops
      const dropDuration = (viewportHeight / (fallSpeed * 100)) * (1 + Math.random() * 0.5);

      drops.push({
        id: dropId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: getRandomCharacter(),
          style: {
            fontFamily: 'monospace',
            fontSize: `${fontSize}px`,
            color: color,
            textShadow: `0 0 ${glowIntensity / 2}px ${color}, 0 0 ${glowIntensity}px ${color}`,
            display: 'block',
            lineHeight: 1,
          },
        },
        context: {
          timing: {
            start: dropDelay,
            duration: dropDuration,
          },
        },
        effects: [
          // Fall animation
          {
            id: `${dropId}-fall`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: dropDuration,
              mode: 'provider',
              targetIds: [dropId],
              ranges: [
                { key: 'translateY', val: -50, prog: 0 },
                { key: 'translateY', val: viewportHeight + 50, prog: 1 },
              ],
            },
          },
          // Fade out towards bottom
          {
            id: `${dropId}-fade`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: dropDuration,
              mode: 'provider',
              targetIds: [dropId],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return {
      id: `rain-column-${columnIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-0 flex flex-col items-center',
          style: {
            left: `${(columnIndex / rainDensity) * 100}%`,
            width: `${100 / rainDensity}%`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration || 30,
        },
      },
      childrenData: drops,
    } as RenderableComponentData;
  };

  // Generate all rain columns
  const rainColumns: RenderableComponentData[] = [];
  for (let i = 0; i < rainDensity; i++) {
    rainColumns.push(generateRainColumn(i));
  }

  // Root container with audio-reactive overlay
  const rootContainer: RenderableComponentData = {
    id: 'glitch-matrix-rain-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden pointer-events-none',
        style: {
          mixBlendMode: blendMode,
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration || 30,
      },
    },
    childrenData: [
      // Rain columns container
      {
        id: 'rain-columns-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration || 30,
          },
        },
        childrenData: rainColumns,
      } as RenderableComponentData,
      // Hidden audio analyzer (for waveform data)
      {
        id: 'matrix-rain-audio-analyzer',
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: audioSrc,
          volume: 0,
          muted: {
            type: 'full',
            value: true,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration || 30,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Add waveform effect if targetIds provided
  if (targetIds.length > 0) {
    const waveformEffect = {
      id: 'matrix-rain-waveform-effect',
      componentId: 'waveform',
      data: {
        audioSrc: audioSrc,
        audioProperty: 'frequency',
        sensitivity: audioSensitivity,
        effectType: 'custom',
        start: 0,
        duration: duration || 30,
        mode: 'provider',
        targetIds: targetIds,
        // Custom effect function (stringified for storage)
        customEffect: `(freqData) => ({
          rainColumns: Math.floor(${rainDensity} * (1 + freqData.high * 0.5)),
          fallSpeed: ${fallSpeed} * (1 + freqData.bass * 0.3),
          glitchRate: ${glitchProbability} * (1 + freqData.mid * 0.5)
        })`,
      },
    };

    // Add waveform effect to rain columns container
    if (rootContainer.childrenData && rootContainer.childrenData[0]) {
      rootContainer.childrenData[0].effects = [waveformEffect];
    }
  }

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
  id: 'glitchMatrixRain',
  title: 'Glitch Matrix Rain Waveform Effect',
  description:
    'Matrix-style digital rain that reacts to audio frequencies. Higher frequencies spawn more rain drops, bass controls fall speed, and mid-range affects character randomization. Creates a pixelated overlay effect using CSS mix-blend-mode. Perfect for cyberpunk or tech-themed transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'waveform',
    'matrix',
    'rain',
    'digital',
    'glitch',
    'cyberpunk',
    'tech',
    'overlay',
    'effect',
    'audio-reactive',
  ],
  defaultInputParams: {
    rainDensity: 20,
    fallSpeed: 1,
    characterSet: [
      'ｱ',
      'ｲ',
      'ｳ',
      'ｴ',
      'ｵ',
      'ｶ',
      'ｷ',
      'ｸ',
      'ｹ',
      'ｺ',
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    ],
    glitchProbability: 0.3,
    audioSensitivity: 0.8,
    audioSrc: 'https://example.com/audio.mp3',
    targetIds: [],
    color: '#00ff00',
    glowIntensity: 16,
    fontSize: 14,
    blendMode: 'screen',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const glitchMatrixRainPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
