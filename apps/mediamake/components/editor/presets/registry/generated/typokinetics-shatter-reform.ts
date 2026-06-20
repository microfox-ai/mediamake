/**
 * Typokinetics Shatter Reform Preset
 *
 * A kinetic typography preset featuring a shatter-and-reform effect where text explodes
 * outward from center with rotation and scale, then reverses to magnetically reform.
 * Each character fragment follows a unique trajectory based on its position relative to
 * the text center, creating an organic particle explosion effect.
 *
 * Features:
 * - **Particle Explosion Effect**: Text breaks apart from center, pieces fly outward with rotation
 * - **Reverse Magnetic Reform**: Animation reverses to pull text back together
 * - **Unique Trajectories**: Each character has a unique explosion path based on position
 * - **Organic Motion**: Random rotation and distance variations for natural feel
 * - **Calculated Physics**: Uses angle and distance calculations for explosion vectors
 *
 * Use cases:
 * - Creating explosive title reveals with particle-like text
 * - Building kinetic typography for tech/gaming content
 * - Adding high-energy text animations for social media
 * - Creating dramatic text entrances/exits with physics-based motion
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text to shatter and reform'),
  duration: z.number().default(2).describe('Total animation duration in seconds'),
  explosionDistance: z.number().default(300).describe('Base explosion distance in pixels'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color for the container'),
  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Blur intensity at explosion peak (0-10)'),
  randomness: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Randomness factor for explosion trajectories (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    explosionDistance,
    fontSize,
    textColor,
    font,
    backgroundColor,
    blurIntensity,
    randomness,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: Record<string, any> = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2];
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Calculate explosion vector based on character position
  const calculateExplosionVector = (
    charIndex: number,
    totalChars: number,
  ): { translateX: number; translateY: number; rotate: number } => {
    // Calculate character's relative position (-1 to 1)
    const normalizedPosition = (charIndex / (totalChars - 1)) * 2 - 1;

    // Calculate angle from center (radians)
    // Characters on left get angles pointing left, right get angles pointing right
    // Add some vertical spread
    const baseAngle = normalizedPosition * Math.PI * 0.5; // -90° to +90°
    const verticalSpread = (Math.random() - 0.5) * Math.PI * 0.4; // ±36° vertical
    const angle = baseAngle + verticalSpread;

    // Calculate distance with randomness
    const distanceMultiplier = 1 + (Math.random() - 0.5) * randomness * 2;
    const distance = explosionDistance * distanceMultiplier;

    // Calculate explosion trajectory
    const translateX = Math.cos(angle) * distance;
    const translateY = Math.sin(angle) * distance;

    // Random rotation between 180-360 degrees
    const rotate = 180 + Math.random() * 180;

    return { translateX, translateY, rotate };
  };

  // Split text into characters
  const characters = text.split('');

  // Create character components with effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;

      // Calculate explosion vector for this character
      const { translateX, translateY, rotate } =
        calculateExplosionVector(index, characters.length);

      // Create shatter-reform effect
      const shatterEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          // Translation: 0 → explode → 0
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: translateX, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: translateY, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
          // Rotation: 0 → rotate → 0
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: rotate, prog: 0.5 },
          { key: 'rotate', val: 0, prog: 1 },
          // Scale: 1 → 0.5 → 1
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.5, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
          // Opacity: 1 → 0.7 → 1
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
          // Blur: 0 → peak → 0
          { key: 'blur', val: 0, prog: 0 },
          { key: 'blur', val: blurIntensity, prog: 0.5 },
          { key: 'blur', val: 0, prog: 1 },
        ],
      };

      const effect = {
        id: `shatter-effect-${index}`,
        componentId: 'generic',
        data: shatterEffect,
      };

      return {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: fontStyle.fontWeight || 700,
            ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
            // Ensure character doesn't collapse layout
            display: 'inline-block',
            minWidth: char === ' ' ? '0.3em' : 'auto',
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight && {
              weights: [fontStyle.fontWeight.toString()],
            }),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [effect],
      } as RenderableComponentData;
    },
  );

  // Create fragment container (relative positioning for characters)
  const fragmentContainer: RenderableComponentData = {
    id: 'fragment-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-flex',
        style: {
          gap: '0px',
          whiteSpace: 'pre',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: characterComponents,
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'shatter-reform-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center overflow-hidden',
        style: backgroundColor ? { backgroundColor } : {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [fragmentContainer],
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
  id: 'typokinetics-shatter-reform',
  title: 'Typokinetics Shatter Reform',
  description:
    'A kinetic typography preset featuring a shatter-and-reform effect where text explodes outward from center with rotation and scale, then reverses to magnetically reform. Each character fragment follows a unique trajectory based on its position relative to the text center, creating an organic particle explosion effect. Animation flows from formed text to scattered fragments and back over 2 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'shatter',
    'reform',
    'explosion',
    'particles',
    'text',
    'motion',
    'dynamic',
    'tech',
    'modern',
  ],
  defaultInputParams: {
    text: 'SHATTER',
    duration: 2,
    explosionDistance: 300,
    fontSize: 72,
    textColor: '#FFFFFF',
    font: 'Inter:700',
    blurIntensity: 4,
    randomness: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const typokineticsShatterReformPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
