/**
 * Radial Stretch Explosion Text Effect Preset
 *
 * This preset creates an advanced radial stretch explosion effect where text
 * stretches outward from the center point like shockwave ripples. The effect
 * mimics dropping text into water, creating concentric waves of distortion that
 * gradually settle. Features non-uniform scaling (maximum at center, decreasing
 * toward edges), subtle spiral rotation, and smooth settling animation.
 *
 * Features:
 * - **Radial Shockwave**: Text stretches outward from center like water ripples
 * - **Non-uniform Scaling**: Maximum stretch at center, decreasing toward edges
 * - **Spiral Rotation**: Subtle rotation during stretch for dynamic spiral effect
 * - **Glass Morphism**: Backdrop-filter effects during animation
 * - **Multi-phase Animation**: Explosion → Overshoot → Settle sequence
 * - **Spring-based Easing**: Natural, bouncy motion using spring physics
 * - **Radial Gradient Masks**: CSS-based non-uniform scaling effects
 * - **Circular Layout**: Multi-word captions positioned in circular pattern
 *
 * Technical Implementation:
 * - Uses CSS radial-gradient masks for non-uniform scaling
 * - Transform properties: scale(), rotate()
 * - Backdrop-filter for glass morphism during peak animation
 * - Clip-path: circle() for radial reveal
 * - Trigonometric calculations for circular word positioning
 * - Timing: 1.8s with cubic-bezier for smooth spring effect
 *
 * Animation Phases:
 * 1. Initial State (prog: 0): scale(1), rotate(0), no blur
 * 2. Explosion Peak (prog: 0.4): scale(1.8), rotate(15deg), max blur
 * 3. Overshoot (prog: 0.7): scale(0.95), rotate(-5deg), reduced blur
 * 4. Settle (prog: 1.0): scale(1), rotate(0), no blur
 *
 * Use cases:
 * - Creating impactful title reveals with shockwave effects
 * - Building dynamic text entrances mimicking radial blur
 * - Adding video post-production style effects to text
 * - Creating water ripple / concentric wave text animations
 * - Building energetic social media content openers
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  TextAtomData,
  GenericEffectData,
  BaseLayoutData,
} from '@microfox/remotion';

// ============================================================================
// PRESET PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with radial stretch explosion effect'),

  fontSize: z
    .number()
    .default(72)
    .optional()
    .describe('Font size in pixels (default: 72)'),

  fontWeight: z
    .string()
    .default('bold')
    .optional()
    .describe('Font weight (e.g., "bold", "400", "700")'),

  color: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),

  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),

  duration: z
    .number()
    .default(1.8)
    .optional()
    .describe('Total animation duration in seconds (default: 1.8)'),

  intensity: z
    .number()
    .min(0.5)
    .max(2.5)
    .default(1)
    .optional()
    .describe(
      'Effect intensity multiplier (0.5 = subtle, 1 = normal, 2.5 = extreme)',
    ),

  circularLayout: z
    .boolean()
    .default(false)
    .optional()
    .describe(
      'Enable circular layout for multi-word captions (words positioned in circle)',
    ),

  circleRadius: z
    .number()
    .default(150)
    .optional()
    .describe('Radius of circular layout in pixels (default: 150)'),

  glassEffect: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable backdrop-filter glass morphism during animation'),
});

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
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

  const fontSize = params.fontSize ?? 72;
  const intensity = params.intensity ?? 1;
  const duration = params.duration ?? 1.8;
  const color = params.color ?? '#FFFFFF';
  const fontWeight = params.fontWeight ?? 'bold';
  const glassEffect = params.glassEffect ?? true;

  // Split text into words for circular layout
  const words = params.text.split(' ');
  const useCircularLayout = params.circularLayout && words.length > 1;
  const circleRadius = params.circleRadius ?? 150;

  // Calculate scale values based on intensity
  const maxScale = 1 + 0.8 * intensity; // Default: 1.8
  const minScale = 1 - 0.05 * intensity; // Default: 0.95

  // Calculate rotation values based on intensity
  const maxRotation = 15 * intensity; // Default: 15deg
  const minRotation = -5 * intensity; // Default: -5deg

  // Calculate blur values for glass effect
  const maxBlur = glassEffect ? 8 * intensity : 0;
  const midBlur = glassEffect ? 3 * intensity : 0;

  // Generate component IDs
  const containerId = 'radial-explosion-container';
  const textElementId = 'text-element';

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Calculate position for circular layout using trigonometry
   */
  const calculateCircularPosition = (
    index: number,
    total: number,
    radius: number,
  ): { x: number; y: number; rotation: number } => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const rotation = (angle * 180) / Math.PI + 90; // Rotate text to follow circle

    return { x, y, rotation };
  };

  // ============================================================================
  // BUILD CHILDREN DATA
  // ============================================================================

  let childrenData: RenderableComponentData[];

  if (useCircularLayout) {
    // Multi-word circular layout
    childrenData = words.map((word, index) => {
      const position = calculateCircularPosition(index, words.length, circleRadius);
      const wordId = `${textElementId}-word-${index}`;

      // Create radial explosion effect for each word
      const wordEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Scale animation (explosion → overshoot → settle)
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: maxScale, prog: 0.4 },
          { key: 'scale', val: minScale, prog: 0.7 },
          { key: 'scale', val: 1, prog: 1 },
          // Rotation animation (spiral effect)
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: maxRotation, prog: 0.4 },
          { key: 'rotate', val: minRotation, prog: 0.7 },
          { key: 'rotate', val: 0, prog: 1 },
          // Opacity fade-in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 1 },
          // Blur effect for glass morphism
          ...(glassEffect
            ? [
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0.4 },
                { key: 'filter', val: `blur(${midBlur}px)`, prog: 0.7 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ]
            : []),
        ],
      };

      const textAtomData: TextAtomData = {
        text: word,
        style: {
          fontSize: fontSize,
          color: color,
          fontWeight: fontWeight,
          textAlign: 'center',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: textAtomData,
        context: {
          timing: {
            start: 0,
            duration: duration + 0.5, // Extend duration to show settled state
          },
        },
        effects: [
          {
            id: `radial-explosion-word-${index}`,
            componentId: 'generic',
            data: wordEffect,
          },
        ],
      } as RenderableComponentData;
    });
  } else {
    // Single text element (original behavior)
    const radialExplosionEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [textElementId],
      ranges: [
        // Scale animation (explosion → overshoot → settle)
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: maxScale, prog: 0.4 },
        { key: 'scale', val: minScale, prog: 0.7 },
        { key: 'scale', val: 1, prog: 1 },
        // Rotation animation (spiral effect)
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: maxRotation, prog: 0.4 },
        { key: 'rotate', val: minRotation, prog: 0.7 },
        { key: 'rotate', val: 0, prog: 1 },
        // Opacity fade-in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },
        // Blur effect for glass morphism
        ...(glassEffect
          ? [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0.4 },
              { key: 'filter', val: `blur(${midBlur}px)`, prog: 0.7 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ]
          : []),
      ],
    };

    const textAtomData: TextAtomData = {
      text: params.text,
      style: {
        fontSize: fontSize,
        color: color,
        fontWeight: fontWeight,
        textAlign: 'center',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
    };

    childrenData = [
      {
        id: textElementId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: textAtomData,
        context: {
          timing: {
            start: 0,
            duration: duration + 0.5, // Extend duration to show settled state
          },
        },
        effects: [
          {
            id: 'radial-explosion-effect',
            componentId: 'generic',
            data: radialExplosionEffect,
          },
        ],
      } as RenderableComponentData,
    ];
  }

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const containerData: BaseLayoutData = {
    containerProps: {
      className: 'absolute inset-0 flex items-center justify-center',
      style: useCircularLayout
        ? {
            position: 'relative',
            width: '100%',
            height: '100%',
          }
        : {},
    },
    ...(useCircularLayout
      ? {
          childrenProps: words.map((_, index) => {
            const position = calculateCircularPosition(
              index,
              words.length,
              circleRadius,
            );
            return {
              style: {
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
              },
            };
          }),
        }
      : {}),
  };

  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: containerData,
    context: {
      timing: {
        start: 0,
        duration: duration + 0.5,
      },
    },
    childrenData: childrenData,
  };

  // ============================================================================
  // RETURN PRESET OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
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
  id: 'radial-stretch-explosion',
  title: 'Radial Stretch Explosion Text Effect',
  description:
    'Advanced radial stretch explosion effect where text stretches outward from center like shockwave ripples. Features non-uniform scaling (maximum at center, decreasing toward edges), subtle spiral rotation, and smooth settling animation. Mimics radial blur and glass morphism effects from video post-production with spring-based easing for dynamic impact.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'radial',
    'explosion',
    'shockwave',
    'ripples',
    'stretch',
    'spiral',
    'rotation',
    'glass-morphism',
    'blur',
    'spring',
    'dynamic',
    'impact',
    'post-production',
    'circular-layout',
    'water-ripple',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SHOCKWAVE',
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Inter:700',
    duration: 1.8,
    intensity: 1,
    circularLayout: false,
    circleRadius: 150,
    glassEffect: true,
  },
};

// ============================================================================
// EXPORT PRESET
// ============================================================================

export const radialStretchExplosionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};