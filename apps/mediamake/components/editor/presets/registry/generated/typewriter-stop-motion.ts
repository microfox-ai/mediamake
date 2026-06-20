/**
 * Stop-Motion Typewriter Effect Preset
 *
 * A handcrafted typewriter effect inspired by stop-motion animation and Wes Anderson aesthetics.
 * Each character arrives from different directions with unique entrance animations (rotate, slide, pop),
 * featuring paper texture overlays, subtle imperfections in alignment, shadow depth, and a post-typing
 * wobble effect. Includes an animated cursor pointer that moves between positions.
 *
 * Features:
 * - **Character Entrance Animations**: Each character randomly enters with one of four unique animations:
 *   1. Slide from left (translateX: -30px->0)
 *   2. Slide from right (translateX: 30px->0)
 *   3. Rotate in (rotateY: 90deg->0)
 *   4. Pop from below (translateY: 30px->0, scale: 0.5->1)
 * - **Paper Texture Overlay**: Subtle paper texture with multiply blend mode for vintage feel
 * - **Handcrafted Imperfections**: Random slight rotations (±1deg) and vertical offsets (±2px) in final position
 * - **Shadow Depth**: Each character has shadow-md for tactile depth
 * - **Animated Cursor**: Hand pointer or arrow that moves horizontally between character positions
 * - **Post-Typing Wobble**: After all characters appear, gentle oscillating wobble animation (2s duration)
 * - **Staggered Timing**: Characters appear sequentially with 150ms delay between each
 *
 * Technical Specifications:
 * - Root container: BaseLayout with 'relative flex items-center justify-center bg-amber-50'
 * - Paper texture: ImageAtom overlay with 'mix-blend-mode: multiply opacity-5'
 * - Character wrappers: Individual BaseLayout with 'inline-block shadow-md'
 * - Entrance effects: Generic effects with ease-out timing (400-600ms random)
 * - Imperfections: Applied via final state effects with random translateY (±2px) and rotate (±1deg)
 * - Cursor: ImageAtom (or custom shape) with horizontal translateX animation
 * - Wobble: Generic effect with ease-in-out, oscillating rotate (-0.5->0.5->0deg) over 2s
 * - Performance: Uses transform3d for GPU acceleration
 *
 * Use cases:
 * - Creating vintage title sequences
 * - Adding handcrafted animation aesthetics
 * - Building Wes Anderson-style title cards
 * - Creating tactile, physical-feeling text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  GenericEffectData,
  TextAtomData,
  ImageAtomData,
} from '@microfox/remotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('HELLO')
    .describe('Text to display with typewriter effect'),
  font: z
    .string()
    .default('BebasNeue:700')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "BebasNeue:700", "Inter:600")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .optional()
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#2c1810')
    .optional()
    .describe('Text color (hex or rgba)'),
  characterDelay: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.15)
    .optional()
    .describe('Delay between character entrances in seconds'),
  entranceDurationMin: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.4)
    .optional()
    .describe('Minimum entrance animation duration in seconds'),
  entranceDurationMax: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .optional()
    .describe('Maximum entrance animation duration in seconds'),
  wobbleStartDelay: z
    .number()
    .min(0)
    .max(5)
    .default(3)
    .optional()
    .describe(
      'Delay before wobble effect starts (relative to root container)',
    ),
  wobbleDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .optional()
    .describe('Duration of wobble animation in seconds'),
  paperTexture: z
    .object({
      src: z
        .string()
        .default(
          'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800',
        )
        .describe('Paper texture image URL'),
      opacity: z
        .number()
        .min(0)
        .max(1)
        .default(0.05)
        .optional()
        .describe('Paper texture opacity'),
    })
    .default({
      src: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800',
      opacity: 0.05,
    })
    .optional()
    .describe('Paper texture overlay configuration'),
  cursorIcon: z
    .object({
      src: z
        .string()
        .default(
          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3E%3Cpath fill="%232c1810" d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"/%3E%3C/svg%3E',
        )
        .describe('Cursor icon image URL (default: right arrow SVG)'),
    })
    .default({
      src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3E%3Cpath fill="%232c1810" d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"/%3E%3C/svg%3E',
    })
    .optional()
    .describe('Cursor icon configuration'),
  backgroundColor: z
    .string()
    .default('#fef3c7')
    .optional()
    .describe('Background color (hex or rgba) - default: amber-50'),
  totalDuration: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .optional()
    .describe('Total duration of the preset in seconds'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    let fontStyle: Record<string, any> = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
      }
    }
    return { fontFamily, fontStyle };
  };

  // Helper: Random entrance animation selector
  const getRandomEntranceAnimation = (
    targetId: string,
    start: number,
    duration: number,
  ): GenericEffectData => {
    const animations = [
      // Slide from left
      {
        ranges: [
          { key: 'translateX', val: -30, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
      // Slide from right
      {
        ranges: [
          { key: 'translateX', val: 30, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
      // Rotate in
      {
        ranges: [
          { key: 'rotateY', val: 90, prog: 0 },
          { key: 'rotateY', val: 0, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
      // Pop from below
      {
        ranges: [
          { key: 'translateY', val: 30, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    ];

    const selected =
      animations[Math.floor(Math.random() * animations.length)];

    return {
      type: 'ease-out',
      start,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: selected.ranges,
    };
  };

  // Helper: Random imperfection effect
  const getImperfectionEffect = (
    targetId: string,
    start: number,
    duration: number,
  ): GenericEffectData => {
    const randomRotate = (Math.random() - 0.5) * 2; // -1 to +1 degree
    const randomTranslateY = (Math.random() - 0.5) * 4; // -2 to +2 px

    return {
      type: 'ease-out',
      start,
      duration: 0.1,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'rotate', val: randomRotate, prog: 1 },
        { key: 'translateY', val: randomTranslateY, prog: 1 },
      ],
    };
  };

  // Helper: Wobble effect
  const getWobbleEffect = (
    targetId: string,
    start: number,
    duration: number,
  ): GenericEffectData => {
    return {
      type: 'ease-in-out',
      start,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: -0.5, prog: 0.25 },
        { key: 'rotate', val: 0.5, prog: 0.75 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    };
  };

  // Parse parameters
  const text = params.text || 'HELLO';
  const characters = text.split('');
  const characterDelay = params.characterDelay ?? 0.15;
  const entranceDurationMin = params.entranceDurationMin ?? 0.4;
  const entranceDurationMax = params.entranceDurationMax ?? 0.6;
  const wobbleStartDelay = params.wobbleStartDelay ?? 3;
  const wobbleDuration = params.wobbleDuration ?? 2;
  const totalDuration = params.totalDuration ?? 10;

  const { fontFamily, fontStyle } = parseFontString(params.font || 'BebasNeue:700');

  // Calculate cursor animation duration (ends when last character appears)
  const lastCharacterStart = (characters.length - 1) * characterDelay;
  const cursorDuration = lastCharacterStart + entranceDurationMax;

  // Build character components
  const characterComponents: RenderableComponentData[] = [];

  characters.forEach((char, index) => {
    const charId = `char-wrapper-${index}`;
    const textId = `char-text-${index}`;
    const charStart = index * characterDelay;
    const entranceDuration =
      entranceDurationMin +
      Math.random() * (entranceDurationMax - entranceDurationMin);
    const imperfectionStart = charStart + entranceDuration;

    // Random entrance animation
    const entranceEffect = getRandomEntranceAnimation(
      charId,
      0,
      entranceDuration,
    );

    // Imperfection effect (applied after entrance)
    const imperfectionEffect = getImperfectionEffect(
      charId,
      imperfectionStart,
      totalDuration - imperfectionStart,
    );

    // Wobble effect (starts after wobbleStartDelay)
    const wobbleEffect = getWobbleEffect(
      charId,
      wobbleStartDelay,
      wobbleDuration,
    );

    // Character wrapper
    const charWrapper: RenderableComponentData = {
      id: charId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'inline-block shadow-md',
        },
      },
      context: {
        timing: {
          start: charStart,
          duration: totalDuration - charStart,
        },
      },
      effects: [
        {
          id: `entrance-${index}`,
          componentId: 'generic',
          data: entranceEffect,
        },
        {
          id: `imperfection-${index}`,
          componentId: 'generic',
          data: imperfectionEffect,
        },
        {
          id: `wobble-${index}`,
          componentId: 'generic',
          data: wobbleEffect,
        },
      ],
      childrenData: [
        {
          id: textId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: char,
            style: {
              fontSize: params.fontSize ?? 64,
              color: params.textColor ?? '#2c1810',
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
              duration: totalDuration - charStart,
            },
          },
        } as RenderableComponentData,
      ],
    };

    characterComponents.push(charWrapper);
  });

  // Text container
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'inline-flex flex-row items-center justify-center',
        style: {
          gap: '4px',
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

  // Paper texture overlay
  const paperTexture: RenderableComponentData = {
    id: 'texture-overlay',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: params.paperTexture?.src ?? 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'multiply',
        opacity: params.paperTexture?.opacity ?? 0.05,
      },
    } as ImageAtomData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Cursor element
  const cursorElement: RenderableComponentData = {
    id: 'cursor-element',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: params.cursorIcon?.src ?? 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3E%3Cpath fill="%232c1810" d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"/%3E%3C/svg%3E',
      className: 'absolute',
      style: {
        width: '24px',
        height: '24px',
      },
    } as ImageAtomData,
    context: {
      timing: {
        start: 0,
        duration: cursorDuration,
      },
    },
    effects: [
      {
        id: 'cursor-movement',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: cursorDuration,
          mode: 'provider',
          targetIds: ['cursor-element'],
          ranges: [
            {
              key: 'translateX',
              val: -100 - characters.length * 10,
              prog: 0,
            },
            {
              key: 'translateX',
              val: 100 + characters.length * 10,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-stop-motion-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
          backgroundColor: params.backgroundColor ?? '#fef3c7',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [paperTexture, textContainer, cursorElement],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'typewriter-stop-motion',
  title: 'Stop-Motion Typewriter Effect',
  description:
    'A handcrafted typewriter effect inspired by stop-motion animation and Wes Anderson aesthetics. Each character arrives from different directions with unique entrance animations (rotate, slide, pop), featuring paper texture overlays, subtle imperfections in alignment, shadow depth, and a post-typing wobble effect. Includes an animated cursor pointer that moves between positions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typewriter',
    'stop-motion',
    'animation',
    'handcrafted',
    'wes-anderson',
    'vintage',
    'title',
    'entrance',
    'wobble',
    'cursor',
    'texture',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HELLO',
    font: 'BebasNeue:700',
    fontSize: 64,
    textColor: '#2c1810',
    characterDelay: 0.15,
    entranceDurationMin: 0.4,
    entranceDurationMax: 0.6,
    wobbleStartDelay: 3,
    wobbleDuration: 2,
    paperTexture: {
      src: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800',
      opacity: 0.05,
    },
    cursorIcon: {
      src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3E%3Cpath fill="%232c1810" d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"/%3E%3C/svg%3E',
    },
    backgroundColor: '#fef3c7',
    totalDuration: 10,
  },
};

// --- Export ---
export const typewriterStopMotionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
