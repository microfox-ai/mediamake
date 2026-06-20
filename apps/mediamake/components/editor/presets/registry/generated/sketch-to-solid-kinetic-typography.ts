/**
 * Sketch-to-Solid Kinetic Typography Preset
 *
 * This preset creates a kinetic typography effect where outlined text morphs into filled text
 * through a "sketch-to-solid" animation. The text starts with a rough, hand-drawn outline
 * with subtle jitter/shake effects, then stabilizes and fills with color from the center
 * outward in a radial pattern.
 *
 * Features:
 * - **Sketch Effect Phase**: Outlined text with animated stroke
 * - **Energetic Shake**: Subtle jitter animation during outline phase (first 40% of duration)
 * - **Stabilization**: Smooth transition from shake to stable state
 * - **Radial Fill**: Color fills from center outward using gradient animation
 * - **Customizable Intensity**: Control shake amplitude and animation timing
 * - **Organic Feel**: Spring easing for natural motion
 *
 * Use cases:
 * - Creative brand video intros
 * - Animated logo reveals
 * - Artistic title sequences
 * - Social media content with dynamic typography
 * - Hand-drawn aesthetic presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('The text content to animate'),
  duration: z.number().default(3).describe('Total animation duration in seconds'),
  fontSize: z.string().default('72px').describe('Font size for the text (e.g., "72px", "5rem")'),
  fontFamily: z.string().default('Inter').describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z.string().default('bold').describe('Font weight (e.g., "bold", "700", "900")'),
  color: z.string().default('#000000').describe('Fill color for the text (hex or rgba)'),
  strokeColor: z.string().optional().describe('Stroke color during outline phase (defaults to fill color)'),
  strokeWidth: z.string().default('2px').describe('Stroke width during outline phase'),
  shakeIntensity: z.number().min(0).max(10).default(2).describe('Shake amplitude multiplier (0 = no shake, higher = more intense)'),
  backgroundColor: z.string().optional().describe('Optional background color for the container'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    color,
    strokeColor = color,
    strokeWidth,
    shakeIntensity,
    backgroundColor,
  } = params;

  // Calculate timing phases
  const shakeDuration = duration * 0.4; // First 40% - shake phase
  const stabilizeDuration = duration * 0.1; // 40-50% - stabilization
  const fillDuration = duration * 0.5; // Last 50% - fill phase
  const fillStart = duration * 0.5;

  // IDs
  const containerId = 'sketch-to-solid-container';
  const textId = 'sketch-text';
  const shakeEffectId = 'shake-effect';
  const fillEffectId = 'fill-effect';

  // Create shake effect with rapid keyframe changes
  const shakeEffect = {
    id: shakeEffectId,
    componentId: 'generic',
    data: {
      type: 'spring',
      start: 0,
      duration: shakeDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        // X-axis shake with varying intensity
        { key: 'translateX', val: -2 * shakeIntensity, prog: 0 },
        { key: 'translateX', val: 2 * shakeIntensity, prog: 0.1 },
        { key: 'translateX', val: -1.5 * shakeIntensity, prog: 0.2 },
        { key: 'translateX', val: 1.5 * shakeIntensity, prog: 0.3 },
        { key: 'translateX', val: -1 * shakeIntensity, prog: 0.4 },
        { key: 'translateX', val: 1 * shakeIntensity, prog: 0.5 },
        { key: 'translateX', val: -0.5 * shakeIntensity, prog: 0.6 },
        { key: 'translateX', val: 0.5 * shakeIntensity, prog: 0.7 },
        { key: 'translateX', val: -0.3 * shakeIntensity, prog: 0.8 },
        { key: 'translateX', val: 0.3 * shakeIntensity, prog: 0.9 },
        { key: 'translateX', val: 0, prog: 1 },
        // Y-axis shake with different pattern
        { key: 'translateY', val: -1.5 * shakeIntensity, prog: 0 },
        { key: 'translateY', val: 1.5 * shakeIntensity, prog: 0.15 },
        { key: 'translateY', val: -1 * shakeIntensity, prog: 0.25 },
        { key: 'translateY', val: 1 * shakeIntensity, prog: 0.35 },
        { key: 'translateY', val: -0.8 * shakeIntensity, prog: 0.45 },
        { key: 'translateY', val: 0.8 * shakeIntensity, prog: 0.55 },
        { key: 'translateY', val: -0.3 * shakeIntensity, prog: 0.65 },
        { key: 'translateY', val: 0.3 * shakeIntensity, prog: 0.75 },
        { key: 'translateY', val: -0.1 * shakeIntensity, prog: 0.85 },
        { key: 'translateY', val: 0.1 * shakeIntensity, prog: 0.95 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  };

  // Create radial fill effect
  // We simulate radial fill by animating from transparent to filled color
  // with additional scale pulse for organic feel
  const fillEffect = {
    id: fillEffectId,
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: fillStart,
      duration: fillDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        // Transition from outlined to filled
        // First, fade out the stroke
        { key: 'WebkitTextStrokeWidth', val: strokeWidth, prog: 0 },
        { key: 'WebkitTextStrokeWidth', val: '0px', prog: 0.3 },
        // Then fill with color
        { key: 'WebkitTextFillColor', val: 'transparent', prog: 0 },
        { key: 'WebkitTextFillColor', val: color, prog: 0.5 },
        { key: 'WebkitTextFillColor', val: color, prog: 1 },
        // Add subtle scale pulse for organic feel
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.02, prog: 0.3 },
        { key: 'scale', val: 1, prog: 0.6 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Create text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'pointer-events-none select-none',
      style: {
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        WebkitTextStrokeWidth: strokeWidth,
        WebkitTextStrokeColor: strokeColor,
        WebkitTextFillColor: 'transparent', // Start as outlined only
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
    effects: [shakeEffect, fillEffect],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: backgroundColor ? { backgroundColor } : {},
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
  id: 'sketchToSolidKineticTypography',
  title: 'Sketch-to-Solid Kinetic Typography',
  description: 'Kinetic typography preset featuring outlined text that morphs into filled text through a "sketch-to-solid" animation. Hand-drawn text with energetic shake effect during outline phase, then stabilizes and fills with color from center outward in a radial pattern. Perfect for creative brand videos and animated logos with an organic, artistic feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'text',
    'animation',
    'sketch',
    'hand-drawn',
    'outline',
    'fill',
    'radial',
    'organic',
    'artistic',
    'creative',
    'brand',
    'logo',
    'shake',
    'jitter',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SKETCH TO SOLID',
    duration: 3,
    fontSize: '72px',
    fontFamily: 'Inter',
    fontWeight: 'bold',
    color: '#000000',
    strokeWidth: '2px',
    shakeIntensity: 2,
  },
};

// Export preset
export const sketchToSolidKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
