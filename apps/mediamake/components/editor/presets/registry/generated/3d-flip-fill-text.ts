/**
 * 3D Flip Fill Text Preset
 *
 * This preset creates a dynamic 3D text effect where each letter rotates on its Y-axis,
 * starting as an outline and flipping to reveal a filled version on the reverse side.
 * The flip has proper depth and perspective, with a slight bounce at the end.
 * Shadow effects change dynamically based on the rotation angle.
 *
 * Features:
 * - 3D card flip transition applied to individual characters
 * - Front face: outline text (webkit-text-stroke)
 * - Back face: filled text (rotated 180deg initially)
 * - Dynamic shadow that changes with rotation progress
 * - Subtle scale bounce at flip completion
 * - Staggered timing across characters for cascading effect
 * - Proper depth and perspective using preserve-3d and backface-hidden
 *
 * Use cases:
 * - Creating engaging title animations
 * - Building dynamic text reveals
 * - Adding depth to typography
 * - Creating professional 3D text effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with 3D flip effect'),
  
  font: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  fontSize: z
    .number()
    .default(64)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the filled text (back face)'),
  
  outlineColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the outline text (front face)'),
  
  outlineWidth: z
    .number()
    .default(2)
    .describe('Width of the text outline in pixels'),
  
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each character flip in seconds'),
  
  flipDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the flip animation in seconds'),
  
  bounceDuration: z
    .number()
    .default(0.5)
    .describe('Duration of the bounce animation in seconds'),
  
  bounceScale: z
    .number()
    .default(1.1)
    .describe('Maximum scale during bounce (1.0 = no bounce)'),
  
  gap: z
    .number()
    .default(4)
    .describe('Gap between characters in pixels'),
  
  totalDuration: z
    .number()
    .optional()
    .describe('Total duration of the preset (auto-calculated if not provided)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
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

  // Split text into characters
  const characters = params.text.split('');

  // Calculate total duration
  const lastCharStartTime = (characters.length - 1) * params.staggerDelay;
  const animationEndTime = lastCharStartTime + params.flipDuration + params.bounceDuration;
  const totalDuration = params.totalDuration || animationEndTime + 0.5;

  // Create character components
  const characterComponents: RenderableComponentData[] = characters.map((char, index) => {
    const charWrapperId = `char-wrapper-${index}`;
    const frontTextId = `front-text-${index}`;
    const backTextId = `back-text-${index}`;
    const charStartTime = index * params.staggerDelay;

    // Front face (outline text)
    const frontText: RenderableComponentData = {
      id: frontTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: char,
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight || 'bold',
          WebkitTextStroke: `${params.outlineWidth}px ${params.outlineColor}`,
          color: 'transparent',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
          ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    };

    // Back face (filled text)
    const backText: RenderableComponentData = {
      id: backTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: char,
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight || 'bold',
          color: params.textColor,
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          willChange: 'transform',
          ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    };

    // Character wrapper with effects
    const charWrapper: RenderableComponentData = {
      id: charWrapperId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            width: `${params.fontSize}px`,
            height: `${params.fontSize}px`,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: charStartTime,
          duration: totalDuration - charStartTime,
        },
      },
      childrenData: [frontText, backText],
      effects: [
        // Flip effect (rotateY from 0 to 180deg)
        {
          id: `flip-effect-${index}`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: params.flipDuration,
            mode: 'provider',
            targetIds: [charWrapperId],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: 180, prog: 1 },
            ],
          },
        },
        // Bounce effect (scale 1 → 1.1 → 1)
        {
          id: `bounce-effect-${index}`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: params.flipDuration - params.bounceDuration * 0.5,
            duration: params.bounceDuration,
            mode: 'provider',
            targetIds: [charWrapperId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: params.bounceScale, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Shadow effect (dynamic shadow based on rotation)
        {
          id: `shadow-effect-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: params.flipDuration,
            mode: 'provider',
            targetIds: [charWrapperId],
            ranges: [
              { key: 'filter', val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))', prog: 0 },
              { key: 'filter', val: 'drop-shadow(8px 8px 12px rgba(0,0,0,0.6))', prog: 0.5 },
              { key: 'filter', val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))', prog: 1 },
            ],
          },
        },
      ],
    };

    return charWrapper;
  });

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: '3d-flip-fill-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center',
        style: {
          perspective: '1000px',
          gap: `${params.gap}px`,
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
  id: '3d-flip-fill-text',
  title: '3D Flip Fill Text',
  description: 'A 3D text preset where each letter rotates on its Y-axis, flipping from outline to filled text with proper perspective, depth, bounce animation, and dynamic shadows. Characters are staggered for a sequential flip effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', '3d', 'flip', 'typography', 'animation', 'perspective', 'depth', 'bounce', 'shadow', 'kinetic'],
  defaultInputParams: {
    text: 'FLIP TEXT',
    font: 'Inter:700',
    fontSize: 64,
    textColor: '#ffffff',
    outlineColor: '#ffffff',
    outlineWidth: 2,
    staggerDelay: 0.1,
    flipDuration: 1.2,
    bounceDuration: 0.5,
    bounceScale: 1.1,
    gap: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const threeDFlipFillTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
