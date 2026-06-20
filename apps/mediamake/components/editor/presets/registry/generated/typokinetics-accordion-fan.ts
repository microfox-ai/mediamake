/**
 * Typokinetics Accordion Fan Preset
 * 
 * A smooth, professional typokinetics preset that expands letters like opening an accordion
 * or spreading a deck of cards. Perfect for corporate titles, presentations, or elegant reveals.
 * 
 * Features:
 * - Letters start completely stacked in the center with proper z-index layering
 * - Fan out horizontally with beautiful ease-out curve (cubic-bezier with overshoot)
 * - Subtle 3D Y-axis rotation creates depth - center letters rotate less, outer letters rotate more
 * - Gentle arc formation from rotation creates premium, polished look
 * - Soft shadows grow stronger as letters separate, emphasizing spatial transformation
 * - GPU-accelerated transforms for smooth 60fps performance
 * - Premium motion graphics quality suitable for high-end productions
 * 
 * Use cases:
 * - Corporate title reveals
 * - Presentation intros
 * - Elegant text animations
 * - Professional brand reveals
 * - High-end motion graphics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .min(1)
    .max(50)
    .describe('Text to animate with accordion fan effect (1-50 characters)'),
  
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Montserrat:600:italic")',
    ),
  
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(72)
    .describe('Font size in pixels (24-300)'),
  
  textColor: z
    .string()
    .default('#1a1a1a')
    .describe('Text color (CSS color value, hex, rgb, or rgba)'),
  
  letterSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(60)
    .describe('Final spacing between letters in pixels after expansion (0-100)'),
  
  expansionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.0)
    .describe('Duration of expansion animation in seconds (0.5-3)'),
  
  expansionDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Delay between each letter starting animation (center-out cascade) in seconds (0-0.2)'),
  
  rotationIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Intensity of Y-axis rotation per letter in degrees (0-10, creates arc depth)'),
  
  depthIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Intensity of Z-axis translation per letter in pixels (0-5, creates spatial depth)'),
  
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Maximum shadow opacity (0-1, shadows emphasize spatial transformation)'),
  
  holdDuration: z
    .number()
    .min(0)
    .max(10)
    .default(2.0)
    .describe('Duration to hold expanded state before collapsing in seconds (0-10)'),
  
  totalDuration: z
    .number()
    .optional()
    .describe('Total duration of the animation in seconds (optional, auto-calculated if not provided)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const parseFontString = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0];
    const weight = parts[1] ? parseInt(parts[1], 10) : undefined;
    const style = parts[2] || 'normal';
    
    return {
      family,
      weight,
      style: style as 'normal' | 'italic',
      weights: weight ? [weight.toString()] : undefined,
    };
  };

  const fontConfig = params.font
    ? parseFontString(params.font)
    : { family: 'Inter', weight: 700, style: 'normal' as const, weights: ['700'] };

  // Split text into individual letters
  const letters = params.text.split('');
  const letterCount = letters.length;
  const centerIndex = (letterCount - 1) / 2;

  // Calculate timing
  const expansionDuration = params.expansionDuration;
  const holdDuration = params.holdDuration;
  const totalDuration =
    params.totalDuration ??
    expansionDuration + holdDuration + expansionDuration; // expand + hold + collapse

  // Create letter components with stacked initial position
  const letterComponents: RenderableComponentData[] = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    const textAtomId = `text-${index}`;
    
    // Calculate distance from center for effects intensity
    const distanceFromCenter = Math.abs(index - centerIndex);
    
    // Z-index: letters closer to center have higher z-index (appear on top when stacked)
    const zIndex = Math.round(100 - distanceFromCenter * 10);
    
    // Calculate final position after expansion
    const finalTranslateX = (index - centerIndex) * params.letterSpacing;
    
    // Calculate rotation based on distance from center (creates arc)
    const rotationAngle = distanceFromCenter * params.rotationIntensity;
    const rotateY = index < centerIndex ? rotationAngle : -rotationAngle;
    
    // Calculate depth (translateZ) based on distance from center
    const translateZ = distanceFromCenter * params.depthIntensity;
    
    // Calculate shadow based on distance from center
    const shadowBlur = 4 + distanceFromCenter * 2;
    const shadowOffsetX = finalTranslateX > 0 ? 4 : -4;
    const shadowOffsetY = 6;
    const shadowOpacity = params.shadowIntensity;
    
    // Calculate cascade delay (center-out)
    const cascadeDelay = distanceFromCenter * params.expansionDelay;

    // Create expansion effect (stacked → fanned out)
    const expansionEffect: RenderableComponentData = {
      id: `expansion-effect-${index}`,
      componentId: 'generic',
      type: 'effect' as const,
      data: {
        type: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Smooth overshoot
        start: cascadeDelay,
        duration: expansionDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Horizontal expansion
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: finalTranslateX, prog: 1 },
          // Y-axis rotation for arc depth
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: rotateY, prog: 1 },
          // Z-axis depth
          { key: 'translateZ', val: 0, prog: 0 },
          { key: 'translateZ', val: -translateZ, prog: 1 },
          // Shadow growth
          {
            key: 'filter',
            val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
            prog: 0,
          },
          {
            key: 'filter',
            val: `drop-shadow(${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity}))`,
            prog: 1,
          },
        ],
      },
    };

    // Create collapse effect (fanned out → stacked)
    const collapseEffect: RenderableComponentData = {
      id: `collapse-effect-${index}`,
      componentId: 'generic',
      type: 'effect' as const,
      data: {
        type: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        start: expansionDuration + holdDuration + cascadeDelay,
        duration: expansionDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Horizontal collapse
          { key: 'translateX', val: finalTranslateX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          // Y-axis rotation reset
          { key: 'rotateY', val: rotateY, prog: 0 },
          { key: 'rotateY', val: 0, prog: 1 },
          // Z-axis depth reset
          { key: 'translateZ', val: -translateZ, prog: 0 },
          { key: 'translateZ', val: 0, prog: 1 },
          // Shadow fade
          {
            key: 'filter',
            val: `drop-shadow(${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity}))`,
            prog: 0,
          },
          {
            key: 'filter',
            val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
            prog: 1,
          },
        ],
      },
    };

    // Letter wrapper with absolute positioning (stacked in center)
    return {
      id: letterId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          style: {
            zIndex,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [
        {
          id: textAtomId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: letter,
            className: 'block transform-gpu',
            style: {
              fontSize: `${params.fontSize}px`,
              fontWeight: fontConfig.weight || 700,
              fontStyle: fontConfig.style,
              color: params.textColor,
            },
            font: {
              family: fontConfig.family,
              weights: fontConfig.weights,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [expansionEffect, collapseEffect],
    } as RenderableComponentData;
  });

  // Inner container with 3D transform preservation
  const innerContainer: RenderableComponentData = {
    id: 'inner-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: letterComponents,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'accordion-fan-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [innerContainer],
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
  id: 'typokinetics-accordion-fan',
  title: 'Typokinetics Accordion Fan',
  description:
    'Professional typokinetics preset that expands letters like an accordion or card deck. Letters start stacked in center with proper z-indexing, then fan out horizontally with subtle 3D Y-axis rotation creating an elegant arc formation. Features soft shadows that grow as letters separate, smooth cubic-bezier easing with slight overshoot, and center-out cascade timing for a premium, polished reveal perfect for corporate titles and presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'accordion',
    'fan',
    'expand',
    'corporate',
    'professional',
    'elegant',
    '3d',
    'depth',
    'arc',
    'shadow',
    'premium',
  ],
  defaultInputParams: {
    text: 'TITLE',
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#1a1a1a',
    letterSpacing: 60,
    expansionDuration: 1.0,
    expansionDelay: 0.05,
    rotationIntensity: 3,
    depthIntensity: 2,
    shadowIntensity: 0.2,
    holdDuration: 2.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const typokineticsAccordionFanPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
