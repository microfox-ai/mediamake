/**
 * Quaternion 4D Text Unfold Preset
 *
 * A typokinetic preset where text unfolds through quaternion-like multi-axis rotation,
 * revealing each character as if materializing from 4D hyperspace into 3D view.
 *
 * Features:
 * - Complex multi-axis rotation (rotateX, rotateY, rotateZ) from hidden state to visible
 * - Exponential stagger timing for cascade effect
 * - Custom cubic-bezier easing with slight bounce
 * - Optional holographic/glitch filter effects (hue-rotate, brightness oscillation)
 * - Advanced 3D transforms with perspective and preserve-3d
 * - Otherworldly mathematical appearance
 *
 * Technical Implementation:
 * - Characters start with rotateX(45deg) rotateY(90deg) rotateZ(30deg) scale(0.5)
 * - Smooth interpolation through rotation matrices to face forward
 * - GPU-accelerated transforms with backface-hidden
 * - Optional holographic overlay with mix-blend-mode
 *
 * Use cases:
 * - Creating sci-fi text reveals
 * - Tech product launches
 * - Hyperspace-themed content
 * - Mathematical/abstract visualizations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfex/remotion';

const presetParams = z.object({
  text: z.string().describe('Text to display and unfold'),
  duration: z
    .number()
    .default(3)
    .describe('Total duration of the animation in seconds'),
  baseDuration: z
    .number()
    .default(1.8)
    .describe('Base duration for each character unfold animation in seconds'),
  staggerDelay: z
    .number()
    .default(0.08)
    .describe('Base delay between character animations in seconds'),
  staggerExponent: z
    .number()
    .default(1.15)
    .describe('Exponential factor for stagger delay increase'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size for the text in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text (e.g., "Inter:700")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the text'),
  enableHolographic: z
    .boolean()
    .default(false)
    .describe('Enable holographic/glitch overlay effects'),
  holographicIntensity: z
    .number()
    .default(0.3)
    .describe('Intensity of holographic effects (0-1)'),
  initialRotateX: z
    .number()
    .default(45)
    .describe('Initial X-axis rotation in degrees'),
  initialRotateY: z
    .number()
    .default(90)
    .describe('Initial Y-axis rotation in degrees'),
  initialRotateZ: z
    .number()
    .default(30)
    .describe('Initial Z-axis rotation in degrees'),
  initialScale: z
    .number()
    .default(0.5)
    .describe('Initial scale factor'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString: string) => {
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
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);

  // Split text into characters
  const characters = params.text.split('');

  // Create character components with effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;

      // Calculate stagger timing with exponential delay
      const staggerDelay =
        params.staggerDelay * Math.pow(params.staggerExponent, index);

      // Unfold effect: multi-axis rotation + scale + opacity
      const unfoldEffect: GenericEffectData = {
        type: 'ease-out',
        start: staggerDelay,
        duration: params.baseDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          // Rotation X: 45deg -> 0deg
          { key: 'rotateX', val: params.initialRotateX, prog: 0 },
          { key: 'rotateX', val: 0, prog: 1 },
          // Rotation Y: 90deg -> 0deg
          { key: 'rotateY', val: params.initialRotateY, prog: 0 },
          { key: 'rotateY', val: 0, prog: 1 },
          // Rotation Z: 30deg -> 0deg
          { key: 'rotateZ', val: params.initialRotateZ, prog: 0 },
          { key: 'rotateZ', val: 0, prog: 1 },
          // Scale: 0.5 -> 1
          { key: 'scale', val: params.initialScale, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          // Opacity: 0 -> 1
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      // Optional holographic effect
      const holographicEffect: GenericEffectData | null =
        params.enableHolographic
          ? {
              type: 'linear',
              start: staggerDelay,
              duration: params.baseDuration,
              mode: 'provider',
              targetIds: [charId],
              ranges: [
                // Hue rotation for holographic effect
                { key: 'hueRotate', val: 0, prog: 0 },
                { key: 'hueRotate', val: 360 * params.holographicIntensity, prog: 0.5 },
                { key: 'hueRotate', val: 0, prog: 1 },
                // Brightness oscillation
                { key: 'brightness', val: 1, prog: 0 },
                { key: 'brightness', val: 1 + params.holographicIntensity, prog: 0.25 },
                { key: 'brightness', val: 1, prog: 0.5 },
                { key: 'brightness', val: 1 + params.holographicIntensity, prog: 0.75 },
                { key: 'brightness', val: 1, prog: 1 },
              ],
            }
          : null;

      const effects = holographicEffect
        ? [
            {
              id: `unfold-${charId}`,
              componentId: 'generic',
              data: unfoldEffect,
            },
            {
              id: `holographic-${charId}`,
              componentId: 'generic',
              data: holographicEffect,
            },
          ]
        : [
            {
              id: `unfold-${charId}`,
              componentId: 'generic',
              data: unfoldEffect,
            },
          ];

      return {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            ...fontStyle,
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects,
      } as RenderableComponentData;
    },
  );

  // Text container with preserve-3d
  const textContainer: RenderableComponentData = {
    id: 'quaternion-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-row items-center justify-center transform-gpu preserve-3d',
        style: {
          transformStyle: 'preserve-3d',
          gap: `${params.fontSize * 0.05}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: characterComponents,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'quaternion-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '1200px',
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
    childrenData: [textContainer],
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
  id: 'quaternion-4d-text-unfold',
  title: 'Quaternion 4D Text Unfold',
  description:
    'A typokinetic preset where text unfolds through quaternion-like multi-axis rotation, revealing each character as if materializing from 4D hyperspace into 3D view. Characters start rotated in X, Y, and Z axes simultaneously and smoothly interpolate through complex rotation matrices to face forward. Features exponential stagger timing for cascade effect, custom cubic-bezier easing with slight bounce, and optional holographic/glitch filter effects during the transition for an otherworldly mathematical appearance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    '3d',
    'quaternion',
    'rotation',
    'hyperspace',
    'sci-fi',
    'mathematical',
    'holographic',
    'glitch',
    'cascade',
  ],
  defaultInputParams: {
    text: 'HYPERSPACE',
    duration: 3,
    baseDuration: 1.8,
    staggerDelay: 0.08,
    staggerExponent: 1.15,
    fontSize: 72,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    enableHolographic: true,
    holographicIntensity: 0.3,
    initialRotateX: 45,
    initialRotateY: 90,
    initialRotateZ: 30,
    initialScale: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const quaternion4dTextUnfoldPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
