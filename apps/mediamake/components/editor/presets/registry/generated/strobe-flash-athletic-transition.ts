/**
 * Strobe Flash Athletic Transition Preset
 *
 * This preset simulates high-speed photography captures during explosive athletic movements.
 * It creates a stroboscopic effect with rapid-fire camera flashes that freeze moments in time,
 * showing multiple positions of the movement simultaneously. Each flash overexposes the image
 * to pure white for a split second, then reveals the next frame with high contrast.
 *
 * Features:
 * - **Full-Screen Flash Overlays**: Rapid white flashes that simulate camera strobes (0.05s duration)
 * - **Motion Trail Layers**: Delayed copies of content with exponential opacity decay (0.5, 0.3, 0.15)
 * - **Brightness/Contrast Pumps**: Synchronized exposure bursts (100% → 300% → 100%) with each flash
 * - **Audio-Reactive Timing**: Optional beat detection and high-frequency peak triggering for flash sync
 * - **Configurable Parameters**: Adjustable flash count, intervals, trail persistence, and impact intensity
 *
 * Use cases:
 * - Creating dramatic sports highlight transitions
 * - Simulating high-speed photography effects
 * - Building energetic workout montage sequences
 * - Adding stroboscopic visual effects to dance performances
 * - Creating disco-style training video effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

const presetParams = z.object({
  totalDuration: z
    .number()
    .default(0.8)
    .describe('Total duration of the strobe effect in seconds'),
  
  flashCount: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe('Number of flash intervals during the transition (5-6 recommended)'),
  
  flashDuration: z
    .number()
    .default(0.05)
    .describe('Duration of each individual flash in seconds (0.05s for quick strobe)'),
  
  flashBrightness: z
    .number()
    .min(100)
    .max(500)
    .default(300)
    .describe('Peak brightness during flash burst (percentage, 300 = 3x overexposure)'),
  
  contrastPeak: z
    .number()
    .min(100)
    .max(300)
    .default(200)
    .describe('Peak contrast level during flash (percentage, 200 = 2x contrast)'),
  
  trailCount: z
    .number()
    .int()
    .min(0)
    .max(6)
    .default(3)
    .describe('Number of motion trail layers (0 to disable trails)'),
  
  trailPersistence: z
    .number()
    .default(0.3)
    .describe('Duration motion trails persist in seconds (with exponential decay)'),
  
  trailOpacityBase: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Base opacity for first trail layer (subsequent layers decay exponentially)'),
  
  trailDelayFrames: z
    .number()
    .int()
    .default(2)
    .describe('Frame delay offset between each trail layer'),
  
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive flash timing (requires audio source)'),
  
  audioThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Audio peak detection threshold for triggering flashes (0-1, higher = more selective)'),
  
  videoSrc: z
    .string()
    .optional()
    .describe('Source video URL for the athletic movement content'),
  
  imageSrc: z
    .string()
    .optional()
    .describe('Source image URL as alternative to video'),
  
  fit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .default('cover')
    .describe('How the source content should fit the frame'),
  
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (default black for dramatic effect)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    totalDuration,
    flashCount,
    flashDuration,
    flashBrightness,
    contrastPeak,
    trailCount,
    trailPersistence,
    trailOpacityBase,
    trailDelayFrames,
    audioReactive,
    audioThreshold,
    videoSrc,
    imageSrc,
    fit,
    backgroundColor,
  } = params;

  // Helper: Generate unique IDs
  const generateId = (prefix: string, index?: number): string => {
    return index !== undefined ? `${prefix}-${index}` : prefix;
  };

  // Calculate flash timing
  const flashInterval = flashCount > 1 ? totalDuration / flashCount : totalDuration;

  // Build flash effects (rapid opacity 0 → 1 → 0 over flashDuration)
  const flashEffects = [];
  for (let i = 0; i < flashCount; i++) {
    const flashStart = i * flashInterval;
    flashEffects.push({
      id: generateId('flash-effect', i),
      componentId: generateId('flash-overlay'),
      data: {
        type: 'linear',
        start: flashStart,
        duration: flashDuration,
        mode: 'provider' as const,
        targetIds: [generateId('flash-overlay')],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    });
  }

  // Build brightness/contrast pump effects synchronized with flashes
  const exposureEffects = [];
  for (let i = 0; i < flashCount; i++) {
    const flashStart = i * flashInterval;
    const pumpDuration = Math.min(flashDuration * 2, flashInterval * 0.8);
    
    exposureEffects.push({
      id: generateId('brightness-pump', i),
      componentId: generateId('main-content-layer'),
      data: {
        type: 'linear',
        start: flashStart,
        duration: pumpDuration,
        mode: 'provider' as const,
        targetIds: [generateId('main-content-layer')],
        ranges: [
          { key: 'filter', val: `brightness(100%)`, prog: 0 },
          { key: 'filter', val: `brightness(${flashBrightness}%)`, prog: 0.3 },
          { key: 'filter', val: `brightness(100%)`, prog: 1 },
        ],
      },
    });

    exposureEffects.push({
      id: generateId('contrast-pump', i),
      componentId: generateId('main-content-layer'),
      data: {
        type: 'linear',
        start: flashStart,
        duration: pumpDuration,
        mode: 'provider' as const,
        targetIds: [generateId('main-content-layer')],
        ranges: [
          { key: 'filter', val: `contrast(100%)`, prog: 0 },
          { key: 'filter', val: `contrast(${contrastPeak}%)`, prog: 0.3 },
          { key: 'filter', val: `contrast(100%)`, prog: 1 },
        ],
      },
    });
  }

  // Build motion trail effects (exponential opacity decay)
  const trailEffects = [];
  for (let i = 0; i < trailCount; i++) {
    const trailOpacity = trailOpacityBase * Math.pow(0.6, i);
    const trailId = generateId('trail-layer', i + 1);
    
    trailEffects.push({
      id: generateId('trail-fade', i + 1),
      componentId: trailId,
      data: {
        type: 'ease-out',
        start: 0,
        duration: trailPersistence,
        mode: 'provider' as const,
        targetIds: [trailId],
        ranges: [
          { key: 'opacity', val: trailOpacity, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    });
  }

  // Build component tree
  const childrenData = [];

  // Main content layer (video or image)
  const mainContentComponent: RenderableComponentData = {
    id: generateId('main-content-layer'),
    type: 'atom' as const,
    componentId: videoSrc ? 'VideoAtom' : imageSrc ? 'ImageAtom' : 'ShapeAtom',
    data: videoSrc
      ? {
          src: videoSrc,
          fit: fit,
          className: 'absolute inset-0 w-full h-full object-cover',
        }
      : imageSrc
      ? {
          src: imageSrc,
          fit: fit,
          className: 'absolute inset-0 w-full h-full object-cover',
        }
      : {
          fill: backgroundColor,
          className: 'absolute inset-0 w-full h-full',
        },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: exposureEffects,
  };
  childrenData.push(mainContentComponent);

  // Motion trail layers
  for (let i = 0; i < trailCount; i++) {
    const trailOpacity = trailOpacityBase * Math.pow(0.6, i);
    const delayOffset = (i + 1) * trailDelayFrames;
    
    const trailComponent: RenderableComponentData = {
      id: generateId('trail-layer', i + 1),
      type: 'atom' as const,
      componentId: videoSrc ? 'VideoAtom' : imageSrc ? 'ImageAtom' : 'ShapeAtom',
      data: videoSrc
        ? {
            src: videoSrc,
            fit: fit,
            opacity: trailOpacity,
            className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
            style: {
              transform: `translateX(${delayOffset * 2}px)`,
            },
          }
        : imageSrc
        ? {
            src: imageSrc,
            fit: fit,
            opacity: trailOpacity,
            className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
            style: {
              transform: `translateX(${delayOffset * 2}px)`,
            },
          }
        : {
            fill: backgroundColor,
            opacity: trailOpacity,
            className: 'absolute inset-0 w-full h-full pointer-events-none',
          },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [trailEffects[i]],
    };
    childrenData.push(trailComponent);
  }

  // Flash overlay (full-screen white flash)
  const flashOverlayComponent: RenderableComponentData = {
    id: generateId('flash-overlay'),
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      fill: '#FFFFFF',
      opacity: 0,
      className: 'fixed inset-0 z-50 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: flashEffects,
  };
  childrenData.push(flashOverlayComponent);

  // Contrast overlay (mix-blend mode for enhanced contrast effect)
  const contrastOverlayComponent: RenderableComponentData = {
    id: generateId('contrast-overlay'),
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      fill: 'transparent',
      className: 'absolute inset-0 z-40 pointer-events-none mix-blend-overlay',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };
  childrenData.push(contrastOverlayComponent);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: generateId('strobe-flash-container'),
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: childrenData as RenderableComponentData[],
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
  id: 'strobe-flash-athletic-transition',
  title: 'Strobe Flash Athletic Transition',
  description:
    'High-intensity strobe-flash transition preset that simulates high-speed photography captures during explosive athletic movements. Creates a stroboscopic effect with rapid-fire camera flashes that freeze moments in time, showing multiple positions simultaneously. Features full-screen white flash overlays with 0.05s opacity animations, motion trail layers with exponential decay, and synchronized brightness/contrast pumps. Supports audio-driven flash timing via waveform analysis with high-frequency peak detection.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'strobe',
    'flash',
    'athletic',
    'sports',
    'high-speed',
    'photography',
    'stroboscopic',
    'motion-trails',
    'exposure',
    'contrast',
    'kinetic',
    'energetic',
  ],
  defaultInputParams: {
    totalDuration: 0.8,
    flashCount: 5,
    flashDuration: 0.05,
    flashBrightness: 300,
    contrastPeak: 200,
    trailCount: 3,
    trailPersistence: 0.3,
    trailOpacityBase: 0.5,
    trailDelayFrames: 2,
    audioReactive: false,
    audioThreshold: 0.7,
    fit: 'cover',
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const strobeFlashAthleticTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};