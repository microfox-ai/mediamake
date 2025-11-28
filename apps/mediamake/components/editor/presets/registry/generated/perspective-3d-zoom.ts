/**
 * Perspective 3D Zoom Preset
 *
 * This preset creates a cinematic 3D zoom effect using CSS perspective and translateZ
 * to simulate genuine depth rather than flat scaling. The text appears to float in 3D space,
 * slowly moving toward the viewer with a subtle rotation, creating a more immersive and
 * visually interesting zoom effect than traditional scale-based animations.
 *
 * Features:
 * - **Genuine 3D Depth**: Uses CSS perspective(1000px) and translateZ for true depth perception
 * - **Camera Tracking**: Simulates a camera slowly moving forward through 3D space
 * - **Subtle Rotation**: Adds slight Y-axis rotation (0-2deg) to enhance 3D effect
 * - **Cinematic Typography**: Thin font with wide tracking for a modern title feel
 * - **Depth Shadow**: Custom text shadow for enhanced 3D depth perception
 * - **Smooth Animations**: Dual parallel effects with different easing for natural motion
 *
 * Use cases:
 * - Creating cinematic title sequences
 * - Building engaging intro animations with depth
 * - Adding professional 3D text effects to videos
 * - Creating visually interesting zoom transitions
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('CINEMATIC')
    .describe('Text content to display with 3D zoom effect'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Duration of the 3D zoom animation in seconds'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:100", "Roboto:300:italic")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the text (CSS color value)'),
  fontSize: z
    .number()
    .min(24)
    .max(500)
    .default(96)
    .describe('Font size in pixels'),
  translateZStart: z
    .number()
    .min(-200)
    .max(0)
    .default(-50)
    .describe('Starting translateZ value (negative moves away from viewer)'),
  translateZEnd: z
    .number()
    .min(-50)
    .max(50)
    .default(10)
    .describe('Ending translateZ value (positive moves toward viewer)'),
  rotateYStart: z
    .number()
    .min(-10)
    .max(10)
    .default(0)
    .describe('Starting Y-axis rotation in degrees'),
  rotateYEnd: z
    .number()
    .min(-10)
    .max(10)
    .default(2)
    .describe('Ending Y-axis rotation in degrees'),
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('CSS perspective value in pixels (affects depth perception)'),
  letterSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe('Letter spacing in pixels for cinematic typography'),
  textShadow: z
    .string()
    .optional()
    .describe(
      'Custom text shadow (CSS textShadow value) for depth enhancement',
    ),
  fadeIn: z
    .boolean()
    .default(true)
    .describe('Whether to fade in the text at the start'),
  fadeInDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe('Duration of the fade-in effect in seconds'),
});

// --- Preset Execution ---
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

  // Default thin font weight for cinematic feel
  if (!fontStyle.fontWeight) {
    fontStyle.fontWeight = 100;
  }

  // Generate unique IDs
  const perspectiveContainerId = 'perspective-3d-zoom-container';
  const preserve3dContainerId = 'preserve-3d-inner';
  const cinematicTextId = 'cinematic-3d-text';

  // --- Effects ---
  const effects: any[] = [];

  // TranslateZ effect (ease-in-out for smooth motion)
  const translateZEffect = {
    id: `translateZ-effect-${cinematicTextId}`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [cinematicTextId],
      ranges: [
        { key: 'translateZ', val: params.translateZStart, prog: 0 },
        { key: 'translateZ', val: params.translateZEnd, prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(translateZEffect);

  // RotateY effect (linear for consistent panning)
  const rotateYEffect = {
    id: `rotateY-effect-${cinematicTextId}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [cinematicTextId],
      ranges: [
        { key: 'rotateY', val: params.rotateYStart, prog: 0 },
        { key: 'rotateY', val: params.rotateYEnd, prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(rotateYEffect);

  // Optional fade-in effect
  if (params.fadeIn) {
    const fadeInEffect = {
      id: `fadeIn-effect-${cinematicTextId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: 0,
        duration: params.fadeInDuration,
        mode: 'provider',
        targetIds: [cinematicTextId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };
    effects.push(fadeInEffect);
  }

  // --- Text Atom ---
  const textAtom: RenderableComponentData = {
    id: cinematicTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'uppercase',
      style: {
        fontSize: params.fontSize,
        color: params.textColor,
        letterSpacing: params.letterSpacing,
        textShadow: params.textShadow || '0 25px 50px rgba(0, 0, 0, 0.5)',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects,
  };

  // --- Preserve-3D Inner Container ---
  const preserve3dContainer: RenderableComponentData = {
    id: preserve3dContainerId,
    type: 'layout',
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
        duration: params.duration,
      },
    },
    childrenData: [textAtom] as RenderableComponentData[],
  };

  // --- Perspective Container (Root) ---
  const perspectiveContainer: RenderableComponentData = {
    id: perspectiveContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: `${params.perspective}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [preserve3dContainer] as RenderableComponentData[],
  };

  // --- Return Output ---
  return {
    output: {
      childrenData: [perspectiveContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'perspective-3d-zoom',
  title: 'Perspective 3D Zoom',
  description:
    'A cinematic 3D zoom preset that uses CSS perspective and translateZ to create genuine depth. Text floats in 3D space, slowly moving toward the viewer with subtle rotation, creating a more immersive zoom effect than flat scaling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    '3d',
    'zoom',
    'perspective',
    'cinematic',
    'depth',
    'rotation',
    'title',
    'intro',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'CINEMATIC',
    duration: 5,
    font: 'Inter:100',
    textColor: '#FFFFFF',
    fontSize: 96,
    translateZStart: -50,
    translateZEnd: 10,
    rotateYStart: 0,
    rotateYEnd: 2,
    perspective: 1000,
    letterSpacing: 10,
    textShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
    fadeIn: true,
    fadeInDuration: 0.8,
  },
};

// --- Export Preset ---
export const perspective3dZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
