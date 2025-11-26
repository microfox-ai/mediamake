/**
 * VHS Vintage Filter Preset
 *
 * This preset applies a comprehensive VHS tape aesthetic to video content, delivering a strong
 * vintage look with multiple layered effects that simulate analog video artifacts.
 *
 * Features:
 * - **Chromatic Aberration**: RGB channel separation for authentic VHS color bleeding
 * - **Scanlines**: Horizontal lines with scrolling animation mimicking CRT displays
 * - **Analog Noise**: Static grain effect with flickering intensity
 * - **Frame Jitter**: Random horizontal displacement simulating tape tracking issues
 * - **Color Grading**: Vintage color shift with desaturation and warm sepia tone
 *
 * Use Cases:
 * - Retro/nostalgic video content
 * - Music videos with 80s/90s aesthetic
 * - Horror/thriller atmospheric effects
 * - Creative transitions and overlays
 * - Vintage documentary style
 *
 * Technical Details:
 * - Full-frame overlay covering entire composition
 * - All layers use fitDurationTo for continuous effect throughout video
 * - Multiple blend modes (screen, overlay, multiply) for realistic VHS look
 * - Adjustable intensity via impact parameter
 * - Non-destructive overlay (does not modify original content)
 */

import { RenderableComponentData } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  intensity: z
    .number()
    .min(0.1)
    .max(3.0)
    .default(1.5)
    .describe('Overall intensity multiplier for all VHS effects (0.1 = subtle, 3.0 = extreme)'),
  chromaticAberration: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Strength of RGB channel separation in pixels'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity of horizontal scanlines (0 = invisible, 1 = solid)'),
  noiseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.25)
    .describe('Intensity of analog noise/grain effect (0 = none, 1 = maximum)'),
  jitterAmount: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Maximum horizontal displacement for frame jitter in pixels'),
  colorShift: z
    .object({
      saturation: z
        .number()
        .min(0)
        .max(2)
        .default(0.8)
        .describe('Color saturation level (0 = grayscale, 1 = normal, 2 = oversaturated)'),
      hueRotate: z
        .number()
        .min(-180)
        .max(180)
        .default(-5)
        .describe('Hue rotation in degrees for vintage color shift'),
      sepia: z
        .number()
        .min(0)
        .max(1)
        .default(0.2)
        .describe('Sepia tone intensity for warm vintage look'),
    })
    .default({
      saturation: 0.8,
      hueRotate: -5,
      sepia: 0.2,
    })
    .describe('Color grading settings for vintage tone'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { intensity, chromaticAberration, scanlineOpacity, noiseIntensity, jitterAmount, colorShift } = params;
  const { config } = props;

  // Get composition duration from config
  const compositionDuration = config?.duration || 30;

  // Calculate adjusted values based on intensity
  const adjustedChromatic = chromaticAberration * intensity;
  const adjustedScanlineOpacity = Math.min(scanlineOpacity * intensity, 1);
  const adjustedNoiseIntensity = Math.min(noiseIntensity * intensity, 1);
  const adjustedJitter = jitterAmount * intensity;

  // Generate random jitter keyframes (10 keyframes for natural variation)
  const generateJitterKeyframes = () => {
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];
    const numKeyframes = 10;
    
    for (let i = 0; i <= numKeyframes; i++) {
      const progress = i / numKeyframes;
      const randomJitter = (Math.random() - 0.5) * 2 * adjustedJitter;
      keyframes.push({
        key: 'translateX',
        val: randomJitter,
        prog: progress,
      });
    }
    
    return keyframes;
  };

  // Generate noise flicker keyframes
  const generateNoiseKeyframes = () => {
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];
    const numKeyframes = 20;
    
    for (let i = 0; i <= numKeyframes; i++) {
      const progress = i / numKeyframes;
      const baseOpacity = 0.3 + adjustedNoiseIntensity * 0.7;
      const flicker = (Math.random() - 0.5) * 0.2 * adjustedNoiseIntensity;
      keyframes.push({
        key: 'opacity',
        val: Math.max(0, Math.min(1, baseOpacity + flicker)),
        prog: progress,
      });
    }
    
    return keyframes;
  };

  // ============================================================================
  // COMPONENT STRUCTURE
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'vhs-vintage-filter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden pointer-events-none',
        style: {
          zIndex: 1000,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: compositionDuration,
      },
    },
    childrenData: [
      // Chromatic Aberration Layer
      {
        id: 'vhs-chromatic-layer',
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shapeType: 'rectangle',
          width: '100%',
          height: '100%',
          fill: 'transparent',
          mixBlendMode: 'screen',
        },
        context: {
          timing: {
            start: 0,
            duration: compositionDuration,
          },
        },
        effects: [
          {
            id: 'chromatic-effect-1',
            componentId: 'vhs-chromatic-layer',
            data: {
              type: 'linear',
              start: 0,
              duration: compositionDuration,
              mode: 'provider',
              targetIds: ['vhs-chromatic-layer'],
              ranges: [
                { key: 'filter', val: `drop-shadow(${adjustedChromatic}px 0 0 rgba(255,0,0,0.7)) drop-shadow(-${adjustedChromatic}px 0 0 rgba(0,255,255,0.7))`, prog: 0 },
                { key: 'filter', val: `drop-shadow(${adjustedChromatic}px 0 0 rgba(255,0,0,0.7)) drop-shadow(-${adjustedChromatic}px 0 0 rgba(0,255,255,0.7))`, prog: 1 },
              ],
            },
          },
        ],
      },

      // Scanline Layer
      {
        id: 'vhs-scanline-layer',
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shapeType: 'rectangle',
          width: '100%',
          height: '100%',
          fill: 'transparent',
          style: {
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
            backgroundSize: '100% 4px',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: compositionDuration,
          },
        },
        effects: [
          {
            id: 'scanline-scroll-effect',
            componentId: 'vhs-scanline-layer',
            data: {
              type: 'linear',
              start: 0,
              duration: compositionDuration,
              mode: 'provider',
              targetIds: ['vhs-scanline-layer'],
              ranges: [
                { key: 'opacity', val: adjustedScanlineOpacity, prog: 0 },
                { key: 'opacity', val: adjustedScanlineOpacity, prog: 1 },
                { key: 'backgroundPositionY', val: 0, prog: 0 },
                { key: 'backgroundPositionY', val: 100, prog: 1 },
              ],
            },
          },
        ],
      },

      // Noise Layer
      {
        id: 'vhs-noise-layer',
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shapeType: 'rectangle',
          width: '100%',
          height: '100%',
          fill: 'transparent',
          mixBlendMode: 'overlay',
          style: {
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            filter: `contrast(150%) brightness(110%)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: compositionDuration,
          },
        },
        effects: [
          {
            id: 'noise-flicker-effect',
            componentId: 'vhs-noise-layer',
            data: {
              type: 'linear',
              start: 0,
              duration: compositionDuration,
              mode: 'provider',
              targetIds: ['vhs-noise-layer'],
              ranges: generateNoiseKeyframes(),
            },
          },
        ],
      },

      // Frame Jitter Container
      {
        id: 'vhs-jitter-container',
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
            duration: compositionDuration,
          },
        },
        effects: [
          {
            id: 'frame-jitter-effect',
            componentId: 'vhs-jitter-container',
            data: {
              type: 'linear',
              start: 0,
              duration: compositionDuration,
              mode: 'provider',
              targetIds: ['vhs-jitter-container'],
              ranges: generateJitterKeyframes(),
            },
          },
        ],
        childrenData: [
          // Color Shift Overlay
          {
            id: 'vhs-color-shift',
            type: 'atom',
            componentId: 'ShapeAtom',
            data: {
              shapeType: 'rectangle',
              width: '100%',
              height: '100%',
              fill: 'transparent',
              mixBlendMode: 'multiply',
            },
            context: {
              timing: {
                start: 0,
                duration: compositionDuration,
              },
            },
            effects: [
              {
                id: 'color-shift-effect',
                componentId: 'vhs-color-shift',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: compositionDuration,
                  mode: 'provider',
                  targetIds: ['vhs-color-shift'],
                  ranges: [
                    { 
                      key: 'filter', 
                      val: `saturate(${colorShift.saturation}) hue-rotate(${colorShift.hueRotate}deg) sepia(${colorShift.sepia})`, 
                      prog: 0 
                    },
                    { 
                      key: 'filter', 
                      val: `saturate(${colorShift.saturation}) hue-rotate(${colorShift.hueRotate}deg) sepia(${colorShift.sepia})`, 
                      prog: 1 
                    },
                    { key: 'opacity', val: 0.85, prog: 0 },
                    { key: 'opacity', val: 0.85, prog: 1 },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'vhs-vintage-filter',
  title: 'VHS Vintage Filter',
  description:
    'Strong VHS look with chromatic aberration, noise, and frame jitter. Applies vintage tape aesthetic with RGB split, scanlines, analog noise, and random frame shake for an authentic retro effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['vhs', 'vintage', 'retro', 'filter', 'overlay', 'chromatic-aberration', 'noise', 'jitter', 'glitch', 'analog', '80s', '90s', 'effects'],
  defaultInputParams: {
    intensity: 1.5,
    chromaticAberration: 8,
    scanlineOpacity: 0.6,
    noiseIntensity: 0.25,
    jitterAmount: 4,
    colorShift: {
      saturation: 0.8,
      hueRotate: -5,
      sepia: 0.2,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const vhsVintageFilterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
