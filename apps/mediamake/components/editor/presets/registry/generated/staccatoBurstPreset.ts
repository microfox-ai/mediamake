/**
 * Staccato Burst Text Preset
 *
 * This preset creates hyper-compressed text that explodes outward in rhythmic bursts
 * synchronized with music beats or at fixed intervals. Each burst feels like a drum hit -
 * instant expansion to wide spacing then quick contraction to normal.
 *
 * Features:
 * - **Hyper-compressed text**: -0.5em letter spacing (almost illegible at rest)
 * - **Beat-synchronized bursts**: Uses audio analysis or fixed intervals
 * - **Drum-hit effect**: Instant expansion to 0.2em, quick contraction to 0em
 * - **Screen shake**: Random ±5px translateX/Y on each burst
 * - **White flash overlay**: Brief 0-0.8-0 opacity flash
 * - **Optional blur**: 0-2px-0 synchronized with burst
 * - **Variable intensity**: Based on audio amplitude if available
 * - **GPU acceleration**: Uses transform3d for performance
 *
 * Use cases:
 * - Music videos with beat-synced text
 * - High-energy promotional content
 * - Impactful title sequences
 * - Beat-reactive typography
 * - Dynamic lyric displays
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
  WaveformEffectData,
} from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display with staccato burst effect'),
  
  // Audio configuration
  audio: z
    .object({
      src: z.string().describe('Audio source URL for beat synchronization'),
      enabled: z
        .boolean()
        .default(true)
        .describe('Enable audio-reactive bursts (if false, uses fixed intervals)'),
    })
    .optional()
    .describe('Audio configuration for beat-synchronized bursts'),

  // Burst timing (when audio disabled)
  burstInterval: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Fixed burst interval in seconds (when audio disabled)'),
  
  burstCount: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Number of bursts (when audio disabled)'),

  // Burst parameters
  burstIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Burst intensity multiplier (affects expansion, shake, flash)'),
  
  enableShake: z
    .boolean()
    .default(true)
    .describe('Enable screen shake on each burst'),
  
  enableFlash: z
    .boolean()
    .default(true)
    .describe('Enable white flash overlay on each burst'),
  
  enableBlur: z
    .boolean()
    .default(true)
    .describe('Enable blur effect on each burst'),

  // Audio-reactive parameters
  beatSensitivity: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Sensitivity for audio beat detection (higher = more sensitive)'),
  
  beatThreshold: z
    .number()
    .min(0.1)
    .max(0.9)
    .default(0.6)
    .describe('Threshold for audio beat detection (lower = more beats)'),

  // Text styling
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),
  
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (e.g., "400", "700", "900")'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or CSS color)'),
  
  textTransform: z
    .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
    .default('uppercase')
    .describe('Text transformation style'),
  
  font: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto:700")'),

  // Background
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex or CSS color)'),

  // Timing
  duration: z
    .number()
    .optional()
    .describe('Total duration in seconds (auto-calculated if audio provided)'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher, config } = props;
  const fps = config?.fps || 30;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font);

  // Determine if using audio-reactive bursts
  const useAudio = params.audio?.enabled && params.audio?.src;

  let burstTimestamps: Array<{ timestamp: number; intensity: number }> = [];
  let totalDuration = params.duration || 10;

  if (useAudio && fetcher) {
    // Fetch audio analysis
    try {
      const { analysis, durationInSeconds } = await fetcher(
        '/api/analyze-audio',
        {
          audioSrc: params.audio!.src,
        },
      );

      if (analysis && analysis.length > 0) {
        totalDuration = durationInSeconds;

        // Filter beats based on intensity
        const minIntensity = params.beatThreshold;
        const significantBeats = analysis.filter(
          (beat: any) => beat.intensity >= minIntensity,
        );

        // Sort by intensity and select top beats
        const maxBeats = 30;
        const sortedBeats = [...significantBeats].sort(
          (a, b) => b.intensity - a.intensity,
        );

        // Take top beats and re-sort by timestamp
        burstTimestamps = sortedBeats
          .slice(0, maxBeats)
          .map((beat: any) => ({
            timestamp: beat.timestamp,
            intensity: beat.intensity,
          }))
          .sort((a, b) => a.timestamp - b.timestamp);
      }
    } catch (error) {
      console.warn('Audio analysis failed, falling back to fixed intervals', error);
      // Fall back to fixed intervals
      useAudio && (params.audio!.enabled = false);
    }
  }

  // If not using audio or no beats detected, use fixed intervals
  if (!useAudio || burstTimestamps.length === 0) {
    const interval = params.burstInterval;
    const count = params.burstCount;
    totalDuration = params.duration || count * interval;

    burstTimestamps = Array.from({ length: count }, (_, i) => ({
      timestamp: i * interval,
      intensity: 1, // Fixed intensity
    })).filter(burst => burst.timestamp < totalDuration);
  }

  // Create burst effects for each timestamp
  const createBurstEffects = (
    burstTime: number,
    intensity: number,
  ) => {
    const effects: any[] = [];
    const baseIntensity = params.burstIntensity * intensity;

    // Letter-spacing burst: -0.5em -> 0.2em (50ms, linear)
    effects.push({
      id: `letterSpacing-burst-${burstTime}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: burstTime,
        duration: 0.05,
        mode: 'provider',
        targetIds: ['staccato-text'],
        ranges: [
          { key: 'letterSpacing', val: '-0.5em', prog: 0 },
          { key: 'letterSpacing', val: `${0.2 * baseIntensity}em`, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Letter-spacing recovery: 0.2em -> 0em (150ms, ease-out)
    effects.push({
      id: `letterSpacing-recovery-${burstTime}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: burstTime + 0.05,
        duration: 0.15,
        mode: 'provider',
        targetIds: ['staccato-text'],
        ranges: [
          { key: 'letterSpacing', val: `${0.2 * baseIntensity}em`, prog: 0 },
          { key: 'letterSpacing', val: '0em', prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Flash effect (if enabled)
    if (params.enableFlash) {
      effects.push({
        id: `flash-${burstTime}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: burstTime,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8 * baseIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      });
    }

    // Shake effect (if enabled)
    if (params.enableShake) {
      const shakeAmount = 5 * baseIntensity;
      effects.push({
        id: `shake-${burstTime}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: burstTime,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['shake-container'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: shakeAmount, prog: 0.25 },
            { key: 'translateX', val: -shakeAmount, prog: 0.5 },
            { key: 'translateX', val: shakeAmount * 0.6, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -shakeAmount * 0.6, prog: 0.25 },
            { key: 'translateY', val: shakeAmount * 0.6, prog: 0.5 },
            { key: 'translateY', val: -shakeAmount * 0.4, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      });
    }

    // Blur effect (if enabled)
    if (params.enableBlur) {
      effects.push({
        id: `blur-${burstTime}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: burstTime,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['staccato-text'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${2 * baseIntensity}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        } as GenericEffectData,
      });
    }

    return effects;
  };

  // Generate all burst effects
  const allBurstEffects = burstTimestamps.flatMap(burst =>
    createBurstEffects(burst.timestamp, burst.intensity),
  );

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    {
      id: 'staccato-root',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            overflow: 'hidden',
            backgroundColor: params.backgroundColor,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [
        {
          id: 'shake-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative',
              style: {
                willChange: 'transform',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          childrenData: [
            {
              id: 'staccato-text',
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: params.text,
                style: {
                  fontSize: `${params.fontSize}px`,
                  fontWeight: params.fontWeight,
                  color: params.textColor,
                  textTransform: params.textTransform,
                  letterSpacing: '-0.5em',
                  willChange: 'letter-spacing, filter',
                  textShadow: '0 0 20px rgba(255,255,255,0.5)',
                  ...fontStyle,
                },
                font: {
                  family: fontFamily,
                  weights: [params.fontWeight],
                  display: 'swap',
                  preload: true,
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: totalDuration,
                },
              },
            } as RenderableComponentData,
          ],
          effects: allBurstEffects.filter(
            e => e.data.targetIds[0] === 'shake-container',
          ),
        } as RenderableComponentData,
        {
          id: 'flash-overlay',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                backgroundColor: 'white',
                opacity: 0,
                willChange: 'opacity',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          effects: allBurstEffects.filter(
            e => e.data.targetIds[0] === 'flash-overlay',
          ),
        } as RenderableComponentData,
      ],
      effects: allBurstEffects.filter(
        e => e.data.targetIds[0] === 'staccato-text',
      ),
    } as RenderableComponentData,
  ];

  // Add audio atom if provided
  if (useAudio && params.audio?.src) {
    childrenData[0].childrenData!.push({
      id: 'staccato-audio',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: params.audio.src,
        volume: 1,
      },
      context: {
        timing: {
          start: 0,
        },
      },
    } as RenderableComponentData);
  }

  return {
    output: {
      childrenData: childrenData as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'staccatoBurstPreset',
  title: 'Staccato Burst Text Preset',
  description:
    'Hyper-compressed text (-0.5em letter-spacing) that explodes outward in rhythmic bursts synchronized with music beats or at fixed intervals. Each burst features instant expansion to wide spacing (0.2em), quick contraction to normal (0em), accompanied by screen shake, white flash overlay, and optional blur for maximum impact. Perfect for music videos and high-energy content with variable burst intensity based on audio amplitude.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'music',
    'beat-sync',
    'burst',
    'staccato',
    'high-energy',
    'impact',
    'audio-reactive',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'BURST',
    audio: {
      src: '',
      enabled: false,
    },
    burstInterval: 0.6,
    burstCount: 20,
    burstIntensity: 1,
    enableShake: true,
    enableFlash: true,
    enableBlur: true,
    beatSensitivity: 0.8,
    beatThreshold: 0.6,
    fontSize: 72,
    fontWeight: '900',
    textColor: '#ffffff',
    textTransform: 'uppercase',
    font: 'Inter',
    backgroundColor: '#000000',
  },
};

// Export preset
export const staccatoBurstPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
