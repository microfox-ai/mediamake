/**
 * Dynamic Collage Builder Preset
 *
 * Transforms bulk media files into an abstract, morphing collage composition with smooth transitions
 * between states. Creates a living collage where multiple media layers continuously reorganize themselves
 * in an organic, fluid manner.
 *
 * Features:
 * - Multiple layout modes: grid, masonry, spiral, random scatter
 * - Transition styles: smooth morph, glitch, fade-through-black, zoom
 * - Timing modes: beat-sync (audio-driven), interval-based, continuous flow
 * - Dynamic adaptation: single hero → split-screens → complex grids based on media count
 * - Depth layering: z-index variations, opacity gradients, blur effects
 * - Focus mode: one element takes prominence while others recede
 * - Cinematic easing: cubic-bezier curves for professional motion
 * - Cross-dissolves, motion blur, scale morphing transitions
 *
 * Use cases:
 * - Music video segments with continuously morphing visuals
 * - Multi-layer video editing with automatic crossfades
 * - Abstract collage compositions for social media
 * - Dynamic photo/video montages with organic transitions
 * - Beat-synced visual sequences for audio content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  mediaSources: z
    .array(
      z.object({
        src: z.string().describe('Media file URL (video or image)'),
        type: z
          .enum(['video', 'image'])
          .describe('Media type (video or image)'),
        fit: z
          .enum(['cover', 'contain', 'fill'])
          .optional()
          .default('cover')
          .describe('How media fits its container'),
      }),
    )
    .describe('Array of media sources (images/videos) for the collage'),

  duration: z
    .number()
    .default(30)
    .describe('Total duration of the collage in seconds'),

  transitionStyle: z
    .enum(['smooth-morph', 'glitch', 'fade-through-black', 'zoom'])
    .optional()
    .default('smooth-morph')
    .describe(
      'Transition style between states (smooth-morph, glitch, fade-through-black, zoom)',
    ),

  layoutMode: z
    .enum(['grid', 'masonry', 'spiral', 'random-scatter'])
    .optional()
    .default('grid')
    .describe(
      'Layout arrangement mode (grid, masonry, spiral, random-scatter)',
    ),

  timingMode: z
    .enum(['beat-sync', 'interval-based', 'continuous-flow'])
    .optional()
    .default('interval-based')
    .describe(
      'Timing mode for transitions (beat-sync uses audio, interval-based uses fixed intervals, continuous-flow distributes evenly)',
    ),

  transitionInterval: z
    .number()
    .optional()
    .default(3)
    .describe('Interval between transitions in seconds (for interval-based mode)'),

  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for beat-sync mode'),

  enableFocusMode: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Enable focus mode where one element temporarily takes prominence',
    ),

  depthLayers: z
    .number()
    .optional()
    .default(3)
    .describe('Number of depth layers (1-5, affects z-index separation)'),

  transitionDuration: z
    .number()
    .optional()
    .default(1.2)
    .describe('Duration of each transition effect in seconds'),

  backgroundColor: z
    .string()
    .optional()
    .default('#000000')
    .describe('Background color of the collage'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    mediaSources,
    duration,
    transitionStyle,
    layoutMode,
    timingMode,
    transitionInterval,
    audioSrc,
    enableFocusMode,
    depthLayers,
    transitionDuration,
    backgroundColor,
  } = params;

  const { fetcher, presets } = props;

  // Helper: Calculate transition timestamps
  const calculateTransitionTimestamps = async (): Promise<number[]> => {
    if (timingMode === 'beat-sync' && audioSrc && fetcher && presets) {
      try {
        // Use beatstitch to analyze audio
        const beatResult = await presets['beatstitch'](
          {
            audio: { src: audioSrc, volume: 0 }, // Silent audio just for beat detection
            videos: mediaSources
              .filter((m) => m.type === 'video')
              .slice(0, 1)
              .map((m) => ({ src: m.src })),
            images: mediaSources
              .filter((m) => m.type === 'image')
              .slice(0, 1)
              .map((m) => ({ src: m.src })),
            transitionEffect: 'none',
            beatSelectionMode: 'high-impact',
            showBeatCounter: false,
          },
          props,
        );

        // Extract beat timestamps from result
        const beatData =
          beatResult?.output?.childrenData?.[0]?.data?.beatData || [];
        return beatData
          .map((b: any) => b.time)
          .filter((t: number) => t < duration);
      } catch (error) {
        console.warn('Beat-sync failed, falling back to interval-based:', error);
      }
    }

    if (timingMode === 'continuous-flow') {
      const transitionCount = Math.floor(duration / transitionDuration) - 1;
      return Array.from({ length: transitionCount }, (_, i) =>
        parseFloat(((i + 1) * (duration / (transitionCount + 1))).toFixed(2)),
      );
    }

    // Interval-based (default)
    const timestamps: number[] = [];
    for (let t = transitionInterval; t < duration; t += transitionInterval) {
      timestamps.push(parseFloat(t.toFixed(2)));
    }
    return timestamps;
  };

  // Helper: Generate layout positions for media items
  const generateLayoutPositions = (
    count: number,
    stateIndex: number,
  ): Array<{
    left: string;
    top: string;
    width: string;
    height: string;
    zIndex: number;
    opacity: number;
    rotation: number;
  }> => {
    const positions: any[] = [];
    const layerCount = Math.min(depthLayers, 5);

    if (count === 1) {
      // Single hero position
      return [
        {
          left: '25%',
          top: '22.5%',
          width: '50%',
          height: '55%',
          zIndex: 10,
          opacity: 1,
          rotation: 0,
        },
      ];
    }

    if (count === 2) {
      // Split-screen
      return [
        {
          left: '5%',
          top: '15%',
          width: '42%',
          height: '70%',
          zIndex: 8,
          opacity: 1,
          rotation: 0,
        },
        {
          left: '53%',
          top: '15%',
          width: '42%',
          height: '70%',
          zIndex: 8,
          opacity: 1,
          rotation: 0,
        },
      ];
    }

    if (count === 3) {
      // Triangular layout
      return [
        {
          left: '30%',
          top: '10%',
          width: '40%',
          height: '35%',
          zIndex: 9,
          opacity: 1,
          rotation: 0,
        },
        {
          left: '8%',
          top: '50%',
          width: '38%',
          height: '40%',
          zIndex: 8,
          opacity: 0.95,
          rotation: 0,
        },
        {
          left: '54%',
          top: '50%',
          width: '38%',
          height: '40%',
          zIndex: 8,
          opacity: 0.95,
          rotation: 0,
        },
      ];
    }

    // For larger counts, use layout mode
    switch (layoutMode) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const cellWidth = 90 / cols;
        const cellHeight = 90 / rows;

        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const layer = i % layerCount;

          positions.push({
            left: `${5 + col * cellWidth}%`,
            top: `${5 + row * cellHeight}%`,
            width: `${cellWidth * 0.9}%`,
            height: `${cellHeight * 0.9}%`,
            zIndex: 5 + layer,
            opacity: 1 - layer * 0.1,
            rotation: 0,
          });
        }
        break;
      }

      case 'masonry': {
        // Masonry-like staggered layout
        const cols = Math.min(3, Math.ceil(count / 2));
        const colWidth = 90 / cols;

        for (let i = 0; i < count; i++) {
          const col = i % cols;
          const rowInCol = Math.floor(i / cols);
          const layer = i % layerCount;

          const heightVariation = 30 + (i * 13) % 30;
          const topOffset = (rowInCol * 35) % 70;

          positions.push({
            left: `${5 + col * colWidth}%`,
            top: `${5 + topOffset}%`,
            width: `${colWidth * 0.85}%`,
            height: `${heightVariation}%`,
            zIndex: 5 + layer,
            opacity: 1 - layer * 0.12,
            rotation: 0,
          });
        }
        break;
      }

      case 'spiral': {
        // Spiral layout from center
        const centerX = 50;
        const centerY = 50;
        const angleStep = (360 / count) * (Math.PI / 180);
        const radiusStep = 20 / count;

        for (let i = 0; i < count; i++) {
          const angle = i * angleStep + stateIndex * 0.5;
          const radius = 15 + i * radiusStep;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          const layer = i % layerCount;

          positions.push({
            left: `${Math.max(5, Math.min(70, x - 10))}%`,
            top: `${Math.max(5, Math.min(70, y - 10))}%`,
            width: `${20 + (count - i) * 2}%`,
            height: `${20 + (count - i) * 2}%`,
            zIndex: count - i,
            opacity: 1 - layer * 0.1,
            rotation: (i * 15) % 360,
          });
        }
        break;
      }

      case 'random-scatter': {
        // Random scattered layout (seeded by stateIndex for consistency)
        const seed = stateIndex * 1000 + 42;
        const pseudoRandom = (index: number) => {
          const x = Math.sin(seed + index * 12.9898) * 43758.5453;
          return x - Math.floor(x);
        };

        for (let i = 0; i < count; i++) {
          const layer = i % layerCount;
          const sizeBase = 25 + pseudoRandom(i * 3) * 20;

          positions.push({
            left: `${5 + pseudoRandom(i) * 65}%`,
            top: `${5 + pseudoRandom(i + 100) * 65}%`,
            width: `${sizeBase}%`,
            height: `${sizeBase}%`,
            zIndex: 5 + Math.floor(pseudoRandom(i + 200) * layerCount),
            opacity: 0.7 + pseudoRandom(i + 300) * 0.3,
            rotation: pseudoRandom(i + 400) * 360,
          });
        }
        break;
      }

      default:
        break;
    }

    return positions;
  };

  // Helper: Create transition effects between states
  const createTransitionEffect = (
    targetId: string,
    fromState: any,
    toState: any,
    startTime: number,
  ): any => {
    const easingCurve = 'cubic-bezier(0.4, 0.0, 0.2, 1)'; // Cinematic easing

    const baseEffect = {
      id: `transition-${targetId}-${startTime}`,
      componentId: targetId,
      data: {
        type: easingCurve as any,
        start: startTime,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [] as any[],
      },
    };

    switch (transitionStyle) {
      case 'smooth-morph':
        baseEffect.data.ranges = [
          // Position
          {
            key: 'left',
            val: fromState.left,
            prog: 0,
          },
          {
            key: 'left',
            val: toState.left,
            prog: 1,
          },
          {
            key: 'top',
            val: fromState.top,
            prog: 0,
          },
          {
            key: 'top',
            val: toState.top,
            prog: 1,
          },
          // Size
          {
            key: 'width',
            val: fromState.width,
            prog: 0,
          },
          {
            key: 'width',
            val: toState.width,
            prog: 1,
          },
          {
            key: 'height',
            val: fromState.height,
            prog: 0,
          },
          {
            key: 'height',
            val: toState.height,
            prog: 1,
          },
          // Opacity
          {
            key: 'opacity',
            val: fromState.opacity,
            prog: 0,
          },
          {
            key: 'opacity',
            val: toState.opacity,
            prog: 1,
          },
          // Rotation
          {
            key: 'rotate',
            val: fromState.rotation,
            prog: 0,
          },
          {
            key: 'rotate',
            val: toState.rotation,
            prog: 1,
          },
        ];
        break;

      case 'glitch':
        baseEffect.data.ranges = [
          {
            key: 'left',
            val: fromState.left,
            prog: 0,
          },
          {
            key: 'left',
            val: fromState.left,
            prog: 0.4,
          },
          {
            key: 'left',
            val: toState.left,
            prog: 0.5,
          },
          {
            key: 'left',
            val: toState.left,
            prog: 1,
          },
          {
            key: 'top',
            val: fromState.top,
            prog: 0,
          },
          {
            key: 'top',
            val: toState.top,
            prog: 0.5,
          },
          {
            key: 'top',
            val: toState.top,
            prog: 1,
          },
          {
            key: 'opacity',
            val: fromState.opacity,
            prog: 0,
          },
          {
            key: 'opacity',
            val: 0,
            prog: 0.45,
          },
          {
            key: 'opacity',
            val: toState.opacity,
            prog: 0.55,
          },
          {
            key: 'opacity',
            val: toState.opacity,
            prog: 1,
          },
          {
            key: 'scale',
            val: 1,
            prog: 0,
          },
          {
            key: 'scale',
            val: 1.1,
            prog: 0.5,
          },
          {
            key: 'scale',
            val: 1,
            prog: 1,
          },
        ];
        break;

      case 'fade-through-black':
        baseEffect.data.ranges = [
          {
            key: 'opacity',
            val: fromState.opacity,
            prog: 0,
          },
          {
            key: 'opacity',
            val: 0,
            prog: 0.5,
          },
          {
            key: 'opacity',
            val: toState.opacity,
            prog: 1,
          },
          {
            key: 'left',
            val: fromState.left,
            prog: 0,
          },
          {
            key: 'left',
            val: toState.left,
            prog: 1,
          },
          {
            key: 'top',
            val: fromState.top,
            prog: 0,
          },
          {
            key: 'top',
            val: toState.top,
            prog: 1,
          },
          {
            key: 'width',
            val: fromState.width,
            prog: 0,
          },
          {
            key: 'width',
            val: toState.width,
            prog: 1,
          },
          {
            key: 'height',
            val: fromState.height,
            prog: 0,
          },
          {
            key: 'height',
            val: toState.height,
            prog: 1,
          },
        ];
        break;

      case 'zoom':
        baseEffect.data.ranges = [
          {
            key: 'scale',
            val: 1,
            prog: 0,
          },
          {
            key: 'scale',
            val: 0.5,
            prog: 0.5,
          },
          {
            key: 'scale',
            val: 1,
            prog: 1,
          },
          {
            key: 'opacity',
            val: fromState.opacity,
            prog: 0,
          },
          {
            key: 'opacity',
            val: 0.3,
            prog: 0.5,
          },
          {
            key: 'opacity',
            val: toState.opacity,
            prog: 1,
          },
          {
            key: 'left',
            val: fromState.left,
            prog: 0,
          },
          {
            key: 'left',
            val: toState.left,
            prog: 1,
          },
          {
            key: 'top',
            val: fromState.top,
            prog: 0,
          },
          {
            key: 'top',
            val: toState.top,
            prog: 1,
          },
        ];
        break;

      default:
        break;
    }

    return baseEffect;
  };

  // Calculate transition timestamps
  const transitionTimestamps = await calculateTransitionTimestamps();
  const stateCount = transitionTimestamps.length + 1;

  // Generate media items with transitions
  const mediaItems: any[] = [];

  mediaSources.forEach((media, index) => {
    const mediaId = `collage-media-${index}`;

    // Generate position states for this media across all transitions
    const states = Array.from({ length: stateCount }, (_, stateIndex) =>
      generateLayoutPositions(mediaSources.length, stateIndex),
    );

    // Initial state
    const initialState = states[0][index % states[0].length];

    // Determine focus state (one random transition makes this item prominent)
    const focusTransitionIndex = enableFocusMode
      ? index % transitionTimestamps.length
      : -1;

    // Create media component
    const mediaComponent: any = {
      id: mediaId,
      type: 'atom' as const,
      componentId: media.type === 'video' ? 'VideoAtom' : 'ImageAtom',
      data: {
        src: media.src,
        fit: media.fit,
        className: 'absolute rounded-lg shadow-2xl transition-all',
        style: {
          left: initialState.left,
          top: initialState.top,
          width: initialState.width,
          height: initialState.height,
          opacity: initialState.opacity,
          transform: `rotate(${initialState.rotation}deg)`,
          filter: initialState.zIndex <= 3 ? `blur(${(5 - initialState.zIndex) * 2}px)` : 'none',
          zIndex: initialState.zIndex,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [] as any[],
    };

    // Add transition effects
    transitionTimestamps.forEach((timestamp, tIndex) => {
      const fromStateIndex = tIndex;
      const toStateIndex = tIndex + 1;

      const fromPositions = states[fromStateIndex];
      const toPositions = states[toStateIndex];

      const fromPos = fromPositions[index % fromPositions.length];
      const toPos = toPositions[index % toPositions.length];

      // Apply focus mode boost
      if (enableFocusMode && tIndex === focusTransitionIndex) {
        toPos.zIndex = 15;
        toPos.opacity = 1;
        toPos.width = '55%';
        toPos.height = '60%';
        toPos.left = '22.5%';
        toPos.top = '20%';
      }

      const transitionEffect = createTransitionEffect(
        mediaId,
        fromPos,
        toPos,
        timestamp,
      );

      mediaComponent.effects.push(transitionEffect);
    });

    mediaItems.push(mediaComponent);
  });

  // Create focus overlay if enabled
  const focusOverlay: any = enableFocusMode
    ? {
        id: 'focus-overlay',
        type: 'atom' as const,
        componentId: 'ShapeAtom',
        data: {
          shape: 'rectangle',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 20,
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
            opacity: 0.6,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      }
    : null;

  // Root container
  const rootContainer = {
    id: 'dynamic-collage-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [...mediaItems, ...(focusOverlay ? [focusOverlay] : [])],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'dynamic-collage-builder',
  title: 'Dynamic Collage Builder',
  description:
    'Transforms bulk media files into an abstract, morphing collage composition with smooth transitions between states. Creates a living collage where multiple media layers continuously reorganize themselves in an organic, fluid manner. Features multiple layout modes (grid, masonry, spiral, scatter), transition styles (smooth morph, glitch, fade-through-black, zoom), and timing modes (beat-sync, interval-based, continuous flow).',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'collage',
    'media',
    'morphing',
    'transitions',
    'multi-layer',
    'dynamic',
    'music-video',
    'beat-sync',
  ],
  defaultInputParams: {
    mediaSources: [
      { src: '', type: 'video', fit: 'cover' },
      { src: '', type: 'image', fit: 'cover' },
      { src: '', type: 'video', fit: 'cover' },
    ],
    duration: 30,
    transitionStyle: 'smooth-morph',
    layoutMode: 'grid',
    timingMode: 'interval-based',
    transitionInterval: 3,
    enableFocusMode: true,
    depthLayers: 3,
    transitionDuration: 1.2,
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: ['beatstitch'],
    helpers: [],
  },
};

// Export preset
export const dynamicCollageBuilderPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
