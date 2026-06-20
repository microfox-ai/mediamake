/**
 * Vintage Film Reel Parallax Preset
 *
 * Creates a vintage film reel aesthetic with multi-layer parallax depth effect:
 * - Background image moves slowly (translateX 0% to -10% over 10s)
 * - Midground semi-transparent overlay moves faster (translateX 0% to -20% over 7s)
 * - Text scrolls fastest (translateX 100% to -100% over 5s)
 * - Film grain, vignette, and sepia tone filters for authentic vintage look
 * - Subtle flicker effects simulate old projector inconsistencies
 *
 * Features:
 * - Multi-layer parallax effect with different pan speeds
 * - Scrolling movie credits style text
 * - Film grain overlay with animated texture
 * - Radial vignette effect
 * - Sepia tone and contrast filters
 * - Flicker effects on all layers for projector simulation
 * - Z-index layering (background z-0, midground z-10, vignette z-20, text z-30)
 *
 * Use cases:
 * - Retro film opening sequences
 * - Vintage movie credits
 * - Nostalgic video intros
 * - Classic cinema aesthetic overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  ImageAtomData,
  TextAtomData,
  GenericEffectData,
  HTMLBlockAtomData,
} from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  backgroundImage: z.string().describe('URL or path for the background image layer (slow pan)'),
  midgroundImage: z.string().describe('URL or path for the midground overlay image (medium pan)'),
  creditsText: z.string().default('A CLASSIC PRODUCTION').describe('Text for scrolling movie credits'),
  duration: z.number().default(10).describe('Total duration of the composition in seconds'),
  textDuration: z.number().default(5).describe('Duration for text scroll animation in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const totalDuration = params.duration;
  const textDuration = params.textDuration;

  // Background layer with slow pan and flicker
  const backgroundLayer: RenderableComponentData = {
    id: 'vintage-background-layer',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: params.backgroundImage,
      className: 'absolute inset-0 z-0 opacity-60 object-cover',
      style: {
        filter: 'sepia(0.6) contrast(1.1)',
      },
    } as ImageAtomData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Slow pan effect
      {
        id: 'vintage-background-pan',
        componentId: 'generic',
        data: {
          type: 'ease-linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['vintage-background-layer'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0, unit: '%' },
            { key: 'translateX', val: -10, prog: 1, unit: '%' },
          ],
        } as GenericEffectData,
      },
      // Flicker effect for background
      {
        id: 'vintage-background-flicker',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['vintage-background-layer'],
          ranges: [
            { key: 'opacity', val: 0.58, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.15 },
            { key: 'opacity', val: 0.57, prog: 0.3 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0.59, prog: 0.7 },
            { key: 'opacity', val: 0.6, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Midground layer with medium pan and flicker
  const midgroundLayer: RenderableComponentData = {
    id: 'vintage-midground-layer',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: params.midgroundImage,
      className: 'absolute inset-0 z-10 opacity-40 object-cover',
      style: {
        filter: 'sepia(0.5)',
        mixBlendMode: 'overlay',
      },
    } as ImageAtomData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Medium speed pan effect
      {
        id: 'vintage-midground-pan',
        componentId: 'generic',
        data: {
          type: 'ease-linear',
          start: 0,
          duration: 7,
          mode: 'provider',
          targetIds: ['vintage-midground-layer'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0, unit: '%' },
            { key: 'translateX', val: -20, prog: 1, unit: '%' },
          ],
        } as GenericEffectData,
      },
      // Flicker effect for midground
      {
        id: 'vintage-midground-flicker',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 7,
          mode: 'provider',
          targetIds: ['vintage-midground-layer'],
          ranges: [
            { key: 'opacity', val: 0.38, prog: 0 },
            { key: 'opacity', val: 0.4, prog: 0.2 },
            { key: 'opacity', val: 0.37, prog: 0.45 },
            { key: 'opacity', val: 0.4, prog: 0.65 },
            { key: 'opacity', val: 0.39, prog: 0.85 },
            { key: 'opacity', val: 0.4, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Vignette overlay layer
  const vignetteLayer: RenderableComponentData = {
    id: 'vintage-vignette-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-20',
        style: {
          background: 'radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(0, 0, 0, 0.5) 100%)',
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
  };

  // Film grain overlay using SVG noise
  const grainOverlay: RenderableComponentData = {
    id: 'vintage-grain-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background-image: url(\'data:image/svg+xml,%3Csvg viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cfilter id=\\"noise\\"%3E%3CfeTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.9\\" numOctaves=\\"3\\" stitchTiles=\\"stitch\\"/%3E%3C/filter%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" filter=\\"url(%23noise)\\" opacity=\\"0.15\\"/%3E%3C/svg%3E\'); background-repeat: repeat;"></div>',
      className: 'absolute inset-0 z-25 pointer-events-none',
      style: {
        mixBlendMode: 'overlay',
        opacity: 0.15,
      },
    } as HTMLBlockAtomData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Grain flicker effect
      {
        id: 'vintage-grain-flicker',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['vintage-grain-overlay'],
          ranges: [
            { key: 'opacity', val: 0.12, prog: 0 },
            { key: 'opacity', val: 0.15, prog: 0.1 },
            { key: 'opacity', val: 0.13, prog: 0.25 },
            { key: 'opacity', val: 0.15, prog: 0.4 },
            { key: 'opacity', val: 0.14, prog: 0.6 },
            { key: 'opacity', val: 0.15, prog: 0.8 },
            { key: 'opacity', val: 0.13, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Scrolling credits text
  const textLayer: RenderableComponentData = {
    id: 'vintage-text-layer',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.creditsText,
      className: 'absolute bottom-10 z-30 text-amber-100 text-3xl whitespace-nowrap',
      style: {
        fontFamily: 'Georgia, serif',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        letterSpacing: '0.05em',
      },
      font: {
        family: 'Playfair Display',
        weights: ['400', '700'],
        subsets: ['latin'],
        display: 'swap',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Fast scroll effect (right to left)
      {
        id: 'vintage-text-scroll',
        componentId: 'generic',
        data: {
          type: 'ease-linear',
          start: 0,
          duration: textDuration,
          mode: 'provider',
          targetIds: ['vintage-text-layer'],
          ranges: [
            { key: 'translateX', val: 100, prog: 0, unit: '%' },
            { key: 'translateX', val: -100, prog: 1, unit: '%' },
          ],
        } as GenericEffectData,
      },
      // Text flicker effect
      {
        id: 'vintage-text-flicker',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: textDuration,
          mode: 'provider',
          targetIds: ['vintage-text-layer'],
          ranges: [
            { key: 'opacity', val: 0.9, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.12 },
            { key: 'opacity', val: 0.95, prog: 0.28 },
            { key: 'opacity', val: 1, prog: 0.45 },
            { key: 'opacity', val: 0.92, prog: 0.62 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0.95, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Root container with all layers
  const rootContainer: RenderableComponentData = {
    id: 'vintage-film-parallax-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      backgroundLayer,
      midgroundLayer,
      vignetteLayer,
      grainOverlay,
      textLayer,
    ] as RenderableComponentData[],
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
  id: 'vintage-film-parallax',
  title: 'Vintage Film Reel Parallax',
  description: 'A vintage film reel style preset featuring multi-layer parallax depth effect with scrolling movie credits. Background image moves slowly (translateX 0% to -10%), midground semi-transparent overlay moves at medium speed (translateX 0% to -20%), and text scrolls fastest (translateX 100% to -100%). Includes film grain, vignette, sepia tone, and subtle flicker effects to simulate old projector aesthetics. Perfect for retro film openings and nostalgic video intros.',
  type: 'predefined',
  presetType: 'children',
  tags: ['vintage', 'film', 'parallax', 'credits', 'retro', 'cinema', 'movie', 'reel', 'sepia', 'grain', 'vignette', 'scroll', 'typography'],
  dependencies: {},
  defaultInputParams: {
    backgroundImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920',
    midgroundImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1920',
    creditsText: 'A CLASSIC PRODUCTION',
    duration: 10,
    textDuration: 5,
  },
};

// Export preset
export const vintageFilmParallaxPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
