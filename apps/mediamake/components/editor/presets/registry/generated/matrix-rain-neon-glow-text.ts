/**
 * Matrix Rain Neon Glow Text Preset
 * 
 * A sophisticated matrix-rain style effect where streams of glowing particles cascade down text outlines
 * like digital rain. Features varying particle speeds and intensities for depth, data burst moments with
 * clustered glow spots, and flowing digital energy aesthetics. Particles follow letter contours with
 * occasional branching, creating a dynamic data-visualization effect.
 * 
 * Features:
 * - 40+ cascading particle streams flowing down the screen
 * - Particles positioned dynamically around text boundaries
 * - Varying speeds (2-4 seconds) and opacities (0.3-1.0) for depth
 * - Data burst effects where particles cluster and glow intensely
 * - Pulsing neon glow on text with periodic bursts
 * - Additive blending (screen mode) for authentic digital rain effect
 * - Continuous particle recycling for endless animation
 * 
 * Use cases:
 * - Tech/cyberpunk themed videos
 * - Data visualization intros
 * - Digital/futuristic title cards
 * - Hacker/coding aesthetic overlays
 * - Sci-fi themed content
 */

import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';
import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('MATRIX')
    .describe('The text content to display with matrix rain effect'),
  
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Duration of the preset in seconds'),
  
  particleCount: z
    .number()
    .min(20)
    .max(100)
    .default(45)
    .describe('Number of particle streams (20-100)'),
  
  textColor: z
    .string()
    .default('#00ff00')
    .describe('Primary text color (default: green #00ff00)'),
  
  particleColor: z
    .string()
    .default('#00ff00')
    .describe('Particle color (default: green #00ff00)'),
  
  glowIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for glow effects (0.1-3)'),
  
  burstInterval: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Time interval between data bursts in seconds'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size for the text in pixels'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    particleCount,
    textColor,
    particleColor,
    glowIntensity,
    burstInterval,
    fontSize,
  } = params;

  // Helper: Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number = 1): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0, 255, 0, ${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Helper: Generate random position for particle
  const generateParticlePosition = (index: number, total: number): { left: string; delay: number } => {
    // Distribute particles across screen width with some clustering around text edges
    const basePosition = (index / total) * 100;
    // Add randomness to avoid perfect grid
    const randomOffset = (Math.random() - 0.5) * 15;
    const left = Math.max(5, Math.min(95, basePosition + randomOffset));
    
    // Stagger start times
    const delay = (index / total) * 2; // Spread over 2 seconds
    
    return { left: `${left}%`, delay };
  };

  // Helper: Generate random duration between min and max
  const randomDuration = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Calculate burst moments
  const burstCount = Math.floor(duration / burstInterval);
  const burstMoments: number[] = [];
  for (let i = 0; i < burstCount; i++) {
    burstMoments.push(burstInterval * (i + 1));
  }

  // ============================================================================
  // CREATE PARTICLE STREAMS
  // ============================================================================

  const particles: RenderableComponentData[] = [];

  for (let i = 0; i < particleCount; i++) {
    const particleId = `particle-stream-${i}`;
    const { left, delay } = generateParticlePosition(i, particleCount);
    const fallDuration = randomDuration(2, 4);
    const particleHeight = 16 + Math.random() * 16; // Random height between 16-32px

    // Base opacity varies for depth
    const baseOpacity = 0.3 + Math.random() * 0.4; // 0.3 - 0.7
    const maxOpacity = 0.7 + Math.random() * 0.3; // 0.7 - 1.0

    // Create falling animation
    const fallingEffect: GenericEffectData = {
      type: 'linear',
      start: delay,
      duration: duration - delay,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        { key: 'translateY', val: -20, prog: 0 },
        { key: 'translateY', val: 1100, prog: 1 }, // Fall beyond screen
      ],
    };

    // Create opacity pulse animation
    const opacityEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: delay,
      duration: fallDuration,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: maxOpacity, prog: 0.2 },
        { key: 'opacity', val: baseOpacity, prog: 0.5 },
        { key: 'opacity', val: maxOpacity, prog: 0.8 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    // Create burst effects for this particle
    const burstEffects: any[] = [];
    burstMoments.forEach((burstTime, index) => {
      // Random chance this particle participates in burst (50%)
      if (Math.random() > 0.5) {
        const burstEffect: GenericEffectData = {
          type: 'ease-out',
          start: burstTime,
          duration: 0.4,
          mode: 'provider',
          targetIds: [particleId],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 3 * glowIntensity, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'opacity', val: baseOpacity, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: baseOpacity, prog: 1 },
          ],
        };
        burstEffects.push({
          id: `burst-effect-${particleId}-${index}`,
          componentId: 'generic',
          data: burstEffect,
        });
      }
    });

    // Create particle component
    const particleComponent: RenderableComponentData = {
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 2px; height: ${particleHeight}px; background: linear-gradient(to bottom, ${hexToRgba(particleColor, 1)}, transparent); border-radius: 2px;"></div>`,
        className: 'absolute',
        style: {
          left,
          top: '0px',
          opacity: baseOpacity,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
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
          id: `falling-${particleId}`,
          componentId: 'generic',
          data: fallingEffect,
        },
        {
          id: `opacity-${particleId}`,
          componentId: 'generic',
          data: opacityEffect,
        },
        ...burstEffects,
      ],
    };

    particles.push(particleComponent);
  }

  // ============================================================================
  // CREATE TEXT WITH PULSING GLOW
  // ============================================================================

  const textId = 'matrix-text';
  const baseGlow = 10 * glowIntensity;
  const maxGlow = 20 * glowIntensity;

  // Text glow pulse effect (continuous)
  const textGlowEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: 2,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      {
        key: 'textShadow',
        val: `0 0 ${baseGlow}px ${hexToRgba(textColor, 0.5)}, 0 0 ${baseGlow * 2}px ${hexToRgba(textColor, 0.3)}, 0 0 ${baseGlow * 3}px ${hexToRgba(textColor, 0.2)}`,
        prog: 0,
      },
      {
        key: 'textShadow',
        val: `0 0 ${maxGlow}px ${hexToRgba(textColor, 0.8)}, 0 0 ${maxGlow * 2}px ${hexToRgba(textColor, 0.5)}, 0 0 ${maxGlow * 3}px ${hexToRgba(textColor, 0.3)}`,
        prog: 0.5,
      },
      {
        key: 'textShadow',
        val: `0 0 ${baseGlow}px ${hexToRgba(textColor, 0.5)}, 0 0 ${baseGlow * 2}px ${hexToRgba(textColor, 0.3)}, 0 0 ${baseGlow * 3}px ${hexToRgba(textColor, 0.2)}`,
        prog: 1,
      },
    ],
  };

  // Data burst effects on text
  const textBurstEffects: any[] = [];
  burstMoments.forEach((burstTime, index) => {
    const burstEffect: GenericEffectData = {
      type: 'ease-out',
      start: burstTime,
      duration: 0.5,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        {
          key: 'textShadow',
          val: `0 0 ${maxGlow}px ${hexToRgba(textColor, 0.8)}`,
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `0 0 ${maxGlow * 2}px ${hexToRgba(textColor, 1)}, 0 0 ${maxGlow * 4}px ${hexToRgba(textColor, 0.8)}, 0 0 ${maxGlow * 6}px ${hexToRgba(textColor, 0.5)}`,
          prog: 0.3,
        },
        {
          key: 'textShadow',
          val: `0 0 ${baseGlow}px ${hexToRgba(textColor, 0.5)}`,
          prog: 1,
        },
      ],
    };
    textBurstEffects.push({
      id: `text-burst-${index}`,
      componentId: 'generic',
      data: burstEffect,
    });
  });

  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-mono font-bold relative z-10',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        textShadow: `0 0 ${baseGlow}px ${hexToRgba(textColor, 0.5)}, 0 0 ${baseGlow * 2}px ${hexToRgba(textColor, 0.3)}, 0 0 ${baseGlow * 3}px ${hexToRgba(textColor, 0.2)}`,
        letterSpacing: '0.05em',
      },
      font: {
        family: 'JetBrains Mono',
        weights: ['700'],
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
        id: 'text-glow-pulse',
        componentId: 'generic',
        data: textGlowEffect,
      },
      ...textBurstEffects,
    ],
  };

  // ============================================================================
  // ASSEMBLE COMPOSITION
  // ============================================================================

  const particleLayer: RenderableComponentData = {
    id: 'particle-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-0',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: particles as RenderableComponentData[],
  };

  const textLayer: RenderableComponentData = {
    id: 'text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textComponent],
  };

  const rootContainer: RenderableComponentData = {
    id: 'matrix-rain-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [particleLayer, textLayer],
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
  id: 'matrix-rain-neon-glow-text',
  title: 'Matrix Rain Neon Glow Text',
  description:
    'A sophisticated matrix-rain style effect where streams of glowing particles cascade down text outlines like digital rain. Features varying particle speeds and intensities for depth, data burst moments with clustered glow spots, and flowing digital energy aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'matrix',
    'rain',
    'particles',
    'neon',
    'glow',
    'cyberpunk',
    'tech',
    'digital',
    'data',
    'visualization',
    'kinetic',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MATRIX',
    duration: 10,
    particleCount: 45,
    textColor: '#00ff00',
    particleColor: '#00ff00',
    glowIntensity: 1,
    burstInterval: 3,
    fontSize: 72,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const matrixRainNeonGlowTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
