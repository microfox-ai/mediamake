/**
 * 90s VHS Tape Degradation Transition Preset
 *
 * This preset simulates the physical degradation and wear of magnetic tape from a VHS cassette
 * that's been played hundreds of times. It creates an authentic analog video aesthetic with:
 *
 * Features:
 * - **Horizontal Tracking Bands**: Severe distortion bands that sweep across the frame with
 *   staggered timing, simulating tape tracking issues
 * - **Tape Crinkle Effects**: Localized warping effects that mimic bent or damaged tape areas
 * - **Dropout Compensation**: Random white/black pixel flashes that simulate magnetic dropout
 * - **Blue-Purple Color Cast**: Characteristic degraded magnetic tape color tint with pulsing intensity
 * - **AGC Brightness Pumping**: Automatic gain control fluctuations where brightness hunts for
 *   correct exposure level (asymmetric timing: fast brightening, slower dimming)
 * - **Head-Switching Noise**: Horizontal interference band at the bottom of the frame
 * - **Heavy Animated Grain**: Large, visible film grain particles animated at 8fps for analog feel
 * - **Mechanical Timing**: All effects use stepped/discrete timing to feel authentically analog
 *
 * Use cases:
 * - 90s home video aesthetic transitions
 * - Nostalgia-driven video content
 * - Music video retro segments
 * - Found footage horror aesthetic
 * - Vintage documentary recreations
 * - Lo-fi video art projects
 *
 * Technical approach:
 * - Uses BaseLayout container with absolute-positioned overlays
 * - Multiple ShapeAtom layers for tracking bands, crinkles, dropouts, grain, and noise
 * - CSS filters and blend modes for color cast and grain effects
 * - Stepped/discrete keyframe animations for mechanical analog feel
 * - All animations use 'steps' easing or discrete progress intervals
 */

import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// PARAMS SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const presetParams = z.object({
  duration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition effect in seconds'),
  intensity: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe('Overall intensity multiplier for all degradation effects (0.5-2.0)'),
  trackingBandCount: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of horizontal tracking distortion bands'),
  dropoutCount: z
    .number()
    .int()
    .min(4)
    .max(20)
    .default(6)
    .describe('Number of random dropout pixels'),
  grainIntensity: z
    .number()
    .min(0.3)
    .max(1.0)
    .default(0.7)
    .describe('Opacity/intensity of film grain overlay (0.3-1.0)'),
  colorCastIntensity: z
    .number()
    .min(0.1)
    .max(0.4)
    .default(0.15)
    .describe('Intensity of blue-purple color cast overlay (0.1-0.4)'),
  enableHeadSwitchingNoise: z
    .boolean()
    .default(true)
    .describe('Enable head-switching noise bar at bottom of frame'),
});

// ─────────────────────────────────────────────────────────────────────────────
// PRESET EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    intensity,
    trackingBandCount,
    dropoutCount,
    grainIntensity,
    colorCastIntensity,
    enableHeadSwitchingNoise,
  } = params;

  // Helper: Generate unique ID
  const genId = (prefix: string, index?: number): string =>
    index !== undefined ? `${prefix}-${index}` : prefix;

  // Helper: Random position generator
  const randomPercent = (seed: number): number => {
    const x = Math.sin(seed) * 10000;
    return Math.abs(x - Math.floor(x)) * 100;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // CONTENT LAYER (Base)
  // ───────────────────────────────────────────────────────────────────────────

  const contentLayer: RenderableComponentData = {
    id: 'vhs-content-layer',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 z-0',
      style: {},
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // ───────────────────────────────────────────────────────────────────────────
  // TRACKING BANDS (Horizontal distortion bands)
  // ───────────────────────────────────────────────────────────────────────────

  const trackingBands: RenderableComponentData[] = [];
  const bandPositions = [15, 45, 70, 25, 60]; // Top percentages for bands
  const bandHeights = [32, 24, 40, 28, 36]; // Heights in pixels

  for (let i = 0; i < trackingBandCount; i++) {
    const bandId = genId('vhs-tracking-band', i);
    const topPosition = bandPositions[i % bandPositions.length];
    const bandHeight = bandHeights[i % bandHeights.length];
    const staggerDelay = (i * 0.1 * duration) / trackingBandCount;

    // Tracking band sweep animation: slide across, then fade out
    const trackingBandEffects = [
      {
        id: `${bandId}-sweep-effect`,
        componentId: bandId,
        data: {
          type: 'ease-in-out',
          start: staggerDelay,
          duration: duration * 0.6 * intensity,
          mode: 'provider',
          targetIds: [bandId],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 0.3 },
            { key: 'translateX', val: '100%', prog: 0.7 },
            { key: 'translateX', val: '100%', prog: 1 },
          ],
        },
      },
      {
        id: `${bandId}-opacity-effect`,
        componentId: bandId,
        data: {
          type: 'steps',
          start: staggerDelay,
          duration: duration * 0.6 * intensity,
          mode: 'provider',
          targetIds: [bandId],
          ranges: [
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: `${bandId}-skew-effect`,
        componentId: bandId,
        data: {
          type: 'steps',
          start: staggerDelay,
          duration: duration * 0.4 * intensity,
          mode: 'provider',
          targetIds: [bandId],
          ranges: [
            { key: 'skewX', val: '-5deg', prog: 0 },
            { key: 'skewX', val: '3deg', prog: 0.5 },
            { key: 'skewX', val: '0deg', prog: 1 },
          ],
        },
      },
    ];

    trackingBands.push({
      id: bandId,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        className: 'absolute w-full z-10',
        style: {
          top: `${topPosition}%`,
          height: `${bandHeight}px`,
          backgroundColor: 'rgba(75, 85, 99, 0.6)',
          mixBlendMode: 'multiply',
          willChange: 'transform, opacity',
          contain: 'layout style paint',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: trackingBandEffects,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAPE CRINKLES (Localized warping effects)
  // ───────────────────────────────────────────────────────────────────────────

  const tapeCrinkles: RenderableComponentData[] = [
    {
      id: 'vhs-tape-crinkle-1',
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        className: 'absolute w-24 h-16 z-20',
        style: {
          left: '20%',
          top: '30%',
          backgroundColor: 'rgba(107, 114, 128, 0.3)',
          clipPath: 'polygon(0% 0%, 100% 5%, 95% 100%, 5% 95%)',
          willChange: 'transform, opacity',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'vhs-tape-crinkle-1-warp-effect',
          componentId: 'vhs-tape-crinkle-1',
          data: {
            type: 'steps',
            start: duration * 0.2,
            duration: duration * 0.3 * intensity,
            mode: 'provider',
            targetIds: ['vhs-tape-crinkle-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.3 },
              { key: 'opacity', val: 0.3, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 1.2, prog: 0.5 },
              { key: 'scaleX', val: 1, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'vhs-tape-crinkle-2',
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        className: 'absolute w-20 h-12 z-20',
        style: {
          right: '25%',
          top: '55%',
          backgroundColor: 'rgba(107, 114, 128, 0.3)',
          clipPath: 'polygon(5% 0%, 95% 10%, 100% 100%, 0% 90%)',
          willChange: 'transform, opacity',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'vhs-tape-crinkle-2-warp-effect',
          componentId: 'vhs-tape-crinkle-2',
          data: {
            type: 'steps',
            start: duration * 0.4,
            duration: duration * 0.25 * intensity,
            mode: 'provider',
            targetIds: ['vhs-tape-crinkle-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.4, prog: 0.4 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: 1.3, prog: 0.5 },
              { key: 'scaleY', val: 1, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // DROPOUTS (Random white/black pixel flashes)
  // ───────────────────────────────────────────────────────────────────────────

  const dropouts: RenderableComponentData[] = [];
  const dropoutColors = ['#ffffff', '#000000'];

  for (let i = 0; i < dropoutCount; i++) {
    const dropoutId = genId('vhs-dropout', i);
    const leftPos = randomPercent(i * 7.3 + 12);
    const topPos = randomPercent(i * 11.7 + 29);
    const color = dropoutColors[i % 2];
    const flashStart = (i / dropoutCount) * duration * 0.8;
    const flashDuration = 0.05 + (randomPercent(i * 3.1) / 1000) * intensity;

    dropouts.push({
      id: dropoutId,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        className: 'absolute w-1 h-1 z-30',
        style: {
          left: `${leftPos}%`,
          top: `${topPos}%`,
          backgroundColor: color,
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `${dropoutId}-flash-effect`,
          componentId: dropoutId,
          data: {
            type: 'steps',
            start: flashStart,
            duration: flashDuration,
            mode: 'provider',
            targetIds: [dropoutId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COLOR CAST OVERLAY (Blue-purple tint with pulsing)
  // ───────────────────────────────────────────────────────────────────────────

  const colorCastOverlay: RenderableComponentData = {
    id: 'vhs-color-cast-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 z-40 pointer-events-none',
      style: {
        backgroundColor: `rgba(128, 90, 213, ${colorCastIntensity})`,
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'vhs-color-cast-pulse-effect',
        componentId: 'vhs-color-cast-overlay',
        data: {
          type: 'steps',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['vhs-color-cast-overlay'],
          ranges: [
            { key: 'opacity', val: 0.5, prog: 0 },
            { key: 'opacity', val: 1.0, prog: 0.25 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 1.0, prog: 0.75 },
            { key: 'opacity', val: 0.6, prog: 1 },
          ],
        },
      },
    ],
  };

  // ───────────────────────────────────────────────────────────────────────────
  // GRAIN OVERLAY (Heavy animated grain)
  // ───────────────────────────────────────────────────────────────────────────

  const grainOverlay: RenderableComponentData = {
    id: 'vhs-grain-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 z-50 pointer-events-none',
      style: {
        opacity: grainIntensity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        backgroundSize: '150px 150px',
        mixBlendMode: 'multiply',
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'vhs-grain-animate-effect',
        componentId: 'vhs-grain-overlay',
        data: {
          type: 'steps',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['vhs-grain-overlay'],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '10px', prog: 0.125 },
            { key: 'translateX', val: '-5px', prog: 0.25 },
            { key: 'translateX', val: '15px', prog: 0.375 },
            { key: 'translateX', val: '-10px', prog: 0.5 },
            { key: 'translateX', val: '5px', prog: 0.625 },
            { key: 'translateX', val: '-15px', prog: 0.75 },
            { key: 'translateX', val: '0px', prog: 0.875 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-8px', prog: 0.125 },
            { key: 'translateY', val: '12px', prog: 0.25 },
            { key: 'translateY', val: '-6px', prog: 0.375 },
            { key: 'translateY', val: '10px', prog: 0.5 },
            { key: 'translateY', val: '-12px', prog: 0.625 },
            { key: 'translateY', val: '8px', prog: 0.75 },
            { key: 'translateY', val: '0px', prog: 0.875 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  };

  // ───────────────────────────────────────────────────────────────────────────
  // HEAD-SWITCHING NOISE (Bottom bar with gradient)
  // ───────────────────────────────────────────────────────────────────────────

  const headSwitchingNoise: RenderableComponentData | null =
    enableHeadSwitchingNoise
      ? {
          id: 'vhs-head-switching-noise',
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            className: 'absolute bottom-0 left-0 w-full z-[60]',
            style: {
              height: '16px',
              background: 'linear-gradient(to top, rgba(107, 114, 128, 0.8), transparent)',
              opacity: 0.9,
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
          effects: [
            {
              id: 'vhs-head-switching-flicker-effect',
              componentId: 'vhs-head-switching-noise',
              data: {
                type: 'steps',
                start: 0,
                duration: duration,
                mode: 'provider',
                targetIds: ['vhs-head-switching-noise'],
                ranges: [
                  { key: 'opacity', val: 0.9, prog: 0 },
                  { key: 'opacity', val: 0.7, prog: 0.2 },
                  { key: 'opacity', val: 0.95, prog: 0.4 },
                  { key: 'opacity', val: 0.8, prog: 0.6 },
                  { key: 'opacity', val: 0.9, prog: 0.8 },
                  { key: 'opacity', val: 0.85, prog: 1 },
                ],
              },
            },
          ],
        }
      : null;

  // ───────────────────────────────────────────────────────────────────────────
  // AGC BRIGHTNESS PUMPING (Brightness fluctuation overlay)
  // ───────────────────────────────────────────────────────────────────────────

  const agcBrightnessOverlay: RenderableComponentData = {
    id: 'vhs-agc-brightness-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 z-35 pointer-events-none',
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'vhs-agc-brightness-pump-effect',
        componentId: 'vhs-agc-brightness-overlay',
        data: {
          type: 'steps',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['vhs-agc-brightness-overlay'],
          ranges: [
            { key: 'opacity', val: 0.0, prog: 0 },
            { key: 'opacity', val: 0.15, prog: 0.1 },
            { key: 'opacity', val: 0.05, prog: 0.25 },
            { key: 'opacity', val: 0.2, prog: 0.35 },
            { key: 'opacity', val: 0.08, prog: 0.5 },
            { key: 'opacity', val: 0.18, prog: 0.6 },
            { key: 'opacity', val: 0.1, prog: 0.75 },
            { key: 'opacity', val: 0.22, prog: 0.85 },
            { key: 'opacity', val: 0.0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ───────────────────────────────────────────────────────────────────────────
  // ROOT CONTAINER
  // ───────────────────────────────────────────────────────────────────────────

  const childrenData: RenderableComponentData[] = [
    contentLayer,
    ...trackingBands,
    ...tapeCrinkles,
    ...dropouts,
    agcBrightnessOverlay,
    colorCastOverlay,
    grainOverlay,
    ...(headSwitchingNoise ? [headSwitchingNoise] : []),
  ];

  const rootContainer: RenderableComponentData = {
    id: 'vhs-tape-degradation-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gray-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData,
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

// ─────────────────────────────────────────────────────────────────────────────
// PRESET METADATA
// ─────────────────────────────────────────────────────────────────────────────

const presetMetadata: PresetMetadata = {
  id: 'vhsTapeDegradationTransition',
  title: '90s VHS Tape Degradation Transition',
  description:
    'A grainy 90s home video transition that simulates the physical degradation and wear of magnetic tape played hundreds of times. Features horizontal tracking distortion bands, tape crinkle warping, random dropout compensation artifacts, blue-purple color cast pulsing, AGC brightness pumping, head-switching noise, and heavy animated film grain. All effects use mechanical stepped timing to feel authentically analog.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vhs', '90s', 'retro', 'analog', 'degradation', 'grain', 'lo-fi'],
  defaultInputParams: {
    duration: 2.5,
    intensity: 1.0,
    trackingBandCount: 3,
    dropoutCount: 6,
    grainIntensity: 0.7,
    colorCastIntensity: 0.15,
    enableHeadSwitchingNoise: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const vhsTapeDegradationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
