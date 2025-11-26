/**
 * Vertical Scroll Parallax Preset
 *
 * Modern editorial-style vertical scroll parallax inspired by cinematic video transitions.
 * Simulates a camera crane shot with multiple layers scrolling upward at different speeds,
 * creating immersive depth and dynamic movement.
 *
 * Features:
 * - **4+ Layered Images**: Background, midground, foreground, and accent layers moving at staggered speeds
 * - **Parallax Animation**: translateY effects with different percentages (-10%, -20%, -40%, -50%)
 * - **Ken Burns Effect**: Scale transforms (1.0 → 1.15/1.2/1.25) on static images for cinematic motion
 * - **Subtle Rotation**: 1-3 degree rotation on some layers for dynamic movement
 * - **Gradient Overlays**: Top and bottom gradients for depth separation and cinematic vignetting
 * - **Text Overlays**: Headline and subheadline with timed fade-in/fade-out at specific scroll positions
 * - **Continuous Animation**: Smooth parallax motion with normalized progress (0-1)
 *
 * Use cases:
 * - Creating cinematic video intros with editorial-style transitions
 * - Building immersive parallax scrolling effects
 * - Adding depth and motion to static image compositions
 * - Modern web-inspired video storytelling with layered motion
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with all required fields documented
const presetParams = z.object({
  backgroundImage: z.string().describe('Background layer image URL (slowest movement)'),
  midgroundImage: z.string().describe('Midground layer image URL (medium movement)'),
  foregroundImage: z.string().describe('Foreground layer image URL (faster movement)'),
  accentImage: z.string().describe('Accent layer image URL (fastest movement, with blend mode)'),
  headlineText: z.string().default('').describe('Main headline text overlay (optional)'),
  subheadlineText: z.string().default('').describe('Subheadline text overlay (optional)'),
  duration: z.number().default(10).describe('Total animation duration in seconds'),
  backgroundTranslateY: z.number().default(-10).describe('Background layer vertical translation percentage (default: -10%)'),
  midgroundTranslateY: z.number().default(-20).describe('Midground layer vertical translation percentage (default: -20%)'),
  foregroundTranslateY: z.number().default(-40).describe('Foreground layer vertical translation percentage (default: -40%)'),
  accentTranslateY: z.number().default(-50).describe('Accent layer vertical translation percentage (default: -50%)'),
  backgroundScale: z.number().default(1.15).describe('Background layer Ken Burns scale factor (default: 1.15)'),
  midgroundScale: z.number().default(1.2).describe('Midground layer Ken Burns scale factor (default: 1.2)'),
  foregroundScale: z.number().default(1.25).describe('Foreground layer Ken Burns scale factor (default: 1.25)'),
  accentScale: z.number().default(1.2).describe('Accent layer Ken Burns scale factor (default: 1.2)'),
  midgroundRotation: z.number().default(2).describe('Midground layer rotation in degrees (default: 2)'),
  foregroundRotation: z.number().default(-1.5).describe('Foreground layer rotation in degrees (default: -1.5)'),
  textFadeInStart: z.number().default(0).describe('Text fade-in start progress (0-1, default: 0)'),
  textFadeInEnd: z.number().default(0.15).describe('Text fade-in end progress (0-1, default: 0.15)'),
  textFadeOutStart: z.number().default(0.85).describe('Text fade-out start progress (0-1, default: 0.85)'),
  textFadeOutEnd: z.number().default(1).describe('Text fade-out end progress (0-1, default: 1)'),
  subheadlineFadeInStart: z.number().default(0.2).describe('Subheadline fade-in start progress (0-1, default: 0.2)'),
  subheadlineFadeInEnd: z.number().default(0.35).describe('Subheadline fade-in end progress (0-1, default: 0.35)'),
  subheadlineFadeOutStart: z.number().default(0.8).describe('Subheadline fade-out start progress (0-1, default: 0.8)'),
  subheadlineFadeOutEnd: z.number().default(0.95).describe('Subheadline fade-out end progress (0-1, default: 0.95)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    backgroundImage,
    midgroundImage,
    foregroundImage,
    accentImage,
    headlineText,
    subheadlineText,
    duration,
    backgroundTranslateY,
    midgroundTranslateY,
    foregroundTranslateY,
    accentTranslateY,
    backgroundScale,
    midgroundScale,
    foregroundScale,
    accentScale,
    midgroundRotation,
    foregroundRotation,
    textFadeInStart,
    textFadeInEnd,
    textFadeOutStart,
    textFadeOutEnd,
    subheadlineFadeInStart,
    subheadlineFadeInEnd,
    subheadlineFadeOutStart,
    subheadlineFadeOutEnd,
  } = params;

  // Background layer with slowest parallax and Ken Burns effect
  const backgroundLayer: RenderableComponentData = {
    id: 'vsp-background-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-[1]',
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
        id: 'vsp-background-parallax-effect',
        componentId: 'vsp-background-layer',
        data: {
          type: 'generic',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['vsp-background-media'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: `${backgroundTranslateY}%`, prog: 1 },
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: backgroundScale, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'vsp-background-media',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: backgroundImage,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
    ],
  };

  // Midground layer with medium parallax, Ken Burns, and subtle rotation
  const midgroundLayer: RenderableComponentData = {
    id: 'vsp-midground-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-[2]',
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
        id: 'vsp-midground-parallax-effect',
        componentId: 'vsp-midground-layer',
        data: {
          type: 'generic',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['vsp-midground-media'],
          ranges: [
            { key: 'translateY', val: '5%', prog: 0 },
            { key: 'translateY', val: `${midgroundTranslateY}%`, prog: 1 },
            { key: 'scale', val: 1.05, prog: 0 },
            { key: 'scale', val: midgroundScale, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: midgroundRotation, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'vsp-midground-media',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: midgroundImage,
          fit: 'cover',
          className: 'w-full h-full object-cover opacity-90',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
    ],
  };

  // Foreground layer with faster parallax, Ken Burns, and rotation
  const foregroundLayer: RenderableComponentData = {
    id: 'vsp-foreground-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-[3]',
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
        id: 'vsp-foreground-parallax-effect',
        componentId: 'vsp-foreground-layer',
        data: {
          type: 'generic',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['vsp-foreground-media'],
          ranges: [
            { key: 'translateY', val: '10%', prog: 0 },
            { key: 'translateY', val: `${foregroundTranslateY}%`, prog: 1 },
            { key: 'scale', val: 1.1, prog: 0 },
            { key: 'scale', val: foregroundScale, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: foregroundRotation, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'vsp-foreground-media',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: foregroundImage,
          fit: 'cover',
          className: 'w-full h-full object-cover opacity-85',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
    ],
  };

  // Accent layer with fastest parallax and opacity pulse
  const accentLayer: RenderableComponentData = {
    id: 'vsp-accent-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-[4] pointer-events-none',
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
        id: 'vsp-accent-parallax-effect',
        componentId: 'vsp-accent-layer',
        data: {
          type: 'generic',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['vsp-accent-media'],
          ranges: [
            { key: 'translateY', val: '15%', prog: 0 },
            { key: 'translateY', val: `${accentTranslateY}%`, prog: 1 },
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: accentScale, prog: 1 },
            { key: 'opacity', val: 0.75, prog: 0 },
            { key: 'opacity', val: 0.9, prog: 0.5 },
            { key: 'opacity', val: 0.75, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'vsp-accent-media',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: accentImage,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
    ],
  };

  // Gradient overlays for depth separation
  const gradientOverlayTop: RenderableComponentData = {
    id: 'vsp-gradient-overlay-top',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/40 via-black/20 to-transparent pointer-events-none z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  const gradientOverlayBottom: RenderableComponentData = {
    id: 'vsp-gradient-overlay-bottom',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // Text overlay container with headline and subheadline
  const textChildren: RenderableComponentData[] = [];

  if (headlineText) {
    textChildren.push({
      id: 'vsp-headline-text',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: headlineText,
        className: 'text-white text-4xl font-bold text-center mb-4 drop-shadow-lg',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'vsp-headline-fade-effect',
          componentId: 'vsp-headline-text',
          data: {
            type: 'generic',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['vsp-headline-text'],
            ranges: [
              { key: 'opacity', val: 0, prog: textFadeInStart },
              { key: 'opacity', val: 1, prog: textFadeInEnd },
              { key: 'opacity', val: 1, prog: textFadeOutStart },
              { key: 'opacity', val: 0, prog: textFadeOutEnd },
              { key: 'translateY', val: '20px', prog: textFadeInStart },
              { key: 'translateY', val: '0px', prog: textFadeInEnd },
              { key: 'translateY', val: '0px', prog: textFadeOutStart },
              { key: 'translateY', val: '-20px', prog: textFadeOutEnd },
            ],
          },
        },
      ],
    });
  }

  if (subheadlineText) {
    textChildren.push({
      id: 'vsp-subheadline-text',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: subheadlineText,
        className: 'text-white/80 text-xl font-medium text-center drop-shadow-md',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'vsp-subheadline-fade-effect',
          componentId: 'vsp-subheadline-text',
          data: {
            type: 'generic',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['vsp-subheadline-text'],
            ranges: [
              { key: 'opacity', val: 0, prog: subheadlineFadeInStart },
              { key: 'opacity', val: 1, prog: subheadlineFadeInEnd },
              { key: 'opacity', val: 1, prog: subheadlineFadeOutStart },
              { key: 'opacity', val: 0, prog: subheadlineFadeOutEnd },
              { key: 'translateY', val: '20px', prog: subheadlineFadeInStart },
              { key: 'translateY', val: '0px', prog: subheadlineFadeInEnd },
              { key: 'translateY', val: '0px', prog: subheadlineFadeOutStart },
              { key: 'translateY', val: '-20px', prog: subheadlineFadeOutEnd },
            ],
          },
        },
      ],
    });
  }

  const textOverlayContainer: RenderableComponentData = {
    id: 'vsp-text-overlay-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col justify-end items-center pb-20 px-8 pointer-events-none z-20',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: textChildren,
  };

  // Root container with all layers
  const rootContainer: RenderableComponentData = {
    id: 'vsp-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col relative h-screen w-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      backgroundLayer,
      midgroundLayer,
      foregroundLayer,
      accentLayer,
      gradientOverlayTop,
      gradientOverlayBottom,
      textOverlayContainer,
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

const presetMetadata: PresetMetadata = {
  id: 'verticalScrollParallax',
  title: 'Vertical Scroll Parallax',
  description: 'Modern editorial-style vertical scroll parallax preset with 4+ layered images moving at different speeds simulating a camera crane shot. Features Ken Burns scale effects, subtle rotation dynamics, gradient depth overlays, and timed text reveals. Inspired by contemporary video editing transitions with staggered translateY animations creating immersive depth.',
  type: 'predefined',
  presetType: 'children',
  tags: ['parallax', 'vertical', 'scroll', 'editorial', 'crane-shot', 'ken-burns', 'layered', 'depth', 'cinematic', 'modern', 'gradient', 'text-overlay'],
  defaultInputParams: {
    backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    midgroundImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    foregroundImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=1080&fit=crop',
    accentImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop',
    headlineText: 'Discover the Journey',
    subheadlineText: 'Where Every Moment Tells a Story',
    duration: 10,
    backgroundTranslateY: -10,
    midgroundTranslateY: -20,
    foregroundTranslateY: -40,
    accentTranslateY: -50,
    backgroundScale: 1.15,
    midgroundScale: 1.2,
    foregroundScale: 1.25,
    accentScale: 1.2,
    midgroundRotation: 2,
    foregroundRotation: -1.5,
    textFadeInStart: 0,
    textFadeInEnd: 0.15,
    textFadeOutStart: 0.85,
    textFadeOutEnd: 1,
    subheadlineFadeInStart: 0.2,
    subheadlineFadeInEnd: 0.35,
    subheadlineFadeOutStart: 0.8,
    subheadlineFadeOutEnd: 0.95,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const verticalScrollParallaxPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
