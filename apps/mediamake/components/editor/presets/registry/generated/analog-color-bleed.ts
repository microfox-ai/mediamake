/**
 * Analog Color Bleed Effect Preset
 *
 * SINGLE EFFECT:
 * Simulates the color bleeding and chromatic aberration found in old analog video systems.
 * Creates RGB channel misalignment with shifting text-shadow or box-shadow layers,
 * color fringing at element edges, saturation pumping, and subtle hue rotation.
 *
 * ADVANCED USAGE:
 * - Smart detection: uses text-shadow for text elements, box-shadow for non-text elements
 * - Animates RGB separation that shifts over time
 * - Includes color fringing that intensifies at element edges
 * - Adds saturation pumping and hue rotation for authentic analog feel
 * - Subtle color noise pattern that shifts through the spectrum
 *
 * FEATURES:
 * - Configurable bleed intensity (controls shadow spread and separation distance)
 * - Adjustable color shift (degrees of hue rotation over time)
 * - Edge fringing toggle (intensifies color bleeding at element edges)
 * - Provider mode targeting specific elements by ID
 *
 * USE CASES:
 * - Retro VHS aesthetic overlays
 * - Lo-fi music video effects
 * - Nostalgic visual treatments
 * - Glitch art and experimental video
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target'),
  effectStart: z.number().describe('Start time of the effect (relative to parent timeline)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  bleedIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe('Intensity multiplier for color bleeding and RGB separation (0.1-3, default: 1)'),
  colorShift: z
    .number()
    .min(0)
    .max(360)
    .default(15)
    .optional()
    .describe('Degrees of hue rotation over effect duration (0-360, default: 15)'),
  edgeFringing: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable intensified color fringing at element edges (default: true)'),
  isTextElement: z
    .boolean()
    .default(false)
    .optional()
    .describe('Whether the target is a text element (uses text-shadow if true, box-shadow if false)'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const bleedIntensity = params.bleedIntensity ?? 1;
  const colorShift = params.colorShift ?? 15;
  const edgeFringing = params.edgeFringing ?? true;
  const isTextElement = params.isTextElement ?? false;

  // Calculate shadow values based on intensity
  const baseSpread = 3 * bleedIntensity;
  const midSpread = 5 * bleedIntensity;
  const maxSpread = 8 * bleedIntensity;

  // RGB channel colors for analog separation
  const redChannel = '#ff00ff'; // Magenta (red + blue in analog)
  const cyanChannel = '#00ffff'; // Cyan (green + blue)
  const yellowChannel = '#ffff00'; // Yellow (red + green)

  // Choose shadow property based on element type
  const shadowProperty = isTextElement ? 'textShadow' : 'boxShadow';

  // Create RGB separation animation ranges
  const shadowRanges = [
    // Start: No separation
    {
      key: shadowProperty,
      val: '0 0 0 transparent',
      prog: 0,
    },
    // Mid-point 1: Cyan-Magenta separation (classic VHS look)
    {
      key: shadowProperty,
      val: edgeFringing
        ? `${baseSpread}px 0 ${midSpread}px ${redChannel}, -${baseSpread}px 0 ${midSpread}px ${cyanChannel}, 0 ${baseSpread * 0.5}px ${midSpread * 0.7}px ${yellowChannel}`
        : `${baseSpread}px 0 0 ${redChannel}, -${baseSpread}px 0 0 ${cyanChannel}`,
      prog: 0.25,
    },
    // Mid-point 2: Maximum separation with intense fringing
    {
      key: shadowProperty,
      val: edgeFringing
        ? `${maxSpread}px 0 ${maxSpread * 1.5}px ${redChannel}, -${maxSpread}px 0 ${maxSpread * 1.5}px ${cyanChannel}, 0 ${maxSpread * 0.8}px ${maxSpread * 1.2}px ${yellowChannel}`
        : `${maxSpread}px 0 ${baseSpread}px ${redChannel}, -${maxSpread}px 0 ${baseSpread}px ${cyanChannel}`,
      prog: 0.5,
    },
    // Mid-point 3: Shifted separation (horizontal to vertical shift)
    {
      key: shadowProperty,
      val: edgeFringing
        ? `0 ${baseSpread}px ${midSpread}px ${cyanChannel}, 0 -${baseSpread}px ${midSpread}px ${redChannel}, ${baseSpread * 0.7}px 0 ${midSpread * 0.8}px ${yellowChannel}`
        : `0 ${baseSpread}px 0 ${cyanChannel}, 0 -${baseSpread}px 0 ${redChannel}`,
      prog: 0.75,
    },
    // End: Return to subtle separation
    {
      key: shadowProperty,
      val: edgeFringing
        ? `${baseSpread * 0.5}px 0 ${midSpread * 0.5}px ${redChannel}, -${baseSpread * 0.5}px 0 ${midSpread * 0.5}px ${cyanChannel}`
        : `${baseSpread * 0.5}px 0 0 ${redChannel}, -${baseSpread * 0.5}px 0 0 ${cyanChannel}`,
      prog: 1,
    },
  ];

  // Saturation pumping (increases saturation over time)
  const saturationIntensity = 1 + bleedIntensity * 0.3;
  const saturateRanges = [
    { key: 'filter', val: 'saturate(1)', prog: 0 },
    { key: 'filter', val: `saturate(${saturationIntensity})`, prog: 0.5 },
    { key: 'filter', val: 'saturate(1)', prog: 1 },
  ];

  // Hue rotation for color shifting
  const hueRanges = [
    { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
    { key: 'filter', val: `hue-rotate(${colorShift * 0.5}deg)`, prog: 0.5 },
    { key: 'filter', val: `hue-rotate(${colorShift}deg)`, prog: 1 },
  ];

  // Create primary effect with RGB separation
  const rgbSeparationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: shadowRanges,
  };

  // Create saturation effect
  const saturationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: saturateRanges,
  };

  // Create hue rotation effect
  const hueRotationEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: hueRanges,
  };

  // Construct effect nodes
  const effects = [
    {
      id: params.effectId ? `${params.effectId}-rgb` : `analog-color-bleed-rgb-${params.targetId}`,
      componentId: 'generic',
      data: rgbSeparationEffect,
    },
    {
      id: params.effectId ? `${params.effectId}-saturation` : `analog-color-bleed-saturation-${params.targetId}`,
      componentId: 'generic',
      data: saturationEffect,
    },
    {
      id: params.effectId ? `${params.effectId}-hue` : `analog-color-bleed-hue-${params.targetId}`,
      componentId: 'generic',
      data: hueRotationEffect,
    },
  ];

  // Return effect in container structure
  const rootContainer: RenderableComponentData = {
    id: 'analog-color-bleed-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    effects: effects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: params.effectDuration,
      },
    },
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
  id: 'analog-color-bleed',
  title: 'Analog Color Bleed Effect',
  description:
    'Internal effect preset simulating analog video color bleeding and chromatic aberration with RGB channel misalignment, color fringing, saturation pumping, and hue rotation. Conditionally applies text-shadow for text elements and box-shadow for others.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'analog', 'vhs', 'chromatic-aberration', 'color-bleed', 'retro', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 3,
    bleedIntensity: 1,
    colorShift: 15,
    edgeFringing: true,
    isTextElement: false,
  },
};

// Export preset
export const analogColorBleedPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
