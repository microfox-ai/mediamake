/**
 * Grid Morph Transition Effect Preset
 *
 * This preset morphs elements between different grid layouts smoothly. Elements fluidly transition 
 * from one grid configuration to another (e.g., 3x3 to 2x4) with path interpolation and size adjustments.
 * During transition, elements follow curved paths (bezier curves) rather than straight lines, creating 
 * organic movement. Includes opacity pulsing during transition for emphasis.
 *
 * Features:
 * - **Grid Morphing**: Transitions elements from one grid layout (e.g., 3x3) to another (e.g., 2x4)
 * - **Bezier Path Interpolation**: Elements follow curved paths using bezier curves, not straight lines
 * - **Size Adaptation**: Elements scale to fit new grid cell sizes during transition
 * - **Rotation During Morph**: Elements rotate during transition for organic movement
 * - **Opacity Pulsing**: Elements pulse in opacity during transition for emphasis
 * - **Configurable Parameters**: Control grid configurations, duration, curvature, and rotation
 *
 * Use cases:
 * - Creating dynamic layout transitions for image galleries
 * - Morphing product showcases between different grid layouts
 * - Animated portfolio grid transformations
 * - Dynamic content reorganization with smooth transitions
 * - Creating engaging transitions between different content arrangements
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  fromGrid: z.object({
    cols: z.number().min(1).describe('Number of columns in the starting grid layout'),
    rows: z.number().min(1).describe('Number of rows in the starting grid layout'),
  }).describe('Starting grid configuration (e.g., {cols: 3, rows: 3})'),
  
  toGrid: z.object({
    cols: z.number().min(1).describe('Number of columns in the ending grid layout'),
    rows: z.number().min(1).describe('Number of rows in the ending grid layout'),
  }).describe('Ending grid configuration (e.g., {cols: 2, rows: 4})'),
  
  morphDuration: z.number().min(100).default(800).describe('Duration of the morph transition in milliseconds'),
  
  pathCurvature: z.number().min(0).max(1).default(0.3).describe('Amount of curve in the path (0 = straight line, 1 = maximum curve)'),
  
  sizeAdaptation: z.boolean().default(true).describe('Whether to scale elements to fit new grid cell sizes'),
  
  rotationDuringMorph: z.number().default(180).describe('Degrees of rotation applied during transition (rotates and returns)'),
  
  items: z.array(z.object({
    id: z.string().describe('Unique identifier for the grid item'),
    content: z.object({
      type: z.enum(['text', 'image', 'video', 'html']).describe('Type of content to display'),
      data: z.any().describe('Content data (text string, image src, video src, or HTML string)'),
    }).describe('Content to display in the grid item'),
    style: z.record(z.string(), z.any()).optional().describe('Optional CSS styles for the item'),
    className: z.string().optional().describe('Optional CSS classes for the item'),
  })).min(1).describe('Array of items to display in the grid'),
  
  containerStyle: z.record(z.string(), z.any()).optional().describe('Optional CSS styles for the grid container'),
  
  containerClassName: z.string().optional().describe('Optional CSS classes for the grid container'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    fromGrid,
    toGrid,
    morphDuration,
    pathCurvature,
    sizeAdaptation,
    rotationDuringMorph,
    items,
    containerStyle,
    containerClassName,
  } = params;

  const { config } = props;
  const viewportWidth = config?.width || 1920;
  const viewportHeight = config?.height || 1080;
  const durationInSeconds = morphDuration / 1000;

  // Helper function to calculate grid cell position and size
  const calculateGridCell = (
    index: number,
    cols: number,
    rows: number,
    width: number,
    height: number
  ): { x: number; y: number; width: number; height: number } => {
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    return {
      x: col * cellWidth,
      y: row * cellHeight,
      width: cellWidth,
      height: cellHeight,
    };
  };

  // Helper function to calculate bezier curve points
  const calculateBezierPath = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    curvature: number
  ): { controlX: number; controlY: number } => {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Perpendicular offset for curve control point
    const offsetX = -dy * curvature * 0.5;
    const offsetY = dx * curvature * 0.5;
    
    return {
      controlX: midX + offsetX,
      controlY: midY + offsetY,
    };
  };

  // Helper function to interpolate bezier curve at progress t
  const bezierInterpolate = (
    start: number,
    control: number,
    end: number,
    t: number
  ): number => {
    // Quadratic bezier formula: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    return (1 - t) * (1 - t) * start + 2 * (1 - t) * t * control + t * t * end;
  };

  // Generate child components for each grid item
  const childrenData: RenderableComponentData[] = items.map((item, index) => {
    // Calculate from and to positions
    const fromCell = calculateGridCell(index, fromGrid.cols, fromGrid.rows, viewportWidth, viewportHeight);
    const toCell = calculateGridCell(index, toGrid.cols, toGrid.rows, viewportWidth, viewportHeight);
    
    // Calculate bezier control points for path
    const { controlX, controlY } = calculateBezierPath(
      fromCell.x + fromCell.width / 2,
      fromCell.y + fromCell.height / 2,
      toCell.x + toCell.width / 2,
      toCell.y + toCell.height / 2,
      pathCurvature
    );

    // Calculate scale factors for size adaptation
    const fromScale = 1;
    const toScale = sizeAdaptation 
      ? Math.min(toCell.width / fromCell.width, toCell.height / fromCell.height)
      : 1;
    const midScale = fromScale + (toScale - fromScale) * 0.5;

    // Determine component ID based on content type
    let componentId: string;
    let atomData: any;
    
    switch (item.content.type) {
      case 'image':
        componentId = 'ImageAtom';
        atomData = {
          src: item.content.data,
          className: `w-full h-full object-cover ${item.className || ''}`,
          style: item.style || {},
        };
        break;
      case 'video':
        componentId = 'VideoAtom';
        atomData = {
          src: item.content.data,
          className: `w-full h-full object-cover ${item.className || ''}`,
          style: item.style || {},
        };
        break;
      case 'html':
        componentId = 'HTMLBlockAtom';
        atomData = {
          html: item.content.data,
          className: item.className || '',
          style: item.style || {},
        };
        break;
      case 'text':
      default:
        componentId = 'TextAtom';
        atomData = {
          text: item.content.data,
          className: item.className || '',
          style: {
            fontSize: '16px',
            textAlign: 'center',
            ...item.style,
          },
        };
        break;
    }

    // Create bezier path ranges for translateX and translateY
    // We'll sample 10 points along the bezier curve for smooth animation
    const numSamples = 10;
    const translateXRanges: any[] = [];
    const translateYRanges: any[] = [];
    
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const bezierX = bezierInterpolate(
        fromCell.x + fromCell.width / 2,
        controlX,
        toCell.x + toCell.width / 2,
        t
      );
      const bezierY = bezierInterpolate(
        fromCell.y + fromCell.height / 2,
        controlY,
        toCell.y + toCell.height / 2,
        t
      );
      
      // Offset to center the element
      const offsetX = bezierX - (fromCell.x + fromCell.width / 2);
      const offsetY = bezierY - (fromCell.y + fromCell.height / 2);
      
      translateXRanges.push({ key: 'translateX', val: offsetX, prog: t });
      translateYRanges.push({ key: 'translateY', val: offsetY, prog: t });
    }

    // Create morph effect with bezier path, scale, rotation, and opacity
    const morphEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: durationInSeconds,
      mode: 'provider',
      targetIds: [`grid-item-${item.id}`],
      ranges: [
        // Bezier path interpolation for X and Y
        ...translateXRanges,
        ...translateYRanges,
        // Scale animation (size adaptation)
        { key: 'scale', val: fromScale, prog: 0 },
        { key: 'scale', val: midScale, prog: 0.5 },
        { key: 'scale', val: toScale, prog: 1 },
        // Rotation animation
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: rotationDuringMorph, prog: 0.5 },
        { key: 'rotate', val: 0, prog: 1 },
        // Opacity pulsing
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    return {
      id: `grid-item-${item.id}`,
      type: 'atom' as const,
      componentId,
      data: atomData,
      context: {
        timing: {
          start: 0,
          duration: durationInSeconds,
        },
      },
      effects: [
        {
          id: `morph-effect-${item.id}`,
          componentId: 'generic',
          data: morphEffect,
        },
      ],
      childrenData: [],
    } as RenderableComponentData;
  });

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'grid-morph-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 ${containerClassName || ''}`,
        style: {
          overflow: 'hidden',
          ...containerStyle,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
    childrenData,
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
  id: 'GridMorphTransition',
  title: 'Grid Morph Transition',
  description: 'Morphs elements between different grid layouts with bezier path interpolation, size adaptation, rotation, and opacity pulsing. Elements transition fluidly from one grid configuration (e.g., 3x3) to another (e.g., 2x4) with organic curved paths and dynamic scaling.',
  type: 'predefined',
  presetType: 'children',
  tags: ['grid', 'morph', 'transition', 'bezier', 'animation', 'layout', 'transform'],
  defaultInputParams: {
    fromGrid: {
      cols: 3,
      rows: 3,
    },
    toGrid: {
      cols: 2,
      rows: 4,
    },
    morphDuration: 800,
    pathCurvature: 0.3,
    sizeAdaptation: true,
    rotationDuringMorph: 180,
    items: [
      {
        id: 'item-1',
        content: {
          type: 'text',
          data: 'Item 1',
        },
        style: {
          backgroundColor: '#FF6B6B',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
        },
      },
      {
        id: 'item-2',
        content: {
          type: 'text',
          data: 'Item 2',
        },
        style: {
          backgroundColor: '#4ECDC4',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
        },
      },
      {
        id: 'item-3',
        content: {
          type: 'text',
          data: 'Item 3',
        },
        style: {
          backgroundColor: '#45B7D1',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
        },
      },
      {
        id: 'item-4',
        content: {
          type: 'text',
          data: 'Item 4',
        },
        style: {
          backgroundColor: '#FFA07A',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
        },
      },
      {
        id: 'item-5',
        content: {
          type: 'text',
          data: 'Item 5',
        },
        style: {
          backgroundColor: '#98D8C8',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
        },
      },
      {
        id: 'item-6',
        content: {
          type: 'text',
          data: 'Item 6',
        },
        style: {
          backgroundColor: '#F7DC6F',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
        },
      },
    ],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const GridMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};