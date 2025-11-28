/**
 * Cinematic Parallax Scrolling with Ken Burns Effect Preset
 *
 * This preset creates a cinematic parallax scrolling effect inspired by documentary
 * title sequences. Features a slow Ken Burns effect (zoom and pan) on the background
 * image while text scrolls horizontally across the screen at a different speed,
 * creating a parallax depth effect.
 *
 * Features:
 * - Ken Burns Effect: Background image slowly zooms (1.0 → 1.2) and pans (-5% → 5%)
 * - Parallax Scrolling: Text scrolls horizontally (100% → -100%) at different speed
 * - Semi-transparent Overlay: Black overlay (30% opacity) for better text contrast
 * - Text Glow: Subtle pulsing glow effect for enhanced readability
 * - GPU Acceleration: Optimized with will-change-transform for smooth animations
 *
 * Use Cases:
 * - Documentary-style title sequences
 * - Cinematic video intros
 * - Professional presentation openings
 * - Story-telling video transitions
 * - Elegant text reveal animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  ImageAtomData,
  TextAtomData,
  GenericEffectData,
  BaseEffect,
} from '@microfox/remotion';

const presetParams = z.object({
  backgroundImage: z
    .string()
    .describe('Background image source URL or local path'),
  scrollingText: z
    .string()
    .default('CINEMATIC PARALLAX SCROLLING')
    .describe('Text content to scroll across the screen'),
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(10)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size of the scrolling text in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the scrolling text'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  overlayOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of the semi-transparent overlay (0-1)'),
  kenBurnsIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.0)
    .describe('Intensity multiplier for Ken Burns effect (scale and pan)'),
  scrollSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.0)
    .describe('Speed multiplier for text scrolling (higher = faster)'),
  textGlowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of the text glow pulse effect (0 = no glow, 1 = max glow)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
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

  // Component IDs
  const containerId = 'cinematic-parallax-container';
  const backgroundImageId = 'cinematic-parallax-bg-image';
  const overlayLayerId = 'cinematic-parallax-overlay';
  const scrollingTextContainerId = 'cinematic-parallax-text-container';
  const scrollingTextId = 'cinematic-parallax-text';

  // Ken Burns Effect Data
  const kenBurnsScaleStart = 1.0;
  const kenBurnsScaleEnd = 1.0 + 0.2 * params.kenBurnsIntensity;
  const kenBurnsPanStart = -5 * params.kenBurnsIntensity;
  const kenBurnsPanEnd = 5 * params.kenBurnsIntensity;

  const kenBurnsEffect: BaseEffect = {
    id: 'ken-burns-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [backgroundImageId],
      ranges: [
        { key: 'scale', val: kenBurnsScaleStart, prog: 0 },
        { key: 'scale', val: kenBurnsScaleEnd, prog: 1 },
        { key: 'translateX', val: `${kenBurnsPanStart}%`, prog: 0 },
        { key: 'translateX', val: `${kenBurnsPanEnd}%`, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Text Scroll Effect Data
  const scrollDuration = params.duration / params.scrollSpeed;
  const textScrollEffect: BaseEffect = {
    id: 'text-scroll-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: scrollDuration,
      mode: 'provider',
      targetIds: [scrollingTextId],
      ranges: [
        { key: 'translateX', val: '100%', prog: 0 },
        { key: 'translateX', val: '-100%', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Text Glow Pulse Effect Data
  const glowPulseDuration = 2;
  const glowMinIntensity = 10 + params.textGlowIntensity * 10;
  const glowMaxIntensity = 20 + params.textGlowIntensity * 20;

  const textGlowEffect: BaseEffect = {
    id: 'text-glow-pulse-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: glowPulseDuration,
      mode: 'provider',
      targetIds: [scrollingTextId],
      ranges: [
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${glowMinIntensity}px rgba(255,255,255,${params.textGlowIntensity * 0.3}))`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${glowMaxIntensity}px rgba(255,255,255,${params.textGlowIntensity * 0.6}))`,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${glowMinIntensity}px rgba(255,255,255,${params.textGlowIntensity * 0.3}))`,
          prog: 1,
        },
      ],
    } as GenericEffectData,
  };

  // Background Image Component
  const backgroundImage: RenderableComponentData = {
    id: backgroundImageId,
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: params.backgroundImage,
      className: 'absolute inset-0 object-cover',
      style: {
        willChange: 'transform',
      },
    } as ImageAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [kenBurnsEffect],
  };

  // Semi-transparent Overlay Layer
  const overlayLayer: RenderableComponentData = {
    id: overlayLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: `rgba(0, 0, 0, ${params.overlayOpacity})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [],
  };

  // Scrolling Text Component
  const scrollingText: RenderableComponentData = {
    id: scrollingTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.scrollingText,
      className: 'whitespace-nowrap',
      style: {
        fontSize: `${params.fontSize}px`,
        color: params.textColor,
        fontWeight: fontStyle.fontWeight || 700,
        fontStyle: fontStyle.fontStyle || 'normal',
        textShadow: '0 2px 10px rgba(0,0,0,0.7), 0 0 20px rgba(255,255,255,0.3)',
        willChange: 'transform',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        subsets: ['latin'],
        display: 'swap',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [textScrollEffect, textGlowEffect],
  };

  // Scrolling Text Container
  const scrollingTextContainer: RenderableComponentData = {
    id: scrollingTextContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-1/2 -translate-y-1/2 w-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [scrollingText],
  };

  // Root Container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [backgroundImage, overlayLayer, scrollingTextContainer],
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
  id: 'CinematicParallaxKenBurns',
  title: 'Cinematic Parallax Scrolling with Ken Burns',
  description:
    'Cinematic parallax scrolling preset featuring a Ken Burns effect (slow zoom and pan) on the background image with continuous horizontal text scrolling at a different speed, creating depth. Includes a semi-transparent overlay for text contrast and subtle text glow. Perfect for documentary-style title sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'cinematic',
    'parallax',
    'scrolling',
    'ken-burns',
    'documentary',
    'title-sequence',
    'text-overlay',
    'background-animation',
    'zoom',
    'pan',
    'glow',
  ],
  dependencies: {},
  defaultInputParams: {
    backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    scrollingText: 'CINEMATIC PARALLAX SCROLLING',
    duration: 10,
    fontSize: 64,
    textColor: '#FFFFFF',
    font: 'Inter:700',
    overlayOpacity: 0.3,
    kenBurnsIntensity: 1.0,
    scrollSpeed: 1.0,
    textGlowIntensity: 0.5,
  },
};

export const CinematicParallaxKenBurnsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
