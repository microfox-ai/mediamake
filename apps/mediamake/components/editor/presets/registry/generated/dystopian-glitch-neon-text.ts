/**
 * Dystopian Glitch Neon Text Preset
 *
 * A corrupted holographic text effect featuring:
 * - RGB channel separation with independent glitch displacement
 * - Neon glow that cycles through multiple states (colors, intensities)
 * - Digital noise overlay with randomized opacity flickering
 * - Angular displacement glitches (instant position shifts and skews)
 * - Scanline overlay for additional terminal/CRT aesthetic
 * - All effects are deterministic (looped at fixed intervals) for reproducible renders
 *
 * The effect simulates text viewed through a malfunctioning display terminal,
 * with data corruption causing the outline to fragment, shift, and reassemble.
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ==================== PARAMETER SCHEMA ====================

const presetParams = z.object({
  text: z.string().describe('Text content to display with glitch effects'),
  
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Duration of the effect in seconds'),
  
  fontSize: z
    .number()
    .min(10)
    .max(500)
    .default(72)
    .describe('Font size in pixels (text-7xl equivalent is ~72px)'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family to use for the text'),
  
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "700" for bold)'),
  
  rgbSeparationIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Intensity of RGB channel separation in pixels (higher = more separation)'),
  
  glitchFrequency: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Frequency multiplier for glitch effects (higher = more frequent glitches)'),
  
  noiseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Maximum opacity of noise overlay (0 = no noise, 1 = full opacity)'),
  
  glowIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for neon glow effects (0 = no glow, 3 = very intense)'),
  
  displacementIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe('Intensity of displacement glitches in pixels'),
  
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex format, e.g., "#000000" for black)'),
});

// ==================== PRESET EXECUTION ====================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    rgbSeparationIntensity,
    glitchFrequency,
    noiseIntensity,
    glowIntensity,
    displacementIntensity,
    backgroundColor,
  } = params;

  // Generate unique IDs
  const rootId = 'dystopian-glitch-root';
  const redLayerId = 'rgb-red-layer';
  const greenLayerId = 'rgb-green-layer';
  const blueLayerId = 'rgb-blue-layer';
  const mainTextLayerId = 'main-text-layer';
  const noiseOverlayId = 'noise-overlay';
  const scanlineOverlayId = 'scanline-overlay';

  // Calculate effect timings based on frequency
  const rgbRedDuration = 1 / glitchFrequency;
  const rgbGreenDuration = 1.2 / glitchFrequency;
  const rgbBlueDuration = 1.5 / glitchFrequency;
  const glowDuration = 2 / glitchFrequency;
  const displacementDuration = 3 / glitchFrequency;
  const noiseDuration = 2.5 / glitchFrequency;

  // ==================== RGB CHANNEL LAYERS ====================

  // Red channel layer
  const redLayer: RenderableComponentData = {
    id: redLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        position: 'absolute',
        inset: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: '#ef4444', // red-500
        mixBlendMode: 'screen',
        willChange: 'transform',
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
    effects: [
      {
        id: 'rgb-red-displacement',
        componentId: 'generic',
        data: {
          type: 'steps',
          start: 0,
          duration: rgbRedDuration,
          mode: 'provider',
          targetIds: [redLayerId],
          ranges: [
            { key: 'translateX', val: -rgbSeparationIntensity, prog: 0 },
            { key: 'translateX', val: rgbSeparationIntensity, prog: 0.25 },
            { key: 'translateX', val: -rgbSeparationIntensity, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Green channel layer
  const greenLayer: RenderableComponentData = {
    id: greenLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        position: 'absolute',
        inset: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: '#22c55e', // green-500
        mixBlendMode: 'screen',
        willChange: 'transform',
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
    effects: [
      {
        id: 'rgb-green-displacement',
        componentId: 'generic',
        data: {
          type: 'steps',
          start: 0,
          duration: rgbGreenDuration,
          mode: 'provider',
          targetIds: [greenLayerId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -rgbSeparationIntensity * 1.5, prog: 0.3 },
            { key: 'translateX', val: 0, prog: 0.6 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Blue channel layer
  const blueLayer: RenderableComponentData = {
    id: blueLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        position: 'absolute',
        inset: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: '#3b82f6', // blue-500
        mixBlendMode: 'screen',
        willChange: 'transform',
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
    effects: [
      {
        id: 'rgb-blue-displacement',
        componentId: 'generic',
        data: {
          type: 'steps',
          start: 0,
          duration: rgbBlueDuration,
          mode: 'provider',
          targetIds: [blueLayerId],
          ranges: [
            { key: 'translateX', val: rgbSeparationIntensity, prog: 0 },
            { key: 'translateX', val: 0, prog: 0.24 },
            { key: 'translateX', val: rgbSeparationIntensity, prog: 0.48 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ==================== MAIN TEXT LAYER ====================

  const mainTextLayer: RenderableComponentData = {
    id: mainTextLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        position: 'absolute',
        inset: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: '#ffffff',
        willChange: 'transform, filter',
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
    effects: [
      // Glow pulse effect
      {
        id: 'glow-pulse-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: glowDuration,
          mode: 'provider',
          targetIds: [mainTextLayerId],
          ranges: [
            {
              key: 'filter',
              val: `drop-shadow(0 0 ${10 * glowIntensity}px #ffffff) brightness(1) contrast(1)`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 ${20 * glowIntensity}px #00ffff) brightness(${1 + 0.5 * glowIntensity}) contrast(${1 + glowIntensity})`,
              prog: 0.33,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 ${5 * glowIntensity}px #ff00ff) brightness(${Math.max(0.5, 1 - 0.5 * glowIntensity)}) contrast(${Math.max(0.5, 1 - 0.5 * glowIntensity)})`,
              prog: 0.66,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 ${10 * glowIntensity}px #ffffff) brightness(1) contrast(1)`,
              prog: 1,
            },
          ],
        },
      },
      // Displacement glitch effect
      {
        id: 'displacement-glitch-effect',
        componentId: 'generic',
        data: {
          type: 'steps',
          start: 0,
          duration: displacementDuration,
          mode: 'provider',
          targetIds: [mainTextLayerId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'skewX', val: 0, prog: 0 },
            { key: 'translateX', val: displacementIntensity, prog: 0.4 },
            { key: 'skewX', val: 5, prog: 0.4 },
            { key: 'translateX', val: 0, prog: 0.41 },
            { key: 'skewX', val: 0, prog: 0.41 },
            { key: 'translateX', val: -displacementIntensity * 0.8, prog: 0.7 },
            { key: 'skewX', val: -3, prog: 0.7 },
            { key: 'translateX', val: 0, prog: 0.71 },
            { key: 'skewX', val: 0, prog: 0.71 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'skewX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ==================== NOISE OVERLAY ====================

  // Create a noise pattern using CSS (data URI approach)
  const noiseOverlay: RenderableComponentData = {
    id: noiseOverlayId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `
            repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0.03) 0px,
              rgba(0, 0, 0, 0.03) 1px,
              rgba(255, 255, 255, 0.03) 2px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.03) 0px,
              rgba(0, 0, 0, 0.03) 1px,
              rgba(255, 255, 255, 0.03) 2px
            )
          `,
          mixBlendMode: 'overlay',
          willChange: 'opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'noise-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'steps',
          start: 0,
          duration: noiseDuration,
          mode: 'provider',
          targetIds: [noiseOverlayId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: noiseIntensity, prog: 0.15 },
            { key: 'opacity', val: noiseIntensity * 0.33, prog: 0.2 },
            { key: 'opacity', val: 0, prog: 0.35 },
            { key: 'opacity', val: noiseIntensity * 0.83, prog: 0.5 },
            { key: 'opacity', val: noiseIntensity * 0.17, prog: 0.55 },
            { key: 'opacity', val: 0, prog: 0.7 },
            { key: 'opacity', val: noiseIntensity * 0.67, prog: 0.85 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ==================== SCANLINE OVERLAY ====================

  const scanlineOverlay: RenderableComponentData = {
    id: scanlineOverlayId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          mixBlendMode: 'overlay',
          opacity: 0.5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // ==================== ROOT CONTAINER ====================

  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
          willChange: 'transform, filter',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      redLayer,
      greenLayer,
      blueLayer,
      mainTextLayer,
      noiseOverlay,
      scanlineOverlay,
    ] as RenderableComponentData[],
  };

  // ==================== OUTPUT ====================

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ==================== PRESET METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'dystopian-glitch-neon-text',
  title: 'Dystopian Glitch Neon Text',
  description:
    'A corrupted holographic text effect with RGB channel separation, neon glow cycling, digital noise interference, and angular displacement glitches. Creates a dystopian digital aesthetic with text that appears to struggle maintaining coherence through a malfunctioning display terminal.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'neon',
    'rgb-split',
    'dystopian',
    'digital',
    'corrupted',
    'holographic',
    'terminal',
    'cyberpunk',
    'effects',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GLITCH',
    duration: 10,
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    rgbSeparationIntensity: 2,
    glitchFrequency: 1,
    noiseIntensity: 0.3,
    glowIntensity: 1,
    displacementIntensity: 10,
    backgroundColor: '#000000',
  },
};

// ==================== EXPORT ====================

export const dystopianGlitchNeonTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
