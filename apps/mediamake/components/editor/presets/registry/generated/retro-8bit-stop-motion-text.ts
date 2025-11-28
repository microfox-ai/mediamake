/**
 * Retro 8-Bit Stop Motion Text Preset
 *
 * This preset creates a retro video game style stop motion text effect where letters 'glitch'
 * into existence pixel by pixel. Each letter appears in 3-4 discrete steps, simulating
 * low frame rate animation characteristic of 8-bit game titles.
 *
 * Features:
 * - **Pixelated Scaling Effects**: Letters snap between 2-3 different sizes before settling
 * - **Stepped Animations**: Uses steps(4, jump-start) easing for harsh, discrete animation
 * - **Frame Drops**: Occasional letters disappear for one frame before reappearing
 * - **Discrete Opacity**: 4 keyframe opacity progression (0 → 0.3 → 0.6 → 1)
 * - **Low Framerate Timing**: Very short uniform timing (index * 0.033s) simulating 30fps
 * - **Pixelated Rendering**: CSS image-rendering:pixelated for authentic retro aesthetic
 * - **CRT Monitor Feel**: Subtle color shift using hue-rotate for vintage display look
 *
 * Use cases:
 * - Retro gaming video intros
 * - 8-bit style title cards
 * - Nostalgic stop motion text effects
 * - Low-fi aesthetic content
 * - Pixel art style animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Define input parameters with descriptions
const presetParams = z.object({
  text: z
    .string()
    .default('GAME START')
    .describe('Text to display with retro stop motion effect'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels for the text'),
  textColor: z
    .string()
    .default('#00FF00')
    .describe('Text color (e.g., #00FF00 for classic green terminal)'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration of the animation in seconds'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the animation relative to parent'),
  frameDropChance: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe(
      'Chance threshold for frame drops (Math.random() > this value triggers drop)',
    ),
  crtHueShift: z
    .number()
    .min(0)
    .max(360)
    .default(10)
    .describe('Hue rotation in degrees for CRT monitor color shift effect'),
  letterSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Letter spacing in pixels for retro monospace look'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const text = params.text;
  const letters = text.split('');
  const letterDuration = 0.132; // 4 frames at ~30fps
  const letterStagger = 0.033; // ~30fps timing
  const totalLetterAnimTime = letters.length * letterStagger + letterDuration;
  const actualDuration = Math.max(params.duration, totalLetterAnimTime);

  // Helper function to create glitch effect for a single letter
  const createLetterGlitchEffect = (
    letterId: string,
    letterIndex: number,
  ): GenericEffectData[] => {
    const effects: GenericEffectData[] = [];
    const startTime = letterIndex * letterStagger;

    // Random frame drop check
    const hasFrameDrop = Math.random() > params.frameDropChance;

    // Stepped opacity effect (0 → 0.3 → 0.6 → 1)
    const opacityEffect: GenericEffectData = {
      type: 'linear', // Use linear with steps in ranges
      start: startTime,
      duration: letterDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 0.25 },
        { key: 'opacity', val: 0.6, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 0.75 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // Scale snapping effect (0.5 → 1.5 → 0.8 → 1.0)
    const scaleEffect: GenericEffectData = {
      type: 'linear',
      start: startTime,
      duration: letterDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 1.5, prog: 0.33 },
        { key: 'scale', val: 0.8, prog: 0.66 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    effects.push(opacityEffect, scaleEffect);

    // Frame drop effect - brief opacity:0 at random mid-position
    if (hasFrameDrop) {
      const dropPosition = 0.4 + Math.random() * 0.2; // Random between 0.4-0.6
      const frameDropEffect: GenericEffectData = {
        type: 'linear',
        start: startTime + letterDuration * dropPosition,
        duration: 0.033, // One frame
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };
      effects.push(frameDropEffect);
    }

    return effects;
  };

  // Create letter components
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `retro-letter-${index}`;
      const letterEffects = createLetterGlitchEffect(letterId, index);

      const letterNode: RenderableComponentData = {
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            display: 'inline-block',
            // Prevent text smoothing for pixelated look
            WebkitFontSmoothing: 'none',
            MozOsxFontSmoothing: 'grayscale',
            fontSmooth: 'never',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: actualDuration,
          },
        },
        effects: letterEffects.map((effectData, effIndex) => ({
          id: `${letterId}-effect-${effIndex}`,
          componentId: 'generic',
          data: effectData,
        })),
      };

      return letterNode;
    },
  );

  // Create container with pixelated styling
  const containerId = 'retro-text-container';
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          imageRendering: 'pixelated',
          WebkitFontSmoothing: 'none',
          MozOsxFontSmoothing: 'grayscale',
          filter: `hue-rotate(${params.crtHueShift}deg)`,
        },
      },
    },
    context: {
      timing: {
        start: params.startTime,
        duration: actualDuration,
      },
    },
    childrenData: [
      {
        id: 'letters-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row font-mono tracking-wider',
            style: {
              gap: `${params.letterSpacing}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: actualDuration,
          },
        },
        childrenData: letterComponents,
      } as RenderableComponentData,
    ],
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
  id: 'retro-8bit-stop-motion-text',
  title: 'Retro 8-Bit Stop Motion Text',
  description:
    'Retro video game style stop motion text where letters glitch into existence pixel by pixel. Each letter appears in 3-4 discrete steps simulating low frame rate animation. Features pixelated scaling effects with letters snapping between different sizes, occasional frame drops where letters disappear briefly, and harsh stepped animations channeling 8-bit game title aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'retro',
    '8-bit',
    'glitch',
    'stop-motion',
    'pixelated',
    'gaming',
    'vintage',
    'crt',
    'stepped-animation',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GAME START',
    fontSize: 48,
    textColor: '#00FF00',
    duration: 5,
    startTime: 0,
    frameDropChance: 0.7,
    crtHueShift: 10,
    letterSpacing: 8,
  },
};

export const retro8bitStopMotionTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
