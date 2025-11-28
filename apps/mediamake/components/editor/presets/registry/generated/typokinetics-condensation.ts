/**
 * Typokinetics Condensation Glass Effect Preset
 *
 * Text materializes like condensation on glass - letters slowly become visible through
 * accumulating moisture. Recreates the practical effect where breath or steam reveals text.
 * 
 * Features:
 * - Gradual opacity/blur transitions (barely visible → clear)
 * - Water droplet drip animations on random letters
 * - Moisture glow via textShadow
 * - Subtle refraction distortion (scaleX warping)
 * - Staggered word reveals for natural condensation buildup
 * 
 * Use cases:
 * - Title sequences with atmospheric reveal
 * - Poetic or dramatic text overlays
 * - Steam/moisture-themed content
 * - Slow-building narrative text
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameters Schema ---

const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with word-level timing'),
  
  // Condensation reveal timing
  revealDuration: z.number().min(4).max(10).default(6).describe('Duration of main condensation reveal effect in seconds (4-10s for slow buildup)'),
  wordStagger: z.number().min(0.1).max(1).default(0.3).describe('Stagger delay between word reveals in seconds'),
  
  // Text styling
  fontSize: z.number().min(20).max(120).default(48).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family (e.g., "Inter:600", "Roboto:700")'),
  textColor: z.string().default('rgba(241, 245, 249, 0.9)').describe('Base text color (gray-100 with slight transparency)'),
  
  // Moisture effects
  moistureDensity: z.number().min(0.5).max(2).default(1).describe('Moisture density multiplier - affects blur intensity and opacity transitions'),
  dripProbability: z.number().min(0).max(1).default(0.3).describe('Probability that a word will have a drip effect (0-1)'),
  
  // Positioning
  containerPosition: z.enum(['top', 'center', 'bottom']).default('center').describe('Vertical position of text container'),
  alignment: z.enum(['left', 'center', 'right']).default('center').describe('Text alignment'),
  
  // Background
  backgroundBlur: z.boolean().default(true).describe('Enable backdrop blur effect on container'),
  backgroundColor: z.string().default('rgba(31, 41, 55, 0.1)').describe('Background color (gray-800 with low opacity)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Parse font family and weight
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    const fontWeight = fontString.includes(':') ? parseInt(fontString.split(':')[1], 10) : 500;
    return { fontFamily, fontWeight };
  };
  
  const { fontFamily, fontWeight } = parseFontString(params.fontFamily);
  
  // Calculate container alignment classes
  const getAlignmentClass = () => {
    switch (params.alignment) {
      case 'left': return 'justify-start';
      case 'right': return 'justify-end';
      default: return 'justify-center';
    }
  };
  
  const getPositionClass = () => {
    switch (params.containerPosition) {
      case 'top': return 'items-start pt-16';
      case 'bottom': return 'items-end pb-16';
      default: return 'items-center';
    }
  };
  
  // Process each caption
  const captionContainers: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    const words = caption.words || [];
    
    // Create word components with staggered reveals
    const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const dripId = `drip-${captionIndex}-${wordIndex}`;
      
      // Calculate staggered timing for this word
      const wordStaggerDelay = wordIndex * params.wordStagger;
      const effectStart = wordStaggerDelay;
      const effectDuration = params.revealDuration;
      
      // Determine if this word gets a drip effect (random based on probability)
      const hasDrip = Math.random() < params.dripProbability;
      
      // Create main condensation reveal effect for word
      const condensationEffect: GenericEffectData = {
        type: 'ease-in',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Opacity: 0.1 → 0.9 (gradual reveal)
          { key: 'opacity', val: 0.1, prog: 0 },
          { key: 'opacity', val: 0.9, prog: 1 },
          // Blur: 8px → 0px (clarity increases)
          { key: 'blur', val: 8 * params.moistureDensity, prog: 0 },
          { key: 'blur', val: 0, prog: 1 },
          // Scale: 0.98 → 1 (slight growth)
          { key: 'scale', val: 0.98, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          // ScaleX: 0.98 → 1.02 → 1 (refraction distortion)
          { key: 'scaleX', val: 0.98, prog: 0 },
          { key: 'scaleX', val: 1.02, prog: 0.5 },
          { key: 'scaleX', val: 1, prog: 1 },
        ],
      };
      
      const mainWordEffect = {
        id: `condensation-effect-${wordId}`,
        componentId: 'generic',
        data: condensationEffect,
      };
      
      // Create drip effect if applicable
      let dripEffect = null;
      if (hasDrip) {
        const dripEffectData: GenericEffectData = {
          type: 'ease-in',
          start: effectStart + effectDuration * 0.6, // Start drip after reveal is 60% complete
          duration: 2,
          mode: 'provider',
          targetIds: [dripId],
          ranges: [
            // TranslateY: 0 → 20px (drip down)
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 20, prog: 1 },
            // Opacity: 0.8 → 0 (fade out as it drips)
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        };
        
        dripEffect = {
          id: `drip-effect-${dripId}`,
          componentId: 'generic',
          data: dripEffectData,
        };
      }
      
      // Create word container with main text and optional drip
      const wordChildren: RenderableComponentData[] = [
        {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: params.fontSize,
              fontWeight,
              color: params.textColor,
              textShadow: '0 0 3px rgba(255,255,255,0.3)', // Moisture glow
            },
            font: {
              family: fontFamily,
              weights: [fontWeight.toString()],
            },
          } as TextAtomData,
          context: {
            timing: {
              start: 0,
              duration: caption.duration, // Use full caption duration
            },
          },
          effects: [mainWordEffect],
        } as RenderableComponentData,
      ];
      
      // Add drip text if applicable
      if (hasDrip && dripEffect) {
        // Pick a random letter from the word for the drip
        const randomLetterIndex = Math.floor(Math.random() * word.text.length);
        const dripLetter = word.text[randomLetterIndex];
        
        wordChildren.push({
          id: dripId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: dripLetter,
            style: {
              fontSize: params.fontSize,
              fontWeight,
              color: params.textColor,
              textShadow: '0 0 3px rgba(255,255,255,0.3)',
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight.toString()],
            },
          } as TextAtomData,
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [dripEffect],
        } as RenderableComponentData,
      );
      
      // Word wrapper container
      return {
        id: `word-wrapper-${captionIndex}-${wordIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
            style: {
              marginRight: '0.5em',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: wordChildren,
      } as RenderableComponentData;
    });
    
    // Caption container (all words for this caption)
    return {
      id: `caption-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex flex-wrap ${getAlignmentClass()} ${getPositionClass()}`,
          style: {
            gap: '0.5rem',
            padding: '2rem',
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
  });
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-condensation-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full ${params.backgroundColor ? '' : 'bg-gray-800/10'} ${params.backgroundBlur ? 'backdrop-blur-sm' : ''}`,
        style: params.backgroundColor ? { backgroundColor: params.backgroundColor } : {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? captions[captions.length - 1].absoluteEnd 
          : 10,
      },
    },
    childrenData: captionContainers,
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

// --- Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-condensation',
  title: 'Typokinetics Condensation Glass Effect',
  description: 'Text materializes like condensation on glass - letters slowly become visible through accumulating moisture. Recreates the practical effect where breath or steam reveals text. Features gradual opacity/blur transitions, water droplet drip animations on random letters, moisture glow via textShadow, and subtle refraction distortion. Uses word-level caption timing with staggered reveals for natural condensation buildup.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'condensation', 'moisture', 'glass', 'reveal', 'drip', 'atmospheric', 'slow-reveal', 'title-sequence'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    revealDuration: 6,
    wordStagger: 0.3,
    fontSize: 48,
    fontFamily: 'Inter:500',
    textColor: 'rgba(241, 245, 249, 0.9)',
    moistureDensity: 1,
    dripProbability: 0.3,
    containerPosition: 'center',
    alignment: 'center',
    backgroundBlur: true,
    backgroundColor: 'rgba(31, 41, 55, 0.1)',
  },
};

// --- Export ---

export const typokineticsCondensationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
