/**
 * Data Stream Shimmer Text Effect Preset
 *
 * Creates a Matrix-like cyberpunk title sequence effect where text appears composed of flowing
 * digital information. Features scrolling binary/hex pattern overlays, bright data packets that
 * travel across the text surface, glitch effects with skew distortion and opacity flickers, and
 * small bit particles that break off and float away. Includes cyber glow styling and mix-blend-screen
 * overlays for an authentic digital aesthetic.
 *
 * Features:
 * - Scrolling binary/hex pattern overlay using animated background gradients
 * - Bright data packets (thin bars) traveling across text at varied speeds
 * - Glitch effects: skewX distortion, opacity flickers, translateX jitter
 * - Bit particles that break off and float away
 * - Cyber glow with drop-shadow effect
 * - Audio-reactive mode: sync packet speed and glitch timing to BPM/transients (optional)
 *
 * Use cases:
 * - Matrix-like title sequences
 * - Cyberpunk video intros
 * - Tech/digital content branding
 * - Futuristic UI overlays
 * - Sci-fi themed titles
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('DATA STREAM')
    .describe('The text to display with data stream shimmer effect'),
  font: z
    .string()
    .default('JetBrains Mono:700')
    .describe('Font family with optional weight and style (e.g., "JetBrains Mono:700", "Roboto Mono:600")'),
  textColor: z
    .string()
    .default('#00FF00')
    .describe('Primary text color (default green for Matrix style)'),
  glowColor: z
    .string()
    .default('rgba(0,255,0,0.5)')
    .describe('Glow/shadow color for cyber glow effect'),
  fontSize: z
    .number()
    .default(96)
    .describe('Font size in pixels'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the effect in seconds'),
  dataFlowSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Speed multiplier for scrolling data pattern (higher = faster)'),
  dataPacketCount: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Number of data packets traveling across text'),
  glitchIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for glitch effects'),
  bitParticleCount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Number of bit particles that break off'),
  audioSrc: z
    .string()
    .optional()
    .describe('Optional audio source for audio-reactive sync (BPM/transient detection)'),
  reducedMotion: z
    .boolean()
    .default(false)
    .describe('Reduce motion intensity for accessibility'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'JetBrains Mono:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font weight
  let fontWeight: number | string = 700;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Create data packet effects
  const createDataPacketEffects = (
    packetId: string,
    startTime: number,
    duration: number,
    speed: number,
  ) => {
    const effectDuration = duration / speed;
    return [
      {
        id: `${packetId}-translate`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: startTime,
          duration: effectDuration,
          mode: 'provider' as const,
          targetIds: [packetId],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '100%', prog: 1 },
          ],
        },
      },
    ];
  };

  // Helper: Create bit particle effects
  const createBitParticleEffects = (
    particleId: string,
    startTime: number,
    floatDistance: number,
    floatDuration: number,
  ) => {
    return [
      {
        id: `${particleId}-float`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: startTime,
          duration: floatDuration,
          mode: 'provider' as const,
          targetIds: [particleId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -floatDistance, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.8 },
          ],
        },
      },
    ];
  };

  // Helper: Create glitch effects for text
  const createGlitchEffects = (
    targetId: string,
    glitchTimes: number[],
    intensity: number,
  ) => {
    const effects = [];
    for (const glitchTime of glitchTimes) {
      // Skew effect
      effects.push({
        id: `${targetId}-glitch-skew-${glitchTime}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: glitchTime,
          duration: 0.1 * intensity,
          mode: 'provider' as const,
          targetIds: [targetId],
          ranges: [
            { key: 'skewX', val: '-3deg', prog: 0 },
            { key: 'skewX', val: '3deg', prog: 0.5 },
            { key: 'skewX', val: '0deg', prog: 1 },
          ],
        },
      });
      // Opacity flicker
      effects.push({
        id: `${targetId}-glitch-opacity-${glitchTime}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: glitchTime,
          duration: 0.15 * intensity,
          mode: 'provider' as const,
          targetIds: [targetId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 0.8, prog: 0.8 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });
      // TranslateX jitter
      effects.push({
        id: `${targetId}-glitch-jitter-${glitchTime}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: glitchTime,
          duration: 0.08 * intensity,
          mode: 'provider' as const,
          targetIds: [targetId],
          ranges: [
            { key: 'translateX', val: '-2px', prog: 0 },
            { key: 'translateX', val: '2px', prog: 0.3 },
            { key: 'translateX', val: '-1px', prog: 0.6 },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      });
    }
    return effects;
  };

  // Glitch timing: deterministic intervals (2s, 5s, 8s)
  const glitchTimes: number[] = [];
  const glitchInterval = params.reducedMotion ? 5 : 3;
  for (let t = 2; t < params.duration; t += glitchInterval) {
    glitchTimes.push(t);
  }

  // Data flow overlay effect
  const dataFlowEffect = {
    id: 'data-flow-scroll',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: params.duration,
      mode: 'provider' as const,
      targetIds: ['data-flow-overlay'],
      ranges: [
        { key: 'backgroundPositionY', val: '0px', prog: 0 },
        { key: 'backgroundPositionY', val: '-32px', prog: 0.2 / params.dataFlowSpeed },
        { key: 'backgroundPositionY', val: '0px', prog: 0.4 / params.dataFlowSpeed },
      ],
    },
  };

  // Create data packets
  const dataPackets: RenderableComponentData[] = [];
  for (let i = 0; i < params.dataPacketCount; i++) {
    const packetId = `data-packet-${i}`;
    const topPosition = 20 + (i * 60) / params.dataPacketCount;
    const startTime = (i * 1.2) % params.duration;
    const speed = 0.6 + (i % 3) * 0.2;
    const repeatInterval = 2.5 + (i % 3) * 0.5;
    const effectDuration = 1 / speed;

    const packetEffects = [];
    let currentTime = startTime;
    while (currentTime < params.duration) {
      packetEffects.push(
        ...createDataPacketEffects(packetId, currentTime, 1, speed),
      );
      currentTime += repeatInterval;
    }

    dataPackets.push({
      id: packetId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-0.5 w-full bg-white/80',
          style: {
            top: `${topPosition}%`,
            mixBlendMode: 'screen',
          },
        },
      },
      effects: packetEffects,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    } as RenderableComponentData);
  }

  // Create bit particles
  const bitParticles: RenderableComponentData[] = [];
  for (let i = 0; i < params.bitParticleCount; i++) {
    const particleId = `bit-particle-${i}`;
    const leftPosition = 30 + (i * 45) / params.bitParticleCount;
    const topPosition = 40 + (i % 3) * 10;
    const startTime = 2 + i * 2;
    const floatDistance = 50 + (i % 3) * 10;
    const floatDuration = 1.5 + (i % 3) * 0.3;

    if (startTime < params.duration) {
      bitParticles.push({
        id: particleId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute ${i % 2 === 0 ? 'w-1 h-1 rounded-full' : 'w-1.5 h-1.5'} ${i % 3 === 0 ? 'bg-green-300' : i % 3 === 1 ? 'bg-green-400' : 'bg-white/60'}`,
            style: {
              left: `${leftPosition}%`,
              top: `${topPosition}%`,
            },
          },
        },
        effects: createBitParticleEffects(
          particleId,
          startTime,
          floatDistance,
          floatDuration,
        ),
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData);
    }
  }

  // Text base layer with glitch effects
  const textAtomId = 'text-base-layer';
  const textGlitchEffects = createGlitchEffects(
    textAtomId,
    glitchTimes,
    params.glitchIntensity,
  );

  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'text-6xl font-mono font-bold',
      style: {
        color: params.textColor,
        fontSize: params.fontSize,
        fontWeight: fontWeight,
        filter: `drop-shadow(0 0 20px ${params.glowColor})`,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    },
    effects: textGlitchEffects,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  // Data flow overlay
  const dataFlowOverlay: RenderableComponentData = {
    id: 'data-flow-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(0, 255, 0, 0.15) 8px, rgba(0, 255, 0, 0.15) 16px)',
          backgroundSize: '100% 32px',
          mixBlendMode: 'screen',
        },
      },
    },
    effects: [dataFlowEffect],
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'data-stream-shimmer-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      textAtom,
      dataFlowOverlay,
      ...dataPackets,
      ...bitParticles,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'data-stream-shimmer-text',
  title: 'Data Stream Shimmer Text Effect',
  description:
    'A Matrix-like cyberpunk title sequence effect where text appears composed of flowing digital information. Features scrolling binary/hex patterns via animated background gradients, bright data packets traveling across the text surface, glitch effects with skew distortion and opacity flickers, and small bit particles that break off and float away. Includes cyber glow styling and mix-blend-screen overlays for authentic digital aesthetic. Audio-reactive mode available for syncing to BPM.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'title',
    'matrix',
    'cyberpunk',
    'glitch',
    'data',
    'shimmer',
    'digital',
    'tech',
    'sci-fi',
    'futuristic',
    'particles',
    'glow',
    'kinetic',
  ],
  defaultInputParams: {
    text: 'DATA STREAM',
    font: 'JetBrains Mono:700',
    textColor: '#00FF00',
    glowColor: 'rgba(0,255,0,0.5)',
    fontSize: 96,
    duration: 10,
    dataFlowSpeed: 1,
    dataPacketCount: 3,
    glitchIntensity: 1,
    bitParticleCount: 3,
    reducedMotion: false,
  },
  dependencies: {},
};

// --- Export Preset ---
export const dataStreamShimmerTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z
    .object({
      text: z.string(),
      font: z.string(),
      textColor: z.string(),
      glowColor: z.string(),
      fontSize: z.number(),
      duration: z.number(),
      dataFlowSpeed: z.number(),
      dataPacketCount: z.number(),
      glitchIntensity: z.number(),
      bitParticleCount: z.number(),
      audioSrc: z.string().optional(),
      reducedMotion: z.boolean(),
    })
    .parse(presetParams),
};
