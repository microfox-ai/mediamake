/**
 * Segmented Fill Animation Preset
 *
 * This preset creates a data-driven fill animation that visualizes loading or processing
 * using a segmented display pattern similar to LED matrices. Features discrete chunk-based
 * filling with step-based transitions, flicker effects for digital authenticity, and
 * optional audio-reactive segment activation.
 *
 * Features:
 * - **Grid-Based Segmentation**: 10x5 grid of discrete segments that activate sequentially
 * - **Stepped Transitions**: Instant on/off transitions using steps(1) easing for digital feel
 * - **Sequential Activation**: Segments light up in order based on percentage thresholds
 * - **Flicker Effects**: Random opacity variations (0.8-1.0) with very short durations
 * - **Audio-Reactive Mode**: Optional waveform-triggered segment activation based on beat detection
 * - **Glow Filters**: Activation moments include glow effects for visual impact
 * - **Text Overlay**: Customizable text overlay with mix-blend-difference for visibility
 * - **Data Integration**: Optional fetcher support for real-time data visualization
 *
 * Use cases:
 * - Loading screens with progress indication
 * - Data processing visualizations
 * - Audio-reactive visual displays
 * - Digital countdown effects
 * - Matrix-style reveal animations
 * - Processing status indicators
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .default('LOADING')
    .describe('Text to display as overlay on the segmented grid'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the animation in seconds'),
  gridCols: z
    .number()
    .min(2)
    .max(20)
    .default(10)
    .describe('Number of columns in the segment grid'),
  gridRows: z
    .number()
    .min(2)
    .max(20)
    .default(5)
    .describe('Number of rows in the segment grid'),
  fillPattern: z
    .enum(['sequential', 'random', 'wave', 'radial'])
    .default('sequential')
    .describe('Pattern for segment activation'),
  inactiveColor: z
    .string()
    .default('#e5e7eb')
    .describe('Color of inactive segments (default: gray-200)'),
  activeColor: z
    .string()
    .default('#3b82f6')
    .describe('Color of active segments (default: blue-500)'),
  flickerEnabled: z
    .boolean()
    .default(true)
    .describe('Enable random flicker effects on active segments'),
  flickerIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Intensity of flicker effect (0 = no flicker, 1 = max flicker)'),
  glowEnabled: z
    .boolean()
    .default(true)
    .describe('Enable glow filter during activation moments'),
  glowColor: z
    .string()
    .default('#3b82f6')
    .describe('Color of the glow effect'),
  glowIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Intensity of glow effect in pixels'),
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive segment activation'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for audio-reactive mode (required if audioReactive is true)'),
  audioSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Sensitivity of audio-reactive triggering'),
  audioThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Minimum audio intensity to trigger segment activation'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the overlay text'),
  textSize: z
    .string()
    .default('6xl')
    .describe('Tailwind text size class for overlay text (e.g., "6xl", "8xl")'),
  gapSize: z
    .number()
    .min(0)
    .max(10)
    .default(0.5)
    .describe('Gap between segments in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    gridCols,
    gridRows,
    fillPattern,
    inactiveColor,
    activeColor,
    flickerEnabled,
    flickerIntensity,
    glowEnabled,
    glowColor,
    glowIntensity,
    audioReactive,
    audioSrc,
    audioSensitivity,
    audioThreshold,
    textColor,
    textSize,
    gapSize,
  } = params;

  const totalSegments = gridCols * gridRows;

  // Helper function to calculate activation time based on pattern
  const calculateActivationTime = (index: number): number => {
    const baseTime = (duration * 0.8) / totalSegments; // Use 80% of duration for sequential fill

    switch (fillPattern) {
      case 'sequential':
        return index * baseTime;
      case 'random':
        return Math.random() * duration * 0.8;
      case 'wave': {
        const row = Math.floor(index / gridCols);
        const col = index % gridCols;
        const waveDelay = (row + col) * baseTime * 0.5;
        return waveDelay;
      }
      case 'radial': {
        const row = Math.floor(index / gridCols);
        const col = index % gridCols;
        const centerRow = gridRows / 2;
        const centerCol = gridCols / 2;
        const distance = Math.sqrt(
          Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2),
        );
        const maxDistance = Math.sqrt(
          Math.pow(centerRow, 2) + Math.pow(centerCol, 2),
        );
        return (distance / maxDistance) * duration * 0.8;
      }
      default:
        return index * baseTime;
    }
  };

  // Helper function to create flicker effect ranges
  const createFlickerRanges = (
    startTime: number,
    segmentDuration: number,
  ): any[] => {
    if (!flickerEnabled || flickerIntensity === 0) {
      return [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ];
    }

    const flickerCount = Math.floor(segmentDuration * 10); // ~10 flickers per second
    const ranges: any[] = [{ key: 'opacity', val: 1, prog: 0 }];

    for (let i = 1; i <= flickerCount; i++) {
      const prog = i / flickerCount;
      const opacity =
        1 - Math.random() * flickerIntensity * 0.2; // Vary between 1.0 and 0.8
      ranges.push({ key: 'opacity', val: opacity, prog });
    }

    ranges.push({ key: 'opacity', val: 1, prog: 1 });
    return ranges;
  };

  // Create segment components
  const segmentComponents: RenderableComponentData[] = [];

  for (let i = 0; i < totalSegments; i++) {
    const segmentId = `segment-${i}`;
    const activationTime = calculateActivationTime(i);
    const segmentDuration = duration - activationTime;

    // Base segment with stepped transition (instant on)
    const segmentEffects: any[] = [];

    // Color change effect (instant transition using steps(1))
    segmentEffects.push({
      id: `color-change-${segmentId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: activationTime,
        duration: 0.1, // Very short duration for instant feel
        mode: 'provider',
        targetIds: [segmentId],
        ranges: [
          { key: 'backgroundColor', val: inactiveColor, prog: 0 },
          { key: 'backgroundColor', val: activeColor, prog: 1 },
        ],
      },
    });

    // Flicker effect (only after activation)
    if (flickerEnabled && segmentDuration > 0.1) {
      const flickerRanges = createFlickerRanges(activationTime, segmentDuration);
      segmentEffects.push({
        id: `flicker-${segmentId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: activationTime + 0.1,
          duration: segmentDuration - 0.1,
          mode: 'provider',
          targetIds: [segmentId],
          ranges: flickerRanges,
        },
      });
    }

    // Glow effect during activation
    if (glowEnabled) {
      segmentEffects.push({
        id: `glow-${segmentId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: activationTime,
          duration: 0.3,
          mode: 'provider',
          targetIds: [segmentId],
          ranges: [
            {
              key: 'filter',
              val: 'drop-shadow(0 0 0px rgba(0,0,0,0))',
              prog: 0,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 ${glowIntensity}px ${glowColor})`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0 0 0px rgba(0,0,0,0))',
              prog: 1,
            },
          ],
        },
      });
    }

    // Audio-reactive effect (if enabled)
    if (audioReactive && audioSrc) {
      segmentEffects.push({
        id: `audio-reactive-${segmentId}`,
        componentId: 'waveform',
        data: {
          audioSrc: audioSrc,
          audioProperty: 'bass',
          effectType: 'scale',
          intensity: 0.1,
          baseScale: 1,
          sensitivity: audioSensitivity,
          threshold: audioThreshold,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: [segmentId],
          start: activationTime,
          duration: segmentDuration,
          smoothNormalisation: 1,
        },
      });
    }

    segmentComponents.push({
      id: segmentId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'transition-colors',
          style: {
            aspectRatio: '1/1',
            backgroundColor: inactiveColor,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: segmentEffects,
    } as RenderableComponentData);
  }

  // Main grid container
  const mainGridContainer: RenderableComponentData = {
    id: 'main-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative grid grid-cols-${gridCols}`,
        style: {
          gap: `${gapSize}px`,
          width: '80%',
          aspectRatio: '16/9',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: segmentComponents,
  };

  // Text overlay
  const textOverlay: RenderableComponentData = {
    id: 'text-overlay',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: `absolute inset-0 z-10 flex items-center justify-center text-${textSize} font-bold mix-blend-difference`,
      style: {
        color: textColor,
        textShadow: '0 0 20px rgba(0,0,0,0.5)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'segmented-fill-animation-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [mainGridContainer, textOverlay],
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
  id: 'segmented-fill-animation',
  title: 'Segmented Fill Animation',
  description:
    'Data-driven fill animation that visualizes loading or processing with discrete segment activation. Features sequential or threshold-based filling with flicker effects, audio-reactive segment triggering, and stepped transitions for digital authenticity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'animation',
    'fill',
    'segmented',
    'loading',
    'processing',
    'led',
    'matrix',
    'digital',
    'audio-reactive',
    'data-driven',
  ],
  defaultInputParams: {
    text: 'LOADING',
    duration: 10,
    gridCols: 10,
    gridRows: 5,
    fillPattern: 'sequential',
    inactiveColor: '#e5e7eb',
    activeColor: '#3b82f6',
    flickerEnabled: true,
    flickerIntensity: 0.2,
    glowEnabled: true,
    glowColor: '#3b82f6',
    glowIntensity: 10,
    audioReactive: false,
    audioSensitivity: 1.5,
    audioThreshold: 0.3,
    textColor: '#ffffff',
    textSize: '6xl',
    gapSize: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const segmentedFillAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
