/**
 * Ransom Note Stop Motion Typography Preset
 * 
 * Creates a chaotic yet deliberate ransom note style animation where individual letters
 * appear to be cut from different magazines and pasted down. Each letter has unique
 * characteristics - different sizes, rotations, and positions. The animation features
 * 'slapping down' effects with paper-like physics and subtle curling effects as if the
 * paper letters are slightly lifted from the surface.
 * 
 * Features:
 * - Individual letter positioning with random offsets
 * - Unique properties per letter: size, rotation, translation
 * - Varying font weights (400/600/800) for magazine cut-out effect
 * - 'Slap down' animation with overshoot spring physics
 * - Subtle 3D curl effects with perspective transform
 * - Drop shadows with varying opacity per letter
 * - Irregular timing for chaotic rhythm
 * - Continuous hover effect post-animation
 * 
 * Use cases:
 * - Creative title cards with edgy aesthetic
 * - Music video typography
 * - Social media content with unique style
 * - Horror or thriller video intros
 * - Artistic text overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('The text to display in ransom note style'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Duration in seconds for the entire animation'),
  textColor: z
    .string()
    .default('#000000')
    .describe('Base text color (default: black)'),
  fontChoices: z
    .array(z.string())
    .default(['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'])
    .describe('Array of font families to randomly choose from for variety'),
  baselineOffset: z
    .number()
    .min(-50)
    .max(50)
    .default(0)
    .describe('Vertical offset for baseline alignment in pixels'),
  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Padding around the container in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Seeded random function for deterministic randomness
  const seededRandom = (seed: number, min: number, max: number): number => {
    const x = Math.sin(seed * 9999) * 10000;
    const random = x - Math.floor(x);
    return min + random * (max - min);
  };

  // Split text into individual letters (including spaces)
  const letters = params.text.split('');

  // Calculate total duration needed based on chaotic timing
  const maxDelay = letters.length * 0.2; // Maximum possible delay
  const totalDuration = params.duration;

  // Create letter components with unique properties
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `ransom-letter-${index}`;
      const seed = index + 1;

      // Generate unique properties per letter
      const fontSize = seededRandom(seed * 1.1, 0.8, 1.4); // 0.8rem to 1.4rem (relative)
      const rotate = seededRandom(seed * 1.2, -12, 12); // -12deg to 12deg
      const translateY = seededRandom(seed * 1.3, -5, 5); // -5px to 5px
      const translateX = seededRandom(seed * 1.4, -3, 3); // Small horizontal offset
      const fontWeights = [400, 600, 800];
      const fontWeight =
        fontWeights[Math.floor(seededRandom(seed * 1.5, 0, 2.99))];
      const shadowOpacity = seededRandom(seed * 1.6, 0.2, 0.5);
      const curlDirection = index % 2 === 0 ? -3 : 3; // Alternate curl direction

      // Random font family
      const fontFamily =
        params.fontChoices[
          Math.floor(seededRandom(seed * 1.7, 0, params.fontChoices.length - 0.01))
        ];

      // Random start delay for chaotic rhythm
      const startDelay = index * seededRandom(seed * 1.8, 0.05, 0.2);

      // Initial rotation for slap-down effect (more extreme)
      const initialRotate = seededRandom(seed * 1.9, -30, 30);

      // Letter component (handle spaces differently)
      const isSpace = letter === ' ';
      const letterData: TextAtomData = {
        text: isSpace ? '\u00A0' : letter, // Non-breaking space for actual spaces
        style: {
          fontSize: `${fontSize}rem`,
          fontWeight: fontWeight.toString(),
          color: params.textColor,
          textShadow: `2px 2px 4px rgba(0, 0, 0, ${shadowOpacity})`,
          transformOrigin: 'center center',
          display: 'inline-block',
          margin: `${seededRandom(seed * 2.0, -5, 5)}px ${seededRandom(seed * 2.1, -3, 3)}px`,
          transform: `rotate(${rotate}deg) translateY(${translateY}px) translateX(${translateX}px)`,
          perspective: '1000px',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      };

      // Slap-down effect with spring physics
      const slapDownEffect: GenericEffectData = {
        type: 'spring',
        start: startDelay,
        duration: 0.8,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Scale: start larger, overshoot, settle
          { key: 'scale', val: 1.2, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
          // Rotation: from initial extreme to final position
          { key: 'rotate', val: initialRotate, prog: 0 },
          { key: 'rotate', val: rotate, prog: 1 },
          // Opacity: fade in quickly
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          // TranslateY: drop from above
          { key: 'translateY', val: -20, prog: 0 },
          { key: 'translateY', val: translateY, prog: 1 },
          // TranslateX: maintain offset
          { key: 'translateX', val: translateX, prog: 0 },
          { key: 'translateX', val: translateX, prog: 1 },
        ],
      };

      // Curl effect (subtle continuous oscillation)
      const curlEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: startDelay + 0.8,
        duration: 100, // Very long duration for continuous effect
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Subtle rotateY for 3D curl
          { key: 'rotateY', val: curlDirection, prog: 0 },
          { key: 'rotateY', val: -curlDirection, prog: 0.5 },
          { key: 'rotateY', val: curlDirection, prog: 1 },
          // Slight translateZ for paper lift feeling
          { key: 'translateZ', val: 0, prog: 0 },
          { key: 'translateZ', val: 2, prog: 0.5 },
          { key: 'translateZ', val: 0, prog: 1 },
        ],
      };

      const slapDownEffectNode = {
        id: `slap-effect-${index}`,
        componentId: 'generic',
        data: slapDownEffect,
      };

      const curlEffectNode = {
        id: `curl-effect-${index}`,
        componentId: 'generic',
        data: curlEffect,
      };

      return {
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: letterData,
        context: {
          timing: {
            start: 0, // All letters use same duration for layout stability
            duration: totalDuration,
          },
        },
        effects: [slapDownEffectNode, curlEffectNode],
      } as RenderableComponentData;
    },
  );

  // Root container with flex layout
  const rootContainer: RenderableComponentData = {
    id: 'ransom-note-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-wrap items-baseline gap-0',
        style: {
          width: '100%',
          height: '100%',
          padding: `${params.containerPadding}px`,
          perspective: '1000px',
          justifyContent: 'center',
          alignItems: 'center',
          transform: `translateY(${params.baselineOffset}px)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: letterComponents,
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
  id: 'ransom-note-stop-motion',
  title: 'Ransom Note Stop Motion Typography',
  description:
    "A chaotic yet deliberate ransom note style animation where individual letters appear cut from different magazines and pasted down with unique characteristics - varying sizes, rotations, positions. Features 'slapping down' animation with paper-like physics and subtle curling effects as if paper letters are slightly lifted from the surface.",
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'ransom-note',
    'stop-motion',
    'kinetic',
    'creative',
    'edgy',
    'magazine',
    'paper',
    '3d',
    'spring',
    'chaotic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'RANSOM NOTE',
    duration: 5,
    textColor: '#000000',
    fontChoices: [
      'Arial',
      'Times New Roman',
      'Courier New',
      'Georgia',
      'Verdana',
    ],
    baselineOffset: 0,
    containerPadding: 20,
  },
};

export const ransomNoteStopMotionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
