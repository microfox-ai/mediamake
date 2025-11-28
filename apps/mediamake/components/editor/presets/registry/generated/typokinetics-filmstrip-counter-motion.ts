/**
 * Typokinetics Film Strip Counter-Motion Preset
 *
 * This preset creates a mesmerizing kinetic typography effect where text lines slide past 
 * each other like film strips moving through a projector gate. The left column scrolls 
 * upward while the right column scrolls downward, creating a hypnotic counter-motion effect.
 *
 * Features:
 * - **Counter-scrolling columns**: Left moves up, right moves down
 * - **Parallax depth**: Lines closer to viewer move faster via z-index and scale
 * - **Staggered timing**: Wave-like animation initiation with 0.2s offsets
 * - **Edge fading**: Smooth fade in/out simulating camera field-of-view boundaries
 * - **Continuous motion**: Linear easing for smooth, hypnotic scrolling
 * - **Depth layering**: z-index classes (z-10, z-20, z-30) create visual depth
 *
 * Use cases:
 * - Creating cinematic title sequences
 * - Building dynamic credits rolls with counter-motion
 * - Adding film-inspired typography effects
 * - Creating mesmerizing text animations for social media
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  leftTexts: z
    .array(z.string())
    .min(1)
    .max(10)
    .default(['FILM', 'MOTION', 'VISUAL', 'KINETIC', 'FLOW'])
    .describe('Array of text lines for the left column (upward motion)'),
  rightTexts: z
    .array(z.string())
    .min(1)
    .max(10)
    .default(['STRIP', 'DESIGN', 'STORY', 'RHYTHM', 'DREAM'])
    .describe('Array of text lines for the right column (downward motion)'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for all lines'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color'),
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(20)
    .describe('Total duration of the animation in seconds'),
  staggerOffset: z
    .number()
    .min(0)
    .max(2)
    .default(0.2)
    .describe('Time offset between each line start (seconds) for wave effect'),
  fadeProgress: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe(
      'Fade in/out range as fraction of animation (0.1 = fade in first 10%, fade out last 10%)',
    ),
  columnGap: z
    .number()
    .min(0)
    .max(100)
    .default(16)
    .describe('Gap between left and right columns in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
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

  // Font configuration
  const fontConfig = {
    family: fontFamily,
    ...(fontStyle.fontWeight
      ? { weights: [fontStyle.fontWeight.toString()] }
      : { weights: ['700'] }),
  };

  // Helper: Create text line component
  const createTextLine = (
    text: string,
    lineIndex: number,
    columnSide: 'left' | 'right',
  ) => {
    const lineId = `${columnSide}-line-${lineIndex}`;

    // Z-index layering for depth (higher index = closer to viewer)
    // Use 3 layers cycling: z-10 (back), z-20 (mid), z-30 (front)
    const zIndexClass =
      lineIndex % 3 === 0 ? 'z-30' : lineIndex % 3 === 1 ? 'z-20' : 'z-10';

    // Font size variation for depth (larger = closer)
    const fontSizeMap = ['text-2xl', 'text-3xl', 'text-4xl'];
    const fontSizeClass =
      lineIndex % 3 === 0
        ? fontSizeMap[2]
        : lineIndex % 3 === 1
          ? fontSizeMap[1]
          : fontSizeMap[0];

    return {
      id: lineId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text,
        className: `text-white ${fontSizeClass} font-bold ${zIndexClass}`,
        style: {
          color: params.textColor,
          ...fontStyle,
        },
        font: fontConfig,
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    } as RenderableComponentData;
  };

  // Helper: Create effect for a line
  const createLineEffect = (
    lineId: string,
    lineIndex: number,
    columnSide: 'left' | 'right',
  ) => {
    const effectId = `effect-${lineId}`;

    // Direction: left = upward (100% to -100%), right = downward (-100% to 100%)
    const startY = columnSide === 'left' ? 100 : -100;
    const endY = columnSide === 'left' ? -100 : 100;

    // Scale for parallax: front lines (z-30) scale more, back lines (z-10) less
    const scaleStart =
      lineIndex % 3 === 0 ? 1.1 : lineIndex % 3 === 1 ? 1.05 : 1.0;
    const scaleEnd =
      lineIndex % 3 === 0 ? 0.9 : lineIndex % 3 === 1 ? 0.95 : 1.0;

    // Reverse scale direction for downward motion
    const finalScaleStart = columnSide === 'left' ? scaleStart : scaleEnd;
    const finalScaleEnd = columnSide === 'left' ? scaleEnd : scaleStart;

    const effectData: GenericEffectData = {
      type: 'linear',
      start: lineIndex * params.staggerOffset,
      duration: params.duration - lineIndex * params.staggerOffset,
      mode: 'provider',
      targetIds: [lineId],
      ranges: [
        // Vertical translation
        { key: 'translateY', val: startY, prog: 0, unit: '%' },
        { key: 'translateY', val: endY, prog: 1, unit: '%' },
        // Opacity fade in/out at edges
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: params.fadeProgress },
        { key: 'opacity', val: 1, prog: 1 - params.fadeProgress },
        { key: 'opacity', val: 0, prog: 1 },
        // Scale for parallax depth
        { key: 'scale', val: finalScaleStart, prog: 0 },
        { key: 'scale', val: finalScaleEnd, prog: 1 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Create left column components and effects
  const leftLineComponents = params.leftTexts.map((text, index) =>
    createTextLine(text, index, 'left'),
  );
  const leftLineEffects = params.leftTexts.map((text, index) => {
    const lineId = `left-line-${index}`;
    return createLineEffect(lineId, index, 'left');
  });

  // Create right column components and effects
  const rightLineComponents = params.rightTexts.map((text, index) =>
    createTextLine(text, index, 'right'),
  );
  const rightLineEffects = params.rightTexts.map((text, index) => {
    const lineId = `right-line-${index}`;
    return createLineEffect(lineId, index, 'right');
  });

  // Left column container
  const leftColumn: RenderableComponentData = {
    id: 'typokinetics-left-column',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex-1 relative overflow-hidden',
      },
      repeatChildrenProps: {
        className: 'absolute w-full text-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: leftLineEffects,
    childrenData: leftLineComponents,
  };

  // Right column container
  const rightColumn: RenderableComponentData = {
    id: 'typokinetics-right-column',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex-1 relative overflow-hidden',
      },
      repeatChildrenProps: {
        className: 'absolute w-full text-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: rightLineEffects,
    childrenData: rightLineComponents,
  };

  // Columns container
  const columnsContainer: RenderableComponentData = {
    id: 'typokinetics-columns-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row w-full h-full',
        style: {
          gap: `${params.columnGap}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [leftColumn, rightColumn],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-filmstrip-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [columnsContainer],
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
  id: 'typokinetics-filmstrip-counter-motion',
  title: 'Typokinetics Film Strip Counter-Motion',
  description:
    'A mesmerizing kinetic typography preset featuring counter-scrolling text columns simulating film strips moving through a projector gate. Left column scrolls upward while right column scrolls downward, with parallax depth via z-index and scale variations. Staggered animation timing creates wave-like motion initiation, with fade effects at edges simulating camera field-of-view boundaries.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'filmstrip',
    'counter-motion',
    'parallax',
    'scroll',
    'credits',
    'cinematic',
  ],
  dependencies: {},
  defaultInputParams: {
    leftTexts: ['FILM', 'MOTION', 'VISUAL', 'KINETIC', 'FLOW'],
    rightTexts: ['STRIP', 'DESIGN', 'STORY', 'RHYTHM', 'DREAM'],
    font: 'Inter:700',
    textColor: '#FFFFFF',
    backgroundColor: '#000000',
    duration: 20,
    staggerOffset: 0.2,
    fadeProgress: 0.1,
    columnGap: 16,
  },
};

export const typokineticFilmstripCounterMotionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
