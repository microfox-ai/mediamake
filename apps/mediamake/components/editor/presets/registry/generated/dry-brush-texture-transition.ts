/**
 * Dry Brush Texture Transition Preset
 *
 * A painterly transition effect that reveals the next video through scratchy dry brush strokes
 * on canvas. Features crosshatch bristle marks with individual strokes building up from sparse
 * to dense, subtle canvas texture showing through gaps, and color variation simulating paint
 * running out. Ideal for artistic documentary transitions conveying raw, textured storytelling.
 *
 * Technical Implementation:
 * - Creates 30-40 bristle strokes using HTMLBlockAtom (ShapeAtom is deprecated)
 * - Each stroke is a thin div element with absolute positioning
 * - Strokes arranged in CSS Grid (12 columns × 8 rows)
 * - Crosshatch pattern achieved through alternating 45deg/-45deg rotations
 * - Staggered opacity animations create gradual build-up effect
 * - Canvas texture overlay adds painterly quality
 * - Color variation via slight hue-rotate filters
 *
 * Use Cases:
 * - Artistic documentary transitions
 * - Raw, textured storytelling
 * - Painterly video effects
 * - Creative content transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing video/image'),
    type: z.enum(['video', 'image']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming video/image'),
    type: z.enum(['video', 'image']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of brush stroke build-up in seconds'),
  strokeCount: z
    .number()
    .min(30)
    .max(40)
    .default(35)
    .describe('Number of bristle strokes (30-40)'),
  canvasTextureOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity of canvas texture overlay'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration, strokeCount, canvasTextureOpacity } = params;

  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Determine component ID based on media type
  const getComponentId = (type: 'video' | 'image'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Calculate total duration (no overlap, sequential)
  const totalDuration = media1.duration + media2.duration;

  // Transition timing
  const transitionStartTime = media1.duration - transitionDuration;

  // Generate bristle strokes
  const bristleStrokes: RenderableComponentData[] = [];
  const staggerDelay = 0.02; // 0.02s interval between strokes

  for (let i = 0; i < strokeCount; i++) {
    // Random dimensions
    const strokeWidth = Math.floor(randomInRange(1, 4)); // 1-3px
    const strokeHeight = Math.floor(randomInRange(40, 81)); // 40-80%

    // Crosshatch pattern: alternate rotation
    const rotation = i % 2 === 0 ? 45 : -45;

    // Random position within grid cell
    const gridCol = Math.floor(randomInRange(1, 13)); // 1-12
    const gridRow = Math.floor(randomInRange(1, 9)); // 1-8
    const offsetX = Math.floor(randomInRange(-10, 11)); // -10 to 10px offset
    const offsetY = Math.floor(randomInRange(-10, 11));

    // Color variation (slight hue rotation)
    const hueRotate = Math.floor(randomInRange(0, 16)); // 0-15deg

    // Staggered animation start
    const animationStart = transitionStartTime + i * staggerDelay;
    const animationDuration = 0.3; // Quick fade-in

    // Target opacity (0.8-1)
    const targetOpacity = randomInRange(0.8, 1);

    // Create stroke as HTMLBlockAtom (ShapeAtom is deprecated)
    const strokeId = `bristle-stroke-${i}`;
    const strokeHTML = `<div style="
      width: ${strokeWidth}px;
      height: ${strokeHeight}%;
      background-color: #000000;
      transform: rotate(${rotation}deg) translate(${offsetX}px, ${offsetY}px);
      transform-origin: center center;
      will-change: opacity;
      ${hueRotate > 0 ? `filter: hue-rotate(${hueRotate}deg);` : ''}
    "></div>`;

    bristleStrokes.push({
      id: strokeId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: strokeHTML,
        style: {
          position: 'absolute',
          gridColumn: gridCol,
          gridRow: gridRow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
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
          id: `${strokeId}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: animationStart,
            duration: animationDuration,
            mode: 'provider',
            targetIds: [strokeId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: targetOpacity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Canvas texture layer (background gradient with multiply blend)
    {
      id: 'canvas-texture-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            background: 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 50%, #d6d3d1 100%)',
            mixBlendMode: 'multiply',
            opacity: canvasTextureOpacity,
            zIndex: 1,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [],
    } as RenderableComponentData,

    // Outgoing video/image (bottom layer)
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: getComponentId(media1.type),
      data: {
        src: media1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
    } as RenderableComponentData,

    // Incoming video/image (middle layer, behind strokes)
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: getComponentId(media2.type),
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 2,
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-media-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Bristle strokes container (top layer)
    {
      id: 'bristle-strokes-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gridTemplateRows: 'repeat(8, 1fr)',
            gap: '4px',
            zIndex: 3,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: bristleStrokes,
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'dry-brush-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData,
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
  id: 'dry-brush-texture-transition',
  title: 'Dry Brush Texture Transition',
  description:
    'A painterly transition effect that reveals the next video through scratchy dry brush strokes on canvas. Features crosshatch bristle marks with individual strokes building up from sparse to dense, subtle canvas texture showing through gaps, and color variation simulating paint running out. Ideal for artistic documentary transitions conveying raw, textured storytelling.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'artistic', 'painterly', 'brush', 'texture', 'documentary'],
  defaultInputParams: {
    media1: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 1.5,
    strokeCount: 35,
    canvasTextureOpacity: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dryBrushTextureTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
