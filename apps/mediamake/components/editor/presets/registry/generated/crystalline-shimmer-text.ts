/**
 * Crystalline Shimmer Text Effect Preset
 * 
 * A luxury title treatment preset that renders text as if made of cut crystal or diamond.
 * Features multiple gradient overlay layers at different angles (0°, 45°, 90°, 135°) with
 * mix-blend-modes creating complex light refraction patterns. Includes 8 independently
 * animated sparkle points that flash in sequence like sunlight hitting a rotating diamond,
 * plus subtle RGB chromatic aberration for prismatic effect. All animations use prime-number
 * durations to prevent predictable repetition, conveying premium quality and elegance.
 * 
 * Features:
 * - Base crystal text with gradient from gray to white
 * - 4 gradient overlay layers with different angles and blend modes
 * - 8 sparkle points with staggered flash animations
 * - RGB chromatic split effect for prismatic appearance
 * - Prime-number animation durations for complex interference patterns
 * - GPU-accelerated with translateZ(0) and scale3d
 * 
 * Use Cases:
 * - Luxury brand titles and intros
 * - Premium product reveals
 * - Jewelry or diamond-related content
 * - High-end event titles
 * - Elegant text treatments for upscale videos
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Parameter Schema
const presetParams = z.object({
  text: z.string().describe('Text to display with crystalline shimmer effect'),
  duration: z
    .number()
    .default(10)
    .describe('Duration of the effect in seconds'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Base text color (used for gradient end)'),
  fontSize: z
    .string()
    .default('5xl')
    .optional()
    .describe('Tailwind text size class (e.g., "5xl", "6xl", "7xl")'),
  font: z
    .string()
    .default('Inter:300')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Inter:300", "PlayfairDisplay:400")',
    ),
});

// Preset Execution Function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:300';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 300;

  const textColor = params.textColor || '#FFFFFF';
  const fontSize = params.fontSize || '5xl';

  // IDs
  const rootId = 'crystalline-shimmer-root';
  const containerID = 'crystal-text-container';
  const baseTextId = 'base-crystal-text';
  const gradientLayer0Id = 'gradient-layer-0deg';
  const gradientLayer45Id = 'gradient-layer-45deg';
  const gradientLayer90Id = 'gradient-layer-90deg';
  const gradientLayer135Id = 'gradient-layer-135deg';
  const sparkleContainerId = 'sparkle-container';
  const rgbSplitLayerId = 'rgb-split-layer';

  // Helper: Create sparkle component
  const createSparkle = (
    id: string,
    size: number,
    top: string,
    left: string,
    flashStart: number,
  ) => {
    return {
      id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute bg-white',
        style: {
          width: `${size}px`,
          height: `${size}px`,
          top,
          left,
          opacity: 0,
          boxShadow: `0 0 ${size * 1.5}px ${size * 0.75}px rgba(255,255,255,0.9)`,
          transform: 'rotate(45deg) scale3d(1,1,1)',
          borderRadius: '2px',
        },
      },
      effects: [
        {
          id: `${id}-flash`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: flashStart,
            duration: 0.4,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    } as RenderableComponentData;
  };

  // Create 8 sparkles with staggered timing
  const sparkles = [
    createSparkle('sparkle-1', 4, '10%', '15%', 0.2),
    createSparkle('sparkle-2', 6, '25%', '45%', 0.5),
    createSparkle('sparkle-3', 5, '60%', '70%', 0.9),
    createSparkle('sparkle-4', 4, '80%', '30%', 1.3),
    createSparkle('sparkle-5', 8, '40%', '85%', 1.7),
    createSparkle('sparkle-6', 5, '15%', '75%', 2.1),
    createSparkle('sparkle-7', 6, '70%', '10%', 2.6),
    createSparkle('sparkle-8', 4, '50%', '55%', 3.0),
  ];

  // RGB split text components
  const rgbRedTextId = 'rgb-red-text';
  const rgbGreenTextId = 'rgb-green-text';
  const rgbBlueTextId = 'rgb-blue-text';

  const rgbRedText = {
    id: rgbRedTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: `text-${fontSize} font-light tracking-wider absolute`,
      style: {
        color: 'rgba(255,0,0,0.5)',
        transform: 'translate(-1px, 0) translateZ(0)',
        fontWeight: fontWeight,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  const rgbGreenText = {
    id: rgbGreenTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: `text-${fontSize} font-light tracking-wider absolute`,
      style: {
        color: 'rgba(0,255,0,0.5)',
        transform: 'translate(0, 1px) translateZ(0)',
        fontWeight: fontWeight,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  const rgbBlueText = {
    id: rgbBlueTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: `text-${fontSize} font-light tracking-wider absolute`,
      style: {
        color: 'rgba(0,0,255,0.5)',
        transform: 'translate(1px, -1px) translateZ(0)',
        fontWeight: fontWeight,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  // RGB split layer container
  const rgbSplitLayer = {
    id: rgbSplitLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
          opacity: 0.15,
        },
      },
    },
    effects: [
      {
        id: 'rgb-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [rgbSplitLayerId],
          ranges: [
            { key: 'opacity', val: 0.1, prog: 0 },
            { key: 'opacity', val: 0.2, prog: 0.5 },
            { key: 'opacity', val: 0.1, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
    childrenData: [rgbRedText, rgbGreenText, rgbBlueText],
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  // Sparkle container
  const sparkleContainer = {
    id: sparkleContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    childrenData: sparkles,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  // Gradient layer helper
  const createGradientLayer = (
    id: string,
    angle: number,
    blendMode: string,
    opacity: number,
    intensity: number,
    duration: number,
  ) => {
    return {
      id,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `linear-gradient(${angle}deg, transparent 0%, rgba(255,255,255,${intensity}) 50%, transparent 100%)`,
            backgroundSize: '200% 200%',
            mixBlendMode: blendMode,
            opacity,
            transform: 'scale3d(1,1,1) translateZ(0)',
          },
        },
      },
      effects: [
        {
          id: `${id}-shimmer`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              {
                key: 'backgroundPositionX',
                val: '0%',
                prog: 0,
              },
              {
                key: 'backgroundPositionX',
                val: '100%',
                prog: 1,
              },
            ],
          } as GenericEffectData,
        },
      ],
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    } as RenderableComponentData;
  };

  // Gradient layers with prime-number durations
  const gradientLayer0 = createGradientLayer(
    gradientLayer0Id,
    0,
    'overlay',
    0.6,
    0.4,
    2.3,
  );
  const gradientLayer45 = createGradientLayer(
    gradientLayer45Id,
    45,
    'soft-light',
    0.5,
    0.5,
    3.1,
  );
  const gradientLayer90 = createGradientLayer(
    gradientLayer90Id,
    90,
    'overlay',
    0.55,
    0.35,
    5.2,
  );
  const gradientLayer135 = createGradientLayer(
    gradientLayer135Id,
    135,
    'screen',
    0.4,
    0.45,
    7.1,
  );

  // Base crystal text
  const baseCrystalText = {
    id: baseTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: `text-${fontSize} font-light tracking-wider text-transparent bg-clip-text bg-gradient-to-br from-gray-100 to-white`,
      style: {
        position: 'relative',
        zIndex: 1,
        transform: 'translateZ(0)',
        fontWeight: fontWeight,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  // Text container with all layers
  const crystalTextContainer = {
    id: containerID,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    childrenData: [
      baseCrystalText,
      gradientLayer0,
      gradientLayer45,
      gradientLayer90,
      gradientLayer135,
      sparkleContainer,
      rgbSplitLayer,
    ],
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: rootId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    childrenData: [crystalTextContainer],
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'crystalline-shimmer-text',
  title: 'Crystalline Shimmer Text Effect',
  description:
    'A luxury title treatment preset that renders text as if made of cut crystal or diamond. Features multiple gradient overlay layers at different angles (0°, 45°, 90°, 135°) with mix-blend-modes creating complex light refraction patterns. Includes 8 independently animated sparkle points that flash in sequence like sunlight hitting a rotating diamond, plus subtle RGB chromatic aberration for prismatic effect. All animations use prime-number durations to prevent predictable repetition, conveying premium quality and elegance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'title',
    'luxury',
    'crystal',
    'diamond',
    'shimmer',
    'sparkle',
    'gradient',
    'premium',
    'elegant',
    'prismatic',
    'chromatic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'CRYSTALLINE',
    duration: 10,
    textColor: '#FFFFFF',
    fontSize: '5xl',
    font: 'Inter:300',
  },
};

// Export Preset
export const crystallineShimmerTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};