/**
 * Audio-Reactive Cross-Fade with Kinetic Typography
 *
 * This preset creates a musical/rhythmic cross-fade that syncs transitions with audio beats,
 * like a music video editor cutting on the beat. The first line pulses and fades on strong beats,
 * while the second line bounces in with the rhythm. Kinetic typography responds to audio intensity -
 * words scale, rotate, and glow based on frequency data. The cross-fade moment hits exactly on a
 * major beat drop or musical accent.
 *
 * Features:
 * - Audio analysis integration to detect beats and intensity
 * - Beat-synchronized opacity transitions using audio timestamp data
 * - Audio-reactive animations: scale effects map to bass frequencies (1.0 to 1.2),
 *   rotation to mids (-5deg to 5deg), and glow intensity to trebles
 * - Waveform effects for audio reactivity
 * - Spring easing for bouncy, musical feel
 * - VJ-style audio-reactive animations
 *
 * Technical Implementation:
 * - Uses fetcher to get audio analysis data
 * - Creates effects arrays aligned with beat timestamps
 * - Uses both generic effects for base animations and waveform effects for audio reactivity
 * - Sets sensitivity and threshold values for different frequency ranges
 * - Uses BaseLayout containers with effects targeting specific child IDs
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  audio: z
    .object({
      src: z.string().describe('Audio source URL'),
      volume: z.number().min(0).max(1).default(1).describe('Audio volume (0-1)'),
    })
    .describe('Audio track configuration'),
  firstLine: z
    .string()
    .describe('First text line that pulses and fades on strong beats'),
  secondLine: z
    .string()
    .describe('Second text line that bounces in with the rhythm'),
  fontSize: z
    .number()
    .default(64)
    .describe('Base font size for kinetic typography'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for both lines'),
  font: z
    .string()
    .optional()
    .describe('Font family (e.g., "Inter:700" or "BebasNeue")'),
  bassSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Sensitivity for bass frequency detection (scale effects)'),
  midSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.2)
    .describe('Sensitivity for mid frequency detection (rotation effects)'),
  trebleSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.0)
    .describe('Sensitivity for treble frequency detection (glow effects)'),
  bassThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Minimum bass intensity to trigger scale effects'),
  midThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Minimum mid intensity to trigger rotation effects'),
  trebleThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Minimum treble intensity to trigger glow effects'),
  waveformBackgroundOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of waveform background visualization'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher, presets } = props;

  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  // Parse font string
  const parseFontString = (fontString?: string) => {
    if (!fontString) return { family: 'Inter', weight: '700' };
    const parts = fontString.split(':');
    return {
      family: parts[0],
      weight: parts[1] || '700',
    };
  };

  const fontConfig = parseFontString(params.font);

  // Fetch audio analysis
  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audio.src,
  });

  if (!analysis || analysis.length === 0) {
    throw new Error('No audio analysis data available');
  }

  // Find major beat drop (highest intensity beat)
  const sortedByIntensity = [...analysis].sort(
    (a, b) => b.intensity - a.intensity,
  );
  const majorDropBeat = sortedByIntensity[0];
  const majorDropTimestamp = majorDropBeat.timestamp;

  // Filter beats before and after drop
  const beatsBeforeDrop = analysis.filter(
    (beat) => beat.timestamp < majorDropTimestamp,
  );
  const beatsAfterDrop = analysis.filter(
    (beat) => beat.timestamp >= majorDropTimestamp,
  );

  // First line container with pulse effects on beats before drop
  const firstLineId = 'first-line-container';
  const firstLineTextId = 'first-line-text';

  // Create pulse effect keyframes for first line based on bass beats
  const createPulseRanges = (beats: any[]) => {
    const ranges: any[] = [{ key: 'scale', val: 1, prog: 0 }];

    beats.forEach((beat) => {
      const prog = beat.timestamp / majorDropTimestamp;
      const intensity = beat.intensity;

      // Add scale keyframes for each beat
      ranges.push({
        key: 'scale',
        val: 1 + intensity * 0.15, // Scale 1.0 to 1.15
        prog: prog,
      });

      // Add return to normal scale
      ranges.push({
        key: 'scale',
        val: 1,
        prog: Math.min(prog + 0.02, 1), // Quick return
      });
    });

    return ranges;
  };

  const firstLinePulseEffect = {
    id: 'first-line-pulse-effect',
    componentId: 'waveform',
    data: {
      audioSrc: params.audio.src,
      audioProperty: 'bass',
      effectType: 'scale',
      baseScale: 1,
      intensity: 0.15,
      sensitivity: params.bassSensitivity,
      threshold: params.bassThreshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      mode: 'provider',
      targetIds: [firstLineId],
      start: 0,
      duration: majorDropTimestamp,
      smoothNormalisation: 1,
    },
  };

  // Fade out effect for first line
  const firstLineFadeOutEffect = {
    id: 'first-line-fade-out',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: majorDropTimestamp - 0.5,
      duration: 0.5,
      mode: 'provider',
      targetIds: [firstLineId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Second line container with bounce and audio-reactive effects
  const secondLineId = 'second-line-container';
  const secondLineTextId = 'second-line-text';
  const secondLineDuration = durationInSeconds - majorDropTimestamp;

  // Bounce-in effect for second line
  const secondLineBounceEffect = {
    id: 'second-line-bounce',
    componentId: 'generic',
    data: {
      type: 'spring',
      start: 0,
      duration: 0.5,
      mode: 'provider',
      targetIds: [secondLineId],
      ranges: [
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1.2, prog: 0.3 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Audio-reactive scale effect (bass)
  const secondLineScaleEffect = {
    id: 'second-line-scale',
    componentId: 'waveform',
    data: {
      audioSrc: params.audio.src,
      audioProperty: 'bass',
      effectType: 'scale',
      baseScale: 1,
      intensity: 0.2,
      sensitivity: params.bassSensitivity,
      threshold: params.bassThreshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      mode: 'provider',
      targetIds: [secondLineId],
      start: 0.5, // After bounce-in
      duration: secondLineDuration - 0.5,
      smoothNormalisation: 1,
    },
  };

  // Audio-reactive rotation effect (mids)
  const secondLineRotateEffect = {
    id: 'second-line-rotate',
    componentId: 'waveform',
    data: {
      audioSrc: params.audio.src,
      audioProperty: 'mid',
      effectType: 'rotate',
      rotationRange: 5,
      sensitivity: params.midSensitivity,
      threshold: params.midThreshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      mode: 'provider',
      targetIds: [secondLineId],
      start: 0.5,
      duration: secondLineDuration - 0.5,
      smoothNormalisation: 1,
    },
  };

  // Create glow effect ranges based on treble
  const createGlowRanges = (beats: any[]) => {
    const ranges: any[] = [
      {
        key: 'filter',
        val: 'drop-shadow(0 0 0px rgba(255,255,255,0))',
        prog: 0,
      },
    ];

    // Sample beats for glow keyframes
    const sampledBeats = beats.filter((_, idx) => idx % 3 === 0); // Every 3rd beat

    sampledBeats.forEach((beat) => {
      const prog = (beat.timestamp - majorDropTimestamp) / secondLineDuration;
      if (prog < 0 || prog > 1) return;

      const intensity = beat.spectralCentroid || 0.5; // Use spectral centroid for treble
      const glowSize = Math.round(intensity * 30); // 0-30px glow
      const glowOpacity = intensity * 0.8;

      ranges.push({
        key: 'filter',
        val: `drop-shadow(0 0 ${glowSize}px rgba(255,255,255,${glowOpacity}))`,
        prog: prog,
      });

      ranges.push({
        key: 'filter',
        val: 'drop-shadow(0 0 0px rgba(255,255,255,0))',
        prog: Math.min(prog + 0.05, 1),
      });
    });

    return ranges;
  };

  const secondLineGlowEffect = {
    id: 'second-line-glow',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0.5,
      duration: secondLineDuration - 0.5,
      mode: 'provider',
      targetIds: [secondLineId],
      ranges: createGlowRanges(beatsAfterDrop),
    },
  };

  // Build composition structure
  const childrenData: RenderableComponentData[] = [
    // Audio track
    {
      id: 'audio-track',
      componentId: 'AudioAtom',
      type: 'atom',
      data: {
        src: params.audio.src,
        volume: params.audio.volume,
      },
      context: {
        timing: {
          start: 0,
        },
      },
    } as RenderableComponentData,

    // Waveform background
    {
      id: 'waveform-background',
      componentId: 'BaseLayout',
      type: 'layout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            opacity: params.waveformBackgroundOpacity,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'audio-track',
        },
      },
      childrenData: presets?.Audio
        ? (
            await presets.Audio(
              {
                audio: {
                  src: params.audio.src,
                  volume: 0,
                  start: 0,
                },
                waveformType: 'animated',
                barColor: '#ffffff',
                opacity: 1,
                position: 'bottom',
              },
              props,
            )
          ).output.childrenData || []
        : [],
    } as RenderableComponentData,

    // First line container
    {
      id: firstLineId,
      componentId: 'BaseLayout',
      type: 'layout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: majorDropTimestamp,
        },
      },
      effects: [firstLinePulseEffect, firstLineFadeOutEffect],
      childrenData: [
        {
          id: firstLineTextId,
          componentId: 'TextAtom',
          type: 'atom',
          data: {
            text: params.firstLine,
            style: {
              fontSize: params.fontSize,
              fontWeight: fontConfig.weight,
              color: params.textColor,
              textAlign: 'center',
            },
            font: {
              family: fontConfig.family,
              weights: [fontConfig.weight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: majorDropTimestamp,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Second line container
    {
      id: secondLineId,
      componentId: 'BaseLayout',
      type: 'layout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: majorDropTimestamp,
          duration: secondLineDuration,
        },
      },
      effects: [
        secondLineBounceEffect,
        secondLineScaleEffect,
        secondLineRotateEffect,
        secondLineGlowEffect,
      ],
      childrenData: [
        {
          id: secondLineTextId,
          componentId: 'TextAtom',
          type: 'atom',
          data: {
            text: params.secondLine,
            style: {
              fontSize: params.fontSize * 1.125, // Slightly larger
              fontWeight: fontConfig.weight,
              color: params.textColor,
              textAlign: 'center',
            },
            font: {
              family: fontConfig.family,
              weights: [fontConfig.weight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: secondLineDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'audio-reactive-crossfade-root',
    componentId: 'BaseLayout',
    type: 'layout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
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

const presetMetadata: PresetMetadata = {
  id: 'audioReactiveCrossFade',
  title: 'Audio-Reactive Cross-Fade with Kinetic Typography',
  description:
    'Musical/rhythmic cross-fade preset that syncs transitions with audio beats, like a music video editor cutting on the beat. Features beat-synced pulsing, bouncing kinetic typography, and audio-reactive effects (scale, rotation, glow) responding to frequency data. The cross-fade moment hits exactly on a major beat drop or musical accent, creating VJ-style audio-reactive animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'kinetic-typography',
    'cross-fade',
    'music-video',
    'beat-sync',
    'audio-reactive',
    'vj',
    'waveform',
  ],
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
    },
    firstLine: 'DROP THE BEAT',
    secondLine: 'FEEL THE RHYTHM',
    fontSize: 64,
    textColor: '#FFFFFF',
    font: 'BebasNeue',
    bassSensitivity: 1.5,
    midSensitivity: 1.2,
    trebleSensitivity: 1.0,
    bassThreshold: 0.2,
    midThreshold: 0.15,
    trebleThreshold: 0.1,
    waveformBackgroundOpacity: 0.3,
  },
  dependencies: {
    presets: ['Audio'],
    helpers: [],
  },
};

export const audioReactiveCrossFadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
