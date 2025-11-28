/**
 * Water Ripple Typography Preset
 *
 * This preset creates fluid, watery text typography that simulates light refracting 
 * through water ripples. Each word appears with a "splash" effect that propagates 
 * outward, creating continuous wave motion with brightness variations that simulate 
 * caustic light patterns dancing on water.
 *
 * Features:
 * - **Wave Motion**: Continuous sinusoidal translateY and skewX transforms
 * - **Caustic Light Patterns**: Brightness oscillation synchronized with wave peaks
 * - **Chromatic Aberration**: Multiple text-shadow layers with RGB channel offsets
 * - **Ripple Propagation**: Staggered word-level timing creates outward ripple effect
 * - **Underwater Color Shifts**: Blue-cyan tint with hue rotation
 * - **Complex Interference**: Overlapping wave cycles create realistic water patterns
 *
 * Use cases:
 * - Creating immersive water-themed typography
 * - Adding dynamic liquid motion effects to text
 * - Building aquatic/underwater visual themes
 * - Creating light refraction simulations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
  TextAtomData,
} from '@microfox/remotion';

// --- PARAMS SCHEMA ---
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),
  
  baseColor: z
    .string()
    .default('#00C8FF')
    .optional()
    .describe('Base water color (cyan-blue tint)'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .optional()
    .describe('Base font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (e.g., "Inter", "Roboto:700")'),
  
  waveIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe('Wave motion intensity multiplier'),
  
  glowIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe('Glow and shadow intensity multiplier'),
  
  waveCycleDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .optional()
    .describe('Duration of one complete wave cycle in seconds'),
  
  rippleDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .optional()
    .describe('Delay between word ripple propagation in seconds'),
  
  chromaticIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .optional()
    .describe('Chromatic aberration intensity (RGB offset in pixels)'),
});

// --- PRESET EXECUTION ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    baseColor = '#00C8FF',
    fontSize = 64,
    fontFamily = 'Inter',
    waveIntensity = 1,
    glowIntensity = 1,
    waveCycleDuration = 0.3,
    rippleDelay = 0.1,
    chromaticIntensity = 2,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontStr: string) => {
    const fontParts = fontStr.split(':');
    const family = fontParts[0];
    const weight = fontParts.length > 1 ? fontParts[1] : '700';
    const style = fontParts.length > 2 ? fontParts[2] : 'normal';
    return { family, weight, style };
  };

  const font = parseFontString(fontFamily);
  
  // Helper: Convert hex to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 200, b: 255 };
  };

  const rgb = hexToRgb(baseColor);

  // Build caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption: TranscriptionSentence, captionIndex: number) => {
      const { words, absoluteStart, duration } = caption;
      const captionImpact = caption.metadata?.impact ?? 1;

      // Build word components
      const wordComponents: RenderableComponentData[] = words.map(
        (word, wordIndex: number) => {
          const wordId = `water-word-${captionIndex}-${wordIndex}`;
          const globalWordIndex = captionIndex * 100 + wordIndex;

          // Calculate staggered timing for ripple effect
          const rippleOffset = wordIndex * rippleDelay;
          const splashDuration = 0.4;

          // Word text atom with water styling
          const textData: TextAtomData = {
            text: word.text,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: font.weight,
              fontStyle: font.style as any,
              color: baseColor,
              textShadow: `
                0 0 ${20 * glowIntensity}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6),
                0 0 ${40 * glowIntensity}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4),
                ${chromaticIntensity}px 0 0 rgba(255, 0, 0, 0.3),
                ${-chromaticIntensity}px 0 0 rgba(0, 0, 255, 0.3),
                0 ${chromaticIntensity}px 0 rgba(0, 255, 0, 0.2)
              `.trim(),
              marginRight: '0.3em',
              willChange: 'transform, filter',
            },
            font: {
              family: font.family,
              weights: [font.weight],
              display: 'swap',
              preload: true,
            },
          };

          // Splash entry effect
          const splashEffect: GenericEffectData = {
            type: 'ease-out',
            start: rippleOffset,
            duration: splashDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'translateY', val: 30 * waveIntensity, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'scale', val: 0.85, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          };

          // Continuous wave motion effect
          const waveEffect: GenericEffectData = {
            type: 'linear',
            start: rippleOffset + splashDuration,
            duration: waveCycleDuration,
            loop: true,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -8 * waveIntensity, prog: 0.25 },
              { key: 'translateY', val: 0, prog: 0.5 },
              { key: 'translateY', val: 8 * waveIntensity, prog: 0.75 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'skewX', val: 0, prog: 0 },
              { key: 'skewX', val: -2 * waveIntensity, prog: 0.25 },
              { key: 'skewX', val: 0, prog: 0.5 },
              { key: 'skewX', val: 2 * waveIntensity, prog: 0.75 },
              { key: 'skewX', val: 0, prog: 1 },
            ],
          };

          // Brightness oscillation (caustic light)
          const brightnessEffect: GenericEffectData = {
            type: 'ease-in-out',
            start: rippleOffset + splashDuration,
            duration: waveCycleDuration,
            loop: true,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'brightness', val: 1, prog: 0 },
              { key: 'brightness', val: 1.3 * captionImpact, prog: 0.5 },
              { key: 'brightness', val: 1, prog: 1 },
            ],
          };

          // Hue shift (underwater color changes)
          const hueShiftEffect: GenericEffectData = {
            type: 'linear',
            start: rippleOffset + splashDuration,
            duration: waveCycleDuration * 2,
            loop: true,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'hue-rotate', val: 0, prog: 0 },
              { key: 'hue-rotate', val: 20, prog: 0.5 },
              { key: 'hue-rotate', val: 0, prog: 1 },
            ],
          };

          return {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: textData,
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [
              {
                id: `splash-${wordId}`,
                componentId: 'generic',
                data: splashEffect,
              },
              {
                id: `wave-${wordId}`,
                componentId: 'generic',
                data: waveEffect,
              },
              {
                id: `brightness-${wordId}`,
                componentId: 'generic',
                data: brightnessEffect,
              },
              {
                id: `hue-${wordId}`,
                componentId: 'generic',
                data: hueShiftEffect,
              },
            ],
          } as RenderableComponentData;
        },
      );

      // Caption container
      return {
        id: `water-caption-${captionIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
          repeatChildrenProps: {
            className: 'inline-block',
            style: {
              willChange: 'transform, filter',
            },
          },
        },
        context: {
          timing: {
            start: absoluteStart,
            duration: duration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'water-ripple-text-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'children',
      },
    },
    childrenData: captionContainers,
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

// --- METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'water-ripple-text',
  title: 'Water Ripple Typography',
  description:
    'Fluid, watery text typography preset that simulates light refracting through water ripples with caustic light patterns, chromatic aberration, and continuous wave motion. Each word splashes into view with propagating ripple effects synchronized to caption timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'water',
    'ripple',
    'caustic',
    'liquid',
    'refraction',
    'wave',
    'fluid',
    'underwater',
    'chromatic-aberration',
    'kinetic',
    'captions',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Water ripples through light',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            text: 'Water',
            start: 0,
            absoluteStart: 0,
            end: 0.6,
            absoluteEnd: 0.6,
            duration: 0.6,
          },
          {
            text: 'ripples',
            start: 0.6,
            absoluteStart: 0.6,
            end: 1.2,
            absoluteEnd: 1.2,
            duration: 0.6,
          },
          {
            text: 'through',
            start: 1.2,
            absoluteStart: 1.2,
            end: 1.8,
            absoluteEnd: 1.8,
            duration: 0.6,
          },
          {
            text: 'light',
            start: 1.8,
            absoluteStart: 1.8,
            end: 3,
            absoluteEnd: 3,
            duration: 1.2,
          },
        ],
      },
    ],
    baseColor: '#00C8FF',
    fontSize: 64,
    fontFamily: 'Inter',
    waveIntensity: 1,
    glowIntensity: 1,
    waveCycleDuration: 0.3,
    rippleDelay: 0.1,
    chromaticIntensity: 2,
  },
};

// --- EXPORT ---
export const waterRippleTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
