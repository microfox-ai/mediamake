/**
 * Glitch Typokinetic Downbeat Preset
 *
 * This preset creates a glitch-style typokinetic effect where a single word appears with
 * digital distortion on the downbeat. It features chromatic aberration (RGB channel separation),
 * horizontal scan lines, opacity flickers, and damped horizontal jitter to simulate analog
 * video interference synchronized with bass hits.
 *
 * Features:
 * - **RGB Channel Separation**: Three overlapping text layers (red, green, blue) that converge
 * - **Chromatic Aberration**: Channels start separated and converge over 150ms
 * - **Scan Lines**: Horizontal lines overlay to simulate analog video interference
 * - **Opacity Flicker**: Brief opacity variations in first 100ms
 * - **Horizontal Jitter**: Damped translateX oscillation that settles quickly
 * - **Digital Aesthetic**: Monospace font for tech/glitch feel
 *
 * Use cases:
 * - Music video beat drops with glitch emphasis
 * - Tech/cyberpunk title reveals
 * - Bass-hit synchronized text effects
 * - Digital distortion overlays for modern aesthetics
 * - Kinetic typography with analog interference simulation
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, BaseEffect } from '@microfox/remotion';

// --- Preset Parameters Schema ---
const presetParams = z.object({
  word: z.string().describe('The word to display with glitch effect'),
  timing: z
    .object({
      start: z
        .number()
        .default(0)
        .describe('Start time in seconds (relative to parent)'),
      duration: z
        .number()
        .default(2)
        .describe('Duration in seconds for the entire effect'),
    })
    .optional()
    .describe('Timing configuration for the glitch effect'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the main text (after convergence)'),
  fontSize: z
    .number()
    .default(96)
    .describe('Font size in pixels for the text'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "bold", "700", "900")'),
  convergenceDuration: z
    .number()
    .default(0.15)
    .describe('Duration in seconds for RGB channels to converge (default: 150ms)'),
  flickerDuration: z
    .number()
    .default(0.1)
    .describe('Duration in seconds for opacity flicker effect (default: 100ms)'),
  jitterDuration: z
    .number()
    .default(0.2)
    .describe('Duration in seconds for horizontal jitter dampening (default: 200ms)'),
  jitterIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Intensity of horizontal jitter in pixels (default: 3px)'),
  scanLineCount: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Number of horizontal scan lines (default: 20)'),
  rgbSeparation: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Initial RGB channel separation in pixels (default: 2px)'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    word,
    timing = { start: 0, duration: 2 },
    textColor,
    fontSize,
    fontWeight,
    convergenceDuration,
    flickerDuration,
    jitterDuration,
    jitterIntensity,
    scanLineCount,
    rgbSeparation,
  } = params;

  const { start, duration } = timing;

  // Helper function to create scan line divs (inside presetExecution)
  const createScanLines = (count: number): RenderableComponentData[] => {
    const scanLines: RenderableComponentData[] = [];
    for (let i = 0; i < count; i++) {
      scanLines.push({
        id: `scanline-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="h-px bg-black/10 w-full"></div>`,
          className: '',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData);
    }
    return scanLines;
  };

  // --- RGB Channel Text Atoms ---
  const redChannelId = 'glitch-red-channel';
  const greenChannelId = 'glitch-green-channel';
  const blueChannelId = 'glitch-blue-channel';
  const mainTextId = 'glitch-main-text';

  // RGB Red Channel (starts at translateX: -rgbSeparation, converges to 0)
  const redChannelEffect: BaseEffect = {
    id: 'rgb-red-converge',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: convergenceDuration,
      mode: 'provider',
      targetIds: [redChannelId],
      ranges: [
        { key: 'translateX', val: -rgbSeparation, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const redChannel: RenderableComponentData = {
    id: redChannelId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: word,
      className: 'absolute text-red-500 font-mono font-bold mix-blend-screen',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        textShadow: '0 0 10px rgba(255, 0, 0, 0.5)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [redChannelEffect],
  };

  // RGB Green Channel (starts at translateX: 0, stays at 0)
  const greenChannelEffect: BaseEffect = {
    id: 'rgb-green-converge',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: convergenceDuration,
      mode: 'provider',
      targetIds: [greenChannelId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const greenChannel: RenderableComponentData = {
    id: greenChannelId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: word,
      className: 'absolute text-green-500 font-mono font-bold mix-blend-screen',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        textShadow: '0 0 10px rgba(0, 255, 0, 0.5)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [greenChannelEffect],
  };

  // RGB Blue Channel (starts at translateX: +rgbSeparation, converges to 0)
  const blueChannelEffect: BaseEffect = {
    id: 'rgb-blue-converge',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: convergenceDuration,
      mode: 'provider',
      targetIds: [blueChannelId],
      ranges: [
        { key: 'translateX', val: rgbSeparation, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const blueChannel: RenderableComponentData = {
    id: blueChannelId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: word,
      className: 'absolute text-blue-500 font-mono font-bold mix-blend-screen',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        textShadow: '0 0 10px rgba(0, 0, 255, 0.5)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [blueChannelEffect],
  };

  // --- Main Text (fades in slightly delayed, at 50ms = 0.05s) ---
  const mainTextFadeEffect: BaseEffect = {
    id: 'main-text-fade-in',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0.05,
      duration: convergenceDuration - 0.05,
      mode: 'provider',
      targetIds: [mainTextId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: word,
      className: 'font-mono font-bold text-white',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [mainTextFadeEffect],
  };

  // --- Opacity Flicker Effect (applied to all text layers) ---
  // Flicker sequence: [0, 1, 0.3, 1, 0.7, 1] over first 100ms
  const flickerEffect: BaseEffect = {
    id: 'opacity-flicker',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: flickerDuration,
      mode: 'provider',
      targetIds: [redChannelId, greenChannelId, blueChannelId, mainTextId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
        { key: 'opacity', val: 0.3, prog: 0.4 },
        { key: 'opacity', val: 1, prog: 0.6 },
        { key: 'opacity', val: 0.7, prog: 0.8 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // --- Horizontal Jitter Effect (damped translateX oscillation) ---
  // Jitter sequence: [0, -3, 2, -1, 0] over 200ms
  const jitterEffect: BaseEffect = {
    id: 'horizontal-jitter',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: jitterDuration,
      mode: 'provider',
      targetIds: [redChannelId, greenChannelId, blueChannelId, mainTextId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -jitterIntensity, prog: 0.25 },
        { key: 'translateX', val: jitterIntensity * 0.66, prog: 0.5 },
        { key: 'translateX', val: -jitterIntensity * 0.33, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Apply flicker and jitter to all channels
  redChannel.effects!.push(flickerEffect, jitterEffect);
  greenChannel.effects!.push(flickerEffect, jitterEffect);
  blueChannel.effects!.push(flickerEffect, jitterEffect);
  mainText.effects!.push(flickerEffect, jitterEffect);

  // --- Scan Lines Overlay ---
  const scanLinesOverlay: RenderableComponentData = {
    id: 'scanlines-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col gap-1 pointer-events-none justify-around',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: createScanLines(scanLineCount),
  };

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'glitch-typokinetic-downbeat-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: start,
        duration: duration,
      },
    },
    childrenData: [
      scanLinesOverlay,
      redChannel,
      greenChannel,
      blueChannel,
      mainText,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'glitch-typokinetic-downbeat',
  title: 'Glitch Typokinetic Downbeat',
  description:
    'A glitch-style typokinetic preset where a single word appears with digital distortion effects synced to audio downbeats. Features chromatic RGB channel separation that converges over 150ms, horizontal scan lines, opacity flickers, and damped horizontal jitter. The word breaks through digital noise with analog video interference simulation, creating a dramatic beat drop emphasis effect perfect for music videos and tech content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'glitch',
    'kinetic',
    'downbeat',
    'chromatic-aberration',
    'rgb-split',
    'scanlines',
    'jitter',
    'tech',
    'music-video',
    'beat-drop',
    'distortion',
  ],
  dependencies: {},
  defaultInputParams: {
    word: 'GLITCH',
    timing: {
      start: 0,
      duration: 2,
    },
    textColor: '#FFFFFF',
    fontSize: 96,
    fontWeight: 'bold',
    convergenceDuration: 0.15,
    flickerDuration: 0.1,
    jitterDuration: 0.2,
    jitterIntensity: 3,
    scanLineCount: 20,
    rgbSeparation: 2,
  },
};

// --- Export Preset ---
export const glitchTypokineticDownbeatPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
