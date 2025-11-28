/**
 * Cyberpunk Neon Glow Text Preset
 *
 * A cyberpunk-style animated neon glow effect that pulses and breathes around text outlines.
 * Features dual-color cyan-to-magenta gradient glow, breathing animation with expansion/contraction
 * rhythm, scan line interference patterns for glitchy high-tech aesthetic, and data-stream particle
 * effects traveling along text edges. Supports optional audio-reactive behavior where glow intensity
 * and scale respond to audio beats and frequencies. Implements holographic display visualization with
 * dynamic light emission from text edges.
 *
 * Features:
 * - Dual-color gradient glow (cyan to magenta) with dynamic shifts
 * - Breathing effect with rhythmic expansion and contraction
 * - Audio-reactive pulsing synchronized with beats (optional)
 * - Scan line interference patterns for glitchy aesthetic
 * - Data-stream particle effects traveling along text edges
 * - Futuristic holographic display visualization
 * - Multiple text shadow layers for depth
 * - Customizable intensity and timing
 *
 * Use cases:
 * - Cyberpunk-themed video titles
 * - Futuristic holographic displays
 * - Tech/gaming content overlays
 * - Audio-reactive music visualizations
 * - Sci-fi video effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with neon glow effect'),
  duration: z
    .number()
    .default(10)
    .describe('Duration of the effect in seconds'),
  audioSrc: z
    .string()
    .optional()
    .describe(
      'Optional audio source URL for audio-reactive behavior (e.g., "https://example.com/audio.mp3" or "ref:audioComponentId")',
    ),
  glowIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for glow effects (0.1 to 3)'),
  breathingSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Speed of breathing animation in seconds per cycle'),
  particleCount: z
    .number()
    .int()
    .min(4)
    .max(20)
    .default(6)
    .describe('Number of data-stream particles traveling along text edges'),
  scanLineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Base opacity of scan line interference (0 to 1)'),
  audioSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe(
      'Sensitivity multiplier for audio-reactive effects (0.1 to 5, only used if audioSrc is provided)',
    ),
  audioThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'Minimum audio level to trigger effects (0 to 1, only used if audioSrc is provided)',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(96)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Orbitron')
    .describe(
      'Font family (Google Font name, e.g., "Orbitron", "Rajdhani", "Audiowide")',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    audioSrc,
    glowIntensity,
    breathingSpeed,
    particleCount,
    scanLineOpacity,
    audioSensitivity,
    audioThreshold,
    fontSize,
    fontFamily,
  } = params;

  const containerId = 'cyberpunk-neon-container';
  const textId = 'cyberpunk-neon-text';
  const scanLineId = 'cyberpunk-scan-lines';

  // Calculate particle positions (distributed around text edges)
  const createParticles = (): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    const positions = [
      { left: '10%', top: '50%' },
      { left: '15%', top: '48%' },
      { left: '20%', top: '52%' },
      { left: '80%', top: '50%' },
      { left: '85%', top: '48%' },
      { left: '90%', top: '52%' },
    ];

    for (let i = 0; i < Math.min(particleCount, positions.length); i++) {
      const pos = positions[i];
      const isCyan = i % 2 === 0;
      const color = isCyan ? '#00ffff' : '#ff00ff';
      const particleSize = 3 + Math.random() * 3;
      const animDuration = 1.5 + Math.random();
      const isLeftSide = parseFloat(pos.left) < 50;

      particles.push({
        id: `particle-${i}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${particleSize}px; height: ${particleSize}px; background: ${color}; border-radius: 50%; box-shadow: 0 0 ${particleSize * 2}px ${color};"></div>`,
          className: 'absolute pointer-events-none',
          style: {
            left: pos.left,
            top: pos.top,
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
            id: `particle-move-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: animDuration,
              mode: 'provider',
              targetIds: [`particle-${i}`],
              ranges: [
                {
                  key: 'translateX',
                  val: isLeftSide ? 0 : 0,
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: isLeftSide ? 50 : -50,
                  prog: 0.5,
                },
                {
                  key: 'translateX',
                  val: isLeftSide ? 0 : 0,
                  prog: 1,
                },
                {
                  key: 'translateY',
                  val: 0,
                  prog: 0,
                },
                {
                  key: 'translateY',
                  val: -10 + Math.random() * 20,
                  prog: 0.5,
                },
                {
                  key: 'translateY',
                  val: 0,
                  prog: 1,
                },
                {
                  key: 'opacity',
                  val: 0.3,
                  prog: 0,
                },
                {
                  key: 'opacity',
                  val: 1,
                  prog: 0.3,
                },
                {
                  key: 'opacity',
                  val: 1,
                  prog: 0.7,
                },
                {
                  key: 'opacity',
                  val: 0.3,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Base text shadow (multiple layers for depth)
  const baseTextShadow = `
    0 0 ${10 * glowIntensity}px rgba(0,255,255,0.5),
    0 0 ${20 * glowIntensity}px rgba(255,0,255,0.3),
    0 0 ${30 * glowIntensity}px rgba(0,255,255,0.2),
    0 0 ${40 * glowIntensity}px rgba(255,0,255,0.1)
  `;

  // Breathing effect (generic animation)
  const breathingEffect = {
    id: 'breathing-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: breathingSpeed,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.05 * glowIntensity, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
        {
          key: 'textShadow',
          val: baseTextShadow,
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `
            0 0 ${15 * glowIntensity}px rgba(0,255,255,0.7),
            0 0 ${30 * glowIntensity}px rgba(255,0,255,0.5),
            0 0 ${45 * glowIntensity}px rgba(0,255,255,0.3),
            0 0 ${60 * glowIntensity}px rgba(255,0,255,0.2)
          `,
          prog: 0.5,
        },
        {
          key: 'textShadow',
          val: baseTextShadow,
          prog: 1,
        },
      ],
    },
  };

  // Audio-reactive effect (optional)
  const audioReactiveEffect = audioSrc
    ? {
        id: 'audio-reactive-glow',
        componentId: 'waveform',
        data: {
          audioSrc: audioSrc,
          audioProperty: 'bass' as const,
          effectType: 'scale' as const,
          intensity: 0.15 * glowIntensity,
          baseScale: 1,
          sensitivity: audioSensitivity,
          threshold: audioThreshold,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: [textId],
          start: 0,
          duration: duration,
          smoothNormalisation: 1,
        },
      }
    : null;

  // Scan line glitch effect
  const scanLineGlitchEffect = {
    id: 'scanline-glitch',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: 3,
      mode: 'provider',
      targetIds: [scanLineId],
      ranges: [
        { key: 'opacity', val: scanLineOpacity, prog: 0 },
        { key: 'opacity', val: scanLineOpacity * 1.5, prog: 0.2 },
        { key: 'opacity', val: scanLineOpacity, prog: 0.4 },
        { key: 'opacity', val: scanLineOpacity * 1.5, prog: 0.6 },
        { key: 'opacity', val: scanLineOpacity, prog: 0.8 },
        { key: 'opacity', val: scanLineOpacity * 1.5, prog: 0.9 },
        { key: 'opacity', val: scanLineOpacity, prog: 1 },
      ],
    },
  };

  const particles = createParticles();

  // Text component with effects
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        textShadow: baseTextShadow,
        letterSpacing: '0.05em',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: audioReactiveEffect
      ? [breathingEffect, audioReactiveEffect]
      : [breathingEffect],
  };

  // Scan line overlay
  const scanLineOverlay: RenderableComponentData = {
    id: scanLineId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
          opacity: scanLineOpacity,
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [scanLineGlitchEffect],
  };

  // Text container
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-20 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textComponent],
  };

  // Particle container
  const particleContainer: RenderableComponentData = {
    id: 'particle-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: particles,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center w-full h-full bg-black relative overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [scanLineOverlay, particleContainer, textContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'cyberpunk-neon-glow-text',
  title: 'Cyberpunk Neon Glow Text',
  description:
    'A cyberpunk-style animated neon glow effect that pulses and breathes around text outlines. Features dual-color cyan-to-magenta gradient glow, breathing animation with expansion/contraction rhythm, scan line interference patterns for glitchy high-tech aesthetic, and data-stream particle effects traveling along text edges. Supports optional audio-reactive behavior where glow intensity and scale respond to audio beats and frequencies. Implements holographic display visualization with dynamic light emission from text edges.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cyberpunk',
    'neon',
    'glow',
    'holographic',
    'futuristic',
    'audio-reactive',
    'particles',
    'glitch',
    'breathing',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'CYBERPUNK',
    duration: 10,
    glowIntensity: 1,
    breathingSpeed: 2,
    particleCount: 6,
    scanLineOpacity: 0.6,
    audioSensitivity: 0.8,
    audioThreshold: 0.3,
    fontSize: 96,
    fontFamily: 'Orbitron',
  },
};

// Export preset
export const cyberpunkNeonGlowTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
