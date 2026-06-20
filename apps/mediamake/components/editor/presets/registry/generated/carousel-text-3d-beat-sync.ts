/**
 * 3D Carousel Text Beat Sync Preset
 *
 * This preset creates a 3D cylindrical carousel where text elements rotate around
 * a central axis in sync with music beats. Each beat advances the carousel by one
 * position, bringing new text to the front while previous text rotates to the back.
 *
 * Features:
 * - **Beat-Synchronized Rotation**: Carousel rotates on each detected beat
 * - **3D Perspective**: Text positioned in 3D space with translateZ and rotateY
 * - **Dynamic Scaling & Opacity**: Front text is larger and fully visible, sides fade
 * - **Momentum Physics**: Faster beat sequences create faster spins with inertia
 * - **Subtle Tilt Effect**: Dynamic rotateX tilt based on rotation direction
 * - **Smooth Transitions**: Cubic-bezier easing for natural rotation feel
 *
 * Use cases:
 * - Music video lyrics synchronized to beats
 * - Dynamic text reveals for rhythmic content
 * - Beat-driven slot machine or drum roll effects
 * - Audio-visual text synchronization for social media
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
      src: z.string().describe('Audio source URL for beat detection'),
      volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume (0-2)'),
      start: z.number().min(0).default(0).optional().describe('Audio start time in seconds'),
      duration: z.number().min(0).optional().describe('Audio duration in seconds'),
    })
    .describe('Audio configuration for beat detection'),
  words: z
    .array(z.string())
    .min(3)
    .describe('Array of text words to display in carousel (minimum 3 words)'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .optional()
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe('Font family with weight (e.g., "Inter:700", "Roboto:600")'),
  cylinderRadius: z
    .number()
    .min(100)
    .max(500)
    .default(200)
    .optional()
    .describe('Radius of the 3D cylinder in pixels'),
  rotationDuration: z
    .number()
    .min(200)
    .max(1000)
    .default(500)
    .optional()
    .describe('Base rotation duration in milliseconds'),
  minRotationDuration: z
    .number()
    .min(100)
    .max(500)
    .default(200)
    .optional()
    .describe('Minimum rotation duration for fast beats (milliseconds)'),
  frontScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .optional()
    .describe('Scale multiplier for front-facing text'),
  sideScale: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.9)
    .optional()
    .describe('Scale multiplier for side text'),
  frontOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .optional()
    .describe('Opacity for front-facing text (0-1)'),
  sideOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Opacity for side text (0-1)'),
  backOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Opacity for back-facing text (0-1)'),
  tiltAmount: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .optional()
    .describe('Maximum rotateX tilt in degrees'),
  maxBeats: z
    .number()
    .min(5)
    .max(100)
    .default(30)
    .optional()
    .describe('Maximum number of beats to use for rotation'),
  minTimeBetweenBeats: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Minimum time between beats in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    let fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter:700');

  // Fetch audio analysis
  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audio.src,
  });

  if (!analysis || analysis.length === 0) {
    throw new Error('No audio analysis data available');
  }

  const audioStart = params.audio.start || 0;
  const audioDuration = params.audio.duration || durationInSeconds - audioStart;

  // Filter and adjust beats
  const clippedAnalysis = analysis
    .filter(
      (beat: any) =>
        beat.timestamp >= audioStart &&
        beat.timestamp <= audioStart + audioDuration,
    )
    .map((beat: any) => ({
      ...beat,
      timestamp: beat.timestamp - audioStart,
    }));

  // Select impactful beats
  const selectImpactfulBeats = (beats: any[], maxCount: number, minTimeDiff: number) => {
    const beatsWithLocalPeaks = beats.map((beat, index) => {
      const windowSize = 10;
      const start = Math.max(0, index - windowSize);
      const end = Math.min(beats.length, index + windowSize + 1);
      const neighbors = beats.slice(start, end);
      const avgNeighborIntensity =
        neighbors.reduce((sum: number, b: any) => sum + b.intensity, 0) /
        neighbors.length;

      const localPeakStrength = beat.intensity - avgNeighborIntensity;
      const isLocalPeak = localPeakStrength > 0.05;

      return {
        ...beat,
        localPeakStrength,
        isLocalPeak,
      };
    });

    const scoredBeats = beatsWithLocalPeaks.map((beat) => {
      const intensityScore = beat.intensity * 0.3;
      const peakScore = beat.isLocalPeak ? beat.localPeakStrength * 0.4 : 0;
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
        (usedTime) => Math.abs(beat.timestamp - usedTime) < minTimeDiff,
      );

      if (!tooClose && selectedBeats.length < maxCount) {
        selectedBeats.push(beat);
        usedTimestamps.add(beat.timestamp);
      }
    }

    return selectedBeats.sort((a, b) => a.timestamp - b.timestamp);
  };

  const selectedBeats = selectImpactfulBeats(
    clippedAnalysis,
    params.maxBeats || 30,
    params.minTimeBetweenBeats || 0.5,
  );

  const wordCount = params.words.length;
  const angleStep = 360 / wordCount;
  const cylinderRadius = params.cylinderRadius || 200;

  // Create text atoms positioned in 3D cylinder
  const textAtoms: RenderableComponentData[] = params.words.map(
    (word, index) => {
      const rotateYAngle = angleStep * index;

      return {
        id: `text-word-${index}`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word,
          className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap',
          style: {
            fontSize: params.fontSize || 72,
            fontWeight: fontStyle.fontWeight || 700,
            color: params.textColor || '#FFFFFF',
            textAlign: 'center',
            transform: `rotateY(${rotateYAngle}deg) translateZ(${cylinderRadius}px)`,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        effects: [],
      } as RenderableComponentData;
    },
  );

  // Create rotation effects based on beats
  const rotationEffects: any[] = [];
  let currentRotation = 0;

  selectedBeats.forEach((beat, beatIndex) => {
    const nextBeat = selectedBeats[beatIndex + 1];
    const timeDiff = nextBeat
      ? nextBeat.timestamp - beat.timestamp
      : audioDuration - beat.timestamp;

    // Calculate rotation duration with momentum physics
    const baseRotationDuration = params.rotationDuration || 500;
    const minRotationDuration = params.minRotationDuration || 200;
    
    // Faster beats = shorter duration (momentum effect)
    const momentumFactor = Math.max(0.5, Math.min(1.5, timeDiff / 0.8));
    const effectiveDuration = Math.max(
      minRotationDuration,
      baseRotationDuration * momentumFactor,
    );

    // Advance carousel by one position
    currentRotation -= angleStep;

    // Calculate tilt based on rotation speed
    const tiltAmount = params.tiltAmount || 5;
    const speedFactor = baseRotationDuration / effectiveDuration;
    const tiltAngle = tiltAmount * Math.min(1, speedFactor);
    const tiltDirection = beatIndex % 2 === 0 ? 1 : -1;

    rotationEffects.push({
      id: `rotation-effect-${beatIndex}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: beat.timestamp,
        duration: effectiveDuration / 1000,
        mode: 'provider',
        targetIds: ['carousel-container'],
        ranges: [
          {
            key: 'rotateY',
            val: `${currentRotation - angleStep}deg`,
            prog: 0,
          },
          {
            key: 'rotateY',
            val: `${currentRotation}deg`,
            prog: 1,
          },
          {
            key: 'rotateX',
            val: `${tiltAngle * tiltDirection}deg`,
            prog: 0.3,
          },
          {
            key: 'rotateX',
            val: '0deg',
            prog: 0.7,
          },
        ],
      },
    });
  });

  // Create continuous opacity/scale effects for each word based on rotation
  const wordVisibilityEffects: any[] = [];

  params.words.forEach((_, index) => {
    const wordId = `text-word-${index}`;
    const baseRotation = angleStep * index;

    // Calculate visibility ranges based on rotation position
    const frontOpacity = params.frontOpacity || 1;
    const sideOpacity = params.sideOpacity || 0.5;
    const backOpacity = params.backOpacity || 0.2;
    const frontScale = params.frontScale || 1.2;
    const sideScale = params.sideScale || 0.9;

    wordVisibilityEffects.push({
      id: `visibility-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: audioDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Front position (0deg) - full visibility
          { key: 'opacity', val: frontOpacity, prog: 0 },
          { key: 'scale', val: frontScale, prog: 0 },
          // Side position (90deg) - reduced visibility
          { key: 'opacity', val: sideOpacity, prog: 0.25 },
          { key: 'scale', val: sideScale, prog: 0.25 },
          // Back position (180deg) - minimal visibility
          { key: 'opacity', val: backOpacity, prog: 0.5 },
          { key: 'scale', val: sideScale, prog: 0.5 },
          // Other side (270deg) - reduced visibility
          { key: 'opacity', val: sideOpacity, prog: 0.75 },
          { key: 'scale', val: sideScale, prog: 0.75 },
          // Back to front (360deg) - full visibility
          { key: 'opacity', val: frontOpacity, prog: 1 },
          { key: 'scale', val: frontScale, prog: 1 },
        ],
      },
    });
  });

  // Carousel container
  const carouselContainer: RenderableComponentData = {
    id: 'carousel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          width: '600px',
          height: '200px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: textAtoms,
    effects: rotationEffects,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'carousel-3d-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [carouselContainer],
    effects: wordVisibilityEffects,
  };

  // Audio track
  const audioTrack: RenderableComponentData = {
    id: 'carousel-audio',
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: params.audio.src,
      volume: params.audio.volume || 1,
      startFrom: params.audio.start || 0,
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
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

const presetMetadata: PresetMetadata = {
  id: 'carousel-text-3d-beat-sync',
  title: '3D Carousel Text Beat Sync',
  description:
    'A 3D cylindrical carousel text animation that rotates in sync with music beats. Text elements are positioned around a cylinder using 3D transforms, with the front text scaled larger and sides fading with perspective. Beat detection drives rotation increments with momentum-based physics for natural inertia effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'beat-sync',
    '3d',
    'carousel',
    'text',
    'animation',
    'rotation',
    'perspective',
    'momentum',
    'music',
  ],
  defaultInputParams: {
    audio: {
      src: 'https://example.com/music.mp3',
      volume: 1,
      start: 0,
    },
    words: ['BEAT', 'SYNC', 'CAROUSEL', 'TEXT', 'ROTATION'],
    fontSize: 72,
    textColor: '#FFFFFF',
    font: 'Inter:700',
    cylinderRadius: 200,
    rotationDuration: 500,
    minRotationDuration: 200,
    frontScale: 1.2,
    sideScale: 0.9,
    frontOpacity: 1,
    sideOpacity: 0.5,
    backOpacity: 0.2,
    tiltAmount: 5,
    maxBeats: 30,
    minTimeBetweenBeats: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const carouselText3dBeatSyncPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
