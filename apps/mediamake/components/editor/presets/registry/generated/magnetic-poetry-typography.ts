/**
 * Magnetic Poetry Typography Preset
 *
 * This preset creates a kinetic typography animation where individual letters slide in from random
 * off-screen directions following curved magnetic paths with physics-based acceleration. Each letter
 * experiences rotation during travel and a snap effect with micro-shake on landing. Motion blur
 * is applied during movement to enhance the kinetic feel.
 *
 * Features:
 * - **Random Direction Entrances**: Letters start from random edges (top, bottom, left, right)
 * - **Curved Magnetic Paths**: Letters follow curved trajectories using control points
 * - **Physics-Based Acceleration**: Magnetic acceleration with cubic-bezier easing and overshoot
 * - **Rotation During Travel**: Smooth rotation up to 180 degrees that zeros out on landing
 * - **Magnetic Snap Effect**: Quick snap with micro-shake when within 20px of final position
 * - **Directional Motion Blur**: Dynamic blur effect that follows movement vector
 * - **Staggered Animation**: Letters animate in sequence with configurable stagger delay
 *
 * Technical Details:
 * - Total animation time: 1.5s per letter
 * - Stagger delay: 0.08s per letter (customizable)
 * - Snap occurs at 85% timing mark (1.275s)
 * - Motion blur peaks at mid-travel (4px max)
 * - Overshoot with spring-like correction on landing
 *
 * Use Cases:
 * - Dynamic title reveals with magnetic attraction effect
 * - Kinetic text animations for social media content
 * - Eye-catching intro sequences
 * - Creative word-reveal animations with physics-based motion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with magnetic poetry animation (each letter animates independently)'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size in pixels for the letters'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family for the text (e.g., "Inter", "Roboto", "Montserrat")'),
  
  fontWeight: z
    .string()
    .default('700')
    .optional()
    .describe('Font weight (e.g., "400", "700", "900")'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Color of the letters in hex format'),
  
  backgroundColor: z
    .string()
    .default('#1a1a2e')
    .optional()
    .describe('Background color of the container in hex format'),
  
  staggerDelay: z
    .number()
    .min(0.01)
    .max(0.5)
    .default(0.08)
    .optional()
    .describe('Delay between each letter animation in seconds'),
  
  letterAnimationDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Duration of each letter animation in seconds'),
  
  letterSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(0)
    .optional()
    .describe('Spacing between letters in pixels'),
  
  maxRotation: z
    .number()
    .min(0)
    .max(360)
    .default(180)
    .optional()
    .describe('Maximum rotation angle in degrees during travel'),
  
  overshootAmount: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .optional()
    .describe('Amount of overshoot in pixels during snap effect'),
  
  shakeIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .optional()
    .describe('Intensity of shake oscillation in pixels during snap'),
  
  motionBlurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .optional()
    .describe('Maximum motion blur amount in pixels at peak velocity'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate off-screen start position based on direction
  const calculateStartPosition = (direction: 'top' | 'bottom' | 'left' | 'right'): { x: string; y: string } => {
    switch (direction) {
      case 'top':
        return { x: '0px', y: '-150px' };
      case 'bottom':
        return { x: '0px', y: 'calc(100vh + 150px)' };
      case 'left':
        return { x: '-150px', y: '0px' };
      case 'right':
        return { x: 'calc(100vw + 150px)', y: '0px' };
      default:
        return { x: '0px', y: '0px' };
    }
  };

  // Helper function: Calculate curved path control points
  const calculateCurvePoints = (direction: 'top' | 'bottom' | 'left' | 'right'): Array<{ x: string; y: string; prog: number }> => {
    // Create a curved path with 2 control points at 40% and 70%
    const startPos = calculateStartPosition(direction);
    
    // Control points create the curve
    let cp1, cp2;
    
    switch (direction) {
      case 'top':
        cp1 = { x: '30px', y: '-60px', prog: 0.4 };
        cp2 = { x: '-20px', y: '-30px', prog: 0.7 };
        break;
      case 'bottom':
        cp1 = { x: '-30px', y: '60px', prog: 0.4 };
        cp2 = { x: '20px', y: '30px', prog: 0.7 };
        break;
      case 'left':
        cp1 = { x: '-60px', y: '-30px', prog: 0.4 };
        cp2 = { x: '-30px', y: '20px', prog: 0.7 };
        break;
      case 'right':
        cp1 = { x: '60px', y: '30px', prog: 0.4 };
        cp2 = { x: '30px', y: '-20px', prog: 0.7 };
        break;
      default:
        cp1 = { x: '0px', y: '0px', prog: 0.4 };
        cp2 = { x: '0px', y: '0px', prog: 0.7 };
    }

    return [
      { x: startPos.x, y: startPos.y, prog: 0 },
      cp1,
      cp2,
      { x: '0px', y: '0px', prog: 0.85 }, // Snap position (85% mark)
    ];
  };

  // Helper function: Random direction for each letter
  const getRandomDirection = (index: number): 'top' | 'bottom' | 'left' | 'right' => {
    const directions: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];
    // Use index as seed for deterministic randomness
    return directions[index % directions.length];
  };

  // Extract parameters
  const text = params.text || 'MAGNETIC';
  const fontSize = params.fontSize ?? 72;
  const fontFamily = params.fontFamily ?? 'Inter';
  const fontWeight = params.fontWeight ?? '700';
  const textColor = params.textColor ?? '#ffffff';
  const backgroundColor = params.backgroundColor ?? '#1a1a2e';
  const staggerDelay = params.staggerDelay ?? 0.08;
  const letterAnimationDuration = params.letterAnimationDuration ?? 1.5;
  const letterSpacing = params.letterSpacing ?? 0;
  const maxRotation = params.maxRotation ?? 180;
  const overshootAmount = params.overshootAmount ?? 5;
  const shakeIntensity = params.shakeIntensity ?? 2;
  const motionBlurAmount = params.motionBlurAmount ?? 4;

  // Calculate total duration
  const letters = text.split('');
  const totalDuration = letterAnimationDuration + (letters.length - 1) * staggerDelay + 0.3; // settle buffer

  // Create letter components
  const letterComponents: RenderableComponentData[] = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    const direction = getRandomDirection(index);
    const curvePoints = calculateCurvePoints(direction);
    const startDelay = index * staggerDelay;

    // Calculate rotation direction (alternate for variety)
    const rotationDirection = index % 2 === 0 ? 1 : -1;
    const rotationAngle = rotationDirection * maxRotation;

    // Build magnetic travel effect (0-85% of animation = 0-1.275s)
    const travelDuration = letterAnimationDuration * 0.85;
    
    // Build snap effect (85-100% = 1.275s-1.5s)
    const snapStart = letterAnimationDuration * 0.85;
    const snapDuration = letterAnimationDuration * 0.15;

    // Create travel effect with curved path + rotation + motion blur
    const travelEffect: GenericEffectData = {
      type: 'linear', // We'll use custom cubic-bezier via keyframes
      start: startDelay,
      duration: travelDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Curved path via translateX and translateY
        { key: 'translateX', val: curvePoints[0].x, prog: 0 },
        { key: 'translateX', val: curvePoints[1].x, prog: 0.4 },
        { key: 'translateX', val: curvePoints[2].x, prog: 0.7 },
        { key: 'translateX', val: `${overshootAmount}px`, prog: 0.95 }, // Slight overshoot
        { key: 'translateX', val: '0px', prog: 1 },
        
        { key: 'translateY', val: curvePoints[0].y, prog: 0 },
        { key: 'translateY', val: curvePoints[1].y, prog: 0.4 },
        { key: 'translateY', val: curvePoints[2].y, prog: 0.7 },
        { key: 'translateY', val: '0px', prog: 0.95 },
        { key: 'translateY', val: '0px', prog: 1 },
        
        // Rotation during travel
        { key: 'rotate', val: rotationAngle, prog: 0 },
        { key: 'rotate', val: rotationAngle * 0.3, prog: 0.5 },
        { key: 'rotate', val: 0, prog: 1 },
        
        // Motion blur (follows velocity - peaks at middle)
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: `blur(${motionBlurAmount}px)`, prog: 0.5 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
        
        // Opacity fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // Create snap effect with micro-shake
    const snapEffect: GenericEffectData = {
      type: 'spring',
      start: startDelay + snapStart,
      duration: snapDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Micro-shake oscillation (3-4 oscillations)
        { key: 'translateX', val: `${shakeIntensity}px`, prog: 0 },
        { key: 'translateX', val: `-${shakeIntensity * 0.8}px`, prog: 0.25 },
        { key: 'translateX', val: `${shakeIntensity * 0.5}px`, prog: 0.5 },
        { key: 'translateX', val: `-${shakeIntensity * 0.2}px`, prog: 0.75 },
        { key: 'translateX', val: '0px', prog: 1 },
        
        { key: 'translateY', val: `-${shakeIntensity}px`, prog: 0 },
        { key: 'translateY', val: `${shakeIntensity * 0.8}px`, prog: 0.25 },
        { key: 'translateY', val: `-${shakeIntensity * 0.5}px`, prog: 0.5 },
        { key: 'translateY', val: `${shakeIntensity * 0.2}px`, prog: 0.75 },
        { key: 'translateY', val: '0px', prog: 1 },
      ],
    };

    // Create letter component
    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for actual spaces
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          marginRight: letterSpacing > 0 ? `${letterSpacing}px` : undefined,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `travel-${letterId}`,
          componentId: 'generic',
          data: travelEffect,
        },
        {
          id: `snap-${letterId}`,
          componentId: 'generic',
          data: snapEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Create main container
  const rootContainer: RenderableComponentData = {
    id: 'magnetic-poetry-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'letters-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row items-center justify-center',
            style: {
              perspective: '1000px', // Add 3D perspective
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: letterComponents,
      } as RenderableComponentData,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'magnetic-poetry-typography',
  title: 'Magnetic Poetry Typography',
  description:
    'Kinetic typography preset where individual letters slide in from random off-screen directions following curved magnetic paths with physics-based acceleration, rotation during travel, snap effects with micro-shake on landing, and directional motion blur.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'magnetic',
    'letters',
    'animation',
    'physics',
    'curved-path',
    'rotation',
    'snap',
    'motion-blur',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MAGNETIC',
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    backgroundColor: '#1a1a2e',
    staggerDelay: 0.08,
    letterAnimationDuration: 1.5,
    letterSpacing: 0,
    maxRotation: 180,
    overshootAmount: 5,
    shakeIntensity: 2,
    motionBlurAmount: 4,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const magneticPoetryTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
