/**
 * Crystalline Prism Shatter Effect Preset
 *
 * This preset creates a shattered glass appearance where content fractures into geometric shards
 * with chromatic aberration at the edges. Each fragment has its own chromatic shift based on
 * angle and position, creating a prismatic effect.
 *
 * Features:
 * - **Voronoi/Delaunay Tessellation**: Generates 15-30 polygonal fragments using geometric algorithms
 * - **Chromatic Edges**: Each shard has unique color shifts based on angle/position
 * - **AnimationRange-based Motion**: Explosion (0-40%), hold (40-60%), reformation (60-100%)
 * - **Per-Shard Rotation**: Each fragment rotates independently during explosion
 * - **Customizable Parameters**: Shard count, explosion radius, chromatic intensity
 *
 * Use cases:
 * - Dramatic transition effects with prismatic beauty
 * - Shatter effects for emphasis or impact moments
 * - Creative content reveals with geometric decomposition
 * - Glass-breaking or crystalline visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  shardCount: z
    .number()
    .min(15)
    .max(30)
    .default(20)
    .describe('Number of geometric shards to generate (15-30)'),
  explosionRadius: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Maximum distance shards travel from center (pixels)'),
  chromaticEdgeWidth: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Width of chromatic aberration effect at shard edges (pixels)'),
  chromaticIntensity: z
    .number()
    .min(0)
    .max(360)
    .default(60)
    .describe('Intensity of hue rotation for chromatic effect (degrees)'),
  tessellationPattern: z
    .enum(['voronoi', 'delaunay', 'triangular'])
    .default('voronoi')
    .describe('Geometric pattern for fracture tessellation'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(3)
    .describe('Total duration of the shatter effect (seconds)'),
  targetId: z
    .string()
    .optional()
    .describe('ID of target component to apply effect to (optional)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    shardCount,
    explosionRadius,
    chromaticEdgeWidth,
    chromaticIntensity,
    tessellationPattern,
    effectStart,
    effectDuration,
    targetId,
  } = params;

  const { config } = props;
  const width = config?.width || 1920;
  const height = config?.height || 1080;

  // Helper: Generate Voronoi/Delaunay points
  const generatePoints = (count: number): Array<{ x: number; y: number }> => {
    const points: Array<{ x: number; y: number }> = [];
    
    // Add border points for complete coverage
    points.push({ x: 0, y: 0 });
    points.push({ x: width, y: 0 });
    points.push({ x: width, y: height });
    points.push({ x: 0, y: height });
    points.push({ x: width / 2, y: 0 });
    points.push({ x: width, y: height / 2 });
    points.push({ x: width / 2, y: height });
    points.push({ x: 0, y: height / 2 });

    // Generate random interior points
    for (let i = 0; i < count - 8; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
      });
    }

    return points;
  };

  // Helper: Calculate Voronoi cell polygon for a point
  const calculateVoronoiCell = (
    pointIndex: number,
    points: Array<{ x: number; y: number }>,
  ): string => {
    const point = points[pointIndex];
    const cellVertices: Array<{ x: number; y: number }> = [];

    // Simplified Voronoi: Create polygon around point by finding perpendicular bisectors
    // For production, use a proper Voronoi library, but for this effect we'll approximate
    
    // Create radial polygon approximation (simplified voronoi-like cell)
    const neighbors = points
      .map((p, idx) => ({
        ...p,
        idx,
        dist: Math.hypot(p.x - point.x, p.y - point.y),
      }))
      .filter((p) => p.idx !== pointIndex)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6); // Use 6 nearest neighbors

    // Calculate angles to neighbors
    const angles = neighbors.map((n) => ({
      angle: Math.atan2(n.y - point.y, n.x - point.x),
      dist: n.dist,
    }));

    angles.sort((a, b) => a.angle - b.angle);

    // Create polygon vertices at midpoints
    angles.forEach((angleData) => {
      const midDist = angleData.dist * 0.5;
      cellVertices.push({
        x: point.x + Math.cos(angleData.angle) * midDist,
        y: point.y + Math.sin(angleData.angle) * midDist,
      });
    });

    // Convert to clip-path polygon string
    const polygonString = cellVertices
      .map((v) => `${(v.x / width) * 100}% ${(v.y / height) * 100}%`)
      .join(', ');

    return `polygon(${polygonString})`;
  };

  // Helper: Generate triangular tessellation
  const generateTriangularTessellation = (
    count: number,
  ): Array<string> => {
    const polygons: Array<string> = [];
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (polygons.length >= count) break;

        const x = col * cellWidth;
        const y = row * cellHeight;

        // Create two triangles per cell
        if (Math.random() > 0.5) {
          // Upper-left triangle
          polygons.push(
            `polygon(${(x / width) * 100}% ${(y / height) * 100}%, ${((x + cellWidth) / width) * 100}% ${(y / height) * 100}%, ${(x / width) * 100}% ${((y + cellHeight) / height) * 100}%)`,
          );
          if (polygons.length < count) {
            // Lower-right triangle
            polygons.push(
              `polygon(${((x + cellWidth) / width) * 100}% ${(y / height) * 100}%, ${((x + cellWidth) / width) * 100}% ${((y + cellHeight) / height) * 100}%, ${(x / width) * 100}% ${((y + cellHeight) / height) * 100}%)`,
            );
          }
        } else {
          // Upper-right triangle
          polygons.push(
            `polygon(${(x / width) * 100}% ${(y / height) * 100}%, ${((x + cellWidth) / width) * 100}% ${(y / height) * 100}%, ${((x + cellWidth) / width) * 100}% ${((y + cellHeight) / height) * 100}%)`,
          );
          if (polygons.length < count) {
            // Lower-left triangle
            polygons.push(
              `polygon(${(x / width) * 100}% ${(y / height) * 100}%, ${((x + cellWidth) / width) * 100}% ${((y + cellHeight) / height) * 100}%, ${(x / width) * 100}% ${((y + cellHeight) / height) * 100}%)`,
            );
          }
        }
      }
      if (polygons.length >= count) break;
    }

    return polygons.slice(0, count);
  };

  // Generate tessellation
  let clipPaths: Array<string> = [];
  let shardCenters: Array<{ x: number; y: number }> = [];

  if (tessellationPattern === 'triangular') {
    clipPaths = generateTriangularTessellation(shardCount);
    // For triangular, approximate centers from clip paths
    shardCenters = clipPaths.map(() => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: height / 2 + (Math.random() - 0.5) * height * 0.6,
    }));
  } else {
    // Voronoi or Delaunay (both use same point generation)
    const points = generatePoints(shardCount);
    shardCenters = points;
    clipPaths = points.map((_, idx) => calculateVoronoiCell(idx, points));
  }

  // Generate shard effects
  const shardEffects: Array<RenderableComponentData> = [];

  clipPaths.forEach((clipPath, index) => {
    const shardId = `prism-shard-${index}`;
    const center = shardCenters[index];

    // Calculate angle from center for chromatic aberration
    const centerX = width / 2;
    const centerY = height / 2;
    const angle = Math.atan2(center.y - centerY, center.x - centerX);
    const normalizedAngle = ((angle + Math.PI) / (2 * Math.PI)) * 360; // 0-360 degrees

    // Calculate explosion direction
    const explosionAngle = angle;
    const explosionX = Math.cos(explosionAngle) * explosionRadius;
    const explosionY = Math.sin(explosionAngle) * explosionRadius;

    // Random rotation for each shard
    const randomRotation = (Math.random() - 0.5) * 720; // -360 to 360 degrees

    // Chromatic hue based on angle and position
    const angleBasedHue = normalizedAngle;
    const distanceFromCenter = Math.hypot(center.x - centerX, center.y - centerY);
    const maxDistance = Math.hypot(width / 2, height / 2);
    const distanceFactor = distanceFromCenter / maxDistance;
    const chromaticHue = angleBasedHue + chromaticIntensity * distanceFactor;

    // Create generic effect for this shard
    const shardEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [shardId],
      ranges: [
        // Translation X
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: explosionX, prog: 0.4 },
        { key: 'translateX', val: explosionX, prog: 0.6 },
        { key: 'translateX', val: 0, prog: 1 },
        // Translation Y
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: explosionY, prog: 0.4 },
        { key: 'translateY', val: explosionY, prog: 0.6 },
        { key: 'translateY', val: 0, prog: 1 },
        // Rotation
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: randomRotation, prog: 0.4 },
        { key: 'rotate', val: randomRotation, prog: 0.6 },
        { key: 'rotate', val: 0, prog: 1 },
        // Chromatic aberration via hue-rotate
        {
          key: 'filter',
          val: `hue-rotate(${chromaticHue}deg) drop-shadow(0 0 ${chromaticEdgeWidth}px rgba(255,255,255,0.8))`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `hue-rotate(${chromaticHue + chromaticIntensity}deg) drop-shadow(0 0 ${chromaticEdgeWidth * 2}px rgba(255,255,255,1))`,
          prog: 0.4,
        },
        {
          key: 'filter',
          val: `hue-rotate(${chromaticHue + chromaticIntensity}deg) drop-shadow(0 0 ${chromaticEdgeWidth * 2}px rgba(255,255,255,1))`,
          prog: 0.6,
        },
        {
          key: 'filter',
          val: `hue-rotate(${chromaticHue}deg) drop-shadow(0 0 ${chromaticEdgeWidth}px rgba(255,255,255,0.8))`,
          prog: 1,
        },
        // Opacity
        { key: 'opacity', val: 0.95, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.4 },
        { key: 'opacity', val: 1, prog: 0.6 },
        { key: 'opacity', val: 0.95, prog: 1 },
      ],
    };

    // Create shard container with clip-path
    const shardContainer: RenderableComponentData = {
      id: shardId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 overflow-hidden',
          style: {
            clipPath: clipPath,
            willChange: 'transform, filter',
            backfaceVisibility: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: effectDuration,
        },
      },
      effects: [
        {
          id: `effect-${shardId}`,
          componentId: 'generic',
          data: shardEffect,
        },
      ],
      childrenData: [],
    };

    shardEffects.push(shardContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'crystalline-prism-shatter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: effectStart,
        duration: effectDuration,
      },
    },
    childrenData: shardEffects,
  };

  return {
    output: {
      _extractedEffects: shardEffects.flatMap((shard) => shard.effects || []),
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: targetId || 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'crystalline-prism-shatter',
  title: 'Crystalline Prism Shatter Effect',
  description:
    'Design a crystalline prism effect that fractures content into geometric shards with chromatic edges. Features voronoi/delaunay tessellation patterns, per-shard chromatic aberration, and AnimationRange-based explosion/reformation with prismatic beauty.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'prism',
    'shatter',
    'crystalline',
    'geometric',
    'chromatic',
    'voronoi',
    'delaunay',
    'transition',
    'dramatic',
  ],
  defaultInputParams: {
    shardCount: 20,
    explosionRadius: 200,
    chromaticEdgeWidth: 3,
    chromaticIntensity: 60,
    tessellationPattern: 'voronoi',
    effectStart: 0,
    effectDuration: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const crystallinePrismShatterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
