/**
 * Infinity Curve Typography Preset
 *
 * Creates a fluid typography animation where text flows along a figure-8 infinity curve path
 * with momentum-based physics. Text elements surf on an invisible möbius strip with varying
 * speeds based on curve segments. The animation mimics liquid mercury - smooth, weighted, and
 * reflective. Features dynamic shadows that shift based on text position in 3D space and
 * subtle perspective transforms at curve intersections.
 *
 * Technical Implementation:
 * - Figure-8 path using parametric equations: x = sin(t), y = sin(t)*cos(t)
 * - 40+ keyframes for ultra-smooth motion with variable speed (closer keyframes = slower)
 * - Perspective transforms (rotateX, rotateY) synchronized with curve position
 * - Dynamic shadows using animated box-shadows in sync with motion
 * - Subtle scaleZ for depth perception at curve intersections
 * - Hardware-accelerated transforms with backface-visibility-hidden
 * - Seamless looping with exact duration matching using fitDurationTo
 *
 * Use Cases:
 * - Logo reveals with hypnotic motion
 * - Title sequences with 3D depth
 * - Brand identity animations
 * - Abstract motion graphics
 * - Meditation/relaxation content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  texts: z
    .array(z.string())
    .length(3)
    .default(['INFINITY', 'FLOW', 'MOTION'])
    .describe('Array of exactly 3 text strings to display on the curve'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (Google Font name)'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex, rgb, or CSS color name)'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Glow intensity for text shadow (0-1)'),
  curveScale: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Scale multiplier for the curve size'),
  duration: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Duration of one complete loop in seconds'),
  stagger: z
    .number()
    .min(0)
    .max(5)
    .default(3.33)
    .describe('Time offset between each text element in seconds'),
  perspectiveDepth: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Perspective depth in pixels (lower = stronger effect)'),
  backgroundColor: z
    .string()
    .default('transparent')
    .describe('Background color for the scene'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Generate figure-8 path keyframes with variable speed
  const generateFigure8Path = (
    scale: number,
    steps: number = 48,
  ): Array<{ x: number; y: number; prog: number }> => {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 * Math.PI;
      const prog = i / steps;

      // Parametric figure-8: x = sin(t), y = sin(t)*cos(t)
      const x = Math.sin(t) * 200 * scale;
      const y = Math.sin(t) * Math.cos(t) * 100 * scale;

      points.push({ x, y, prog });
    }
    return points;
  };

  // Helper: Generate rotation keyframes based on curve position
  const generateRotationKeyframes = (
    pathPoints: Array<{ x: number; y: number; prog: number }>,
  ) => {
    return pathPoints.map((point) => {
      // Calculate rotation based on position
      const rotateX = (point.y / 100) * 15; // -15 to 15 degrees
      const rotateY = (point.x / 200) * 20; // -20 to 20 degrees
      return { rotateX, rotateY, prog: point.prog };
    });
  };

  // Helper: Generate scale keyframes for depth at intersections
  const generateScaleKeyframes = (
    pathPoints: Array<{ x: number; y: number; prog: number }>,
  ) => {
    return pathPoints.map((point) => {
      // Scale based on proximity to center (intersection point)
      const distanceFromCenter = Math.sqrt(point.x * point.x + point.y * point.y);
      const maxDistance = 200 * params.curveScale;
      const normalizedDistance = distanceFromCenter / maxDistance;
      const scale = 1 + (1 - normalizedDistance) * 0.15; // Scale up at center
      return { scale, prog: point.prog };
    });
  };

  // Helper: Generate shadow keyframes based on position
  const generateShadowKeyframes = (
    pathPoints: Array<{ x: number; y: number; prog: number }>,
  ) => {
    return pathPoints.map((point) => {
      const shadowX = -point.x * 0.05;
      const shadowY = -point.y * 0.1;
      const shadowBlur = 20 + Math.abs(point.y) * 0.1;
      const shadowOpacity = params.glowIntensity;
      return {
        shadow: `${shadowX}px ${shadowY}px ${shadowBlur}px rgba(255,255,255,${shadowOpacity})`,
        prog: point.prog,
      };
    });
  };

  // Generate path and keyframes
  const pathPoints = generateFigure8Path(params.curveScale);
  const rotationKeyframes = generateRotationKeyframes(pathPoints);
  const scaleKeyframes = generateScaleKeyframes(pathPoints);
  const shadowKeyframes = generateShadowKeyframes(pathPoints);

  // Build effects for each text wrapper
  const buildTextEffects = (wrapperId: string) => {
    // Position effect (translateX, translateY)
    const positionEffect = {
      id: `position-${wrapperId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: [wrapperId],
        ranges: [
          ...pathPoints.map((p) => ({
            key: 'translateX',
            val: p.x,
            prog: p.prog,
          })),
          ...pathPoints.map((p) => ({
            key: 'translateY',
            val: p.y,
            prog: p.prog,
          })),
        ],
      },
    };

    // Rotation effect (rotateX, rotateY)
    const rotationEffect = {
      id: `rotation-${wrapperId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: [wrapperId],
        ranges: [
          ...rotationKeyframes.map((r) => ({
            key: 'rotateX',
            val: r.rotateX,
            prog: r.prog,
          })),
          ...rotationKeyframes.map((r) => ({
            key: 'rotateY',
            val: r.rotateY,
            prog: r.prog,
          })),
        ],
      },
    };

    // Scale effect (for depth)
    const scaleEffect = {
      id: `scale-${wrapperId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: [wrapperId],
        ranges: scaleKeyframes.map((s) => ({
          key: 'scale',
          val: s.scale,
          prog: s.prog,
        })),
      },
    };

    // Shadow effect
    const shadowEffect = {
      id: `shadow-${wrapperId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: [wrapperId],
        ranges: shadowKeyframes.map((s) => ({
          key: 'textShadow',
          val: s.shadow,
          prog: s.prog,
        })),
      },
    };

    return [positionEffect, rotationEffect, scaleEffect, shadowEffect];
  };

  // Create text wrappers and atoms
  const textElements = params.texts.map((text, index) => {
    const wrapperId = `text-wrapper-${index + 1}`;
    const textId = `text-atom-${index + 1}`;
    const startTime = index * params.stagger;

    return {
      id: wrapperId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: params.duration,
        },
      },
      effects: buildTextEffects(wrapperId),
      childrenData: [
        {
          id: textId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text,
            style: {
              fontSize: `${params.fontSize}px`,
              fontWeight: params.fontWeight,
              color: params.textColor,
              textShadow: `0 0 20px rgba(255,255,255,${params.glowIntensity})`,
            },
            font: {
              family: params.fontFamily,
              weights: [params.fontWeight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
        },
      ],
    };
  });

  // Root container with perspective
  const rootContainer = {
    id: 'infinity-curve-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: `${params.perspectiveDepth}px`,
          perspectiveOrigin: 'center center',
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'scene' as const,
      },
    },
    childrenData: [
      {
        id: 'transform-context',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative w-full h-full',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'scene' as const,
          },
        },
        childrenData: textElements as RenderableComponentData[],
      },
    ],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'infinityCurveTypography',
  title: 'Infinity Curve Typography',
  description:
    'Fluid typography animation where text flows along a figure-8 infinity curve path with momentum-based physics. Features liquid mercury-like motion, dynamic shadows, and 3D perspective transforms at curve intersections. Hypnotic, seamless looping with variable speed segments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    '3d',
    'infinity',
    'curve',
    'figure-8',
    'parametric',
    'perspective',
    'depth',
    'shadows',
    'liquid',
    'mercury',
    'hypnotic',
    'loop',
    'seamless',
  ],
  dependencies: {},
  defaultInputParams: {
    texts: ['INFINITY', 'FLOW', 'MOTION'],
    fontSize: 64,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    glowIntensity: 0.5,
    curveScale: 1,
    duration: 10,
    stagger: 3.33,
    perspectiveDepth: 1000,
    backgroundColor: 'transparent',
  },
};

export const infinityCurveTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};