/**
 * Typokinetics LED Ticker Display Preset
 *
 * This preset creates a multi-track horizontal ticker tape display mimicking slot machines
 * or LED displays. Features mechanical step-based scrolling, LED-style segmented text with
 * glow effects, scan lines, depth layers, synchronization moments, and power surge effects.
 *
 * Features:
 * - **Multi-Track Scrolling**: 3-5 horizontal tracks at different Y positions
 * - **Mechanical Movement**: Step-based translateX animation using steps() timing function
 * - **LED Aesthetic**: Segmented text with glow, pixelated font, scan lines overlay
 * - **Depth Layers**: Tracks at different Z positions with varying brightness/sharpness
 * - **Synchronization Moments**: All tracks briefly align at calculated intervals
 * - **Power Surge Effects**: Periodic brightness flickers across all text
 * - **Customizable**: Track count, speed, colors, words, and surge timing
 *
 * Use cases:
 * - Creating retro LED ticker tape displays
 * - Building slot machine-style scrolling text
 * - Adding cyberpunk/tech aesthetic overlays
 * - Creating digital signage effects
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
  tracks: z
    .array(
      z.object({
        words: z
          .array(z.string())
          .describe('Array of words to display in this track'),
        speed: z
          .number()
          .min(1)
          .max(10)
          .describe('Scroll speed in seconds per cycle'),
        yPosition: z
          .string()
          .describe('Vertical position as CSS percentage (e.g., "10%")'),
        depth: z
          .enum(['front', 'mid', 'back'])
          .describe('Depth layer: front (brightest), mid, back (dimmest)'),
      }),
    )
    .min(3)
    .max(5)
    .describe('Configuration for each ticker track')
    .default([
      {
        words: ['LOADING', 'SYSTEM', 'ONLINE', 'READY'],
        speed: 2,
        yPosition: '10%',
        depth: 'back',
      },
      {
        words: ['DATA', 'STREAM', 'ACTIVE', 'NETWORK'],
        speed: 3,
        yPosition: '30%',
        depth: 'mid',
      },
      {
        words: ['NETWORK', 'ACTIVE', 'SECURE', 'LIVE'],
        speed: 4,
        yPosition: '50%',
        depth: 'front',
      },
      {
        words: ['TERMINAL', 'READY', 'ACCESS', 'GRANTED'],
        speed: 6,
        yPosition: '70%',
        depth: 'back',
      },
    ]),
  ledColor: z
    .string()
    .describe('LED text color (CSS color value)')
    .default('#22c55e'),
  ledGlow: z
    .string()
    .describe('LED glow color (CSS color value)')
    .default('rgba(34, 197, 94, 0.8)'),
  fontSize: z
    .number()
    .min(20)
    .max(100)
    .describe('Font size in pixels')
    .default(48),
  stepCount: z
    .number()
    .min(10)
    .max(40)
    .describe('Number of steps in mechanical movement animation')
    .default(20),
  surgeInterval: z
    .number()
    .min(3)
    .max(10)
    .describe('Time between power surge effects in seconds')
    .default(6),
  surgeDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .describe('Duration of power surge effect in seconds')
    .default(0.2),
  surgeIntensity: z
    .number()
    .min(1.2)
    .max(2)
    .describe('Brightness multiplier during power surge')
    .default(1.5),
  syncMomentTime: z
    .number()
    .min(0)
    .describe('Time in seconds when synchronization moment occurs (0 = disable)')
    .default(12),
  syncMomentDuration: z
    .number()
    .min(0.3)
    .max(2)
    .describe('Duration of synchronization moment in seconds')
    .default(0.5),
  showScanlines: z
    .boolean()
    .describe('Enable horizontal scanline overlay effect')
    .default(true),
  duration: z
    .number()
    .min(5)
    .max(60)
    .describe('Total duration in seconds')
    .default(30),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Calculate GCD for LCM calculation
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };

  // Helper: Calculate LCM of two numbers
  const lcm = (a: number, b: number): number => {
    return (a * b) / gcd(a, b);
  };

  // Helper: Calculate LCM of an array of numbers
  const lcmArray = (arr: number[]): number => {
    return arr.reduce((acc, val) => lcm(acc, val), 1);
  };

  // Helper: Get depth-based opacity
  const getDepthOpacity = (depth: 'front' | 'mid' | 'back'): number => {
    switch (depth) {
      case 'front':
        return 1;
      case 'mid':
        return 0.9;
      case 'back':
        return 0.75;
      default:
        return 0.85;
    }
  };

  // Helper: Get depth-based blur
  const getDepthBlur = (depth: 'front' | 'mid' | 'back'): string => {
    switch (depth) {
      case 'front':
        return '0px';
      case 'mid':
        return '0.5px';
      case 'back':
        return '1px';
      default:
        return '0px';
    }
  };

  const {
    tracks,
    ledColor,
    ledGlow,
    fontSize,
    stepCount,
    surgeInterval,
    surgeDuration,
    surgeIntensity,
    syncMomentTime,
    syncMomentDuration,
    showScanlines,
    duration,
  } = params;

  // Calculate track speeds for synchronization
  const trackSpeeds = tracks.map(t => t.speed);
  const lcmPeriod = lcmArray(trackSpeeds);

  // Create ticker tracks
  const tickerTracks = tracks.map((track, trackIndex) => {
    const trackId = `ticker-track-${trackIndex}`;
    const wordSpacing = 40; // Gap between words in pixels

    // Create word components for this track
    const wordComponents = track.words.map((word, wordIndex) => {
      const wordId = `${trackId}-word-${wordIndex}`;

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word,
          className: 'font-mono uppercase selection:bg-green-900',
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: '700',
            color: ledColor,
            textShadow: `0 0 10px ${ledGlow}`,
            opacity: getDepthOpacity(track.depth),
            filter: `blur(${getDepthBlur(track.depth)})`,
            whiteSpace: 'nowrap' as const,
            marginRight: `${wordSpacing}px`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData;
    });

    // Duplicate words to create continuous scroll effect
    const duplicatedWords = [
      ...wordComponents,
      ...wordComponents.map((word, idx) => ({
        ...word,
        id: `${word.id}-dup-${idx}`,
      })),
    ];

    // Track container with mechanical scroll animation
    return {
      id: trackId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-full flex flex-row items-center',
          style: {
            top: track.yPosition,
            height: '80px',
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: duplicatedWords,
    } as RenderableComponentData;
  });

  // Get all word IDs for surge effects
  const allWordIds = tracks.flatMap((track, trackIndex) => {
    return track.words.flatMap((_, wordIndex) => [
      `ticker-track-${trackIndex}-word-${wordIndex}`,
      `ticker-track-${trackIndex}-word-${wordIndex}-dup-${wordIndex}`,
    ]);
  });

  // Create track scroll effects
  const scrollEffects = tracks.map((track, trackIndex) => {
    const trackId = `ticker-track-${trackIndex}`;
    const scrollDistance = -800; // Distance to scroll in pixels

    return {
      id: `scroll-effect-${trackIndex}`,
      componentId: 'generic',
      data: {
        type: 'steps' as const,
        start: 0,
        duration: track.speed,
        mode: 'provider' as const,
        targetIds: [trackId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: scrollDistance, prog: 1 },
        ],
        props: {
          steps: stepCount,
        },
      },
    };
  });

  // Create power surge effects at intervals
  const surgeEffects = [];
  let surgeTime = surgeInterval;
  while (surgeTime < duration) {
    surgeEffects.push({
      id: `surge-effect-${surgeTime}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: surgeTime,
        duration: surgeDuration,
        mode: 'provider' as const,
        targetIds: allWordIds,
        ranges: [
          { key: 'brightness', val: 1, prog: 0 },
          { key: 'brightness', val: surgeIntensity, prog: 0.5 },
          { key: 'brightness', val: 1, prog: 1 },
        ],
      },
    });
    surgeTime += surgeInterval;
  }

  // Create synchronization moment effect (if enabled)
  const syncEffects = [];
  if (syncMomentTime > 0 && syncMomentTime < duration) {
    const trackIds = tracks.map((_, idx) => `ticker-track-${idx}`);
    syncEffects.push({
      id: 'sync-moment-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: syncMomentTime,
        duration: syncMomentDuration,
        mode: 'provider' as const,
        targetIds: trackIds,
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    });
  }

  // Create scanline overlay (if enabled)
  const scanlineOverlay = showScanlines
    ? [
        {
          id: 'scanline-overlay',
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15) 0px, transparent 2px, transparent 4px); z-index: 100;"></div>`,
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        } as RenderableComponentData,
      ]
    : [];

  // Root container
  const rootContainer = {
    id: 'typokinetics-led-ticker-container',
    type: 'layout' as const,
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
    effects: [...scrollEffects, ...surgeEffects, ...syncEffects],
    childrenData: [...tickerTracks, ...scanlineOverlay] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-led-ticker',
  title: 'Typokinetics LED Ticker Display',
  description:
    'Multi-track horizontal ticker tape display mimicking slot machines or LED displays. Features mechanical step-based scrolling, LED-style segmented text with glow, scan lines, depth layers, synchronization moments, and power surge effects. Words flow continuously across multiple parallel tracks at different speeds with authentic digital display aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'ticker',
    'led',
    'scrolling',
    'mechanical',
    'kinetic',
    'retro',
    'cyberpunk',
    'tech',
    'digital-display',
  ],
  dependencies: {},
  defaultInputParams: {
    tracks: [
      {
        words: ['LOADING', 'SYSTEM', 'ONLINE', 'READY'],
        speed: 2,
        yPosition: '10%',
        depth: 'back',
      },
      {
        words: ['DATA', 'STREAM', 'ACTIVE', 'NETWORK'],
        speed: 3,
        yPosition: '30%',
        depth: 'mid',
      },
      {
        words: ['NETWORK', 'ACTIVE', 'SECURE', 'LIVE'],
        speed: 4,
        yPosition: '50%',
        depth: 'front',
      },
      {
        words: ['TERMINAL', 'READY', 'ACCESS', 'GRANTED'],
        speed: 6,
        yPosition: '70%',
        depth: 'back',
      },
    ],
    ledColor: '#22c55e',
    ledGlow: 'rgba(34, 197, 94, 0.8)',
    fontSize: 48,
    stepCount: 20,
    surgeInterval: 6,
    surgeDuration: 0.2,
    surgeIntensity: 1.5,
    syncMomentTime: 12,
    syncMomentDuration: 0.5,
    showScanlines: true,
    duration: 30,
  },
};

// Export preset
export const typokineticsLedTickerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
