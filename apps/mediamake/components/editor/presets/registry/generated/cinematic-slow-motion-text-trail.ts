/**
 * Cinematic Slow-Motion Text Trail Effect Preset
 *
 * Creates a cinematic slow-motion text trail effect mimicking high-speed camera footage.
 * The main text appears crisp and clear, while multiple ghost copies create a directional
 * motion blur trail. Each ghost is offset along the motion vector with decreasing opacity
 * and increasing blur filters to simulate depth of field.
 *
 * Features:
 * - **Motion Blur Trail**: 8-10 ghost copies with directional blur effect
 * - **Shutter Drag**: Ghosts stretch slightly in the direction of motion (scaleX transform)
 * - **Depth of Field**: Increasing blur filters (0px to 8px) and decreasing opacity (1 to 0.1)
 * - **Smooth Timing**: Cubic-bezier(0.23, 1, 0.32, 1) easing for fluid 120fps feel
 * - **3D Preservation**: Uses transform-style: preserve-3d for depth rendering
 * - **Audio-Reactive**: Optional waveform modulation of blur intensity
 *
 * Use cases:
 * - High-impact title sequences with cinematic motion blur
 * - Action-packed sports or gaming content
 * - Dramatic reveal effects with slow-motion aesthetics
 * - Music video text effects with beat-reactive blur
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with motion trail'),
  fontSize: z
    .string()
    .optional()
    .default('72px')
    .describe('Font size for the text (e.g., "72px", "96px")'),
  fontWeight: z
    .string()
    .optional()
    .default('bold')
    .describe('Font weight (e.g., "bold", "700", "900")'),
  color: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (hex, rgb, or CSS color name)'),
  fontFamily: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  duration: z
    .number()
    .optional()
    .default(5)
    .describe('Duration of the effect in seconds'),
  absoluteStart: z
    .number()
    .optional()
    .default(0)
    .describe('Start time in the video timeline (seconds)'),
  ghostCount: z
    .number()
    .int()
    .min(5)
    .max(15)
    .optional()
    .default(10)
    .describe('Number of ghost copies (5-15, default: 10)'),
  motionDirection: z
    .enum(['left', 'right', 'up', 'down', 'diagonal-left', 'diagonal-right'])
    .optional()
    .default('right')
    .describe('Direction of motion trail'),
  intensity: z
    .number()
    .min(0.1)
    .max(3)
    .optional()
    .default(1)
    .describe('Motion trail intensity multiplier (0.1-3)'),
  audioReactive: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable audio-reactive blur modulation'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for audio-reactive effects (required if audioReactive is true)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize = '72px',
    fontWeight = 'bold',
    color = '#ffffff',
    fontFamily = 'Inter',
    duration = 5,
    absoluteStart = 0,
    ghostCount = 10,
    motionDirection = 'right',
    intensity = 1,
    audioReactive = false,
    audioSrc,
  } = params;

  // Calculate motion vector based on direction
  const calculateMotionVector = (direction: string) => {
    const vectors: Record<string, { x: number; y: number; rotate: number }> = {
      left: { x: -1, y: 0, rotate: 0 },
      right: { x: 1, y: 0, rotate: 0 },
      up: { x: 0, y: -1, rotate: 0 },
      down: { x: 0, y: 1, rotate: 0 },
      'diagonal-left': { x: -0.7, y: -0.7, rotate: -2 },
      'diagonal-right': { x: 0.7, y: -0.7, rotate: 2 },
    };
    return vectors[direction] || vectors.right;
  };

  const motionVector = calculateMotionVector(motionDirection);

  // Generate ghost layers
  const ghostLayers: RenderableComponentData[] = [];

  for (let i = 0; i < ghostCount; i++) {
    const ghostIndex = i;
    const progress = ghostIndex / (ghostCount - 1); // 0 to 1

    // Calculate properties for this ghost
    const offsetDistance = 30 * intensity; // Base offset distance in pixels
    const translateX = motionVector.x * offsetDistance * progress;
    const translateY = motionVector.y * offsetDistance * progress;
    const opacity = 1 - progress * 0.9; // 1 to 0.1
    const blurAmount = progress * 8 * intensity; // 0px to 8px
    const scaleX = 1 + progress * 0.2 * intensity; // 1 to 1.2 (shutter drag)
    const rotateZ = motionVector.rotate * progress * intensity; // Subtle rotation

    // Effect delay (16ms intervals to simulate 60fps)
    const effectDelay = ghostIndex * 0.016; // 16ms = 1/60fps

    // Create generic effect for this ghost
    const ghostEffect = {
      id: `ghost-effect-${ghostIndex}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.23, 1, 0.32, 1)' as any, // Smooth deceleration
        start: effectDelay,
        duration: duration - effectDelay,
        mode: 'provider',
        targetIds: [`ghost-layer-${ghostIndex}`],
        ranges: [
          { key: 'opacity', val: opacity, prog: 0 },
          { key: 'opacity', val: opacity, prog: 1 },
          { key: 'translateX', val: `${translateX}px`, prog: 0 },
          { key: 'translateX', val: `${translateX}px`, prog: 1 },
          { key: 'translateY', val: `${translateY}px`, prog: 0 },
          { key: 'translateY', val: `${translateY}px`, prog: 1 },
          { key: 'scaleX', val: scaleX, prog: 0 },
          { key: 'scaleX', val: scaleX, prog: 1 },
          { key: 'rotate', val: rotateZ, prog: 0 },
          { key: 'rotate', val: rotateZ, prog: 1 },
          {
            key: 'filter',
            val: `blur(${blurAmount}px)`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `blur(${blurAmount}px)`,
            prog: 1,
          },
        ],
      },
    };

    // Audio-reactive effect (optional)
    const audioEffect = audioReactive && audioSrc
      ? {
          id: `ghost-audio-effect-${ghostIndex}`,
          componentId: 'waveform',
          data: {
            audioSrc: audioSrc,
            effectType: 'blur',
            intensity: 0.5 * intensity,
            audioProperty: 'bass',
            sensitivity: 1.2,
            threshold: 0.1,
            mode: 'provider',
            targetIds: [`ghost-layer-${ghostIndex}`],
            start: effectDelay,
            duration: duration - effectDelay,
            numberOfSamples: 128,
            useFrequencyData: true,
            windowInSeconds: 1 / 30,
            smoothNormalisation: 1,
          },
        }
      : null;

    const ghostEffects = audioEffect ? [ghostEffect, audioEffect] : [ghostEffect];

    ghostLayers.push({
      id: `ghost-layer-${ghostIndex}`,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text,
        style: {
          fontSize,
          fontWeight,
          color,
          willChange: 'filter, transform',
        },
        font: {
          family: fontFamily,
          weights: ['400', '700'],
          preload: true,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: ghostEffects,
    } as RenderableComponentData);
  }

  // Main text (crisp and clear)
  const mainText: RenderableComponentData = {
    id: 'main-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize,
        fontWeight,
        color,
        textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
      },
      font: {
        family: fontFamily,
        weights: ['400', '700'],
        preload: true,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-slow-motion-trail-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
      childrenProps: [
        // Main text positioned on top
        { className: 'relative z-10' },
        // Ghosts positioned absolutely behind
        ...Array(ghostCount)
          .fill(null)
          .map(() => ({
            className: 'absolute inset-0 pointer-events-none flex items-center justify-center',
          })),
      ],
    },
    context: {
      timing: {
        start: absoluteStart,
        duration,
      },
    },
    childrenData: [mainText, ...ghostLayers] as RenderableComponentData[],
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
  id: 'cinematic-slow-motion-text-trail',
  title: 'Cinematic Slow-Motion Text Trail Effect',
  description:
    'A cinematic slow-motion text trail effect mimicking high-speed camera footage. Creates multiple ghost copies with directional motion blur, decreasing opacity, and increasing blur filters to simulate depth of field. Features shutter drag effect where ghosts stretch in the direction of motion, producing a smooth 120fps slow-motion feel with cubic-bezier easing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cinematic',
    'slow-motion',
    'motion-blur',
    'trail',
    'ghost',
    'depth-of-field',
    'shutter-drag',
    '120fps',
    'high-speed-camera',
    'audio-reactive',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'EPIC',
    fontSize: '96px',
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Inter',
    duration: 5,
    absoluteStart: 0,
    ghostCount: 10,
    motionDirection: 'right',
    intensity: 1,
    audioReactive: false,
  },
};

// Export preset
export const cinematicSlowMotionTextTrailPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};