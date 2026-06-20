/**
 * Split-Flap Kinetic Typography Preset
 *
 * This preset creates a kinetic typography effect inspired by split-flap display boards
 * at train stations. Text lines slide horizontally in opposing directions with a mechanical,
 * rhythmic quality. Each line slides in from opposite sides, pauses briefly in the center
 * for readability, then continues sliding out the other side.
 *
 * Features:
 * - **Three-Phase Animation**: Slide-in (40%), hold (20%), slide-out (40%)
 * - **Opposing Directions**: Odd rows slide right-to-left, even rows slide left-to-right
 * - **3D Flip Effect**: Y-axis rotation simulates physical split-flap boards
 * - **Mechanical Snap**: Pause points create a rhythmic, mechanical quality
 * - **Grid Layout**: Multiple lines at different vertical positions
 * - **Synchronized Hold**: All lines align perfectly in center before continuing
 *
 * Use cases:
 * - Station departure board aesthetics
 * - Mechanical typography effects
 * - Kinetic title sequences
 * - Technical/industrial video intros
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  textLines: z
    .array(z.string())
    .length(3)
    .describe('Three text lines to display (top, middle, bottom)'),
  duration: z
    .number()
    .min(3)
    .max(20)
    .default(8)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(120)
    .default(60)
    .describe('Font size in pixels (responsive with clamp)'),
  font: z
    .string()
    .optional()
    .default('Roboto Mono:700')
    .describe('Font family with optional weight (e.g., "Roboto Mono:700")'),
  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (hex or CSS color)'),
  backgroundColor: z
    .string()
    .optional()
    .default('#0a0a0a')
    .describe('Background color (hex or CSS color)'),
  slideDistance: z
    .number()
    .min(100)
    .max(200)
    .default(150)
    .describe('Slide distance as percentage (100-200%)'),
  rotationAngle: z
    .number()
    .min(0)
    .max(45)
    .default(15)
    .describe('Y-axis rotation angle in degrees for 3D flip effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Roboto Mono:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const duration = params.duration;
  const slideInDuration = duration * 0.4; // 40%
  const holdDuration = duration * 0.2; // 20%
  const slideOutStart = slideInDuration + holdDuration;
  const slideOutDuration = duration * 0.4; // 40%

  const slideDistance = params.slideDistance;
  const rotationAngle = params.rotationAngle;

  // Helper function to create slide effects for a text line
  const createSlideEffect = (
    targetId: string,
    rowIndex: number,
  ): GenericEffectData => {
    // Odd rows (index 1) slide right-to-left, even rows (0, 2) slide left-to-right
    const isRightToLeft = rowIndex % 2 === 1;
    const startX = isRightToLeft ? slideDistance : -slideDistance;
    const endX = isRightToLeft ? -slideDistance : slideDistance;

    return {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Phase 1: Slide in (0% to 40%)
        { key: 'translateX', val: startX, prog: 0 },
        { key: 'translateX', val: 0, prog: 0.4 },
        { key: 'rotateY', val: isRightToLeft ? -rotationAngle : rotationAngle, prog: 0 },
        { key: 'rotateY', val: 0, prog: 0.4 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },

        // Phase 2: Hold (40% to 60%)
        { key: 'translateX', val: 0, prog: 0.6 },
        { key: 'rotateY', val: 0, prog: 0.6 },
        { key: 'opacity', val: 1, prog: 0.6 },

        // Phase 3: Slide out (60% to 100%)
        { key: 'translateX', val: endX, prog: 1 },
        { key: 'rotateY', val: isRightToLeft ? rotationAngle : -rotationAngle, prog: 1 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };
  };

  // Create text line components
  const textLineComponents: RenderableComponentData[] = params.textLines.map(
    (text, index) => {
      const textId = `text-line-${index}`;
      const rowId = `row-${index}`;

      const slideEffect = createSlideEffect(textId, index);

      return {
        id: rowId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative h-full overflow-hidden',
            style: {
              transformStyle: 'preserve-3d' as const,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [
          {
            id: textId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: text,
              className: 'absolute whitespace-nowrap',
              style: {
                fontSize: `clamp(${params.fontSize * 0.5}px, 6vw, ${params.fontSize}px)`,
                fontWeight: fontStyle.fontWeight || 700,
                color: params.textColor,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              },
              font: {
                family: fontFamily,
                weights: [fontStyle.fontWeight?.toString() || '700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [
              {
                id: `slide-effect-${index}`,
                componentId: 'generic',
                data: slideEffect,
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'split-flap-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid grid-rows-3 gap-2 w-full h-full items-center',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d' as const,
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: textLineComponents,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'split-flap-kinetic-typography',
  title: 'Split-Flap Kinetic Typography',
  description:
    'A kinetic typography preset inspired by split-flap display boards at train stations. Features multiple text lines sliding in opposing directions with mechanical snap animations. Each line slides in from opposite sides, pauses briefly in the center for readability, then continues sliding out. Includes subtle Y-axis rotation to simulate the 3D flip effect of physical split-flap boards. Creates a rhythmic, grid-like composition with synchronized hold moments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'split-flap',
    'mechanical',
    'train-station',
    'grid',
    '3d',
    'rotation',
    'slide',
  ],
  dependencies: {},
  defaultInputParams: {
    textLines: ['DEPARTURES', 'PLATFORM 9¾', 'ARRIVALS'],
    duration: 8,
    fontSize: 60,
    font: 'Roboto Mono:700',
    textColor: '#ffffff',
    backgroundColor: '#0a0a0a',
    slideDistance: 150,
    rotationAngle: 15,
  },
};

// Export preset
export const splitFlapKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
