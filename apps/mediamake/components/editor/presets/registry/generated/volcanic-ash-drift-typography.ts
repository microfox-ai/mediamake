/**
 * Volcanic Ash Drift Typography Preset
 *
 * This preset simulates text particles drifting downward like volcanic ash falling through still air.
 * From a video editor's perspective, each word is treated as a separate layer with unique drift patterns.
 * Some words fall straight down, others are caught in subtle air currents with horizontal sine-wave motion.
 *
 * Features:
 * - Words start with minimal opacity (10-20%) and gradually become visible as they descend
 * - Gaussian blur decreases as text falls (simulating focus pull)
 * - Random horizontal drift using translateX with sine-wave easing for natural movement
 * - Staggered start times create a cascading ash-like effect
 * - Transform-style: preserve-3d and will-change optimizations for GPU acceleration
 * - Each word follows independent drift patterns for organic motion
 *
 * The overall effect is meditative and weightless, perfect for titles conveying fragility,
 * transience, or contemplative moods. Ideal for:
 * - Poetic introductions or endings
 * - Environmental/atmospheric storytelling
 * - Reflective or melancholic content
 * - Artistic title sequences
 *
 * Technical Implementation:
 * - Main BaseLayout container with perspective and 3D transforms
 * - Individual BaseLayout wrappers for each word with absolute positioning
 * - TextAtom components with custom font styling
 * - Generic effects with AnimationRange arrays for complex multi-property animations
 * - All timing relative to parent containers for composability
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  words: z
    .array(z.string())
    .default(['fragile', 'moments', 'drift', 'away'])
    .describe(
      'Array of words to display as falling ash particles. Each word gets unique drift patterns.',
    ),
  duration: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe(
      'Total duration of the animation in seconds. Minimum 8 seconds recommended for proper pacing.',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Font size in pixels for all text elements.'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family for text. Use Google Font names (e.g., "Inter", "Roboto", "Playfair Display").',
    ),
  fontWeight: z
    .string()
    .default('300')
    .describe(
      'Font weight as string (e.g., "300" for light, "400" for normal, "700" for bold).',
    ),
  textColor: z
    .string()
    .default('#e0e0e0')
    .describe(
      'Text color in hex or rgba format. Light colors work best for ash effect.',
    ),
  letterSpacing: z
    .string()
    .default('0.05em')
    .describe('Letter spacing for better readability during motion.'),
  staggerDelay: z
    .number()
    .min(0)
    .max(3)
    .default(0.5)
    .describe(
      'Delay between each word starting its animation in seconds. Creates cascading effect.',
    ),
  initialOpacity: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.15)
    .describe(
      'Starting opacity for words (0.1-0.2 recommended for ash-like appearance).',
    ),
  peakOpacity: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.8)
    .describe(
      'Maximum opacity reached during descent (0.7-0.9 recommended).',
    ),
  finalOpacity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe('Final opacity as words exit frame (0.2-0.4 recommended).'),
  initialBlur: z
    .number()
    .min(0)
    .max(15)
    .default(8)
    .describe('Starting blur in pixels (simulates out-of-focus ash).'),
  driftIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe(
      'Horizontal drift intensity (percentage of screen width, -5% to 5% typical).',
    ),
  horizontalSpread: z
    .number()
    .min(5)
    .max(90)
    .default(60)
    .describe(
      'Horizontal spread of words across screen width (percentage). Controls initial left positioning distribution.',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    letterSpacing,
    staggerDelay,
    initialOpacity,
    peakOpacity,
    finalOpacity,
    initialBlur,
    driftIntensity,
    horizontalSpread,
  } = params;

  // Helper function to generate unique drift patterns for each word
  const generateDriftPattern = (index: number, totalWords: number) => {
    // Use index to create deterministic but varied patterns
    const seed = index * 0.618034; // Golden ratio for natural distribution
    const phase = Math.sin(seed * Math.PI * 2);
    
    // Drift parameters vary per word
    const driftStart = phase * driftIntensity;
    const driftMid = -phase * driftIntensity * 1.2;
    const driftEnd = (phase * 0.5) * driftIntensity;
    
    // Opacity timing varies slightly per word
    const opacityPeak = 0.35 + (Math.abs(phase) * 0.15); // Between 0.35-0.5
    
    // Blur clear timing varies
    const blurClearProgress = 0.5 + (Math.abs(phase) * 0.2); // Between 0.5-0.7
    
    return {
      driftStart,
      driftMid,
      driftEnd,
      opacityPeak,
      blurClearProgress,
    };
  };

  // Helper function to calculate horizontal position
  const calculateLeftPosition = (index: number, totalWords: number) => {
    const spreadRange = horizontalSpread;
    const leftMargin = (100 - spreadRange) / 2;
    const spacing = spreadRange / (totalWords + 1);
    return leftMargin + spacing * (index + 1);
  };

  // Generate word components with individual drift effects
  const wordContainers: RenderableComponentData[] = words.map((word, index) => {
    const wordContainerId = `word-container-${index}`;
    const textAtomId = `text-word-${index}`;
    const effectId = `drift-effect-${index}`;
    
    const startTime = index * staggerDelay;
    const leftPosition = calculateLeftPosition(index, words.length);
    const driftPattern = generateDriftPattern(index, words.length);

    // Text atom data
    const textData: TextAtomData = {
      text: word,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        letterSpacing: letterSpacing,
        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap',
      },
    };

    // Generic effect with complex animation ranges
    const effectData: GenericEffectData = {
      type: 'ease-in',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [wordContainerId],
      ranges: [
        // Vertical translation (falling motion)
        { key: 'translateY', val: -20, prog: 0 },
        { key: 'translateY', val: 120, prog: 1 },
        
        // Horizontal drift (sine-wave pattern)
        { key: 'translateX', val: driftPattern.driftStart, prog: 0 },
        { key: 'translateX', val: driftPattern.driftMid, prog: 0.5 },
        { key: 'translateX', val: driftPattern.driftEnd, prog: 1 },
        
        // Opacity (fade in, sustain, fade out)
        { key: 'opacity', val: initialOpacity, prog: 0 },
        { key: 'opacity', val: peakOpacity, prog: driftPattern.opacityPeak },
        { key: 'opacity', val: finalOpacity, prog: 1 },
        
        // Blur (focus pull effect)
        { key: 'blur', val: initialBlur, prog: 0 },
        { key: 'blur', val: 0, prog: driftPattern.blurClearProgress },
      ],
    };

    // Text atom component
    const textAtom: RenderableComponentData = {
      id: textAtomId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: textData,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };

    // Word container with effect
    const wordContainer: RenderableComponentData = {
      id: wordContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: '-20%',
            left: `${leftPosition}%`,
            transformStyle: 'preserve-3d' as const,
            willChange: 'transform, opacity',
          },
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: duration,
        },
      },
      effects: [
        {
          id: effectId,
          componentId: 'generic',
          data: effectData,
        },
      ],
      childrenData: [textAtom],
    };

    return wordContainer;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'volcanic-ash-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + (words.length * staggerDelay),
      },
    },
    childrenData: wordContainers,
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
  id: 'volcanic-ash-drift-typography',
  title: 'Volcanic Ash Drift Typography',
  description:
    'Meditative typography preset simulating text particles drifting downward like volcanic ash falling through still air. Each word features unique drift patterns with subtle horizontal movement, gradual opacity transitions (10-20% to 80%), and decreasing gaussian blur for a focus-pull effect. Perfect for conveying fragility, transience, or contemplative moods in titles and overlay text.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'particles',
    'ash',
    'drift',
    'falling',
    'meditative',
    'transient',
    'fragile',
    'atmospheric',
    'blur',
    'focus-pull',
    'sine-wave',
    'weightless',
    'contemplative',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['fragile', 'moments', 'drift', 'away'],
    duration: 10,
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '300',
    textColor: '#e0e0e0',
    letterSpacing: '0.05em',
    staggerDelay: 0.5,
    initialOpacity: 0.15,
    peakOpacity: 0.8,
    finalOpacity: 0.3,
    initialBlur: 8,
    driftIntensity: 5,
    horizontalSpread: 60,
  },
};

// Export preset
export const volcanicAshDriftTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
