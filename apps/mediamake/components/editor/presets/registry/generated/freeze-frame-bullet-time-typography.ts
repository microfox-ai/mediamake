/**
 * Freeze-Frame Bullet-Time Typography Preset
 *
 * This preset creates a cinematic freeze-frame stop motion typography effect where letters
 * appear as if captured in high-speed photography. Each letter "freezes" mid-motion with
 * dramatic transforms (rotation, scale, translation), then slowly settles with a time-resume
 * effect.
 *
 * Features:
 * - Two-phase animation: instant freeze with random transforms, then slow-motion settle
 * - Each letter has unique rotation, scale, and translation for dynamic composition
 * - Mix-blend-mode screen for cinematic light interaction
 * - Subtle continuous drift after settle for suspended animation feel
 * - GPU-optimized transforms with will-change and translateZ(0)
 * - Staggered timing creates simultaneous appearance effect
 * - Configurable intensity, drift, and motion parameters
 *
 * Technical Details:
 * - Phase 1 (Instant Freeze): 0.001s duration with random transforms
 * - Phase 2 (Slow Settle): 2.5s ease-out-cubic to normal state
 * - Phase 3 (Continuous Drift): Subtle infinite motion after settle
 * - Uses absolute positioning with calculated scatter positions
 * - Text shadow for dramatic suspended effect
 *
 * Use Cases:
 * - Cinematic title reveals
 * - Bullet-time style typography
 * - High-impact dramatic text displays
 * - Action/sports content titles
 * - Music video text effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text to display in freeze-frame effect'),

  fontSize: z
    .number()
    .min(20)
    .max(400)
    .default(120)
    .optional()
    .describe('Font size in pixels'),

  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (e.g., "Inter", "Roboto", "BebasNeue")'),

  fontWeight: z
    .string()
    .default('900')
    .optional()
    .describe('Font weight (e.g., "400", "700", "900")'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),

  // Animation intensity controls
  rotationRange: z
    .number()
    .min(0)
    .max(360)
    .default(180)
    .optional()
    .describe('Maximum rotation range in degrees (0-360)'),

  translateRange: z
    .number()
    .min(0)
    .max(500)
    .default(100)
    .optional()
    .describe('Maximum translation range in pixels'),

  scaleMin: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Minimum scale value (0.1-2)'),

  scaleMax: z
    .number()
    .min(0.1)
    .max(3)
    .default(2)
    .optional()
    .describe('Maximum scale value (0.1-3)'),

  // Timing controls
  settleDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2.5)
    .optional()
    .describe('Duration of slow-motion settle phase in seconds'),

  staggerDelay: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .optional()
    .describe('Delay between each letter in seconds (for simultaneous feel)'),

  // Drift controls
  driftAmount: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .optional()
    .describe('Amount of continuous drift in pixels after settle'),

  driftDuration: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .optional()
    .describe('Duration of one drift cycle in seconds'),

  // Visual enhancements
  textShadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Text shadow intensity (0-1)'),

  mixBlendMode: z
    .enum([
      'normal',
      'screen',
      'multiply',
      'overlay',
      'soft-light',
      'hard-light',
    ])
    .default('screen')
    .optional()
    .describe('CSS mix-blend-mode for cinematic light interaction'),

  // Timing context
  startTime: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start time in seconds (relative to parent)'),

  duration: z
    .number()
    .min(1)
    .default(10)
    .optional()
    .describe('Total duration in seconds'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const text = params.text;
  const fontSize = params.fontSize ?? 120;
  const fontFamily = params.fontFamily ?? 'Inter';
  const fontWeight = params.fontWeight ?? '900';
  const textColor = params.textColor ?? '#ffffff';
  const rotationRange = params.rotationRange ?? 180;
  const translateRange = params.translateRange ?? 100;
  const scaleMin = params.scaleMin ?? 0.5;
  const scaleMax = params.scaleMax ?? 2;
  const settleDuration = params.settleDuration ?? 2.5;
  const staggerDelay = params.staggerDelay ?? 0.02;
  const driftAmount = params.driftAmount ?? 10;
  const driftDuration = params.driftDuration ?? 4;
  const textShadowIntensity = params.textShadowIntensity ?? 0.5;
  const mixBlendMode = params.mixBlendMode ?? 'screen';
  const startTime = params.startTime ?? 0;
  const duration = params.duration ?? 10;

  // Random number generator helper (seeded for consistency)
  const random = (min: number, max: number, seed: number): number => {
    const x = Math.sin(seed) * 10000;
    const rand = x - Math.floor(x);
    return min + rand * (max - min);
  };

  // Split text into letters
  const letters = text.split('');
  const letterCount = letters.length;

  // Calculate horizontal spacing for layout
  const letterSpacing = fontSize * 0.7; // Approximate spacing
  const totalWidth = letterSpacing * letterCount;
  const startX = -totalWidth / 2;

  // Create letter components
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `freeze-letter-${index}`;

      // Generate random values for this letter (seeded by index)
      const seed = index * 123.456;
      const randomRotation = random(-rotationRange, rotationRange, seed);
      const randomTranslateX = random(-translateRange, translateRange, seed + 1);
      const randomTranslateY = random(-translateRange, translateRange, seed + 2);
      const randomScale = random(scaleMin, scaleMax, seed + 3);
      const randomDriftX = random(-driftAmount, driftAmount, seed + 4);
      const randomDriftY = random(-driftAmount, driftAmount, seed + 5);

      // Calculate final position for this letter
      const finalX = startX + index * letterSpacing;

      // Stagger timing
      const letterStaggerDelay = index * staggerDelay;

      // Phase 1: Instant freeze effect (0.001s)
      const freezeEffect: GenericEffectData = {
        type: 'linear',
        start: letterStaggerDelay,
        duration: 0.001,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'rotate', val: randomRotation, prog: 0 },
          { key: 'rotate', val: randomRotation, prog: 1 },
          { key: 'translateX', val: randomTranslateX, prog: 0 },
          { key: 'translateX', val: randomTranslateX, prog: 1 },
          { key: 'translateY', val: randomTranslateY, prog: 0 },
          { key: 'translateY', val: randomTranslateY, prog: 1 },
          { key: 'scale', val: randomScale, prog: 0 },
          { key: 'scale', val: randomScale, prog: 1 },
          { key: 'opacity', val: 0.7, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 1 },
        ],
      };

      // Phase 2: Slow-motion settle (2.5s ease-out-cubic)
      const settleEffect: GenericEffectData = {
        type: 'ease-out-cubic',
        start: letterStaggerDelay + 0.001,
        duration: settleDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'rotate', val: randomRotation, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
          { key: 'translateX', val: randomTranslateX, prog: 0 },
          { key: 'translateX', val: finalX, prog: 1 },
          { key: 'translateY', val: randomTranslateY, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'scale', val: randomScale, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'opacity', val: 0.7, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      // Phase 3: Continuous drift (starts after settle completes)
      const driftStartTime = letterStaggerDelay + 0.001 + settleDuration;
      const remainingDuration = Math.max(duration - driftStartTime, 0);

      const driftEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: driftStartTime,
        duration: remainingDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateX', val: finalX, prog: 0 },
          { key: 'translateX', val: finalX + randomDriftX, prog: 0.5 },
          { key: 'translateX', val: finalX, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: randomDriftY, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };

      // Letter component
      const letterComponent: RenderableComponentData = {
        id: letterId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            color: textColor,
            mixBlendMode: mixBlendMode,
            willChange: 'transform',
            transform: 'translateZ(0)',
            position: 'absolute',
            textShadow: `0 0 ${fontSize * 0.25}px rgba(255,255,255,${textShadowIntensity})`,
            left: '50%',
            top: '50%',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
            display: 'swap',
            preload: true,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `freeze-instant-${index}`,
            componentId: 'generic',
            data: freezeEffect,
          },
          {
            id: `settle-${index}`,
            componentId: 'generic',
            data: settleEffect,
          },
          {
            id: `drift-${index}`,
            componentId: 'generic',
            data: driftEffect,
          },
        ],
      };

      return letterComponent;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'freeze-frame-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration,
      },
    },
    childrenData: letterComponents as RenderableComponentData[],
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'freezeFrameBulletTimeTypography',
  title: 'Freeze-Frame Bullet-Time Typography',
  description:
    'Cinematic freeze-frame stop motion typography where letters appear as if captured in high-speed photography. Each letter freezes mid-motion with dramatic transforms (rotation, scale, translation), then slowly settles with time-resume effect. Features two-phase animation: instant freeze with random transforms followed by slow-motion settle with ease-out-cubic. Includes subtle continuous drift for suspended animation feel, mix-blend-mode for cinematic light interaction, and GPU-optimized transforms.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'freeze-frame',
    'bullet-time',
    'cinematic',
    'dramatic',
    'suspended',
    'high-speed',
    'motion',
    'dynamic',
    'title',
    'text',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'FREEZE FRAME',
    fontSize: 120,
    fontFamily: 'Inter',
    fontWeight: '900',
    textColor: '#ffffff',
    rotationRange: 180,
    translateRange: 100,
    scaleMin: 0.5,
    scaleMax: 2,
    settleDuration: 2.5,
    staggerDelay: 0.02,
    driftAmount: 10,
    driftDuration: 4,
    textShadowIntensity: 0.5,
    mixBlendMode: 'screen',
    startTime: 0,
    duration: 10,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const freezeFrameBulletTimeTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
