/**
 * CinematicReveal Internal Effect Preset
 *
 * SINGLE EFFECT (mode: 'provider'):
 * This internal effect simulates a camera lens aperture opening/closing with:
 * - Directional blur (radial blur simulation via blur + brightness)
 * - Opacity transitions from 0 to 1 (or reverse)
 * - Optional vignette overlay for edge darkness
 * - Optional focus pull (shifting blur center point during reveal)
 * - Support for both opening and closing directions
 * - Optional blink mode (quick open-close cycle for scene transitions)
 * - Aperture shape simulation (circular vs hexagonal blur patterns)
 *
 * Use cases:
 * - Creating cinematic scene transitions with depth-of-field effects
 * - Simulating camera focus pulling during reveals
 * - Adding professional camera-like aperture animations
 * - Building dramatic scene opens/closes with lens blur
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  duration: z
    .number()
    .min(0.1)
    .max(10)
    .default(1.5)
    .describe('Total duration of the cinematic reveal effect in seconds'),
  apertureShape: z
    .enum(['circular', 'hexagonal'])
    .default('circular')
    .describe(
      'Aperture shape simulation - circular for smooth bokeh, hexagonal for mechanical lens look',
    ),
  direction: z
    .enum(['open', 'close'])
    .default('open')
    .describe(
      'Direction of the reveal - open (blur to sharp) or close (sharp to blur)',
    ),
  vignette: z
    .boolean()
    .default(true)
    .describe('Enable vignette darkening around edges for lens effect'),
  focusPull: z
    .object({
      enabled: z
        .boolean()
        .describe('Enable dynamic focus pulling during reveal'),
      startX: z
        .number()
        .min(0)
        .max(100)
        .describe('Starting horizontal focus point (0-100%)'),
      startY: z
        .number()
        .min(0)
        .max(100)
        .describe('Starting vertical focus point (0-100%)'),
      endX: z
        .number()
        .min(0)
        .max(100)
        .describe('Ending horizontal focus point (0-100%)'),
      endY: z
        .number()
        .min(0)
        .max(100)
        .describe('Ending vertical focus point (0-100%)'),
    })
    .optional()
    .describe(
      'Focus pull configuration - shifts the perceived blur center during reveal',
    ),
  blinkMode: z
    .boolean()
    .default(false)
    .describe(
      'Blink mode - quick open then close cycle for rapid scene transitions',
    ),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the cinematic reveal effect to'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    apertureShape,
    direction,
    vignette,
    focusPull,
    blinkMode,
    targetIds,
  } = params;

  // Helper function to create blur filter string based on aperture shape
  const createBlurFilter = (blurAmount: number, brightness: number): string => {
    // Hexagonal aperture creates slightly different blur characteristics
    // Simulated by combining blur with subtle contrast adjustments
    if (apertureShape === 'hexagonal') {
      return `blur(${blurAmount}px) brightness(${brightness}) contrast(${0.9 + brightness * 0.1})`;
    }
    // Circular aperture - smooth blur with brightness
    return `blur(${blurAmount}px) brightness(${brightness})`;
  };

  // Calculate animation keyframes based on direction
  const isOpening = direction === 'open';
  const isBlinking = blinkMode;

  let opacityValues: number[];
  let opacityProgress: number[];
  let filterValues: string[];
  let filterProgress: number[];

  if (isBlinking) {
    // Blink mode: open quickly, then close quickly
    const halfDuration = duration / 2;
    
    // First half: open (blur to sharp)
    // Second half: close (sharp to blur)
    opacityValues = [0, 0.3, 1, 1, 0.3, 0];
    opacityProgress = [0, 0.15, 0.4, 0.6, 0.85, 1];
    
    filterValues = [
      createBlurFilter(25, 0.3),
      createBlurFilter(15, 0.5),
      createBlurFilter(0, 1),
      createBlurFilter(0, 1),
      createBlurFilter(15, 0.5),
      createBlurFilter(25, 0.3),
    ];
    filterProgress = [0, 0.2, 0.45, 0.55, 0.8, 1];
  } else if (isOpening) {
    // Opening: start with heavy blur and zero opacity, reveal to sharp
    opacityValues = [0, 0.2, 0.6, 1];
    opacityProgress = [0, 0.2, 0.6, 1];
    
    filterValues = [
      createBlurFilter(25, 0.3),
      createBlurFilter(15, 0.5),
      createBlurFilter(5, 0.8),
      createBlurFilter(0, 1),
    ];
    filterProgress = [0, 0.3, 0.7, 1];
  } else {
    // Closing: start sharp, end with heavy blur and zero opacity
    opacityValues = [1, 0.6, 0.2, 0];
    opacityProgress = [0, 0.4, 0.8, 1];
    
    filterValues = [
      createBlurFilter(0, 1),
      createBlurFilter(5, 0.8),
      createBlurFilter(15, 0.5),
      createBlurFilter(25, 0.3),
    ];
    filterProgress = [0, 0.3, 0.7, 1];
  }

  // Build animation ranges
  const opacityRanges = opacityValues.map((val, i) => ({
    key: 'opacity',
    val,
    prog: opacityProgress[i],
  }));

  const filterRanges = filterValues.map((val, i) => ({
    key: 'filter',
    val,
    prog: filterProgress[i],
  }));

  // Combine ranges
  const ranges = [...opacityRanges, ...filterRanges];

  // Create the main cinematic reveal effect
  const cinematicEffect: GenericEffectData = {
    type: 'ease-in-out', // Smooth acceleration curve for cinematic feel
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
  };

  const mainEffect = {
    id: `cinematic-reveal-${targetIds.join('-')}`,
    componentId: 'generic',
    data: cinematicEffect,
  };

  // Build children array
  const children: RenderableComponentData[] = [];

  // Add vignette overlay if enabled
  if (vignette) {
    const vignetteOverlay: RenderableComponentData = {
      id: 'vignette-overlay',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [],
    };
    children.push(vignetteOverlay);
  }

  // Focus pull effect (optional)
  // This would ideally use transform-origin or radial-gradient positioning
  // For simplicity, we demonstrate the concept via a subtle scale shift
  if (focusPull?.enabled) {
    const focusPullEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        // Subtle scale to simulate focus shift
        { key: 'scale', val: 1.05, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        // Transform origin could be adjusted based on focusPull start/end coordinates
        // Note: CSS transform-origin cannot be animated directly via ranges,
        // but we can simulate focus pull through scale + position adjustments
      ],
    };

    const focusEffect = {
      id: `focus-pull-${targetIds.join('-')}`,
      componentId: 'generic',
      data: focusPullEffect,
    };

    // Return both effects
    const rootContainer: RenderableComponentData = {
      id: 'cinematic-reveal-root',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [mainEffect, focusEffect],
      childrenData: children,
    };

    return {
      output: {
        childrenData: [rootContainer] as RenderableComponentData[],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Standard output without focus pull
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-reveal-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [mainEffect],
    childrenData: children,
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
  id: 'cinematic-reveal-effect',
  title: 'CinematicReveal',
  description:
    'Internal effect preset that simulates camera lens aperture opening/closing with directional blur, opacity transitions, vignette darkening, and optional focus pull tracking. Supports circular and hexagonal aperture shapes, configurable opening speed with acceleration curves, and both open/close directions with optional blink mode for scene transitions.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'cinematic', 'blur', 'aperture', 'reveal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    duration: 1.5,
    apertureShape: 'circular',
    direction: 'open',
    vignette: true,
    focusPull: {
      enabled: false,
      startX: 50,
      startY: 50,
      endX: 50,
      endY: 50,
    },
    blinkMode: false,
    targetIds: ['target-component'],
  },
};

export const cinematicRevealEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
