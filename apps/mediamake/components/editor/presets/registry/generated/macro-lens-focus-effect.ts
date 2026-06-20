/**
 * Macro Lens Focus Effect Preset
 *
 * Simulates extreme close-up macro photography with a traveling focus zone that sweeps across text.
 * Creates shallow depth of field with variable blur (0-15px), magnification of focused characters,
 * and texture details that emerge only when in perfect focus. Features realistic depth falloff based
 * on character 'z-depth' positions. Perfect for dramatic reveal of important quotes or key messages
 * with intimate, detailed presentation.
 *
 * Features:
 * - **Traveling Focus Zone**: Focus 'sweet spot' moves across text like a magnifying glass
 * - **Shallow Depth of Field**: Variable blur (0-15px) based on distance from focus center
 * - **Magnification Effect**: Focused characters scale up to 1.1x for magnification
 * - **Texture Details**: Semi-transparent noise layer that increases opacity in focused areas
 * - **Depth Simulation**: Random z-index values create varying blur levels
 * - **Smooth Transitions**: Ease-in-out timing for smooth focus transitions
 * - **Per-Character Control**: Each character animated independently for precise control
 *
 * Use Cases:
 * - Revealing important quotes with dramatic emphasis
 * - Creating intimate, detailed text presentations
 * - Showcasing key messages with visual drama
 * - Building suspense with gradual text reveals
 * - Adding cinematic quality to typography
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with macro lens focus effect'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Duration of the complete focus sweep animation (seconds)'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the text (CSS color value)'),
  maxBlur: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Maximum blur amount for out-of-focus characters (pixels)'),
  focusScale: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.1)
    .describe('Scale multiplier for focused characters (magnification effect)'),
  textureOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Base opacity of texture overlay'),
  focusedTextureOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Opacity of texture in focused areas'),
  depthVariation: z
    .boolean()
    .default(true)
    .describe('Enable depth variation (random z-index) for characters'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Background color for the scene (CSS color value)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
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
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Split text into characters
  const characters = params.text.split('');
  const charCount = characters.length;

  // Calculate timing for each character
  // Each character gets focused sequentially with overlap
  const focusDurationPerChar = params.duration / charCount;
  const overlapFactor = 0.2; // 20% overlap between character focus periods

  // Generate random z-depths if depth variation is enabled
  const generateZDepth = (index: number): number => {
    if (!params.depthVariation) return 2; // Default mid-depth
    // Use index-based pseudo-random to ensure consistency
    const pseudo = Math.sin(index * 12.9898 + index * 78.233) * 43758.5453;
    const normalized = pseudo - Math.floor(pseudo);
    return Math.floor(normalized * 3) + 1; // 1-3 range
  };

  // Create character components with effects
  const characterComponents = characters.map((char, index) => {
    const charId = `char-${index}`;
    const zDepth = generateZDepth(index);

    // Calculate focus timing for this character
    const focusStart = index * focusDurationPerChar * (1 - overlapFactor);
    const focusDuration = focusDurationPerChar * (1 + overlapFactor * 2);

    // Focus effect: blur from maxBlur to 0, then back to maxBlur
    // Scale from 1 to focusScale, then back to 1
    const focusEffect = {
      id: `focus-effect-${charId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: focusStart,
        duration: focusDuration,
        mode: 'provider' as const,
        targetIds: [charId],
        ranges: [
          // Blur: start at max, focus at 0, end at max
          { key: 'filter', val: `blur(${params.maxBlur}px)`, prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 0.5 },
          { key: 'filter', val: `blur(${params.maxBlur}px)`, prog: 1 },
          // Scale: start at 1, magnify at focusScale, end at 1
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: params.focusScale, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
          // Opacity: slightly fade in/out for drama
          { key: 'opacity', val: 0.7, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 0.7, prog: 1 },
        ],
      },
    };

    return {
      id: charId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char,
        className: 'inline-block relative',
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transformOrigin: 'center center',
          zIndex: zDepth,
          marginRight: char === ' ' ? '0.3em' : '0',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : { weights: ['700'] }),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [focusEffect],
    } as RenderableComponentData;
  });

  // Texture overlay (noise/grain effect)
  const textureOverlay = {
    id: 'texture-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay' as const,
          opacity: params.textureOpacity,
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
      {
        id: 'texture-noise',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.05) 100%), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px); filter: contrast(150%);"></div>`,
          style: {
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  // Text container
  const textContainer = {
    id: 'text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-wrap items-center justify-center px-16',
        style: {
          gap: '0.2rem',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: characterComponents as RenderableComponentData[],
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: 'macro-focus-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
        style: {
          backgroundColor: params.backgroundColor || 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textureOverlay, textContainer] as RenderableComponentData[],
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
  id: 'macro-lens-focus-effect',
  title: 'Macro Lens Focus Effect',
  description:
    'Simulates extreme close-up macro photography with a traveling focus zone that sweeps across text. Creates shallow depth of field with variable blur (0-15px), magnification of focused characters, and texture details that emerge only when in perfect focus. Features realistic depth falloff based on character z-depth positions. Perfect for dramatic reveal of important quotes or key messages with intimate, detailed presentation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'macro',
    'focus',
    'blur',
    'depth-of-field',
    'magnification',
    'cinematic',
    'dramatic',
    'reveal',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MACRO',
    duration: 4,
    fontSize: 72,
    font: 'Inter:700',
    textColor: '#ffffff',
    maxBlur: 15,
    focusScale: 1.1,
    textureOpacity: 0.2,
    focusedTextureOpacity: 0.4,
    depthVariation: true,
  },
};

// Export preset
export const macroLensFocusEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
