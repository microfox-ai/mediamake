/**
 * Letter Morph Kinetic Typography Preset
 *
 * This preset creates smooth letter-to-letter morphing transitions where letters
 * physically transform between text lines using liquid-like shape animations.
 * Features stretching, squashing, rotation, skew distortion, and particle trail effects.
 *
 * Technical approach:
 * - Two text layers (line1 and line2) with fade in/out transitions
 * - Morph layer with complex transform animations (scale, rotate, skew)
 * - Multiple trail echo layers with blur and translation for particle effects
 * - All effects use elastic cubic-bezier easing for liquid-like morphing
 *
 * Features:
 * - **Liquid Morph Animation**: Letters stretch, squash, and rotate during transformation
 * - **Particle Trail Effects**: Multiple semi-transparent echoes create trailing particle effects
 * - **Elastic Easing**: Cubic-bezier(0.68, -0.55, 0.265, 1.55) for bouncy, elastic feel
 * - **Layered Effects**: Combines scale, rotation, and skew for complex kinetic motion
 * - **Smooth Transitions**: Fade in/out for entering and exiting text lines
 *
 * Use cases:
 * - Creating kinetic typography transitions for video morphing effects
 * - Building liquid-like text animations for motion graphics
 * - Adding energetic text transformations for social media content
 * - Creating professional typographic metamorphosis effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type {
  GenericEffectData,
  TextAtomData,
  BaseLayoutData,
} from '@microfox/remotion';

// Define preset parameters
const presetParams = z.object({
  line1Text: z.string().describe('First line of text to morph from'),
  line2Text: z.string().describe('Second line of text to morph to'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  fontSize: z
    .number()
    .default(96)
    .describe('Font size in pixels for both lines'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for both lines'),
  transitionDuration: z
    .number()
    .default(3)
    .describe('Total duration of the morph transition in seconds'),
  morphOverlapDuration: z
    .number()
    .default(1.4)
    .describe('Duration of the morph overlap period in seconds'),
  fadeInDuration: z
    .number()
    .default(1.5)
    .describe('Duration of line1 fade in (from start)'),
  fadeOutDuration: z
    .number()
    .default(1.5)
    .describe('Duration of line2 fade out (at end)'),
  elasticEasing: z
    .string()
    .default('cubic-bezier(0.68, -0.55, 0.265, 1.55)')
    .describe('Cubic-bezier easing function for elastic morphing feel'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
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

  const {
    line1Text,
    line2Text,
    fontSize,
    textColor,
    transitionDuration,
    morphOverlapDuration,
    fadeInDuration,
    fadeOutDuration,
    elasticEasing,
  } = params;

  // Calculate timing for morph layers
  // Line 1: visible from 0 to transitionDuration - fadeOutDuration
  const line1Duration = transitionDuration - fadeOutDuration;
  // Line 2: starts at fadeInDuration, lasts until end
  const line2Start = fadeInDuration;
  const line2Duration = transitionDuration - fadeInDuration;

  // Morph layer: active during overlap period (centered in transition)
  const morphStart = (transitionDuration - morphOverlapDuration) / 2;
  const morphEnd = morphStart + morphOverlapDuration;

  // Create text atoms
  const line1TextAtom: RenderableComponentData = {
    id: 'line1-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: line1Text,
      className: 'text-center',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: 'bold',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: line1Duration,
      },
    },
    effects: [
      // Fade out effect
      {
        id: 'line1-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: line1Duration - fadeOutDuration,
          duration: fadeOutDuration,
          mode: 'provider',
          targetIds: ['line1-text'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  const line2TextAtom: RenderableComponentData = {
    id: 'line2-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: line2Text,
      className: 'text-center',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: 'bold',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
    } as TextAtomData,
    context: {
      timing: {
        start: line2Start,
        duration: line2Duration,
      },
    },
    effects: [
      // Fade in effect
      {
        id: 'line2-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: fadeInDuration,
          mode: 'provider',
          targetIds: ['line2-text'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Morph layer with complex transform effects
  const morphLayerAtom: RenderableComponentData = {
    id: 'morph-layer',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: line1Text, // Morphing from line1 text
      className: 'text-center absolute',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: 'bold',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
    } as TextAtomData,
    context: {
      timing: {
        start: morphStart,
        duration: morphOverlapDuration,
      },
    },
    effects: [
      // Scale morphing (stretch and squash)
      {
        id: 'morph-scale',
        componentId: 'generic',
        data: {
          type: elasticEasing,
          start: 0,
          duration: morphOverlapDuration,
          mode: 'provider',
          targetIds: ['morph-layer'],
          ranges: [
            // ScaleX: 1 -> 1.3 -> 0.8 -> 1.2 -> 1
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.3, prog: 0.25 },
            { key: 'scaleX', val: 0.8, prog: 0.5 },
            { key: 'scaleX', val: 1.2, prog: 0.75 },
            { key: 'scaleX', val: 1, prog: 1 },
            // ScaleY: 1 -> 0.7 -> 1.4 -> 0.85 -> 1
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 0.7, prog: 0.25 },
            { key: 'scaleY', val: 1.4, prog: 0.5 },
            { key: 'scaleY', val: 0.85, prog: 0.75 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Rotation effect
      {
        id: 'morph-rotate',
        componentId: 'generic',
        data: {
          type: elasticEasing,
          start: 0,
          duration: morphOverlapDuration,
          mode: 'provider',
          targetIds: ['morph-layer'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 5, prog: 0.33 },
            { key: 'rotate', val: -5, prog: 0.66 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Skew distortion effect
      {
        id: 'morph-skew',
        componentId: 'generic',
        data: {
          type: elasticEasing,
          start: 0,
          duration: morphOverlapDuration,
          mode: 'provider',
          targetIds: ['morph-layer'],
          ranges: [
            { key: 'skewX', val: 0, prog: 0 },
            { key: 'skewX', val: 15, prog: 0.25 },
            { key: 'skewX', val: -10, prog: 0.5 },
            { key: 'skewX', val: 8, prog: 0.75 },
            { key: 'skewX', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Trail echo layers (particle effects)
  const trailEcho1: RenderableComponentData = {
    id: 'trail-echo-1',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: line1Text,
      className: 'text-center absolute opacity-20',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: 'bold',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
    } as TextAtomData,
    context: {
      timing: {
        start: morphStart + 0.1, // Slight delay
        duration: morphOverlapDuration - 0.1,
      },
    },
    effects: [
      {
        id: 'trail-echo-1-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: morphOverlapDuration - 0.1,
          mode: 'provider',
          targetIds: ['trail-echo-1'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(8px)', prog: 0.5 },
            { key: 'filter', val: 'blur(12px)', prog: 1 },
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -15, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  const trailEcho2: RenderableComponentData = {
    id: 'trail-echo-2',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: line1Text,
      className: 'text-center absolute opacity-10',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: 'bold',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
    } as TextAtomData,
    context: {
      timing: {
        start: morphStart + 0.2, // Larger delay
        duration: morphOverlapDuration - 0.2,
      },
    },
    effects: [
      {
        id: 'trail-echo-2-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: morphOverlapDuration - 0.2,
          mode: 'provider',
          targetIds: ['trail-echo-2'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(12px)', prog: 0.5 },
            { key: 'filter', val: 'blur(20px)', prog: 1 },
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -30, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'letter-morph-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    } as BaseLayoutData,
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      line1TextAtom,
      line2TextAtom,
      morphLayerAtom,
      trailEcho1,
      trailEcho2,
    ] as RenderableComponentData[],
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
  id: 'letter-morph-kinetic-typography',
  title: 'Letter Morph Kinetic Typography',
  description:
    'Advanced kinetic typography preset featuring smooth letter-to-letter morphing transitions. Letters physically transform between text lines using liquid-like shape animations with stretching, squashing, rotation, and particle trail effects. Common letters morph in place while unique letters fade in/out, creating a fluid typographic metamorphosis.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'morph',
    'transition',
    'text',
    'animation',
    'liquid',
    'particle',
    'trail',
    'elastic',
    'transform',
  ],
  defaultInputParams: {
    line1Text: 'FIRST LINE',
    line2Text: 'SECOND LINE',
    font: 'Inter:700',
    fontSize: 96,
    textColor: '#FFFFFF',
    transitionDuration: 3,
    morphOverlapDuration: 1.4,
    fadeInDuration: 1.5,
    fadeOutDuration: 1.5,
    elasticEasing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const letterMorphKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
