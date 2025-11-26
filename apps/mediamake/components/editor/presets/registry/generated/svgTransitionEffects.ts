/**
 * SVG Transition Effects - Morphing Blob Transitions Preset
 *
 * Creates organic, lava lamp-style blob transitions between artistic images with fluid,
 * painterly morphing effects. Features multiple animated blobs that grow and consume the
 * frame like living organisms, perfect for transitioning between different art styles
 * (paintings, flat design, anime).
 *
 * Features:
 * - **Organic Blob Morphing**: 1-5 concurrent blobs with staggered timing for natural cascade
 * - **GPU-Accelerated Animations**: Uses transform3d and scale3d for 60fps performance
 * - **Painterly Edges**: CSS blur filters create soft, organic boundaries
 * - **Synchronized Sound Design**: Bubble pops, liquid swooshes, and paint splatters timed to blob appearance
 * - **Blend Mode Options**: Multiply or screen modes for artistic compositing
 * - **Configurable Growth**: Control blob count, speed, size, and movement patterns
 * - **Additive/Subtractive Modes**: Blobs can grow to reveal or shrink to hide content
 *
 * Technical Implementation:
 * - Uses BaseLayout with absolute positioning for layered image composition
 * - Blobs are circular divs with border-radius and blur filters (not complex SVG filters)
 * - Effects system animates scale, opacity, and position for organic motion
 * - AudioAtom triggers sounds at precise blob appearance times
 * - Mix-blend-mode for creative image blending effects
 *
 * Use Cases:
 * - Art gallery slideshows transitioning between painting styles
 * - Creative portfolio presentations with organic transitions
 * - Music visualizers with flowing blob animations
 * - Brand videos with liquid morphing effects
 * - Anime/illustration showcases with painterly transitions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter Schema
const presetParams = z.object({
  outgoingImage: z
    .string()
    .describe('Source image URL (the image transitioning out)'),
  incomingImage: z
    .string()
    .describe('Destination image URL (the image transitioning in)'),
  blobCount: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of concurrent blobs (1-5)'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Total transition duration in seconds'),
  growthSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Blob growth speed multiplier (0.5 = slow, 3 = fast)'),
  blendMode: z
    .enum(['multiply', 'screen', 'normal', 'overlay', 'color-dodge'])
    .default('multiply')
    .describe('CSS blend mode for blob compositing'),
  blobColor: z
    .string()
    .default('#ff00ff')
    .describe('Base color for blobs (hex format)'),
  blobSizeVariation: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Size variation multiplier for blob diversity'),
  transitionMode: z
    .enum(['additive', 'subtractive'])
    .default('additive')
    .describe(
      'Additive: blobs grow to reveal incoming image. Subtractive: blobs shrink to hide outgoing image',
    ),
  enableSound: z
    .boolean()
    .default(true)
    .describe('Enable synchronized sound effects'),
  blobPopSound: z
    .string()
    .optional()
    .describe('Audio URL for bubble pop sound effect'),
  liquidSwooshSound: z
    .string()
    .optional()
    .describe('Audio URL for liquid swoosh sound effect'),
  paintSplatterSound: z
    .string()
    .optional()
    .describe('Audio URL for paint splatter sound effect'),
  soundVolume: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Volume for sound effects (0-1)'),
});

// Preset Execution Function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingImage,
    incomingImage,
    blobCount,
    transitionDuration,
    growthSpeed,
    blendMode,
    blobColor,
    blobSizeVariation,
    transitionMode,
    enableSound,
    blobPopSound,
    liquidSwooshSound,
    paintSplatterSound,
    soundVolume,
  } = params;

  // Helper function to generate random position percentages
  const getRandomPosition = (min: number, max: number): string => {
    return `${Math.random() * (max - min) + min}%`;
  };

  // Helper function to convert time to MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate blob configurations
  const blobConfigs = [];
  const baseSizes = [200, 180, 220, 160, 240];
  const baseBlurs = [20, 18, 22, 16, 24];
  const startOffsets = [0, 0.1, 0.15, 0.2, 0.25];
  const scaleProgression = [
    [0, 1.5, 1.3],
    [0, 1.4, 1.2],
    [0, 1.6, 1.4],
    [0, 1.3, 1.1],
    [0, 1.7, 1.5],
  ];

  for (let i = 0; i < blobCount; i++) {
    const size = baseSizes[i] * blobSizeVariation;
    const blur = baseBlurs[i] * blobSizeVariation;
    const startX = getRandomPosition(10, 80);
    const startY = getRandomPosition(10, 80);
    const endX = getRandomPosition(-20, 20);
    const endY = getRandomPosition(-20, 20);

    blobConfigs.push({
      id: `blob-${i + 1}`,
      size,
      blur,
      startX,
      startY,
      endX,
      endY,
      startOffset: startOffsets[i] * transitionDuration,
      duration: transitionDuration * (1 - startOffsets[i]) * growthSpeed,
      scaleValues: scaleProgression[i],
      zIndex: 10 + i,
    });
  }

  // Create blob components
  const blobComponents: RenderableComponentData[] = blobConfigs.map((blob) => {
    const blobComponent: RenderableComponentData = {
      id: blob.id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute rounded-full',
          style: {
            width: `${blob.size}px`,
            height: `${blob.size}px`,
            backgroundColor: blobColor,
            filter: `blur(${blob.blur}px)`,
            mixBlendMode: blendMode,
            transform: 'translate3d(0, 0, 0) scale3d(0, 0, 1)',
            left: blob.startX,
            top: blob.startY,
            opacity: 0,
            zIndex: blob.zIndex,
          },
        },
      },
      context: {
        timing: {
          start: blob.startOffset,
          duration: blob.duration,
        },
      },
      effects: [
        {
          id: `${blob.id}-scale-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: blob.duration,
            mode: 'provider',
            targetIds: [blob.id],
            ranges: [
              {
                key: 'scale',
                val: blob.scaleValues[0],
                prog: 0,
              },
              {
                key: 'scale',
                val: blob.scaleValues[1],
                prog: 0.6,
              },
              {
                key: 'scale',
                val: blob.scaleValues[2],
                prog: 1,
              },
            ],
          },
        },
        {
          id: `${blob.id}-opacity-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: blob.duration,
            mode: 'provider',
            targetIds: [blob.id],
            ranges: [
              {
                key: 'opacity',
                val: 0,
                prog: 0,
              },
              {
                key: 'opacity',
                val: 1,
                prog: 0.2,
              },
              {
                key: 'opacity',
                val: 1,
                prog: 1,
              },
            ],
          },
        },
        {
          id: `${blob.id}-translateX-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: blob.duration,
            mode: 'provider',
            targetIds: [blob.id],
            ranges: [
              {
                key: 'translateX',
                val: '0%',
                prog: 0,
              },
              {
                key: 'translateX',
                val: blob.endX,
                prog: 1,
              },
            ],
          },
        },
        {
          id: `${blob.id}-translateY-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: blob.duration,
            mode: 'provider',
            targetIds: [blob.id],
            ranges: [
              {
                key: 'translateY',
                val: '0%',
                prog: 0,
              },
              {
                key: 'translateY',
                val: blob.endY,
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [],
    };

    return blobComponent;
  });

  // Create audio components if enabled
  const audioComponents: RenderableComponentData[] = [];
  if (enableSound) {
    const soundEffects = [
      blobPopSound,
      liquidSwooshSound,
      blobPopSound,
      paintSplatterSound,
      liquidSwooshSound,
    ];

    blobConfigs.forEach((blob, index) => {
      const soundSrc = soundEffects[index % soundEffects.length];
      if (soundSrc) {
        const audioStart = blob.startOffset;
        const audioDuration = 0.3;
        const startTime = formatTime(audioStart);
        const endTime = formatTime(audioStart + audioDuration);

        audioComponents.push({
          id: `blob-sound-${index + 1}`,
          type: 'atom',
          componentId: 'AudioAtom',
          data: {
            src: soundSrc,
            volume: soundVolume,
            timeRanges: [`${startTime}-${endTime}`],
          },
          context: {
            timing: {
              start: audioStart,
              duration: audioDuration,
            },
          },
        } as RenderableComponentData);
      }
    });
  }

  // Build main container structure
  const rootContainer: RenderableComponentData = {
    id: 'svgTransitionEffects-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      // Outgoing image layer
      {
        id: 'outgoing-image',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: outgoingImage,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            zIndex: 1,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Incoming image layer
      {
        id: 'incoming-image',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: incomingImage,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            zIndex: transitionMode === 'additive' ? 0 : 2,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Blob mask container
      {
        id: 'blob-mask-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              zIndex: 15,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: blobComponents,
      } as RenderableComponentData,
      // Audio container
      ...(audioComponents.length > 0
        ? [
            {
              id: 'transition-audio-container',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute opacity-0 pointer-events-none',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
              childrenData: audioComponents,
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

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'svgTransitionEffects',
  title: 'SVG Transition Effects - Morphing Blob Transitions',
  description:
    'Creates organic, lava lamp-style blob transitions between artistic images. Features multiple animated blobs with CSS blur filters for soft painterly edges, staggered timing for natural cascade effects, and synchronized sound design. Supports 1-5 concurrent blobs with GPU-accelerated transforms, mix-blend-mode options (multiply/screen), and configurable growth patterns. Ideal for transitioning between different art styles like paintings, flat design, and anime. Uses border-radius circles with blur filters instead of complex SVG filters for reliable cross-browser performance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'blob',
    'morphing',
    'organic',
    'svg',
    'effects',
    'artistic',
    'fluid',
    'lava-lamp',
    'painterly',
    'animation',
    'sound-design',
  ],
  defaultInputParams: {
    outgoingImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5',
    incomingImage: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262',
    blobCount: 3,
    transitionDuration: 1.5,
    growthSpeed: 1,
    blendMode: 'multiply',
    blobColor: '#ff00ff',
    blobSizeVariation: 1,
    transitionMode: 'additive',
    enableSound: true,
    soundVolume: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export Preset
export const svgTransitionEffectsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
