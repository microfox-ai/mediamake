/**
 * Ethereal Typokinetics - Dream Haze Text Reveal Preset
 *
 * This preset creates an ethereal typokinetics effect where words emerge from a dream-like haze.
 * Each word starts heavily blurred (8px gaussian blur), at zero opacity, and slightly scaled down (85%).
 * As words fade in, the blur gradually clears and scale normalizes to 1.0, creating a "focusing" effect
 * similar to adjusting camera depth-of-field. Words overlap significantly (400ms overlap) to create
 * a flowing, continuous reveal. A subtle brightness filter animation (0.7 to 1.0) enhances the 
 * emerging-from-darkness feel. The entire text block has a soft vignette effect around edges.
 *
 * Features:
 * - **Dream-like blur reveal**: Heavy gaussian blur (8px) fading to sharp focus
 * - **Scale normalization**: Words start at 85% scale and grow to 100%
 * - **Brightness emergence**: Subtle brightness filter (0.7 → 1.0)
 * - **Continuous flow**: 400ms overlap between words for seamless reveal
 * - **Vignette effect**: Soft radial gradient vignette around edges
 * - **GPU-accelerated**: Optimized with will-change properties
 *
 * Use cases:
 * - Dream sequences and ethereal narratives
 * - Poetry and emotional storytelling
 * - Soft, cinematic text reveals
 * - Ambient and atmospheric content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with words array (TranscriptionSentence[])'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "Inter:300", "Lora:400:italic")'),
  fontSize: z.number().default(48).describe('Font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color (CSS color value)'),
  blurStart: z.number().default(8).describe('Initial gaussian blur amount in pixels'),
  scaleStart: z.number().default(0.85).describe('Initial scale value (0-1, where 1 is normal size)'),
  brightnessStart: z.number().default(0.7).describe('Initial brightness value (0-1)'),
  effectDuration: z.number().default(1.0).describe('Duration of the focusing effect in seconds'),
  wordOverlap: z.number().default(0.4).describe('Overlap between consecutive words in seconds (negative offset)'),
  vignetteIntensity: z.number().default(0.2).describe('Vignette darkness intensity (0-1)'),
  vignetteSize: z.number().default(60).describe('Vignette transparent area size (0-100%, higher = larger transparent center)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:300';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
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

  // Build all word components with effects
  const allWordComponents: RenderableComponentData[] = [];
  let earliestStart = Infinity;
  let latestEnd = 0;

  captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `ethereal-word-${captionIndex}-${wordIndex}`;
      
      // Calculate relative timing with overlap
      // Each word starts 400ms before the previous word finishes
      const wordRelativeStart = Math.max(0, word.start - params.wordOverlap);
      
      // Track earliest and latest times
      if (caption.absoluteStart + wordRelativeStart < earliestStart) {
        earliestStart = caption.absoluteStart + wordRelativeStart;
      }
      if (caption.absoluteStart + word.end > latestEnd) {
        latestEnd = caption.absoluteStart + word.end;
      }

      // Create ethereal focusing effect
      const focusingEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: wordRelativeStart,
        duration: params.effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Opacity: 0 → 1
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          
          // Scale: 0.85 → 1.0
          { key: 'scale', val: params.scaleStart, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          
          // Filter: blur(8px) brightness(0.7) → blur(0px) brightness(1.0)
          { 
            key: 'filter', 
            val: `blur(${params.blurStart}px) brightness(${params.brightnessStart})`, 
            prog: 0 
          },
          { 
            key: 'filter', 
            val: 'blur(0px) brightness(1.0)', 
            prog: 1 
          },
        ],
      };

      const effect = {
        id: `ethereal-effect-${wordId}`,
        componentId: 'generic',
        data: focusingEffect,
      };

      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            marginRight: '0.3em',
            willChange: 'transform, filter, opacity',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['300'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: caption.absoluteStart + wordRelativeStart,
            duration: caption.duration,
          },
        },
        effects: [effect],
      };

      allWordComponents.push(wordComponent);
    });
  });

  // Calculate total duration
  const totalDuration = latestEnd - earliestStart;

  // Create vignette overlay using HTMLBlockAtom
  const vignetteOverlay: RenderableComponentData = {
    id: 'ethereal-vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="absolute inset-0 pointer-events-none"></div>',
      style: {
        background: `radial-gradient(circle at center, transparent 0%, transparent ${params.vignetteSize}%, rgba(0,0,0,${params.vignetteIntensity}) 100%)`,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
      } as React.CSSProperties,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Create words container
  const wordsContainer: RenderableComponentData = {
    id: 'ethereal-words-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-wrap items-center justify-center',
        style: {
          gap: '0.2em',
          padding: '40px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: allWordComponents as RenderableComponentData[],
  };

  // Root container with vignette
  const rootContainer: RenderableComponentData = {
    id: 'ethereal-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: earliestStart,
        duration: totalDuration,
      },
    },
    childrenData: [vignetteOverlay, wordsContainer] as RenderableComponentData[],
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
  id: 'ethereal-typokinetics-dream-haze',
  title: 'Ethereal Typokinetics - Dream Haze Text Reveal',
  description: 'Ethereal typokinetics preset where words emerge from a dream-like haze with heavy gaussian blur, opacity fade, scale normalization, and brightness animation creating a "focusing" depth-of-field effect. Words overlap significantly with continuous flowing reveal and soft vignette effect around edges.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'ethereal', 'blur', 'dream', 'haze', 'depth-of-field', 'cinematic', 'vignette', 'typokinetics', 'focus', 'emergence'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:300',
    fontSize: 48,
    textColor: '#FFFFFF',
    blurStart: 8,
    scaleStart: 0.85,
    brightnessStart: 0.7,
    effectDuration: 1.0,
    wordOverlap: 0.4,
    vignetteIntensity: 0.2,
    vignetteSize: 60,
  },
};

// Export preset
export const etherealTypokineticsDreamHazePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
