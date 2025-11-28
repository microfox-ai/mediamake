/**
 * Cellular Growth Effect Preset
 *
 * An expanding cellular growth effect that starts as a small circle and expands into an organic,
 * irregular shape like biological cell division. The expansion feels natural and alive, with subtle
 * wobbles and asymmetric growth patterns. Includes branching tendrils that extend from the main shape.
 *
 * Features:
 * - Organic shape expansion using complex clip-path animations
 * - Multiple growth layers with staggered timing
 * - Asymmetric, wobbling growth patterns
 * - Branching tendrils that extend during growth
 * - Spring easing with slight oscillation
 * - Subtle rotation during growth
 * - Highly customizable parameters
 *
 * Use cases:
 * - Organic transitions between scenes
 * - Nature-themed content reveals
 * - Biological/scientific visualizations
 * - Abstract, artistic intros/outros
 * - Cell division animations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  growthRate: z
    .number()
    .min(500)
    .max(2000)
    .default(1200)
    .describe('Duration of growth animation in milliseconds (500-2000ms)'),
  irregularity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe('Amount of irregularity in growth (0.1-0.5, higher = more irregular)'),
  branchCount: z
    .number()
    .int()
    .min(0)
    .max(4)
    .default(4)
    .describe('Number of branching tendrils (0-4)'),
  wobbleAmount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Amount of wobble/shake during growth in pixels (0-10px)'),
  finalSize: z
    .number()
    .min(1.5)
    .max(3.0)
    .default(2.2)
    .describe('Final size multiplier (1.5-3.0x original size)'),
  colorPrimary: z
    .string()
    .default('rgba(120,200,150,1)')
    .describe('Primary color for cell core'),
  colorSecondary: z
    .string()
    .default('rgba(80,160,120,0.8)')
    .describe('Secondary color for cell layers'),
  colorTertiary: z
    .string()
    .default('rgba(40,100,80,0.4)')
    .describe('Tertiary color for outer layers'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    growthRate,
    irregularity,
    branchCount,
    wobbleAmount,
    finalSize,
    colorPrimary,
    colorSecondary,
    colorTertiary,
    startTime,
  } = params;

  // Convert growth rate from milliseconds to seconds
  const growthDuration = growthRate / 1000;

  // Generate randomized control points for organic shape morphing
  const generateOrganicShapes = (steps: number) => {
    const shapes: string[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const sizeMultiplier = 0.5 + (finalSize - 0.5) * progress;
      
      // Create irregular ellipse shape with randomized radii
      const radiusX = 48 + irregularity * 8 * Math.sin(progress * Math.PI * 2 + i * 0.5);
      const radiusY = 52 + irregularity * 8 * Math.cos(progress * Math.PI * 3 + i * 0.7);
      const radiusZ = 45 + irregularity * 6 * Math.sin(progress * Math.PI * 4 + i * 1.1);
      const radiusW = 55 + irregularity * 7 * Math.cos(progress * Math.PI * 2.5 + i * 0.9);
      
      const shape = `${radiusX}% ${radiusY}% ${radiusZ}% ${radiusW}% / ${radiusW}% ${radiusX}% ${radiusY}% ${radiusZ}%`;
      shapes.push(shape);
    }
    
    return shapes;
  };

  // Generate keyframe shapes for organic growth (8 keyframes)
  const organicShapes = generateOrganicShapes(7);

  // Stagger timing for layers
  const coreLayerStart = 0;
  const layer1Start = growthDuration / 8;
  const layer2Start = growthDuration / 5;
  const tendrilStart = growthDuration / 2;

  // Create cell core layer
  const cellCore: RenderableComponentData = {
    id: 'cellular-growth-core',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="cell-core-element"></div>',
      className: 'absolute',
      style: {
        width: '60px',
        height: '60px',
        left: '50%',
        top: '50%',
        marginLeft: '-30px',
        marginTop: '-30px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${colorPrimary} 0%, ${colorSecondary} 70%, ${colorTertiary} 100%)`,
        filter: 'blur(1px)',
      },
    },
    context: {
      timing: {
        start: startTime + coreLayerStart,
        duration: growthDuration,
      },
    },
    effects: [
      {
        id: 'core-growth-effect',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: growthDuration,
          mode: 'provider',
          targetIds: ['cellular-growth-core'],
          ranges: [
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: finalSize * 0.8, prog: 0.2 },
            { key: 'scale', val: finalSize * 1.05, prog: 0.6 },
            { key: 'scale', val: finalSize, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.1 },
            { key: 'rotate', val: -5, prog: 0 },
            { key: 'rotate', val: 3, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create cell layer 1 (mid layer)
  const cellLayer1: RenderableComponentData = {
    id: 'cellular-growth-layer-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="cell-layer-1-element"></div>',
      className: 'absolute',
      style: {
        width: '100px',
        height: '100px',
        left: '50%',
        top: '50%',
        marginLeft: '-50px',
        marginTop: '-50px',
        borderRadius: organicShapes[0],
        background: `radial-gradient(ellipse, ${colorSecondary.replace('0.8', '0.6')} 0%, ${colorTertiary.replace('0.4', '0.3')} 60%, transparent 100%)`,
        filter: 'blur(3px)',
      },
    },
    context: {
      timing: {
        start: startTime + layer1Start,
        duration: growthDuration - layer1Start,
      },
    },
    effects: [
      {
        id: 'layer1-growth-effect',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: growthDuration - layer1Start,
          mode: 'provider',
          targetIds: ['cellular-growth-layer-1'],
          ranges: [
            { key: 'scale', val: 0.4, prog: 0 },
            { key: 'scale', val: finalSize * 0.9, prog: 0.25 },
            { key: 'scale', val: finalSize * 1.08, prog: 0.65 },
            { key: 'scale', val: finalSize * 1.1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.15 },
            { key: 'borderRadius', val: '50%', prog: 0 },
            { key: 'borderRadius', val: organicShapes[2], prog: 0.25 },
            { key: 'borderRadius', val: organicShapes[4], prog: 0.5 },
            { key: 'borderRadius', val: organicShapes[6], prog: 0.75 },
            { key: 'borderRadius', val: organicShapes[7], prog: 1 },
            { key: 'rotate', val: 2, prog: 0 },
            { key: 'rotate', val: -4, prog: 0.5 },
            { key: 'rotate', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create cell layer 2 (outer layer)
  const cellLayer2: RenderableComponentData = {
    id: 'cellular-growth-layer-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="cell-layer-2-element"></div>',
      className: 'absolute',
      style: {
        width: '140px',
        height: '140px',
        left: '50%',
        top: '50%',
        marginLeft: '-70px',
        marginTop: '-70px',
        borderRadius: organicShapes[0],
        background: `radial-gradient(ellipse, ${colorTertiary.replace('0.4', '0.4')} 0%, ${colorTertiary.replace('0.4', '0.15')} 50%, transparent 100%)`,
        filter: 'blur(5px)',
      },
    },
    context: {
      timing: {
        start: startTime + layer2Start,
        duration: growthDuration - layer2Start,
      },
    },
    effects: [
      {
        id: 'layer2-growth-effect',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: growthDuration - layer2Start,
          mode: 'provider',
          targetIds: ['cellular-growth-layer-2'],
          ranges: [
            { key: 'scale', val: 0.35, prog: 0 },
            { key: 'scale', val: finalSize * 0.95, prog: 0.3 },
            { key: 'scale', val: finalSize * 1.12, prog: 0.7 },
            { key: 'scale', val: finalSize * 1.2, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.2 },
            { key: 'borderRadius', val: '50%', prog: 0 },
            { key: 'borderRadius', val: organicShapes[1], prog: 0.2 },
            { key: 'borderRadius', val: organicShapes[3], prog: 0.4 },
            { key: 'borderRadius', val: organicShapes[5], prog: 0.6 },
            { key: 'borderRadius', val: organicShapes[7], prog: 0.8 },
            { key: 'borderRadius', val: organicShapes[6], prog: 1 },
            { key: 'rotate', val: -3, prog: 0 },
            { key: 'rotate', val: 5, prog: 0.5 },
            { key: 'rotate', val: -2, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create tendrils dynamically based on branchCount
  const tendrils: RenderableComponentData[] = [];
  const tendrilAngles = [45, 135, 225, 315]; // Base angles for 4 tendrils

  for (let i = 0; i < branchCount; i++) {
    const angle = tendrilAngles[i];
    const tendrilLength = 60 + i * 10; // Vary length
    const tendrilWidth = 8 - i; // Vary width
    const opacity = 0.8 - i * 0.1; // Vary opacity

    const tendril: RenderableComponentData = {
      id: `cellular-growth-tendril-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="tendril-element"></div>',
        className: 'absolute',
        style: {
          width: `${tendrilWidth}px`,
          height: `${tendrilLength}px`,
          left: '50%',
          top: '50%',
          marginLeft: `${-tendrilWidth / 2}px`,
          marginTop: `-${tendrilLength / 2}px`,
          borderRadius: `${tendrilWidth / 2}px ${tendrilWidth / 2}px 50% 50%`,
          background: `linear-gradient(to bottom, ${colorSecondary.replace('0.8', String(opacity))} 0%, ${colorTertiary.replace('0.4', '0.2')} 100%)`,
          transformOrigin: 'center top',
          transform: `rotate(${angle}deg)`,
        },
      },
      context: {
        timing: {
          start: startTime + tendrilStart,
          duration: growthDuration - tendrilStart,
        },
      },
      effects: [
        {
          id: `tendril-${i}-growth-effect`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: growthDuration - tendrilStart,
            mode: 'provider',
            targetIds: [`cellular-growth-tendril-${i}`],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 0.3, prog: 0.15 },
              { key: 'scaleY', val: 1.1, prog: 0.6 },
              { key: 'scaleY', val: 1, prog: 1 },
              { key: 'scaleX', val: 0.5, prog: 0 },
              { key: 'scaleX', val: 1.2, prog: 0.5 },
              { key: 'scaleX', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.1 },
              { key: 'translateY', val: `${wobbleAmount}px`, prog: 0.3 },
              { key: 'translateY', val: `${-wobbleAmount * 0.5}px`, prog: 0.6 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    };

    tendrils.push(tendril);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cellular-growth-root',
    type: 'layout',
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
        start: startTime,
        duration: growthDuration,
      },
    },
    childrenData: [cellCore, cellLayer1, cellLayer2, ...tendrils],
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
  id: 'cellular-growth-effect',
  title: 'Cellular Growth Effect',
  description:
    'An organic expanding cellular growth effect that starts as a small circle and expands into an irregular, biological shape with branching tendrils. Features asymmetric growth patterns, subtle wobbles, and spring-based easing for a natural, alive feeling. Perfect for organic transitions or nature-themed content reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'organic',
    'cellular',
    'growth',
    'biological',
    'nature',
    'transition',
    'reveal',
    'animation',
    'spring',
    'wobble',
  ],
  defaultInputParams: {
    growthRate: 1200,
    irregularity: 0.3,
    branchCount: 4,
    wobbleAmount: 3,
    finalSize: 2.2,
    colorPrimary: 'rgba(120,200,150,1)',
    colorSecondary: 'rgba(80,160,120,0.8)',
    colorTertiary: 'rgba(40,100,80,0.4)',
    startTime: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const cellularGrowthEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
