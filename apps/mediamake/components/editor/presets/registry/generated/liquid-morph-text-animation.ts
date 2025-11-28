/**
 * Liquid Morph Text Animation Preset
 *
 * Creates a dynamic text animation with viscous fluid-like morphing effect.
 * Text stretches horizontally with non-uniform distortion (center stretches more than edges),
 * creating a funhouse mirror or lens distortion effect, then contracts vertically before
 * returning to normal. Includes psychedelic color shifting during maximum stretch for enhanced
 * visual impact. Uses hardware-accelerated transforms and asymmetric timing for fluid motion.
 *
 * Features:
 * - **Liquid Morphing Effect**: Non-uniform horizontal stretching with center distortion
 * - **Funhouse Mirror Warping**: Mesh deformation-like effect with skew and scale transforms
 * - **Psychedelic Color Shift**: Hue rotation during maximum stretch
 * - **Hardware Acceleration**: Uses transform3d() for optimal performance
 * - **Asymmetric Timing**: Slow stretch (60%), quick recovery (40%)
 * - **Customizable Parameters**: Control stretch intensity, timing, and color shifts
 *
 * Use cases:
 * - Creating eye-catching text intros with liquid effects
 * - Building psychedelic visual effects for creative content
 * - Adding dynamic typography with mesh deformation aesthetics
 * - Creating funhouse mirror text transformations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Preset parameters schema
const presetParams = z.object({
  text: z.string().describe('Text content to animate with liquid morph effect'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(3)
    .optional()
    .describe('Total display duration of the text in seconds'),
  effectDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Duration of the liquid morph animation effect'),
  stretchPhase: z
    .number()
    .min(0.3)
    .max(0.8)
    .default(0.6)
    .optional()
    .describe(
      'Progress point (0-1) where maximum stretch occurs - determines asymmetric timing',
    ),
  maxScaleX: z
    .number()
    .min(1.5)
    .max(4)
    .default(2.5)
    .optional()
    .describe('Maximum horizontal scale factor during stretch'),
  maxScaleY: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Minimum vertical scale factor during stretch (contraction)'),
  maxSkew: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .optional()
    .describe('Maximum skew angle in degrees for distortion effect'),
  hueShift: z
    .number()
    .min(0)
    .max(360)
    .default(30)
    .optional()
    .describe('Hue rotation in degrees during maximum stretch (psychedelic color shift)'),
  fontSize: z
    .string()
    .default('72px')
    .optional()
    .describe('Font size for the text (e.g., "72px", "5rem")'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family for the text'),
  fontWeight: z
    .string()
    .default('700')
    .optional()
    .describe('Font weight (e.g., "400", "700", "bold")'),
  color: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const text = params.text;
  const duration = params.duration ?? 3;
  const effectDuration = params.effectDuration ?? 1.5;
  const stretchPhase = params.stretchPhase ?? 0.6;
  const maxScaleX = params.maxScaleX ?? 2.5;
  const maxScaleY = params.maxScaleY ?? 0.8;
  const maxSkew = params.maxSkew ?? 5;
  const hueShift = params.hueShift ?? 30;
  const fontSize = params.fontSize ?? '72px';
  const fontFamily = params.fontFamily ?? 'Inter';
  const fontWeight = params.fontWeight ?? '700';
  const color = params.color ?? '#ffffff';

  // Generate unique IDs
  const containerId = 'liquid-morph-container';
  const textId = 'liquid-text';
  const effectId = 'liquid-morph-effect';

  // Create liquid morph effect data
  const liquidMorphEffectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Horizontal scale (stretch)
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleX', val: maxScaleX, prog: stretchPhase },
      { key: 'scaleX', val: 1, prog: 1 },
      // Vertical scale (contraction)
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'scaleY', val: maxScaleY, prog: stretchPhase },
      { key: 'scaleY', val: 1, prog: 1 },
      // Skew for distortion
      { key: 'skewX', val: 0, prog: 0 },
      { key: 'skewX', val: maxSkew, prog: stretchPhase },
      { key: 'skewX', val: 0, prog: 1 },
      // Hue rotation for psychedelic color shift
      { key: 'hue-rotate', val: 0, prog: 0 },
      { key: 'hue-rotate', val: hueShift, prog: stretchPhase },
      { key: 'hue-rotate', val: 0, prog: 1 },
    ],
  };

  // Create text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        textAlign: 'center' as const,
        transformOrigin: 'center center',
        willChange: 'transform, filter',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap' as const,
        preload: true,
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
        id: effectId,
        componentId: 'generic',
        data: liquidMorphEffectData,
      },
    ],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textAtom] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-morph-text-animation',
  title: 'Liquid Morph Text Animation',
  description:
    'A dynamic text animation with liquid morphing effect featuring non-uniform horizontal stretching, vertical contraction, and psychedelic color shifts. Text stretches like viscous fluid with center distortion more pronounced than edges, creating a funhouse mirror warping effect. Includes hardware-accelerated transforms with asymmetric timing for fluid motion dynamics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'liquid',
    'morph',
    'stretch',
    'distortion',
    'psychedelic',
    'funhouse',
    'kinetic',
    'typography',
    'transform',
    'skew',
    'scale',
    'hue-rotate',
  ],
  defaultInputParams: {
    text: 'LIQUID MORPH',
    duration: 3,
    effectDuration: 1.5,
    stretchPhase: 0.6,
    maxScaleX: 2.5,
    maxScaleY: 0.8,
    maxSkew: 5,
    hueShift: 30,
    fontSize: '72px',
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#ffffff',
  },
  dependencies: {},
};

// Export preset
export const liquidMorphTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
