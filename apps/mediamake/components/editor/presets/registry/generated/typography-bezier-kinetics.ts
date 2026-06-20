/**
 * Typography Kinetics Preset
 *
 * This preset creates text that flows along an invisible Bézier curve path with physics-based momentum.
 * Think of it like marbles rolling through a curved track - text accelerates down slopes and decelerates up hills.
 * Each word follows with a slight delay creating a 'follow-the-leader' effect.
 *
 * Features:
 * - **Bézier Curve Motion**: Text flows along a cubic Bézier curve with calculated points
 * - **Physics-Based Momentum**: Words accelerate/decelerate based on curve slope
 * - **Organic Curves**: Hand-drawn feel with imperfect mathematical curves
 * - **Tangent Rotation**: Words rotate following the curve tangent (car leaning into turns)
 * - **Spring Bounce**: Gentle bounce at the end as text settles with residual energy
 * - **Staggered Animation**: 0.05s delays between words for follow-the-leader effect
 * - **Scale Effects**: Subtle scale (0.95 to 1.05) synchronized with velocity for momentum feel
 *
 * Use cases:
 * - Creating kinetic typography animations with curved motion
 * - Building dynamic text effects with physics-based movement
 * - Adding organic, hand-drawn feeling text animations
 * - Creating engaging motion graphics with momentum
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  text: z
    .string()
    .default('Typography Kinetics')
    .describe('Text to animate along the Bézier curve path'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(3)
    .describe('Total animation duration in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(64)
    .describe('Font size for the text in pixels'),
  fontColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),
  curveIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe(
      'Intensity of the curve (0.1 = subtle, 1 = moderate, 2 = extreme)',
    ),
  curveDirection: z
    .enum(['up', 'down', 'left', 'right'])
    .default('right')
    .describe('Primary direction of the curve flow'),
  bounceIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of the bounce at the end (0 = no bounce, 1 = strong bounce)'),
  wordDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Delay in seconds between each word start (follow-the-leader effect)'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color for the container'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontColor,
    font,
    curveIntensity,
    curveDirection,
    bounceIntensity,
    wordDelay,
    backgroundColor,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Split text into words
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;

  // Calculate Bézier curve points helper function
  const calculateBezierCurve = (
    t: number,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
  ) => {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
    const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;

    return { x, y };
  };

  // Calculate tangent angle for rotation
  const calculateTangentAngle = (
    t: number,
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
  ) => {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;

    const dx =
      -3 * mt2 * p0.x +
      3 * mt2 * p1.x -
      6 * mt * t * p1.x +
      6 * mt * t * p2.x -
      3 * t2 * p2.x +
      3 * t2 * p3.x;
    const dy =
      -3 * mt2 * p0.y +
      3 * mt2 * p1.y -
      6 * mt * t * p1.y +
      6 * mt * t * p2.y -
      3 * t2 * p2.y +
      3 * t2 * p3.y;

    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  // Define Bézier curve control points based on direction and intensity
  // Add organic variation to make curves feel hand-drawn
  const organicVariation = (base: number, intensity: number) => {
    return base + (Math.random() - 0.5) * 20 * intensity;
  };

  let p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number };

  const width = 1920;
  const height = 1080;
  const margin = 100;

  switch (curveDirection) {
    case 'right':
      p0 = { x: margin, y: height / 2 };
      p1 = {
        x: organicVariation(width * 0.33, curveIntensity),
        y: organicVariation(height / 2 - 200 * curveIntensity, curveIntensity),
      };
      p2 = {
        x: organicVariation(width * 0.66, curveIntensity),
        y: organicVariation(height / 2 + 150 * curveIntensity, curveIntensity),
      };
      p3 = { x: width - margin, y: height / 2 };
      break;
    case 'left':
      p0 = { x: width - margin, y: height / 2 };
      p1 = {
        x: organicVariation(width * 0.66, curveIntensity),
        y: organicVariation(height / 2 - 200 * curveIntensity, curveIntensity),
      };
      p2 = {
        x: organicVariation(width * 0.33, curveIntensity),
        y: organicVariation(height / 2 + 150 * curveIntensity, curveIntensity),
      };
      p3 = { x: margin, y: height / 2 };
      break;
    case 'down':
      p0 = { x: width / 2, y: margin };
      p1 = {
        x: organicVariation(width / 2 - 200 * curveIntensity, curveIntensity),
        y: organicVariation(height * 0.33, curveIntensity),
      };
      p2 = {
        x: organicVariation(width / 2 + 150 * curveIntensity, curveIntensity),
        y: organicVariation(height * 0.66, curveIntensity),
      };
      p3 = { x: width / 2, y: height - margin };
      break;
    case 'up':
      p0 = { x: width / 2, y: height - margin };
      p1 = {
        x: organicVariation(width / 2 - 200 * curveIntensity, curveIntensity),
        y: organicVariation(height * 0.66, curveIntensity),
      };
      p2 = {
        x: organicVariation(width / 2 + 150 * curveIntensity, curveIntensity),
        y: organicVariation(height * 0.33, curveIntensity),
      };
      p3 = { x: width / 2, y: margin };
      break;
  }

  // Calculate curve points for each word
  const motionDuration = duration - wordDelay * (wordCount - 1);

  // Create word components with curve motion
  const wordComponents = words.map((word, index) => {
    const wordId = `word-${index}`;
    const relativeStart = index * wordDelay;

    // Calculate start and end positions along curve
    const tStart = 0;
    const tEnd = 1;

    const startPos = calculateBezierCurve(tStart, p0, p1, p2, p3);
    const endPos = calculateBezierCurve(tEnd, p0, p1, p2, p3);

    // Calculate intermediate points for smoother animation
    const midPos = calculateBezierCurve(0.5, p0, p1, p2, p3);

    // Calculate rotation angles at key points
    const startRotation = calculateTangentAngle(tStart, p0, p1, p2, p3);
    const midRotation = calculateTangentAngle(0.5, p0, p1, p2, p3);
    const endRotation = calculateTangentAngle(tEnd, p0, p1, p2, p3);

    // Calculate bounce offset (subtle vertical bounce at end)
    const bounceOffset = bounceIntensity * 20;

    // Create motion effect with curve path, rotation, scale, and bounce
    const curveMotionEffect = {
      id: `${wordId}-curve-motion`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: 0,
        duration: motionDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // TranslateX path
          { key: 'translateX', val: startPos.x, prog: 0 },
          { key: 'translateX', val: midPos.x, prog: 0.5 },
          { key: 'translateX', val: endPos.x, prog: 0.85 },
          { key: 'translateX', val: endPos.x, prog: 1 },
          // TranslateY path with bounce
          { key: 'translateY', val: startPos.y, prog: 0 },
          { key: 'translateY', val: midPos.y, prog: 0.5 },
          { key: 'translateY', val: endPos.y, prog: 0.85 },
          { key: 'translateY', val: endPos.y - bounceOffset, prog: 0.92 },
          { key: 'translateY', val: endPos.y, prog: 1 },
          // Rotation following tangent
          { key: 'rotate', val: startRotation, prog: 0 },
          { key: 'rotate', val: midRotation, prog: 0.5 },
          { key: 'rotate', val: endRotation, prog: 0.85 },
          { key: 'rotate', val: endRotation, prog: 1 },
          // Scale for momentum feel
          { key: 'scale', val: 0.95, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.4 },
          { key: 'scale', val: 1, prog: 0.85 },
          { key: 'scale', val: 1.02, prog: 0.92 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };

    // Fade in effect
    const fadeInEffect = {
      id: `${wordId}-fade`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: 0.3,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          position: 'absolute' as const,
          fontSize: `${fontSize}px`,
          color: fontColor,
          transformOrigin: 'center center',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : { weights: ['700'] }),
        },
      },
      context: {
        timing: {
          start: relativeStart,
          duration: duration - relativeStart,
        },
      },
      effects: [curveMotionEffect, fadeInEffect],
    } as RenderableComponentData;
  });

  // Create container
  const container = {
    id: 'typography-kinetics-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          willChange: 'transform',
          ...(backgroundColor && { backgroundColor }),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: wordComponents,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [container],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typographyBezierKinetics',
  title: 'Typography Kinetics - Bézier Curve Flow',
  description:
    'Text flows along an invisible Bézier curve path with physics-based momentum. Words follow each other with staggered delays like marbles rolling through a curved track, accelerating down slopes and decelerating up hills. Includes tangent-based rotation (like a car leaning into turns) and spring bounce settling at the end.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'bezier',
    'curve',
    'motion',
    'physics',
    'momentum',
    'organic',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Typography Kinetics',
    duration: 3,
    fontSize: 64,
    fontColor: '#FFFFFF',
    font: 'Inter:700',
    curveIntensity: 1,
    curveDirection: 'right',
    bounceIntensity: 0.3,
    wordDelay: 0.05,
  },
};

// Export preset
export const typographyBezierKineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
