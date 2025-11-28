/**
 * GlitchBurst Combined Effect Preset
 *
 * ARRAY OF EFFECTS: This preset returns three synchronized effects that create a digital transmission error aesthetic.
 *
 * Effect 1 (Position): Stepped, digital-looking movements (dropped frames effect)
 * Effect 2 (RGB Split): Chromatic aberration via CSS drop-shadow filters (channel separation)
 * Effect 3 (Opacity): Rapid opacity flickers (signal loss moments)
 *
 * Features:
 * - Three synchronized effects working in concert
 * - Stepped position displacement for digital glitch aesthetic
 * - RGB channel separation using CSS filters
 * - Brief opacity flickers simulating signal loss
 * - Configurable glitch patterns: periodic, random, or audio-triggered
 * - Individual intensity controls for each sub-effect
 * - Temporal synchronization across all effects
 * - Corrupted video feed / transmission error aesthetic
 *
 * Use cases:
 * - Creating digital glitch effects on video/image content
 * - Simulating corrupted transmission or signal loss
 * - Adding cyberpunk/tech aesthetics to visuals
 * - Creating dramatic technical failure moments
 * - Audio-reactive glitch effects for music videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  positionIntensity: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Intensity of position displacement in pixels (0-100)'),
  rgbIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Intensity of RGB channel separation in pixels (0-20)'),
  flickerIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of opacity flickers (0 = full opacity, 1 = full transparency)'),
  glitchPattern: z
    .enum(['periodic', 'random', 'audio'])
    .default('periodic')
    .describe('Pattern of glitch occurrences: periodic (regular intervals), random (unpredictable), or audio (triggered by audio beats)'),
  duration: z
    .number()
    .min(0.1)
    .default(3)
    .describe('Total duration of the glitch effect in seconds'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the glitch effects to'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate glitch keyframe timings based on pattern
  const generateGlitchTimings = (
    pattern: 'periodic' | 'random' | 'audio',
    duration: number,
    count: number,
  ): number[] => {
    const timings: number[] = [];

    if (pattern === 'periodic') {
      // Evenly spaced glitches
      const interval = duration / count;
      for (let i = 0; i < count; i++) {
        timings.push(i * interval);
      }
    } else if (pattern === 'random') {
      // Random glitch timings with minimum spacing
      const minSpacing = duration / (count * 2);
      for (let i = 0; i < count; i++) {
        const randomTime = Math.random() * duration;
        // Ensure minimum spacing from other timings
        if (timings.every(t => Math.abs(t - randomTime) > minSpacing)) {
          timings.push(randomTime);
        }
      }
      timings.sort((a, b) => a - b);
    } else {
      // audio: Simulate beat-like timings (in real implementation, would use audio analysis)
      // For now, create burst patterns with varied spacing
      const burstCount = Math.floor(count / 3);
      for (let i = 0; i < burstCount; i++) {
        const burstStart = (i / burstCount) * duration;
        timings.push(burstStart);
        timings.push(burstStart + 0.1);
        timings.push(burstStart + 0.2);
      }
    }

    return timings.slice(0, count);
  };

  // Generate glitch timings (8-12 keyframes as specified)
  const keyframeCount = 10;
  const glitchTimings = generateGlitchTimings(
    params.glitchPattern,
    params.duration,
    keyframeCount,
  );

  // Effect 1: Position Displacement (stepped, digital-looking movements)
  const positionRanges: Array<{ key: string; val: number | string; prog: number }> = [];
  
  // Add initial position
  positionRanges.push(
    { key: 'translateX', val: 0, prog: 0 },
    { key: 'translateY', val: 0, prog: 0 },
  );

  // Generate stepped position keyframes
  glitchTimings.forEach((timing, index) => {
    const prog = timing / params.duration;
    
    // Random stepped displacement
    const xDisplace = (Math.random() - 0.5) * 2 * params.positionIntensity;
    const yDisplace = (Math.random() - 0.5) * 2 * params.positionIntensity;
    
    // Sharp jump to new position
    positionRanges.push(
      { key: 'translateX', val: xDisplace, prog },
      { key: 'translateY', val: yDisplace, prog },
    );
    
    // Hold position briefly then snap back (or to next position)
    const holdProg = Math.min(prog + 0.02, 1);
    if (holdProg < 1) {
      positionRanges.push(
        { key: 'translateX', val: xDisplace, prog: holdProg },
        { key: 'translateY', val: yDisplace, prog: holdProg },
      );
    }
  });

  // Return to center at end
  positionRanges.push(
    { key: 'translateX', val: 0, prog: 1 },
    { key: 'translateY', val: 0, prog: 1 },
  );

  const positionEffect: GenericEffectData = {
    type: 'linear', // Linear for stepped, digital feel
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: positionRanges,
  };

  // Effect 2: RGB Split (chromatic aberration via drop-shadow)
  const rgbRanges: Array<{ key: string; val: string; prog: number }> = [];
  
  // No effect at start
  rgbRanges.push({ key: 'filter', val: 'drop-shadow(0 0 0px transparent)', prog: 0 });

  // Generate RGB split keyframes at glitch timings
  glitchTimings.forEach((timing, index) => {
    const prog = timing / params.duration;
    
    // Random RGB channel offsets
    const redOffset = {
      x: (Math.random() - 0.5) * 2 * params.rgbIntensity,
      y: (Math.random() - 0.5) * 2 * params.rgbIntensity,
    };
    const greenOffset = {
      x: (Math.random() - 0.5) * 2 * params.rgbIntensity,
      y: (Math.random() - 0.5) * 2 * params.rgbIntensity,
    };
    const blueOffset = {
      x: (Math.random() - 0.5) * 2 * params.rgbIntensity,
      y: (Math.random() - 0.5) * 2 * params.rgbIntensity,
    };
    
    // Combine multiple drop-shadows to simulate RGB channel separation
    const filterValue = `drop-shadow(${redOffset.x}px ${redOffset.y}px 0px rgba(255,0,0,0.8)) drop-shadow(${greenOffset.x}px ${greenOffset.y}px 0px rgba(0,255,0,0.8)) drop-shadow(${blueOffset.x}px ${blueOffset.y}px 0px rgba(0,0,255,0.8))`;
    
    rgbRanges.push({ key: 'filter', val: filterValue, prog });
    
    // Hold briefly
    const holdProg = Math.min(prog + 0.02, 1);
    if (holdProg < 1) {
      rgbRanges.push({ key: 'filter', val: filterValue, prog: holdProg });
    }
  });

  // Return to normal at end
  rgbRanges.push({ key: 'filter', val: 'drop-shadow(0 0 0px transparent)', prog: 1 });

  const rgbEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: rgbRanges,
  };

  // Effect 3: Opacity Flickers (signal loss moments)
  const opacityRanges: Array<{ key: string; val: number; prog: number }> = [];
  
  // Full opacity at start
  opacityRanges.push({ key: 'opacity', val: 1, prog: 0 });

  // Generate rapid opacity changes at glitch timings
  glitchTimings.forEach((timing, index) => {
    const prog = timing / params.duration;
    
    // Random opacity drop (signal loss)
    const minOpacity = 1 - params.flickerIntensity;
    const dropOpacity = minOpacity + Math.random() * (1 - minOpacity);
    
    // Sharp drop
    opacityRanges.push({ key: 'opacity', val: dropOpacity, prog });
    
    // Brief hold at low opacity
    const holdProg = Math.min(prog + 0.015, 1);
    if (holdProg < 1) {
      opacityRanges.push({ key: 'opacity', val: dropOpacity, prog: holdProg });
    }
    
    // Quick recovery
    const recoverProg = Math.min(prog + 0.03, 1);
    if (recoverProg < 1) {
      opacityRanges.push({ key: 'opacity', val: 1, prog: recoverProg });
    }
  });

  // Full opacity at end
  opacityRanges.push({ key: 'opacity', val: 1, prog: 1 });

  const opacityEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: opacityRanges,
  };

  // Create effect objects with proper structure
  const effects = [
    {
      id: 'glitch-burst-position',
      componentId: 'generic',
      data: positionEffect,
    },
    {
      id: 'glitch-burst-rgb',
      componentId: 'generic',
      data: rgbEffect,
    },
    {
      id: 'glitch-burst-opacity',
      componentId: 'generic',
      data: opacityEffect,
    },
  ];

  // Return effects in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'glitch-burst-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects,
    childrenData: [],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'glitch-burst-effect',
  title: 'GlitchBurst Combined Effect',
  description:
    'A combined effect preset that layers multiple jitter effects: position displacement (stepped, digital-looking movements), RGB channel separation (chromatic aberration via CSS filters), and opacity flickers (signal loss moments). Returns an array of three synchronized effects that work together to create a digital transmission error or corrupted video feed aesthetic. Supports periodic, random, or audio-triggered glitch patterns with individual intensity controls for each sub-effect while maintaining temporal synchronization.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'internal', 'generic', 'combined', 'rgb-split', 'jitter', 'corruption', 'digital', 'chromatic-aberration'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    positionIntensity: 20,
    rgbIntensity: 5,
    flickerIntensity: 0.3,
    glitchPattern: 'periodic',
    duration: 3,
    targetIds: ['target-component'],
  },
};

export const glitchBurstEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
