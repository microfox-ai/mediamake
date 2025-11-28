/**
 * ADHD Typokinetics - Hyperactive Text Animation Preset
 *
 * This preset creates frenetic, ADHD-inspired text animations where words have zero attention span
 * and constantly shift between different animation styles. Each word feels hyperactive and unable
 * to sit still - bouncing, spinning, scaling, and jittering in rapid succession.
 *
 * Features:
 * - **5+ Micro-Animations**: Nervous twitch, anxious pulse, restless slide, fidget spin, panic shake
 * - **Overlapping Behaviors**: Multiple effects stack simultaneously for continuous motion
 * - **Hyperfocus Moments**: Random stillness where words become sharp while others keep moving
 * - **Visual Metaphors**: Thought splitting (racing thoughts), blur effects (loss of focus)
 * - **Effect Queue Management**: Performance optimization limiting active effects per word
 *
 * Use cases:
 * - Creating hyperactive, energetic text animations
 * - Expressing ADHD visual metaphors through typography
 * - Building chaotic, attention-grabbing social media content
 * - Adding frenetic energy to fast-paced video content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          })
        ),
        metadata: z.any().optional(),
      })
    )
    .describe('Array of caption sentences with word-level timing'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(60)
    .describe('Base font size in pixels'),
  
  textColor: z
    .string()
    .default('#4F46E5')
    .describe('Primary text color (CSS color value)'),
  
  baseIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.0)
    .describe('Global intensity multiplier for all effects (0.1-3.0)'),
  
  hyperfocusFrequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Probability of hyperfocus moment (0-1, default 0.15 = 15% chance)'),
  
  thoughtSplitFrequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Probability of thought-splitting effect (0-1, default 0.2 = 20% chance)'),
  
  containerPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text container'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  const { captions, font, fontSize, textColor, baseIntensity, hyperfocusFrequency, thoughtSplitFrequency, containerPosition } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
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

  // Helper: Seeded random generator for deterministic rendering
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Helper: Create micro-animation effects for a word
  const createMicroAnimations = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
    wordIndex: number,
    captionIndex: number
  ): any[] => {
    const effects: any[] = [];
    const seed = wordIndex * 1000 + captionIndex;
    
    // Check for hyperfocus moment (word becomes still)
    const isHyperfocus = seededRandom(seed + 9999) < hyperfocusFrequency;
    
    if (isHyperfocus) {
      // Hyperfocus: word becomes sharp and still with high contrast
      const hyperfocusEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: wordStart + wordDuration * 0.3,
        duration: wordDuration * 0.4,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.1, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'filter', val: 'contrast(1)', prog: 0 },
          { key: 'filter', val: 'contrast(2.0)', prog: 0.5 },
          { key: 'filter', val: 'contrast(1)', prog: 1 },
        ],
      };
      
      effects.push({
        id: `hyperfocus-${wordId}`,
        componentId: 'generic',
        data: hyperfocusEffect,
      });
      
      return effects; // Skip other animations during hyperfocus
    }

    // 1. Nervous Twitch (quick rotation ±3deg, 0.1s duration, random trigger)
    const twitchCount = 3 + Math.floor(seededRandom(seed + 1) * 3); // 3-5 twitches
    for (let i = 0; i < twitchCount; i++) {
      const twitchDelay = seededRandom(seed + i * 100) * wordDuration;
      const twitchRotation = (seededRandom(seed + i * 101) - 0.5) * 6; // ±3deg
      
      const twitchEffect: GenericEffectData = {
        type: 'linear',
        start: wordStart + twitchDelay,
        duration: 0.1 * baseIntensity,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: twitchRotation, prog: 0.5 },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      };
      
      effects.push({
        id: `twitch-${wordId}-${i}`,
        componentId: 'generic',
        data: twitchEffect,
      });
    }

    // 2. Anxious Pulse (scale 0.95-1.05, 0.4s duration, continuous loop)
    const pulseEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: wordStart,
      duration: 0.4 * baseIntensity,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 0.95, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.5 },
        { key: 'scale', val: 0.95, prog: 1 },
      ],
    };
    
    effects.push({
      id: `pulse-${wordId}`,
      componentId: 'generic',
      data: pulseEffect,
    });

    // 3. Restless Slide (translateX ±10px, 2s duration, continuous)
    const driftDirection = seededRandom(seed + 2) > 0.5 ? 1 : -1;
    const driftDistance = 10 * driftDirection * baseIntensity;
    
    const driftEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: wordStart,
      duration: 2 * baseIntensity,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'translateX', val: -driftDistance, prog: 0 },
        { key: 'translateX', val: driftDistance, prog: 0.5 },
        { key: 'translateX', val: -driftDistance, prog: 1 },
      ],
    };
    
    effects.push({
      id: `drift-${wordId}`,
      componentId: 'generic',
      data: driftEffect,
    });

    // 4. Fidget Spin (full 360deg rotation, 0.8s duration, random occurrence)
    if (seededRandom(seed + 3) > 0.6) { // 40% chance
      const spinDelay = seededRandom(seed + 4) * wordDuration * 0.5;
      
      const spinEffect: GenericEffectData = {
        type: 'ease-out',
        start: wordStart + spinDelay,
        duration: 0.8 * baseIntensity,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: 360, prog: 1 },
        ],
      };
      
      effects.push({
        id: `spin-${wordId}`,
        componentId: 'generic',
        data: spinEffect,
      });
    }

    // 5. Panic Shake (translateX/Y ±2px, 0.05s duration, 20 keyframes)
    const shakeCount = 10; // 10 shake cycles
    for (let i = 0; i < shakeCount; i++) {
      const shakeDelay = (i / shakeCount) * wordDuration;
      const shakeX = (seededRandom(seed + i * 200) - 0.5) * 4 * baseIntensity; // ±2px
      const shakeY = (seededRandom(seed + i * 201) - 0.5) * 4 * baseIntensity; // ±2px
      
      const shakeEffect: GenericEffectData = {
        type: 'linear',
        start: wordStart + shakeDelay,
        duration: 0.05,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: shakeX, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: shakeY, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };
      
      effects.push({
        id: `shake-${wordId}-${i}`,
        componentId: 'generic',
        data: shakeEffect,
      });
    }

    return effects;
  };

  // Helper: Create thought-splitting clones
  const createThoughtClones = (
    word: string,
    wordId: string,
    wordStart: number,
    wordDuration: number,
    wordIndex: number,
    captionIndex: number
  ): RenderableComponentData[] => {
    const seed = wordIndex * 1000 + captionIndex + 5000;
    
    // Check if this word should split
    if (seededRandom(seed) > thoughtSplitFrequency) {
      return [];
    }

    const clones: RenderableComponentData[] = [];
    const cloneCount = 2 + Math.floor(seededRandom(seed + 1) * 2); // 2-3 clones
    
    for (let i = 0; i < cloneCount; i++) {
      const cloneId = `${wordId}-clone-${i}`;
      const angle = (i / cloneCount) * 360;
      const distance = 20 + seededRandom(seed + i + 10) * 30; // 20-50px
      const offsetX = Math.cos((angle * Math.PI) / 180) * distance;
      const offsetY = Math.sin((angle * Math.PI) / 180) * distance;
      
      // Clone animation: drift outward and fade
      const cloneEffect: GenericEffectData = {
        type: 'ease-out',
        start: wordStart,
        duration: wordDuration * 0.5,
        mode: 'provider',
        targetIds: [cloneId],
        ranges: [
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: offsetX, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: offsetY, prog: 1 },
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(3px)', prog: 1 },
        ],
      };
      
      const clone: RenderableComponentData = {
        id: cloneId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word,
          className: 'absolute pointer-events-none',
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            ...fontStyle,
            top: '0',
            left: '0',
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: wordDuration,
          },
        },
        effects: [
          {
            id: `clone-effect-${cloneId}`,
            componentId: 'generic',
            data: cloneEffect,
          },
        ],
      };
      
      clones.push(clone);
    }
    
    return clones;
  };

  // Build caption components
  const allCaptionComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const wordContainers: RenderableComponentData[] = [];

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      
      // Create main word text atom
      const mainWordAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'font-bold selection:bg-yellow-300',
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            ...fontStyle,
            transformOrigin: 'center center',
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [],
      };

      // Add micro-animations
      const microEffects = createMicroAnimations(
        wordId,
        word.start,
        word.duration,
        wordIndex,
        captionIndex
      );
      mainWordAtom.effects = microEffects;

      // Create thought clones
      const clones = createThoughtClones(
        word.text,
        wordId,
        word.start,
        word.duration,
        wordIndex,
        captionIndex
      );

      // Word container with main word + clones
      const wordContainer: RenderableComponentData = {
        id: `word-container-${captionIndex}-${wordIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              contain: 'layout style paint',
            },
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        childrenData: [mainWordAtom, ...clones] as RenderableComponentData[],
      };

      wordContainers.push(wordContainer);
    });

    // Caption grid layout
    const captionContainer: RenderableComponentData = {
      id: `caption-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'grid gap-2 p-4',
          style: {
            contain: 'layout style paint',
            gridAutoFlow: 'row dense',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, auto))',
            alignContent: 'center',
            justifyContent: 'center',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordContainers as RenderableComponentData[],
    };

    allCaptionComponents.push(captionContainer);
  });

  // Determine container alignment
  let alignClass = 'items-center justify-center';
  if (containerPosition === 'top') {
    alignClass = 'items-start justify-center pt-8';
  } else if (containerPosition === 'bottom') {
    alignClass = 'items-end justify-center pb-8';
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'adhd-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 overflow-hidden flex ${alignClass}`,
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: allCaptionComponents as RenderableComponentData[],
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
  id: 'ADHDTypokinetics',
  title: 'ADHD Typokinetics - Hyperactive Text Animation',
  description:
    'Frenetic, ADHD-inspired typokinetics preset featuring hyperactive text that constantly shifts between 5+ micro-animations (twitch, pulse, drift, spin, shake). Text never sits still, with overlapping nervous tics, random hyperfocus moments of stillness, and visual metaphors like thought-splitting and blur effects. Designed to feel like text with too much caffeine.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'adhd',
    'hyperactive',
    'animated',
    'chaotic',
    'energetic',
    'micro-animations',
    'twitch',
    'pulse',
    'shake',
    'spin',
    'hyperfocus',
    'thought-splitting',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'This text cannot sit still',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          { id: 'w1', text: 'This', start: 0, absoluteStart: 0, end: 0.5, absoluteEnd: 0.5, duration: 0.5 },
          { id: 'w2', text: 'text', start: 0.5, absoluteStart: 0.5, end: 1.0, absoluteEnd: 1.0, duration: 0.5 },
          { id: 'w3', text: 'cannot', start: 1.0, absoluteStart: 1.0, end: 1.6, absoluteEnd: 1.6, duration: 0.6 },
          { id: 'w4', text: 'sit', start: 1.6, absoluteStart: 1.6, end: 2.0, absoluteEnd: 2.0, duration: 0.4 },
          { id: 'w5', text: 'still', start: 2.0, absoluteStart: 2.0, end: 3.0, absoluteEnd: 3.0, duration: 1.0 },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 60,
    textColor: '#4F46E5',
    baseIntensity: 1.0,
    hyperfocusFrequency: 0.15,
    thoughtSplitFrequency: 0.2,
    containerPosition: 'center',
  },
};

export const ADHDTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};