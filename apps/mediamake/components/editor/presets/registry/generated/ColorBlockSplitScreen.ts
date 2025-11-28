/**
 * Color Block Split Screen Effect Preset
 *
 * This internal effect preset creates dynamic split-screen animations where colored panels
 * slide in from different edges, momentarily divide the screen into sections, then merge
 * or slide out. Perfect for content transitions, section dividers, or dynamic visual effects.
 *
 * Features:
 * - **Multiple Split Modes**: 2-way, 3-way, or 4-way splits
 * - **Orientation Options**: Vertical, horizontal, or diagonal layouts
 * - **Animation Patterns**: Slide, rotate, and scale effects
 * - **Customizable Colors**: Individual colors for each section
 * - **Timing Control**: Staggered entry, hold duration, synchronized exit
 * - **Depth Effects**: Optional drop shadows and borders for visual depth
 *
 * Use cases:
 * - Content section transitions
 * - Dynamic screen wipes
 * - Multi-panel reveal effects
 * - Visual storytelling with split screens
 * - Animated color block compositions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  splitCount: z
    .number()
    .min(2)
    .max(4)
    .default(2)
    .describe('Number of split sections (2, 3, or 4)'),
  
  sectionColors: z
    .array(z.string())
    .default(['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'])
    .describe('Array of colors for each section (hex or CSS color)'),
  
  orientation: z
    .enum(['vertical', 'horizontal', 'diagonal'])
    .default('vertical')
    .describe('Split orientation - vertical, horizontal, or diagonal'),
  
  animationPattern: z
    .enum(['slide', 'rotate', 'scale', 'combined'])
    .default('slide')
    .describe('Animation pattern - slide, rotate, scale, or combined'),
  
  duration: z
    .number()
    .min(500)
    .max(5000)
    .default(1500)
    .describe('Total animation duration in milliseconds'),
  
  holdDuration: z
    .number()
    .min(0)
    .max(1000)
    .default(300)
    .describe('Duration to hold at peak split in milliseconds'),
  
  staggerTime: z
    .number()
    .min(0)
    .max(500)
    .default(100)
    .describe('Time offset between each section animation in milliseconds'),
  
  includeDepth: z
    .boolean()
    .default(true)
    .describe('Whether to include drop shadows and borders for depth'),
  
  targetIds: z
    .array(z.string())
    .default([])
    .optional()
    .describe('Optional target component IDs to apply effects to'),
  
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
  const durationSec = params.duration / 1000;
  const staggerSec = params.staggerTime / 1000;
  const holdSec = params.holdDuration / 1000;
  
  // Calculate animation phases (in progress 0-1)
  const slideInEnd = 0.3;
  const holdStart = slideInEnd;
  const holdEnd = 1 - slideInEnd;
  const slideOutStart = holdEnd;
  
  // Helper: Calculate section positioning based on orientation and index
  const getSectionStyle = (index: number, total: number) => {
    const baseStyle: Record<string, any> = {
      position: 'absolute',
      backgroundColor: params.sectionColors[index] || params.sectionColors[0],
      zIndex: 10 + index,
    };
    
    // Add depth effects
    if (params.includeDepth) {
      baseStyle.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
      baseStyle.border = '2px solid rgba(255, 255, 255, 0.1)';
    }
    
    // Position based on orientation
    if (params.orientation === 'vertical') {
      const width = `${100 / total}%`;
      const left = `${(100 / total) * index}%`;
      return {
        ...baseStyle,
        width,
        height: '100%',
        top: 0,
        left,
      };
    } else if (params.orientation === 'horizontal') {
      const height = `${100 / total}%`;
      const top = `${(100 / total) * index}%`;
      return {
        ...baseStyle,
        width: '100%',
        height,
        top,
        left: 0,
      };
    } else {
      // Diagonal - split into quadrants or triangular sections
      const width = `${100 / Math.ceil(total / 2)}%`;
      const height = `${100 / Math.ceil(total / 2)}%`;
      const isTopRow = index < Math.ceil(total / 2);
      const colIndex = index % Math.ceil(total / 2);
      
      return {
        ...baseStyle,
        width,
        height,
        top: isTopRow ? 0 : '50%',
        left: `${(100 / Math.ceil(total / 2)) * colIndex}%`,
      };
    }
  };
  
  // Helper: Get slide direction based on orientation and index
  const getSlideDirection = (index: number, total: number) => {
    if (params.orientation === 'vertical') {
      return index % 2 === 0 ? 'left' : 'right';
    } else if (params.orientation === 'horizontal') {
      return index % 2 === 0 ? 'top' : 'bottom';
    } else {
      // Diagonal - alternate corners
      const directions = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
      return directions[index % directions.length];
    }
  };
  
  // Helper: Create animation ranges based on pattern
  const createAnimationRanges = (
    sectionId: string,
    index: number,
    total: number,
  ): GenericEffectData['ranges'] => {
    const direction = getSlideDirection(index, total);
    const ranges: GenericEffectData['ranges'] = [];
    
    // Base slide animation
    if (params.animationPattern === 'slide' || params.animationPattern === 'combined') {
      if (direction === 'left') {
        ranges.push(
          { key: 'translateX', val: -100, prog: 0 },
          { key: 'translateX', val: 0, prog: slideInEnd },
          { key: 'translateX', val: 0, prog: holdEnd },
          { key: 'translateX', val: -100, prog: 1 },
        );
      } else if (direction === 'right') {
        ranges.push(
          { key: 'translateX', val: 100, prog: 0 },
          { key: 'translateX', val: 0, prog: slideInEnd },
          { key: 'translateX', val: 0, prog: holdEnd },
          { key: 'translateX', val: 100, prog: 1 },
        );
      } else if (direction === 'top') {
        ranges.push(
          { key: 'translateY', val: -100, prog: 0 },
          { key: 'translateY', val: 0, prog: slideInEnd },
          { key: 'translateY', val: 0, prog: holdEnd },
          { key: 'translateY', val: -100, prog: 1 },
        );
      } else if (direction === 'bottom') {
        ranges.push(
          { key: 'translateY', val: 100, prog: 0 },
          { key: 'translateY', val: 0, prog: slideInEnd },
          { key: 'translateY', val: 0, prog: holdEnd },
          { key: 'translateY', val: 100, prog: 1 },
        );
      } else if (direction === 'topLeft') {
        ranges.push(
          { key: 'translateX', val: -100, prog: 0 },
          { key: 'translateX', val: 0, prog: slideInEnd },
          { key: 'translateX', val: 0, prog: holdEnd },
          { key: 'translateX', val: -100, prog: 1 },
          { key: 'translateY', val: -100, prog: 0 },
          { key: 'translateY', val: 0, prog: slideInEnd },
          { key: 'translateY', val: 0, prog: holdEnd },
          { key: 'translateY', val: -100, prog: 1 },
        );
      } else if (direction === 'topRight') {
        ranges.push(
          { key: 'translateX', val: 100, prog: 0 },
          { key: 'translateX', val: 0, prog: slideInEnd },
          { key: 'translateX', val: 0, prog: holdEnd },
          { key: 'translateX', val: 100, prog: 1 },
          { key: 'translateY', val: -100, prog: 0 },
          { key: 'translateY', val: 0, prog: slideInEnd },
          { key: 'translateY', val: 0, prog: holdEnd },
          { key: 'translateY', val: -100, prog: 1 },
        );
      } else if (direction === 'bottomLeft') {
        ranges.push(
          { key: 'translateX', val: -100, prog: 0 },
          { key: 'translateX', val: 0, prog: slideInEnd },
          { key: 'translateX', val: 0, prog: holdEnd },
          { key: 'translateX', val: -100, prog: 1 },
          { key: 'translateY', val: 100, prog: 0 },
          { key: 'translateY', val: 0, prog: slideInEnd },
          { key: 'translateY', val: 0, prog: holdEnd },
          { key: 'translateY', val: 100, prog: 1 },
        );
      } else if (direction === 'bottomRight') {
        ranges.push(
          { key: 'translateX', val: 100, prog: 0 },
          { key: 'translateX', val: 0, prog: slideInEnd },
          { key: 'translateX', val: 0, prog: holdEnd },
          { key: 'translateX', val: 100, prog: 1 },
          { key: 'translateY', val: 100, prog: 0 },
          { key: 'translateY', val: 0, prog: slideInEnd },
          { key: 'translateY', val: 0, prog: holdEnd },
          { key: 'translateY', val: 100, prog: 1 },
        );
      }
    }
    
    // Rotation animation
    if (params.animationPattern === 'rotate' || params.animationPattern === 'combined') {
      const rotateAmount = index % 2 === 0 ? -5 : 5;
      ranges.push(
        { key: 'rotate', val: rotateAmount * 2, prog: 0 },
        { key: 'rotate', val: 0, prog: slideInEnd },
        { key: 'rotate', val: 0, prog: holdEnd },
        { key: 'rotate', val: rotateAmount * 2, prog: 1 },
      );
    }
    
    // Scale animation
    if (params.animationPattern === 'scale' || params.animationPattern === 'combined') {
      ranges.push(
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1, prog: slideInEnd },
        { key: 'scale', val: 1, prog: holdEnd },
        { key: 'scale', val: 0.8, prog: 1 },
      );
    }
    
    // Opacity for smooth entrance/exit
    ranges.push(
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: slideInEnd * 0.5 },
      { key: 'opacity', val: 1, prog: holdEnd + (1 - holdEnd) * 0.5 },
      { key: 'opacity', val: 0, prog: 1 },
    );
    
    return ranges;
  };
  
  // Build split sections and effects
  const splitSections: RenderableComponentData[] = [];
  
  for (let i = 0; i < params.splitCount; i++) {
    const sectionId = `${params.effectId || 'split'}-section-${i}`;
    const sectionStyle = getSectionStyle(i, params.splitCount);
    const startTime = i * staggerSec;
    
    // Create section container
    const section: RenderableComponentData = {
      id: sectionId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '',
        style: sectionStyle,
        className: 'pointer-events-none',
      },
      context: {
        timing: {
          start: startTime,
          duration: durationSec,
        },
      },
      effects: [
        {
          id: `${sectionId}-animation`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: durationSec,
            mode: 'provider',
            targetIds: [sectionId],
            ranges: createAnimationRanges(sectionId, i, params.splitCount),
          } as GenericEffectData,
        },
      ],
    };
    
    splitSections.push(section);
  }
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${params.effectId || 'color-block-split'}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationSec + (params.splitCount - 1) * staggerSec,
      },
    },
    childrenData: splitSections as RenderableComponentData[],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'ColorBlockSplitScreen',
  title: 'Color Block Split Screen Effect',
  description:
    'Dynamic split-screen effect where colored panels slide in from edges, divide the screen, then merge or slide out. Supports 2-4 way splits with customizable colors, orientations, and animation patterns.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'split-screen', 'transition', 'animation', 'color-blocks'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    splitCount: 2,
    sectionColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'],
    orientation: 'vertical',
    animationPattern: 'slide',
    duration: 1500,
    holdDuration: 300,
    staggerTime: 100,
    includeDepth: true,
    targetIds: [],
  },
};

// --- Export ---

export const ColorBlockSplitScreenPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
