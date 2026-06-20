/**
 * Particle Dissolution Echo Effect Preset
 *
 * This preset creates an elegant text dissolution effect where text appears to disintegrate
 * into floating particles that trail behind like dust in the wind. Each ghost layer 
 * progressively breaks apart more, starting with solid text and ending with scattered 
 * letter fragments.
 *
 * Features:
 * - **Progressive Dissolution**: Multiple ghost layers with increasing particle scatter
 * - **Wind-Blown Effect**: Increasing letter-spacing and vertical dispersion
 * - **Organic Movement**: Subtle rotation and individual letter transforms
 * - **Smoke-Like Fade**: Natural opacity dissipation like dissipating smoke
 * - **Customizable Layers**: Control number of ghost layers and effect intensity
 * - **Font & Color**: Custom font families and color schemes
 *
 * Use cases:
 * - Creating dramatic text dissolution effects
 * - Building cinematic title sequences
 * - Adding atmospheric text animations
 * - Creating "blown away" or "evaporating" text effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
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
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing'),

  // Typography
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")'),
  fontSize: z.number().min(12).max(200).default(48).describe('Base font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Primary text color (hex or rgba)'),

  // Effect configuration
  numberOfGhosts: z
    .number()
    .min(2)
    .max(6)
    .default(4)
    .describe('Number of ghost layers trailing behind (2-6)'),
  ghostSpacing: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Time spacing between ghost layers in seconds'),
  dissolutionIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Overall intensity multiplier for dissolution effect'),

  // Layout
  positioning: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical positioning of text'),
  textAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal text alignment'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { captions, font, fontSize, textColor, numberOfGhosts, ghostSpacing, dissolutionIntensity, positioning, textAlign } = params;

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

  // Helper: Get position classes
  const getPositionClasses = () => {
    const vertical = {
      top: 'items-start pt-20',
      center: 'items-center',
      bottom: 'items-end pb-20',
    }[positioning];

    const horizontal = {
      left: 'justify-start pl-20',
      center: 'justify-center',
      right: 'justify-end pr-20',
    }[textAlign];

    return `${vertical} ${horizontal}`;
  };

  // Helper: Create ghost layer effect
  const createGhostEffect = (
    targetId: string,
    ghostIndex: number,
    captionDuration: number,
  ): GenericEffectData => {
    // Progressive values based on ghost index (0 = closest, higher = farther)
    const progress = ghostIndex / (numberOfGhosts - 1);
    
    // Staggered start times
    const effectStart = ghostIndex * ghostSpacing;
    
    // Progressive duration (farther ghosts last longer)
    const baseDuration = 1.5 + (progress * 1.5); // 1.5s to 3s
    const effectDuration = Math.min(baseDuration * dissolutionIntensity, captionDuration - effectStart);

    // Progressive values
    const startLetterSpacing = 2 + (ghostIndex * 2); // 2px, 4px, 6px, 8px
    const endLetterSpacing = 8 + (ghostIndex * 6); // 8px, 14px, 20px, 26px
    const startOpacity = 0.7 - (ghostIndex * 0.15); // 0.7, 0.55, 0.4, 0.25
    const startBlur = ghostIndex * 0.5; // 0px, 0.5px, 1px, 1.5px
    const endBlur = 3 + (ghostIndex * 4); // 3px, 7px, 11px, 15px
    const translateY = -10 - (ghostIndex * 5); // -10px, -15px, -20px, -25px
    const rotateZ = ghostIndex % 2 === 0 ? (ghostIndex * -1.5) : (ghostIndex * 1.5); // Alternating rotation
    const scaleEnd = 1 - (ghostIndex * 0.03); // 1, 0.97, 0.94, 0.91

    return {
      type: 'ease-in-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Opacity fade
        { key: 'opacity', val: startOpacity, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
        
        // Letter spacing expansion
        { key: 'letterSpacing', val: `${startLetterSpacing}px`, prog: 0 },
        { key: 'letterSpacing', val: `${endLetterSpacing}px`, prog: 1 },
        
        // Blur increase
        { key: 'filter', val: `blur(${startBlur}px)`, prog: 0 },
        { key: 'filter', val: `blur(${endBlur}px)`, prog: 1 },
        
        // Vertical drift
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: translateY, prog: 1 },
        
        // Rotation
        { key: 'rotateZ', val: 0, prog: 0 },
        { key: 'rotateZ', val: rotateZ, prog: 1 },
        
        // Scale reduction
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: scaleEnd, prog: 1 },
      ],
    };
  };

  // Build caption components
  const allCaptionLayers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `dissolution-caption-${captionIndex}`;
    
    // Create primary layer (solid text)
    const primaryTextId = `${captionId}-primary`;
    const primaryText: RenderableComponentData = {
      id: primaryTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: caption.text,
        style: {
          fontSize: fontSize,
          color: textColor,
          ...fontStyle,
          textAlign: textAlign,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      effects: [
        {
          id: `${primaryTextId}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.3,
            mode: 'provider',
            targetIds: [primaryTextId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };

    allCaptionLayers.push(primaryText);

    // Create ghost layers
    for (let ghostIndex = 0; ghostIndex < numberOfGhosts; ghostIndex++) {
      const ghostTextId = `${captionId}-ghost-${ghostIndex}`;
      const ghostEffect = createGhostEffect(ghostTextId, ghostIndex, caption.duration);

      const ghostText: RenderableComponentData = {
        id: ghostTextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: caption.text,
          style: {
            fontSize: fontSize,
            color: textColor,
            ...fontStyle,
            textAlign: textAlign,
            letterSpacing: `${2 + ghostIndex * 2}px`,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `${ghostTextId}-dissolution`,
            componentId: 'generic',
            data: ghostEffect,
          },
        ],
      };

      allCaptionLayers.push(ghostText);
    }
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'particle-dissolution-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex flex-col ${getPositionClasses()}`,
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? Math.max(...captions.map(c => c.absoluteEnd))
          : 10,
      },
    },
    childrenData: allCaptionLayers,
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
  id: 'text-particle-dissolution',
  title: 'Particle Dissolution Echo Effect',
  description: 'Elegant text echo effect with word-level ghost layers that progressively dissolve into scattered particles. Features increasing letter-spacing, vertical dispersion, blur, and rotation creating a "blown away by wind" effect. Each ghost layer intensifies the dissolution with staggered timing for cascading smoke-like dissipation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'captions', 'particle', 'dissolution', 'echo', 'ghost', 'wind', 'smoke', 'elegant', 'cinematic'],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Disappearing into the wind',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Disappearing',
            start: 0,
            absoluteStart: 0,
            end: 1,
            absoluteEnd: 1,
            duration: 1,
          },
          {
            id: 'word-2',
            text: 'into',
            start: 1,
            absoluteStart: 1,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.5,
          },
          {
            id: 'word-3',
            text: 'the',
            start: 1.5,
            absoluteStart: 1.5,
            end: 2,
            absoluteEnd: 2,
            duration: 0.5,
          },
          {
            id: 'word-4',
            text: 'wind',
            start: 2,
            absoluteStart: 2,
            end: 3,
            absoluteEnd: 3,
            duration: 1,
          },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#FFFFFF',
    numberOfGhosts: 4,
    ghostSpacing: 0.2,
    dissolutionIntensity: 1,
    positioning: 'center',
    textAlign: 'center',
  },
};

// Export preset
export const textParticleDissolutionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
