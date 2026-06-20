/**
 * Cinematic Depth Breathing Animation Preset
 *
 * This preset creates a multi-layer cinematic breathing animation that simulates camera focus breathing
 * (the slight zoom that occurs when changing focus in cinematography). Instead of simple scaling, it creates
 * a depth-based effect where foreground, main content, and background layers breathe at different intensities,
 * creating dimension and a rack focus illusion.
 *
 * Features:
 * - **Multi-Layer Depth Structure**: Background (z-0), main content (z-10), foreground accents (z-20)
 * - **Differential Breathing Rates**: Background subtle (100-102%), main dramatic (100-112%), foreground inverse (102-98%)
 * - **Depth of Field Simulation**: Background blur animation (2px-4px-2px) for cinematic focus effect
 * - **3D Perspective Transform**: Uses CSS perspective (1000px) and transform-3d for enhanced dimensionality
 * - **Staggered Timing**: 0.3s offset between layers creates natural rack-focus effect
 * - **Position Shifts**: translateY on main content simulates camera breathing movement
 * - **Performance Optimized**: Uses transform-gpu and backface-hidden classes
 *
 * Use cases:
 * - Creating cinematic depth effects for hero sections
 * - Adding dimension to product showcases
 * - Building immersive visual experiences
 * - Simulating camera focus breathing in static compositions
 * - Creating depth-aware animations for brand videos
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameters Schema ---
const presetParams = z.object({
  backgroundImage: z.string().optional().describe('URL for the background image layer'),
  mainSubjectImage: z.string().describe('URL for the main subject/content image (primary focus element)'),
  duration: z.number().min(1).default(4.3).describe('Total duration of one complete breathing cycle in seconds'),
  backgroundBreathingIntensity: z.number().min(1).max(1.1).default(1.02).describe('Maximum scale for background layer breathing (1.02 = 2% zoom)'),
  mainBreathingIntensity: z.number().min(1).max(1.3).default(1.12).describe('Maximum scale for main content breathing (1.12 = 12% zoom)'),
  foregroundBreathingIntensity: z.number().min(0.9).max(1.1).default(1.02).describe('Starting scale for foreground inverse breathing (1.02 starts at 2% zoom, goes to 0.98)'),
  verticalShift: z.number().min(-20).max(20).default(-5).describe('Vertical translateY shift in pixels for main content at peak breathing'),
  backgroundBlurMin: z.number().min(0).max(10).default(2).describe('Minimum blur for background in pixels (depth of field effect)'),
  backgroundBlurMax: z.number().min(0).max(20).default(4).describe('Maximum blur for background in pixels (depth of field effect)'),
  layerOffset: z.number().min(0).max(1).default(0.3).describe('Time offset in seconds between each layer starting its breathing cycle'),
  showForegroundAccents: z.boolean().default(true).describe('Whether to show decorative foreground accent elements'),
  foregroundAccentColor: z.string().default('rgba(255,255,255,0.3)').describe('Color for foreground accent gradients'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    backgroundImage,
    mainSubjectImage,
    duration,
    backgroundBreathingIntensity,
    mainBreathingIntensity,
    foregroundBreathingIntensity,
    verticalShift,
    backgroundBlurMin,
    backgroundBlurMax,
    layerOffset,
    showForegroundAccents,
    foregroundAccentColor,
  } = params;

  // Calculate inverse breathing for foreground (starts high, goes low, returns high)
  const foregroundMinScale = 2 - foregroundBreathingIntensity; // e.g., 1.02 -> 0.98

  // --- Background Layer Effect ---
  const backgroundBreathingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['background-layer', 'background-image'],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: backgroundBreathingIntensity, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
      { key: 'filter', val: `blur(${backgroundBlurMin}px)`, prog: 0 },
      { key: 'filter', val: `blur(${backgroundBlurMax}px)`, prog: 0.5 },
      { key: 'filter', val: `blur(${backgroundBlurMin}px)`, prog: 1 },
    ],
  };

  // --- Main Content Layer Effect ---
  const mainBreathingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: layerOffset,
    duration: duration,
    mode: 'provider',
    targetIds: ['main-content-layer', 'main-subject'],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: mainBreathingIntensity, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: verticalShift, prog: 0.5 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // --- Foreground Layer Effect (Inverse Breathing) ---
  const foregroundBreathingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: layerOffset * 2,
    duration: duration,
    mode: 'provider',
    targetIds: ['foreground-accent-left', 'foreground-accent-right'],
    ranges: [
      { key: 'scale', val: foregroundBreathingIntensity, prog: 0 },
      { key: 'scale', val: foregroundMinScale, prog: 0.5 },
      { key: 'scale', val: foregroundBreathingIntensity, prog: 1 },
    ],
  };

  // --- Build Component Tree ---

  // Background Image Component
  const backgroundImageComponent: RenderableComponentData = {
    id: 'background-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: backgroundImage || '',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      },
      className: 'transform-gpu',
    },
    context: {
      timing: {
        start: 0,
        duration: duration + layerOffset * 2,
      },
    },
  };

  // Background Layer Container
  const backgroundLayer: RenderableComponentData = {
    id: 'background-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 transform-gpu',
        style: {
          zIndex: 0,
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + layerOffset * 2,
      },
    },
    childrenData: backgroundImage ? [backgroundImageComponent] : [],
  };

  // Main Subject Component
  const mainSubjectComponent: RenderableComponentData = {
    id: 'main-subject',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: mainSubjectImage,
      style: {
        maxWidth: '80%',
        maxHeight: '80%',
        objectFit: 'contain',
      },
      className: 'transform-gpu',
    },
    context: {
      timing: {
        start: 0,
        duration: duration + layerOffset * 2,
      },
    },
  };

  // Main Content Layer Container
  const mainContentLayer: RenderableComponentData = {
    id: 'main-content-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center transform-gpu',
        style: {
          zIndex: 10,
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + layerOffset * 2,
      },
    },
    childrenData: [mainSubjectComponent],
  };

  // Foreground Accent Components
  const foregroundAccentLeft: RenderableComponentData = {
    id: 'foreground-accent-left',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute transform-gpu',
        style: {
          top: '25%',
          left: '2rem',
          width: '6rem',
          height: '6rem',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${foregroundAccentColor} 0%, rgba(255,255,255,0.1) 50%, transparent 70%)`,
          backdropFilter: 'blur(8px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + layerOffset * 2,
      },
    },
    childrenData: [],
  };

  const foregroundAccentRight: RenderableComponentData = {
    id: 'foreground-accent-right',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute transform-gpu',
        style: {
          bottom: '25%',
          right: '2rem',
          width: '8rem',
          height: '8rem',
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 50%, transparent 70%)`,
          backdropFilter: 'blur(6px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + layerOffset * 2,
      },
    },
    childrenData: [],
  };

  // Foreground Layer Container
  const foregroundLayer: RenderableComponentData = {
    id: 'foreground-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none transform-gpu',
        style: {
          zIndex: 20,
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + layerOffset * 2,
      },
    },
    childrenData: showForegroundAccents
      ? [foregroundAccentLeft, foregroundAccentRight]
      : [],
  };

  // Effects Provider Container (invisible, just holds effects)
  const breathingEffectsProvider: RenderableComponentData = {
    id: 'breathing-effects-provider',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 100,
        },
      },
    },
    effects: [
      {
        id: 'background-breathing-effect',
        componentId: 'generic',
        data: backgroundBreathingEffect,
      },
      {
        id: 'main-breathing-effect',
        componentId: 'generic',
        data: mainBreathingEffect,
      },
      ...(showForegroundAccents
        ? [
            {
              id: 'foreground-breathing-effect',
              componentId: 'generic',
              data: foregroundBreathingEffect,
            },
          ]
        : []),
    ],
    context: {
      timing: {
        start: 0,
        duration: duration + layerOffset * 2,
      },
    },
    childrenData: [],
  };

  // Root Container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-depth-breathing-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + layerOffset * 2,
      },
    },
    childrenData: [
      backgroundLayer,
      mainContentLayer,
      foregroundLayer,
      breathingEffectsProvider,
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
  id: 'cinematicDepthBreathing',
  title: 'Cinematic Depth Breathing',
  description:
    'A multi-layer cinematic breathing animation that simulates camera focus breathing with rack focus effects. Features three depth layers (background, main, foreground) that breathe at different intensities - background subtle (100-102%), main dramatic (100-112% with translateY), and foreground inverse (102-98%). Includes depth-of-field blur simulation on background and 3D perspective transforms for enhanced dimensionality. Uses staggered 0.3s layer offsets for natural depth perception.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'cinematic',
    'depth',
    'breathing',
    'rack-focus',
    '3d',
    'perspective',
    'multi-layer',
    'focus',
    'animation',
    'visual-effects',
  ],
  dependencies: {},
  defaultInputParams: {
    mainSubjectImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
    backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926',
    duration: 4.3,
    backgroundBreathingIntensity: 1.02,
    mainBreathingIntensity: 1.12,
    foregroundBreathingIntensity: 1.02,
    verticalShift: -5,
    backgroundBlurMin: 2,
    backgroundBlurMax: 4,
    layerOffset: 0.3,
    showForegroundAccents: true,
    foregroundAccentColor: 'rgba(255,255,255,0.3)',
  },
};

// --- Export Preset ---
export const cinematicDepthBreathingPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
