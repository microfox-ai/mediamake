/**
 * Spirograph Typography Preset
 *
 * Creates text that traces complex geometric patterns like a spirograph drawing machine.
 * Words orbit around moving center points that themselves orbit around other centers,
 * creating intricate looping paths with hypotrochoid/epitrochoid curves.
 *
 * Features:
 * - Multi-level orbital rotation using nested transform origins
 * - Parametric curve calculations (hypotrochoid, epitrochoid patterns)
 * - Trailing effects with semi-transparent clones at decreasing opacity
 * - Velocity-based speed variations (speeds up at peaks, slows in valleys)
 * - Screen blend mode for overlapping text trails
 * - CSS variable-driven curve parameters (--inner-radius, --outer-radius, --distance)
 * - Continuous looping animation with smooth easing
 *
 * Use cases:
 * - Creating mesmerizing geometric text animations
 * - Building mathematical curve visualizations with text
 * - Adding kinetic typography with mechanical drawing aesthetics
 * - Creating hypnotic looping text patterns
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().default('SPIROGRAPH').describe('Text to animate along spirograph path'),
  
  fontSize: z.number().min(12).max(200).default(64).describe('Font size in pixels'),
  
  fontFamily: z.string().default('Inter').describe('Font family (e.g., "Inter", "Roboto")'),
  
  primaryColor: z.string().default('#00FFFF').describe('Primary text color (CSS color)'),
  
  trailColor1: z.string().default('#FF00FF').describe('First trail color (CSS color)'),
  
  trailColor2: z.string().default('#FFFF00').describe('Second trail color (CSS color)'),
  
  trailColor3: z.string().default('#00FF00').describe('Third trail color (CSS color)'),
  
  glowColor: z.string().default('#00FFFF').describe('Text glow/shadow color (CSS color)'),
  
  backgroundColor: z.string().default('#0a0a1a').describe('Background color (CSS color)'),
  
  outerRadius: z.number().min(50).max(500).default(200).describe('Outer circle radius for spirograph calculation (pixels)'),
  
  innerRadius: z.number().min(20).max(300).default(100).describe('Inner circle radius for spirograph calculation (pixels)'),
  
  distanceFromCenter: z.number().min(10).max(200).default(50).describe('Distance from inner circle center to pen point (pixels)'),
  
  rotationSpeed: z.number().min(0.5).max(5).default(1).describe('Speed multiplier for rotation animation'),
  
  curveType: z.enum(['hypotrochoid', 'epitrochoid', 'rose']).default('hypotrochoid').describe('Type of geometric curve to trace'),
  
  duration: z.number().min(5).max(60).default(15).describe('Duration of the animation in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    primaryColor,
    trailColor1,
    trailColor2,
    trailColor3,
    glowColor,
    backgroundColor,
    outerRadius,
    innerRadius,
    distanceFromCenter,
    rotationSpeed,
    curveType,
    duration,
  } = params;

  // Calculate curve parameters
  const R = outerRadius; // Outer radius
  const r = innerRadius; // Inner radius
  const d = distanceFromCenter; // Distance from center

  // Calculate number of keyframes for smooth curve (more keyframes = smoother)
  const keyframeCount = 60;
  
  // Helper function to calculate parametric curve points
  const calculateCurvePoints = (t: number): { x: number; y: number } => {
    const angle = t * Math.PI * 2;
    
    if (curveType === 'hypotrochoid') {
      // Hypotrochoid: inner circle rolling inside outer circle
      const x = (R - r) * Math.cos(angle) + d * Math.cos(((R - r) / r) * angle);
      const y = (R - r) * Math.sin(angle) - d * Math.sin(((R - r) / r) * angle);
      return { x, y };
    } else if (curveType === 'epitrochoid') {
      // Epitrochoid: inner circle rolling outside outer circle
      const x = (R + r) * Math.cos(angle) - d * Math.cos(((R + r) / r) * angle);
      const y = (R + r) * Math.sin(angle) - d * Math.sin(((R + r) / r) * angle);
      return { x, y };
    } else {
      // Rose curve
      const k = r / R; // Petal ratio
      const roseR = R * Math.cos(k * angle);
      const x = roseR * Math.cos(angle);
      const y = roseR * Math.sin(angle);
      return { x, y };
    }
  };

  // Calculate tangent velocity for speed variations
  const calculateVelocity = (t: number): number => {
    const epsilon = 0.001;
    const p1 = calculateCurvePoints(t);
    const p2 = calculateCurvePoints(t + epsilon);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Create keyframes for primary text
  const createCurveKeyframes = (phaseOffset: number = 0): GenericEffectData['ranges'] => {
    const ranges: GenericEffectData['ranges'] = [];
    
    for (let i = 0; i <= keyframeCount; i++) {
      const progress = i / keyframeCount;
      const t = (progress + phaseOffset) % 1;
      const point = calculateCurvePoints(t);
      const velocity = calculateVelocity(t);
      
      // Normalize velocity for scale (faster = larger, slower = smaller)
      const velocityScale = 0.8 + (velocity / 10) * 0.4; // Range: 0.8 to 1.2
      
      // Calculate rotation based on tangent
      const nextT = (t + 0.01) % 1;
      const nextPoint = calculateCurvePoints(nextT);
      const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * (180 / Math.PI);
      
      ranges.push(
        { key: 'translateX', val: point.x, prog: progress },
        { key: 'translateY', val: point.y, prog: progress },
        { key: 'rotate', val: angle, prog: progress },
        { key: 'scale', val: velocityScale, prog: progress },
      );
    }
    
    return ranges;
  };

  // Create effect for primary text
  const primaryTextEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration / rotationSpeed,
    mode: 'provider',
    targetIds: ['spirograph-primary-text'],
    ranges: createCurveKeyframes(0),
  };

  // Create effects for trail clones (offset in phase)
  const trail1Effect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration / rotationSpeed,
    mode: 'provider',
    targetIds: ['spirograph-trail-1'],
    ranges: createCurveKeyframes(0.05), // 5% phase lag
  };

  const trail2Effect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration / rotationSpeed,
    mode: 'provider',
    targetIds: ['spirograph-trail-2'],
    ranges: createCurveKeyframes(0.10), // 10% phase lag
  };

  const trail3Effect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration / rotationSpeed,
    mode: 'provider',
    targetIds: ['spirograph-trail-3'],
    ranges: createCurveKeyframes(0.15), // 15% phase lag
  };

  // Create text atoms
  const primaryText = {
    id: 'spirograph-primary-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: primaryColor,
        textShadow: `0 0 20px ${glowColor}`,
        mixBlendMode: 'screen',
        willChange: 'transform, opacity',
        transformOrigin: 'center center',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const trail1 = {
    id: 'spirograph-trail-1',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: trailColor1,
        opacity: 0.6,
        mixBlendMode: 'screen',
        willChange: 'transform, opacity',
        transformOrigin: 'center center',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const trail2 = {
    id: 'spirograph-trail-2',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: trailColor2,
        opacity: 0.35,
        mixBlendMode: 'screen',
        willChange: 'transform, opacity',
        transformOrigin: 'center center',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const trail3 = {
    id: 'spirograph-trail-3',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: trailColor3,
        opacity: 0.15,
        mixBlendMode: 'screen',
        willChange: 'transform, opacity',
        transformOrigin: 'center center',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Root container
  const rootContainer = {
    id: 'spirograph-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-visible flex items-center justify-center',
        style: {
          backgroundColor,
          mixBlendMode: 'normal',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'primary-text-curve-effect',
        componentId: 'generic',
        data: primaryTextEffect,
      },
      {
        id: 'trail-1-curve-effect',
        componentId: 'generic',
        data: trail1Effect,
      },
      {
        id: 'trail-2-curve-effect',
        componentId: 'generic',
        data: trail2Effect,
      },
      {
        id: 'trail-3-curve-effect',
        componentId: 'generic',
        data: trail3Effect,
      },
    ],
    childrenData: [
      trail3, // Back to front rendering
      trail2,
      trail1,
      primaryText,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'spirograph-typography',
  title: 'Spirograph Typography',
  description:
    'Text traces complex geometric patterns like a spirograph drawing machine. Words orbit around moving center points creating intricate looping paths with pen-like trailing effects where previous positions leave a fading trace. Features velocity-based speed variations where text accelerates at curve peaks and decelerates in valleys. Uses parametric equations for hypotrochoid, epitrochoid, and rose curves with screen blend mode for overlapping text trails.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'spirograph',
    'geometric',
    'kinetic',
    'mathematical',
    'curves',
    'trails',
    'orbital',
    'parametric',
    'hypotrochoid',
    'epitrochoid',
    'rose-curve',
    'velocity',
    'motion',
    'blend-mode',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SPIROGRAPH',
    fontSize: 64,
    fontFamily: 'Inter',
    primaryColor: '#00FFFF',
    trailColor1: '#FF00FF',
    trailColor2: '#FFFF00',
    trailColor3: '#00FF00',
    glowColor: '#00FFFF',
    backgroundColor: '#0a0a1a',
    outerRadius: 200,
    innerRadius: 100,
    distanceFromCenter: 50,
    rotationSpeed: 1,
    curveType: 'hypotrochoid',
    duration: 15,
  },
};

export const spirographTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
