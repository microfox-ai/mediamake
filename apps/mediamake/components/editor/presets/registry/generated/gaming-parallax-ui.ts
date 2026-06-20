/**
 * Gaming Parallax UI Preset
 *
 * This preset creates an immersive parallax effect inspired by video game UI,
 * where the background image has a subtle 3D perspective shift while text scrolls
 * on multiple layers at different depths.
 *
 * Features:
 * - **3D Perspective Shift**: Background image rotates in 3D space with subtle
 *   rotateY and rotateX animations
 * - **Multi-Layer Scrolling Text**: Multiple text layers scroll at different speeds
 *   to enhance depth perception (foreground faster, background slower)
 * - **Neon Glow Effects**: Text has glowing neon text-shadow for gaming aesthetic
 * - **CSS Perspective Container**: Uses CSS perspective for 3D effect
 * - **Customizable Colors**: Different colors for each text layer (cyan, purple, pink)
 * - **Performance Optimized**: Uses will-change-transform for all animated elements
 *
 * Use cases:
 * - Creating game trailer title sequences
 * - Building immersive video game UI effects
 * - Adding dynamic parallax text overlays
 * - Creating depth-based text animations for gaming content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  backgroundImage: z.string().describe('Background image URL or path'),
  foregroundText: z
    .string()
    .default('LEVEL UP')
    .describe('Text for foreground layer (fastest scroll)'),
  midgroundText: z
    .string()
    .default('GAME ON')
    .describe('Text for midground layer (medium scroll)'),
  backgroundText: z
    .string()
    .default('VICTORY')
    .describe('Text for background layer (slowest scroll)'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the preset in seconds'),
  foregroundColor: z
    .string()
    .default('#00FFFF')
    .describe('Color for foreground text (default: cyan)'),
  midgroundColor: z
    .string()
    .default('#A855F7')
    .describe('Color for midground text (default: purple)'),
  backgroundTextColor: z
    .string()
    .default('#EC4899')
    .describe('Color for background text (default: pink)'),
  foregroundScrollDuration: z
    .number()
    .min(1)
    .default(4)
    .describe('Duration of foreground text scroll in seconds'),
  midgroundScrollDuration: z
    .number()
    .min(1)
    .default(6)
    .describe('Duration of midground text scroll in seconds'),
  backgroundScrollDuration: z
    .number()
    .min(1)
    .default(8)
    .describe('Duration of background text scroll in seconds'),
  rotationIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Intensity of 3D rotation effect (0-1, default: 1)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = 'gaming-parallax-container';
  const backgroundId = 'gaming-parallax-background';
  const foregroundTextId = 'gaming-parallax-foreground-text';
  const midgroundTextId = 'gaming-parallax-midground-text';
  const backgroundTextId = 'gaming-parallax-background-text';

  const duration = params.duration || 10;
  const rotationIntensity = params.rotationIntensity ?? 1;

  // Helper function to convert hex to rgba for text-shadow
  const hexToRgba = (hex: string, alpha: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0, 255, 255, ${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // --- Background 3D Rotation Effect ---
  const backgroundEffect = {
    id: 'background-3d-rotation',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: [backgroundId],
      ranges: [
        // RotateY: -5deg → 5deg → -5deg (subtle horizontal rotation)
        { key: 'rotateY', val: -5 * rotationIntensity, prog: 0 },
        { key: 'rotateY', val: 5 * rotationIntensity, prog: 0.5 },
        { key: 'rotateY', val: -5 * rotationIntensity, prog: 1 },
        // RotateX: -2deg → 2deg → -2deg (subtle vertical rotation)
        { key: 'rotateX', val: -2 * rotationIntensity, prog: 0 },
        { key: 'rotateX', val: 2 * rotationIntensity, prog: 0.5 },
        { key: 'rotateX', val: -2 * rotationIntensity, prog: 1 },
        // Scale: 1.1 throughout to prevent edge gaps during rotation
        { key: 'scale', val: 1.1, prog: 0 },
        { key: 'scale', val: 1.1, prog: 1 },
      ],
    },
  };

  // --- Text Scroll Effects ---
  // Foreground: Fast scroll (translateX 100% → -100%)
  const foregroundScrollEffect = {
    id: 'foreground-scroll',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: params.foregroundScrollDuration || 4,
      mode: 'provider' as const,
      targetIds: [foregroundTextId],
      ranges: [
        { key: 'translateX', val: '100%', prog: 0 },
        { key: 'translateX', val: '-100%', prog: 1 },
      ],
    },
  };

  // Midground: Medium scroll
  const midgroundScrollEffect = {
    id: 'midground-scroll',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: params.midgroundScrollDuration || 6,
      mode: 'provider' as const,
      targetIds: [midgroundTextId],
      ranges: [
        { key: 'translateX', val: '100%', prog: 0 },
        { key: 'translateX', val: '-100%', prog: 1 },
      ],
    },
  };

  // Background: Slow scroll
  const backgroundTextScrollEffect = {
    id: 'background-text-scroll',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: params.backgroundScrollDuration || 8,
      mode: 'provider' as const,
      targetIds: [backgroundTextId],
      ranges: [
        { key: 'translateX', val: '100%', prog: 0 },
        { key: 'translateX', val: '-100%', prog: 1 },
      ],
    },
  };

  // --- Component Tree ---
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          perspective: '1000px',
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
      // Background Image with 3D rotation
      {
        id: backgroundId,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: params.backgroundImage,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [backgroundEffect],
      } as RenderableComponentData,

      // Foreground Text Layer (z-30, fastest scroll)
      {
        id: foregroundTextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.foregroundText || 'LEVEL UP',
          className: 'absolute top-1/3 left-0 z-30',
          style: {
            fontSize: '6rem',
            fontWeight: 'bold',
            color: params.foregroundColor || '#00FFFF',
            textShadow: `0 0 20px ${hexToRgba(params.foregroundColor || '#00FFFF', 0.8)}`,
            willChange: 'transform',
            whiteSpace: 'nowrap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [foregroundScrollEffect],
      } as RenderableComponentData,

      // Midground Text Layer (z-20, medium scroll)
      {
        id: midgroundTextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.midgroundText || 'GAME ON',
          className: 'absolute top-1/2 left-0 z-20',
          style: {
            fontSize: '4rem',
            fontWeight: 'bold',
            color: params.midgroundColor || '#A855F7',
            opacity: 0.7,
            textShadow: `0 0 15px ${hexToRgba(params.midgroundColor || '#A855F7', 0.6)}`,
            willChange: 'transform',
            whiteSpace: 'nowrap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [midgroundScrollEffect],
      } as RenderableComponentData,

      // Background Text Layer (z-10, slowest scroll)
      {
        id: backgroundTextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.backgroundText || 'VICTORY',
          className: 'absolute top-2/3 left-0 z-10',
          style: {
            fontSize: '2rem',
            fontWeight: 'bold',
            color: params.backgroundTextColor || '#EC4899',
            opacity: 0.5,
            textShadow: `0 0 10px ${hexToRgba(params.backgroundTextColor || '#EC4899', 0.5)}`,
            willChange: 'transform',
            whiteSpace: 'nowrap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [backgroundTextScrollEffect],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'gaming-parallax-ui',
  title: 'Gaming Parallax UI Preset',
  description:
    'Immersive parallax preset inspired by video game UI with 3D perspective shifts on background images and multi-layered scrolling text at different depths. Features subtle perspective tilt and rotation on the background with neon glow effects on text layers for gaming aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'gaming',
    'parallax',
    '3d',
    'perspective',
    'text-scroll',
    'neon',
    'glow',
    'multi-layer',
    'video-game',
    'ui',
  ],
  dependencies: {},
  defaultInputParams: {
    backgroundImage: 'https://example.com/game-background.jpg',
    foregroundText: 'LEVEL UP',
    midgroundText: 'GAME ON',
    backgroundText: 'VICTORY',
    duration: 10,
    foregroundColor: '#00FFFF',
    midgroundColor: '#A855F7',
    backgroundTextColor: '#EC4899',
    foregroundScrollDuration: 4,
    midgroundScrollDuration: 6,
    backgroundScrollDuration: 8,
    rotationIntensity: 1,
  },
};

// --- Export ---
export const gamingParallaxUiPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
