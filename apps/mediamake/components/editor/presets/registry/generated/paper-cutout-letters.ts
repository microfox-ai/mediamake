/**
 * Paper Cutout Stop Motion Letters Preset
 *
 * This preset creates a tactile paper cutout stop motion effect where individual letters
 * appear to be cut from paper and manually placed down one by one. Each letter drops from
 * above with a paper-like flutter, lands with a soft bounce, and features subtle shadows
 * that enhance the layered paper aesthetic. Includes realistic z-rotation as if someone
 * is physically placing paper cutouts by hand.
 *
 * Features:
 * - **Paper Cutout Animation**: Letters drop from above with flutter and bounce
 * - **Manual Placement Feel**: Random rotation as if placed by hand
 * - **Layered Paper Aesthetic**: Drop shadows that appear before landing
 * - **Deliberate Pacing**: Staggered timing for crafted feel
 * - **Configurable Parameters**: Customize timing, rotation, shadow intensity
 *
 * Use cases:
 * - Title cards with handcrafted aesthetic
 * - Stop motion style text reveals
 * - Artistic text animations
 * - Crafted typography effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  TextAtomData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// Input parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display with paper cutout effect'),
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe('Font family with weight (e.g., "Inter:700", "Roboto:600")'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Color of the text'),
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.12)
    .optional()
    .describe('Delay between each letter placement in seconds'),
  dropDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Total duration for drop, flutter, and land phases'),
  rotationRange: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .optional()
    .describe('Maximum random rotation in degrees for initial drop'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Opacity of drop shadow (0 = no shadow, 1 = full shadow)'),
  gapBetweenLetters: z
    .string()
    .default('0.5rem')
    .optional()
    .describe('Gap between letters (CSS value, e.g., "0.5rem", "8px")'),
  containerPadding: z
    .string()
    .default('1rem')
    .optional()
    .describe('Padding around the container (CSS value)'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .optional()
    .describe(
      'Total duration in seconds (auto-calculated from text length if not provided)',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  let fontWeight = 700;
  if (fontString.includes(':')) {
    const parts = fontString.split(':');
    if (parts.length > 1) {
      fontWeight = parseInt(parts[1], 10) || 700;
    }
  }

  // Generate random rotation for each letter
  const generateRandomRotation = () => {
    const range = params.rotationRange ?? 15;
    return Math.random() * range * 2 - range; // Random between -range and +range
  };

  // Split text into individual letters (including spaces)
  const letters = params.text.split('');

  // Calculate durations
  const staggerDelay = params.staggerDelay ?? 0.12;
  const dropDuration = params.dropDuration ?? 0.3;

  // Phase timings (relative to dropDuration)
  const dropPhaseEnd = dropDuration * 0.7; // 0-70%
  const flutterPhaseEnd = dropDuration * 0.85; // 70-85%
  const landPhaseEnd = dropDuration; // 85-100%

  // Shadow appears 50ms before landing
  const shadowAppearTime = dropDuration * 0.85 - 0.05; // 50ms before land phase

  // Calculate total duration
  const calculatedDuration =
    letters.length * staggerDelay + dropDuration + 0.5; // Extra 0.5s for final settle
  const totalDuration = params.duration ?? calculatedDuration;

  // Create letter components
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      const letterContainerId = `letter-container-${index}`;

      // Random rotation for this letter
      const randomRotation = generateRandomRotation();

      // Create effects for this letter
      const effects: any[] = [];

      // 1. Drop phase (0-70%): Drop from above with rotation
      const dropEffect = {
        id: `drop-effect-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: dropPhaseEnd,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            // Drop from above
            { key: 'translateY', val: -100, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.43 },
            { key: 'opacity', val: 1, prog: 1 },
            // Rotate from random angle to 0
            { key: 'rotate', val: randomRotation, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(dropEffect);

      // 2. Flutter phase (70-85%): Small oscillating rotation
      const flutterAmount = Math.random() * 4 - 2; // Random small flutter -2 to +2 degrees
      const flutterEffect = {
        id: `flutter-effect-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: dropPhaseEnd,
          duration: flutterPhaseEnd - dropPhaseEnd,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: flutterAmount, prog: 0.5 },
            { key: 'rotateZ', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(flutterEffect);

      // 3. Land phase (85-100%): Bounce with scale
      const landEffect = {
        id: `land-effect-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: flutterPhaseEnd,
          duration: landPhaseEnd - flutterPhaseEnd,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            // Small bounce down and up
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 5, prog: 0.33 },
            { key: 'translateY', val: 0, prog: 1 },
            // Scale for depth
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      };
      effects.push(landEffect);

      // 4. Shadow effect: Fades in 50ms before landing
      const shadowIntensity = params.shadowIntensity ?? 0.3;
      const shadowEffect = {
        id: `shadow-effect-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: shadowAppearTime,
          duration: 0.05,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            {
              key: 'filter',
              val: 'drop-shadow(2px 2px 4px rgba(0,0,0,0))',
              prog: 0,
            },
            {
              key: 'filter',
              val: `drop-shadow(2px 2px 4px rgba(0,0,0,${shadowIntensity}))`,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      };
      effects.push(shadowEffect);

      // Create text atom for this letter
      const textAtomData: TextAtomData = {
        text: letter,
        style: {
          fontWeight: fontWeight,
          fontSize: `${params.fontSize ?? 48}px`,
          color: params.textColor ?? '#000000',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      };

      // Letter container (starts at staggered time)
      return {
        id: letterContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
          },
        },
        context: {
          timing: {
            start: index * staggerDelay, // Relative to parent
            duration: totalDuration - index * staggerDelay, // Last until end
          },
        },
        childrenData: [
          {
            id: letterId,
            type: 'atom',
            componentId: 'TextAtom',
            data: textAtomData,
            effects: effects,
            context: {
              timing: {
                start: 0, // Relative to letter container
                duration: dropDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container with flex layout
  const rootContainer = {
    id: 'paper-cutout-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-end',
        style: {
          gap: params.gapBetweenLetters ?? '0.5rem',
          padding: params.containerPadding ?? '1rem',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'paper-cutout-letters',
  title: 'Paper Cutout Stop Motion Letters',
  description:
    'A tactile paper cutout stop motion effect where individual letters appear to be cut from paper and manually placed down one by one. Each letter drops from above with a paper-like flutter, lands with a soft bounce, and features subtle shadows that enhance the layered paper aesthetic. Includes realistic z-rotation as if someone is physically placing paper cutouts by hand. The animation feels crafted, deliberate, and tactile with configurable timing, rotation ranges, and shadow intensity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'animation',
    'paper',
    'cutout',
    'stop-motion',
    'handcrafted',
    'tactile',
    'drop',
    'bounce',
    'shadow',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'PAPER CUTOUT',
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#000000',
    staggerDelay: 0.12,
    dropDuration: 0.3,
    rotationRange: 15,
    shadowIntensity: 0.3,
    gapBetweenLetters: '0.5rem',
    containerPadding: '1rem',
  },
};

// Export preset
export const paperCutoutLettersPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
