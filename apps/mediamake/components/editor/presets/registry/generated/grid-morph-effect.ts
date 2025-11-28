/**
 * GridMorph Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This preset generates an array of animation effects that transform elements between different 
 * grid layouts. It calculates position interpolation from a start grid configuration (e.g., 3x3) 
 * to an end grid configuration (e.g., 2x4), with smooth transitions including rotational twist 
 * (180° and back) and color shift via hue rotation.
 *
 * Features:
 * - Precise grid-to-grid position transformation with calculated interpolation
 * - Multiple easing curves: linear, ease, bounce, elastic
 * - Gap transition animation (spacing changes between grid cells)
 * - Aspect ratio preservation option
 * - Rotational twist effect (elements rotate 180° then back to 360°)
 * - Color shift visualization through hue-rotate filter
 * - No collision detection - smooth visual flow maintained
 *
 * Use cases:
 * - Transforming image galleries between different grid layouts
 * - Animating card grids from one configuration to another
 * - Creating dynamic grid morphing effects in presentations
 * - Building interactive layout transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply grid morph effects to'),
  startGrid: z
    .object({
      columns: z.number().min(1).describe('Number of columns in start grid'),
      rows: z.number().min(1).describe('Number of rows in start grid'),
    })
    .describe('Start grid configuration (columns and rows)'),
  endGrid: z
    .object({
      columns: z.number().min(1).describe('Number of columns in end grid'),
      rows: z.number().min(1).describe('Number of rows in end grid'),
    })
    .describe('End grid configuration (columns and rows)'),
  morphDuration: z
    .number()
    .min(100)
    .default(1500)
    .optional()
    .describe('Duration of the morph animation in milliseconds'),
  morphCurve: z
    .enum(['linear', 'ease', 'bounce', 'elastic'])
    .describe(
      'Easing curve for the morph animation (linear, ease, bounce, elastic)',
    ),
  gapTransition: z
    .number()
    .min(0)
    .describe('Gap spacing value (in pixels) for grid cell spacing'),
  preserveAspectRatio: z
    .boolean()
    .describe(
      'Whether to preserve aspect ratio during grid transformation (true/false)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    startGrid,
    endGrid,
    morphDuration = 1500,
    morphCurve,
    gapTransition,
    preserveAspectRatio,
  } = params;

  // Helper: Calculate grid cell position
  const calculateGridPosition = (
    index: number,
    columns: number,
    rows: number,
    containerWidth: number,
    containerHeight: number,
    gap: number,
  ): { x: number; y: number; width: number; height: number } => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    const totalGapWidth = (columns - 1) * gap;
    const totalGapHeight = (rows - 1) * gap;

    const cellWidth = (containerWidth - totalGapWidth) / columns;
    const cellHeight = (containerHeight - totalGapHeight) / rows;

    const x = col * (cellWidth + gap);
    const y = row * (cellHeight + gap);

    return { x, y, width: cellWidth, height: cellHeight };
  };

  // Helper: Generate curve-specific progress points
  const generateCurvePoints = (
    curve: 'linear' | 'ease' | 'bounce' | 'elastic',
  ): number[] => {
    switch (curve) {
      case 'linear':
        return [0, 0.5, 1];
      case 'ease':
        return [0, 0.5, 1];
      case 'bounce':
        // Bounce effect with overshoot
        return [0, 0.4, 0.6, 0.8, 1];
      case 'elastic':
        // Elastic effect with oscillation
        return [0, 0.3, 0.5, 0.7, 0.9, 1];
      default:
        return [0, 0.5, 1];
    }
  };

  // Helper: Calculate morph path values
  const calculateMorphPath = (
    startVal: number,
    endVal: number,
    curve: 'linear' | 'ease' | 'bounce' | 'elastic',
  ): number[] => {
    const points = generateCurvePoints(curve);

    if (curve === 'bounce') {
      // Bounce overshoot effect
      const overshoot = (endVal - startVal) * 0.1;
      return [
        startVal,
        startVal + (endVal - startVal) * 0.4,
        startVal + (endVal - startVal) * 0.7 + overshoot,
        endVal + overshoot * 0.5,
        endVal,
      ];
    } else if (curve === 'elastic') {
      // Elastic oscillation effect
      const amplitude = (endVal - startVal) * 0.15;
      return [
        startVal,
        startVal + (endVal - startVal) * 0.3,
        startVal + (endVal - startVal) * 0.6 - amplitude,
        startVal + (endVal - startVal) * 0.8 + amplitude * 0.5,
        endVal + amplitude * 0.2,
        endVal,
      ];
    } else {
      // Linear or ease
      return points.map((prog) => startVal + (endVal - startVal) * prog);
    }
  };

  // Assume viewport dimensions (can be passed via props.config if available)
  const containerWidth = props.config?.width || 1920;
  const containerHeight = props.config?.height || 1080;

  // Convert duration from ms to seconds
  const durationInSeconds = morphDuration / 1000;

  // Generate effects for each target
  const effects = targetIds.map((targetId, index) => {
    // Calculate start position
    const startPos = calculateGridPosition(
      index,
      startGrid.columns,
      startGrid.rows,
      containerWidth,
      containerHeight,
      gapTransition * 0.5, // Start gap is half of transition gap
    );

    // Calculate end position
    const endIndex = Math.min(index, endGrid.columns * endGrid.rows - 1);
    const endPos = calculateGridPosition(
      endIndex,
      endGrid.columns,
      endGrid.rows,
      containerWidth,
      containerHeight,
      gapTransition,
    );

    // Calculate morph paths for X and Y
    const morphPathX = calculateMorphPath(startPos.x, endPos.x, morphCurve);
    const morphPathY = calculateMorphPath(startPos.y, endPos.y, morphCurve);

    // Generate progress points based on curve
    const progPoints = generateCurvePoints(morphCurve);

    // Build animation ranges
    const ranges: any[] = [];

    // TranslateX animation
    morphPathX.forEach((val, i) => {
      ranges.push({
        key: 'translateX',
        val: `${val}px`,
        prog: progPoints[i] || i / (morphPathX.length - 1),
      });
    });

    // TranslateY animation
    morphPathY.forEach((val, i) => {
      ranges.push({
        key: 'translateY',
        val: `${val}px`,
        prog: progPoints[i] || i / (morphPathY.length - 1),
      });
    });

    // Rotation effect (0 -> 180 -> 360)
    ranges.push(
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: 180, prog: 0.5 },
      { key: 'rotate', val: 360, prog: 1 },
    );

    // Hue-rotate color shift effect (0 -> 180 -> 360)
    ranges.push(
      { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
      { key: 'filter', val: 'hue-rotate(180deg)', prog: 0.5 },
      { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
    );

    // Optional: Scale effect for aspect ratio preservation
    if (preserveAspectRatio) {
      const startAspect = startPos.width / startPos.height;
      const endAspect = endPos.width / endPos.height;
      const scaleX = endAspect / startAspect;

      ranges.push(
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: scaleX, prog: 1 },
      );
    }

    // Map curve to easing type
    const easingMap: Record<string, string> = {
      linear: 'linear',
      ease: 'ease-in-out',
      bounce: 'ease-out',
      elastic: 'ease-in-out',
    };

    const effectData: GenericEffectData = {
      type: easingMap[morphCurve] as any,
      start: 0,
      duration: durationInSeconds,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };

    return {
      id: `grid-morph-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return effects in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'grid-morph-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
    effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'grid-morph-effect',
  title: 'GridMorph',
  description:
    'Internal effect preset that transforms elements between different grid layouts with smooth position interpolation, rotational twist (180° and back), and hue-rotate color shift during morphing. Supports configurable start/end grid configurations, multiple easing curves (linear, ease, bounce, elastic), gap transitions, and aspect ratio preservation. Returns effects array for grid transformation animations.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'grid', 'morph', 'transform', 'internal', 'generic'],
  defaultInputParams: {
    targetIds: ['element-1', 'element-2', 'element-3', 'element-4'],
    startGrid: { columns: 2, rows: 2 },
    endGrid: { columns: 3, rows: 2 },
    morphDuration: 1500,
    morphCurve: 'ease',
    gapTransition: 20,
    preserveAspectRatio: false,
  },
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const gridMorphEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
