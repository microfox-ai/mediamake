/**
 * Vortex Dispersion Text Effect Preset
 *
 * This preset creates a stunning vortex transition effect where text elements:
 * 1. Spiral inward following logarithmic spiral paths
 * 2. Decrease in size and increase rotation speed as they approach center
 * 3. Compress heavily at center point (scaleX: 0.1)
 * 4. Explode outward in reversed spiral pattern with opacity fade
 * 5. Feature motion streaks using multiple text-shadow layers for speed illusion
 *
 * The effect simulates a black hole / vortex transition commonly seen in video editing,
 * with GPU-optimized transforms and pre-calculated spiral positions using parametric
 * equations: x = r * cos(θ) * e^(-θ/π), y = r * sin(θ) * e^(-θ/π)
 *
 * Features:
 * - Three-phase animation (inward spiral → compression → outward explosion)
 * - Logarithmic spiral paths with dynamic rotation
 * - Motion blur trails using animated text-shadow
 * - GPU-accelerated transforms with preserve-3d
 * - Configurable timing and intensity parameters
 *
 * Use cases:
 * - Dramatic text transitions
 * - Video intro/outro effects
 * - Scene transitions with text elements
 * - High-impact motion graphics
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  textElements: z
    .array(z.string())
    .min(1)
    .default(['VORTEX', 'EFFECT', 'DISPERSION'])
    .describe('Array of text strings to animate'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Total animation duration in seconds'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex, rgb, or CSS color name)'),
  spiralRadius: z
    .number()
    .min(100)
    .max(1000)
    .default(400)
    .describe('Initial radius for spiral paths in pixels'),
  rotationSpeed: z
    .number()
    .min(360)
    .max(1440)
    .default(720)
    .describe('Maximum rotation in degrees during inward spiral'),
  compressionIntensity: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Horizontal compression factor at center (lower = more compressed)'),
  explosionScale: z
    .number()
    .min(1)
    .max(3)
    .default(1.5)
    .describe('Scale factor for outward explosion'),
  motionBlurIntensity: z
    .number()
    .min(0)
    .max(30)
    .default(20)
    .describe('Motion blur trail intensity in pixels'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color for the container'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Calculate logarithmic spiral position
  const calculateSpiralPosition = (
    radius: number,
    angle: number,
    progress: number,
  ): { x: number; y: number } => {
    const theta = angle * (Math.PI / 180); // Convert to radians
    const decayFactor = Math.exp((-theta / Math.PI) * progress);
    const x = radius * Math.cos(theta) * decayFactor;
    const y = radius * Math.sin(theta) * decayFactor;
    return { x, y };
  };

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
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
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter:700');

  // Calculate timing phases (in seconds)
  const inwardDuration = params.duration * 0.45; // 0-45%
  const compressionDuration = params.duration * 0.05; // 45-50%
  const outwardDuration = params.duration * 0.5; // 50-100%

  const inwardStart = 0;
  const compressionStart = inwardDuration;
  const outwardStart = inwardDuration + compressionDuration;

  // Create text elements with staggered spiral animations
  const textElements = params.textElements.map((text, index) => {
    const elementId = `vortex-text-${index}`;
    const totalElements = params.textElements.length;
    
    // Stagger angle for each element
    const baseAngle = (360 / totalElements) * index;
    
    // Calculate spiral keyframe positions for inward phase
    const inwardKeyframes = [];
    for (let prog = 0; prog <= 1; prog += 0.2) {
      const angle = baseAngle + params.rotationSpeed * prog;
      const pos = calculateSpiralPosition(params.spiralRadius, angle, prog);
      inwardKeyframes.push({
        progress: prog,
        x: pos.x,
        y: pos.y,
        rotation: angle,
        scale: 1 - prog * 0.8, // 1 → 0.2
      });
    }

    // Calculate spiral keyframe positions for outward phase (reversed)
    const outwardKeyframes = [];
    for (let prog = 0; prog <= 1; prog += 0.2) {
      const angle = baseAngle + params.rotationSpeed + (params.rotationSpeed * prog);
      const reverseProg = 1 - prog;
      const pos = calculateSpiralPosition(params.spiralRadius, angle, reverseProg);
      outwardKeyframes.push({
        progress: prog,
        x: pos.x,
        y: pos.y,
        rotation: angle,
        scale: 0.2 + prog * (params.explosionScale - 0.2),
        opacity: 1 - prog,
      });
    }

    // Build inward spiral effect ranges
    const inwardRanges = [];
    for (let i = 0; i < inwardKeyframes.length; i++) {
      const kf = inwardKeyframes[i];
      inwardRanges.push(
        { key: 'translateX', val: kf.x, prog: kf.progress },
        { key: 'translateY', val: kf.y, prog: kf.progress },
        { key: 'rotate', val: kf.rotation, prog: kf.progress },
        { key: 'scale', val: kf.scale, prog: kf.progress },
      );
    }

    // Build compression effect ranges
    const compressionRanges = [
      { key: 'scaleX', val: 0.2, prog: 0 },
      { key: 'scaleY', val: 0.2, prog: 0 },
      { key: 'scaleX', val: params.compressionIntensity, prog: 1 },
      { key: 'scaleY', val: 1, prog: 1 },
    ];

    // Build outward spiral effect ranges
    const outwardRanges = [];
    for (let i = 0; i < outwardKeyframes.length; i++) {
      const kf = outwardKeyframes[i];
      outwardRanges.push(
        { key: 'translateX', val: kf.x, prog: kf.progress },
        { key: 'translateY', val: kf.y, prog: kf.progress },
        { key: 'rotate', val: kf.rotation, prog: kf.progress },
        { key: 'scaleX', val: kf.scale, prog: kf.progress },
        { key: 'scaleY', val: kf.scale, prog: kf.progress },
        { key: 'opacity', val: kf.opacity, prog: kf.progress },
      );
    }

    // Create motion blur text-shadow animation
    const createMotionBlur = (intensity: number) => {
      return `0 0 ${intensity * 0.5}px rgba(255,255,255,0.8), 0 0 ${intensity}px rgba(255,255,255,0.4), 0 0 ${intensity * 1.5}px rgba(255,255,255,0.2)`;
    };

    return {
      id: elementId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontStyle.fontWeight || 'bold',
          fontStyle: fontStyle.fontStyle,
          color: params.textColor,
          textShadow: createMotionBlur(params.motionBlurIntensity),
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        // Phase 1: Inward spiral
        {
          id: `${elementId}-inward`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: inwardStart,
            duration: inwardDuration,
            mode: 'provider',
            targetIds: [elementId],
            ranges: inwardRanges,
          },
        },
        // Phase 2: Compression at center
        {
          id: `${elementId}-compression`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: compressionStart,
            duration: compressionDuration,
            mode: 'provider',
            targetIds: [elementId],
            ranges: compressionRanges,
          },
        },
        // Phase 3: Outward spiral explosion
        {
          id: `${elementId}-outward`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outwardStart,
            duration: outwardDuration,
            mode: 'provider',
            targetIds: [elementId],
            ranges: outwardRanges,
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Root container with GPU optimization
  const rootContainer: RenderableComponentData = {
    id: 'vortex-dispersion-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
          perspective: '1000px',
          ...(params.backgroundColor && { backgroundColor: params.backgroundColor }),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: textElements,
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
  id: 'vortex-dispersion-text',
  title: 'Vortex Dispersion Text Effect',
  description:
    'Advanced text animation preset where text elements spiral into a central whirlpool following logarithmic spiral paths, compress at the center, then explode outward. Features three-phase animation with inward spiral (decreasing size, increasing rotation), center compression (scaleX: 0.1), and outward spiral explosion (reversed path with opacity fade). Includes motion streak effects using multiple text-shadow layers for speed illusion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'vortex',
    'spiral',
    'transition',
    'kinetic',
    'motion',
    'explosion',
    'compression',
    'advanced',
    'dramatic',
  ],
  defaultInputParams: {
    textElements: ['VORTEX', 'EFFECT', 'DISPERSION'],
    duration: 4,
    font: 'Inter:700',
    fontSize: 64,
    textColor: '#ffffff',
    spiralRadius: 400,
    rotationSpeed: 720,
    compressionIntensity: 0.1,
    explosionScale: 1.5,
    motionBlurIntensity: 20,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vortexDispersionTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
