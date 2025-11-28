/**
 * Bouncy Inflatable Typography Preset
 *
 * Creates an energetic, party-like animation where text elements behave like bouncy inflatable 
 * letters being rapidly inflated. Each word starts completely flat (scaleY: 0) then inflates 
 * with multiple bounce passes - first vertically, then horizontally, creating a balloon-like 
 * expansion effect.
 *
 * Features:
 * - Multi-phase scale animation (vertical → horizontal bounce)
 * - Skew deformation for squish effect during bounces
 * - Sliding gradient overlays that mimic light reflecting off shiny balloon material
 * - Continuous breathing effect after initial inflation
 * - Staggered word animation for confetti-like energy
 * - Transform-GPU acceleration for smooth performance
 * - 3D perspective depth for enhanced visual impact
 *
 * Use cases:
 * - Party celebration videos
 * - Event announcements
 * - Birthday greetings
 * - Festive social media content
 * - Product launch reveals
 * - Energetic title sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  words: z
    .array(z.string())
    .default(['PARTY', 'TIME', 'CELEBRATE'])
    .describe('Array of words to display with bouncy inflation animation'),
  
  fontSize: z
    .number()
    .min(20)
    .max(400)
    .default(112)
    .describe('Base font size in pixels for the text'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family to use (e.g., "Inter", "Roboto", "Montserrat")'),
  
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (e.g., "400", "700", "900" for black)'),
  
  wordStagger: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Delay in seconds between each word animation start'),
  
  inflationIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for bounce intensity (higher = more bouncy)'),
  
  breathingIntensity: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Scale amount for the breathing effect (0 = none, 0.1 = 10% scale)'),
  
  gradients: z
    .array(
      z.object({
        colors: z
          .array(z.string())
          .describe('Array of color stops for the gradient'),
        angle: z
          .number()
          .default(135)
          .describe('Gradient angle in degrees'),
      })
    )
    .default([
      {
        colors: ['#FF6B9D', '#C06C84', '#6C5B7B', '#355C7D', '#2A9D8F'],
        angle: 135,
      },
      {
        colors: ['#FFA07A', '#FA8072', '#E9967A', '#F08080', '#FFB6C1'],
        angle: 135,
      },
      {
        colors: ['#FFD700', '#FFA500', '#FF8C00', '#FF6347', '#FF1493'],
        angle: 135,
      },
    ])
    .describe('Array of gradient configurations for each word'),
  
  containerGap: z
    .number()
    .min(0)
    .max(100)
    .default(16)
    .describe('Gap in pixels between words'),
  
  dropShadow: z
    .boolean()
    .default(true)
    .describe('Whether to apply drop shadow to text for depth'),
  
  perspectiveDepth: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Perspective depth in pixels for 3D effect'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to create gradient string
  const createGradient = (colors: string[], angle: number): string => {
    const colorStops = colors
      .map((color, index) => {
        const position = (index / (colors.length - 1)) * 100;
        return `${color} ${position}%`;
      })
      .join(', ');
    return `linear-gradient(${angle}deg, ${colorStops})`;
  };

  // Generate word components with staggered animations
  const wordComponents: RenderableComponentData[] = params.words.map(
    (word, wordIndex) => {
      const wordId = `word-${wordIndex}`;
      const textAtomId = `text-atom-${wordIndex}`;
      
      // Select gradient for this word (cycle if more words than gradients)
      const gradientConfig = params.gradients[wordIndex % params.gradients.length];
      const gradientString = createGradient(
        gradientConfig.colors,
        gradientConfig.angle,
      );
      
      // Calculate stagger start time
      const wordStart = wordIndex * params.wordStagger;
      
      // Base durations for phases
      const phase1Duration = 0.6 * params.inflationIntensity;
      const phase2Duration = 0.4 * params.inflationIntensity;
      const phase2Start = 0.4;
      const skewDuration = 0.6 * params.inflationIntensity;
      const gradientDuration = 1.2;
      const breathingStart = 1.0;
      const breathingDuration = 2.0;
      
      // Calculate bounce peaks based on intensity
      const scaleYPeak = 1.3 * params.inflationIntensity;
      const scaleYDip = 0.8 / params.inflationIntensity;
      const scaleYSecondPeak = 1.1 * params.inflationIntensity;
      
      const scaleXPeak = 1.2 * params.inflationIntensity;
      const scaleXDip = 0.9 / params.inflationIntensity;
      const scaleXSecondPeak = 1.05 * params.inflationIntensity;
      
      const skewPeak = 10 * params.inflationIntensity;
      
      // Text atom component
      const textAtom: RenderableComponentData = {
        id: textAtomId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word,
          className: 'font-black',
          style: {
            fontSize: `${params.fontSize}px`,
            fontWeight: params.fontWeight,
            transformOrigin: 'bottom center',
            background: gradientString,
            backgroundSize: '200% 100%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            filter: params.dropShadow
              ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              : 'none',
          },
          font: {
            family: params.fontFamily,
            weights: [params.fontWeight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 3,
          },
        },
      };
      
      // Phase 1: Vertical inflation (scaleY)
      const inflatePhase1Effect = {
        id: `inflate-phase1-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0,
          duration: phase1Duration,
          mode: 'provider' as const,
          targetIds: [textAtomId],
          ranges: [
            { key: 'scaleY', val: 0, prog: 0 },
            { key: 'scaleY', val: scaleYPeak, prog: 0.3 },
            { key: 'scaleY', val: scaleYDip, prog: 0.6 },
            { key: 'scaleY', val: scaleYSecondPeak, prog: 0.85 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      };
      
      // Phase 2: Horizontal inflation (scaleX)
      const inflatePhase2Effect = {
        id: `inflate-phase2-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: phase2Start,
          duration: phase2Duration,
          mode: 'provider' as const,
          targetIds: [textAtomId],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: scaleXPeak, prog: 0.25 },
            { key: 'scaleX', val: scaleXDip, prog: 0.6 },
            { key: 'scaleX', val: scaleXSecondPeak, prog: 0.85 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      };
      
      // Skew bounce effect
      const skewBounceEffect = {
        id: `skew-bounce-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: skewDuration,
          mode: 'provider' as const,
          targetIds: [textAtomId],
          ranges: [
            { key: 'skewX', val: -skewPeak, prog: 0.15 },
            { key: 'skewX', val: skewPeak, prog: 0.45 },
            { key: 'skewX', val: 0, prog: 0.75 },
            { key: 'skewX', val: 0, prog: 1 },
          ],
        },
      };
      
      // Gradient slide effect
      const gradientSlideEffect = {
        id: `gradient-slide-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: gradientDuration,
          mode: 'provider' as const,
          targetIds: [textAtomId],
          ranges: [
            { key: 'backgroundPosition', val: '0% 0%', prog: 0 },
            { key: 'backgroundPosition', val: '200% 0%', prog: 1 },
          ],
        },
      };
      
      // Breathing effect
      const breathingScale = 1 + params.breathingIntensity;
      const breathingEffect = {
        id: `breathing-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: breathingStart,
          duration: breathingDuration,
          loop: true,
          mode: 'provider' as const,
          targetIds: [textAtomId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: breathingScale, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      };
      
      // Word container
      return {
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: wordStart,
            duration: 3,
          },
        },
        childrenData: [textAtom],
        effects: [
          inflatePhase1Effect,
          inflatePhase2Effect,
          skewBounceEffect,
          gradientSlideEffect,
          breathingEffect,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'bouncy-inflatable-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center p-8',
        style: {
          perspective: `${params.perspectiveDepth}px`,
          gap: `${params.containerGap}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 5,
      },
    },
    childrenData: wordComponents,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'bouncy-inflatable-typography',
  title: 'Bouncy Inflatable Typography',
  description:
    'Typographic preset where text elements behave like bouncy inflatable letters with balloon-like expansion, gradient overlays sliding across the surface, squish deformation using skew transforms, and confetti-like party celebration energy. Features multi-phase scale animations with vertical and horizontal bounces, breathing effects, and dynamic gradient highlights.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'animation',
    'bouncy',
    'inflatable',
    'party',
    'celebration',
    'gradient',
    'balloon',
    'confetti',
    'kinetic',
    'energetic',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['PARTY', 'TIME', 'CELEBRATE'],
    fontSize: 112,
    fontFamily: 'Inter',
    fontWeight: '900',
    wordStagger: 0.15,
    inflationIntensity: 1,
    breathingIntensity: 0.05,
    gradients: [
      {
        colors: ['#FF6B9D', '#C06C84', '#6C5B7B', '#355C7D', '#2A9D8F'],
        angle: 135,
      },
      {
        colors: ['#FFA07A', '#FA8072', '#E9967A', '#F08080', '#FFB6C1'],
        angle: 135,
      },
      {
        colors: ['#FFD700', '#FFA500', '#FF8C00', '#FF6347', '#FF1493'],
        angle: 135,
      },
    ],
    containerGap: 16,
    dropShadow: true,
    perspectiveDepth: 1000,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const bouncyInflatableTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
