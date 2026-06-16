/**
 * Film Jump Cut Typokinetics Preset
 *
 * This preset simulates experimental film editing jump cuts where each character appears
 * through rapid position changes with motion blur trails, creating a stop-motion aesthetic
 * with intentional frame drops. Each letter "teleports" through 3-4 discrete positions
 * before settling, with decreasing jump distances creating deceleration.
 *
 * Features:
 * - **Jump Cut Animation**: Characters teleport through 3-4 positions with instant transitions
 * - **Motion Blur Trails**: CSS filter blur synchronized with position changes
 * - **Deceleration Pattern**: Jump distances decrease progressively for natural settling
 * - **Micro-Vibration**: Final position includes subtle vibration for afterimage effect
 * - **Staggered Animation**: 0.03s delay per character for machine-gun reveal effect
 * - **Overflow Management**: Visible overflow allows blur trails to extend beyond bounds
 *
 * Use cases:
 * - Experimental film-style title sequences
 * - Glitch/distortion typography effects
 * - Stop-motion animation aesthetics
 * - Jarring but rhythmic text reveals
 * - Music video titles with aggressive energy
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to animate with jump cut effect'),
  duration: z
    .number()
    .default(3)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size in pixels for the text'),
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the text in hex format'),
  jumpCount: z
    .number()
    .min(3)
    .max(5)
    .default(4)
    .describe('Number of jump positions before settling (3-5)'),
  jumpDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the jump sequence per character in seconds'),
  staggerDelay: z
    .number()
    .default(0.03)
    .describe('Delay between each character animation in seconds'),
  maxJumpDistance: z
    .number()
    .default(80)
    .describe('Maximum jump distance in pixels for first jump'),
  blurIntensity: z
    .number()
    .default(8)
    .describe('Maximum blur intensity during jumps in pixels'),
  vibrationIntensity: z
    .number()
    .default(1)
    .describe('Vibration intensity at rest position in pixels'),
  position: z
    .enum(['center', 'top', 'bottom', 'left', 'right'])
    .default('center')
    .optional()
    .describe('Position of the text on screen'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

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

  // Position class mapping
  const positionClassMap: Record<string, string> = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-20',
    bottom: 'items-end justify-center pb-20',
    left: 'items-center justify-start pl-20',
    right: 'items-center justify-end pr-20',
  };

  const positionClass = positionClassMap[params.position || 'center'];

  // Split text into characters
  const characters = params.text.split('');

  // Calculate animation timing
  const jumpDuration = params.jumpDuration;
  const staggerDelay = params.staggerDelay;
  const totalAnimationDuration = jumpDuration + characters.length * staggerDelay;

  // Create character components with jump cut effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `jump-char-${index}`;
      const charStart = index * staggerDelay;

      // Generate jump positions with decreasing distances
      const jumpCount = params.jumpCount;
      const maxDistance = params.maxJumpDistance;
      const jumpPositions: Array<{ x: number; y: number; blur: number }> = [];

      // Helper function to generate random direction
      const randomDirection = () => ({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
      });

      // Generate jump positions with deceleration
      for (let i = 0; i < jumpCount; i++) {
        const progress = i / (jumpCount - 1);
        const distanceFactor = 1 - progress; // Decreasing distance
        const distance = maxDistance * distanceFactor;
        const direction = randomDirection();

        jumpPositions.push({
          x: direction.x * distance,
          y: direction.y * distance,
          blur: params.blurIntensity * distanceFactor,
        });
      }

      // Final position (0, 0) with micro-vibration
      jumpPositions.push({
        x: 0,
        y: 0,
        blur: 0,
      });

      // Create animation ranges for discrete jumps
      const ranges: any[] = [];
      const progressStep = 1 / jumpCount;

      // Jump sequence (discrete positions)
      for (let i = 0; i < jumpCount; i++) {
        const prog = i * progressStep;
        const pos = jumpPositions[i];

        ranges.push(
          { key: 'translateX', val: `${pos.x}px`, prog },
          { key: 'translateY', val: `${pos.y}px`, prog },
          { key: 'filter', val: `blur(${pos.blur}px)`, prog },
        );
      }

      // Settle animation with micro-vibration
      const settleStart = jumpDuration;
      const settleDuration = 0.2;
      const vibrationIntensity = params.vibrationIntensity;

      // Create jump effect
      const jumpEffect: GenericEffectData = {
        type: 'linear', // Linear for instant transitions between positions
        start: 0,
        duration: jumpDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges,
      };

      // Create settle effect with micro-vibration
      const settleEffect: GenericEffectData = {
        type: 'spring',
        start: settleStart,
        duration: settleDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'translateX', val: `${vibrationIntensity}px`, prog: 0 },
          { key: 'translateX', val: `${-vibrationIntensity}px`, prog: 0.33 },
          { key: 'translateX', val: `${vibrationIntensity * 0.5}px`, prog: 0.66 },
          { key: 'translateX', val: '0px', prog: 1 },
          { key: 'filter', val: 'blur(0px)', prog: 0 },
        ],
      };

      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char === ' ' ? '\u00A0' : char, // Non-breaking space
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            ...fontStyle,
            display: 'inline-block',
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        },
        context: {
          timing: {
            start: charStart,
            duration: params.duration - charStart,
          },
        },
        effects: [
          {
            id: `jump-effect-${index}`,
            componentId: 'generic',
            data: jumpEffect,
          },
          {
            id: `settle-effect-${index}`,
            componentId: 'generic',
            data: settleEffect,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create container
  const rootContainer: RenderableComponentData = {
    id: 'film-jump-cut-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${positionClass}`,
        style: {
          overflow: 'visible', // Allow blur trails to extend beyond bounds
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
        id: 'text-wrapper',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row',
            style: {
              overflow: 'visible',
              gap: '0.05em',
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
  id: 'filmJumpCutTypokinetics',
  title: 'Film Jump Cut Typokinetics',
  description:
    'Experimental typokinetics preset simulating film editing jump cuts where characters teleport through 3-4 discrete positions with motion blur trails before settling with micro-vibration. Creates stop-motion aesthetic with intentional frame drops and afterimage effects for rhythmic, jarring motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'jump-cut',
    'experimental',
    'film-editing',
    'stop-motion',
    'glitch',
    'motion-blur',
    'teleport',
    'afterimage',
  ],
  defaultInputParams: {
    text: 'JUMP CUTS',
    duration: 3,
    fontSize: 72,
    font: 'Inter:700',
    textColor: '#FFFFFF',
    jumpCount: 4,
    jumpDuration: 0.8,
    staggerDelay: 0.03,
    maxJumpDistance: 80,
    blurIntensity: 8,
    vibrationIntensity: 1,
    position: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const filmJumpCutTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
