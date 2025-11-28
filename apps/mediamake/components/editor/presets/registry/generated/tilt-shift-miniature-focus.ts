/**
 * Tilt-Shift Miniature Focus Effect Preset
 *
 * This preset creates a tilt-shift photography-inspired text effect with selective focus animation.
 * It simulates the appearance of a miniature model with gradient blur strongest at the top and bottom,
 * sharp in the middle. The focus area animates from a thin horizontal band expanding outward to reveal
 * the full text.
 *
 * Features:
 * - **Selective Focus**: Gradient blur simulation with sharp middle zone (miniature photography illusion)
 * - **Depth-of-Field Desaturation**: Blurred areas slightly desaturated, focused areas vibrant
 * - **Multiple Text Layers**: Text positioned at different heights with varying blur amounts
 * - **Focus Band Animation**: Animates from thin horizontal band to full reveal
 * - **Perspective Transform**: Subtle perspective for enhanced miniature illusion
 * - **Photography-Inspired Timing**: Smooth 3-second animation simulating lens adjustment
 *
 * Use cases:
 * - Creating miniature model illusion text effects
 * - Simulating tilt-shift photography depth-of-field
 * - Building selective focus text animations
 * - Adding photographic depth effects to text
 * - Creating depth-of-field text reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import type {
  TextAtomData,
  GenericEffectData,
  BaseEffect,
} from '@microfox/remotion';

// --- PARAMETERS SCHEMA ---

const presetParams = z.object({
  topText: z
    .string()
    .default('MINIATURE')
    .describe('Text displayed at the top (15% from top)'),
  middleText: z
    .string()
    .default('WORLD')
    .describe('Text displayed in the middle (center focus)'),
  bottomText: z
    .string()
    .default('EFFECT')
    .describe('Text displayed at the bottom (15% from bottom)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  fontSize: z
    .object({
      top: z.number().default(48).describe('Font size for top text (px)'),
      middle: z.number().default(64).describe('Font size for middle text (px)'),
      bottom: z.number().default(48).describe('Font size for bottom text (px)'),
    })
    .optional()
    .describe('Font sizes for each text layer'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Animation duration in seconds'),
  perspectiveDepth: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Perspective depth value (px)'),
  perspectiveRotation: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Perspective rotation angle (degrees)'),
});

// --- PRESET EXECUTION ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration ?? 3;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold
  }

  const fontSizes = params.fontSize ?? { top: 48, middle: 64, bottom: 48 };

  // Helper: Create text atom
  const createTextAtom = (
    id: string,
    text: string,
    fontSize: number,
    position: { top?: string; bottom?: string; left: string },
    isMiddle: boolean,
  ): RenderableComponentData => {
    const textData: TextAtomData = {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontStyle.fontWeight ?? 700,
        fontStyle: fontStyle.fontStyle,
        color: params.textColor,
        textAlign: 'center',
        willChange: 'transform, filter',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
      },
    };

    // Effects for text layers
    const effects: BaseEffect[] = [];

    if (isMiddle) {
      // Middle text: stays sharp, subtle scale emphasis
      const scaleEffect: BaseEffect = {
        id: `${id}-scale-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [id],
          ranges: [
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: 1.05, prog: 0.5 },
            { key: 'scale', val: 1.0, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(scaleEffect);
    } else {
      // Top/Bottom text: blur, opacity, and desaturation animation
      const blurEffect: BaseEffect = {
        id: `${id}-blur-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [id],
          ranges: [
            // Blur animation: 10px → 3px
            { key: 'filter', val: 'blur(10px) saturate(0.7)', prog: 0 },
            { key: 'filter', val: 'blur(3px) saturate(0.9)', prog: 1 },
            // Opacity animation: 0.6 → 0.9
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 0.9, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(blurEffect);
    }

    return {
      id: id,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: textData,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: effects,
    } as RenderableComponentData;
  };

  // Create text layers
  const topTextAtom = createTextAtom(
    'text-top',
    params.topText,
    fontSizes.top,
    { top: '15%', left: '50%' },
    false,
  );

  const middleTextAtom = createTextAtom(
    'text-middle',
    params.middleText,
    fontSizes.middle,
    { top: '50%', left: '50%' },
    true,
  );

  const bottomTextAtom = createTextAtom(
    'text-bottom',
    params.bottomText,
    fontSizes.bottom,
    { bottom: '15%', left: '50%' },
    false,
  );

  // Apply position styles
  (topTextAtom.data as any).style = {
    ...(topTextAtom.data as any).style,
    position: 'absolute',
    top: '15%',
    left: '50%',
    transform: 'translateX(-50%)',
  };

  (middleTextAtom.data as any).style = {
    ...(middleTextAtom.data as any).style,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };

  (bottomTextAtom.data as any).style = {
    ...(bottomTextAtom.data as any).style,
    position: 'absolute',
    bottom: '15%',
    left: '50%',
    transform: 'translateX(-50%)',
  };

  // Focus band overlay (gradient that fades out to reveal focus)
  const focusBandOverlay: RenderableComponentData = {
    id: 'focus-band-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.3) 35%, transparent 40%, transparent 60%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.3) 100%)',
          willChange: 'opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'focus-band-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['focus-band-overlay'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  } as RenderableComponentData;

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'tilt-shift-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: `${params.perspectiveDepth ?? 1000}px`,
          transform: `rotateX(${params.perspectiveRotation ?? 2}deg)`,
          willChange: 'transform',
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
      topTextAtom,
      middleTextAtom,
      bottomTextAtom,
      focusBandOverlay,
    ] as RenderableComponentData[],
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

// --- PRESET METADATA ---

const presetMetadata: PresetMetadata = {
  id: 'tilt-shift-miniature-focus',
  title: 'Tilt-Shift Miniature Focus Effect',
  description:
    'A tilt-shift photography-inspired text effect with selective focus animation. Creates a miniature model illusion with gradient blur strongest at top/bottom, sharp in the middle. Features depth-of-field color desaturation where blurred areas appear slightly desaturated and focused areas remain vibrant. The animation simulates adjusting a tilt-shift lens with smooth photography-inspired timing, expanding from a thin horizontal focus band outward to reveal full text clarity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'tilt-shift',
    'miniature',
    'focus',
    'photography',
    'depth-of-field',
    'blur',
    'selective-focus',
    'perspective',
    'lens',
    'gradient',
    'desaturation',
  ],
  dependencies: {},
  defaultInputParams: {
    topText: 'MINIATURE',
    middleText: 'WORLD',
    bottomText: 'EFFECT',
    font: 'Inter:700',
    textColor: '#ffffff',
    fontSize: {
      top: 48,
      middle: 64,
      bottom: 48,
    },
    duration: 3,
    perspectiveDepth: 1000,
    perspectiveRotation: 2,
  },
};

// --- EXPORT ---

export const tiltShiftMiniatureFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
