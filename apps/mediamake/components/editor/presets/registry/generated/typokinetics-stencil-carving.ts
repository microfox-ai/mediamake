/**
 * Typokinetics Stencil Carving Preset
 *
 * This preset simulates stencil text being carved or etched in real-time with kick drum synchronization,
 * like a CNC machine cutting letters into metal. It features progressive reveal of text through mechanical
 * carving, metallic texture effects, spark particles that fly off during carving, and heat glow effects
 * where freshly carved areas briefly glow orange-red before cooling to white.
 *
 * Features:
 * - **Stencil Text Path Animation**: SVG-based text with stroke-dasharray animation for progressive reveal
 * - **Kick Drum Synchronization**: Carving progresses with each detected kick beat
 * - **Metallic Texture Effects**: CSS filters for metallic appearance (contrast, brightness, saturation)
 * - **Spark Particles**: Metal shaving particles that fly off during carving process
 * - **Heat Glow Effect**: Freshly carved areas glow orange-red before cooling to white
 * - **Grinding Mechanical Progression**: Industrial CNC-style carving animation
 * - **Audio-Reactive**: Uses beatstitch analysis to synchronize carving with music
 *
 * Use cases:
 * - Industrial-themed title sequences
 * - Music video typography synchronized to kicks
 * - Tech/mechanical product reveals
 * - Heavy metal or industrial music visuals
 * - Manufacturing/engineering content intros
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z.string().describe('Text to carve into metal'),
  audio: z
    .object({
      src: z.string().describe('Audio source URL for beat detection'),
      start: z.number().optional().describe('Audio start time in seconds'),
      duration: z
        .number()
        .optional()
        .describe('Audio duration in seconds (auto-detected if omitted)'),
    })
    .describe('Audio track for kick drum synchronization'),
  font: z
    .string()
    .default('Impact')
    .optional()
    .describe(
      'Font family for stencil text (e.g., "Impact", "Arial Black", "Stencil")',
    ),
  fontSize: z
    .number()
    .default(120)
    .optional()
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Color of carved text (final state)'),
  strokeWidth: z
    .number()
    .default(3)
    .optional()
    .describe('Stroke width for stencil outline'),
  glowColor: z
    .string()
    .default('#ff6600')
    .optional()
    .describe('Heat glow color (orange-red by default)'),
  glowCoolColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Cooled glow color (white by default)'),
  glowDuration: z
    .number()
    .default(0.3)
    .optional()
    .describe('Duration of heat glow effect in seconds'),
  sparkCount: z
    .number()
    .default(20)
    .optional()
    .describe('Number of spark particles to generate'),
  sparkSize: z
    .number()
    .default(2)
    .optional()
    .describe('Size of spark particles in pixels'),
  carvingSpeed: z
    .number()
    .default(0.3)
    .optional()
    .describe(
      'Base carving speed (duration per segment in seconds, adjusted by beat intensity)',
    ),
  maxBeats: z
    .number()
    .default(30)
    .optional()
    .describe('Maximum number of kick beats to use for carving'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher, config } = props;

  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  // Fetch audio analysis data
  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audio.src,
  });

  if (!analysis || analysis.length === 0) {
    throw new Error('No audio analysis data available');
  }

  const audioStart = params.audio.start || 0;
  const audioDuration = params.audio.duration || durationInSeconds;

  // Filter beats within audio range
  const clippedAnalysis = analysis.filter(
    (beat: any) =>
      beat.timestamp >= audioStart &&
      beat.timestamp <= audioStart + audioDuration,
  );

  // Adjust timestamps to be relative to audio start
  const adjustedBeats = clippedAnalysis.map((beat: any) => ({
    ...beat,
    timestamp: beat.timestamp - audioStart,
  }));

  // Select impactful kick beats (low frequency beats with high intensity)
  const selectKickBeats = (
    beats: any[],
    maxBeatsCount: number,
    minTimeDiff: number = 0.4,
  ) => {
    // Filter for low-frequency beats (kicks)
    const kickBeats = beats.filter(
      (beat) => beat.beatType === 'low' && beat.intensity > 0.3,
    );

    // Calculate local intensity peaks
    const beatsWithPeaks = kickBeats.map((beat, index) => {
      const windowSize = 5;
      const start = Math.max(0, index - windowSize);
      const end = Math.min(kickBeats.length, index + windowSize + 1);
      const neighbors = kickBeats.slice(start, end);
      const avgIntensity =
        neighbors.reduce((sum, b) => sum + b.intensity, 0) / neighbors.length;

      const localPeakStrength = beat.intensity - avgIntensity;
      const isLocalPeak = localPeakStrength > 0.05;

      return {
        ...beat,
        localPeakStrength,
        isLocalPeak,
      };
    });

    // Score beats
    const scoredBeats = beatsWithPeaks.map((beat) => {
      const intensityScore = beat.intensity * 0.5;
      const peakScore = beat.isLocalPeak ? beat.localPeakStrength * 0.5 : 0;
      const totalScore = intensityScore + peakScore;

      return { ...beat, totalScore };
    });

    // Sort by score and select top beats
    const sortedByImpact = scoredBeats.sort(
      (a, b) => b.totalScore - a.totalScore,
    );

    const selectedBeats: any[] = [];
    const usedTimestamps = new Set<number>();

    for (const beat of sortedByImpact) {
      const tooClose = Array.from(usedTimestamps).some(
        (usedTime) => Math.abs(beat.timestamp - usedTime) < minTimeDiff,
      );

      if (!tooClose && selectedBeats.length < maxBeatsCount) {
        selectedBeats.push(beat);
        usedTimestamps.add(beat.timestamp);
      }
    }

    return selectedBeats.sort((a, b) => a.timestamp - b.timestamp);
  };

  const selectedKicks = selectKickBeats(adjustedBeats, params.maxBeats || 30);

  if (selectedKicks.length === 0) {
    throw new Error('No kick beats detected in audio');
  }

  // Calculate carving segments
  const totalBeats = selectedKicks.length;
  const segmentProgress = 100 / totalBeats; // Percentage per beat

  // Generate spark particles
  const sparkParticles: RenderableComponentData[] = [];
  const sparkCount = params.sparkCount || 20;

  for (let i = 0; i < sparkCount; i++) {
    const sparkId = `spark-particle-${i}`;
    const randomBeat =
      selectedKicks[Math.floor(Math.random() * selectedKicks.length)];
    const sparkStartTime = randomBeat.timestamp;
    const sparkDuration = 0.5 + Math.random() * 0.5; // 0.5-1s

    // Random position around text (50% ± 25% horizontal, 40% ± 20% vertical)
    const randomX = 25 + Math.random() * 50;
    const randomY = 20 + Math.random() * 60;

    // Random trajectory
    const randomVelX = (Math.random() - 0.5) * 200; // -100 to 100px
    const randomVelY = -50 - Math.random() * 100; // -50 to -150px (upward)

    sparkParticles.push({
      id: sparkId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="w-${params.sparkSize || 2} h-${params.sparkSize || 2} bg-orange-500 rounded-full"></div>`,
        style: {
          position: 'absolute',
          left: `${randomX}%`,
          top: `${randomY}%`,
        },
      },
      context: {
        timing: {
          start: sparkStartTime,
          duration: sparkDuration,
        },
      },
      effects: [
        {
          id: `${sparkId}-animation`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: sparkDuration,
            mode: 'provider',
            targetIds: [sparkId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: randomVelX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: randomVelY, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create SVG text with progressive stroke reveal
  const textId = 'stencil-text';
  const svgId = 'stencil-svg';

  // Build carving effects (stroke-dashoffset progression + heat glow)
  const carvingEffects: any[] = [];

  selectedKicks.forEach((beat, index) => {
    const segmentStart = beat.timestamp;
    const nextBeat = selectedKicks[index + 1];
    const segmentDuration = nextBeat
      ? nextBeat.timestamp - segmentStart
      : audioDuration - segmentStart;

    // Adjust carving speed based on beat intensity
    const carvingDuration = Math.min(
      params.carvingSpeed! * (1.2 - beat.intensity * 0.4),
      segmentDuration * 0.8,
    );

    // Calculate stroke-dashoffset progression
    const dashOffsetStart = 100 - segmentProgress * index;
    const dashOffsetEnd = 100 - segmentProgress * (index + 1);

    // Carving effect (stroke reveal)
    carvingEffects.push({
      id: `carve-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: segmentStart,
        duration: carvingDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          {
            key: 'strokeDashoffset',
            val: `${dashOffsetStart}%`,
            prog: 0,
          },
          {
            key: 'strokeDashoffset',
            val: `${dashOffsetEnd}%`,
            prog: 1,
          },
        ],
      },
    });

    // Heat glow effect
    const glowDuration = params.glowDuration || 0.3;
    carvingEffects.push({
      id: `glow-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: segmentStart,
        duration: glowDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          {
            key: 'filter',
            val: `drop-shadow(0 0 0px ${params.glowColor})`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `drop-shadow(0 0 10px ${params.glowColor})`,
            prog: 0.5,
          },
          {
            key: 'filter',
            val: `drop-shadow(0 0 5px ${params.glowCoolColor})`,
            prog: 1,
          },
        ],
      },
    });
  });

  // Build SVG text element
  const svgText = `
    <svg id="${svgId}" viewBox="0 0 1000 200" class="w-4/5" style="overflow: visible;">
      <defs>
        <style>
          #${textId} {
            stroke-dasharray: 100%;
            stroke-dashoffset: 100%;
            filter: contrast(1.1) brightness(1.2) saturate(0.8);
          }
        </style>
      </defs>
      <text
        id="${textId}"
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="${params.font || 'Impact'}, Arial Black, sans-serif"
        font-size="${params.fontSize || 120}"
        fill="none"
        stroke="${params.textColor || '#ffffff'}"
        stroke-width="${params.strokeWidth || 3}"
      >
        ${params.text}
      </text>
    </svg>
  `;

  // Assemble composition
  const childrenData: RenderableComponentData[] = [
    // Text carving layer
    {
      id: 'text-carving-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      childrenData: [
        {
          id: 'svg-text-container',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: svgText,
            className: 'flex items-center justify-center',
          },
          context: {
            timing: {
              start: 0,
              duration: audioDuration,
            },
          },
          effects: carvingEffects,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Spark particles layer
    {
      id: 'spark-particles-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      childrenData: sparkParticles,
    } as RenderableComponentData,

    // Audio track
    {
      id: 'audio-track',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: params.audio.src,
        startFrom: audioStart,
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'stencil-carving-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-stencil-carving',
  title: 'Typokinetics Stencil Carving',
  description:
    'Industrial CNC-style text carving preset synchronized to kick drum beats. Features progressive stroke reveal animation, metallic spark particles, and heat glow effects that build up text letter-by-letter through a mechanical carving process.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'stencil',
    'carving',
    'industrial',
    'cnc',
    'metal',
    'audio-reactive',
    'kick-sync',
    'particles',
    'glow',
  ],
  defaultInputParams: {
    text: 'CARVED',
    audio: {
      src: 'https://example.com/audio.mp3',
      start: 0,
      duration: 30,
    },
    font: 'Impact',
    fontSize: 120,
    textColor: '#ffffff',
    strokeWidth: 3,
    glowColor: '#ff6600',
    glowCoolColor: '#ffffff',
    glowDuration: 0.3,
    sparkCount: 20,
    sparkSize: 2,
    carvingSpeed: 0.3,
    maxBeats: 30,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const typokineticsStenilCarvingPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
