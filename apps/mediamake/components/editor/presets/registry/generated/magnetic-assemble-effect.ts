/**
 * Magnetic Assemble Effect Preset
 *
 * A physics-inspired magnetic assembly effect where flat cutout pieces snap together from 
 * scattered positions. Features spring physics motion with acceleration, deceleration, and 
 * satisfying snap. Supports multiple assembly patterns (grid, circle, line, custom), 
 * configurable scatter radius, piece count, rotation during movement, and optional floating shadows.
 *
 * This is an INTERNAL EFFECT PRESET that returns an ARRAY OF EFFECTS.
 * Each effect represents one piece's magnetic assembly animation with calculated magnetic paths.
 *
 * Features:
 * - Physics-based motion with spring easing
 * - Multiple assembly patterns (grid, circle, line, custom)
 * - Configurable scatter radius and piece count
 * - Optional rotation during assembly
 * - Adjustable magnet strength
 * - Optional floating shadows
 * - Staggered timing for sequential snapping
 *
 * Use cases:
 * - Logo assembly animations
 * - Image reveal effects
 * - Text character assembly
 * - Puzzle-like transitions
 * - Exploded view animations (in reverse)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to animate (each represents a piece)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  snapDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.2)
    .describe('Duration for each piece to snap into place (seconds)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.05)
    .describe('Delay between each piece starting its animation (seconds)'),
  scatterRadius: z
    .number()
    .min(50)
    .max(2000)
    .default(300)
    .describe('Maximum distance pieces scatter from final position (pixels)'),
  assemblyPattern: z
    .enum(['grid', 'circle', 'line', 'random'])
    .default('random')
    .describe('Pattern for piece final positions'),
  rotateWhileMoving: z
    .boolean()
    .default(true)
    .describe('Whether pieces rotate during assembly'),
  magnetStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Strength of magnetic snap effect (0-1, affects overshoot)'),
  addShadows: z
    .boolean()
    .default(true)
    .describe('Whether to add floating shadows during assembly'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of floating shadows (0-1)'),
  customPositions: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
      }),
    )
    .optional()
    .describe('Custom final positions for pieces (overrides assemblyPattern)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    effectStart,
    snapDuration,
    staggerDelay,
    scatterRadius,
    assemblyPattern,
    rotateWhileMoving,
    magnetStrength,
    addShadows,
    shadowIntensity,
    customPositions,
  } = params;

  // Helper: Generate random scatter position
  const generateScatterPosition = (index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total + Math.random() * Math.PI * 0.3;
    const distance = scatterRadius * (0.7 + Math.random() * 0.3);
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Helper: Generate grid position
  const generateGridPosition = (index: number, total: number) => {
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;
    const spacing = 100;
    return {
      x: (col - cols / 2) * spacing,
      y: (row - cols / 2) * spacing,
    };
  };

  // Helper: Generate circle position
  const generateCirclePosition = (index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total;
    const radius = 200;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  // Helper: Generate line position
  const generateLinePosition = (index: number, total: number) => {
    const spacing = 120;
    const offset = ((total - 1) * spacing) / 2;
    return {
      x: index * spacing - offset,
      y: 0,
    };
  };

  // Helper: Generate final position based on pattern
  const generateFinalPosition = (index: number, total: number) => {
    if (customPositions && customPositions[index]) {
      return customPositions[index];
    }

    switch (assemblyPattern) {
      case 'grid':
        return generateGridPosition(index, total);
      case 'circle':
        return generateCirclePosition(index, total);
      case 'line':
        return generateLinePosition(index, total);
      case 'random':
      default:
        return { x: 0, y: 0 }; // Pieces converge to center
    }
  };

  // Helper: Calculate cubic-bezier for magnetic snap
  const getMagneticEasing = () => {
    // Adjust bezier curve based on magnet strength
    const overshoot = 1.3 + magnetStrength * 0.25;
    return `cubic-bezier(0.68, -0.55, 0.265, ${overshoot})`;
  };

  // Helper: Generate rotation values
  const generateRotation = (index: number) => {
    if (!rotateWhileMoving) return { start: 0, end: 0 };
    
    const baseRotation = (index % 2 === 0 ? 1 : -1) * (15 + Math.random() * 30);
    return {
      start: baseRotation * 3, // More rotation at start
      end: 0, // No rotation at end
    };
  };

  // Generate effects for each piece
  const effects = targetIds.map((targetId, index) => {
    const total = targetIds.length;
    const startPos = generateScatterPosition(index, total);
    const finalPos = generateFinalPosition(index, total);
    const rotation = generateRotation(index);
    
    // Calculate relative start time (staggered)
    const pieceStartTime = effectStart + index * staggerDelay;
    
    // Shadow calculation
    const maxShadowBlur = 20 * shadowIntensity;
    const maxShadowY = 15 * shadowIntensity;

    // Build animation ranges
    const ranges: Array<{ key: string; val: any; prog: number }> = [
      // Position animation (from scatter to final)
      { key: 'translateX', val: startPos.x, prog: 0 },
      { key: 'translateX', val: finalPos.x, prog: 1 },
      { key: 'translateY', val: startPos.y, prog: 0 },
      { key: 'translateY', val: finalPos.y, prog: 1 },
      
      // Scale animation (slight expansion then snap)
      { key: 'scale', val: 0.7, prog: 0 },
      { key: 'scale', val: 1.05, prog: 0.8 },
      { key: 'scale', val: 1, prog: 1 },
      
      // Opacity fade-in
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.2 },
    ];

    // Add rotation if enabled
    if (rotateWhileMoving) {
      ranges.push(
        { key: 'rotate', val: rotation.start, prog: 0 },
        { key: 'rotate', val: rotation.end, prog: 1 },
      );
    }

    // Add shadow effects if enabled
    if (addShadows) {
      ranges.push(
        // Shadow starts strong (floating), ends minimal (landed)
        {
          key: 'filter',
          val: `drop-shadow(0px ${maxShadowY}px ${maxShadowBlur}px rgba(0,0,0,${shadowIntensity}))`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0px ${maxShadowY * 0.3}px ${maxShadowBlur * 0.5}px rgba(0,0,0,${shadowIntensity * 0.3}))`,
          prog: 0.8,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
          prog: 1,
        },
      );
    }

    // Construct effect data
    const effectData: GenericEffectData = {
      type: 'spring', // Use spring physics for natural motion
      start: pieceStartTime,
      duration: snapDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
      props: {
        // Store easing in props for documentation
        customEasing: getMagneticEasing(),
      },
    };

    return {
      id: `magnetic-assemble-${targetId}-${index}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return effects in container structure
  return {
    output: {
      childrenData: [
        {
          id: 'magnetic-assemble-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectStart + snapDuration + (targetIds.length - 1) * staggerDelay + 1,
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
  id: 'magnetic-assemble-effect',
  title: 'Magnetic Assemble Effect',
  description:
    'A physics-inspired magnetic assembly effect where flat cutout pieces snap together from scattered positions. Features spring physics motion with acceleration, deceleration, and satisfying snap. Supports multiple assembly patterns (grid, circle, line, custom), configurable scatter radius, piece count, rotation during movement, and optional floating shadows. Outputs an array of generic effects with calculated magnetic paths using spring easing for natural motion.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'magnetic', 'assemble', 'physics', 'spring', 'animation'],
  
  // CRITICAL: Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  
  dependencies: {},
  
  defaultInputParams: {
    targetIds: ['piece-1', 'piece-2', 'piece-3', 'piece-4'],
    effectStart: 0,
    snapDuration: 1.2,
    staggerDelay: 0.05,
    scatterRadius: 300,
    assemblyPattern: 'random',
    rotateWhileMoving: true,
    magnetStrength: 0.8,
    addShadows: true,
    shadowIntensity: 0.5,
  },
};

// Export preset
export const magneticAssembleEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
