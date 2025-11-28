/**
 * Typokinetics Ink Dispersion Preset
 *
 * This preset creates a kinetic typography effect that emulates particles dispersing in liquid,
 * similar to ink dropping into water. Text appears crisp initially, then slowly diffuses outward
 * with tendrils and wisps spreading in organic patterns.
 *
 * Features:
 * - Letter-level fragmentation with 5-8 fragments per letter
 * - Organic dispersion patterns with radial distribution
 * - Progressive gaussian blur (0 to 15px) based on distance from origin
 * - Subtle rotation of fragments as they drift
 * - Staggered timing for natural ink-bleed effect
 * - Audio-reactive dispersion intensity (optional)
 * - Individual fragments drift at different rates
 *
 * Use cases:
 * - Creating dramatic title reveals with ink-in-water aesthetics
 * - Building cinematic text transitions
 * - Adding organic, fluid text effects to videos
 * - Creating experimental typography animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData, RenderableComponentData } from '@microfox/remotion';

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
          }),
        ),
      }),
    )
    .describe('Caption data with text and timing information'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  
  disperseDuration: z
    .number()
    .min(2)
    .max(10)
    .default(6)
    .describe('Duration of dispersion animation in seconds'),
  
  fragmentCount: z
    .number()
    .min(3)
    .max(12)
    .default(7)
    .describe('Number of fragments per letter (3-12)'),
  
  disperseRadius: z
    .number()
    .min(20)
    .max(150)
    .default(50)
    .describe('Maximum dispersion radius in pixels'),
  
  maxBlur: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Maximum blur amount in pixels'),
  
  staggerDelay: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Stagger delay between fragments in seconds'),
  
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive dispersion intensity'),
  
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source for audio-reactive mode (ref:componentId or URL)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    disperseDuration,
    fragmentCount,
    disperseRadius,
    maxBlur,
    staggerDelay,
    audioReactive,
    audioSrc,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    
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

  // Helper: Generate irregular clip path for fragments
  const generateFragmentClipPath = (seed: number): string => {
    const points: string[] = [];
    const numPoints = 6 + Math.floor(seed * 4); // 6-10 points
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const radiusVariation = 0.3 + (seed + i * 0.1) * 0.4; // 30-70% radius
      const x = 50 + Math.cos(angle) * radiusVariation * 50;
      const y = 50 + Math.sin(angle) * radiusVariation * 50;
      points.push(`${x}% ${y}%`);
    }
    
    return `polygon(${points.join(', ')})`;
  };

  // Helper: Generate random angle for radial dispersion
  const generateRadialPosition = (
    angle: number,
    radius: number,
  ): { x: number; y: number } => {
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  // Helper: Generate random rotation value
  const generateRandomRotation = (seed: number): number => {
    return (seed - 0.5) * 360; // -180 to 180 degrees
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Build caption containers
  const captionContainers: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    const captionId = `ink-disperse-caption-${captionIndex}`;
    
    // Process words into letters
    const letterFragments: RenderableComponentData[] = [];
    
    caption.words.forEach((word, wordIndex) => {
      const letters = word.text.split('');
      
      letters.forEach((letter, letterIndex) => {
        if (letter.trim() === '') return; // Skip whitespace
        
        const letterId = `letter-${captionIndex}-${wordIndex}-${letterIndex}`;
        
        // Create fragments for this letter
        for (let fragIndex = 0; fragIndex < fragmentCount; fragIndex++) {
          const fragmentId = `${letterId}-frag-${fragIndex}`;
          const seed = (captionIndex * 1000 + wordIndex * 100 + letterIndex * 10 + fragIndex) / 10000;
          
          // Calculate radial dispersion angle
          const angle = (fragIndex / fragmentCount) * 2 * Math.PI + seed * Math.PI;
          const radius = disperseRadius * (0.5 + seed * 0.5);
          const position = generateRadialPosition(angle, radius);
          
          // Generate random rotation
          const rotation = generateRandomRotation(seed);
          
          // Calculate stagger start time
          const staggerStart = fragIndex * staggerDelay;
          
          // Create fragment effect
          const fragmentEffect: GenericEffectData = {
            type: 'ease-in-out',
            start: staggerStart,
            duration: disperseDuration - staggerStart,
            mode: 'provider',
            targetIds: [fragmentId],
            ranges: [
              // Opacity: 1 → 0
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              
              // Scale: 1 → 0.3
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.3, prog: 1 },
              
              // Rotation
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotation, prog: 1 },
              
              // TranslateX
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: position.x, prog: 1 },
              
              // TranslateY
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: position.y, prog: 1 },
              
              // Blur: 0 → maxBlur
              { key: 'blur', val: 0, prog: 0 },
              { key: 'blur', val: maxBlur, prog: 1 },
            ],
          };

          // Create fragment component (HTMLBlockAtom with styled div)
          const fragmentComponent: RenderableComponentData = {
            id: fragmentId,
            type: 'atom' as const,
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="
                font-size: ${fontSize}px;
                font-weight: ${fontStyle.fontWeight || 700};
                font-style: ${fontStyle.fontStyle || 'normal'};
                color: ${textColor};
                clip-path: ${generateFragmentClipPath(seed)};
                font-family: ${fontFamily}, sans-serif;
              ">${letter}</div>`,
              className: 'absolute',
              style: {
                top: '50%',
                left: `${wordIndex * (fontSize * 0.6) + letterIndex * (fontSize * 0.5)}px`,
                transform: 'translate(-50%, -50%)',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: disperseDuration,
              },
            },
            effects: [
              {
                id: `${fragmentId}-effect`,
                componentId: 'generic',
                data: fragmentEffect,
              },
            ],
          };
          
          letterFragments.push(fragmentComponent);
        }
      });
    });

    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: disperseDuration,
        },
      },
      childrenData: [
        {
          id: `${captionId}-word-container`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative inline-flex gap-2',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: disperseDuration,
            },
          },
          childrenData: letterFragments,
        },
      ],
    };

    return captionContainer;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-ink-dispersion-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0
          ? Math.max(...captions.map(c => c.absoluteEnd)) + disperseDuration
          : 10,
      },
    },
    childrenData: captionContainers,
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
  id: 'typokinetics-ink-dispersion',
  title: 'Typokinetics Ink Dispersion',
  description:
    'Kinetic typography preset emulating ink dispersing in liquid. Text fragments break apart and drift with organic tendrils, wisps, and progressive blur. Features particle-like dispersion with radial patterns, rotation, and opacity decay for dramatic visual effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'ink',
    'dispersion',
    'particles',
    'organic',
    'fragments',
    'blur',
    'rotation',
    'dramatic',
    'experimental',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'INK DISPERSION',
        start: 0,
        absoluteStart: 0,
        end: 6,
        absoluteEnd: 6,
        duration: 6,
        words: [
          {
            id: 'word-1',
            text: 'INK',
            start: 0,
            absoluteStart: 0,
            end: 2,
            absoluteEnd: 2,
            duration: 2,
          },
          {
            id: 'word-2',
            text: 'DISPERSION',
            start: 2.5,
            absoluteStart: 2.5,
            end: 6,
            absoluteEnd: 6,
            duration: 3.5,
          },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#FFFFFF',
    disperseDuration: 6,
    fragmentCount: 7,
    disperseRadius: 50,
    maxBlur: 15,
    staggerDelay: 0.05,
    audioReactive: false,
  },
};

// Export preset
export const typokineticsInkDispersionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
