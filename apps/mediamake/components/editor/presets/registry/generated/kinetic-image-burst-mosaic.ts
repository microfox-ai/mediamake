/**
 * Kinetic Image Burst Mosaic Preset
 *
 * A dynamic, beat-synchronized image sequence preset featuring kinetic typography and 
 * fluid grid reorganization. Images burst onto screen with bounce overshoot effects,
 * while text callouts fly in from different directions. The grid constantly reorganizes
 * creating an ever-changing mosaic with motion blur, depth-of-field effects, and particle
 * light streaks trailing behind moving images.
 *
 * Features:
 * - **Beat-Synchronized Reveals**: Images appear in sync with audio beats or caption timings
 * - **Bounce Overshoot Animations**: Scale animations with cubic-bezier bounce effect
 * - **Dynamic Grid Reorganization**: Grid cells shuffle positions creating fluid mosaic
 * - **Kinetic Text Callouts**: Text flies in from various directions synchronized with images
 * - **Motion Blur Effects**: Velocity-based blur during fast movements (0-4px)
 * - **Depth-of-Field Blur**: Background images get subtle blur (0-2px based on z-index)
 * - **Light Streak Particles**: Gradient streaks trail behind moving images
 * - **Transform Origin Variations**: Different scale pivot points (top-left, center, bottom-right)
 *
 * Use Cases:
 * - Music video image sequences
 * - Dynamic photo montages
 * - Beat-synchronized visual storytelling
 * - Energetic social media content
 * - Modern portfolio showcases
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PRESET PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL or local path'),
        fit: z
          .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
          .default('cover')
          .optional()
          .describe('Image object fit style'),
      }),
    )
    .min(1)
    .describe('Array of images to display in the mosaic'),

  audio: z
    .object({
      src: z.string().describe('Audio source URL or local path'),
      start: z
        .number()
        .default(0)
        .optional()
        .describe('Audio start time in seconds'),
      duration: z.number().optional().describe('Audio duration in seconds'),
      volume: z
        .number()
        .min(0)
        .max(2)
        .default(1)
        .optional()
        .describe('Audio volume (0-2)'),
    })
    .optional()
    .describe('Optional audio track for beat synchronization'),

  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            impact: z.number().optional(),
            sentiment: z.string().optional(),
            emotion: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional()
    .describe('Optional captions for text callout synchronization'),

  gridColumns: z
    .number()
    .min(2)
    .max(6)
    .default(3)
    .optional()
    .describe('Number of grid columns (2-6)'),

  gridColumnsMd: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .optional()
    .describe('Number of grid columns on medium screens (2-8)'),

  gap: z
    .number()
    .min(0)
    .max(32)
    .default(8)
    .optional()
    .describe('Gap between grid cells in pixels'),

  padding: z
    .number()
    .min(0)
    .max(64)
    .default(16)
    .optional()
    .describe('Container padding in pixels'),

  bounceIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.1)
    .optional()
    .describe('Intensity of bounce overshoot (0.1-2)'),

  bounceDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.4)
    .optional()
    .describe('Duration of bounce animation in seconds'),

  reorganizeInterval: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Interval between grid reorganizations in seconds'),

  reorganizeDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .optional()
    .describe('Duration of reorganization animation in seconds'),

  motionBlurMax: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .optional()
    .describe('Maximum motion blur in pixels'),

  depthBlurMax: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .optional()
    .describe('Maximum depth-of-field blur in pixels'),

  enableLightStreaks: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable light streak particle effects'),

  lightStreakOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Opacity of light streaks (0-1)'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Color of text callouts'),

  textSize: z
    .number()
    .min(12)
    .max(128)
    .default(32)
    .optional()
    .describe('Font size of text callouts'),

  textFont: z
    .string()
    .default('Inter:700')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),

  enableTextCallouts: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable kinetic text callouts'),

  useBeatSync: z
    .boolean()
    .default(false)
    .optional()
    .describe(
      'Use audio beat analysis for timing (requires audio parameter)',
    ),

  imageDisplayDuration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .optional()
    .describe('Base duration for each image display in seconds'),

  staggerDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.15)
    .optional()
    .describe('Delay between sequential image appearances'),

  trackName: z
    .string()
    .default('kinetic-mosaic')
    .optional()
    .describe('Track name for component IDs'),
});

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { config, fetcher, presets } = props;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    let fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(
    params.textFont || 'Inter:700',
  );

  // Extract parameters with defaults
  const {
    images,
    audio,
    captions,
    gridColumns = 3,
    gridColumnsMd = 4,
    gap = 8,
    padding = 16,
    bounceIntensity = 1.1,
    bounceDuration = 0.4,
    reorganizeInterval = 3,
    reorganizeDuration = 0.8,
    motionBlurMax = 4,
    depthBlurMax = 2,
    enableLightStreaks = true,
    lightStreakOpacity = 0.6,
    textColor = '#FFFFFF',
    textSize = 32,
    enableTextCallouts = true,
    useBeatSync = false,
    imageDisplayDuration = 2,
    staggerDelay = 0.15,
    trackName = 'kinetic-mosaic',
  } = params;

  const fps = config?.fps || 30;

  // Helper: Get random transform origin
  const getRandomTransformOrigin = (index: number) => {
    const origins = ['top left', 'center', 'bottom right', 'top right', 'bottom left'];
    return origins[index % origins.length];
  };

  // Helper: Calculate motion blur based on movement speed
  const calculateMotionBlur = (speed: number) => {
    // Speed is normalized 0-1, blur is 0-motionBlurMax
    return Math.min(speed * motionBlurMax, motionBlurMax);
  };

  // Helper: Calculate depth blur based on z-index
  const calculateDepthBlur = (zIndex: number, maxZIndex: number) => {
    // Lower z-index = more blur
    const normalized = zIndex / maxZIndex;
    return (1 - normalized) * depthBlurMax;
  };

  // Fetch audio beat analysis if useBeatSync is enabled
  let beatTimings: number[] = [];
  let audioDuration = audio?.duration || 30;

  if (useBeatSync && audio && fetcher) {
    try {
      const { analysis, durationInSeconds } = await fetcher(
        '/api/analyze-audio',
        {
          audioSrc: audio.src,
        },
      );

      if (analysis && analysis.length > 0) {
        audioDuration = durationInSeconds;

        // Filter beats based on audio start
        const audioStart = audio.start || 0;
        const clippedAnalysis = analysis.filter(
          (beat: any) =>
            beat.timestamp >= audioStart &&
            beat.timestamp <= audioStart + audioDuration,
        );

        // Select impactful beats
        const scoredBeats = clippedAnalysis.map((beat: any) => ({
          ...beat,
          score: beat.intensity * 0.5 + (beat.localPeakStrength || 0) * 0.5,
        }));

        const sortedBeats = scoredBeats.sort(
          (a: any, b: any) => b.score - a.score,
        );

        // Select top beats with minimum time difference
        const selectedBeats: any[] = [];
        const minTimeDiff = 0.5;
        const maxBeats = Math.min(images.length, 30);

        for (const beat of sortedBeats) {
          const tooClose = selectedBeats.some(
            (b) => Math.abs(b.timestamp - beat.timestamp) < minTimeDiff,
          );
          if (!tooClose && selectedBeats.length < maxBeats) {
            selectedBeats.push(beat);
          }
        }

        beatTimings = selectedBeats
          .sort((a, b) => a.timestamp - b.timestamp)
          .map((b) => b.timestamp - audioStart);
      }
    } catch (error) {
      console.warn('Audio analysis failed, using stagger timing:', error);
    }
  }

  // Use caption timings if available and not using beat sync
  let imageTiming: number[] = [];

  if (!useBeatSync && captions && captions.length > 0) {
    // Use caption start times for image appearances
    imageTiming = captions.map((cap) => cap.absoluteStart);
  } else if (beatTimings.length > 0) {
    // Use beat timings
    imageTiming = beatTimings;
  } else {
    // Fall back to staggered timing
    imageTiming = images.map((_, index) => index * staggerDelay);
  }

  // Create grid cell components with images
  const gridCells: RenderableComponentData[] = [];
  const lightStreaks: RenderableComponentData[] = [];
  const textCallouts: RenderableComponentData[] = [];

  images.forEach((image, index) => {
    const imageId = `${trackName}-image-${index}`;
    const cellId = `${trackName}-cell-${index}`;
    const startTime = imageTiming[index % imageTiming.length] || index * staggerDelay;
    const duration = imageDisplayDuration;

    // Calculate z-index for depth blur (front to back)
    const zIndex = images.length - index;
    const depthBlur = calculateDepthBlur(zIndex, images.length);

    // Transform origin variation
    const transformOrigin = getRandomTransformOrigin(index);

    // Image burst effect (scale bounce)
    const bounceEffect = {
      id: `${imageId}-bounce`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration: bounceDuration,
        mode: 'provider' as const,
        targetIds: [imageId],
        ranges: [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: bounceIntensity, prog: 0.6 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      },
    };

    // Motion blur effect during entrance
    const motionBlur = calculateMotionBlur(0.8); // High speed during entrance
    const motionBlurEffect = {
      id: `${imageId}-motion-blur`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration: bounceDuration * 0.5,
        mode: 'provider' as const,
        targetIds: [imageId],
        ranges: [
          { key: 'filter', val: `blur(${motionBlur}px)`, prog: 0 },
          { key: 'filter', val: `blur(${depthBlur}px)`, prog: 1 },
        ],
      },
    };

    // Grid reorganization effect (position change)
    const reorganizeEffect = {
      id: `${cellId}-reorganize`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: reorganizeInterval,
        duration: reorganizeDuration,
        mode: 'provider' as const,
        targetIds: [cellId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: Math.random() * 100 - 50, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: Math.random() * 100 - 50, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };

    // Image component
    const imageComponent: RenderableComponentData = {
      id: imageId,
      type: 'atom' as const,
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'absolute inset-0 object-cover',
        fit: image.fit || 'cover',
        style: {
          transformOrigin,
          filter: `blur(${depthBlur}px)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [bounceEffect, motionBlurEffect],
    };

    // Grid cell container
    const gridCell: RenderableComponentData = {
      id: cellId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative aspect-square overflow-hidden rounded-lg',
          style: {
            zIndex,
          },
        },
      },
      context: {
        timing: {
          start: startTime,
          duration,
        },
      },
      childrenData: [imageComponent],
      effects: [reorganizeEffect],
    };

    gridCells.push(gridCell);

    // Light streak particle (if enabled)
    if (enableLightStreaks) {
      const streakId = `${trackName}-streak-${index}`;
      const streakAngle = Math.random() * 360;
      const streakLength = 100 + Math.random() * 100;

      const lightStreak: RenderableComponentData = {
        id: streakId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="absolute h-0.5 bg-gradient-to-r from-transparent via-white to-transparent" style="width: ${streakLength}px;"></div>`,
          className: 'absolute pointer-events-none',
          style: {
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) rotate(${streakAngle}deg)`,
            opacity: 0,
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: bounceDuration,
          },
        },
        effects: [
          {
            id: `${streakId}-fade`,
            componentId: 'generic' as const,
            data: {
              type: 'ease-out' as const,
              start: 0,
              duration: bounceDuration,
              mode: 'provider' as const,
              targetIds: [streakId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: lightStreakOpacity, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'scaleX', val: 0, prog: 0 },
                { key: 'scaleX', val: 1, prog: 0.5 },
                { key: 'scaleX', val: 1.5, prog: 1 },
              ],
            },
          },
        ],
      };

      lightStreaks.push(lightStreak);
    }

    // Text callout (if enabled and captions available)
    if (enableTextCallouts && captions && captions[index % captions.length]) {
      const caption = captions[index % captions.length];
      const textId = `${trackName}-text-${index}`;
      const textDirections = ['left', 'right', 'top', 'bottom'];
      const textDirection = textDirections[index % textDirections.length];

      let textTranslateKey: 'translateX' | 'translateY' = 'translateX';
      let textTranslateStart = 0;
      
      if (textDirection === 'left') {
        textTranslateKey = 'translateX';
        textTranslateStart = -100;
      } else if (textDirection === 'right') {
        textTranslateKey = 'translateX';
        textTranslateStart = 100;
      } else if (textDirection === 'top') {
        textTranslateKey = 'translateY';
        textTranslateStart = -100;
      } else {
        textTranslateKey = 'translateY';
        textTranslateStart = 100;
      }

      const textCallout: RenderableComponentData = {
        id: textId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: caption.text,
          style: {
            fontSize: textSize,
            color: textColor,
            fontWeight: fontStyle.fontWeight || 700,
            textAlign: 'center',
            padding: '8px 16px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: Math.min(duration, caption.duration),
          },
        },
        effects: [
          {
            id: `${textId}-fly-in`,
            componentId: 'generic' as const,
            data: {
              type: 'ease-out' as const,
              start: 0,
              duration: 0.5,
              mode: 'provider' as const,
              targetIds: [textId],
              ranges: [
                { key: textTranslateKey, val: textTranslateStart, prog: 0 },
                { key: textTranslateKey, val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      };

      textCallouts.push(textCallout);
    }
  });

  // Grid container
  const gridContainer: RenderableComponentData = {
    id: `${trackName}-grid-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `grid grid-cols-${gridColumns} md:grid-cols-${gridColumnsMd} w-full h-full`,
        style: {
          gap: `${gap}px`,
          padding: `${padding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: gridCells,
  };

  // Light streaks container
  const lightStreaksContainer: RenderableComponentData = {
    id: `${trackName}-light-streaks`,
    type: 'layout' as const,
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
    childrenData: lightStreaks,
  };

  // Text callouts container
  const textCalloutsContainer: RenderableComponentData = {
    id: `${trackName}-text-callouts`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          gap: '16px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: textCallouts,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [
      gridContainer,
      ...(enableLightStreaks ? [lightStreaksContainer] : []),
      ...(enableTextCallouts ? [textCalloutsContainer] : []),
      ...(audio
        ? [
            {
              id: `${trackName}-audio`,
              type: 'atom' as const,
              componentId: 'AudioAtom',
              data: {
                src: audio.src,
                volume: audio.volume || 1,
                startFrom: audio.start || 0,
              },
              context: {
                timing: {
                  start: 0,
                  duration: audioDuration,
                },
              },
            } as RenderableComponentData,
          ]
        : []),
    ],
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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'kinetic-image-burst-mosaic',
  title: 'Kinetic Image Burst Mosaic',
  description:
    'A dynamic mosaic preset where images burst onto screen with bounce effects, synchronized with text callouts or beat markers. Features reorganizing grid layout, motion blur, depth-of-field effects, and light streak particles that emphasize movement direction and speed.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'kinetic',
    'typography',
    'images',
    'mosaic',
    'grid',
    'dynamic',
    'beat-sync',
    'motion-blur',
    'depth-of-field',
    'particles',
    'light-streaks',
    'bounce',
    'reorganize',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    images: [
      { src: 'https://picsum.photos/400/400?random=1', fit: 'cover' },
      { src: 'https://picsum.photos/400/400?random=2', fit: 'cover' },
      { src: 'https://picsum.photos/400/400?random=3', fit: 'cover' },
      { src: 'https://picsum.photos/400/400?random=4', fit: 'cover' },
      { src: 'https://picsum.photos/400/400?random=5', fit: 'cover' },
      { src: 'https://picsum.photos/400/400?random=6', fit: 'cover' },
    ],
    gridColumns: 3,
    gridColumnsMd: 4,
    gap: 8,
    padding: 16,
    bounceIntensity: 1.1,
    bounceDuration: 0.4,
    reorganizeInterval: 3,
    reorganizeDuration: 0.8,
    motionBlurMax: 4,
    depthBlurMax: 2,
    enableLightStreaks: true,
    lightStreakOpacity: 0.6,
    textColor: '#FFFFFF',
    textSize: 32,
    textFont: 'Inter:700',
    enableTextCallouts: true,
    useBeatSync: false,
    imageDisplayDuration: 2,
    staggerDelay: 0.15,
    trackName: 'kinetic-mosaic',
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const kineticImageBurstMosaicPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};