/**
 * Fluid Motion Typokinetic Preset
 * 
 * This preset creates a fluid motion kinetic typography effect where words scale
 * from 90% to 100% as part of a liquid-like flow animation. Each word has a subtle
 * wave motion during scaling using sine/cosine wave functions for smooth undulation.
 * 
 * Features:
 * - Liquid-like scaling animation (0.9 → 1.0)
 * - Wave motion with sine/cosine undulation during scaling
 * - Water-like refraction effects using CSS filters (blur + brightness)
 * - Ripple effect emanating from each word as it appears
 * - Smooth organic transitions perfect for wellness/beauty content
 * - Follows speech rhythm using caption timing
 * 
 * Technical Details:
 * - Scale animation combined with translateY sine wave
 * - Filter effects: blur(1px) brightness(1.1) → blur(0px) brightness(1)
 * - Wave continues for 0.3s after scale completes
 * - Ripple effect using radial-gradient with animated size/opacity
 * - Performance optimized with CSS custom properties
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

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
        metadata: z.any().optional(),
      }),
    )
    .describe('Array of caption sentences with timing and word data'),
  
  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe('Font family with optional weight and style (e.g., "Roboto:600", "Inter:700")'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  
  position: z
    .enum(['top', 'center', 'bottom'])
    .default('bottom')
    .describe('Vertical position of text on screen'),
  
  scaleIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for scale animation'),
  
  waveIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for wave motion'),
  
  rippleIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for ripple effects'),
  
  showRipples: z
    .boolean()
    .default(true)
    .describe('Whether to show ripple effects emanating from words'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    position,
    scaleIntensity,
    waveIntensity,
    rippleIntensity,
    showRipples,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:600';
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

  // Calculate position classes
  const getPositionClasses = (): string => {
    switch (position) {
      case 'top':
        return 'absolute top-[10%] left-0 right-0';
      case 'center':
        return 'absolute top-1/2 left-0 right-0 -translate-y-1/2';
      case 'bottom':
      default:
        return 'absolute bottom-[15%] left-0 right-0';
    }
  };

  // Create caption components
  const captionComponents: RenderableComponentData[] = captions.map((caption) => {
    const captionId = `fluid-caption-${caption.id}`;

    // Create word components
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `fluid-word-${caption.id}-${wordIndex}`;
      const rippleId = `fluid-ripple-${caption.id}-${wordIndex}`;

      // Timing parameters
      const scaleDuration = 1.0 * scaleIntensity;
      const waveDuration = scaleDuration + 0.3; // Wave continues 0.3s after scale
      const waveAmplitude = 5 * waveIntensity;

      // Create fluid scale + wave motion effect
      const fluidMotionEffect = {
        id: `${wordId}-fluid-motion`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: word.start,
          duration: waveDuration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            // Scale animation (0.9 → 1.0)
            { key: 'scale', val: 0.9, prog: 0 },
            { key: 'scale', val: 1.0, prog: scaleDuration / waveDuration },
            { key: 'scale', val: 1.0, prog: 1 },
            
            // Wave motion using translateY with sine wave pattern
            // Start: wave at bottom
            { key: 'translateY', val: waveAmplitude, prog: 0 },
            // Quarter way: wave at center
            { key: 'translateY', val: 0, prog: 0.25 * (waveDuration / waveDuration) },
            // Half way: wave at top
            { key: 'translateY', val: -waveAmplitude, prog: 0.5 * (waveDuration / waveDuration) },
            // Three quarters: wave at center
            { key: 'translateY', val: 0, prog: 0.75 * (waveDuration / waveDuration) },
            // End: wave at bottom (completes one cycle)
            { key: 'translateY', val: waveAmplitude * 0.3, prog: 0.85 * (waveDuration / waveDuration) },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      };

      // Water refraction filter effect
      const refractionEffect = {
        id: `${wordId}-refraction`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: word.start,
          duration: scaleDuration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            // Blur effect: 1px → 0px
            { 
              key: 'filter', 
              val: 'blur(1px) brightness(1.1)', 
              prog: 0 
            },
            { 
              key: 'filter', 
              val: 'blur(0.5px) brightness(1.05)', 
              prog: 0.5 
            },
            { 
              key: 'filter', 
              val: 'blur(0px) brightness(1)', 
              prog: 1 
            },
          ],
        },
      };

      // Opacity fade-in (surfacing from underwater)
      const surfaceEffect = {
        id: `${wordId}-surface`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: word.start,
          duration: scaleDuration * 0.6,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      };

      const wordEffects = [fluidMotionEffect, refractionEffect, surfaceEffect];

      // Ripple effect (optional)
      let rippleComponent: RenderableComponentData | null = null;
      if (showRipples) {
        const rippleDuration = 0.8 * rippleIntensity;
        const rippleSize = fontSize * 2;

        const rippleEffect = {
          id: `${rippleId}-animation`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: word.start,
            duration: rippleDuration,
            mode: 'provider' as const,
            targetIds: [rippleId],
            ranges: [
              // Scale ripple from 0 to full size
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Fade out ripple
              { key: 'opacity', val: 0.6 * rippleIntensity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        };

        rippleComponent = {
          id: rippleId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute pointer-events-none',
              style: {
                width: `${rippleSize}px`,
                height: `${rippleSize}px`,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${textColor}40 0%, transparent 70%)`,
                transform: 'translate(-50%, -50%)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [rippleEffect],
          childrenData: [],
        };
      }

      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            marginRight: '0.3em',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: wordEffects,
      };

      return rippleComponent ? [wordComponent, rippleComponent] : [wordComponent];
    }).flat();

    // Caption container with all words
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `${getPositionClasses()} flex flex-row flex-wrap items-center justify-center px-8`,
          style: {
            gap: `${fontSize * 0.15}px`,
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
    };

    return captionContainer;
  });

  // SVG clip path for wave masking (optional enhancement)
  const svgClipPath: RenderableComponentData = {
    id: 'fluid-wave-clip-svg',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <svg width="0" height="0" style="position: absolute;">
          <defs>
            <clipPath id="wave-clip">
              <rect width="100%" height="100%"/>
            </clipPath>
          </defs>
        </svg>
      `,
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 99999,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'fluid-motion-typokinetic-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 99999,
      },
    },
    childrenData: [svgClipPath, ...captionComponents],
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
  id: 'FluidMotionTypokinetic',
  title: 'Fluid Motion Typokinetic',
  description:
    'Advanced kinetic typography preset featuring liquid-like flow animations where words scale from 90% to 100% with wave motion and water-like refraction effects. Text appears to surface from underwater with ripple effects emanating from each word. Perfect for smooth, organic title animations or wellness/beauty content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'kinetic',
    'typography',
    'fluid',
    'liquid',
    'wave',
    'water',
    'refraction',
    'ripple',
    'organic',
    'smooth',
    'wellness',
    'beauty',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    captions: [],
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#FFFFFF',
    position: 'bottom',
    scaleIntensity: 1,
    waveIntensity: 1,
    rippleIntensity: 1,
    showRipples: true,
  },
};

export const FluidMotionTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};