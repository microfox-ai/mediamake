/**
 * Typokinetics Heat Distortion Preset
 *
 * This preset creates thermal imaging-inspired text effects with heat wave distortion,
 * chromatic aberration via RGB channel separation, and hypnotic oscillation. Text shimmers
 * and warps as if viewed through rising heat waves with continuous organic motion.
 *
 * Features:
 * - **Chromatic Aberration**: RGB channel separation with slight offsets
 * - **Heat Wave Distortion**: Vertical scaling and horizontal oscillation per channel
 * - **Continuous Motion**: Spring easing for organic, never-settling animation
 * - **Blend Mode**: Screen blending for additive color mixing
 * - **Perspective Transform**: Subtle 3D warping for depth
 * - **Parameterized Intensity**: Customizable heat wave intensity
 *
 * Use cases:
 * - Creating thermal imaging-style text effects
 * - Building hypnotic, dreamlike typography
 * - Adding heat distortion to titles and captions
 * - Creating experimental visual effects for music videos or art projects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:700:italic", "Inter:600", "BebasNeue")',
    ),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Duration of the effect in seconds'),
  heatIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Heat wave intensity multiplier (higher = more distortion)'),
  cycleDuration: z
    .number()
    .min(2)
    .max(6)
    .default(3.5)
    .describe('Duration of one heat wave cycle in seconds'),
  rgbOffset: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Chromatic aberration offset in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
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
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const words = params.text.split(' ');
  const cycleDuration = params.cycleDuration;
  const heatIntensity = params.heatIntensity;
  const rgbOffset = params.rgbOffset;

  // Create word containers with RGB channel separation
  const wordContainers = words.map((word, wordIndex) => {
    const wordContainerId = `heat-word-container-${wordIndex}`;

    // Red channel - offset left and up
    const redChannelId = `heat-red-${wordIndex}`;
    const redChannel: RenderableComponentData = {
      id: redChannelId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        className: 'text-red-500/60 absolute top-0 left-0',
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight || 700,
          fontStyle: fontStyle.fontStyle || 'normal',
          mixBlendMode: 'screen',
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
      effects: [],
    };

    // Green channel - minimal offset (base)
    const greenChannelId = `heat-green-${wordIndex}`;
    const greenChannel: RenderableComponentData = {
      id: greenChannelId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        className: 'text-green-500/60 absolute top-0 left-0',
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight || 700,
          fontStyle: fontStyle.fontStyle || 'normal',
          mixBlendMode: 'screen',
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
      effects: [],
    };

    // Blue channel - offset right and down
    const blueChannelId = `heat-blue-${wordIndex}`;
    const blueChannel: RenderableComponentData = {
      id: blueChannelId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        className: 'text-blue-500/60 absolute top-0 left-0',
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight || 700,
          fontStyle: fontStyle.fontStyle || 'normal',
          mixBlendMode: 'screen',
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
      effects: [],
    };

    // Create heat distortion effects for each channel
    // Each channel has slightly different frequencies for organic motion

    // Red channel effects - slower oscillation
    const redEffect: GenericEffectData = {
      type: 'spring',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [redChannelId],
      ranges: [
        // Vertical scale (scaleY) oscillation
        { key: 'scaleY', val: 0.95, prog: 0 },
        { key: 'scaleY', val: 1.05 * heatIntensity, prog: 0.25 },
        { key: 'scaleY', val: 0.95, prog: 0.5 },
        { key: 'scaleY', val: 1.05 * heatIntensity, prog: 0.75 },
        { key: 'scaleY', val: 0.95, prog: 1 },
        // Horizontal translation (translateX) - sine wave
        { key: 'translateX', val: -rgbOffset - 1 * heatIntensity, prog: 0 },
        { key: 'translateX', val: -rgbOffset + 1 * heatIntensity, prog: 0.5 },
        { key: 'translateX', val: -rgbOffset - 1 * heatIntensity, prog: 1 },
        // Vertical translation for heat wave
        { key: 'translateY', val: -0.5 * heatIntensity, prog: 0 },
        { key: 'translateY', val: 0.5 * heatIntensity, prog: 0.5 },
        { key: 'translateY', val: -0.5 * heatIntensity, prog: 1 },
      ],
    };

    // Green channel effects - medium oscillation
    const greenEffect: GenericEffectData = {
      type: 'spring',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [greenChannelId],
      ranges: [
        // Vertical scale oscillation (different phase)
        { key: 'scaleY', val: 1.02 * heatIntensity, prog: 0 },
        { key: 'scaleY', val: 0.98, prog: 0.33 },
        { key: 'scaleY', val: 1.02 * heatIntensity, prog: 0.66 },
        { key: 'scaleY', val: 0.98, prog: 1 },
        // Horizontal translation - minimal (base channel)
        { key: 'translateX', val: 0.5 * heatIntensity, prog: 0 },
        { key: 'translateX', val: -0.5 * heatIntensity, prog: 0.5 },
        { key: 'translateX', val: 0.5 * heatIntensity, prog: 1 },
        // Vertical translation
        { key: 'translateY', val: 0.3 * heatIntensity, prog: 0 },
        { key: 'translateY', val: -0.3 * heatIntensity, prog: 0.5 },
        { key: 'translateY', val: 0.3 * heatIntensity, prog: 1 },
      ],
    };

    // Blue channel effects - faster oscillation
    const blueEffect: GenericEffectData = {
      type: 'spring',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [blueChannelId],
      ranges: [
        // Vertical scale oscillation (different phase and amplitude)
        { key: 'scaleY', val: 1.0, prog: 0 },
        { key: 'scaleY', val: 1.06 * heatIntensity, prog: 0.2 },
        { key: 'scaleY', val: 0.94, prog: 0.4 },
        { key: 'scaleY', val: 1.06 * heatIntensity, prog: 0.6 },
        { key: 'scaleY', val: 0.94, prog: 0.8 },
        { key: 'scaleY', val: 1.0, prog: 1 },
        // Horizontal translation - opposite direction
        { key: 'translateX', val: rgbOffset + 1 * heatIntensity, prog: 0 },
        { key: 'translateX', val: rgbOffset - 1 * heatIntensity, prog: 0.5 },
        { key: 'translateX', val: rgbOffset + 1 * heatIntensity, prog: 1 },
        // Vertical translation
        { key: 'translateY', val: 0.8 * heatIntensity, prog: 0 },
        { key: 'translateY', val: -0.8 * heatIntensity, prog: 0.5 },
        { key: 'translateY', val: 0.8 * heatIntensity, prog: 1 },
      ],
    };

    // Attach effects to channels
    redChannel.effects = [
      {
        id: `red-effect-${wordIndex}`,
        componentId: 'generic',
        data: redEffect,
      },
    ];

    greenChannel.effects = [
      {
        id: `green-effect-${wordIndex}`,
        componentId: 'generic',
        data: greenEffect,
      },
    ];

    blueChannel.effects = [
      {
        id: `blue-effect-${wordIndex}`,
        componentId: 'generic',
        data: blueEffect,
      },
    ];

    // Word container with screen blend mode
    const wordContainer: RenderableComponentData = {
      id: wordContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block',
          style: {
            mixBlendMode: 'screen',
            marginRight: '0.5em',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [redChannel, greenChannel, blueChannel],
    };

    return wordContainer;
  });

  // Words wrapper with perspective
  const wordsWrapper: RenderableComponentData = {
    id: 'heat-words-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-row flex-wrap gap-4 justify-center items-center',
        style: {
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
    childrenData: wordContainers,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-heat-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [wordsWrapper],
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

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-heat-distortion',
  title: 'Typokinetics Heat Distortion',
  description:
    'Thermal imaging-inspired text effect with heat wave distortion, chromatic aberration via RGB channel separation, and hypnotic oscillation. Text shimmers and warps as if viewed through rising heat waves with continuous organic motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'heat',
    'distortion',
    'chromatic-aberration',
    'rgb-split',
    'thermal',
    'kinetic',
    'motion',
    'experimental',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Heat Wave Typography',
    fontSize: 48,
    font: 'Inter:700',
    duration: 10,
    heatIntensity: 1,
    cycleDuration: 3.5,
    rgbOffset: 2,
  },
};

export const typokineticsHeatDistortionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
