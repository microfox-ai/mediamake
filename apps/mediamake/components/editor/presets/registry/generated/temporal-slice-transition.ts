/**
 * Temporal Slice Transition Preset
 *
 * Creates a sophisticated time-displacement transition effect where videos are divided 
 * into 20 vertical strips. Each strip shows a different moment in time (temporal offset), 
 * creating a distinctive "time smear" effect where the leftmost strips show earlier 
 * moments while rightmost strips show later moments.
 *
 * During the 1.4-second overlap period, strips animate with:
 * - Staggered opacity fades (50ms delays per strip for ripple effect)
 * - Sine wave vertical displacement that ripples across the screen
 * - Slight width variations (scaleX) synchronized with wave motion
 * - Dynamic blur effect that peaks with wave displacement
 *
 * Features:
 * - **Temporal Displacement**: Each strip plays from a different timestamp (offset by stripIndex * 0.1s)
 * - **Wave Displacement**: Sine wave animation creates rippling motion across strips
 * - **Staggered Transitions**: 50ms delay per strip creates left-to-right ripple
 * - **Dynamic Blur**: Blur intensity synchronized with wave peaks
 * - **Scale Variations**: Width pulsing adds depth to wave motion
 * - **Clean Edges**: overflow:hidden ensures crisp strip boundaries
 *
 * Use cases:
 * - Creative video transitions with time-warping effect
 * - Music video transitions with rhythmic displacement
 * - Artistic storytelling with temporal distortion
 * - Sci-fi or experimental video effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of first video'),
    duration: z.number().describe('Duration of first video in seconds'),
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of second video'),
    duration: z.number().describe('Duration of second video in seconds'),
  }).describe('Second video configuration'),
  transitionDuration: z
    .number()
    .default(1.4)
    .describe('Duration of transition overlap in seconds'),
  stripCount: z
    .number()
    .default(20)
    .describe('Number of vertical strips to divide videos into'),
  temporalOffset: z
    .number()
    .default(0.1)
    .describe('Time offset per strip in seconds (stripIndex * temporalOffset)'),
  staggerDelay: z
    .number()
    .default(0.05)
    .describe('Delay between strip animations in seconds (50ms default)'),
  waveAmplitude: z
    .number()
    .default(30)
    .describe('Maximum vertical displacement in pixels for wave effect'),
  waveFrequency: z
    .number()
    .default(2)
    .describe('Frequency of sine wave (affects wave count across screen)'),
  maxBlur: z
    .number()
    .default(2)
    .describe('Maximum blur in pixels at wave peaks'),
  scaleVariation: z
    .number()
    .default(0.05)
    .describe('Maximum scaleX variation (0.05 = 5% width change)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    stripCount,
    temporalOffset,
    staggerDelay,
    waveAmplitude,
    waveFrequency,
    maxBlur,
    scaleVariation,
  } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate strip width percentage
  const stripWidthPercent = 100 / stripCount;

  // Helper: Create wave displacement effect ranges
  const createWaveEffect = (
    stripIndex: number,
    isOutgoing: boolean,
  ): Array<{ key: string; val: any; prog: number }> => {
    const phaseOffset = (stripIndex / stripCount) * Math.PI * waveFrequency;
    const ranges = [];

    // Create smooth sine wave motion with 5 keyframes
    for (let i = 0; i <= 4; i++) {
      const prog = i / 4;
      const time = prog * Math.PI * 2; // Full sine wave cycle
      const displacement =
        Math.sin(time + phaseOffset) * waveAmplitude * (isOutgoing ? 1 : -1);

      ranges.push({
        key: 'translateY',
        val: `${displacement}px`,
        prog,
      });
    }

    return ranges;
  };

  // Helper: Create blur effect synchronized with wave
  const createBlurEffect = (
    stripIndex: number,
  ): Array<{ key: string; val: any; prog: number }> => {
    const phaseOffset = (stripIndex / stripCount) * Math.PI * waveFrequency;
    const ranges = [];

    for (let i = 0; i <= 4; i++) {
      const prog = i / 4;
      const time = prog * Math.PI * 2;
      const intensity = Math.abs(Math.sin(time + phaseOffset));
      const blurValue = intensity * maxBlur;

      ranges.push({
        key: 'filter',
        val: `blur(${blurValue}px)`,
        prog,
      });
    }

    return ranges;
  };

  // Helper: Create scale variation effect
  const createScaleEffect = (
    stripIndex: number,
  ): Array<{ key: string; val: any; prog: number }> => {
    const phaseOffset = (stripIndex / stripCount) * Math.PI * waveFrequency;
    const ranges = [];

    for (let i = 0; i <= 4; i++) {
      const prog = i / 4;
      const time = prog * Math.PI * 2;
      const scale = 1 + Math.abs(Math.sin(time + phaseOffset)) * scaleVariation;

      ranges.push({
        key: 'scaleX',
        val: scale,
        prog,
      });
    }

    return ranges;
  };

  // Create all strip containers with video atoms
  const stripContainers: RenderableComponentData[] = [];

  for (let i = 0; i < stripCount; i++) {
    const stripId = `strip-${i}`;
    const leftPosition = i * stripWidthPercent;
    const stripTemporalOffset = i * temporalOffset;
    const stripStaggerDelay = i * staggerDelay;

    // Video1 (outgoing) in this strip
    const video1StripId = `video1-${stripId}`;
    const video1Effects = [
      // Opacity fade out with stagger
      {
        id: `fade-out-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: video1.duration - transitionDuration + stripStaggerDelay,
          duration: transitionDuration - stripStaggerDelay,
          mode: 'provider' as const,
          targetIds: [video1StripId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Wave displacement
      {
        id: `wave-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [video1StripId],
          ranges: createWaveEffect(i, true),
        },
      },
      // Blur effect
      {
        id: `blur-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [video1StripId],
          ranges: createBlurEffect(i),
        },
      },
      // Scale variation
      {
        id: `scale-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [video1StripId],
          ranges: createScaleEffect(i),
        },
      },
    ];

    const video1Atom: RenderableComponentData = {
      id: video1StripId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        startFrom: stripTemporalOffset,
        fit: 'cover',
        className: 'absolute inset-0',
        style: {
          objectPosition: `${leftPosition + stripWidthPercent / 2}% center`,
          width: `${stripCount * 100}%`,
          left: `${-i * 100}%`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: video1Effects,
    };

    // Video2 (incoming) in this strip
    const video2StripId = `video2-${stripId}`;
    const video2Effects = [
      // Opacity fade in with stagger
      {
        id: `fade-in-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: stripStaggerDelay,
          duration: transitionDuration - stripStaggerDelay,
          mode: 'provider' as const,
          targetIds: [video2StripId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Wave displacement (opposite direction)
      {
        id: `wave-in-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [video2StripId],
          ranges: createWaveEffect(i, false),
        },
      },
      // Blur effect
      {
        id: `blur-in-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [video2StripId],
          ranges: createBlurEffect(i),
        },
      },
      // Scale variation
      {
        id: `scale-in-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [video2StripId],
          ranges: createScaleEffect(i),
        },
      },
    ];

    const video2Atom: RenderableComponentData = {
      id: video2StripId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        startFrom: stripTemporalOffset,
        fit: 'cover',
        className: 'absolute inset-0',
        style: {
          objectPosition: `${leftPosition + stripWidthPercent / 2}% center`,
          width: `${stripCount * 100}%`,
          left: `${-i * 100}%`,
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration + transitionDuration,
        },
      },
      effects: video2Effects,
    };

    // Strip container
    const stripContainer: RenderableComponentData = {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            width: `${stripWidthPercent}%`,
            height: '100%',
            overflow: 'hidden',
            position: 'absolute' as const,
            left: `${leftPosition}%`,
            top: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [video1Atom, video2Atom],
    };

    stripContainers.push(stripContainer);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'temporal-slice-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: stripContainers,
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
  id: 'temporal-slice-transition',
  title: 'Temporal Slice Transition',
  description:
    'Creates a temporal displacement transition effect where videos are divided into vertical strips, each showing a different moment in time. During transition, strips animate with wave displacement, staggered opacity fades, and synchronized blur effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'temporal', 'time-displacement', 'wave', 'strips'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 1.4,
    stripCount: 20,
    temporalOffset: 0.1,
    staggerDelay: 0.05,
    waveAmplitude: 30,
    waveFrequency: 2,
    maxBlur: 2,
    scaleVariation: 0.05,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const temporalSliceTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};