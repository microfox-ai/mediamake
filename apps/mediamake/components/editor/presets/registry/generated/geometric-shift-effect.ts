/**
 * GeometricShift Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a minimal, pattern-based transformation that animates elements through calculated
 * geometric positions forming subtle patterns (square, triangle, or hexagon paths).
 *
 * Features:
 * - Multiple geometric shapes: square (4 vertices), triangle (3 vertices), hexagon (6 vertices)
 * - Precise vertex calculations based on shapeSize radius
 * - Rotation offset for changing starting vertex position
 * - Smooth ease-in-out transitions between vertices
 * - Configurable cycle duration for hypnotic motion patterns
 *
 * Technical Details:
 * - Uses generic effect type with calculated translateX/translateY keyframe ranges
 * - Vertices are positioned on a circle with specified radius
 * - Each shape has evenly distributed vertices around the circle
 * - Movement creates a continuous path through all vertices
 *
 * Use cases:
 * - Adding subtle motion to static elements
 * - Creating hypnotic background animations
 * - Geometric pattern-based visual effects
 * - Minimal, mathematical motion design
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters with Zod schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the geometric shift effect to'),
  shapeType: z
    .enum(['square', 'triangle', 'hexagon'])
    .describe('Type of geometric shape path: square (4 vertices), triangle (3 vertices), or hexagon (6 vertices)'),
  shapeSize: z
    .number()
    .min(1)
    .describe('Radius of the geometric shape in pixels - determines how far elements move from center'),
  rotationOffset: z
    .number()
    .default(0)
    .optional()
    .describe('Rotation offset in degrees to change the starting vertex position (0-360)'),
  cycleDuration: z
    .number()
    .default(2000)
    .optional()
    .describe('Duration of one complete cycle through all vertices in milliseconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetIds, shapeType, shapeSize, rotationOffset = 0, cycleDuration = 2000 } = params;

  // Helper function to calculate vertex positions based on shape type
  const calculateVertices = (
    shape: 'square' | 'triangle' | 'hexagon',
    radius: number,
    rotationDeg: number,
  ): { x: number; y: number; prog: number }[] => {
    const rotationRad = (rotationDeg * Math.PI) / 180;
    
    let vertexCount: number;
    switch (shape) {
      case 'triangle':
        vertexCount = 3;
        break;
      case 'square':
        vertexCount = 4;
        break;
      case 'hexagon':
        vertexCount = 6;
        break;
    }

    const vertices: { x: number; y: number; prog: number }[] = [];
    
    for (let i = 0; i <= vertexCount; i++) {
      const angle = (i / vertexCount) * 2 * Math.PI + rotationRad;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const prog = i / vertexCount;
      
      vertices.push({ x, y, prog });
    }

    return vertices;
  };

  // Calculate vertices for the selected shape
  const vertices = calculateVertices(shapeType, shapeSize, rotationOffset);

  // Build translateX ranges
  const translateXRanges = vertices.map((vertex) => ({
    key: 'translateX',
    val: Math.round(vertex.x),
    prog: vertex.prog,
  }));

  // Build translateY ranges
  const translateYRanges = vertices.map((vertex) => ({
    key: 'translateY',
    val: Math.round(vertex.y),
    prog: vertex.prog,
  }));

  // Combine all ranges
  const ranges = [...translateXRanges, ...translateYRanges];

  // Construct generic effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: cycleDuration / 1000, // Convert milliseconds to seconds
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
  };

  // Create effect object
  const effect = {
    id: `geometric-shift-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'geometric-shift-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          effects: [effect],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'geometric-shift-effect',
  title: 'GeometricShift Internal Effect',
  description:
    'An internal effect preset that creates minimal, pattern-based transformations by animating elements along geometric paths (square, triangle, or hexagon vertices). Returns generic effect configurations with calculated translateX/translateY keyframe ranges based on shapeType, shapeSize, and rotationOffset parameters. The effect produces smooth, hypnotic motion with ease-in-out transitions between vertices.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'geometric', 'internal', 'generic', 'motion', 'pattern'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    shapeType: 'square',
    shapeSize: 50,
    rotationOffset: 0,
    cycleDuration: 2000,
  },
};

// Export preset
export const geometricShiftEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
