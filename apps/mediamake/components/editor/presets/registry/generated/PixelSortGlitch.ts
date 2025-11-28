/**
 * PixelSortGlitch Internal Effect Preset
 * 
 * Simulates digital pixel sorting artifacts through horizontal displacement animations.
 * Creates a glitch aesthetic with randomized stepped translateX values, opacity flickers,
 * and optional RGB color shift (hue-rotate). Returns effects array for generic application
 * to target components via targetIds.
 * 
 * ARRAY OF EFFECTS:
 * Returns a single generic effect with multiple AnimationRange arrays for:
 * - translateX: Horizontal displacement with sudden jumps (pixel sorting effect)
 * - opacity: Brief flickers at random intervals
 * - filter: Optional hue-rotate for RGB color shift
 * 
 * Features:
 * - Configurable intensity (controls displacement range)
 * - Adjustable glitch frequency (number of displacement keyframes)
 * - Optional color shift effect (hue-rotate animation)
 * - Snapping feel with ease-out easing on displacements
 * - Linear easing for opacity changes
 * 
 * Use cases:
 * - Adding glitch effects to text components
 * - Creating digital distortion on images
 * - Building cyberpunk/tech aesthetic visuals
 * - Simulating data corruption effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply glitch effect to'),
  intensity: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('Controls displacement range - scales translateX values (0-100, default: 50)'),
  glitchFrequency: z
    .number()
    .min(4)
    .max(20)
    .default(8)
    .describe('Number of displacement keyframes - more = more frequent glitches (4-20, default: 8)'),
  colorShift: z
    .boolean()
    .default(true)
    .describe('Enable/disable hue-rotate color shift effect'),
  duration: z
    .number()
    .default(1)
    .describe('Effect duration in seconds'),
  start: z
    .number()
    .default(0)
    .describe('Effect start time relative to component (seconds)'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper function: Generate translateX animation ranges
  const generateTranslateXRanges = (
    frequency: number,
    maxDisplacement: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    
    // Start at 0
    ranges.push({ key: 'translateX', val: 0, prog: 0 });
    
    // Generate glitch keyframes
    for (let i = 1; i < frequency; i++) {
      const prog = i / frequency;
      // Alternate between negative and positive displacement
      const direction = i % 2 === 0 ? 1 : -1;
      const displacement = direction * randomInRange(maxDisplacement * 0.4, maxDisplacement);
      ranges.push({ key: 'translateX', val: displacement, prog });
    }
    
    // End at 0
    ranges.push({ key: 'translateX', val: 0, prog: 1 });
    
    return ranges;
  };

  // Helper function: Generate opacity flicker ranges
  const generateOpacityRanges = (
    frequency: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    
    // Start at full opacity
    ranges.push({ key: 'opacity', val: 1, prog: 0 });
    
    // Generate 2-4 random flicker points between glitch keyframes
    const flickerCount = Math.floor(randomInRange(2, 4));
    const flickerProgValues: number[] = [];
    
    for (let i = 0; i < flickerCount; i++) {
      flickerProgValues.push(randomInRange(0.1, 0.9));
    }
    
    // Sort flicker positions
    flickerProgValues.sort((a, b) => a - b);
    
    // Add flicker keyframes
    flickerProgValues.forEach((flickerProg) => {
      const opacity = randomInRange(0.7, 0.9);
      // Flicker down
      ranges.push({ key: 'opacity', val: opacity, prog: flickerProg });
      // Flicker back up
      ranges.push({ key: 'opacity', val: 1, prog: flickerProg + 0.02 });
    });
    
    // End at full opacity
    ranges.push({ key: 'opacity', val: 1, prog: 1 });
    
    return ranges;
  };

  // Helper function: Generate hue-rotate filter ranges
  const generateFilterRanges = (
    frequency: number,
  ): Array<{ key: string; val: string; prog: number }> => {
    const ranges: Array<{ key: string; val: string; prog: number }> = [];
    
    // Start at 0 degrees
    ranges.push({ key: 'filter', val: 'hue-rotate(0deg)', prog: 0 });
    
    // Generate hue-rotate keyframes synchronized with displacement
    for (let i = 1; i < frequency; i++) {
      const prog = i / frequency;
      const direction = i % 2 === 0 ? 1 : -1;
      const rotation = direction * randomInRange(3, 5);
      ranges.push({ key: 'filter', val: `hue-rotate(${rotation}deg)`, prog });
    }
    
    // End at 0 degrees
    ranges.push({ key: 'filter', val: 'hue-rotate(0deg)', prog: 1 });
    
    return ranges;
  };

  // Calculate displacement range from intensity
  const maxDisplacement = (params.intensity / 100) * 20; // Max ±20px

  // Generate animation ranges
  const translateXRanges = generateTranslateXRanges(params.glitchFrequency, maxDisplacement);
  const opacityRanges = generateOpacityRanges(params.glitchFrequency);
  const filterRanges = params.colorShift ? generateFilterRanges(params.glitchFrequency) : [];

  // Combine all ranges
  const allRanges = [
    ...translateXRanges,
    ...opacityRanges,
    ...(params.colorShift ? filterRanges : []),
  ];

  // Create effect data
  const effectData: GenericEffectData = {
    type: 'ease-out', // Snapping feel for translateX
    start: params.start,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: allRanges,
  };

  // Create effect node
  const effect = {
    id: `pixel-sort-glitch-${Date.now()}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effects in container structure
  const rootContainer: RenderableComponentData = {
    id: 'pixel-sort-glitch-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [effect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: null, // Effects attach directly to targetIds
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'PixelSortGlitch',
  title: 'PixelSortGlitch Internal Effect Preset',
  description:
    'Internal effect preset that simulates digital pixel sorting artifacts through horizontal displacement animations. Creates glitch aesthetic with randomized stepped translateX values, opacity flickers, and optional RGB color shift (hue-rotate). Returns effects array for generic application to target components via targetIds.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'pixel-sort', 'displacement', 'internal', 'generic'],
  dependencies: {
    presets: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['my-component'],
    intensity: 50,
    glitchFrequency: 8,
    colorShift: true,
    duration: 1,
    start: 0,
  },
};

// Export preset
export const PixelSortGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
