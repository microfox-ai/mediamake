/**
 * Typokinetics Bilateral Expansion Preset
 *
 * A refined typokinetics animation where letters alternately track left and right from center,
 * creating a symmetric unfolding effect like opening double doors or curtains parting.
 * Even-indexed letters track left, odd-indexed track right, with increasing distance based on position.
 *
 * Features:
 * - **Bilateral Expansion**: Letters split from center, alternating left/right direction
 * - **Staggered Animation**: Sequential reveal from center outward with position-based delays
 * - **Micro-Animations**: Subtle fade-in (50% to 100% opacity), scale-up (0.95 to 1.0), and blur clearing (2px to 0)
 * - **Smooth Easing**: Professional cubic-bezier easing for polished motion
 * - **Performance Optimized**: GPU-accelerated transforms, grouped animations by direction
 *
 * Use cases:
 * - Centered title reveals with dramatic flair
 * - Logo animations with elegant expansion effect
 * - Split-screen style text transitions
 * - Opening sequences for videos or presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text content to display with bilateral expansion effect'),
  
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Total duration of the animation in seconds'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(64)
    .describe('Font size in pixels for the text'),
  
  fontColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the text (CSS color value)'),
  
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  letterSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(16)
    .describe('Spacing between letters in pixels during expansion'),
  
  expansionDistance: z
    .number()
    .min(10)
    .max(200)
    .default(40)
    .describe('Base distance in pixels each letter pair travels from center'),
  
  staggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.06)
    .describe('Delay in seconds between each letter pair animation start'),
  
  animationDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of each individual letter animation in seconds'),
  
  gradient: z
    .string()
    .optional()
    .describe('Optional CSS gradient for text (e.g., "linear-gradient(90deg, #FF0000, #0000FF)")'),
  
  background: z
    .object({
      enabled: z.boolean().default(false),
      color: z.string().default('rgba(0, 0, 0, 0.3)'),
      blur: z.number().min(0).max(20).default(10),
      padding: z.number().min(0).max(50).default(20),
      borderRadius: z.number().min(0).max(50).default(12),
    })
    .optional()
    .describe('Optional background box styling for the text container'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Split text into individual letters
  const letters = params.text.split('');
  const totalLetters = letters.length;

  // Create letter components with bilateral expansion
  const letterComponents: RenderableComponentData[] = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    
    // Calculate direction: even indices go left (negative), odd go right (positive)
    const direction = index % 2 === 0 ? -1 : 1;
    
    // Calculate distance from center based on position
    // Letters further from center travel more distance
    const pairIndex = Math.floor(index / 2);
    const translateDistance = pairIndex * params.expansionDistance * direction;
    
    // Calculate staggered delay based on pair index
    const animationDelay = pairIndex * params.staggerDelay;

    // Letter component
    const letterComponent: RenderableComponentData = {
      id: letterId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: letter,
        style: {
          fontSize: `${params.fontSize}px`,
          color: params.fontColor,
          display: 'inline-block',
          transformOrigin: 'center center',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
        ...(params.gradient ? { gradient: params.gradient } : {}),
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `${letterId}-expansion`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)', // Professional easing
            start: animationDelay,
            duration: params.animationDuration,
            mode: 'provider',
            targetIds: [letterId],
            ranges: [
              // Horizontal translation (bilateral expansion)
              { key: 'translateX', val: translateDistance, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              
              // Opacity fade-in (50% to 100%)
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              
              // Scale micro-animation (0.95 to 1.0)
              { key: 'scale', val: 0.95, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              
              // Blur clearing (2px to 0)
              { key: 'filter', val: 'blur(2px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    };

    return letterComponent;
  });

  // Create center anchor layout (reference point for bilateral split)
  const centerAnchor: RenderableComponentData = {
    id: 'bilateral-center-anchor',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-row items-center justify-center',
        style: {
          letterSpacing: `${params.letterSpacing}px`,
          ...(params.background?.enabled
            ? {
                backgroundColor: params.background.color,
                backdropFilter: `blur(${params.background.blur}px)`,
                padding: `${params.background.padding}px`,
                borderRadius: `${params.background.borderRadius}px`,
              }
            : {}),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: letterComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-bilateral-expansion-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [centerAnchor],
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
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-bilateral-expansion',
  title: 'Typokinetics Bilateral Expansion',
  description:
    'A refined typokinetics preset featuring staggered bilateral expansion where letters alternately track left and right from center, creating a symmetric unfolding effect like opening double doors or curtains parting. Even-indexed letters move left, odd-indexed move right, with increasing distance based on position. Includes subtle fade-in (50% to 100% opacity), micro scale-up (0.95 to 1.0), and blur clearing (2px to 0) for polish. Perfect for centered titles, logos, or dramatic text reveals with elegant balanced expansion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'bilateral',
    'expansion',
    'split',
    'center',
    'doors',
    'curtains',
    'elegant',
    'title',
    'logo',
    'reveal',
    'staggered',
    'symmetric',
  ],
  defaultInputParams: {
    text: 'BILATERAL',
    duration: 2,
    fontSize: 64,
    fontColor: '#FFFFFF',
    font: 'Inter:700',
    letterSpacing: 16,
    expansionDistance: 40,
    staggerDelay: 0.06,
    animationDuration: 0.8,
    background: {
      enabled: false,
      color: 'rgba(0, 0, 0, 0.3)',
      blur: 10,
      padding: 20,
      borderRadius: 12,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const typokineticsBilateralExpansionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
