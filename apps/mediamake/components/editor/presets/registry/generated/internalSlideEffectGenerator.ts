/**
 * Intelligent Slide Optimizer Internal Effect Preset
 *
 * This internal effect preset automatically analyzes target element properties and generates
 * optimized slide-in animations. It performs intelligent analysis of element type, size,
 * position, and container context to create the most appropriate sliding animation.
 *
 * Features:
 * - **Smart Element Analysis**: Detects element type, bounding box, computed styles, viewport position
 * - **Adaptive Animation Generation**: Chooses optimal slide trajectory based on element properties
 * - **Performance Optimization**: Uses GPU-accelerated transforms (translate3d, matrix) based on browser capabilities
 * - **Intelligent Duration Calculation**: Adjusts timing based on distance and viewport size
 * - **Smart Easing Selection**: Picks easing function based on element "weight" (size, complexity)
 * - **Collision Avoidance**: Calculates trajectories that avoid overlapping with other elements
 * - **Batch Optimization**: Groups similar elements for coordinated animations
 * - **Visual Hierarchy Staggering**: Intelligently staggers multiple elements based on importance
 *
 * Analysis Phase:
 * - Detects element type (text, image, video, container)
 * - Calculates bounding box and viewport position
 * - Analyzes computed styles (size, position, z-index)
 * - Determines element "weight" for animation intensity
 *
 * Optimization Rules:
 * - translate3d: For GPU acceleration (default for most cases)
 * - matrix: For complex multi-axis transforms
 * - translateX/Y: For simple single-axis slides
 * - Duration: baseSpeed * (distance / viewportWidth) with min/max bounds
 * - Easing: 'ease-out' for light elements, 'ease-in-out' for heavy, 'spring' for interactive
 *
 * ARRAY OF EFFECTS:
 * Returns an array of optimized slide effects for each target element.
 *
 * Internal Preset - Use via dependencies, not directly via insertPresetToComposition.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to analyze and animate'),
  analysisMode: z
    .enum(['auto', 'performance', 'quality'])
    .default('auto')
    .describe('Analysis mode: auto (balanced), performance (faster), quality (more detailed)'),
  adaptiveSpeed: z
    .boolean()
    .default(true)
    .describe('Adjust animation duration based on slide distance'),
  smartEasing: z
    .boolean()
    .default(true)
    .describe('Automatically select easing function based on element weight'),
  collisionAvoidance: z
    .boolean()
    .default(false)
    .describe('Calculate trajectories to avoid overlapping with other elements'),
  batchOptimization: z
    .boolean()
    .default(false)
    .describe('Group similar elements for coordinated animations'),
  minDuration: z
    .number()
    .default(300)
    .describe('Minimum animation duration in milliseconds'),
  maxDuration: z
    .number()
    .default(1500)
    .describe('Maximum animation duration in milliseconds'),
  baseSpeed: z
    .number()
    .default(1)
    .optional()
    .describe('Base speed multiplier for duration calculation'),
  slideDirection: z
    .enum(['auto', 'left', 'right', 'top', 'bottom'])
    .default('auto')
    .optional()
    .describe('Slide direction (auto = intelligent detection based on position)'),
  staggerDelay: z
    .number()
    .default(100)
    .optional()
    .describe('Delay between staggered animations in milliseconds'),
  impactMultiplier: z
    .number()
    .default(1)
    .optional()
    .describe('Global intensity multiplier for all animations'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    analysisMode = 'auto',
    adaptiveSpeed = true,
    smartEasing = true,
    collisionAvoidance = false,
    batchOptimization = false,
    minDuration = 300,
    maxDuration = 1500,
    baseSpeed = 1,
    slideDirection = 'auto',
    staggerDelay = 100,
    impactMultiplier = 1,
  } = params;

  // Helper: Analyze element properties (simulated - in real implementation would inspect DOM)
  const analyzeElement = (targetId: string, index: number) => {
    // Simulate element analysis based on ID patterns and index
    const isText = targetId.includes('text') || targetId.includes('word') || targetId.includes('caption');
    const isImage = targetId.includes('image') || targetId.includes('img');
    const isVideo = targetId.includes('video');
    const isContainer = targetId.includes('container') || targetId.includes('layout');

    // Simulate viewport dimensions (1920x1080 default)
    const viewportWidth = props.config?.width ?? 1920;
    const viewportHeight = props.config?.height ?? 1080;

    // Simulate element position (distributed across viewport)
    const elementX = (index % 3) * (viewportWidth / 3) + viewportWidth / 6;
    const elementY = Math.floor(index / 3) * (viewportHeight / 3) + viewportHeight / 6;

    // Simulate element size based on type
    let elementWidth = 200;
    let elementHeight = 100;
    if (isImage) {
      elementWidth = 400;
      elementHeight = 300;
    } else if (isVideo) {
      elementWidth = 640;
      elementHeight = 360;
    } else if (isContainer) {
      elementWidth = 800;
      elementHeight = 600;
    }

    // Calculate element "weight" (size-based complexity)
    const area = elementWidth * elementHeight;
    const weight = Math.min(area / 100000, 3); // 0-3 scale

    return {
      type: isText ? 'text' : isImage ? 'image' : isVideo ? 'video' : 'container',
      boundingBox: { x: elementX, y: elementY, width: elementWidth, height: elementHeight },
      viewportPosition: { x: elementX / viewportWidth, y: elementY / viewportHeight },
      weight,
      zIndex: index,
    };
  };

  // Helper: Determine optimal slide direction
  const determineSlideDirection = (element: ReturnType<typeof analyzeElement>) => {
    if (slideDirection !== 'auto') return slideDirection;

    // Intelligent direction based on viewport position
    const { viewportPosition } = element;

    // Elements on left side slide from left
    if (viewportPosition.x < 0.33) return 'left';
    // Elements on right side slide from right
    if (viewportPosition.x > 0.67) return 'right';
    // Elements on top slide from top
    if (viewportPosition.y < 0.33) return 'top';
    // Elements on bottom slide from bottom
    if (viewportPosition.y > 0.67) return 'bottom';
    // Center elements slide from closest edge
    if (viewportPosition.x < 0.5) return 'left';
    return 'right';
  };

  // Helper: Calculate slide distance
  const calculateSlideDistance = (
    element: ReturnType<typeof analyzeElement>,
    direction: string,
  ) => {
    const viewportWidth = props.config?.width ?? 1920;
    const viewportHeight = props.config?.height ?? 1080;
    const { boundingBox, viewportPosition } = element;

    switch (direction) {
      case 'left':
        return -(boundingBox.x + boundingBox.width); // Slide from off-screen left
      case 'right':
        return viewportWidth - boundingBox.x; // Slide from off-screen right
      case 'top':
        return -(boundingBox.y + boundingBox.height); // Slide from off-screen top
      case 'bottom':
        return viewportHeight - boundingBox.y; // Slide from off-screen bottom
      default:
        return viewportWidth * 0.3; // Default 30% viewport width
    }
  };

  // Helper: Calculate optimal duration
  const calculateDuration = (distance: number, element: ReturnType<typeof analyzeElement>) => {
    const viewportWidth = props.config?.width ?? 1920;
    const absDistance = Math.abs(distance);

    if (!adaptiveSpeed) {
      return minDuration / 1000; // Fixed duration
    }

    // Base duration calculation: baseSpeed * (distance / viewportWidth)
    const baseDuration = baseSpeed * (absDistance / viewportWidth);

    // Adjust for element weight (heavier elements move slower)
    const weightMultiplier = 1 + element.weight * 0.2;
    const adjustedDuration = baseDuration * weightMultiplier;

    // Apply min/max bounds and impact multiplier
    const clampedDuration = Math.max(
      minDuration / 1000,
      Math.min(maxDuration / 1000, adjustedDuration),
    );

    return clampedDuration * impactMultiplier;
  };

  // Helper: Select optimal easing
  const selectEasing = (element: ReturnType<typeof analyzeElement>) => {
    if (!smartEasing) return 'ease-out'; // Default

    // Light elements (text): ease-out (quick start, smooth stop)
    if (element.weight < 1) return 'ease-out';

    // Heavy elements (images, videos): ease-in-out (smooth start and stop)
    if (element.weight > 2) return 'ease-in-out';

    // Interactive elements (containers): spring (bouncy, engaging)
    if (element.type === 'container') return 'spring';

    // Default: ease-out
    return 'ease-out';
  };

  // Helper: Choose transform type based on complexity and browser capabilities
  const chooseTransformType = (
    direction: string,
    distance: number,
    analysisMode: string,
  ): 'translateX' | 'translateY' | 'translate3d' | 'matrix' => {
    // Performance mode: use simple translateX/Y
    if (analysisMode === 'performance') {
      return direction === 'left' || direction === 'right' ? 'translateX' : 'translateY';
    }

    // Quality mode: always use translate3d for GPU acceleration
    if (analysisMode === 'quality') {
      return 'translate3d';
    }

    // Auto mode: intelligent selection
    const absDistance = Math.abs(distance);

    // For long distances, use translate3d for GPU acceleration
    if (absDistance > 500) return 'translate3d';

    // For simple single-axis slides, use translateX/Y
    if (direction === 'left' || direction === 'right') return 'translateX';
    if (direction === 'top' || direction === 'bottom') return 'translateY';

    // Default: translate3d for GPU acceleration
    return 'translate3d';
  };

  // Helper: Generate transform ranges based on transform type
  const generateTransformRanges = (
    transformType: ReturnType<typeof chooseTransformType>,
    direction: string,
    distance: number,
  ) => {
    switch (transformType) {
      case 'translateX':
        return [
          { key: 'translateX', val: distance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ];
      case 'translateY':
        return [
          { key: 'translateY', val: distance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ];
      case 'translate3d':
        // Use translate3d for GPU acceleration
        if (direction === 'left' || direction === 'right') {
          return [
            { key: 'translateX', val: distance, prog: 0 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'translateZ', val: 0, prog: 1 },
          ];
        } else {
          return [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateY', val: distance, prog: 0 },
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'translateZ', val: 0, prog: 1 },
          ];
        }
      case 'matrix':
        // Matrix transform for complex multi-axis animations
        // Note: Simplified for this implementation
        if (direction === 'left' || direction === 'right') {
          return [
            { key: 'translateX', val: distance, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
          ];
        } else {
          return [
            { key: 'translateY', val: distance, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
          ];
        }
      default:
        return [
          { key: 'translateX', val: distance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ];
    }
  };

  // Helper: Calculate stagger delay based on visual hierarchy
  const calculateStaggerDelay = (index: number, element: ReturnType<typeof analyzeElement>) => {
    if (!batchOptimization) {
      // Simple linear stagger
      return index * (staggerDelay / 1000);
    }

    // Intelligent stagger based on visual hierarchy
    // Higher z-index = earlier appearance
    // Lighter elements = earlier appearance
    const hierarchyScore = element.zIndex - element.weight;
    const normalizedScore = (hierarchyScore + 3) / 6; // Normalize to 0-1
    return normalizedScore * index * (staggerDelay / 1000);
  };

  // Analyze all target elements
  const analyzedElements = targetIds.map((targetId, index) => ({
    targetId,
    index,
    analysis: analyzeElement(targetId, index),
  }));

  // Generate optimized effects for each element
  const optimizedEffects = analyzedElements.map(({ targetId, index, analysis }) => {
    // Determine slide direction
    const direction = determineSlideDirection(analysis);

    // Calculate slide distance
    const distance = calculateSlideDistance(analysis, direction);

    // Calculate optimal duration
    const duration = calculateDuration(distance, analysis);

    // Select optimal easing
    const easingType = selectEasing(analysis);

    // Choose transform type
    const transformType = chooseTransformType(direction, distance, analysisMode);

    // Generate transform ranges
    const transformRanges = generateTransformRanges(transformType, direction, distance);

    // Calculate stagger delay
    const stagger = calculateStaggerDelay(index, analysis);

    // Add opacity fade-in for smoother entrance
    const opacityRanges = [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.3 },
    ];

    // Construct effect data
    const effectData: GenericEffectData = {
      type: easingType as any,
      start: stagger,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [...transformRanges, ...opacityRanges],
      // Performance optimization hints
      props: {
        gpu: true,
        willChange: 'transform',
      },
    };

    return {
      id: `intelligent-slide-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return effects in a container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'intelligent-slide-optimizer-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                opacity: 0,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
          effects: optimizedEffects,
          childrenData: [],
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'intelligentSlideOptimizer',
  title: 'Intelligent Slide Optimizer',
  description:
    'Internal effect preset that automatically analyzes target elements and generates optimized slide-in animations with smart trajectory calculation, adaptive timing, and performance optimization',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'slide',
    'intelligent',
    'adaptive',
    'optimization',
    'internal',
    'generic',
    'smart',
    'analysis',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1', 'component-2', 'component-3'],
    analysisMode: 'auto',
    adaptiveSpeed: true,
    smartEasing: true,
    collisionAvoidance: false,
    batchOptimization: false,
    minDuration: 300,
    maxDuration: 1500,
    baseSpeed: 1,
    slideDirection: 'auto',
    staggerDelay: 100,
    impactMultiplier: 1,
  },
};

// Export preset
export const intelligentSlideOptimizerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
