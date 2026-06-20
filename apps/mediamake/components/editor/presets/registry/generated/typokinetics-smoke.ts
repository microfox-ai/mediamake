/**
 * Typokinetics Ethereal Smoke Text Preset
 *
 * This preset simulates ethereal smoke particles for text animation, mimicking the effect of 
 * compositing smoke footage over text in After Effects. Each word drifts independently with 
 * organic, turbulent motion, appearing to dissolve from sharp edges into wispy tendrils that 
 * float upward and dissipate. Multiple layers of the same text with different blur levels and 
 * opacities create depth, similar to stacked adjustment layers in video editing. Subtle color 
 * shifts from white to pale blue/purple in the highlights enhance the ethereal quality.
 *
 * Features:
 * - **Multi-layer Smoke Effect**: 3-4 duplicate text layers per word with varying blur and opacity
 * - **Organic Turbulence**: Sine-wave lateral drift simulating turbulent smoke motion
 * - **Upward Dissipation**: Text floats upward while dissolving, like rising smoke
 * - **Color Shifts**: Subtle hue rotation from white to pale blue/purple
 * - **Staggered Timing**: Each word animates independently to avoid mechanical uniformity
 * - **Depth Simulation**: Multiple blur layers create volumetric smoke depth
 *
 * Use cases:
 * - Creating cinematic smoke text effects for titles
 * - Building ethereal, atmospheric text animations
 * - Simulating particle dissipation for dramatic reveals
 * - Adding mystical or supernatural text effects
 * - Creating depth-rich, layered typography
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMS SCHEMA ---
const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to animate with smoke effect. Each word will animate independently.'),
  fontSize: z
    .number()
    .default(96)
    .describe('Base font size in pixels for the text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family to use (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "bold", "700", "normal")'),
  baseDuration: z
    .number()
    .default(5)
    .describe('Base duration in seconds for each word animation (4-6 recommended)'),
  wordStagger: z
    .number()
    .default(0.3)
    .describe('Time offset in seconds between each word animation start'),
  upwardDistance: z
    .number()
    .default(30)
    .describe('Maximum upward distance in pixels for smoke drift'),
  turbulenceAmplitude: z
    .number()
    .default(3)
    .describe('Maximum horizontal turbulence amplitude in pixels'),
  scaleExpansion: z
    .number()
    .default(0.1)
    .describe('Maximum scale expansion factor (0.1 = 10% larger)'),
  baseColor: z
    .string()
    .default('white')
    .describe('Base text color before color shift'),
  hueRotation: z
    .number()
    .default(30)
    .describe('Maximum hue rotation in degrees for color shift (creates blue/purple tint)'),
  positioning: z
    .object({
      horizontal: z
        .enum(['left', 'center', 'right'])
        .default('center')
        .describe('Horizontal alignment of text'),
      vertical: z
        .enum(['top', 'center', 'bottom'])
        .default('center')
        .describe('Vertical alignment of text'),
    })
    .optional()
    .describe('Text positioning configuration'),
});

// --- EXECUTION FUNCTION ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse text into words
  const words = params.text.split(/\s+/).filter(word => word.length > 0);

  // Calculate positioning classes
  const positionConfig = params.positioning || { horizontal: 'center', vertical: 'center' };
  
  const horizontalClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[positionConfig.horizontal];

  const verticalClass = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  }[positionConfig.vertical];

  // Calculate container positioning for absolute positioning
  const containerStyle: Record<string, any> = {
    willChange: 'transform',
  };

  if (positionConfig.vertical === 'top') {
    containerStyle.top = '10%';
  } else if (positionConfig.vertical === 'bottom') {
    containerStyle.bottom = '10%';
  } else {
    containerStyle.top = '50%';
    containerStyle.transform = 'translateY(-50%)';
  }

  if (positionConfig.horizontal === 'left') {
    containerStyle.left = '10%';
  } else if (positionConfig.horizontal === 'right') {
    containerStyle.right = '10%';
  } else {
    containerStyle.left = '50%';
    if (containerStyle.transform) {
      containerStyle.transform = 'translate(-50%, -50%)';
    } else {
      containerStyle.transform = 'translateX(-50%)';
    }
  }

  // Generate word groups with multiple layers
  const wordGroups: RenderableComponentData[] = words.map((word, wordIndex) => {
    const wordStartTime = wordIndex * params.wordStagger;
    const wordDuration = params.baseDuration;
    const wordGroupId = `smoke-word-group-${wordIndex}`;

    // Create 3 layers per word: base, mid, top
    const baseLayerId = `${wordGroupId}-layer-base`;
    const midLayerId = `${wordGroupId}-layer-mid`;
    const topLayerId = `${wordGroupId}-layer-top`;

    // Layer definitions with different opacities and blur levels
    const baseLayer: RenderableComponentData = {
      id: baseLayerId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        className: `text-${params.baseColor}/90 font-${params.fontWeight}`,
        style: {
          fontSize: params.fontSize,
          textShadow: '0 0 20px rgba(255,255,255,0.5)',
          willChange: 'transform, opacity',
          color: params.baseColor === 'white' ? '#FFFFFF' : params.baseColor,
        },
        font: {
          family: params.fontFamily,
          weights: ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: wordDuration,
        },
      },
      effects: [],
    };

    const midLayer: RenderableComponentData = {
      id: midLayerId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        className: `text-${params.baseColor}/40 font-${params.fontWeight} absolute top-0 left-0`,
        style: {
          fontSize: params.fontSize,
          filter: `blur(4px) hue-rotate(${params.hueRotation * 0.3}deg)`,
          willChange: 'transform, opacity',
          color: params.baseColor === 'white' ? '#FFFFFF' : params.baseColor,
        },
        font: {
          family: params.fontFamily,
          weights: ['700'],
        },
      },
      context: {
        timing: {
          start: 0.15,
          duration: wordDuration + 0.5,
        },
      },
      effects: [],
    };

    const topLayer: RenderableComponentData = {
      id: topLayerId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        className: `text-${params.baseColor}/20 font-${params.fontWeight} absolute top-0 left-0`,
        style: {
          fontSize: params.fontSize,
          filter: `blur(8px) hue-rotate(${params.hueRotation}deg)`,
          willChange: 'transform, opacity',
          color: params.baseColor === 'white' ? '#FFFFFF' : params.baseColor,
        },
        font: {
          family: params.fontFamily,
          weights: ['700'],
        },
      },
      context: {
        timing: {
          start: 0.3,
          duration: wordDuration + 1,
        },
      },
      effects: [],
    };

    // Create dissipation effects (upward drift + fade out + scale)
    const baseDissipation = {
      id: `dissipate-base-${wordGroupId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: wordDuration - 1,
        mode: 'provider',
        targetIds: [baseLayerId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -params.upwardDistance, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1 + params.scaleExpansion, prog: 1 },
        ],
      },
    };

    const midDissipation = {
      id: `dissipate-mid-${wordGroupId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0.15,
        duration: wordDuration - 0.5,
        mode: 'provider',
        targetIds: [midLayerId],
        ranges: [
          { key: 'opacity', val: 0.4, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -(params.upwardDistance * 1.3), prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1 + params.scaleExpansion * 1.5, prog: 1 },
        ],
      },
    };

    const topDissipation = {
      id: `dissipate-top-${wordGroupId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0.3,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [topLayerId],
        ranges: [
          { key: 'opacity', val: 0.2, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -(params.upwardDistance * 1.6), prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1 + params.scaleExpansion * 2, prog: 1 },
        ],
      },
    };

    // Create turbulence effects (sine-wave lateral drift)
    const baseTurbulence = {
      id: `turbulence-base-${wordGroupId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: wordDuration - 1,
        mode: 'provider',
        targetIds: [baseLayerId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: -params.turbulenceAmplitude, prog: 0.25 },
          { key: 'translateX', val: params.turbulenceAmplitude, prog: 0.5 },
          { key: 'translateX', val: -params.turbulenceAmplitude * 0.5, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    };

    const midTurbulence = {
      id: `turbulence-mid-${wordGroupId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0.15,
        duration: wordDuration - 0.5,
        mode: 'provider',
        targetIds: [midLayerId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: params.turbulenceAmplitude * 1.5, prog: 0.25 },
          { key: 'translateX', val: -params.turbulenceAmplitude * 1.5, prog: 0.5 },
          { key: 'translateX', val: params.turbulenceAmplitude, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    };

    const topTurbulence = {
      id: `turbulence-top-${wordGroupId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0.3,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [topLayerId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: -params.turbulenceAmplitude * 2, prog: 0.25 },
          { key: 'translateX', val: params.turbulenceAmplitude * 2, prog: 0.5 },
          { key: 'translateX', val: -params.turbulenceAmplitude, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    };

    // Attach effects to layers
    baseLayer.effects = [baseDissipation, baseTurbulence];
    midLayer.effects = [midDissipation, midTurbulence];
    topLayer.effects = [topDissipation, topTurbulence];

    // Create word group container
    return {
      id: wordGroupId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block',
          style: {
            marginRight: '0.5em',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: wordStartTime,
          duration: wordDuration + 1,
        },
      },
      childrenData: [baseLayer, midLayer, topLayer],
    } as RenderableComponentData;
  });

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-smoke-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full overflow-hidden flex ${horizontalClass} ${verticalClass}`,
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: words.length * params.wordStagger + params.baseDuration + 1,
      },
    },
    childrenData: [
      {
        id: 'typokinetics-smoke-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute flex flex-row flex-wrap',
            style: containerStyle,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: words.length * params.wordStagger + params.baseDuration + 1,
          },
        },
        childrenData: wordGroups,
      } as RenderableComponentData,
    ],
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

// --- METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-smoke',
  title: 'Typokinetics Ethereal Smoke Text',
  description:
    'Ethereal smoke particle text animation with multi-layered text dissolving into wispy tendrils. Each word drifts independently with organic turbulent motion, featuring multiple blur layers, subtle color shifts from white to pale blue/purple, and staggered timing for natural smoke-like dissipation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'smoke',
    'ethereal',
    'particles',
    'multi-layer',
    'blur',
    'turbulence',
    'dissipation',
    'organic',
    'cinematic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Ethereal Smoke',
    fontSize: 96,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    baseDuration: 5,
    wordStagger: 0.3,
    upwardDistance: 30,
    turbulenceAmplitude: 3,
    scaleExpansion: 0.1,
    baseColor: 'white',
    hueRotation: 30,
    positioning: {
      horizontal: 'center',
      vertical: 'center',
    },
  },
};

// --- EXPORT ---
export const typokineticsSmokePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
