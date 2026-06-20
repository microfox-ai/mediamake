/**
 * Sci-Fi Typokinetics Expansion Preset
 *
 * This preset creates cinematic typokinetics with sci-fi holographic UI animations.
 * Letters start stacked with digital glitch effects and random horizontal offsets,
 * then smoothly track outward while the glitch effect decreases.
 *
 * Features:
 * - **Digital Glitch Effects**: Random horizontal offsets and data-flicker during expansion
 * - **Chromatic Aberration**: RGB channel splitting (red/blue) that aligns as letters settle
 * - **Scanline Effects**: Animated scanline overlay passing through text during animation
 * - **Smooth Expansion**: Letters track outward from stacked position with smooth easing
 * - **Futuristic Aesthetic**: Technical, holographic feel inspired by sci-fi UI animations
 *
 * Technical Details:
 * - Glitch phase: 0-0.3s (random offsets, flickering)
 * - Expansion phase: 0.3-1.0s (smooth tracking outward)
 * - Settle phase: 1.0-1.2s (final positioning)
 * - Total duration: 1.2s
 * - Easing: cubic-bezier(0.4, 0.0, 0.2, 1) for technical feel
 *
 * Use cases:
 * - Sci-fi title sequences
 * - Tech product reveals
 * - Futuristic data visualization
 * - Holographic UI effects
 * - Cyberpunk aesthetics
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Preset parameters schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to animate with sci-fi typokinetics expansion'),
  
  // Timing configuration
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.2)
    .describe('Total animation duration in seconds'),
  
  // Font configuration
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600", "Inter:700:italic")',
    ),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  
  // Color configuration
  textColor: z
    .string()
    .default('#00FFFF')
    .describe('Base text color (default: cyan for sci-fi feel)'),
  glowColor: z
    .string()
    .default('#00FFFF')
    .describe('Glow and scanline color'),
  
  // Effect intensity
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Glitch effect intensity multiplier'),
  chromaticIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Chromatic aberration intensity multiplier'),
  
  // Layout configuration
  letterSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Letter spacing in pixels at final position'),
  
  // Advanced configuration
  scanlineSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Scanline animation speed multiplier'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper function to generate random glitch offset
  const getRandomGlitchOffset = (intensity: number): number => {
    return (Math.random() - 0.5) * 10 * intensity;
  };

  // Split text into letters
  const letters = params.text.split('');
  const totalLetters = letters.length;

  // Calculate timing phases
  const glitchDuration = 0.3;
  const expansionDuration = 0.7;
  const settleDuration = 0.2;

  // Calculate final letter positions (expansion distance)
  const totalWidth = totalLetters * (params.fontSize * 0.6 + params.letterSpacing);
  const startX = -totalWidth / 2;

  // Create letter components with RGB channel splits
  const letterComponents: any[] = [];

  letters.forEach((letter, index) => {
    const letterId = `letter-${index}`;
    const finalX = startX + index * (params.fontSize * 0.6 + params.letterSpacing);
    
    // Random glitch offset for this letter
    const glitchOffset = getRandomGlitchOffset(params.glitchIntensity);

    // RGB channel split IDs
    const redChannelId = `${letterId}-red`;
    const greenChannelId = `${letterId}-green`;
    const blueChannelId = `${letterId}-blue`;

    // Container for this letter (holds RGB channels)
    const letterContainer = {
      id: `${letterId}-container`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            width: `${params.fontSize * 0.6}px`,
            height: `${params.fontSize}px`,
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
        // Red channel (left offset)
        {
          id: redChannelId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: letter,
            style: {
              fontSize: params.fontSize,
              color: '#FF0000',
              fontWeight: fontStyle.fontWeight || 700,
              position: 'absolute',
              top: 0,
              left: 0,
              mixBlendMode: 'screen',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          effects: [],
        },
        // Green channel (center, main)
        {
          id: greenChannelId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: letter,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              fontWeight: fontStyle.fontWeight || 700,
              position: 'absolute',
              top: 0,
              left: 0,
              textShadow: `0 0 10px ${params.glowColor}`,
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          effects: [],
        },
        // Blue channel (right offset)
        {
          id: blueChannelId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: letter,
            style: {
              fontSize: params.fontSize,
              color: '#0000FF',
              fontWeight: fontStyle.fontWeight || 700,
              position: 'absolute',
              top: 0,
              left: 0,
              mixBlendMode: 'screen',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          effects: [],
        },
      ] as RenderableComponentData[],
    };

    // Create effects for each channel

    // Red channel effects
    const redChannelEffects: GenericEffectData[] = [
      // Chromatic aberration (red channel left offset)
      {
        type: 'linear',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [redChannelId],
        ranges: [
          {
            key: 'translateX',
            val: -2 * params.chromaticIntensity,
            prog: 0,
          },
          {
            key: 'translateX',
            val: -2 * params.chromaticIntensity,
            prog: glitchDuration / params.duration,
          },
          {
            key: 'translateX',
            val: 0,
            prog: (glitchDuration + expansionDuration) / params.duration,
          },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
      // Container translateX (expansion)
      {
        type: 'linear',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [redChannelId],
        ranges: [
          { key: 'translateY', val: glitchOffset, prog: 0 },
          {
            key: 'translateY',
            val: glitchOffset,
            prog: glitchDuration / params.duration,
          },
          {
            key: 'translateY',
            val: 0,
            prog: (glitchDuration + expansionDuration) / params.duration,
          },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
      // Data flicker effect (opacity)
      {
        type: 'linear',
        start: 0,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: [redChannelId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.33 },
          { key: 'opacity', val: 1, prog: 0.66 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    ];

    // Green channel effects (main)
    const greenChannelEffects: GenericEffectData[] = [
      // Container translateX (expansion from center to final position)
      {
        type: 'linear',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [greenChannelId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          {
            key: 'translateX',
            val: 0,
            prog: glitchDuration / params.duration,
          },
          {
            key: 'translateX',
            val: 0,
            prog: (glitchDuration + expansionDuration) / params.duration,
          },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
      // Glitch offset
      {
        type: 'linear',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [greenChannelId],
        ranges: [
          { key: 'translateY', val: glitchOffset * 0.5, prog: 0 },
          {
            key: 'translateY',
            val: glitchOffset * 0.5,
            prog: glitchDuration / params.duration,
          },
          {
            key: 'translateY',
            val: 0,
            prog: (glitchDuration + expansionDuration) / params.duration,
          },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
      // Data flicker effect
      {
        type: 'linear',
        start: 0,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: [greenChannelId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.33 },
          { key: 'opacity', val: 1, prog: 0.66 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    ];

    // Blue channel effects
    const blueChannelEffects: GenericEffectData[] = [
      // Chromatic aberration (blue channel right offset)
      {
        type: 'linear',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [blueChannelId],
        ranges: [
          {
            key: 'translateX',
            val: 2 * params.chromaticIntensity,
            prog: 0,
          },
          {
            key: 'translateX',
            val: 2 * params.chromaticIntensity,
            prog: glitchDuration / params.duration,
          },
          {
            key: 'translateX',
            val: 0,
            prog: (glitchDuration + expansionDuration) / params.duration,
          },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
      // Glitch offset
      {
        type: 'linear',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [blueChannelId],
        ranges: [
          { key: 'translateY', val: -glitchOffset, prog: 0 },
          {
            key: 'translateY',
            val: -glitchOffset,
            prog: glitchDuration / params.duration,
          },
          {
            key: 'translateY',
            val: 0,
            prog: (glitchDuration + expansionDuration) / params.duration,
          },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
      // Data flicker effect
      {
        type: 'linear',
        start: 0,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: [blueChannelId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.33 },
          { key: 'opacity', val: 1, prog: 0.66 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    ];

    // Attach effects to channels
    (letterContainer.childrenData[0] as any).effects = redChannelEffects.map(
      (data, idx) => ({
        id: `${redChannelId}-effect-${idx}`,
        componentId: 'generic',
        data,
      }),
    );

    (letterContainer.childrenData[1] as any).effects = greenChannelEffects.map(
      (data, idx) => ({
        id: `${greenChannelId}-effect-${idx}`,
        componentId: 'generic',
        data,
      }),
    );

    (letterContainer.childrenData[2] as any).effects = blueChannelEffects.map(
      (data, idx) => ({
        id: `${blueChannelId}-effect-${idx}`,
        componentId: 'generic',
        data,
      }),
    );

    // Add letter expansion effect on container
    letterContainer.effects = [
      {
        id: `${letterId}-container-expansion`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [`${letterId}-container`],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            {
              key: 'translateX',
              val: 0,
              prog: glitchDuration / params.duration,
            },
            {
              key: 'translateX',
              val: finalX,
              prog: (glitchDuration + expansionDuration) / params.duration,
            },
            { key: 'translateX', val: finalX, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ];

    letterComponents.push(letterContainer);
  });

  // Create scanline overlay
  const scanlineId = 'scanline-bar';
  const scanlineEffect = {
    id: 'scanline-movement',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: params.duration * params.scanlineSpeed,
      mode: 'provider',
      targetIds: [scanlineId],
      ranges: [
        { key: 'translateY', val: '-100%', prog: 0 },
        { key: 'translateY', val: '100%', prog: 1 },
      ],
    } as GenericEffectData,
  };

  const scanlineContainer = {
    id: 'scanline-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-20',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: scanlineId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 2px; background: linear-gradient(90deg, transparent, ${params.glowColor}80, transparent); box-shadow: 0 0 10px ${params.glowColor};"></div>`,
          className: 'w-full',
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [scanlineEffect],
      },
    ] as RenderableComponentData[],
  };

  // Create text container with letters
  const textContainer = {
    id: 'text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-10 flex items-center justify-center w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: 'letters-layout',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row items-center justify-center relative',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: letterComponents as RenderableComponentData[],
      },
    ] as RenderableComponentData[],
  };

  // Root container
  const rootContainer = {
    id: 'sci-fi-typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      scanlineContainer,
      textContainer,
    ] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'sci-fi-typokinetics-expansion',
  title: 'Sci-Fi Typokinetics Expansion',
  description:
    'Cinematic typokinetics preset with sci-fi holographic UI animations. Letters start stacked with digital glitch effects and random horizontal offsets, then smoothly track outward while glitch decreases. Features chromatic aberration (RGB channel splitting), scanline effects, and data-stream materialization feel. Includes glitch phase (0.3s), smooth expansion (0.7s), and settle phase (0.2s) for a futuristic technical aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'sci-fi',
    'holographic',
    'glitch',
    'chromatic-aberration',
    'scanline',
    'futuristic',
    'technical',
    'expansion',
    'typokinetics',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HOLOGRAM',
    duration: 1.2,
    fontSize: 72,
    textColor: '#00FFFF',
    glowColor: '#00FFFF',
    glitchIntensity: 1,
    chromaticIntensity: 1,
    letterSpacing: 20,
    scanlineSpeed: 1,
  },
};

// Export preset
export const sciFiTypokineticsExpansionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
