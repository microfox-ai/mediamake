/**
 * Bouncy Gelatin Text Preset
 *
 * This preset creates text that wobbles like soft jelly when it appears, simulating
 * a 3D jelly deformation with asymmetric movements. The text uses skew transformations
 * combined with scale to create a wobbly effect with multiple oscillation cycles that
 * decrease in intensity (damped harmonic motion). A subtle hue rotation enhances the
 * jelly-like quality by simulating translucent, refractive material catching light.
 *
 * Features:
 * - **Asymmetric Wobble**: Different parts move at different rates using skew + scale
 * - **Damped Harmonic Motion**: Multiple oscillation cycles with decreasing intensity
 * - **Hue Rotation**: Subtle color shift synchronized with wobbles
 * - **Spring Easing**: Natural physics-based animation timing
 * - **Preserve-3D**: Uses transform-style preserve-3d for depth effect
 *
 * Use cases:
 * - Creating playful, bouncy text effects
 * - Adding personality to titles and headers
 * - Building engaging social media content
 * - Creating fun, dynamic typography animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  text: z.string().describe('Text content to display with jelly wobble effect'),
  fontSize: z
    .string()
    .optional()
    .describe('Font size (e.g., "72px", "64px") - default: "72px"'),
  fontWeight: z
    .string()
    .optional()
    .describe('Font weight (e.g., "800", "700", "bold") - default: "800"'),
  fontFamily: z
    .string()
    .optional()
    .describe('Font family name (e.g., "Inter", "Roboto") - default: "Inter"'),
  color: z
    .string()
    .optional()
    .describe('Text color (CSS color value) - default: "#ffffff"'),
  duration: z
    .number()
    .optional()
    .describe('Animation duration in seconds - default: 1.2'),
  start: z
    .number()
    .optional()
    .describe('Start time relative to parent in seconds - default: 0'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const text = params.text;
  const fontSize = params.fontSize || '72px';
  const fontWeight = params.fontWeight || '800';
  const fontFamily = params.fontFamily || 'Inter';
  const color = params.color || '#ffffff';
  const duration = params.duration || 1.2;
  const start = params.start || 0;

  // Generate unique IDs
  const containerId = 'gelatin-text-container';
  const textId = 'gelatin-text-content';

  // Create jelly wobble effect with skew and scale transformations
  const jellyWobbleEffect = {
    id: 'jelly-wobble-effect',
    componentId: 'generic',
    data: {
      type: 'spring' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: [
        // Initial squash (0%)
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleY', val: 0.6, prog: 0 },
        { key: 'skewX', val: 5, prog: 0 },
        { key: 'skewY', val: -3, prog: 0 },

        // First bounce - extreme stretch (10%)
        { key: 'scaleX', val: 0.9, prog: 0.1 },
        { key: 'scaleY', val: 1.2, prog: 0.1 },
        { key: 'skewX', val: -8, prog: 0.1 },
        { key: 'skewY', val: 4, prog: 0.1 },

        // Second bounce - moderate compression (25%)
        { key: 'scaleX', val: 1.1, prog: 0.25 },
        { key: 'scaleY', val: 0.95, prog: 0.25 },
        { key: 'skewX', val: 3, prog: 0.25 },
        { key: 'skewY', val: -2, prog: 0.25 },

        // Third bounce - slight stretch (40%)
        { key: 'scaleX', val: 0.98, prog: 0.4 },
        { key: 'scaleY', val: 1.03, prog: 0.4 },
        { key: 'skewX', val: -2, prog: 0.4 },
        { key: 'skewY', val: 1, prog: 0.4 },

        // Fourth bounce - minor compression (55%)
        { key: 'scaleX', val: 1.01, prog: 0.55 },
        { key: 'scaleY', val: 0.99, prog: 0.55 },
        { key: 'skewX', val: 1, prog: 0.55 },
        { key: 'skewY', val: 0, prog: 0.55 },

        // Settle (70%)
        { key: 'scaleX', val: 1, prog: 0.7 },
        { key: 'scaleY', val: 1, prog: 0.7 },
        { key: 'skewX', val: 0, prog: 0.7 },
        { key: 'skewY', val: 0, prog: 0.7 },

        // Final rest (100%)
        { key: 'scaleX', val: 1, prog: 1 },
        { key: 'scaleY', val: 1, prog: 1 },
        { key: 'skewX', val: 0, prog: 1 },
        { key: 'skewY', val: 0, prog: 1 },
      ],
    },
  };

  // Create hue rotation effect synchronized with wobble
  const hueRotationEffect = {
    id: 'hue-rotation-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: [
        { key: 'filter:hue-rotate', val: 0, prog: 0 },
        { key: 'filter:hue-rotate', val: 5, prog: 0.1 },
        { key: 'filter:hue-rotate', val: -5, prog: 0.25 },
        { key: 'filter:hue-rotate', val: 3, prog: 0.4 },
        { key: 'filter:hue-rotate', val: -2, prog: 0.55 },
        { key: 'filter:hue-rotate', val: 1, prog: 0.7 },
        { key: 'filter:hue-rotate', val: 0, prog: 1 },
      ],
    },
  };

  // Create text atom component
  const textComponent: RenderableComponentData = {
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
      },
      font: {
        family: fontFamily,
        weights: ['700', '800'],
        subsets: ['latin'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [jellyWobbleEffect, hueRotationEffect],
  };

  // Create container layout with preserve-3d
  const containerLayout: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: start,
        duration: duration,
      },
    },
    childrenData: [textComponent],
  };

  // Return preset output
  return {
    output: {
      childrenData: [containerLayout] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'bouncy-gelatin-text',
  title: 'Bouncy Gelatin Text',
  description:
    'Text preset that wobbles like soft jelly with asymmetric deformations using skew and scale transformations. Features multiple damped oscillation cycles with decreasing intensity and subtle hue rotation to simulate translucent, refractive material catching light as it moves.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'jelly',
    'wobble',
    'bouncy',
    'gelatin',
    'skew',
    'scale',
    'spring',
    'damped',
    'harmonic',
    'playful',
    'fun',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'BOUNCY TEXT',
    fontSize: '72px',
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#ffffff',
    duration: 1.2,
    start: 0,
  },
};

// Export preset
export const bouncyGelatinTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
