/**
 * Cinematic Text Dissolution Preset
 *
 * This preset creates a dramatic text exit animation where text gradually shrinks into nothingness
 * while fading out, like words being absorbed into a void. Perfect for movie trailer-style dramatic exits.
 *
 * Features:
 * - **Non-uniform shrinking**: Text shrinks with exponential acceleration
 * - **Opacity fade**: Smooth fade from 1 to 0 with ease-in easing
 * - **Increasing blur**: Blur grows from 0 to 8px to create depth-of-field effect
 * - **Subtle rotation**: 0 to 5deg rotation for dynamic movement
 * - **GPU acceleration**: Uses transform properties with hardware acceleration
 * - **Performance optimized**: will-change and translateZ(0) for smooth rendering
 *
 * Use cases:
 * - Movie trailer text exits
 * - Dramatic end titles
 * - Cinematic transitions
 * - Professional video outros
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display and dissolve'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(3)
    .describe('Duration of the dissolution effect in seconds'),
  fontSize: z
    .string()
    .optional()
    .default('72px')
    .describe('Font size of the text (e.g., "72px", "5rem")'),
  fontWeight: z
    .string()
    .optional()
    .default('bold')
    .describe('Font weight (e.g., "normal", "bold", "700")'),
  color: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  fontFamily: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family name (Google Font)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const textId = 'dissolution-text';
  const containerId = 'dissolution-container';

  // Parse font configuration
  const fontString = params.fontFamily || 'Inter';
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

  // If no font weight from string, use params
  if (!fontStyle.fontWeight && params.fontWeight) {
    fontStyle.fontWeight = params.fontWeight as any;
  }

  // Create the dissolution effect
  const dissolutionEffect: GenericEffectData = {
    type: 'linear', // Use linear for manual cubic-bezier control
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Opacity: fade from 1 to 0 with ease-in
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0.7, prog: 0.4 },
      { key: 'opacity', val: 0, prog: 1 },

      // Scale: shrink from 1 to 0 with exponential acceleration (cubic-bezier approximation)
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 0.85, prog: 0.3 },
      { key: 'scale', val: 0.5, prog: 0.6 },
      { key: 'scale', val: 0.2, prog: 0.8 },
      { key: 'scale', val: 0, prog: 1 },

      // Blur: increase from 0 to 8px linearly for depth-of-field
      { key: 'filter', val: 'blur(0px)', prog: 0 },
      { key: 'filter', val: 'blur(2px)', prog: 0.3 },
      { key: 'filter', val: 'blur(5px)', prog: 0.7 },
      { key: 'filter', val: 'blur(8px)', prog: 1 },

      // Rotate: subtle 0 to 5deg rotation for dynamic movement
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: 2, prog: 0.5 },
      { key: 'rotate', val: 5, prog: 1 },

      // GPU acceleration with translateZ
      { key: 'translateZ', val: 0, prog: 0 },
      { key: 'translateZ', val: 0, prog: 1 },
    ],
  };

  const effect = {
    id: 'dissolution-effect',
    componentId: 'generic',
    data: dissolutionEffect,
  };

  // Create text atom
  const textAtom = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        color: params.color,
        textAlign: 'center' as const,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        willChange: 'transform, opacity, filter',
        transform: 'translateZ(0)', // GPU acceleration
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
    effects: [effect],
  } as RenderableComponentData;

  // Create root container with centered layout
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d' as const, // Smoother 3D scaling
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'cinematic-text-dissolution',
  title: 'Cinematic Text Dissolution',
  description:
    'A dramatic text exit animation where text shrinks non-uniformly into nothingness while fading out, creating a cinematic effect like words being absorbed into a void. Features exponential shrinking with subtle rotation, increasing blur for depth-of-field, and opacity fade - perfect for movie trailer-style dramatic exits.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cinematic',
    'dissolution',
    'exit',
    'fade',
    'shrink',
    'blur',
    'dramatic',
    'trailer',
    'movie',
  ],
  defaultInputParams: {
    text: 'FADE TO BLACK',
    duration: 3,
    fontSize: '72px',
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Inter',
  },
  dependencies: {},
};

// Export preset
export const cinematicTextDissolutionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
