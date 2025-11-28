/**
 * PencilScribble Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset generates multiple animated scribble overlay layers that create
 * a hand-drawn annotation effect around target components. Each layer has staggered timing,
 * different opacity values, and unique animation paths to create visual depth.
 *
 * Features:
 * - Configurable density (1-5 scribble layers)
 * - Multiple color palettes: graphite, colored-pencil, crayon
 * - Scribble patterns: circles, underlines, arrows, random
 * - Staggered timing for organic, hand-drawn feel
 * - Varying opacity and blur for depth perception
 * - CSS custom properties for dynamic stroke paths
 *
 * Returns an array of effects, one per scribble layer, each with unique timing offsets,
 * opacity values, and transform animations (translate, rotate) to simulate hand-drawn motion.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply scribble overlays to'),
  effectStart: z.number().describe('Start time of the effect (relative to parent timeline)'),
  effectDuration: z.number().describe('Duration of the effect animation'),
  density: z.number().min(1).max(5).default(3).describe('Number of scribble layers (1-5)'),
  speed: z.number().min(0.5).max(3).default(1).describe('Animation speed multiplier (0.5 = slower, 3 = faster)'),
  palette: z.enum(['graphite', 'colored-pencil', 'crayon']).default('graphite').describe('Color palette for scribbles'),
  pattern: z.enum(['circles', 'underlines', 'arrows', 'random']).default('circles').describe('Scribble pattern type'),
  seed: z.number().default(42).describe('Random seed for pattern generation'),
  effectIdPrefix: z.string().optional().describe('Optional prefix for effect IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Generate color based on palette
  const generateColor = (palette: string, index: number, seed: number): string => {
    const seededIndex = (index + seed) % 10;
    
    switch (palette) {
      case 'graphite':
        const graphiteShades = ['#2C2C2C', '#3A3A3A', '#4A4A4A', '#5A5A5A', '#6A6A6A'];
        return graphiteShades[seededIndex % graphiteShades.length];
      
      case 'colored-pencil':
        const pencilColors = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6C5CE7', '#FD79A8', '#74B9FF', '#A29BFE', '#FD79A8', '#FDCB6E', '#55EFC4'];
        return pencilColors[seededIndex % pencilColors.length];
      
      case 'crayon':
        const crayonColors = ['#E74C3C', '#3498DB', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#2ECC71', '#34495E', '#F1C40F', '#16A085'];
        return crayonColors[seededIndex % crayonColors.length];
      
      default:
        return '#4A4A4A';
    }
  };

  // Helper: Generate SVG path based on pattern
  const generatePath = (pattern: string, layerIndex: number, seed: number): string => {
    const seededOffset = (layerIndex * 7 + seed * 3) % 20;
    const variation = 10 + seededOffset;
    
    switch (pattern) {
      case 'circles':
        // Loose circular scribbles
        const cx = 50 + (seededOffset - 10);
        const cy = 50 + ((seededOffset * 2) % 20 - 10);
        const r = 35 + (layerIndex * 3);
        return `M${cx - r},${cy} Q${cx - r},${cy - r} ${cx},${cy - r} T${cx + r},${cy} T${cx},${cy + r} T${cx - r},${cy}`;
      
      case 'underlines':
        // Wavy underline scribbles
        const startX = 10 + seededOffset;
        const y = 60 + (layerIndex * 5);
        const endX = 90 - seededOffset;
        return `M${startX},${y} Q${startX + 20},${y - variation} ${startX + 40},${y} T${endX},${y}`;
      
      case 'arrows':
        // Arrow-like scribbles
        const arrowStartX = 20 + seededOffset;
        const arrowY = 40 + (layerIndex * 8);
        const arrowEndX = 80 - seededOffset;
        return `M${arrowStartX},${arrowY} L${arrowEndX - 10},${arrowY} M${arrowEndX - 15},${arrowY - 5} L${arrowEndX},${arrowY} L${arrowEndX - 15},${arrowY + 5}`;
      
      case 'random':
        // Random squiggly lines
        const points = [];
        const numPoints = 4 + (layerIndex % 3);
        for (let i = 0; i < numPoints; i++) {
          const x = 20 + (i * (60 / numPoints)) + ((seed * i * 7) % 15);
          const y = 40 + ((seed * i * 11) % 20) + (layerIndex * 5);
          points.push(`${x},${y}`);
        }
        let pathStr = `M${points[0]}`;
        for (let i = 1; i < points.length; i++) {
          pathStr += ` Q${points[i - 1]} ${points[i]}`;
        }
        return pathStr;
      
      default:
        return `M10,50 Q30,30 50,50 T90,50`;
    }
  };

  // Helper: Generate stroke width based on palette
  const generateStrokeWidth = (palette: string, layerIndex: number): number => {
    const baseWidths = {
      graphite: 2,
      'colored-pencil': 1.5,
      crayon: 2.5,
    };
    const base = baseWidths[palette as keyof typeof baseWidths] || 2;
    return base + (layerIndex % 3) * 0.3;
  };

  // Calculate stagger delay per layer
  const density = params.density;
  const speed = params.speed;
  const staggerDelay = (params.effectDuration * 0.2) / density / speed;

  // Generate scribble layer effects
  const effects: any[] = [];

  for (let i = 0; i < density; i++) {
    const layerId = `scribble-layer-${i}`;
    const color = generateColor(params.palette, i, params.seed);
    const path = generatePath(params.pattern, i, params.seed);
    const strokeWidth = generateStrokeWidth(params.palette, i);
    
    // Opacity varies per layer for depth (0.3 to 0.6)
    const baseOpacity = 0.3 + (i / density) * 0.3;
    
    // Timing: Stagger start times
    const layerStartTime = params.effectStart + (i * staggerDelay);
    const layerDuration = params.effectDuration / speed;
    
    // Create SVG scribble HTML
    const scribbleHTML = `
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;position:absolute;top:0;left:0;pointer-events:none;">
        <path d="${path}" stroke="${color}" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${baseOpacity}"/>
      </svg>
    `;

    // Generate unique scribble overlay component ID
    const scribbleOverlayId = `${params.targetId}-scribble-${i}`;

    // Create effect data for this scribble layer
    const scribbleEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: layerStartTime,
      duration: layerDuration,
      mode: 'provider',
      targetIds: [scribbleOverlayId],
      ranges: [
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: baseOpacity, prog: 0.3 },
        { key: 'opacity', val: baseOpacity * 0.9, prog: 0.6 },
        { key: 'opacity', val: baseOpacity, prog: 1 },
        
        // Subtle translate animation (hand-drawn wiggle)
        { key: 'translateX', val: (i % 2 === 0 ? -2 : 2) + 'px', prog: 0 },
        { key: 'translateX', val: (i % 2 === 0 ? 2 : -2) + 'px', prog: 0.5 },
        { key: 'translateX', val: '0px', prog: 1 },
        
        // Subtle rotation for organic feel
        { key: 'rotate', val: (i % 2 === 0 ? -1 : 1), prog: 0 },
        { key: 'rotate', val: (i % 2 === 0 ? 1 : -1), prog: 0.5 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    };

    // Add blur for background layers (creates depth)
    if (i > density / 2) {
      scribbleEffect.ranges!.push(
        { key: 'filter', val: 'blur(1px)', prog: 0 },
        { key: 'filter', val: 'blur(0.5px)', prog: 0.5 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      );
    }

    const effect = {
      id: params.effectIdPrefix ? `${params.effectIdPrefix}-${layerId}` : layerId,
      componentId: 'generic',
      data: scribbleEffect,
    };

    effects.push(effect);
  }

  // Return structure with effects attached to container
  return {
    output: {
      childrenData: [
        {
          id: 'pencil-scribble-effect-container',
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
        } as RenderableComponentData,
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'pencilScribbleEffect',
  title: 'Pencil Scribble Effect',
  description: 'Internal effect preset that adds animated hand-drawn scribble overlays with configurable density, patterns, and color palettes',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'scribble', 'hand-drawn', 'annotation', 'pencil', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'text-component',
    effectStart: 0,
    effectDuration: 3,
    density: 3,
    speed: 1,
    palette: 'graphite',
    pattern: 'circles',
    seed: 42,
  },
};

export const pencilScribbleEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
