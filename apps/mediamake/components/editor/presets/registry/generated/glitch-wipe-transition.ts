/**
 * Glitch Wipe Transition Preset
 *
 * A cyberpunk-style glitch wipe transition featuring stuttering digital distortion patterns,
 * RGB color channel splitting effects, and scanline overlays. The wipe moves in segments with
 * random pauses, speed changes, and occasional backwards movements to simulate digital interference.
 *
 * Features:
 * - Complex stuttering wipe animation with multiple keyframe segments
 * - RGB channel splitting at the wipe edge (chromatic aberration)
 * - Dynamic hue-rotate and saturation filters during glitch moments
 * - Scanline overlay for retro digital aesthetic
 * - Synchronized foreground image reveal using clipPath
 * - Configurable wipe color and transition duration
 *
 * Use cases:
 * - Tech and gaming content transitions
 * - Cyberpunk and futuristic aesthetics
 * - Digital glitch effects between scenes
 * - Music videos with electronic/EDM themes
 * - Social media content with modern tech vibes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// Parameters Schema
// ============================================================================

const presetParams = z.object({
  backgroundImageSrc: z
    .string()
    .describe('Source URL or path for the background image'),
  foregroundImageSrc: z
    .string()
    .describe('Source URL or path for the foreground image to reveal'),
  wipeColor: z
    .string()
    .default('#00ffff')
    .describe('Color of the main glitch wipe (hex or CSS color)'),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Total duration of the transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// Preset Execution
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { backgroundImageSrc, foregroundImageSrc, wipeColor, transitionDuration } = params;

  // Create the main container
  const childrenData: RenderableComponentData[] = [
    // Background image (always visible)
    {
      id: 'glitch-wipe-background',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: backgroundImageSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Foreground image (revealed by wipe)
    {
      id: 'glitch-wipe-foreground',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: foregroundImageSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          clipPath: 'inset(0 100% 0 0)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'foreground-clip-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-wipe-foreground'],
            ranges: [
              { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
              { key: 'clipPath', val: 'inset(0 90% 0 0)', prog: 0.15 },
              { key: 'clipPath', val: 'inset(0 92% 0 0)', prog: 0.18 },
              { key: 'clipPath', val: 'inset(0 92% 0 0)', prog: 0.25 },
              { key: 'clipPath', val: 'inset(0 65% 0 0)', prog: 0.4 },
              { key: 'clipPath', val: 'inset(0 70% 0 0)', prog: 0.43 },
              { key: 'clipPath', val: 'inset(0 70% 0 0)', prog: 0.5 },
              { key: 'clipPath', val: 'inset(0 35% 0 0)', prog: 0.65 },
              { key: 'clipPath', val: 'inset(0 37% 0 0)', prog: 0.68 },
              { key: 'clipPath', val: 'inset(0 10% 0 0)', prog: 0.85 },
              { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Main wipe div (colored overlay moving across)
    {
      id: 'glitch-wipe-main',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-y-0 w-full mix-blend-screen pointer-events-none',
          style: {
            backgroundColor: wipeColor,
            transform: 'translateX(-100%)',
            filter: 'hue-rotate(0deg) saturate(1)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'main-wipe-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-wipe-main'],
            ranges: [
              // TranslateX animation (stuttering movement)
              { key: 'translateX', val: -100, prog: 0, unit: '%' },
              { key: 'translateX', val: 10, prog: 0.15, unit: '%' },
              { key: 'translateX', val: 8, prog: 0.18, unit: '%' },
              { key: 'translateX', val: 8, prog: 0.25, unit: '%' },
              { key: 'translateX', val: 35, prog: 0.4, unit: '%' },
              { key: 'translateX', val: 30, prog: 0.43, unit: '%' },
              { key: 'translateX', val: 30, prog: 0.5, unit: '%' },
              { key: 'translateX', val: 65, prog: 0.65, unit: '%' },
              { key: 'translateX', val: 63, prog: 0.68, unit: '%' },
              { key: 'translateX', val: 90, prog: 0.85, unit: '%' },
              { key: 'translateX', val: 100, prog: 1, unit: '%' },
              // Filter animation (color distortion during glitches)
              { key: 'filter', val: 'hue-rotate(0deg) saturate(1)', prog: 0 },
              { key: 'filter', val: 'hue-rotate(180deg) saturate(2)', prog: 0.25 },
              { key: 'filter', val: 'hue-rotate(90deg) saturate(1.5)', prog: 0.5 },
              { key: 'filter', val: 'hue-rotate(270deg) saturate(2)', prog: 0.75 },
              { key: 'filter', val: 'hue-rotate(0deg) saturate(1)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // RGB Split - Red Channel
    {
      id: 'glitch-rgb-red',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-y-0 w-full mix-blend-screen pointer-events-none',
          style: {
            backgroundColor: '#ff0000',
            transform: 'translateX(-100%)',
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rgb-red-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-rgb-red'],
            ranges: [
              // TranslateX (slightly offset from main wipe)
              { key: 'translateX', val: -100, prog: 0, unit: '%' },
              { key: 'translateX', val: 12, prog: 0.15, unit: '%' },
              { key: 'translateX', val: 10, prog: 0.18, unit: '%' },
              { key: 'translateX', val: 10, prog: 0.25, unit: '%' },
              { key: 'translateX', val: 100, prog: 0.35, unit: '%' },
              // Opacity (fade in during early glitch phase)
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.12 },
              { key: 'opacity', val: 0, prog: 0.35 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // RGB Split - Green Channel
    {
      id: 'glitch-rgb-green',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-y-0 w-full mix-blend-screen pointer-events-none',
          style: {
            backgroundColor: '#00ff00',
            transform: 'translateX(-100%)',
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rgb-green-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-rgb-green'],
            ranges: [
              // TranslateX (slightly different offset)
              { key: 'translateX', val: -100, prog: 0, unit: '%' },
              { key: 'translateX', val: 11, prog: 0.15, unit: '%' },
              { key: 'translateX', val: 9, prog: 0.18, unit: '%' },
              { key: 'translateX', val: 9, prog: 0.25, unit: '%' },
              { key: 'translateX', val: 100, prog: 0.35, unit: '%' },
              // Opacity
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.12 },
              { key: 'opacity', val: 0, prog: 0.35 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // RGB Split - Blue Channel
    {
      id: 'glitch-rgb-blue',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-y-0 w-full mix-blend-screen pointer-events-none',
          style: {
            backgroundColor: '#0000ff',
            transform: 'translateX(-100%)',
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rgb-blue-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-rgb-blue'],
            ranges: [
              // TranslateX (most offset from main wipe)
              { key: 'translateX', val: -100, prog: 0, unit: '%' },
              { key: 'translateX', val: 8, prog: 0.15, unit: '%' },
              { key: 'translateX', val: 6, prog: 0.18, unit: '%' },
              { key: 'translateX', val: 6, prog: 0.25, unit: '%' },
              { key: 'translateX', val: 100, prog: 0.35, unit: '%' },
              // Opacity
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.12 },
              { key: 'opacity', val: 0, prog: 0.35 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Scanline overlay
    {
      id: 'glitch-scanlines',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, transparent 2px, transparent 4px); pointer-events: none;"></div>',
        className: 'absolute inset-0 mix-blend-overlay pointer-events-none',
        style: {
          opacity: 0.3,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-wipe-transition-root',
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
        duration: transitionDuration,
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

// ============================================================================
// Preset Metadata
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'glitch-wipe-transition',
  title: 'Glitch Wipe Transition',
  description:
    'A cyberpunk-style glitch wipe transition with RGB channel splitting, stuttering movements, digital distortion patterns, and scanline overlays. Features complex keyframe animations with random pauses, speed changes, and direction reversals to simulate digital interference. Perfect for tech, gaming, or futuristic content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'wipe',
    'cyberpunk',
    'tech',
    'gaming',
    'rgb-split',
    'chromatic-aberration',
    'scanline',
    'digital',
    'futuristic',
  ],
  defaultInputParams: {
    backgroundImageSrc: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&h=1080&fit=crop',
    foregroundImageSrc: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&h=1080&fit=crop',
    wipeColor: '#00ffff',
    transitionDuration: 2.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// Export
// ============================================================================

export const glitchWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
