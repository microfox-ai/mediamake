/**
 * Kinetic 3D Text Tumble Preset
 *
 * This preset creates dynamic kinetic typography where each character rotates independently
 * in 3D space before settling into place. Features include:
 * - Individual character 3D rotation animations (X, Y, Z axes)
 * - Randomized initial angles for each character
 * - Cascading entrance with overlapping timings
 * - Spring-based bounce effect for magnetic snap-in feel
 * - Continuous gentle Y-axis rotation after assembly
 * - Hardware-accelerated transforms for smooth playback
 *
 * Use cases:
 * - Modern motion graphics title sequences
 * - Engaging text introductions
 * - Dynamic brand reveals
 * - Eye-catching social media content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .max(20)
    .describe('Text to animate (max 20 characters for performance)'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  assemblyDuration: z
    .number()
    .min(2)
    .max(15)
    .default(8)
    .describe('Duration for character assembly phase in seconds'),
  staggerDelay: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Delay between each character animation in seconds'),
  rotationIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for initial rotation angles (higher = more tumbling)'),
  bounceIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for spring bounce effect (higher = more bounce)'),
  continuousRotationSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Continuous rotation speed in RPM after assembly'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color for text container'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  // Helper function: Generate random rotation angles
  const randomRotation = (min: number, max: number, intensity: number) => {
    return (Math.random() * (max - min) + min) * intensity;
  };

  // Helper function: Generate random translateY
  const randomTranslateY = () => {
    return Math.random() * 40 - 20; // -20px to 20px
  };

  // Parse font
  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);

  // Split text into characters (limit to 20)
  const text = params.text.slice(0, 20);
  const characters = text.split('');

  // Calculate total duration (assembly + continuous rotation)
  const totalDuration = params.assemblyDuration + 2;
  const continuousRotationStart = params.assemblyDuration;

  // Create character components with assembly effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;

      // Generate randomized initial rotations
      const initialRotateX = randomRotation(
        -180,
        180,
        params.rotationIntensity,
      );
      const initialRotateY = randomRotation(
        -180,
        180,
        params.rotationIntensity,
      );
      const initialRotateZ = randomRotation(-90, 90, params.rotationIntensity);
      const initialTranslateY = randomTranslateY();

      // Calculate staggered start time
      const effectStart = index * params.staggerDelay;

      // Create assembly effect (spring easing for bounce)
      const assemblyEffect: GenericEffectData = {
        type: 'spring',
        start: effectStart,
        duration: params.assemblyDuration - effectStart,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          // RotateX: random initial → 0
          { key: 'rotateX', val: initialRotateX, prog: 0 },
          { key: 'rotateX', val: 0, prog: 1 },
          // RotateY: random initial → 0
          { key: 'rotateY', val: initialRotateY, prog: 0 },
          { key: 'rotateY', val: 0, prog: 1 },
          // RotateZ: random initial → 0
          { key: 'rotateZ', val: initialRotateZ, prog: 0 },
          { key: 'rotateZ', val: 0, prog: 1 },
          // TranslateY: random initial → 0
          { key: 'translateY', val: initialTranslateY, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          // Opacity: fade in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      };

      // Create TextAtom for this character
      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char === ' ' ? '\u00A0' : char, // Non-breaking space for spaces
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            ...fontStyle,
            display: 'inline-block',
            transformOrigin: 'center',
            transformStyle: 'preserve-3d',
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
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `assembly-effect-${charId}`,
            componentId: 'generic',
            data: assemblyEffect,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create character container layout
  const characterContainer: RenderableComponentData = {
    id: 'character-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center gap-0',
        style: {
          perspective: '1000px',
          ...(params.backgroundColor
            ? { backgroundColor: params.backgroundColor }
            : {}),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: characterComponents,
  } as RenderableComponentData;

  // Calculate continuous rotation: 0.5 RPM = 360deg per 120s = 3deg/s
  // For 2 seconds, rotate: 3deg/s * 2s * speedMultiplier
  const rotationAmount = 3 * 2 * params.continuousRotationSpeed;

  // Create continuous rotation effect for root container
  const continuousRotationEffect: GenericEffectData = {
    type: 'linear',
    start: continuousRotationStart,
    duration: totalDuration - continuousRotationStart,
    mode: 'provider',
    targetIds: ['root-container'],
    ranges: [
      { key: 'rotateY', val: 0, prog: 0 },
      { key: 'rotateY', val: rotationAmount, prog: 1 },
    ],
  };

  // Create root container with continuous rotation
  const rootContainer: RenderableComponentData = {
    id: 'root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'continuous-rotation-effect',
        componentId: 'generic',
        data: continuousRotationEffect,
      },
    ],
    childrenData: [characterContainer],
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
  id: 'kinetic-text-3d-tumble',
  title: 'Kinetic 3D Text Tumble',
  description:
    'Dynamic kinetic typography preset where individual characters tumble independently through 3D space before settling into place with a magnetic snap effect. Features randomized 3D rotations (X, Y, Z axes), cascading entrance with overlapping timings, spring-based bounce on landing, and continuous gentle Y-axis rotation of the assembled text. Characters animate sequentially from left to right with a floating assembly feel, perfect for modern motion graphics and engaging title sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    '3d',
    'rotation',
    'motion-graphics',
    'title',
    'text',
    'animation',
    'spring',
    'bounce',
    'tumble',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    text: 'HELLO WORLD',
    fontSize: 72,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    assemblyDuration: 8,
    staggerDelay: 0.05,
    rotationIntensity: 1,
    bounceIntensity: 1,
    continuousRotationSpeed: 0.5,
  },
};

// Export preset
export const kineticText3dTumblePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
