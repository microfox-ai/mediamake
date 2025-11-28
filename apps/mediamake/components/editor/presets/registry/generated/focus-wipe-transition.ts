/**
 * Split-Screen Focus Wipe Effect Preset
 * 
 * Creates a cinematic focus wipe transition where text clarity sweeps across from one side,
 * simulating a manual lens focus adjustment. The effect uses two overlapping text layers:
 * one blurred (bottom) and one sharp (top), with an animated clip-path revealing the sharp
 * version progressively. Includes subtle lens distortion via skew transform and chromatic
 * aberration (RGB channel splitting) at the blur boundary to simulate realistic lens optics.
 * 
 * Features:
 * - Dual-layer text (blurred base + sharp reveal)
 * - Animated clip-path wipe (left to right by default, configurable)
 * - Optional skew distortion at transition edge
 * - Chromatic aberration (RGB text-shadow splitting)
 * - Smooth optical-quality transition (2s default duration)
 * - GPU-accelerated performance
 * 
 * Use Cases:
 * - Cinematic title reveals
 * - Dramatic text transitions
 * - Focus-pull style effects
 * - Professional video intros/outros
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with focus wipe effect'),
  
  duration: z.number()
    .default(2)
    .describe('Duration of the focus wipe transition in seconds'),
  
  fontSize: z.union([z.string(), z.number()])
    .default('64px')
    .describe('Font size (e.g., "64px" or 64)'),
  
  fontWeight: z.union([z.string(), z.number()])
    .default('700')
    .describe('Font weight (e.g., "700" or "bold")'),
  
  textColor: z.string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  
  blurAmount: z.number()
    .default(12)
    .describe('Blur intensity in pixels for the blurred text layer'),
  
  direction: z.enum(['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'])
    .default('left-to-right')
    .optional()
    .describe('Direction of the focus wipe sweep'),
  
  enableSkew: z.boolean()
    .default(true)
    .optional()
    .describe('Enable skew distortion at transition edge'),
  
  skewIntensity: z.number()
    .default(-5)
    .optional()
    .describe('Skew intensity in degrees (negative = left skew, positive = right skew)'),
  
  chromaticAberration: z.boolean()
    .default(true)
    .optional()
    .describe('Enable chromatic aberration (RGB splitting) effect'),
  
  chromaticOffset: z.number()
    .default(2)
    .optional()
    .describe('Chromatic aberration offset in pixels'),
  
  font: z.string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
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

  // Helper: Generate clip-path values based on direction
  const getClipPathValues = (direction: string) => {
    switch (direction) {
      case 'right-to-left':
        return {
          start: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)',
          end: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        };
      case 'top-to-bottom':
        return {
          start: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
          end: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        };
      case 'bottom-to-top':
        return {
          start: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)',
          end: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        };
      case 'left-to-right':
      default:
        return {
          start: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
          end: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        };
    }
  };

  const clipPathValues = getClipPathValues(params.direction || 'left-to-right');

  // Generate chromatic aberration text-shadow
  const chromaticAberrationShadow = params.chromaticAberration
    ? `${params.chromaticOffset}px 0 0 rgba(255,0,0,0.3), -${params.chromaticOffset}px 0 0 rgba(0,255,255,0.3)`
    : 'none';

  // Create blurred text layer (bottom)
  const blurredTextLayer: RenderableComponentData = {
    id: 'focus-wipe-blurred-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.textColor,
        filter: `blur(${params.blurAmount}px)`,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
      },
      className: 'absolute inset-0 flex items-center justify-center text-center',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Create sharp text layer (top) with clip-path animation
  const sharpTextLayer: RenderableComponentData = {
    id: 'focus-wipe-sharp-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.textColor,
        clipPath: clipPathValues.start,
        textShadow: chromaticAberrationShadow,
        willChange: 'clip-path',
        transformStyle: 'preserve-3d' as any,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
      },
      className: 'absolute inset-0 flex items-center justify-center text-center',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      // Clip-path reveal animation
      {
        id: 'focus-wipe-clip-path-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: ['focus-wipe-sharp-text'],
          ranges: [
            { key: 'clipPath', val: clipPathValues.start, prog: 0 },
            { key: 'clipPath', val: clipPathValues.end, prog: 1 },
          ],
        },
      },
      // Optional skew distortion at transition edge
      ...(params.enableSkew
        ? [
            {
              id: 'focus-wipe-skew-distortion',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: params.duration,
                mode: 'provider',
                targetIds: ['focus-wipe-sharp-text'],
                ranges: [
                  { key: 'skewX', val: params.skewIntensity || -5, prog: 0 },
                  { key: 'skewX', val: 0, prog: 0.5 },
                  { key: 'skewX', val: 0, prog: 1 },
                ],
              },
            },
          ]
        : []),
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'focus-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [blurredTextLayer, sharpTextLayer] as RenderableComponentData[],
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
  id: 'focus-wipe-transition',
  title: 'Split-Screen Focus Wipe Effect',
  description: 'A cinematic focus wipe transition where text clarity sweeps across like a camera focus pull. Features two overlapping text layers - one blurred, one sharp - with animated clip-path reveal, optional skew distortion at the transition edge, and chromatic aberration (RGB splitting) to simulate realistic lens optics. The effect creates a smooth, optical-quality focus transition reminiscent of manual lens focus adjustments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'transition',
    'focus',
    'wipe',
    'cinematic',
    'lens',
    'optical',
    'blur',
    'clip-path',
    'skew',
    'chromatic-aberration',
    'reveal',
    'animation',
  ],
  defaultInputParams: {
    text: 'FOCUS WIPE',
    duration: 2,
    fontSize: '64px',
    fontWeight: '700',
    textColor: '#FFFFFF',
    blurAmount: 12,
    direction: 'left-to-right',
    enableSkew: true,
    skewIntensity: -5,
    chromaticAberration: true,
    chromaticOffset: 2,
    font: 'Inter:700',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const focusWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
