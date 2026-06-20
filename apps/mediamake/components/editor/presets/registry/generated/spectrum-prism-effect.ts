/**
 * Spectrum Prism Effect Preset
 *
 * Creates a spectacular rainbow spectrum animation that splits content into 7 ROYGBIV color layers.
 * Each layer follows a unique bezier arc path, fanning out like light through a prism, then reconverging.
 *
 * Features:
 * - 7 spectral layers (Red, Orange, Yellow, Green, Blue, Indigo, Violet)
 * - Smooth quadratic bezier arc paths for each color layer
 * - Configurable spectrum width (horizontal spread)
 * - Configurable arc height (vertical curvature)
 * - Stagger timing for sequential color animations
 * - Hue-rotation to create color shifts
 * - Combined translateX/translateY for arc motion
 * - Rotation effects synchronized with arc paths
 * - Opacity fade in/out for smooth appearance
 *
 * Technical Details:
 * - Uses quadratic bezier curves for smooth arcing motions
 * - Each color follows a unique path with 5 keyframes (prog: 0, 0.25, 0.5, 0.75, 1)
 * - Bezier control points calculated based on spread and arc height
 * - Generic effects with provider mode targeting specific component IDs
 *
 * Use Cases:
 * - Dramatic logo reveals with spectral dispersion
 * - Eye-catching text entrances with rainbow effects
 * - Brand animations requiring colorful impact
 * - Music video title sequences
 * - Product launch animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  spectrumWidth: z
    .number()
    .min(0)
    .max(1000)
    .default(300)
    .describe('How far colors spread horizontally (pixels)'),
  arcHeight: z
    .number()
    .min(0)
    .max(500)
    .default(150)
    .describe('Curvature height of arc paths (pixels)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.1)
    .describe('Delay between each color layer animation start (seconds)'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Total duration of prism effect (seconds)'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the spectrum effect to'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { spectrumWidth, arcHeight, staggerDelay, duration, targetIds } =
    params;

  // ROYGBIV spectrum colors (hue-rotate values)
  const spectrumColors = [
    { name: 'Red', hueRotate: 0, index: 0 },
    { name: 'Orange', hueRotate: 30, index: 1 },
    { name: 'Yellow', hueRotate: 60, index: 2 },
    { name: 'Green', hueRotate: 120, index: 3 },
    { name: 'Blue', hueRotate: 240, index: 4 },
    { name: 'Indigo', hueRotate: 275, index: 5 },
    { name: 'Violet', hueRotate: 300, index: 6 },
  ];

  // Helper function to calculate quadratic bezier points for arc path
  const calculateBezierArc = (
    colorIndex: number,
    totalColors: number,
  ): { x: number[]; y: number[] } => {
    // Normalize position (-1 to 1, where 0 is center)
    const normalizedPos = (colorIndex / (totalColors - 1)) * 2 - 1;

    // Calculate spread offset (how far left/right each color goes)
    const spreadOffset = normalizedPos * spectrumWidth;

    // Arc path keyframes
    // prog: 0 -> start at center
    // prog: 0.25 -> quarter way, beginning arc
    // prog: 0.5 -> peak of arc (maximum spread)
    // prog: 0.75 -> three-quarters, returning arc
    // prog: 1 -> back to center

    const xValues = [
      0, // Start: center
      spreadOffset * 0.5, // Quarter: halfway to peak
      spreadOffset, // Peak: maximum spread
      spreadOffset * 0.5, // Three-quarters: halfway back
      0, // End: back to center
    ];

    // Y values follow quadratic bezier curve
    // Use parabolic arc: y = -4 * arcHeight * t * (1 - t)
    const yValues = [
      0, // Start: no vertical offset
      -arcHeight * 0.75, // Quarter: rising arc
      -arcHeight, // Peak: maximum height
      -arcHeight * 0.75, // Three-quarters: descending arc
      0, // End: back to baseline
    ];

    return { x: xValues, y: yValues };
  };

  // Helper function to calculate rotation for arc motion
  const calculateRotation = (
    colorIndex: number,
    totalColors: number,
  ): number[] => {
    const normalizedPos = (colorIndex / (totalColors - 1)) * 2 - 1;
    const maxRotation = 15; // Maximum rotation in degrees

    return [
      0, // Start: no rotation
      normalizedPos * maxRotation * 0.5, // Quarter: slight rotation
      normalizedPos * maxRotation, // Peak: maximum rotation
      normalizedPos * maxRotation * 0.5, // Three-quarters: reducing rotation
      0, // End: back to no rotation
    ];
  };

  // Generate effects for all 7 spectrum layers
  const effects = spectrumColors.flatMap((colorData) => {
    const { hueRotate, index } = colorData;

    // Calculate bezier arc path
    const arcPath = calculateBezierArc(index, spectrumColors.length);
    const rotationValues = calculateRotation(index, spectrumColors.length);

    // Calculate staggered start time
    const effectStart = index * staggerDelay;
    const effectDuration = duration - effectStart;

    // Create ranges for all animated properties
    const ranges = [
      // TranslateX (horizontal arc motion)
      { key: 'translateX', val: arcPath.x[0], prog: 0 },
      { key: 'translateX', val: arcPath.x[1], prog: 0.25 },
      { key: 'translateX', val: arcPath.x[2], prog: 0.5 },
      { key: 'translateX', val: arcPath.x[3], prog: 0.75 },
      { key: 'translateX', val: arcPath.x[4], prog: 1 },

      // TranslateY (vertical arc motion)
      { key: 'translateY', val: arcPath.y[0], prog: 0 },
      { key: 'translateY', val: arcPath.y[1], prog: 0.25 },
      { key: 'translateY', val: arcPath.y[2], prog: 0.5 },
      { key: 'translateY', val: arcPath.y[3], prog: 0.75 },
      { key: 'translateY', val: arcPath.y[4], prog: 1 },

      // Rotate (synchronized with arc)
      { key: 'rotate', val: rotationValues[0], prog: 0 },
      { key: 'rotate', val: rotationValues[1], prog: 0.25 },
      { key: 'rotate', val: rotationValues[2], prog: 0.5 },
      { key: 'rotate', val: rotationValues[3], prog: 0.75 },
      { key: 'rotate', val: rotationValues[4], prog: 1 },

      // Hue-rotate filter (color shift)
      { key: 'filter', val: `hue-rotate(${hueRotate}deg)`, prog: 0 },
      { key: 'filter', val: `hue-rotate(${hueRotate}deg)`, prog: 0.5 },
      { key: 'filter', val: `hue-rotate(0deg)`, prog: 1 },

      // Opacity (fade in/out)
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.15 },
      { key: 'opacity', val: 1, prog: 0.85 },
      { key: 'opacity', val: 0, prog: 1 },
    ];

    // Create effect data for this spectrum layer
    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: ranges,
    };

    return {
      id: `spectrum-prism-layer-${index}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  return {
    output: {
      childrenData: [
        {
          id: 'spectrum-prism-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'spectrum-prism-effect',
  title: 'Spectrum Prism Effect',
  description:
    'Internal effect preset that splits content into a full rainbow spectrum animation with ROYGBIV colors. Creates 7 color-shifted copies that fan out like light through a prism following bezier arc paths, then reconverge. Returns effects array for consumption by other presets. Parameters control spectrum width (spread distance), arc height (path curvature), and stagger timing (delay between colors).',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'spectrum',
    'prism',
    'rainbow',
    'ROYGBIV',
    'arc',
    'bezier',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    spectrumWidth: 300,
    arcHeight: 150,
    staggerDelay: 0.1,
    duration: 2,
    targetIds: ['example-target'],
  },
};

export const spectrumPrismEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
