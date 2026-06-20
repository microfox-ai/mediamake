/**
 * Editorial Rhythm Cut Preset
 *
 * A high-energy video editing preset that applies rapid, rhythmic frame manipulations
 * inspired by music video editing and kinetic typography. Creates beat-synchronized
 * visual effects including:
 *
 * - **Zoom Punches**: Rapid scale animations (1.0 → 1.3 → 1.0) on beats
 * - **Position Jumps**: Quick translateX/Y shifts creating "broken film" aesthetic
 * - **Rotation Snaps**: Sharp rotation effects (0° → 12° → 0°) for energy
 * - **Glitch Duplication**: Multiple offset video copies with screen blend mode
 * - **Color Effects**: Momentary desaturation, hue shifts, and color flashes
 * - **Steady Pulse**: Continuous scale oscillation throughout duration
 *
 * **Rhythm Patterns**:
 * 1. Steady 4/4: Regular beat intervals (every 60/bpm seconds)
 * 2. Syncopated: Irregular beat pattern with custom offset array
 * 3. Accelerating: Progressively decreasing intervals between beats
 *
 * **Intensity Levels** (1-3):
 * - Low (1): Subtle scale (1.05), small jumps (±30px)
 * - Medium (2): Moderate scale (1.15), medium jumps (±60px)
 * - High (3): Aggressive scale (1.3), large jumps (±100px)
 *
 * Use cases:
 * - Music videos with beat-synced cuts
 * - High-energy social media content
 * - Adding visual punctuation to key moments
 * - Creating kinetic, rhythm-driven visuals
 * - Promotional videos with dynamic energy
 */

import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  videoSrc: z.string().describe('Source URL or path for the primary video'),
  
  bpm: z
    .number()
    .min(60)
    .max(200)
    .default(120)
    .describe('Beats per minute for rhythm synchronization (60-200)'),
  
  rhythmPattern: z
    .enum(['steady', 'syncopated', 'accelerating'])
    .default('steady')
    .describe(
      'Rhythm pattern: steady (regular beats), syncopated (irregular pattern), accelerating (progressive speed-up)',
    ),
  
  intensity: z
    .number()
    .min(1)
    .max(3)
    .default(2)
    .describe(
      'Effect intensity level (1=subtle, 2=moderate, 3=aggressive) - controls scale, position jump amplitude',
    ),
  
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the preset in seconds'),
  
  enableGlitch: z
    .boolean()
    .default(true)
    .describe('Enable glitch-style frame duplication effects'),
  
  enableColorEffects: z
    .boolean()
    .default(true)
    .describe('Enable color effects (desaturation, hue shifts, color flashes)'),
  
  syncopatedPattern: z
    .array(z.number())
    .default([0, 0.5, 1.5, 2, 3.5])
    .describe(
      'Beat offset pattern for syncopated rhythm (in beats). Example: [0, 0.5, 1.5, 2, 3.5]',
    ),
  
  effectColors: z
    .object({
      colorFlash: z.string().default('cyan').describe('Color for flash overlay effect'),
    })
    .default({ colorFlash: 'cyan' })
    .describe('Color configuration for various effects'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videoSrc,
    bpm,
    rhythmPattern,
    intensity,
    duration,
    enableGlitch,
    enableColorEffects,
    syncopatedPattern,
    effectColors,
  } = params;

  // Helper: Calculate beat times based on rhythm pattern
  const calculateBeatTimes = (
    pattern: string,
    bpm: number,
    duration: number,
    syncopatedPattern: number[],
  ): number[] => {
    const beatInterval = 60 / bpm; // seconds per beat
    const beatTimes: number[] = [];

    if (pattern === 'steady') {
      // Regular beats
      let time = 0;
      while (time < duration) {
        beatTimes.push(time);
        time += beatInterval;
      }
    } else if (pattern === 'syncopated') {
      // Irregular pattern based on syncopatedPattern array
      let cycle = 0;
      while (cycle * beatInterval < duration) {
        for (const offset of syncopatedPattern) {
          const time = (cycle + offset) * beatInterval;
          if (time < duration) {
            beatTimes.push(time);
          }
        }
        cycle += Math.max(...syncopatedPattern) + 1;
      }
    } else if (pattern === 'accelerating') {
      // Progressively decreasing intervals
      let time = 0;
      let currentInterval = beatInterval;
      const accelerationFactor = 0.9; // Each beat is 10% faster
      while (time < duration) {
        beatTimes.push(time);
        time += currentInterval;
        currentInterval *= accelerationFactor;
        currentInterval = Math.max(currentInterval, 0.1); // Minimum 0.1s interval
      }
    }

    return beatTimes;
  };

  // Helper: Get intensity-based values
  const getIntensityValues = (intensity: number) => {
    const scales = [1.05, 1.15, 1.3];
    const jumpsX = [30, 60, 100];
    const jumpsY = [20, 40, 70];
    const rotations = [5, 10, 15];

    const index = Math.min(Math.max(intensity - 1, 0), 2);

    return {
      scale: scales[index],
      jumpX: jumpsX[index],
      jumpY: jumpsY[index],
      rotation: rotations[index],
    };
  };

  const intensityValues = getIntensityValues(intensity);
  const beatTimes = calculateBeatTimes(rhythmPattern, bpm, duration, syncopatedPattern);

  // Distribute effects across beat times (cycle through effect types)
  const effectTypes = ['zoom', 'position', 'rotation', 'glitch', 'desaturate', 'hue', 'colorFlash'];
  const effects: any[] = [];

  // Primary video effects
  const primaryVideoEffects: any[] = [];

  // Add steady pulse effect (continuous throughout)
  primaryVideoEffects.push({
    id: 'effect-steady-pulse',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['editorial-primary-video'],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1 + (intensityValues.scale - 1) * 0.5, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  });

  // Distribute beat effects
  beatTimes.forEach((beatTime, index) => {
    const effectType = effectTypes[index % effectTypes.length];

    if (effectType === 'zoom') {
      primaryVideoEffects.push({
        id: `effect-zoom-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: beatTime,
          duration: 0.2,
          mode: 'provider',
          targetIds: ['editorial-primary-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: intensityValues.scale, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      });
    } else if (effectType === 'position') {
      primaryVideoEffects.push({
        id: `effect-position-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: beatTime,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['editorial-primary-video'],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: `${intensityValues.jumpX}px`, prog: 0.5 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: `-${intensityValues.jumpY}px`, prog: 0.5 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      });
    } else if (effectType === 'rotation') {
      primaryVideoEffects.push({
        id: `effect-rotation-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: beatTime,
          duration: 0.15,
          mode: 'provider',
          targetIds: ['editorial-primary-video'],
          ranges: [
            { key: 'rotate', val: '0deg', prog: 0 },
            { key: 'rotate', val: `${intensityValues.rotation}deg`, prog: 0.4 },
            { key: 'rotate', val: '0deg', prog: 1 },
          ],
        },
      });
    } else if (effectType === 'desaturate' && enableColorEffects) {
      primaryVideoEffects.push({
        id: `effect-desaturate-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: beatTime,
          duration: 0.15,
          mode: 'provider',
          targetIds: ['editorial-primary-video'],
          ranges: [
            { key: 'filter', val: 'grayscale(0%)', prog: 0 },
            { key: 'filter', val: 'grayscale(100%)', prog: 0.5 },
            { key: 'filter', val: 'grayscale(0%)', prog: 1 },
          ],
        },
      });
    } else if (effectType === 'hue' && enableColorEffects) {
      primaryVideoEffects.push({
        id: `effect-hue-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: beatTime,
          duration: 0.12,
          mode: 'provider',
          targetIds: ['editorial-primary-video'],
          ranges: [
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'hue-rotate(180deg)', prog: 0.5 },
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
          ],
        },
      });
    }
  });

  // Glitch layer effects
  const glitchLayer1Effects: any[] = [];
  const glitchLayer2Effects: any[] = [];

  if (enableGlitch) {
    beatTimes.forEach((beatTime, index) => {
      if (index % 4 === 3) {
        // Glitch on every 4th beat
        glitchLayer1Effects.push({
          id: `effect-glitch1-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: beatTime,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['editorial-glitch-layer1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: '15px', prog: 0.5 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: '-10px', prog: 0.5 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        });

        glitchLayer2Effects.push({
          id: `effect-glitch2-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: beatTime,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['editorial-glitch-layer2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.4, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: '-12px', prog: 0.5 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: '8px', prog: 0.5 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        });
      }
    });
  }

  // Color overlay effects
  const colorOverlayEffects: any[] = [];

  if (enableColorEffects) {
    beatTimes.forEach((beatTime, index) => {
      if (index % 7 === 6) {
        // Color flash on every 7th beat
        colorOverlayEffects.push({
          id: `effect-color-flash-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: beatTime,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['editorial-color-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        });
      }
    });
  }

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Primary video
    {
      id: 'editorial-primary-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: videoSrc,
        fit: 'cover',
      },
      props: {
        className: 'absolute inset-0 w-full h-full',
        style: { zIndex: 1 },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: primaryVideoEffects,
    } as RenderableComponentData,

    // Glitch layer 1
    ...(enableGlitch
      ? [
          {
            id: 'editorial-glitch-layer1',
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: videoSrc,
              fit: 'cover',
            },
            props: {
              className: 'absolute inset-0 w-full h-full mix-blend-screen',
              style: { zIndex: 2, opacity: 0 },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: glitchLayer1Effects,
          } as RenderableComponentData,
        ]
      : []),

    // Glitch layer 2
    ...(enableGlitch
      ? [
          {
            id: 'editorial-glitch-layer2',
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: videoSrc,
              fit: 'cover',
            },
            props: {
              className: 'absolute inset-0 w-full h-full mix-blend-screen',
              style: { zIndex: 3, opacity: 0 },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: glitchLayer2Effects,
          } as RenderableComponentData,
        ]
      : []),

    // Color overlay
    ...(enableColorEffects
      ? [
          {
            id: 'editorial-color-overlay',
            type: 'atom',
            componentId: 'ShapeAtom',
            data: {
              shape: 'rectangle',
            },
            props: {
              className: 'absolute inset-0 w-full h-full pointer-events-none',
              style: {
                zIndex: 10,
                opacity: 0,
                backgroundColor: effectColors.colorFlash,
                mixBlendMode: 'multiply',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: colorOverlayEffects,
          } as RenderableComponentData,
        ]
      : []),
  ];

  // Root container
  const rootContainer = {
    id: 'editorial-rhythm-cut-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: childrenData,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
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
  id: 'editorial-rhythm-cut',
  title: 'Editorial Rhythm Cut',
  description:
    'A high-energy video editing preset that applies rapid, rhythmic frame manipulations inspired by music video editing. Features beat-synchronized zoom punches, position jumps creating a "broken film" aesthetic, rotation snaps, glitch-style frame duplication with offset copies, and color effects like momentary desaturation and hue shifts. Supports three rhythm patterns (steady 4/4, syncopated, accelerating) and adjustable intensity levels. Ideal for music videos, high-energy content, and adding visual punctuation to key moments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'video',
    'rhythm',
    'beat-sync',
    'music-video',
    'glitch',
    'kinetic',
    'editorial',
    'high-energy',
    'effects',
  ],
  defaultInputParams: {
    videoSrc: 'https://example.com/video.mp4',
    bpm: 120,
    rhythmPattern: 'steady',
    intensity: 2,
    duration: 10,
    enableGlitch: true,
    enableColorEffects: true,
    syncopatedPattern: [0, 0.5, 1.5, 2, 3.5],
    effectColors: {
      colorFlash: 'cyan',
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const editorialRhythmCutPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
