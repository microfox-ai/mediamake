/**
 * Swiss Design Text Reveal Preset
 *
 * This preset creates a minimalist Swiss design-inspired text reveal animation
 * where each character's outline draws itself using animated stroke-dasharray,
 * followed by an elegant vertical wipe fill effect. The animation is clean,
 * precise, and sophisticated - like watching a designer's pen sketch that
 * magically colors itself.
 *
 * Features:
 * - **Stroke Drawing Animation**: Each character's outline draws itself following
 *   the natural path of the letter using stroke-dasharray and stroke-dashoffset
 * - **Vertical Wipe Fill**: After the stroke draws, a vertical wipe effect slides
 *   down from top to reveal the solid color fill
 * - **Per-Character Control**: Each character is a separate TextAtom for independent
 *   animation control and timing
 * - **Swiss Design Aesthetic**: Monospace typography, clean spacing, centered alignment
 * - **Configurable Timing**: Adjustable stroke duration, pause duration, and fill duration
 *
 * Use cases:
 * - Creating elegant text reveals for titles and headlines
 * - Building sophisticated typography animations
 * - Adding Swiss design-inspired visual effects
 * - Creating satisfying 'writing' effects followed by color fills
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text to display with stroke-draw and fill reveal animation'),
  
  // Typography
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family (e.g., "Inter", "Roboto")'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z.string().default('#000000').describe('Final text fill color'),
  strokeColor: z.string().default('#000000').describe('Stroke color for drawing animation'),
  strokeWidth: z.number().default(2).describe('Stroke width in pixels'),
  letterSpacing: z.string().default('0.1em').describe('Letter spacing for Swiss design aesthetic'),
  
  // Animation Timing (percentages of total duration)
  strokeDrawDuration: z.number().min(0).max(1).default(0.5).describe('Duration for stroke drawing animation (0-50% of total duration)'),
  pauseDuration: z.number().min(0).max(0.2).default(0.1).describe('Pause duration after stroke before fill (0-10% of total duration)'),
  fillDuration: z.number().min(0).max(1).default(0.4).describe('Duration for vertical fill wipe (remaining duration)'),
  
  // Layout
  alignment: z.enum(['left', 'center', 'right']).default('center').describe('Horizontal alignment of text'),
  verticalAlignment: z.enum(['top', 'center', 'bottom']).default('center').describe('Vertical alignment of text'),
  backgroundColor: z.string().default('#FFFFFF').describe('Background color'),
  
  // Advanced
  staggerDelay: z.number().min(0).max(0.2).default(0.05).describe('Delay between each character animation (seconds)'),
  strokePathLength: z.number().default(1000).describe('Stroke path length for dasharray calculation (fixed value)'),
  
  // Duration
  duration: z.number().min(1).max(30).default(5).describe('Total animation duration in seconds'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    strokeColor,
    strokeWidth,
    letterSpacing,
    strokeDrawDuration,
    pauseDuration,
    fillDuration,
    alignment,
    verticalAlignment,
    backgroundColor,
    staggerDelay,
    strokePathLength,
    duration,
  } = params;

  // Split text into characters
  const characters = text.split('');

  // Calculate timing phases (relative to parent)
  const strokeDrawPhase = strokeDrawDuration; // 0% to 50%
  const pausePhase = pauseDuration; // 50% to 60%
  const fillPhase = fillDuration; // 60% to 100%

  // Calculate absolute timing for each phase
  const strokeDrawEnd = duration * strokeDrawPhase;
  const pauseEnd = strokeDrawEnd + duration * pausePhase;
  const fillEnd = duration;

  // Helper function to create character components with stroke-draw and fill effects
  const createCharacterComponent = (char: string, index: number): RenderableComponentData => {
    const charId = `char-${index}`;
    const staggerOffset = index * staggerDelay;

    // Stroke drawing effect (0% to strokeDrawPhase%)
    const strokeDrawEffect = {
      id: `stroke-draw-${charId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: staggerOffset,
        duration: strokeDrawEnd - staggerOffset,
        mode: 'provider' as const,
        targetIds: [charId],
        ranges: [
          // Animate stroke-dashoffset from strokePathLength to 0 (draws the stroke)
          { key: 'strokeDashoffset', val: strokePathLength, prog: 0 },
          { key: 'strokeDashoffset', val: 0, prog: 1 },
          // Keep fill transparent during stroke drawing
          { key: 'color', val: 'transparent', prog: 0 },
          { key: 'color', val: 'transparent', prog: 1 },
        ],
      },
    };

    // Vertical fill wipe effect (pauseEnd to fillEnd)
    const fillWipeEffect = {
      id: `fill-wipe-${charId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: pauseEnd + staggerOffset,
        duration: fillEnd - pauseEnd - staggerOffset,
        mode: 'provider' as const,
        targetIds: [charId],
        ranges: [
          // Animate clipPath polygon for vertical wipe (top to bottom)
          { 
            key: 'clipPath', 
            val: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)', 
            prog: 0 
          },
          { 
            key: 'clipPath', 
            val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', 
            prog: 1 
          },
          // Transition to solid color
          { key: 'color', val: textColor, prog: 0 },
          { key: 'color', val: textColor, prog: 1 },
        ],
      },
    };

    return {
      id: charId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char === ' ' ? '\u00A0' : char, // Non-breaking space for spaces
        style: {
          fontSize: fontSize,
          fontWeight: fontWeight,
          color: 'transparent', // Start with transparent fill
          display: 'inline-block',
          // Stroke properties for drawing animation
          WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
          textStroke: `${strokeWidth}px ${strokeColor}`,
          // Stroke-dasharray and stroke-dashoffset for drawing animation
          WebkitTextStrokeWidth: `${strokeWidth}px`,
          paintOrder: 'stroke fill',
          strokeDasharray: `${strokePathLength} ${strokePathLength}`,
          strokeDashoffset: strokePathLength,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [strokeDrawEffect, fillWipeEffect],
    } as RenderableComponentData;
  };

  // Create character components
  const characterComponents = characters.map((char, index) =>
    createCharacterComponent(char, index)
  ) as RenderableComponentData[];

  // Determine alignment classes
  const justifyClass = 
    alignment === 'left' ? 'justify-start' :
    alignment === 'right' ? 'justify-end' :
    'justify-center';

  const itemsClass = 
    verticalAlignment === 'top' ? 'items-start' :
    verticalAlignment === 'bottom' ? 'items-end' :
    'items-center';

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'swiss-text-reveal-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `grid place-items-center min-h-screen`,
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'text-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `flex ${justifyClass} ${itemsClass}`,
            style: {
              letterSpacing: letterSpacing,
              gap: '0', // No gap, letterSpacing handles spacing
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: characterComponents,
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

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
  id: 'swiss-design-text-reveal',
  title: 'Swiss Design Text Reveal',
  description:
    'A minimalist Swiss design-inspired preset featuring elegant text reveal animations. Text outlines draw themselves using stroke-dasharray animation, then fill with solid color using a vertical wipe effect sliding down from top. Clean, precise, and sophisticated aesthetic with monospace typography and centered alignment.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'swiss-design',
    'minimalist',
    'reveal',
    'stroke',
    'draw',
    'wipe',
    'fill',
    'animation',
    'monospace',
    'elegant',
    'sophisticated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SWISS',
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#000000',
    strokeColor: '#000000',
    strokeWidth: 2,
    letterSpacing: '0.1em',
    strokeDrawDuration: 0.5,
    pauseDuration: 0.1,
    fillDuration: 0.4,
    alignment: 'center',
    verticalAlignment: 'center',
    backgroundColor: '#FFFFFF',
    staggerDelay: 0.05,
    strokePathLength: 1000,
    duration: 5,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const swissDesignTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
