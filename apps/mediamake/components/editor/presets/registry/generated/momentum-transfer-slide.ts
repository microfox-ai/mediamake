/**
 * Momentum Transfer Word Slide Preset
 *
 * This preset creates a dynamic momentum-transfer animation where each word appears
 * to push the next word into position, like Newton's cradle or billiard balls.
 * The first word slides in fast, 'hits' its position, and transfers its energy to
 * make the second word start sliding, creating a chain reaction.
 *
 * Features:
 * - **Chain Reaction Animation**: First word slides in fast, triggers subsequent words
 * - **Physical Realism**: Micro-recoil bounce when each word is 'hit'
 * - **Sequential Energy Transfer**: Each word starts from pushed position (20px offset)
 * - **Dynamic Gap Expansion**: Container gap expands as words settle
 * - **Overshoot Easing**: Spring-like motion for natural physics feel
 * - **Customizable Timing**: Configurable delays and durations
 * - **Font & Color Options**: Custom font families and text styling
 * - **Optional Audio**: Impact sound effects synchronized with word landings
 *
 * Use cases:
 * - Sequential information reveal (step-by-step tutorials)
 * - Connected narrative text (cause-and-effect storytelling)
 * - Engaging product feature lists (each feature 'pushes' the next)
 * - Dynamic title sequences with physical motion
 * - Educational content with sequential concepts
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  words: z
    .array(z.string())
    .describe('Array of words to animate with momentum transfer'),
  
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  fontSize: z
    .number()
    .default(48)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color for all words'),
  
  firstWordDuration: z
    .number()
    .default(0.4)
    .describe('Duration for first word slide-in animation (seconds)'),
  
  subsequentWordDuration: z
    .number()
    .default(0.3)
    .describe('Duration for subsequent word slide-in animations (seconds)'),
  
  triggerDelay: z
    .number()
    .default(0.32)
    .describe('Delay before triggering next word (seconds) - calculated as 80% of firstWordDuration by default'),
  
  pushDistance: z
    .number()
    .default(20)
    .describe('Distance in pixels that subsequent words are pushed from'),
  
  recoilDuration: z
    .number()
    .default(0.1)
    .describe('Duration of micro-recoil bounce effect (seconds)'),
  
  recoilScale: z
    .number()
    .default(0.95)
    .describe('Scale factor during recoil (1.0 = no recoil, 0.95 = slight compression)'),
  
  gapExpansionStart: z
    .number()
    .default(0.4)
    .describe('When gap expansion animation starts (seconds, relative to container)'),
  
  gapExpansionDuration: z
    .number()
    .default(0.92)
    .describe('Duration of gap expansion animation (seconds)'),
  
  finalGap: z
    .number()
    .default(12)
    .describe('Final gap between words in pixels'),
  
  enableAudio: z
    .boolean()
    .default(false)
    .describe('Enable audio impact sounds on word landings'),
  
  audioSrc: z
    .string()
    .optional()
    .describe('URL to impact sound effect (required if enableAudio is true)'),
  
  audioVolume: z
    .number()
    .default(0.5)
    .describe('Volume for impact sounds (0-1)'),
  
  totalDuration: z
    .number()
    .default(3)
    .describe('Total duration of the animation sequence (seconds)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    font,
    fontSize,
    textColor,
    firstWordDuration,
    subsequentWordDuration,
    triggerDelay,
    pushDistance,
    recoilDuration,
    recoilScale,
    gapExpansionStart,
    gapExpansionDuration,
    finalGap,
    enableAudio,
    audioSrc,
    audioVolume,
    totalDuration,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate timing for each word
  const wordTimings = words.map((_, index) => {
    if (index === 0) {
      return {
        start: 0,
        duration: totalDuration,
        animationStart: 0,
        animationDuration: firstWordDuration,
      };
    }
    
    // Each subsequent word starts at triggerDelay * index
    const wordStart = triggerDelay * index;
    return {
      start: wordStart,
      duration: totalDuration - wordStart,
      animationStart: 0, // Relative to word container start
      animationDuration: subsequentWordDuration,
    };
  });

  // Build word components with containers
  const wordContainers: RenderableComponentData[] = words.map((word, index) => {
    const timing = wordTimings[index];
    const wordContainerId = `word-container-${index}`;
    const wordTextId = `word-text-${index}`;
    
    const effects: any[] = [];

    // First word: slide in from far left
    if (index === 0) {
      const slideInEffect: GenericEffectData = {
        type: 'cubic-bezier',
        start: timing.animationStart,
        duration: timing.animationDuration,
        mode: 'provider',
        targetIds: [wordContainerId],
        ranges: [
          { key: 'translateX', val: -200, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      };

      effects.push({
        id: `slide-in-effect-${index}`,
        componentId: 'generic',
        data: slideInEffect,
      });
    } else {
      // Subsequent words: push from slight offset with overshoot easing
      const pushEffect: GenericEffectData = {
        type: 'ease-out',
        start: timing.animationStart,
        duration: timing.animationDuration,
        mode: 'provider',
        targetIds: [wordContainerId],
        ranges: [
          { key: 'translateX', val: pushDistance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      };

      effects.push({
        id: `push-effect-${index}`,
        componentId: 'generic',
        data: pushEffect,
      });

      // Recoil effect (micro-bounce on impact)
      const recoilEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: timing.animationStart,
        duration: recoilDuration,
        mode: 'provider',
        targetIds: [wordContainerId],
        ranges: [
          { key: 'scaleX', val: 1, prog: 0 },
          { key: 'scaleX', val: recoilScale, prog: 0.5 },
          { key: 'scaleX', val: 1, prog: 1 },
        ],
      };

      effects.push({
        id: `recoil-effect-${index}`,
        componentId: 'generic',
        data: recoilEffect,
      });
    }

    // Build word text atom
    const wordTextAtom: RenderableComponentData = {
      id: wordTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          fontWeight: fontStyle.fontWeight || 700,
          fontStyle: fontStyle.fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : { weights: ['700'] }),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: timing.duration,
        },
      },
    };

    // Build word container with effects
    return {
      id: wordContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: timing.start,
          duration: timing.duration,
        },
      },
      effects,
      childrenData: [wordTextAtom],
    } as RenderableComponentData;
  });

  // Build words wrapper with gap expansion effect
  const gapExpansionEffect: GenericEffectData = {
    type: 'ease-out',
    start: gapExpansionStart,
    duration: gapExpansionDuration,
    mode: 'provider',
    targetIds: ['words-wrapper'],
    ranges: [
      { key: 'gap', val: 0, prog: 0 },
      { key: 'gap', val: finalGap, prog: 1 },
    ],
  };

  const wordsWrapper: RenderableComponentData = {
    id: 'words-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center gap-0',
        style: {
          willChange: 'gap',
        },
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
        id: 'gap-expansion-effect',
        componentId: 'generic',
        data: gapExpansionEffect,
      },
    ],
    childrenData: wordContainers,
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'momentum-transfer-container',
    type: 'layout',
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
    childrenData: [wordsWrapper],
  };

  // Optional: Add audio impact sounds
  const audioAtoms: RenderableComponentData[] = [];
  if (enableAudio && audioSrc) {
    // Add audio for each word impact (skip first word)
    for (let i = 1; i < words.length; i++) {
      const impactTime = triggerDelay * i;
      audioAtoms.push({
        id: `audio-impact-${i}`,
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: audioSrc,
          volume: audioVolume,
        },
        context: {
          timing: {
            start: impactTime,
            duration: 0.15,
          },
        },
      } as RenderableComponentData);
    }
  }

  // Combine all children
  const allChildren = [rootContainer, ...audioAtoms] as RenderableComponentData[];

  return {
    output: {
      childrenData: allChildren,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'momentum-transfer-slide',
  title: 'Momentum Transfer Word Slide',
  description:
    'Momentum-transfer animation where each word appears to push the next word into position like Newton\'s cradle or billiard balls. Features fast slide-in for first word, chain-reaction triggers, recoil bounce on impact, and sequential energy transfer creating engaging cause-and-effect motion perfect for tutorials and narrative text.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'momentum',
    'physics',
    'chain-reaction',
    'sequential',
    'kinetic',
    'tutorial',
    'narrative',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['First', 'word', 'pushes', 'next'],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#ffffff',
    firstWordDuration: 0.4,
    subsequentWordDuration: 0.3,
    triggerDelay: 0.32,
    pushDistance: 20,
    recoilDuration: 0.1,
    recoilScale: 0.95,
    gapExpansionStart: 0.4,
    gapExpansionDuration: 0.92,
    finalGap: 12,
    enableAudio: false,
    audioVolume: 0.5,
    totalDuration: 3,
  },
};

export const momentumTransferSlidePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};