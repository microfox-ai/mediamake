/**
 * Cinematic Multi-Blur Text Reveal Preset
 *
 * This preset creates a production-quality cinematic text reveal with a sophisticated
 * vertical gradient mask and three-layer blur crossfade effect that simulates a
 * professional focus-pull effect.
 *
 * Features:
 * - **Three-Layer Blur System**: Heavy blur (20px), medium blur (10px), and sharp text
 *   layers that crossfade during reveal
 * - **Vertical Gradient Mask**: Multi-feather zone gradient with three distinct blur
 *   levels creating a depth-of-field effect
 * - **Focus Pull Simulation**: Text transitions from blurry to sharp as mask reveals,
 *   mimicking camera focus pulling
 * - **Subtle Scale Effect**: 1.05 to 1 scale for z-axis movement illusion
 * - **GPU Acceleration**: Uses transform: translate3d() and backface-visibility: hidden
 *   for optimized performance
 * - **Synchronized Animations**: Blur layers crossfade in sync with mask position
 *
 * Use cases:
 * - Creating professional title animations for films and videos
 * - Building cinematic text reveals with production-quality effects
 * - Adding sophisticated focus-pull effects to text
 * - Creating depth-of-field style text animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameters Schema ---

const presetParams = z.object({
  text: z.string().describe('Text content to display with cinematic reveal'),
  fontSize: z
    .string()
    .default('64px')
    .describe('Font size (e.g., "64px", "5rem")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto")'),
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (e.g., "#FFFFFF", "rgba(255,255,255,0.9)")'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of the reveal animation in seconds'),
  maskStartProgress: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Progress (0-1) when mask animation starts'),
  maskEndProgress: z
    .number()
    .min(0)
    .max(1)
    .default(0.9)
    .describe('Progress (0-1) when mask animation ends'),
  scaleIntensity: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.05)
    .describe('Scale effect intensity (default: 0.05 for 1.05x scale)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontWeight,
    fontFamily,
    color,
    duration,
    maskStartProgress,
    maskEndProgress,
    scaleIntensity,
  } = params;

  // Calculate timing for blur layer crossfades
  const heavyBlurFadeOutStart = duration * 0.0;
  const heavyBlurFadeOutDuration = duration * 0.5;

  const mediumBlurFadeStart = duration * 0.3;
  const mediumBlurFadeDuration = duration * 0.4;

  const sharpLayerFadeStart = duration * 0.5;
  const sharpLayerFadeDuration = duration * 0.5;

  // Calculate mask animation timing
  const maskAnimationStart = duration * maskStartProgress;
  const maskAnimationDuration = duration * (maskEndProgress - maskStartProgress);

  // Base text style
  const baseTextStyle = {
    fontSize,
    fontWeight,
    color,
    textAlign: 'center' as const,
    transform: 'translate3d(0, 0, 0)',
    backfaceVisibility: 'hidden' as const,
  };

  // --- Text Layer 1: Heavy Blur (20px) ---
  const textLayerBlurHeavy: RenderableComponentData = {
    id: 'text-layer-blur-heavy',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        ...baseTextStyle,
        filter: 'blur(20px)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Fade out heavy blur layer
      {
        id: 'heavy-blur-fadeout',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: heavyBlurFadeOutStart,
          duration: heavyBlurFadeOutDuration,
          mode: 'provider',
          targetIds: ['text-layer-blur-heavy'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Scale effect
      {
        id: 'heavy-blur-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['text-layer-blur-heavy'],
          ranges: [
            { key: 'scale', val: 1 + scaleIntensity, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- Text Layer 2: Medium Blur (10px) ---
  const textLayerBlurMedium: RenderableComponentData = {
    id: 'text-layer-blur-medium',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        ...baseTextStyle,
        filter: 'blur(10px)',
        opacity: 0,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Crossfade in medium blur layer
      {
        id: 'medium-blur-fadein',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: mediumBlurFadeStart,
          duration: mediumBlurFadeDuration * 0.5,
          mode: 'provider',
          targetIds: ['text-layer-blur-medium'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Crossfade out medium blur layer
      {
        id: 'medium-blur-fadeout',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: mediumBlurFadeStart + mediumBlurFadeDuration * 0.5,
          duration: mediumBlurFadeDuration * 0.5,
          mode: 'provider',
          targetIds: ['text-layer-blur-medium'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Scale effect
      {
        id: 'medium-blur-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['text-layer-blur-medium'],
          ranges: [
            { key: 'scale', val: 1 + scaleIntensity, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- Text Layer 3: Sharp (0px blur) ---
  const textLayerSharp: RenderableComponentData = {
    id: 'text-layer-sharp',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        ...baseTextStyle,
        filter: 'blur(0px)',
        opacity: 0,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Fade in sharp layer
      {
        id: 'sharp-layer-fadein',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: sharpLayerFadeStart,
          duration: sharpLayerFadeDuration,
          mode: 'provider',
          targetIds: ['text-layer-sharp'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Scale effect
      {
        id: 'sharp-layer-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['text-layer-sharp'],
          ranges: [
            { key: 'scale', val: 1 + scaleIntensity, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- Gradient Mask Layer ---
  const gradientMask: RenderableComponentData = {
    id: 'gradient-mask',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 60%, black 100%); transform: translate3d(0, 0, 0); backface-visibility: hidden;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Animate mask translateY from -100% to 0%
      {
        id: 'mask-slide',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: maskAnimationStart,
          duration: maskAnimationDuration,
          mode: 'provider',
          targetIds: ['gradient-mask'],
          ranges: [
            { key: 'translateY', val: '-100%', prog: 0 },
            { key: 'translateY', val: '0%', prog: 1 },
          ],
        },
      },
    ],
  };

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-text-reveal-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative overflow-hidden backdrop-blur-sm w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      textLayerBlurHeavy,
      textLayerBlurMedium,
      textLayerSharp,
      gradientMask,
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
  id: 'cinematic-text-reveal-multi-blur',
  title: 'Cinematic Multi-Blur Text Reveal',
  description:
    'Production-quality cinematic text reveal with vertical gradient mask and sophisticated three-layer blur crossfade effect. Features heavy blur (20px), medium blur (10px), and sharp text layers that crossfade during reveal, simulating a professional focus-pull effect. Includes subtle scale animation and optimized performance with GPU acceleration.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cinematic',
    'reveal',
    'blur',
    'gradient',
    'mask',
    'focus-pull',
    'depth-of-field',
    'production',
    'title',
    'animation',
  ],
  defaultInputParams: {
    text: 'CINEMATIC REVEAL',
    fontSize: '64px',
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#FFFFFF',
    duration: 3,
    maskStartProgress: 0.1,
    maskEndProgress: 0.9,
    scaleIntensity: 0.05,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const cinematicTextRevealMultiBlurPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
