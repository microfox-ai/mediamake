/**
 * Perspective Zoom Typography Preset
 *
 * This preset creates a dramatic 3D perspective zoom effect that simulates a camera
 * pushing through text. Text starts far away and small, then dramatically zooms through
 * the viewport as if flying through the letters. Perfect for action movie trailers and
 * dynamic title reveals.
 *
 * Features:
 * - **3D Perspective Depth**: Uses perspective transforms for dramatic depth effect
 * - **Camera Push Through**: Text grows beyond viewport as camera approaches
 * - **Letter-Level Control**: Individual letters with timing offsets for dynamic feel
 * - **Exponential Acceleration**: Cubic-bezier easing for speed-up effect
 * - **Motion Blur**: CSS filter blur during fastest movement phase
 * - **Opacity Fades**: Smooth fade in/out as text passes camera
 * - **Performance Optimized**: Uses transform3d() and will-change properties
 *
 * Use cases:
 * - Action movie trailer title reveals
 * - Dramatic opening sequences
 * - High-energy promotional content
 * - Dynamic brand intros
 * - Cinematic typography effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { TextAtomData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PRESET PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with perspective zoom effect (will be split into letters)'),
  
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the effect in seconds'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:900")'),
  
  fontSize: z
    .number()
    .min(48)
    .max(300)
    .default(96)
    .describe('Base font size in pixels'),
  
  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  
  letterOffset: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Time offset between each letter animation start (seconds)'),
  
  perspective: z
    .number()
    .min(300)
    .max(1000)
    .default(500)
    .describe('CSS perspective value in pixels (lower = more dramatic)'),
  
  startZ: z
    .number()
    .min(-5000)
    .max(-500)
    .default(-2000)
    .describe('Starting translateZ position (negative = far away)'),
  
  endZ: z
    .number()
    .min(100)
    .max(1000)
    .default(500)
    .describe('Ending translateZ position (positive = through camera)'),
  
  startScale: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.1)
    .describe('Starting scale factor (small = far away)'),
  
  endScale: z
    .number()
    .min(2)
    .max(5)
    .default(3.0)
    .describe('Ending scale factor (large = close/through)'),
  
  motionBlurIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Motion blur intensity in pixels during fastest phase'),
  
  easingCurve: z
    .array(z.number())
    .length(4)
    .default([0.33, 0.85, 0.67, 1])
    .optional()
    .describe('Cubic-bezier easing curve for acceleration effect'),
});

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Split text into individual letters
  const letters = params.text.split('');
  
  // Container ID
  const containerId = 'perspective-zoom-container';
  
  // Generate letter components
  const letterComponents: RenderableComponentData[] = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    
    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight || 700,
          color: params.textColor,
          fontFamily: fontFamily,
          textTransform: 'uppercase' as const,
          transformStyle: 'preserve-3d' as const,
          willChange: 'transform, opacity',
          display: 'inline-block',
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [],
    } as RenderableComponentData;
  });

  // Generate effects for each letter with staggered timing
  const allEffects: any[] = [];
  
  letters.forEach((letter, index) => {
    const letterId = `letter-${index}`;
    const letterStart = index * params.letterOffset;
    
    // Main zoom effect (translateZ + scale)
    const zoomEffect = {
      id: `zoom-effect-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier',
        easingParams: params.easingCurve,
        start: letterStart,
        duration: params.duration - letterStart,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateZ', val: params.startZ, prog: 0 },
          { key: 'translateZ', val: params.endZ, prog: 1 },
          { key: 'scale', val: params.startScale, prog: 0 },
          { key: 'scale', val: params.endScale, prog: 1 },
        ],
      },
    };
    
    // Opacity effect (fade in at start, fade out at end)
    const opacityEffect = {
      id: `opacity-effect-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: letterStart,
        duration: params.duration - letterStart,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 1, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };
    
    // Motion blur effect (during fastest movement phase: 30%-70%)
    const blurStartTime = letterStart + (params.duration - letterStart) * 0.3;
    const blurDuration = (params.duration - letterStart) * 0.4;
    
    const motionBlurEffect = {
      id: `blur-effect-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: blurStartTime,
        duration: blurDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'blur', val: 0, prog: 0 },
          { key: 'blur', val: params.motionBlurIntensity, prog: 0.5 },
          { key: 'blur', val: 0, prog: 1 },
        ],
      },
    };
    
    allEffects.push(zoomEffect, opacityEffect, motionBlurEffect);
  });

  // Create letter container with flex layout
  const letterContainer: RenderableComponentData = {
    id: 'letter-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d' as const,
          willChange: 'transform',
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
    effects: [],
  } as RenderableComponentData;

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
        style: {
          perspective: `${params.perspective}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [letterContainer],
    effects: allEffects,
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
  id: 'perspective-zoom-typography',
  title: 'Perspective Zoom Typography',
  description:
    'Dramatic 3D perspective zoom effect that simulates a camera pushing through text. Text starts far away and small, then dramatically zooms through the viewport as if flying through the letters. Features perspective depth, letter-level timing offsets, opacity fades, and motion blur for an action movie trailer aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    '3d',
    'perspective',
    'zoom',
    'camera',
    'dramatic',
    'cinematic',
    'title',
    'reveal',
    'action',
    'trailer',
    'motion-blur',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'IMPACT',
    duration: 3,
    font: 'Inter:700',
    fontSize: 96,
    textColor: '#ffffff',
    letterOffset: 0.1,
    perspective: 500,
    startZ: -2000,
    endZ: 500,
    startScale: 0.1,
    endScale: 3.0,
    motionBlurIntensity: 8,
    easingCurve: [0.33, 0.85, 0.67, 1],
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const perspectiveZoomTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
