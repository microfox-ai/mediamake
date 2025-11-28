/**
 * Cinematic Depth-of-Field Text Reveal Preset
 *
 * This preset creates a dramatic focus pull effect that mimics a camera's rack focus transition.
 * The text starts extremely blurred (20px blur) as if out of focus in the background, then smoothly
 * transitions to sharp clarity. The effect combines multiple synchronized animations:
 * - Blur: 20px → 0px (simulates focus pull)
 * - Scale: 0.95 → 1.0 (enhances depth perception)
 * - Opacity: 0.7 → 1.0 (simulates light gathering)
 * - Brightness: 0.8 → 1.1 (mimics increased exposure when in focus)
 *
 * A subtle vignette overlay fades out during the transition, enhancing the cinematographic illusion
 * of depth and focus. All animations use cubic-bezier easing to simulate the mechanical movement
 * of a camera lens for maximum realism.
 *
 * Features:
 * - Cinematic focus pull animation (blur transition)
 * - Multi-property synchronized effects (scale, opacity, brightness)
 * - Vignette overlay that fades during focus transition
 * - Custom cubic-bezier easing for lens-like motion
 * - GPU-accelerated animations (will-change: filter, transform)
 * - Flexible text styling and font configuration
 *
 * Use cases:
 * - Cinematic title reveals
 * - Professional video intros
 * - Dramatic text emphasis
 * - Film-style transitions
 * - Storytelling moments
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with focus pull effect'),
  fontSize: z
    .union([z.string(), z.number()])
    .default('64px')
    .describe('Font size (e.g., "64px" or 64)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('700')
    .describe('Font weight (e.g., "700", "bold", 700)'),
  color: z.string().default('#FFFFFF').describe('Text color'),
  duration: z
    .number()
    .min(0.5)
    .default(2)
    .describe('Total duration of the preset in seconds'),
  focusDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .describe('Duration of the focus pull transition in seconds'),
  blurStart: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Initial blur amount in pixels (out of focus)'),
  blurEnd: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe('Final blur amount in pixels (in focus)'),
  scaleStart: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(0.95)
    .describe('Initial scale value (slightly smaller)'),
  scaleEnd: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1.0)
    .describe('Final scale value (normal size)'),
  opacityStart: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Initial opacity (slightly dim)'),
  opacityEnd: z
    .number()
    .min(0)
    .max(1)
    .default(1.0)
    .describe('Final opacity (fully visible)'),
  brightnessStart: z
    .number()
    .min(0)
    .max(2)
    .default(0.8)
    .describe('Initial brightness filter value'),
  brightnessEnd: z
    .number()
    .min(0)
    .max(2)
    .default(1.1)
    .describe('Final brightness filter value (slight boost)'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Initial vignette opacity (0 = none, 1 = full black)'),
  textAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    color,
    duration,
    focusDuration,
    blurStart,
    blurEnd,
    scaleStart,
    scaleEnd,
    opacityStart,
    opacityEnd,
    brightnessStart,
    brightnessEnd,
    vignetteIntensity,
    textAlign,
  } = params;

  // Generate unique IDs
  const containerId = 'cinematic-focus-container';
  const vignetteId = 'cinematic-vignette-overlay';
  const textContainerId = 'cinematic-text-container';
  const textId = 'cinematic-focus-text';

  // Cubic-bezier easing for lens-like motion (ease-out with custom curve)
  const lensCubicBezier: [number, number, number, number] = [0.33, 0, 0.2, 1];

  // Create vignette fade-out effect
  const vignetteFadeEffect: GenericEffectData = {
    type: 'cubic-bezier',
    cubicBezier: lensCubicBezier,
    start: 0,
    duration: focusDuration,
    mode: 'provider',
    targetIds: [vignetteId],
    ranges: [
      { key: 'opacity', val: vignetteIntensity, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // Create focus pull blur effect
  const focusBlurEffect: GenericEffectData = {
    type: 'cubic-bezier',
    cubicBezier: lensCubicBezier,
    start: 0,
    duration: focusDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'blur', val: blurStart, prog: 0 },
      { key: 'blur', val: blurEnd, prog: 1 },
    ],
  };

  // Create scale effect
  const focusScaleEffect: GenericEffectData = {
    type: 'cubic-bezier',
    cubicBezier: lensCubicBezier,
    start: 0,
    duration: focusDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'scale', val: scaleStart, prog: 0 },
      { key: 'scale', val: scaleEnd, prog: 1 },
    ],
  };

  // Create opacity effect
  const focusOpacityEffect: GenericEffectData = {
    type: 'cubic-bezier',
    cubicBezier: lensCubicBezier,
    start: 0,
    duration: focusDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'opacity', val: opacityStart, prog: 0 },
      { key: 'opacity', val: opacityEnd, prog: 1 },
    ],
  };

  // Create brightness effect
  const focusBrightnessEffect: GenericEffectData = {
    type: 'cubic-bezier',
    cubicBezier: lensCubicBezier,
    start: 0,
    duration: focusDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'brightness', val: brightnessStart, prog: 0 },
      { key: 'brightness', val: brightnessEnd, prog: 1 },
    ],
  };

  // Normalize font size
  const normalizedFontSize =
    typeof fontSize === 'number' ? `${fontSize}px` : fontSize;

  // Build vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: vignetteId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.7) 100%)',
        },
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
        id: 'vignette-fade-out',
        componentId: 'generic',
        data: vignetteFadeEffect,
      },
    ],
    childrenData: [],
  };

  // Build text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: normalizedFontSize,
        fontWeight: fontWeight,
        color: color,
        textAlign: textAlign,
        lineHeight: 1.2,
        willChange: 'filter, transform',
      },
      font: {
        family: fontFamily,
        weights: [String(fontWeight)],
        display: 'swap',
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
        id: 'focus-pull-blur',
        componentId: 'generic',
        data: focusBlurEffect,
      },
      {
        id: 'focus-pull-scale',
        componentId: 'generic',
        data: focusScaleEffect,
      },
      {
        id: 'focus-pull-opacity',
        componentId: 'generic',
        data: focusOpacityEffect,
      },
      {
        id: 'focus-pull-brightness',
        componentId: 'generic',
        data: focusBrightnessEffect,
      },
    ],
  };

  // Build text container (for GPU acceleration hint)
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          willChange: 'filter, transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textAtom],
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [vignetteOverlay, textContainer],
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
  id: 'cinematic-focus-pull-text',
  title: 'Cinematic Depth-of-Field Text Reveal',
  description:
    'A cinematic focus pull text reveal that mimics a camera\'s rack focus effect. Text transitions from extreme blur (20px) to sharp clarity with simultaneous scale (0.95→1.0), brightness boost (0.8→1.1), and opacity fade (0.7→1.0) over 800ms using cubic-bezier easing. Features a subtle vignette overlay that fades out during focus transition to enhance the cinematographic illusion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cinematic',
    'focus-pull',
    'depth-of-field',
    'blur',
    'transition',
    'reveal',
    'dramatic',
    'film',
    'camera',
    'lens',
    'vignette',
  ],
  defaultInputParams: {
    text: 'CINEMATIC REVEAL',
    fontSize: '64px',
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
    duration: 2,
    focusDuration: 0.8,
    blurStart: 20,
    blurEnd: 0,
    scaleStart: 0.95,
    scaleEnd: 1.0,
    opacityStart: 0.7,
    opacityEnd: 1.0,
    brightnessStart: 0.8,
    brightnessEnd: 1.1,
    vignetteIntensity: 0.4,
    textAlign: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicFocusPullTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
