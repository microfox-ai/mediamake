/**
 * Snap Zoom Burst Preset
 *
 * A dynamic snap zoom preset inspired by modern social media and YouTube editing styles.
 * Creates energetic, attention-grabbing zoom effects with stepped bursts, hold frames,
 * rotation, flash overlays, and chromatic aberration effects.
 *
 * Features:
 * - **Stepped Zoom Bursts**: Quick zoom increments with hold frames for rhythmic impact
 * - **Dynamic Rotation**: Each zoom step includes slight rotation for personality
 * - **White Flash Effects**: Punchy flash overlays at each zoom transition point
 * - **Chromatic Aberration**: Contrast and saturation boosts during movement phases
 * - **Camera Shake**: Subtle shake effects synchronized with zoom bursts
 * - **Performance Optimized**: Uses transform3d and will-change for smooth playback
 *
 * Use cases:
 * - Emphasizing reactions or surprising moments in content
 * - Creating energetic social media clips
 * - Highlighting key points in educational videos
 * - Adding dynamic emphasis to product reveals
 * - Building attention-grabbing transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  imageUrl: z
    .string()
    .describe('URL or path to the image/video to apply snap zoom effect'),
  zoomSteps: z
    .number()
    .min(2)
    .max(5)
    .default(3)
    .describe('Number of zoom steps (2-5)'),
  rotationAmount: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum rotation in degrees for each step'),
  flashIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of white flash effects (0-1)'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Total duration of the snap zoom effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { imageUrl, zoomSteps, rotationAmount, flashIntensity, duration } =
    params;

  // Helper function to calculate zoom step timings
  const calculateStepTimings = (
    totalDuration: number,
    steps: number,
  ): Array<{ start: number; duration: number; hold: number }> => {
    const stepTimings: Array<{
      start: number;
      duration: number;
      hold: number;
    }> = [];
    const burstDuration = 0.15; // Quick burst duration
    const holdDuration = 0.2; // Hold frame duration
    const stepTotalDuration = burstDuration + holdDuration;

    for (let i = 0; i < steps; i++) {
      stepTimings.push({
        start: i * stepTotalDuration,
        duration: burstDuration,
        hold: holdDuration,
      });
    }

    return stepTimings;
  };

  // Helper function to calculate scale values
  const calculateScaleValues = (steps: number): number[] => {
    const scales: number[] = [1]; // Start at scale 1
    const scaleIncrement = 0.5; // Increase by 0.5 each step

    for (let i = 1; i <= steps; i++) {
      scales.push(1 + i * scaleIncrement);
    }

    return scales;
  };

  // Helper function to calculate rotation values
  const calculateRotations = (steps: number, maxRotation: number): number[] => {
    const rotations: number[] = [0];
    const alternatingSign = [-1, 1, -1, 1, -1];

    for (let i = 1; i <= steps; i++) {
      rotations.push(maxRotation * alternatingSign[i % 5]);
    }

    return rotations;
  };

  const stepTimings = calculateStepTimings(duration, zoomSteps);
  const scaleValues = calculateScaleValues(zoomSteps);
  const rotationValues = calculateRotations(zoomSteps, rotationAmount);

  // Build image effects
  const imageEffects: any[] = [];

  // Create zoom burst effects and hold effects
  for (let i = 0; i < zoomSteps; i++) {
    const timing = stepTimings[i];
    const currentScale = scaleValues[i];
    const nextScale = scaleValues[i + 1];
    const currentRotation = rotationValues[i];
    const nextRotation = rotationValues[i + 1];

    // Zoom burst effect
    imageEffects.push({
      id: `zoom-burst-${i}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: timing.start,
        duration: timing.duration,
        mode: 'provider',
        targetIds: ['snap-zoom-image'],
        ranges: [
          { key: 'scale', val: currentScale, prog: 0 },
          { key: 'scale', val: nextScale, prog: 1 },
          { key: 'rotate', val: currentRotation, prog: 0 },
          { key: 'rotate', val: nextRotation, prog: 1 },
        ],
      },
    });

    // Hold effect
    imageEffects.push({
      id: `hold-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: timing.start + timing.duration,
        duration: timing.hold,
        mode: 'provider',
        targetIds: ['snap-zoom-image'],
        ranges: [
          { key: 'scale', val: nextScale, prog: 0 },
          { key: 'scale', val: nextScale, prog: 1 },
          { key: 'rotate', val: nextRotation, prog: 0 },
          { key: 'rotate', val: nextRotation, prog: 1 },
        ],
      },
    });

    // Shake effect during burst
    const shakeOffsets = [
      [0, 0],
      [5, -3],
      [-5, 3],
      [3, -2],
      [0, 0],
    ];
    imageEffects.push({
      id: `shake-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: timing.start,
        duration: timing.duration,
        mode: 'provider',
        targetIds: ['snap-zoom-image'],
        ranges: shakeOffsets.flatMap((offset, idx) => [
          {
            key: 'translateX',
            val: offset[0],
            prog: idx / (shakeOffsets.length - 1),
          },
          {
            key: 'translateY',
            val: offset[1],
            prog: idx / (shakeOffsets.length - 1),
          },
        ]),
      },
    });
  }

  // Chromatic aberration effect (contrast and saturation during movement)
  const chromaticRanges: any[] = [];
  for (let i = 0; i < zoomSteps; i++) {
    const timing = stepTimings[i];
    const burstProg = timing.start / duration;
    const holdProg = (timing.start + timing.duration) / duration;

    chromaticRanges.push(
      { key: 'contrast', val: 1, prog: burstProg },
      { key: 'contrast', val: 1.1, prog: burstProg + 0.01 },
      { key: 'contrast', val: 1, prog: holdProg },
      { key: 'saturate', val: 1, prog: burstProg },
      { key: 'saturate', val: 1.2, prog: burstProg + 0.01 },
      { key: 'saturate', val: 1, prog: holdProg },
    );
  }

  imageEffects.push({
    id: 'chromatic-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['snap-zoom-image'],
      ranges: chromaticRanges,
    },
  });

  // Build flash overlay effects
  const flashOverlays: RenderableComponentData[] = [];

  for (let i = 0; i < zoomSteps; i++) {
    const timing = stepTimings[i];

    flashOverlays.push({
      id: `flash-overlay-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="absolute inset-0 bg-white pointer-events-none"></div>`,
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `flash-spike-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: timing.start,
            duration: 0.1,
            mode: 'provider',
            targetIds: [`flash-overlay-${i}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: flashIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Build image component
  const imageComponent: RenderableComponentData = {
    id: 'snap-zoom-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: imageUrl,
      className: 'w-full h-full object-cover',
      style: {
        willChange: 'transform, opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: imageEffects,
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'snap-zoom-burst-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full bg-black',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [imageComponent, ...flashOverlays],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'snap-zoom-burst',
  title: 'Snap Zoom Burst',
  description:
    'Dynamic snap zoom preset inspired by modern social media and YouTube editing. Features energetic, stepped zoom bursts with hold frames, rotation, flash effects, and chromatic aberration for attention-grabbing emphasis on reactions and surprising moments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'zoom',
    'snap',
    'burst',
    'social-media',
    'youtube',
    'energetic',
    'attention',
    'flash',
    'rotation',
    'chromatic',
  ],
  defaultInputParams: {
    imageUrl: 'https://example.com/image.jpg',
    zoomSteps: 3,
    rotationAmount: 2,
    flashIntensity: 0.7,
    duration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const snapZoomBurstPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
