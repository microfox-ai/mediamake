/**
 * Vintage Film Projector Typokinetics Preset
 *
 * This preset mimics the mechanical rhythm and aesthetic of vintage film projectors,
 * creating text animations that breathe with the 24fps pulse of classic cinema.
 * Features include:
 * - Mechanical breathing rhythm (scale oscillation at 24fps intervals)
 * - Timing jitter (±100ms micro-variations) for authentic mechanical feel
 * - Horizontal gate weave (±2px random translateX every 3 frames)
 * - Brightness flicker (simulates projector lamp intensity variations)
 * - Film grain overlay with intensity modulation during scale peaks
 * - Caption mode with frame-synced word reveals (step-end behavior)
 *
 * Use cases:
 * - Retro title sequences with vintage film aesthetic
 * - Nostalgic text overlays for historical/archival content
 * - Artistic projects requiring authentic analog film imperfections
 * - Credits sequences mimicking classic cinema projection
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  // Text configuration
  text: z
    .string()
    .optional()
    .describe('Static text to display (ignored if captions provided)'),
  fontSize: z
    .number()
    .default(48)
    .describe('Base font size in pixels (default: 48)'),
  fontFamily: z
    .string()
    .default('Courier New')
    .describe('Font family (default: Courier New for typewriter aesthetic)'),
  textColor: z
    .string()
    .default('#FFC04D')
    .describe('Text color (default: amber-100 for warm film look)'),

  // Caption mode
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
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
      }),
    )
    .optional()
    .describe(
      'Array of caption sentences with word-level timing for frame-synced reveals',
    ),

  // Timing
  duration: z
    .number()
    .default(10)
    .describe('Duration in seconds (ignored if captions provided)'),

  // Projector rhythm parameters
  fps: z
    .number()
    .default(24)
    .describe('Frame rate for projector rhythm (default: 24fps)'),
  breathingScaleMin: z
    .number()
    .default(1.0)
    .describe('Minimum scale value for breathing effect (default: 1.0)'),
  breathingScaleMax: z
    .number()
    .default(1.06)
    .describe('Maximum scale value for breathing effect (default: 1.06)'),
  timingJitter: z
    .number()
    .default(100)
    .describe(
      'Maximum timing jitter in milliseconds for mechanical imperfection (default: 100ms)',
    ),

  // Gate weave parameters
  gateWeaveAmount: z
    .number()
    .default(2)
    .describe(
      'Maximum horizontal gate weave in pixels (default: 2px, ±2px range)',
    ),
  gateWeaveFrameInterval: z
    .number()
    .default(3)
    .describe('Update gate weave every N frames (default: 3 frames)'),

  // Flicker parameters
  flickerIntensityMin: z
    .number()
    .default(1.0)
    .describe('Minimum brightness for flicker effect (default: 1.0)'),
  flickerIntensityMax: z
    .number()
    .default(1.1)
    .describe('Maximum brightness for flicker effect (default: 1.1)'),

  // Grain overlay
  grainOpacityBase: z
    .number()
    .default(0.2)
    .describe('Base grain overlay opacity (default: 0.2)'),
  grainOpacityPeak: z
    .number()
    .default(0.3)
    .describe('Peak grain overlay opacity during scale peaks (default: 0.3)'),
  grainTextureSrc: z
    .string()
    .default(
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noise)" opacity="0.5"/%3E%3C/svg%3E',
    )
    .describe('Grain texture source URL or data URI (SVG noise by default)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    textColor,
    captions,
    duration,
    fps,
    breathingScaleMin,
    breathingScaleMax,
    timingJitter,
    gateWeaveAmount,
    gateWeaveFrameInterval,
    flickerIntensityMin,
    flickerIntensityMax,
    grainOpacityBase,
    grainOpacityPeak,
    grainTextureSrc,
  } = params;

  // Helper: Create projector rhythm timing helper
  const createProjectorRhythm = (
    baseFps: number,
    jitterMs: number,
  ): { frameDuration: number; getJitteredDuration: () => number } => {
    const frameDuration = 1000 / baseFps; // Base frame duration in ms
    const getJitteredDuration = () => {
      const jitter = (Math.random() * 2 - 1) * jitterMs; // ±jitterMs
      return (frameDuration + jitter) / 1000; // Return in seconds
    };
    return { frameDuration, getJitteredDuration };
  };

  // Helper: Generate gate weave keyframes
  const generateGateWeaveRanges = (
    totalDuration: number,
    weaveAmount: number,
    frameInterval: number,
    baseFps: number,
  ) => {
    const ranges = [];
    const frameDuration = 1 / baseFps;
    const updateInterval = frameDuration * frameInterval;
    const numUpdates = Math.floor(totalDuration / updateInterval);

    for (let i = 0; i <= numUpdates; i++) {
      const prog = i / numUpdates;
      const randomOffset = (Math.random() * 2 - 1) * weaveAmount; // ±weaveAmount
      ranges.push({ key: 'translateX', val: `${randomOffset}px`, prog });
    }

    return ranges;
  };

  // Helper: Generate breathing scale keyframes with jitter
  const generateBreathingRanges = (
    totalDuration: number,
    scaleMin: number,
    scaleMax: number,
    baseFps: number,
  ) => {
    const ranges = [];
    const frameDuration = 1 / baseFps;
    const numFrames = Math.floor(totalDuration / frameDuration);
    const breathingCycleDuration = 1.0; // 1 second breathing cycle
    const framesPerCycle = Math.floor(breathingCycleDuration / frameDuration);

    for (let i = 0; i <= numFrames; i++) {
      const cycleProgress = (i % framesPerCycle) / framesPerCycle;
      // Sinusoidal breathing: scale oscillates smoothly
      const scale =
        scaleMin + (scaleMax - scaleMin) * (0.5 + 0.5 * Math.sin(cycleProgress * Math.PI * 2));
      const prog = i / numFrames;
      ranges.push({ key: 'scale', val: scale, prog });
    }

    return ranges;
  };

  // Helper: Generate flicker brightness keyframes
  const generateFlickerRanges = (
    totalDuration: number,
    minBrightness: number,
    maxBrightness: number,
    baseFps: number,
  ) => {
    const ranges = [];
    const frameDuration = 1 / baseFps;
    const numFrames = Math.floor(totalDuration / frameDuration);

    for (let i = 0; i <= numFrames; i++) {
      const randomBrightness =
        minBrightness + Math.random() * (maxBrightness - minBrightness);
      const prog = i / numFrames;
      ranges.push({ key: 'filter', val: `brightness(${randomBrightness})`, prog });
    }

    return ranges;
  };

  // Helper: Generate grain intensity keyframes (synced with breathing)
  const generateGrainIntensityRanges = (
    totalDuration: number,
    baseOpacity: number,
    peakOpacity: number,
    baseFps: number,
  ) => {
    const ranges = [];
    const frameDuration = 1 / baseFps;
    const numFrames = Math.floor(totalDuration / frameDuration);
    const breathingCycleDuration = 1.0;
    const framesPerCycle = Math.floor(breathingCycleDuration / frameDuration);

    for (let i = 0; i <= numFrames; i++) {
      const cycleProgress = (i % framesPerCycle) / framesPerCycle;
      // Grain intensity peaks when scale peaks
      const opacity =
        baseOpacity +
        (peakOpacity - baseOpacity) *
          (0.5 + 0.5 * Math.sin(cycleProgress * Math.PI * 2));
      const prog = i / numFrames;
      ranges.push({ key: 'opacity', val: opacity, prog });
    }

    return ranges;
  };

  // Helper: Create frame-synced word reveal effect (step-end behavior)
  const createFrameSyncedWordEffect = (
    wordStart: number,
    baseFps: number,
  ) => {
    // Calculate nearest frame boundary
    const frameDuration = 1 / baseFps;
    const frameIndex = Math.floor(wordStart / frameDuration);
    const frameStartTime = frameIndex * frameDuration;

    // Sharp transition: opacity 0 → 1 at frame boundary
    return {
      id: `frame-sync-reveal-${Math.random().toString(36).substr(2, 9)}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: frameStartTime + frameDuration * 0.1, // Slightly past frame boundary
        mode: 'provider' as const,
        targetIds: [] as string[], // Will be set by caller
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0, prog: Math.max(0, (frameStartTime - 0.01) / (frameStartTime + frameDuration * 0.1)) },
          { key: 'opacity', val: 1, prog: frameStartTime / (frameStartTime + frameDuration * 0.1) },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };
  };

  // ============================================================================
  // BUILD COMPOSITION
  // ============================================================================

  const childrenData: RenderableComponentData[] = [];
  let totalDuration = duration;

  // ============================================================================
  // MODE 1: CAPTION MODE (word-by-word frame-synced reveals)
  // ============================================================================

  if (captions && captions.length > 0) {
    totalDuration = Math.max(...captions.map(c => c.absoluteEnd));

    captions.forEach(caption => {
      const captionId = `caption-${caption.id}`;

      // Create word components with frame-synced reveal
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `${captionId}-word-${wordIndex}`;

          // Frame-synced reveal effect
          const wordEffect = createFrameSyncedWordEffect(word.start, fps);
          wordEffect.data.targetIds = [wordId];

          return {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                fontWeight: 'normal',
                marginRight: '0.3em',
              },
              font: {
                family: fontFamily,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [wordEffect],
          } as RenderableComponentData;
        },
      );

      // Caption container with horizontal layout
      const captionContainer: RenderableComponentData = {
        id: `${captionId}-text-container`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute inset-0 flex flex-row items-center justify-center flex-wrap',
            style: {
              gap: '0',
              textShadow: '0 0 10px rgba(255, 191, 0, 0.3)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: wordComponents,
      };

      // Wrap caption in outer container for effects
      const captionRoot: RenderableComponentData = {
        id: captionId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [captionContainer],
        effects: [
          // Breathing scale effect
          {
            id: `${captionId}-breathing-effect`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: caption.duration,
              mode: 'provider' as const,
              targetIds: [`${captionId}-text-container`],
              ranges: generateBreathingRanges(
                caption.duration,
                breathingScaleMin,
                breathingScaleMax,
                fps,
              ),
            },
          },
          // Gate weave effect
          {
            id: `${captionId}-gate-weave-effect`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: caption.duration,
              mode: 'provider' as const,
              targetIds: [`${captionId}-text-container`],
              ranges: generateGateWeaveRanges(
                caption.duration,
                gateWeaveAmount,
                gateWeaveFrameInterval,
                fps,
              ),
            },
          },
        ],
      };

      childrenData.push(captionRoot);
    });
  }

  // ============================================================================
  // MODE 2: STATIC TEXT MODE (simple display with projector effects)
  // ============================================================================

  if (!captions && text) {
    const textContainerId = 'projector-text-container';

    const textContainer: RenderableComponentData = {
      id: textContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
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
          id: 'projector-text',
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text,
            className: 'font-mono text-amber-100',
            style: {
              fontSize: `${fontSize}px`,
              textShadow: '0 0 10px rgba(255, 191, 0, 0.3)',
              color: textColor,
            },
            font: {
              family: fontFamily,
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
      effects: [
        // Breathing scale effect
        {
          id: 'breathing-scale-effect',
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: 0,
            duration: totalDuration,
            mode: 'provider' as const,
            targetIds: ['projector-text'],
            ranges: generateBreathingRanges(
              totalDuration,
              breathingScaleMin,
              breathingScaleMax,
              fps,
            ),
          },
        },
        // Gate weave effect
        {
          id: 'gate-weave-effect',
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: 0,
            duration: totalDuration,
            mode: 'provider' as const,
            targetIds: ['projector-text'],
            ranges: generateGateWeaveRanges(
              totalDuration,
              gateWeaveAmount,
              gateWeaveFrameInterval,
              fps,
            ),
          },
        },
      ],
    };

    childrenData.push(textContainer);
  }

  // ============================================================================
  // GRAIN OVERLAY (always present)
  // ============================================================================

  const grainOverlayId = 'grain-overlay';
  const grainOverlay: RenderableComponentData = {
    id: grainOverlayId,
    type: 'atom' as const,
    componentId: 'ImageAtom',
    data: {
      src: grainTextureSrc,
      style: {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        mixBlendMode: 'overlay',
        opacity: grainOpacityBase,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Grain intensity modulation (synced with breathing)
      {
        id: 'grain-intensity-effect',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: totalDuration,
          mode: 'provider' as const,
          targetIds: [grainOverlayId],
          ranges: generateGrainIntensityRanges(
            totalDuration,
            grainOpacityBase,
            grainOpacityPeak,
            fps,
          ),
        },
      },
    ],
  };

  childrenData.push(grainOverlay);

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainerId = 'vintage-projector-root';
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData,
    effects: [
      // Brightness flicker effect (applied to root for global flicker)
      {
        id: 'brightness-flicker-effect',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: totalDuration,
          mode: 'provider' as const,
          targetIds: [rootContainerId],
          ranges: generateFlickerRanges(
            totalDuration,
            flickerIntensityMin,
            flickerIntensityMax,
            fps,
          ),
        },
      },
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
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'vintage-projector-typokinetics',
  title: 'Vintage Film Projector Typokinetics',
  description:
    'A typokinetic text preset mimicking vintage film projector aesthetics with mechanical breathing rhythm at 24fps intervals, gate weave horizontal jitter, brightness flicker, and film grain overlay. Features ±100ms timing jitter for authentic mechanical feel rather than digital precision. Supports caption mode with frame-synced word reveals using step-end behavior.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'vintage',
    'film',
    'projector',
    'retro',
    'mechanical',
    'grain',
    'flicker',
    'breathing',
    'gate-weave',
    'captions',
    'text',
  ],
  defaultInputParams: {
    text: 'VINTAGE CINEMA',
    fontSize: 48,
    fontFamily: 'Courier New',
    textColor: '#FFC04D',
    duration: 10,
    fps: 24,
    breathingScaleMin: 1.0,
    breathingScaleMax: 1.06,
    timingJitter: 100,
    gateWeaveAmount: 2,
    gateWeaveFrameInterval: 3,
    flickerIntensityMin: 1.0,
    flickerIntensityMax: 1.1,
    grainOpacityBase: 0.2,
    grainOpacityPeak: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const vintageProjectorTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
