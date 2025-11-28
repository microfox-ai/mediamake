/**
 * Cinematic Rack Focus Typography Preset
 *
 * This preset creates a cinematic depth-of-field blur-to-focus effect synchronized with audio beats.
 * Think of it like a rack focus in cinematography - text starts completely out of focus (heavy blur)
 * and snaps into sharp clarity precisely on the beat. Each word or phrase has its own focus pull timing,
 * creating a rhythmic reveal sequence.
 *
 * Features:
 * - Multi-layered blur effect using multiple blur layers with different intensities
 * - Optical realism with chromatic aberration (RGB offsets) during blur phase
 * - Subtle scale animation (98% to 100%) during focus pull for depth perception
 * - Vignette effect that fades as text comes into focus, mimicking camera lens characteristics
 * - Audio beat synchronization using beat analysis API
 * - Professional focus-pull feel with cubic-bezier easing
 * - GPU-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Creating cinematic title sequences with beat-synced reveals
 * - Building dynamic text reveals that sync with music
 * - Professional video intros with optical effects
 * - Music video typography with lens-like characteristics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
} from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  audio: z
    .object({
      src: z.string().describe('Audio source URL for beat analysis'),
      start: z
        .number()
        .optional()
        .describe('Audio start time in seconds (default: 0)'),
      duration: z
        .number()
        .optional()
        .describe('Audio duration in seconds (uses full duration if not set)'),
    })
    .describe('Audio configuration for beat detection'),

  text: z
    .string()
    .describe('Text content to display (can be split into words/phrases)'),

  splitMode: z
    .enum(['words', 'phrases', 'full'])
    .default('words')
    .optional()
    .describe(
      'How to split text: "words" (per word), "phrases" (per sentence/comma), "full" (entire text)',
    ),

  font: z
    .string()
    .default('Inter')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .optional()
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (hex or rgba)'),

  backgroundColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Background color (hex or rgba)'),

  focusPullDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .optional()
    .describe('Duration of focus pull animation in seconds'),

  maxBlurIntensity: z
    .number()
    .min(5)
    .max(40)
    .default(20)
    .optional()
    .describe('Maximum blur intensity in pixels (at full blur state)'),

  chromaticAberrationStrength: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe('Chromatic aberration RGB offset strength in pixels'),

  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Vignette darkness intensity (0 = no vignette, 1 = full black)'),

  minTimeBetweenBeats: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.5)
    .optional()
    .describe('Minimum time between beat triggers in seconds'),

  maxBeats: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .optional()
    .describe('Maximum number of beats to use for reveals'),

  layout: z
    .enum(['center', 'stacked', 'horizontal'])
    .default('center')
    .optional()
    .describe(
      'Layout mode: "center" (centered overlap), "stacked" (vertical), "horizontal" (horizontal row)',
    ),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Parse font configuration
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    let fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter');

  // Split text into segments based on splitMode
  const splitText = (text: string, mode: string): string[] => {
    if (mode === 'full') return [text];
    if (mode === 'phrases') {
      return text
        .split(/[,.!?;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    // Default: words
    return text.split(/\s+/).filter(s => s.length > 0);
  };

  const textSegments = splitText(params.text, params.splitMode || 'words');

  // Fetch audio analysis for beat detection
  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audio.src,
  });

  if (!analysis || analysis.length === 0) {
    throw new Error('No beat analysis data returned from audio');
  }

  // Filter beats within audio range
  const audioStart = params.audio.start || 0;
  const audioDuration = params.audio.duration || durationInSeconds;
  const audioEnd = audioStart + audioDuration;

  const filteredBeats = analysis
    .filter(
      (beat: any) => beat.timestamp >= audioStart && beat.timestamp <= audioEnd,
    )
    .map((beat: any) => ({
      ...beat,
      timestamp: beat.timestamp - audioStart, // Relative to audio start
    }));

  // Select impactful beats using scoring algorithm
  const selectImpactfulBeats = (
    beats: any[],
    maxCount: number,
    minTimeDiff: number,
  ) => {
    const scoredBeats = beats.map((beat, index) => {
      const windowSize = 10;
      const start = Math.max(0, index - windowSize);
      const end = Math.min(beats.length, index + windowSize + 1);
      const neighbors = beats.slice(start, end);
      const avgNeighborIntensity =
        neighbors.reduce((sum: number, b: any) => sum + b.intensity, 0) /
        neighbors.length;

      const localPeakStrength = beat.intensity - avgNeighborIntensity;
      const isLocalPeak = localPeakStrength > 0.05;

      const intensityScore = beat.intensity * 0.4;
      const peakScore = isLocalPeak ? localPeakStrength * 0.3 : 0;
      const frequencyScore = Math.min(beat.frequency / 3000, 1) * 0.2;
      const spectralScore = (beat.spectralCentroid || 0) * 0.1;

      const totalScore =
        intensityScore + peakScore + frequencyScore + spectralScore;

      return { ...beat, totalScore };
    });

    const sortedByImpact = scoredBeats.sort(
      (a, b) => b.totalScore - a.totalScore,
    );

    const selectedBeats: any[] = [];
    const usedTimestamps = new Set<number>();

    for (const beat of sortedByImpact) {
      const tooClose = Array.from(usedTimestamps).some(
        usedTime => Math.abs(beat.timestamp - usedTime) < minTimeDiff,
      );

      if (!tooClose && selectedBeats.length < maxCount) {
        selectedBeats.push(beat);
        usedTimestamps.add(beat.timestamp);
      }
    }

    return selectedBeats.sort((a, b) => a.timestamp - b.timestamp);
  };

  const selectedBeats = selectImpactfulBeats(
    filteredBeats,
    params.maxBeats || 20,
    params.minTimeBetweenBeats || 0.5,
  );

  // Map segments to beats (cycle through beats if more segments than beats)
  const segmentBeats = textSegments.map((segment, index) => {
    const beatIndex = index % selectedBeats.length;
    return {
      segment,
      beat: selectedBeats[beatIndex],
      index,
    };
  });

  // Create text segment components with rack focus effects
  const createSegmentComponent = (
    segment: string,
    beatTimestamp: number,
    segmentIndex: number,
  ): RenderableComponentData => {
    const segmentId = `rack-focus-segment-${segmentIndex}`;
    const mainTextId = `main-text-${segmentIndex}`;
    const blurHeavyId = `blur-heavy-${segmentIndex}`;
    const blurMediumId = `blur-medium-${segmentIndex}`;

    const focusDuration = params.focusPullDuration || 0.3;
    const maxBlur = params.maxBlurIntensity || 20;
    const chromaticStrength = params.chromaticAberrationStrength || 3;

    // Effects for main text: blur, scale, chromatic aberration fade
    const mainTextEffect: GenericEffectData = {
      type: 'cubic-bezier(0.22, 1, 0.36, 1)' as any,
      start: beatTimestamp,
      duration: focusDuration,
      mode: 'provider',
      targetIds: [mainTextId],
      ranges: [
        // Blur: 20px → 0px
        { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
        // Scale: 0.98 → 1
        { key: 'scale', val: 0.98, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        // Opacity: 0.7 → 1 (subtle)
        { key: 'opacity', val: 0.7, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // Effects for heavy blur layer: fade out
    const blurHeavyEffect: GenericEffectData = {
      type: 'cubic-bezier(0.22, 1, 0.36, 1)' as any,
      start: beatTimestamp,
      duration: focusDuration,
      mode: 'provider',
      targetIds: [blurHeavyId],
      ranges: [
        { key: 'opacity', val: 0.5, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    // Effects for medium blur layer: fade out
    const blurMediumEffect: GenericEffectData = {
      type: 'cubic-bezier(0.22, 1, 0.36, 1)' as any,
      start: beatTimestamp,
      duration: focusDuration,
      mode: 'provider',
      targetIds: [blurMediumId],
      ranges: [
        { key: 'opacity', val: 0.7, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    // Text shadow for chromatic aberration (fades during focus pull)
    const chromaticShadowStart = `-${chromaticStrength}px 0 #ff0040, ${chromaticStrength}px 0 #00d4ff`;
    const chromaticShadowEnd = '0px 0 transparent';

    return {
      id: segmentId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            willChange: 'filter, transform',
          },
        },
      },
      context: {
        timing: {
          start: beatTimestamp,
          duration: audioDuration - beatTimestamp,
        },
      },
      effects: [
        {
          id: `main-text-effect-${segmentIndex}`,
          componentId: 'generic',
          data: mainTextEffect,
        },
        {
          id: `blur-heavy-effect-${segmentIndex}`,
          componentId: 'generic',
          data: blurHeavyEffect,
        },
        {
          id: `blur-medium-effect-${segmentIndex}`,
          componentId: 'generic',
          data: blurMediumEffect,
        },
      ],
      childrenData: [
        // Blur layer heavy (deepest blur)
        {
          id: blurHeavyId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 flex items-center justify-center',
              style: {
                filter: `blur(${maxBlur}px)`,
                opacity: 0.5,
                pointerEvents: 'none',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: audioDuration - beatTimestamp,
            },
          },
          childrenData: [
            {
              id: `blur-text-heavy-${segmentIndex}`,
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: segment,
                style: {
                  fontSize: params.fontSize || 72,
                  fontWeight: fontStyle.fontWeight || 700,
                  color: params.textColor || '#ffffff',
                  textShadow: chromaticShadowStart,
                },
                font: {
                  family: fontFamily,
                  weights: [String(fontStyle.fontWeight || 700)],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: audioDuration - beatTimestamp,
                },
              },
            },
          ],
        },
        // Blur layer medium
        {
          id: blurMediumId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 flex items-center justify-center',
              style: {
                filter: 'blur(8px)',
                opacity: 0.7,
                pointerEvents: 'none',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: audioDuration - beatTimestamp,
            },
          },
          childrenData: [
            {
              id: `blur-text-medium-${segmentIndex}`,
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: segment,
                style: {
                  fontSize: params.fontSize || 72,
                  fontWeight: fontStyle.fontWeight || 700,
                  color: params.textColor || '#ffffff',
                  textShadow: `-${chromaticStrength * 0.6}px 0 #ff0040, ${chromaticStrength * 0.6}px 0 #00d4ff`,
                },
                font: {
                  family: fontFamily,
                  weights: [String(fontStyle.fontWeight || 700)],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: audioDuration - beatTimestamp,
                },
              },
            },
          ],
        },
        // Main text atom
        {
          id: mainTextId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: segment,
            style: {
              fontSize: params.fontSize || 72,
              fontWeight: fontStyle.fontWeight || 700,
              color: params.textColor || '#ffffff',
              transform: 'scale3d(0.98, 0.98, 1)',
              willChange: 'filter, transform',
            },
            font: {
              family: fontFamily,
              weights: [String(fontStyle.fontWeight || 700)],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: audioDuration - beatTimestamp,
            },
          },
        },
      ],
    } as RenderableComponentData;
  };

  const segmentComponents = segmentBeats.map(({ segment, beat, index }) =>
    createSegmentComponent(segment, beat.timestamp, index),
  );

  // Vignette overlay with fade-out effect
  const vignetteId = 'vignette-overlay';
  const vignetteIntensity = params.vignetteIntensity || 0.6;

  // Vignette fades out over the duration of the composition
  const vignetteEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: audioDuration,
    mode: 'provider',
    targetIds: [vignetteId],
    ranges: [
      { key: 'opacity', val: vignetteIntensity, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  const vignetteOverlay: RenderableComponentData = {
    id: vignetteId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-20',
        style: {
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    effects: [
      {
        id: 'vignette-fade-effect',
        componentId: 'generic',
        data: vignetteEffect,
      },
    ],
    childrenData: [],
  };

  // Layout configuration based on layout mode
  const layoutClassName =
    params.layout === 'stacked'
      ? 'relative z-10 flex flex-col items-center justify-center gap-4'
      : params.layout === 'horizontal'
        ? 'relative z-10 flex flex-row items-center justify-center gap-4 flex-wrap'
        : 'relative z-10 flex items-center justify-center';

  // Text sequence container
  const textSequenceContainer: RenderableComponentData = {
    id: 'text-sequence-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: layoutClassName,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: segmentComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'rack-focus-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: params.backgroundColor || '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [vignetteOverlay, textSequenceContainer],
  };

  // Audio track
  const audioTrack: RenderableComponentData = {
    id: 'rack-focus-audio',
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: params.audio.src,
      startFrom: params.audio.start || 0,
      volume: 1,
    },
    context: {
      timing: {},
    },
  };

  return {
    output: {
      childrenData: [rootContainer, audioTrack] as RenderableComponentData[],
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
  id: 'cinematicRackFocusTypography',
  title: 'Cinematic Rack Focus Typography',
  description:
    'A typokinetics preset that creates cinematic depth-of-field blur-to-focus effects synchronized with audio beats. Each word or phrase starts completely out of focus with heavy blur and chromatic aberration, then snaps into sharp clarity precisely on the beat, mimicking a camera rack focus. Features multi-layered blur for optical realism, RGB chromatic aberration during blur phase, subtle scale animation (98% to 100%) for depth perception, and a fading vignette that clears as text comes into focus. Uses audio beat analysis API for precise timing synchronization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'audio-sync',
    'cinematic',
    'rack-focus',
    'blur',
    'chromatic-aberration',
    'vignette',
    'depth-of-field',
    'beat-sync',
  ],
  dependencies: {},
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      start: 0,
    },
    text: 'CINEMATIC TYPOGRAPHY',
    splitMode: 'words',
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    focusPullDuration: 0.3,
    maxBlurIntensity: 20,
    chromaticAberrationStrength: 3,
    vignetteIntensity: 0.6,
    minTimeBetweenBeats: 0.5,
    maxBeats: 20,
    layout: 'center',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const cinematicRackFocusTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
