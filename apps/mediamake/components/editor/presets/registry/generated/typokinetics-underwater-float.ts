/**
 * Typokinetics Underwater Float Preset
 *
 * This preset simulates text floating underwater with gentle, fluid breathing motion
 * and occasional stronger swells. Inspired by turbulent displacement effects in video editing.
 *
 * Features:
 * - **Base Breathing Motion**: Continuous scale animation (1.0 to 1.05) over 3s
 * - **Swell Pattern**: Every 4th cycle, scale peaks at 1.2 for dramatic effect
 * - **Horizontal Drift**: translateX oscillation (-10px to 10px) with 5s period
 * - **Blur Variation**: Subtle blur filter (0px to 1px) for underwater feeling
 * - **Caption Float-Up**: Words float up from below with opacity fade-in (translateY: 20px → 0)
 * - **Underwater Gradient**: Blue gradient background (#001a33 to #003d5c)
 *
 * Use cases:
 * - Creating underwater text effects for marine content
 * - Building fluid, organic typography animations
 * - Adding breathing motion to titles and captions
 * - Creating dynamic text effects with natural rhythms
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  mainText: z.string().default('UNDERWATER').describe('Main text to display with breathing motion'),
  fontSize: z.string().default('72px').describe('Font size for main text'),
  fontFamily: z.string().default('Inter').describe('Font family for main text'),
  captions: z.array(z.custom<TranscriptionSentence>()).optional().describe('Caption data with word-level timing'),
  captionFontSize: z.string().default('32px').describe('Font size for caption words'),
  captionFontFamily: z.string().default('Inter').describe('Font family for caption words'),
  
  // Breathing parameters
  baseBreathingDuration: z.number().default(3).describe('Duration of base breathing cycle in seconds'),
  baseScaleMin: z.number().default(1.0).describe('Minimum scale for base breathing'),
  baseScaleMax: z.number().default(1.05).describe('Maximum scale for base breathing'),
  
  // Swell parameters
  swellCycleCount: z.number().default(4).describe('Number of breathing cycles before a swell occurs'),
  swellScalePeak: z.number().default(1.2).describe('Maximum scale during swell peak'),
  
  // Drift parameters
  driftDuration: z.number().default(5).describe('Duration of horizontal drift cycle in seconds'),
  driftAmplitude: z.number().default(10).describe('Maximum horizontal drift in pixels'),
  
  // Blur parameters
  blurMin: z.number().default(0).describe('Minimum blur in pixels'),
  blurMax: z.number().default(1).describe('Maximum blur in pixels'),
  
  // Caption entry parameters
  captionEntryDuration: z.number().default(1).describe('Duration of caption float-up animation in seconds'),
  captionEntryOffset: z.number().default(20).describe('Initial translateY offset for caption entry in pixels'),
  
  // Timing
  totalDuration: z.number().optional().describe('Total duration for the preset (auto-calculated from captions if not provided)'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Create swell pattern effect
  // Uses modulo operator to detect every Nth cycle and apply higher scale
  const createSwellPattern = (
    targetId: string,
    baseScale: { min: number; max: number },
    swellScale: number,
    cycleLength: number,
    swellCycleCount: number,
    duration: number,
  ): GenericEffectData => {
    // Calculate total number of cycles
    const totalCycles = Math.ceil(duration / cycleLength);
    const ranges: Array<{ key: string; val: any; prog: number }> = [];
    
    // Build keyframes for each cycle
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const cycleStart = (cycle * cycleLength) / duration;
      const cycleMid = ((cycle + 0.5) * cycleLength) / duration;
      const cycleEnd = ((cycle + 1) * cycleLength) / duration;
      
      // Every Nth cycle is a swell
      const isSwell = (cycle % swellCycleCount) === (swellCycleCount - 1);
      const peakScale = isSwell ? swellScale : baseScale.max;
      
      // Add keyframes for this cycle
      ranges.push(
        { key: 'scale', val: baseScale.min, prog: cycleStart },
        { key: 'scale', val: peakScale, prog: Math.min(cycleMid, 1) },
        { key: 'scale', val: baseScale.min, prog: Math.min(cycleEnd, 1) },
      );
    }
    
    return {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };
  };
  
  // Helper function: Create drift effect
  const createDriftEffect = (
    targetId: string,
    amplitude: number,
    driftDuration: number,
    totalDuration: number,
  ): GenericEffectData => {
    const totalCycles = Math.ceil(totalDuration / driftDuration);
    const ranges: Array<{ key: string; val: any; prog: number }> = [];
    
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const cycleStart = (cycle * driftDuration) / totalDuration;
      const cycleMid = ((cycle + 0.5) * driftDuration) / totalDuration;
      const cycleEnd = ((cycle + 1) * driftDuration) / totalDuration;
      
      ranges.push(
        { key: 'translateX', val: -amplitude, prog: cycleStart },
        { key: 'translateX', val: amplitude, prog: Math.min(cycleMid, 1) },
        { key: 'translateX', val: -amplitude, prog: Math.min(cycleEnd, 1) },
      );
    }
    
    return {
      type: 'ease-in-out',
      start: 0,
      duration: totalDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };
  };
  
  // Helper function: Create blur variation effect
  const createBlurEffect = (
    targetId: string,
    blurMin: number,
    blurMax: number,
    duration: number,
  ): GenericEffectData => {
    // Blur oscillates on a different period (6s) for variety
    const blurPeriod = 6;
    const totalCycles = Math.ceil(duration / blurPeriod);
    const ranges: Array<{ key: string; val: any; prog: number }> = [];
    
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const cycleStart = (cycle * blurPeriod) / duration;
      const cycleMid = ((cycle + 0.5) * blurPeriod) / duration;
      const cycleEnd = ((cycle + 1) * blurPeriod) / duration;
      
      ranges.push(
        { key: 'filter', val: `blur(${blurMin}px)`, prog: cycleStart },
        { key: 'filter', val: `blur(${blurMax}px)`, prog: Math.min(cycleMid, 1) },
        { key: 'filter', val: `blur(${blurMin}px)`, prog: Math.min(cycleEnd, 1) },
      );
    }
    
    return {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };
  };
  
  // Helper function: Create caption float-up effect
  const createCaptionEntryEffect = (
    targetId: string,
    entryDuration: number,
    offsetY: number,
  ): GenericEffectData => {
    return {
      type: 'ease-out',
      start: 0,
      duration: entryDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateY', val: offsetY, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };
  
  // Calculate total duration
  const totalDuration = params.totalDuration || 
    (params.captions && params.captions.length > 0
      ? Math.max(...params.captions.map(c => c.absoluteEnd))
      : 10);
  
  // Create main text with breathing, swell, drift, and blur effects
  const mainTextId = 'main-text';
  const swellEffect = createSwellPattern(
    mainTextId,
    { min: params.baseScaleMin, max: params.baseScaleMax },
    params.swellScalePeak,
    params.baseBreathingDuration,
    params.swellCycleCount,
    totalDuration,
  );
  
  const driftEffect = createDriftEffect(
    mainTextId,
    params.driftAmplitude,
    params.driftDuration,
    totalDuration,
  );
  
  const blurEffect = createBlurEffect(
    mainTextId,
    params.blurMin,
    params.blurMax,
    totalDuration,
  );
  
  const mainTextComponent: RenderableComponentData = {
    id: mainTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.mainText,
      className: 'text-white mix-blend-screen',
      style: {
        fontSize: params.fontSize,
        fontWeight: 'bold',
        willChange: 'transform, filter',
      },
      font: {
        family: params.fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'swell-effect',
        componentId: 'generic',
        data: swellEffect,
      },
      {
        id: 'drift-effect',
        componentId: 'generic',
        data: driftEffect,
      },
      {
        id: 'blur-effect',
        componentId: 'generic',
        data: blurEffect,
      },
    ],
  };
  
  // Create caption words if captions provided
  const captionComponents: RenderableComponentData[] = [];
  
  if (params.captions && params.captions.length > 0) {
    params.captions.forEach((caption, captionIndex) => {
      caption.words.forEach((word, wordIndex) => {
        const wordId = `caption-word-${captionIndex}-${wordIndex}`;
        
        // Create float-up entry effect
        const entryEffect = createCaptionEntryEffect(
          wordId,
          params.captionEntryDuration,
          params.captionEntryOffset,
        );
        
        // Create breathing effect for word (after entry)
        const wordBreathingEffect = createSwellPattern(
          wordId,
          { min: params.baseScaleMin, max: params.baseScaleMax },
          params.swellScalePeak,
          params.baseBreathingDuration,
          params.swellCycleCount,
          caption.duration,
        );
        
        // Adjust breathing effect to start after entry animation
        wordBreathingEffect.start = params.captionEntryDuration;
        wordBreathingEffect.duration = caption.duration - params.captionEntryDuration;
        
        const wordComponent: RenderableComponentData = {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            className: 'text-white mix-blend-screen',
            style: {
              fontSize: params.captionFontSize,
              willChange: 'transform, opacity, filter',
              marginRight: '0.3em',
            },
            font: {
              family: params.captionFontFamily,
              weights: ['400'],
            },
          },
          context: {
            timing: {
              start: caption.absoluteStart,
              duration: caption.duration,
            },
          },
          effects: [
            {
              id: `entry-${wordId}`,
              componentId: 'generic',
              data: entryEffect,
            },
            {
              id: `breathing-${wordId}`,
              componentId: 'generic',
              data: wordBreathingEffect,
            },
          ],
        };
        
        captionComponents.push(wordComponent);
      });
    });
  }
  
  // Build layout structure
  const breathingTextContainer: RenderableComponentData = {
    id: 'breathing-text-container',
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
    childrenData: [mainTextComponent],
  };
  
  const captionsContainer: RenderableComponentData = {
    id: 'captions-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col items-center justify-end pb-20',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: captionComponents.length > 0 ? [
      {
        id: 'caption-words',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap justify-center gap-2',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: captionComponents,
      },
    ] : [],
  };
  
  const rootContainer: RenderableComponentData = {
    id: 'underwater-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background: 'linear-gradient(to bottom, #001a33, #003d5c)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [breathingTextContainer, captionsContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokineticsUnderwaterFloat',
  title: 'Typokinetics Underwater Float',
  description: 'Simulates text floating underwater with gentle fluid breathing motion and occasional stronger swells. Features continuous scale breathing (1.0-1.05) with periodic swell peaks (up to 1.2), horizontal drift translation, subtle blur variations, and caption words that float up from below before joining the breathing rhythm.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'underwater', 'breathing', 'swell', 'drift', 'float', 'fluid', 'captions', 'animated'],
  dependencies: {},
  defaultInputParams: {
    mainText: 'UNDERWATER',
    fontSize: '72px',
    fontFamily: 'Inter',
    captionFontSize: '32px',
    captionFontFamily: 'Inter',
    baseBreathingDuration: 3,
    baseScaleMin: 1.0,
    baseScaleMax: 1.05,
    swellCycleCount: 4,
    swellScalePeak: 1.2,
    driftDuration: 5,
    driftAmplitude: 10,
    blurMin: 0,
    blurMax: 1,
    captionEntryDuration: 1,
    captionEntryOffset: 20,
  },
};

// Export preset
export const typokineticsUnderwaterFloatPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
