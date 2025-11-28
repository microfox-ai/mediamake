/**
 * Quantum Pop Text Effect Preset
 *
 * This preset creates a sophisticated quantum superposition text effect where text materializes
 * through probability clouds. The text starts as 3-4 semi-transparent, blurred ghost copies
 * positioned randomly (±10-15px offset) before collapsing into a single clear final position.
 *
 * Features:
 * - **Quantum Superposition**: Multiple ghost copies at random positions
 * - **Probability Collapse**: All copies converge to center with smooth animation
 * - **Uncertainty to Clarity**: Blurred, jittering ghosts resolve to sharp final text
 * - **Configurable Ghost Count**: Control number of quantum states (3-5 copies)
 * - **Shake Effect**: Subtle oscillation during first 50% of animation
 * - **Caption Support**: Each word as its own quantum system with staggered timing
 * - **Sci-Fi Aesthetic**: Perfect for physics videos, educational content, tech presentations
 *
 * Use cases:
 * - Science documentaries visualizing quantum concepts
 * - Educational physics videos
 * - Tech product launches with cutting-edge aesthetic
 * - Sci-fi content requiring conceptual visual representation
 * - Any scenario conveying uncertainty resolving to clarity
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z.string().optional().describe('Single text string to display (for non-caption mode)'),
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time within caption timeline'),
        absoluteStart: z.number().describe('Absolute start in caption timeline'),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative to caption start'),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z.any().optional(),
      }),
    )
    .optional()
    .describe('Array of caption sentences for word-by-word quantum collapse'),
  
  mode: z
    .enum(['single-text', 'captions'])
    .default('single-text')
    .describe('Mode: single-text for static text, captions for word-by-word animation'),
  
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")'),
  
  fontSize: z
    .number()
    .default(72)
    .optional()
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color for final collapsed state'),
  
  ghostCount: z
    .number()
    .min(3)
    .max(5)
    .default(4)
    .optional()
    .describe('Number of ghost copies in quantum superposition (3-5)'),
  
  convergeDuration: z
    .number()
    .default(0.6)
    .optional()
    .describe('Duration of convergence animation in seconds'),
  
  ghostOpacity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.25)
    .optional()
    .describe('Opacity of ghost copies (0.1-0.5)'),
  
  offsetRange: z
    .number()
    .default(15)
    .optional()
    .describe('Random offset range for ghost positions in pixels (±value)'),
  
  blurAmount: z
    .number()
    .default(2)
    .optional()
    .describe('Initial blur amount for ghost copies in pixels'),
  
  shakeIntensity: z
    .number()
    .default(2)
    .optional()
    .describe('Shake oscillation intensity in pixels (±value)'),
  
  wordTimingVariance: z
    .number()
    .default(0.12)
    .optional()
    .describe('Timing variance between words in seconds for caption mode'),
  
  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text on screen'),
  
  trackName: z
    .string()
    .default('quantum-pop-track')
    .optional()
    .describe('Track name for ID generation'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    captions,
    mode,
    font,
    fontSize,
    textColor,
    ghostCount,
    convergeDuration,
    ghostOpacity,
    offsetRange,
    blurAmount,
    shakeIntensity,
    wordTimingVariance,
    position,
    trackName,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
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
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter:700');

  // Helper: Generate random offset
  const randomOffset = (range: number) => {
    return (Math.random() - 0.5) * 2 * range;
  };

  // Helper: Create quantum collapse effects for one text element
  const createQuantumCollapseEffects = (
    targetId: string,
    startTime: number,
    duration: number,
    isGhost: boolean,
    ghostIndex?: number,
  ): GenericEffectData[] => {
    const effects: GenericEffectData[] = [];
    
    // Calculate random initial offsets for this ghost
    const initialX = isGhost ? randomOffset(offsetRange || 15) : 0;
    const initialY = isGhost ? randomOffset(offsetRange || 15) : 0;
    const initialScale = isGhost ? 0.9 + Math.random() * 0.2 : 1;
    const initialOpacity = isGhost ? (ghostOpacity || 0.25) : 0;
    const initialBlur = isGhost ? (blurAmount || 2) * (0.5 + Math.random() * 0.5) : blurAmount || 2;

    // Convergence animation
    const convergenceEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Translate X: random → 0
        { key: 'translateX', val: initialX, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        // Translate Y: random → 0
        { key: 'translateY', val: initialY, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        // Opacity: start → final (ghosts fade out, primary fades in)
        { key: 'opacity', val: initialOpacity, prog: 0 },
        { key: 'opacity', val: isGhost ? 0 : 1, prog: 1 },
        // Blur: initial → 0
        { key: 'filter', val: `blur(${initialBlur}px)`, prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
        // Scale: random → 1
        { key: 'scale', val: initialScale, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };
    effects.push(convergenceEffect);

    // Shake effect during first 50% of animation
    const shakeDuration = duration * 0.5;
    const shakeFrames = Math.floor(shakeDuration * 60); // 60fps
    const shakeRanges: any[] = [];
    
    for (let i = 0; i <= shakeFrames; i++) {
      const prog = i / shakeFrames;
      const shakeX = (Math.random() - 0.5) * 2 * (shakeIntensity || 2);
      const shakeY = (Math.random() - 0.5) * 2 * (shakeIntensity || 2);
      
      shakeRanges.push(
        { key: 'translateX', val: initialX + shakeX, prog: prog * 0.5 },
        { key: 'translateY', val: initialY + shakeY, prog: prog * 0.5 },
      );
    }

    if (shakeRanges.length > 0) {
      const shakeEffect: GenericEffectData = {
        type: 'linear',
        start: startTime,
        duration: shakeDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: shakeRanges,
      };
      effects.push(shakeEffect);
    }

    return effects;
  };

  // Helper: Create quantum text component (ghost or primary)
  const createQuantumTextComponent = (
    id: string,
    textContent: string,
    isGhost: boolean,
    ghostIndex: number,
    startTime: number,
    totalDuration: number,
  ): RenderableComponentData => {
    const zIndex = isGhost ? ghostIndex + 1 : 10;
    const effects = createQuantumCollapseEffects(
      id,
      startTime,
      convergeDuration || 0.6,
      isGhost,
      ghostIndex,
    );

    return {
      id,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: textContent,
        style: {
          position: 'absolute',
          zIndex,
          fontSize: fontSize || 72,
          color: textColor || '#FFFFFF',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: effects.map((effectData, idx) => ({
        id: `${id}-effect-${idx}`,
        componentId: 'generic',
        data: effectData,
      })),
    } as RenderableComponentData;
  };

  let childrenData: RenderableComponentData[] = [];

  // --- MODE: Single Text ---
  if (mode === 'single-text' && text) {
    const duration = convergeDuration || 0.6;
    const textComponents: RenderableComponentData[] = [];

    // Create ghost copies
    for (let i = 0; i < (ghostCount || 4) - 1; i++) {
      textComponents.push(
        createQuantumTextComponent(
          `${trackName}-ghost-${i}`,
          text,
          true,
          i,
          0,
          duration,
        ),
      );
    }

    // Create primary copy
    textComponents.push(
      createQuantumTextComponent(
        `${trackName}-primary`,
        text,
        false,
        0,
        0,
        duration,
      ),
    );

    childrenData = textComponents;
  }

  // --- MODE: Captions (Word-by-Word) ---
  if (mode === 'captions' && captions && captions.length > 0) {
    captions.forEach((caption, capIdx) => {
      caption.words.forEach((word, wordIdx) => {
        const wordId = `${trackName}-cap${capIdx}-word${wordIdx}`;
        const wordStartTime = word.start;
        const wordDuration = word.duration;
        
        // Add random variance to start time for each word
        const variance = (Math.random() - 0.5) * 2 * (wordTimingVariance || 0.12);
        const adjustedStartTime = Math.max(0, wordStartTime + variance);

        const wordComponents: RenderableComponentData[] = [];

        // Create ghost copies for this word
        for (let i = 0; i < (ghostCount || 4) - 1; i++) {
          wordComponents.push(
            createQuantumTextComponent(
              `${wordId}-ghost-${i}`,
              word.text,
              true,
              i,
              adjustedStartTime,
              wordDuration,
            ),
          );
        }

        // Create primary copy for this word
        wordComponents.push(
          createQuantumTextComponent(
            `${wordId}-primary`,
            word.text,
            false,
            0,
            adjustedStartTime,
            wordDuration,
          ),
        );

        // Wrap word components in a container
        const wordContainer: RenderableComponentData = {
          id: `${wordId}-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative isolate',
              style: {
                display: 'inline-block',
                marginRight: '0.3em',
              },
            },
          },
          context: {
            timing: {
              start: caption.absoluteStart,
              duration: caption.duration,
            },
          },
          childrenData: wordComponents,
        } as RenderableComponentData;

        childrenData.push(wordContainer);
      });
    });
  }

  // Determine vertical position class
  let positionClass = 'items-center justify-center';
  if (position === 'top') {
    positionClass = 'items-start justify-center pt-20';
  } else if (position === 'bottom') {
    positionClass = 'items-end justify-center pb-20';
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-quantum-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative isolate w-full h-full flex ${positionClass}`,
        style: {
          gap: mode === 'captions' ? '0.3em' : '0',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: mode === 'single-text' ? (convergeDuration || 0.6) : 10,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'quantum-pop-text',
  title: 'Quantum Pop Text Effect',
  description:
    'Sophisticated text materialization effect where text appears to exist in quantum superposition - starting as multiple semi-transparent, blurred ghost copies at random offset positions before collapsing into a single clear final position. Perfect for sci-fi content, educational physics videos, or conveying uncertainty resolving to clarity. Features 4 text instances (3 ghosts + 1 primary) with randomized initial offsets (±15px), blur (1-2px), opacity (0.25), and scale (0.9-1.1), all converging to center with smooth ease-in-out animation over 0.6 seconds. Includes subtle shake oscillation during first 50% of animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'quantum',
    'superposition',
    'sci-fi',
    'physics',
    'educational',
    'animation',
    'collapse',
    'uncertainty',
    'clarity',
    'ghost',
    'materialization',
    'convergence',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'QUANTUM STATE',
    mode: 'single-text',
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#FFFFFF',
    ghostCount: 4,
    convergeDuration: 0.6,
    ghostOpacity: 0.25,
    offsetRange: 15,
    blurAmount: 2,
    shakeIntensity: 2,
    wordTimingVariance: 0.12,
    position: 'center',
    trackName: 'quantum-pop-track',
  },
};

// --- Export ---
export const quantumPopTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
