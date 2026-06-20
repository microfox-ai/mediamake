/**
 * Psychedelic Wave Typography Preset
 * 
 * 70s psychedelic rock poster-style typography with wavy, undulating text where each letter 
 * bobs independently in a sine wave ripple pattern. Features chromatic aberration with RGB 
 * channel separation, bold neon tube outlines with animated hue-rotate, and a viscous liquid 
 * floating effect.
 * 
 * Features:
 * - Per-letter wave animation with sine wave physics
 * - Phase offset creating ripple effect across text
 * - Chromatic aberration with RGB channel separation
 * - Animated neon tube outlines with hue rotation
 * - Configurable wave parameters and colors
 * - GPU-optimized transforms
 * 
 * Use Cases:
 * - 70s psychedelic rock poster aesthetics
 * - Retro music video titles
 * - Concert visuals and event graphics
 * - Artistic text animations with groovy vibes
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display with psychedelic wave effect'),
  duration: z.number().default(10).describe('Duration in seconds'),
  fontSize: z.number().default(120).describe('Font size in pixels'),
  font: z.string().default('Bungee:700').describe('Font family with optional weight (e.g., "Bungee:700", "Modak:400")'),
  
  // Wave parameters
  waveAmplitude: z.number().min(5).max(50).default(20).describe('Vertical wave amplitude in pixels'),
  wavePeriod: z.number().min(1).max(5).default(2).describe('Wave animation period in seconds'),
  phaseOffset: z.number().min(0).max(1).default(0.2).describe('Phase offset per letter for ripple effect'),
  
  // Colors
  textColor: z.string().default('#ffffff').describe('Base text color'),
  outlineColor: z.string().default('#00ffff').describe('Neon outline color'),
  chromaticIntensity: z.number().min(1).max(5).default(2).describe('Chromatic aberration intensity in pixels'),
  
  // Positioning
  verticalPosition: z.enum(['top', 'center', 'bottom']).default('center').describe('Vertical position of text'),
  horizontalAlign: z.enum(['left', 'center', 'right']).default('center').describe('Horizontal alignment'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Bungee:700';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts[1] ? fontParts[1] : '700';
  
  // Split text into individual letters
  const letters = params.text.split('');
  
  // Helper function to create wave effect for a letter
  const createLetterWaveEffect = (letterIndex: number, letterId: string) => {
    const phaseShift = letterIndex * params.phaseOffset;
    
    return {
      id: `wave-effect-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: [letterId],
        ranges: [
          // Create continuous sine wave motion using multiple keyframes
          ...Array.from({ length: 20 }, (_, i) => {
            const progress = i / 19; // 0 to 1
            const time = progress * params.duration;
            const cycles = time / params.wavePeriod;
            const sineValue = Math.sin((cycles * 2 * Math.PI) + (phaseShift * 2 * Math.PI));
            const translateY = sineValue * params.waveAmplitude;
            
            return {
              key: 'translateY',
              val: translateY,
              prog: progress,
            };
          }),
        ],
      },
    };
  };
  
  // Helper function to create hue-rotate effect for neon outline
  const createHueRotateEffect = (targetId: string) => {
    return {
      id: `hue-rotate-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
          { key: 'filter', val: 'hue-rotate(120deg)', prog: 0.33 },
          { key: 'filter', val: 'hue-rotate(240deg)', prog: 0.66 },
          { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
        ],
      },
    };
  };
  
  // Create main text layer (white/base color) with letters
  const mainLetters = letters.map((letter, index) => {
    const letterId = `main-letter-${index}`;
    
    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
        style: {
          fontSize: params.fontSize,
          fontWeight: fontWeight,
          color: params.textColor,
          display: 'inline-block',
          WebkitTextStroke: `3px ${params.outlineColor}`,
          textShadow: `
            0 0 10px ${params.outlineColor},
            0 0 20px ${params.outlineColor},
            0 0 40px ${params.outlineColor}
          `,
          transform: 'translate3d(0,0,0)', // GPU optimization
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        createLetterWaveEffect(index, letterId),
        createHueRotateEffect(letterId),
      ],
    };
  });
  
  // Create chromatic aberration red channel
  const redLetters = letters.map((letter, index) => {
    const letterId = `red-letter-${index}`;
    
    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontWeight,
          color: '#ff0000',
          display: 'inline-block',
          opacity: 0.7,
          mixBlendMode: 'screen' as const,
          transform: `translate3d(-${params.chromaticIntensity}px,0,0)`,
          WebkitTextStroke: `3px ${params.outlineColor}`,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        createLetterWaveEffect(index, letterId),
      ],
    };
  });
  
  // Create chromatic aberration blue channel
  const blueLetters = letters.map((letter, index) => {
    const letterId = `blue-letter-${index}`;
    
    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontWeight,
          color: '#0000ff',
          display: 'inline-block',
          opacity: 0.7,
          mixBlendMode: 'screen' as const,
          transform: `translate3d(${params.chromaticIntensity}px,0,0)`,
          WebkitTextStroke: `3px ${params.outlineColor}`,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        createLetterWaveEffect(index, letterId),
      ],
    };
  });
  
  // Determine positioning classes
  const verticalClass = 
    params.verticalPosition === 'top' ? 'items-start pt-12' :
    params.verticalPosition === 'bottom' ? 'items-end pb-12' :
    'items-center';
    
  const horizontalClass = 
    params.horizontalAlign === 'left' ? 'justify-start' :
    params.horizontalAlign === 'right' ? 'justify-end' :
    'justify-center';
  
  // Main text container with all three layers stacked
  const textContainer = {
    id: 'psychedelic-wave-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex flex-col ${verticalClass} ${horizontalClass} px-8 py-12`,
        style: {
          overflow: 'visible',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      // Layer container for stacking chromatic layers
      {
        id: 'layer-stack',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-flex items-baseline',
            style: {
              transform: 'translate3d(0,0,0)', // GPU optimization
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [
          // Red chromatic layer (absolute positioned)
          {
            id: 'red-layer',
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute top-0 left-0 inline-flex items-baseline',
                style: {
                  pointerEvents: 'none' as const,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
            childrenData: redLetters as RenderableComponentData[],
          },
          // Blue chromatic layer (absolute positioned)
          {
            id: 'blue-layer',
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute top-0 left-0 inline-flex items-baseline',
                style: {
                  pointerEvents: 'none' as const,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
            childrenData: blueLetters as RenderableComponentData[],
          },
          // Main text layer (relative positioned, defines size)
          {
            id: 'main-layer',
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative inline-flex items-baseline',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
            childrenData: mainLetters as RenderableComponentData[],
          },
        ] as RenderableComponentData[],
      },
    ] as RenderableComponentData[],
  } as RenderableComponentData;
  
  return {
    output: {
      childrenData: [textContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'psychedelicWaveTypography',
  title: 'Psychedelic Wave Typography',
  description: '70s psychedelic rock poster-style typography with wavy, undulating text where each letter bobs independently in a sine wave ripple pattern. Features chromatic aberration with RGB channel separation, bold neon tube outlines with animated hue-rotate, and a viscous liquid floating effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'psychedelic', '70s', 'wave', 'chromatic-aberration', 'neon', 'groovy', 'retro', 'animated'],
  dependencies: {},
  defaultInputParams: {
    text: 'GROOVY',
    duration: 10,
    fontSize: 120,
    font: 'Bungee:700',
    waveAmplitude: 20,
    wavePeriod: 2,
    phaseOffset: 0.2,
    textColor: '#ffffff',
    outlineColor: '#00ffff',
    chromaticIntensity: 2,
    verticalPosition: 'center',
    horizontalAlign: 'center',
  },
};

// Export preset
export const psychedelicWaveTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};