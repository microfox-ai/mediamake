/**
 * Polygon Mask Reveal Effect Preset
 *
 * INTERNAL EFFECT PRESET - Returns an array of effects for geometric polygon mask reveals.
 *
 * Features:
 * - Multiple polygon shapes: triangle, pentagon, hexagon, octagon
 * - Reveal directions: center-out, diagonal, spiral
 * - Animates CSS clip-path polygon points from center (0% reveal) to full shape (100% reveal)
 * - Supports both reveal and conceal modes
 * - Customizable easing curves for organic motion
 * - Optional rotation animation for spiral reveals
 * - Returns generic effects that target any component ID
 *
 * Use Cases:
 * - Text block reveals with geometric iris wipe
 * - Video player mask animations
 * - Image gallery transitions
 * - Custom shape-based content reveals
 *
 * Output: Array of effects (clip-path + optional rotation)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// --- Params Schema ---

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the polygon mask reveal effect to'),

  shape: z
    .enum(['triangle', 'pentagon', 'hexagon', 'octagon'])
    .describe('Polygon shape type for the mask reveal'),

  direction: z
    .enum(['center-out', 'diagonal', 'spiral'])
    .describe('Direction of the reveal animation'),

  mode: z
    .enum(['reveal', 'conceal'])
    .default('reveal')
    .optional()
    .describe('Whether to reveal (center to full) or conceal (full to center)'),

  start: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect in seconds (relative to parent)'),

  duration: z
    .number()
    .default(1000)
    .optional()
    .describe('Duration of the effect in milliseconds'),

  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .default('ease-out')
    .optional()
    .describe('Easing function for the animation'),

  rotationDegrees: z
    .number()
    .default(360)
    .optional()
    .describe('Total rotation in degrees for spiral direction (only used when direction is spiral)'),

  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    shape,
    direction,
    mode = 'reveal',
    start = 0,
    duration = 1000,
    easing = 'ease-out',
    rotationDegrees = 360,
    effectId,
  } = params;

  // Convert duration from milliseconds to seconds
  const durationInSeconds = duration / 1000;

  // Helper: Generate polygon points for a given shape at a specific scale (0 = center, 1 = full size)
  const generatePolygonPoints = (
    shapeType: string,
    scale: number,
  ): string => {
    const centerX = 50;
    const centerY = 50;

    // Calculate polygon vertices based on shape type
    const getVertices = (sides: number): Array<{ x: number; y: number }> => {
      const vertices: Array<{ x: number; y: number }> = [];
      const angleOffset = -Math.PI / 2; // Start from top

      for (let i = 0; i < sides; i++) {
        const angle = angleOffset + (i * 2 * Math.PI) / sides;
        const x = centerX + scale * 50 * Math.cos(angle);
        const y = centerY + scale * 50 * Math.sin(angle);
        vertices.push({ x, y });
      }

      return vertices;
    };

    const sideCount: Record<string, number> = {
      triangle: 3,
      pentagon: 5,
      hexagon: 6,
      octagon: 8,
    };

    const sides = sideCount[shapeType] || 6;
    const vertices = getVertices(sides);

    return vertices.map((v) => `${v.x}% ${v.y}%`).join(', ');
  };

  // Generate keyframes for clip-path animation
  const generateClipPathKeyframes = (): Array<{
    val: string;
    prog: number;
  }> => {
    const keyframes: Array<{ val: string; prog: number }> = [];

    if (direction === 'center-out') {
      // Center-out: simple expansion from center to full
      const startScale = mode === 'reveal' ? 0 : 1;
      const endScale = mode === 'reveal' ? 1 : 0;

      keyframes.push({
        val: `polygon(${generatePolygonPoints(shape, startScale)})`,
        prog: 0,
      });

      keyframes.push({
        val: `polygon(${generatePolygonPoints(shape, endScale)})`,
        prog: 1,
      });
    } else if (direction === 'diagonal') {
      // Diagonal: expand with offset animation
      const startScale = mode === 'reveal' ? 0 : 1;
      const midScale = mode === 'reveal' ? 0.5 : 0.5;
      const endScale = mode === 'reveal' ? 1 : 0;

      keyframes.push({
        val: `polygon(${generatePolygonPoints(shape, startScale)})`,
        prog: 0,
      });

      keyframes.push({
        val: `polygon(${generatePolygonPoints(shape, midScale)})`,
        prog: 0.5,
      });

      keyframes.push({
        val: `polygon(${generatePolygonPoints(shape, endScale)})`,
        prog: 1,
      });
    } else if (direction === 'spiral') {
      // Spiral: expand with intermediate steps for smoother animation
      const startScale = mode === 'reveal' ? 0 : 1;
      const endScale = mode === 'reveal' ? 1 : 0;

      keyframes.push({
        val: `polygon(${generatePolygonPoints(shape, startScale)})`,
        prog: 0,
      });

      // Add intermediate keyframes for smoother spiral
      keyframes.push({
        val: `polygon(${generatePolygonPoints(shape, startScale + (endScale - startScale) * 0.33)})`,
        prog: 0.33,
      });

      keyframes.push({
        val: `polygon(${generatePolygonPoints(shape, startScale + (endScale - startScale) * 0.66)})`,
        prog: 0.66,
      });

      keyframes.push({
        val: `polygon(${generatePolygonPoints(shape, endScale)})`,
        prog: 1,
      });
    }

    return keyframes;
  };

  // Create clip-path effect
  const clipPathEffect: GenericEffectData = {
    type: easing,
    start: start,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: generateClipPathKeyframes().map((kf) => ({
      key: 'clipPath',
      val: kf.val,
      prog: kf.prog,
    })),
  };

  const clipPathEffectNode = {
    id: effectId ? `${effectId}-clip-path` : `polygon-mask-clip-path-${targetIds.join('-')}`,
    componentId: 'generic',
    data: clipPathEffect,
  };

  // Create rotation effect (only for spiral direction)
  const effects = [clipPathEffectNode];

  if (direction === 'spiral') {
    const startRotation = mode === 'reveal' ? 0 : rotationDegrees;
    const endRotation = mode === 'reveal' ? rotationDegrees : 0;

    const rotationEffect: GenericEffectData = {
      type: easing,
      start: start,
      duration: durationInSeconds,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        { key: 'rotate', val: startRotation, prog: 0 },
        { key: 'rotate', val: endRotation, prog: 1 },
      ],
    };

    effects.push({
      id: effectId ? `${effectId}-rotation` : `polygon-mask-rotation-${targetIds.join('-')}`,
      componentId: 'generic',
      data: rotationEffect,
    });
  }

  // Optional: Add opacity fade for smoother reveal
  const opacityEffect: GenericEffectData = {
    type: easing,
    start: start,
    duration: durationInSeconds * 0.3, // Fade faster than clip-path
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'opacity', val: mode === 'reveal' ? 0 : 1, prog: 0 },
      { key: 'opacity', val: mode === 'reveal' ? 1 : 0, prog: 1 },
    ],
  };

  effects.push({
    id: effectId ? `${effectId}-opacity` : `polygon-mask-opacity-${targetIds.join('-')}`,
    componentId: 'generic',
    data: opacityEffect,
  });

  // Return effects in a container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'polygon-mask-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'polygon-mask-reveal-effect',
  title: 'Polygon Mask Reveal Effect',
  description:
    'Internal effect preset that generates geometric polygon mask reveals using CSS clip-path animations. Supports multiple polygon shapes (triangle, pentagon, hexagon, octagon) with reveal directions (center-out, diagonal, spiral). Returns generic effects with clip-path keyframes for reusable application to any target component.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'polygon', 'mask', 'reveal', 'clip-path', 'geometric', 'iris-wipe', 'internal', 'generic'],
  dependencies: {},
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    shape: 'hexagon',
    direction: 'center-out',
    mode: 'reveal',
    start: 0,
    duration: 1000,
    easing: 'ease-out',
    rotationDegrees: 360,
  },
};

// --- Export Preset ---

export const polygonMaskRevealEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
