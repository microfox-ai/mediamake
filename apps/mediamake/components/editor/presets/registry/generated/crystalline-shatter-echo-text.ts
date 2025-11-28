/**
 * Crystalline Shatter Echo Text Effect Preset
 *
 * This preset creates a high-impact shatter effect where text fragments into glass-like shards
 * with prismatic color splitting. Multiple ghost layers show progressive fragmentation stages,
 * from hairline cracks to fully separated crystal pieces. Each shard rotates individually,
 * creating dynamic light refraction with rainbow edges. Distant ghosts feature frosted glass blur.
 *
 * Features:
 * - Progressive fragmentation across 5 ghost layers (hairline → full shatter)
 * - 15-20 Voronoi-tessellated shards per ghost with clip-path polygons
 * - Chromatic aberration via RGB-offset drop-shadows
 * - Individual shard rotation (tumbling effect)
 * - Prismatic edge gradients for light refraction
 * - Frosted glass backdrop-filter on distant ghosts
 * - Radial delay from center (0.05s per shard)
 * - Hardware-accelerated 3D transforms
 *
 * Use cases:
 * - High-energy title reveals
 * - Impact moments in sports/action content
 * - Tech product launches
 * - Dramatic text emphasis
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text to display with shatter effect'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size in pixels for the main text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text (e.g., "Inter", "Roboto")'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the effect in seconds'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base color of the text (hex or rgba)'),
  shardCount: z
    .number()
    .min(10)
    .max(25)
    .default(18)
    .describe('Number of shards per ghost layer (10-25)'),
  shatterIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for shard displacement and rotation'),
  chromaticAberration: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('RGB offset in pixels for chromatic aberration effect'),
  glassBlur: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Maximum frosted glass blur for distant ghosts (in pixels)'),
});

const presetExecution = (
  params: z.infer&lt;typeof presetParams&gt;,
  props: PresetPassedProps,
): PresetOutput =&gt; {
  const {
    text,
    fontSize,
    fontFamily,
    duration,
    textColor,
    shardCount,
    shatterIntensity,
    chromaticAberration,
    glassBlur,
  } = params;

  // Helper: Generate Voronoi-like tessellation points for shards
  const generateVoronoiPoints = (count: number, seed: number): Array&lt;{ x: number; y: number }&gt; =&gt; {
    const points: Array&lt;{ x: number; y: number }&gt; = [];
    // Simple pseudo-random generator for reproducibility
    let rng = seed;
    const random = () =&gt; {
      rng = (rng * 9301 + 49297) % 233280;
      return rng / 233280;
    };

    for (let i = 0; i &lt; count; i++) {
      points.push({
        x: random() * 100,
        y: random() * 100,
      });
    }
    return points;
  };

  // Helper: Calculate distance from center
  const distanceFromCenter = (x: number, y: number): number =&gt; {
    const dx = x - 50;
    const dy = y - 50;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper: Generate clip-path polygon for a shard (simplified Voronoi cell)
  const generateShardClipPath = (
    center: { x: number; y: number },
    index: number,
    total: number,
  ): string =&gt; {
    // Create a rough polygon around the center point
    const angleStep = (Math.PI * 2) / 6; // Hexagonal approximation
    const radius = 15 + (index % 3) * 5; // Vary size
    const points: string[] = [];

    for (let i = 0; i &lt; 6; i++) {
      const angle = angleStep * i + (index * 0.5); // Slight rotation per shard
      const px = center.x + Math.cos(angle) * radius;
      const py = center.y + Math.sin(angle) * radius;
      points.push(`${Math.max(0, Math.min(100, px))}% ${Math.max(0, Math.min(100, py))}%`);
    }

    return `polygon(${points.join(', ')})`;
  };

  // Helper: Create shard component with effects
  const createShard = (
    shardId: string,
    clipPath: string,
    center: { x: number; y: number },
    fragmentationLevel: number,
    ghostIndex: number,
  ) =&gt; {
    const distance = distanceFromCenter(center.x, center.y);
    const normalizedDistance = distance / 70.7; // Max distance ~70.7 from center to corner

    // Calculate displacement based on fragmentation level
    const baseDisplacement = fragmentationLevel * shatterIntensity * 80;
    const angle = Math.atan2(center.y - 50, center.x - 50);
    const translateX = Math.cos(angle) * baseDisplacement * normalizedDistance;
    const translateY = Math.sin(angle) * baseDisplacement * normalizedDistance;

    // Calculate rotation (tumbling)
    const rotationRange = 180 * fragmentationLevel * shatterIntensity;
    const rotation = ((center.x + center.y) % 360) - 180; // Pseudo-random rotation

    // Calculate opacity based on shard size (larger = more opaque)
    const shardOpacity = 0.6 + (normalizedDistance * 0.4);

    // Radial delay from center
    const delay = normalizedDistance * 0.05;

    // Chromatic aberration offsets
    const rgbOffset = chromaticAberration * fragmentationLevel;

    return {
      id: shardId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `&lt;div style="width: 100%; height: 100%; background: ${textColor}; clip-path: ${clipPath};"&gt;&lt;/div&gt;`,
        className: 'absolute overflow-hidden',
        style: {
          left: `${center.x}%`,
          top: `${center.y}%`,
          width: '30%',
          height: '30%',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform, opacity',
          // Prismatic edge gradient overlay
          background: `linear-gradient(45deg, transparent, rgba(255,255,255,0.3))`,
          mixBlendMode: 'overlay' as const,
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
          id: `${shardId}-shatter`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: delay,
            duration: duration - delay,
            mode: 'provider' as const,
            targetIds: [shardId],
            ranges: [
              // Translation (outward explosion)
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: translateX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: translateY, prog: 1 },
              // Rotation (tumbling)
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotation * rotationRange / 180, prog: 1 },
              // Opacity fade
              { key: 'opacity', val: shardOpacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: `${shardId}-chromatic`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: delay,
            duration: duration - delay,
            mode: 'provider' as const,
            targetIds: [shardId],
            ranges: [
              {
                key: 'filter',
                val: `drop-shadow(${rgbOffset}px 0 0 rgba(255,0,0,0.8)) drop-shadow(-${rgbOffset}px 0 0 rgba(0,0,255,0.8)) drop-shadow(0 ${rgbOffset}px 0 rgba(0,255,0,0.6))`,
                prog: 0.2,
              },
              {
                key: 'filter',
                val: `drop-shadow(${rgbOffset * 2}px 0 0 rgba(255,0,0,0.6)) drop-shadow(-${rgbOffset * 2}px 0 0 rgba(0,0,255,0.6)) drop-shadow(0 ${rgbOffset * 2}px 0 rgba(0,255,0,0.4))`,
                prog: 1,
              },
            ],
          },
        },
      ],
    };
  };

  // Generate ghost layers with progressive fragmentation
  const ghostLayers: RenderableComponentData[] = [];

  // Ghost layer configurations (5 layers)
  const ghostConfigs = [
    { name: 'hairline-cracks', fragmentation: 0.1, blur: 0, opacity: 0.8 },
    { name: 'light-fragmentation', fragmentation: 0.3, blur: 0, opacity: 0.6 },
    { name: 'medium-fragmentation', fragmentation: 0.5, blur: glassBlur * 0.25, opacity: 0.4 },
    { name: 'heavy-fragmentation', fragmentation: 0.75, blur: glassBlur * 0.5, opacity: 0.25 },
    { name: 'fully-shattered', fragmentation: 1.0, blur: glassBlur, opacity: 0.15 },
  ];

  ghostConfigs.forEach((config, ghostIndex) =&gt; {
    const voronoiPoints = generateVoronoiPoints(shardCount, ghostIndex + 1);
    const shards: RenderableComponentData[] = voronoiPoints.map((point, shardIndex) =&gt; {
      const shardId = `shard-ghost${ghostIndex}-${shardIndex}`;
      const clipPath = generateShardClipPath(point, shardIndex, shardCount);

      return createShard(shardId, clipPath, point, config.fragmentation, ghostIndex);
    });

    ghostLayers.push({
      id: `ghost-layer-${ghostIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backdropFilter: config.blur &gt; 0 ? `blur(${config.blur}px)` : undefined,
            opacity: config.opacity,
            willChange: 'opacity, backdrop-filter',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: shards as RenderableComponentData[],
    });
  });

  // Main text layer (foreground, z-10)
  const mainTextLayer: RenderableComponentData = {
    id: 'main-text-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'main-text',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: text,
          style: {
            fontSize: fontSize,
            fontWeight: 'bold' as const,
            color: textColor,
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
          },
          font: {
            family: fontFamily,
            weights: ['700'],
            display: 'swap' as const,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
    ] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'crystalline-shatter-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [...ghostLayers.reverse(), mainTextLayer] as RenderableComponentData[],
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
  id: 'crystalline-shatter-echo-text',
  title: 'Crystalline Shatter Echo Text Effect',
  description:
    'High-speed shatter effect where text fragments into glass-like shards with prismatic color splitting, progressive fragmentation across ghost layers, individual shard rotation, and frosted glass blur on distant ghosts. Simulates frozen frames of text shattering like ice.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'shatter',
    'glass',
    'crystal',
    'prismatic',
    'fragmentation',
    'ghost',
    'chromatic-aberration',
    'voronoi',
    'impact',
    'kinetic',
  ],
  defaultInputParams: {
    text: 'SHATTER',
    fontSize: 120,
    fontFamily: 'Inter',
    duration: 5,
    textColor: '#ffffff',
    shardCount: 18,
    shatterIntensity: 1,
    chromaticAberration: 3,
    glassBlur: 8,
  },
  dependencies: {},
};

export const crystallineShatterEchoTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};