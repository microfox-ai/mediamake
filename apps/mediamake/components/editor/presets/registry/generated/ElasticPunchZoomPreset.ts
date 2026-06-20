/**
 * Elastic Punch Zoom Preset
 *
 * Creates a playful, cartoon-inspired punch zoom effect where the camera overshoots its target
 * then bounces back like a rubber band. The zoom starts slow (building tension), rapidly
 * accelerates past the intended focal point (overshoot by 20-30%), then bounces back and forth
 * with decreasing amplitude until settling.
 *
 * Features:
 * - **Elastic Spring Physics**: Custom spring-like animation with overshoot and bounce-back
 * - **Squash & Stretch Deformation**: ScaleX/ScaleY distortion during bounce phases for enhanced elasticity
 * - **Motion Lines**: Optional manga/comic-style speed lines during fast movement phase
 * - **Focal Point Targeting**: Calculate translate values to zoom into specific image regions
 * - **Hardware Accelerated**: Uses transform3d() and will-change for smooth performance
 * - **Customizable Parameters**: Control elasticity, overshoot amount, bounce count, and more
 *
 * Use cases:
 * - Energetic, fun intro animations
 * - Attention-grabbing product reveals
 * - Comic/cartoon-style video effects
 * - Social media content with playful energy
 * - Gaming and entertainment videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  image: z.object({
    src: z.string().describe('Image source URL'),
  }).describe('Image to apply elastic punch zoom effect'),
  
  duration: z.number()
    .default(3)
    .describe('Total duration of the effect in seconds'),
  
  focalPoint: z.object({
    x: z.number().min(0).max(1).default(0.5)
      .describe('Horizontal focal point (0 = left, 0.5 = center, 1 = right)'),
    y: z.number().min(0).max(1).default(0.5)
      .describe('Vertical focal point (0 = top, 0.5 = center, 1 = bottom)'),
  }).default({ x: 0.5, y: 0.5 })
    .describe('Target focal point for zoom (normalized 0-1 coordinates)'),
  
  elasticity: z.number()
    .min(0.3)
    .max(0.8)
    .default(0.55)
    .describe('Elasticity factor controlling bounce intensity (0.3 = subtle, 0.8 = extreme)'),
  
  overshootAmount: z.number()
    .min(1.2)
    .max(1.4)
    .default(1.25)
    .describe('Overshoot multiplier (1.2 = 20% overshoot, 1.4 = 40% overshoot)'),
  
  bounces: z.number()
    .int()
    .min(2)
    .max(5)
    .default(3)
    .describe('Number of bounce oscillations before settling'),
  
  motionLines: z.boolean()
    .default(true)
    .describe('Enable motion lines during fast movement phase'),
  
  targetScale: z.number()
    .min(1.5)
    .max(4)
    .default(2.8)
    .describe('Final settled zoom scale (1.5 = 150%, 4 = 400%)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    image,
    duration,
    focalPoint,
    elasticity,
    overshootAmount,
    bounces,
    motionLines,
    targetScale,
  } = params;

  const config = props.config || { width: 1920, height: 1080 };
  const width = config.width || 1920;
  const height = config.height || 1080;

  // Calculate focal point translation (move opposite direction to center focal point)
  // Focal point at (0.5, 0.5) = no translation
  // Focal point at (0, 0) = translate right and down to bring top-left corner to center
  // Focal point at (1, 1) = translate left and up to bring bottom-right corner to center
  const calculateTranslate = (focal: number, dimension: number, scale: number) => {
    const offset = (focal - 0.5) * dimension * (scale - 1);
    return -offset;
  };

  // Generate elastic zoom keyframes with squash/stretch
  const generateElasticKeyframes = () => {
    const ranges: Array<{ key: string; val: any; prog: number }> = [];
    
    // Initial state (0%)
    ranges.push(
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateY', val: 0, prog: 0 },
    );

    // Tension build (0-20%)
    ranges.push(
      { key: 'scale', val: 1.05, prog: 0.2 },
      { key: 'scaleX', val: 1.02, prog: 0.2 },
      { key: 'scaleY', val: 0.98, prog: 0.2 },
    );

    // Peak overshoot (50%)
    const peakScale = targetScale * overshootAmount;
    const translateXPeak = calculateTranslate(focalPoint.x, width, peakScale);
    const translateYPeak = calculateTranslate(focalPoint.y, height, peakScale);
    
    ranges.push(
      { key: 'scale', val: peakScale, prog: 0.5 },
      { key: 'scaleX', val: 1.15, prog: 0.5 },
      { key: 'scaleY', val: 0.85, prog: 0.5 },
      { key: 'translateX', val: translateXPeak, prog: 0.5 },
      { key: 'translateY', val: translateYPeak, prog: 0.5 },
    );

    // Calculate bounce keyframes
    const bounceStart = 0.5;
    const bounceEnd = 1.0;
    const bounceRange = bounceEnd - bounceStart;
    const bounceStep = bounceRange / bounces;

    for (let i = 0; i < bounces; i++) {
      const prog = bounceStart + bounceStep * (i + 1);
      const decay = Math.pow(elasticity, i + 1);
      
      // Alternate between under and over target scale
      const isUnder = i % 2 === 0;
      const scaleOffset = (peakScale - targetScale) * decay;
      const bounceScale = isUnder 
        ? targetScale - scaleOffset 
        : targetScale + scaleOffset * 0.5;

      // Squash/stretch alternates
      const squashStretch = 0.08 * decay;
      const scaleXVal = isUnder ? 0.92 + squashStretch : 1.05 + squashStretch;
      const scaleYVal = isUnder ? 1.08 - squashStretch : 0.95 - squashStretch;

      const translateX = calculateTranslate(focalPoint.x, width, bounceScale);
      const translateY = calculateTranslate(focalPoint.y, height, bounceScale);

      ranges.push(
        { key: 'scale', val: bounceScale, prog },
        { key: 'scaleX', val: scaleXVal, prog },
        { key: 'scaleY', val: scaleYVal, prog },
        { key: 'translateX', val: translateX, prog },
        { key: 'translateY', val: translateY, prog },
      );
    }

    // Final settled state (100%)
    const translateXFinal = calculateTranslate(focalPoint.x, width, targetScale);
    const translateYFinal = calculateTranslate(focalPoint.y, height, targetScale);
    
    ranges.push(
      { key: 'scale', val: targetScale, prog: 1 },
      { key: 'scaleX', val: 1, prog: 1 },
      { key: 'scaleY', val: 1, prog: 1 },
      { key: 'translateX', val: translateXFinal, prog: 1 },
      { key: 'translateY', val: translateYFinal, prog: 1 },
    );

    return ranges;
  };

  // Create motion line components
  const createMotionLines = () => {
    if (!motionLines) return [];

    const motionLinePositions = [
      { top: '30%', left: '10%', width: '200px' },
      { top: '50%', left: '5%', width: '250px' },
      { top: '70%', left: '8%', width: '180px' },
      { top: '40%', right: '10%', width: '220px' },
      { top: '60%', right: '12%', width: '190px' },
    ];

    return motionLinePositions.map((pos, index) => ({
      id: `motion-line-${index + 1}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="absolute h-0.5 bg-gradient-to-r from-transparent via-white to-transparent" style="width: ${pos.width}; ${pos.top ? `top: ${pos.top};` : ''}${pos.left ? `left: ${pos.left};` : ''}${pos.right ? `right: ${pos.right};` : ''}"></div>`,
        className: 'pointer-events-none',
        style: {
          transformOrigin: 'center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
    }));
  };

  // Elastic zoom effect data
  const elasticZoomEffect: GenericEffectData = {
    type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: ['elastic-image-container'],
    ranges: generateElasticKeyframes(),
  };

  // Motion lines fade effect
  const motionLinesFadeEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: createMotionLines().map(line => line.id),
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0, prog: 0.2 },
      { key: 'opacity', val: 0.7, prog: 0.35 },
      { key: 'opacity', val: 0.7, prog: 0.5 },
      { key: 'opacity', val: 0, prog: 0.6 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // Build component tree
  const rootContainer = {
    id: 'elastic-punch-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
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
        id: 'elastic-zoom-effect',
        componentId: 'generic',
        data: elasticZoomEffect,
      },
      ...(motionLines ? [{
        id: 'motion-lines-fade-effect',
        componentId: 'generic',
        data: motionLinesFadeEffect,
      }] : []),
    ],
    childrenData: [
      {
        id: 'elastic-image-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-full h-full absolute inset-0',
            style: {
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: [
          {
            id: 'elastic-image',
            type: 'atom' as const,
            componentId: 'ImageAtom',
            data: {
              src: image.src,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
          },
        ],
      },
      ...(motionLines ? [{
        id: 'motion-lines-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: createMotionLines(),
      }] : []),
    ],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'ElasticPunchZoomPreset',
  title: 'Elastic Punch Zoom',
  description: 'Creates a playful, cartoon-inspired punch zoom effect with elastic overshoot, bounce-back physics, squash-and-stretch deformation, and optional motion lines for manga/comic-style velocity emphasis. Perfect for energetic, fun visual moments.',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'zoom', 'elastic', 'bounce', 'cartoon', 'comic', 'motion-lines', 'squash-stretch', 'spring-physics', 'energetic'],
  dependencies: {},
  defaultInputParams: {
    image: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    duration: 3,
    focalPoint: {
      x: 0.5,
      y: 0.5,
    },
    elasticity: 0.55,
    overshootAmount: 1.25,
    bounces: 3,
    motionLines: true,
    targetScale: 2.8,
  },
};

// Export preset
export const ElasticPunchZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};