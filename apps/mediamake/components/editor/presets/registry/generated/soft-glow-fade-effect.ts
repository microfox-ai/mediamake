/**
 * SoftGlowFade Combined Effect Preset
 *
 * A cinematic three-part effect system that layers multiple effects for smooth, professional transitions.
 * This internal effect preset combines:
 * 1. Primary opacity fade (S-curve: 0→1→0)
 * 2. Secondary blur effect (inverse: high blur at low opacity, none at full opacity)
 * 3. Tertiary brightness adjustment (subtle glow peaking at 1.2 during full visibility)
 *
 * Features:
 * - **S-Curve Opacity**: Smooth fade in and out following an S-curve pattern
 * - **Inverse Blur**: Maximum blur at start/end, zero blur at peak visibility
 * - **Brightness Glow**: Subtle brightness boost (1.2) at full opacity for glow effect
 * - **Independent Toggles**: Each effect can be enabled/disabled via boolean flags
 * - **GPU Acceleration**: Optional will-change property for performance optimization
 * - **Customizable Parameters**: Glow intensity, blur radius, and fade curve steepness
 *
 * Use cases:
 * - Cinematic fade transitions with depth
 * - Dreamy entrance/exit effects for text or media
 * - Professional title card animations
 * - Soft focus transitions between scenes
 * - Layered effects for enhanced visual polish
 *
 * ARRAY OF EFFECTS:
 * Returns up to three effects (opacity, blur, brightness) based on enabled flags.
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the combined effects to'),
  duration: z
    .number()
    .positive()
    .optional()
    .describe('Duration of the effect sequence in seconds'),
  glowIntensity: z
    .number()
    .min(1)
    .max(2)
    .optional()
    .describe('Peak brightness intensity for glow effect (1.0 = normal, 1.2 = default glow, 2.0 = maximum)'),
  maxBlur: z
    .number()
    .min(0)
    .max(20)
    .optional()
    .describe('Maximum blur radius in pixels at start/end (default: 8px)'),
  curveStepness: z
    .number()
    .optional()
    .describe('Steepness of the S-curve fade (not currently used, reserved for future easing customization)'),
  enableOpacity: z
    .boolean()
    .optional()
    .describe('Enable/disable the opacity fade effect (default: true)'),
  enableBlur: z
    .boolean()
    .optional()
    .describe('Enable/disable the blur effect (default: true)'),
  enableGlow: z
    .boolean()
    .optional()
    .describe('Enable/disable the brightness glow effect (default: true)'),
  gpuAccelerated: z
    .boolean()
    .optional()
    .describe('Apply GPU-accelerated will-change property for better performance (default: false)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    duration = 5,
    glowIntensity = 1.2,
    maxBlur = 8,
    enableOpacity = true,
    enableBlur = true,
    enableGlow = true,
    gpuAccelerated = false,
  } = params;

  const effects: any[] = [];

  // Effect 1: Primary Opacity Fade (S-curve: 0→1→0)
  if (enableOpacity) {
    const opacityEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration,
      mode: 'provider',
      targetIds,
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.5, prog: 0.25 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 0.5, prog: 0.75 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    if (gpuAccelerated) {
      opacityEffect.props = { willChange: 'opacity' };
    }

    effects.push({
      id: `soft-glow-fade-opacity-${targetIds.join('-')}`,
      componentId: 'generic',
      data: opacityEffect,
    });
  }

  // Effect 2: Secondary Blur Effect (Inverse: high blur at low opacity, zero at peak)
  if (enableBlur) {
    const blurEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration,
      mode: 'provider',
      targetIds,
      ranges: [
        { key: 'blur', val: `${maxBlur}px`, prog: 0 },
        { key: 'blur', val: '0px', prog: 0.5 },
        { key: 'blur', val: `${maxBlur}px`, prog: 1 },
      ],
    };

    if (gpuAccelerated) {
      blurEffect.props = { willChange: 'filter' };
    }

    effects.push({
      id: `soft-glow-fade-blur-${targetIds.join('-')}`,
      componentId: 'generic',
      data: blurEffect,
    });
  }

  // Effect 3: Tertiary Brightness Adjustment (Glow: peaks at glowIntensity)
  if (enableGlow) {
    const brightnessEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration,
      mode: 'provider',
      targetIds,
      ranges: [
        { key: 'brightness', val: 0.8, prog: 0 },
        { key: 'brightness', val: glowIntensity, prog: 0.5 },
        { key: 'brightness', val: 0.8, prog: 1 },
      ],
    };

    if (gpuAccelerated) {
      brightnessEffect.props = { willChange: 'filter' };
    }

    effects.push({
      id: `soft-glow-fade-brightness-${targetIds.join('-')}`,
      componentId: 'generic',
      data: brightnessEffect,
    });
  }

  return {
    output: {
      _extractedEffects: effects,
      childrenData: [
        {
          id: 'soft-glow-fade-container',
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
              duration,
            },
          },
          effects,
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'soft-glow-fade-effect',
  title: 'SoftGlowFade Combined Effect',
  description:
    'A three-part cinematic effect system combining opacity fade (S-curve from 0→1→0), inverse blur (high at low opacity, none at full opacity), and brightness glow (peaks at 1.2 during full visibility). Each effect is independently toggleable via boolean flags. Supports GPU acceleration and customizable glow intensity, blur radius, and fade curve steepness.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'combined', 'fade', 'glow', 'blur', 'cinematic', 'generic', 'internal'],
  defaultInputParams: {
    targetIds: ['component-1'],
    duration: 5,
    glowIntensity: 1.2,
    maxBlur: 8,
    enableOpacity: true,
    enableBlur: true,
    enableGlow: true,
    gpuAccelerated: false,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const softGlowFadeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
