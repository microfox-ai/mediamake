/**
 * Documentary Lower Third Preset
 *
 * A broadcast-quality lower third animation inspired by professional news graphics and
 * documentary titles. Features a horizontal bar that scales in from the left, followed by
 * text that rotates up from a flat position using 3D rotation on the X-axis.
 *
 * Features:
 * - **3D Text Rotation**: Text rotates from -90deg (lying flat) to 0deg (upright) with X-axis rotation
 * - **Depth of Field Blur**: Simulates camera focus with blur decreasing as text rises (4px → 0px)
 * - **Dynamic Shadow**: Drop shadow grows as text stands up, grounding it in space (0px → 10px 15px)
 * - **Horizontal Bar Animation**: Supporting bar scales in first (scaleX 0 → 1) to establish the space
 * - **Overlapped Timing**: Bar completes at 30%, text starts at 20% for smooth professional flow
 * - **Opacity Fade**: Subtle fade from 0.7 to 1 for polished appearance
 *
 * Use cases:
 * - Professional news graphics and lower thirds
 * - Documentary title cards and name plates
 * - Broadcast-quality video overlays
 * - Interview subject identification
 * - Corporate video branding elements
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- PARAMS SCHEMA ---
const presetParams = z.object({
  text: z.string().describe('Text content to display in the lower third'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(3)
    .describe('Total duration of the animation in seconds'),
  position: z
    .object({
      bottom: z.string().default('5rem').describe('Distance from bottom edge'),
      left: z.string().default('2.5rem').describe('Distance from left edge'),
    })
    .optional()
    .describe('Positioning configuration for the lower third'),
  styling: z
    .object({
      fontSize: z.string().default('2.25rem').describe('Text font size'),
      fontWeight: z.string().default('bold').describe('Text font weight'),
      textColor: z.string().default('#FFFFFF').describe('Text color'),
      barColor: z.string().default('#FFFFFF').describe('Bar color'),
      barHeight: z.string().default('0.25rem').describe('Bar height'),
      barWidth: z.string().default('20rem').describe('Bar maximum width'),
    })
    .optional()
    .describe('Visual styling configuration'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  timing: z
    .object({
      barDuration: z
        .number()
        .min(0.1)
        .max(1)
        .default(0.3)
        .describe('Bar animation duration as fraction of total (0.3 = 30%)'),
      textStart: z
        .number()
        .min(0)
        .max(1)
        .default(0.2)
        .describe('Text animation start as fraction of total (0.2 = 20%)'),
      textDuration: z
        .number()
        .min(0.1)
        .max(1)
        .default(0.6)
        .describe('Text animation duration as fraction of total (0.6 = 60%)'),
    })
    .optional()
    .describe('Animation timing configuration'),
});

// --- PRESET EXECUTION ---
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

  // Merge defaults with user params
  const position = params.position || {
    bottom: '5rem',
    left: '2.5rem',
  };
  const styling = params.styling || {
    fontSize: '2.25rem',
    fontWeight: 'bold',
    textColor: '#FFFFFF',
    barColor: '#FFFFFF',
    barHeight: '0.25rem',
    barWidth: '20rem',
  };
  const timing = params.timing || {
    barDuration: 0.3,
    textStart: 0.2,
    textDuration: 0.6,
  };

  // Calculate absolute timings
  const totalDuration = params.duration;
  const barDuration = totalDuration * timing.barDuration;
  const textStartTime = totalDuration * timing.textStart;
  const textDuration = totalDuration * timing.textDuration;

  // --- BAR ELEMENT ---
  const barId = 'documentary-lower-third-bar';
  const barElement: RenderableComponentData = {
    id: barId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: ${styling.barWidth}; height: ${styling.barHeight}; background-color: ${styling.barColor};"></div>`,
      className: '',
      style: {
        transformOrigin: 'left center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: barDuration,
      },
    },
    effects: [],
  };

  // Bar scale animation (scaleX 0 → 1)
  const barScaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: barDuration,
    mode: 'provider',
    targetIds: [barId],
    ranges: [
      { key: 'scaleX', val: 0, prog: 0 },
      { key: 'scaleX', val: 1, prog: 1 },
    ],
  };

  barElement.effects = [
    {
      id: `${barId}-scale-effect`,
      componentId: 'generic',
      data: barScaleEffect,
    },
  ];

  // --- TEXT ELEMENT ---
  const textId = 'documentary-lower-third-text';
  const textElement: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: '',
      style: {
        fontSize: styling.fontSize,
        fontWeight: styling.fontWeight,
        color: styling.textColor,
        transformOrigin: 'bottom',
        textShadow: '0 0 0 rgba(0,0,0,0)',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: textStartTime,
        duration: textDuration,
      },
    },
    effects: [],
  };

  // Text rotation effect (rotateX -90deg → 0deg)
  const textRotateEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0, // Relative to text start time
    duration: textDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'rotateX', val: -90, prog: 0 },
      { key: 'rotateX', val: 0, prog: 1 },
    ],
  };

  // Text blur effect (blur(4px) → blur(0px))
  const textBlurEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: textDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'filter', val: 'blur(4px)', prog: 0 },
      { key: 'filter', val: 'blur(0px)', prog: 1 },
    ],
  };

  // Text opacity fade (0.7 → 1)
  const textOpacityEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: textDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'opacity', val: 0.7, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Text shadow growth (0px → 10px 15px)
  const textShadowEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: textDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'textShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 0 },
      { key: 'textShadow', val: '0 10px 15px rgba(0,0,0,0.3)', prog: 1 },
    ],
  };

  textElement.effects = [
    {
      id: `${textId}-rotate-effect`,
      componentId: 'generic',
      data: textRotateEffect,
    },
    {
      id: `${textId}-blur-effect`,
      componentId: 'generic',
      data: textBlurEffect,
    },
    {
      id: `${textId}-opacity-effect`,
      componentId: 'generic',
      data: textOpacityEffect,
    },
    {
      id: `${textId}-shadow-effect`,
      componentId: 'generic',
      data: textShadowEffect,
    },
  ];

  // --- TEXT CONTAINER ---
  const textContainer: RenderableComponentData = {
    id: 'documentary-lower-third-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformOrigin: 'bottom',
          marginTop: '0.5rem',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textElement],
  };

  // --- BAR CONTAINER ---
  const barContainer: RenderableComponentData = {
    id: 'documentary-lower-third-bar-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [barElement],
  };

  // --- ROOT CONTAINER ---
  const rootContainer: RenderableComponentData = {
    id: 'documentary-lower-third-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          bottom: position.bottom,
          left: position.left,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [barContainer, textContainer] as RenderableComponentData[],
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

// --- PRESET METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'documentary-lower-third',
  title: 'Documentary Lower Third',
  description:
    'Broadcast-quality lower third with 3D text rotation from bottom baseline. Features a horizontal bar that scales in first, followed by text rotating up from -90deg on X-axis with synchronized blur and shadow effects. Professional and understated animation timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'lower-third',
    'documentary',
    'broadcast',
    'news',
    'professional',
    '3d-rotation',
    'typography',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Lower Third Text',
    duration: 3,
    position: {
      bottom: '5rem',
      left: '2.5rem',
    },
    styling: {
      fontSize: '2.25rem',
      fontWeight: 'bold',
      textColor: '#FFFFFF',
      barColor: '#FFFFFF',
      barHeight: '0.25rem',
      barWidth: '20rem',
    },
    font: 'Inter:700',
    timing: {
      barDuration: 0.3,
      textStart: 0.2,
      textDuration: 0.6,
    },
  },
};

// --- EXPORT ---
export const documentaryLowerThirdPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
