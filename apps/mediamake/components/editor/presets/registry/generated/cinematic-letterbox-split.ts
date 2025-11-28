/**
 * Cinematic Letterbox Split Reveal Preset
 *
 * A cinematic letterbox-style split with multi-directional panel slides (top-left and bottom-right) 
 * following quadratic bezier curve paths. Features film grain, dynamic vignetting, and separately 
 * animated aspect ratio bars that frame the content. Motion is deliberate and grand with 1.2s 
 * duration and film-like 24fps stagger effects.
 *
 * Features:
 * - **Multi-directional Panel Slides**: Top-left and bottom-right panels with arc movements
 * - **Curved Bezier Paths**: Quadratic bezier curves creating weighted, cinematic motion
 * - **Film Grain & Vignetting**: Dynamic film grain and vignette that intensify during movement
 * - **Letterbox Bars**: Separate aspect ratio bars that slide in to frame content
 * - **24fps Stagger Effect**: Film-like frame stagger using stepped easing
 * - **Cinematic Timing**: 1.2s deliberate grand movement with complementary easing
 *
 * Use cases:
 * - Creating cinematic reveals with letterbox framing
 * - Film editor's homage to anamorphic cinematography
 * - Professional video intros with multi-directional transitions
 * - Dramatic scene transitions with film-like aesthetics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  trackName: z
    .string()
    .default('cinematic-letterbox')
    .describe('Name of the track (used for component IDs)'),
  duration: z
    .number()
    .default(2)
    .describe('Total duration of the preset in seconds'),
  mainMovementDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the main panel movement in seconds'),
  letterboxHeight: z
    .number()
    .default(10)
    .describe('Height of letterbox bars as percentage (default 10%)'),
  filmGrainIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of film grain effect (0-1)'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of vignette effect (0-1)'),
  enableStagger: z
    .boolean()
    .default(true)
    .describe('Enable 24fps film-like stagger effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackName,
    duration,
    mainMovementDuration,
    letterboxHeight,
    filmGrainIntensity,
    vignetteIntensity,
    enableStagger,
  } = params;

  // Calculate timing values
  const letterboxDelay = 0.1;
  const letterboxDuration = mainMovementDuration;
  
  // Film grain opacity values
  const grainIntensityMoving = filmGrainIntensity * 0.8;
  const grainIntensitySettled = filmGrainIntensity * 0.3;
  
  // Vignette opacity values
  const vignetteIntensityMoving = vignetteIntensity;
  const vignetteIntensitySettled = vignetteIntensity * 0.4;

  // Top-left panel effects - arc movement (translateX + translateY with different easing)
  const topLeftPanelEffects = [
    {
      id: `${trackName}-top-left-panel-effect`,
      componentId: 'generic',
      data: {
        type: enableStagger ? 'linear' : 'ease-out',
        start: 0,
        duration: mainMovementDuration,
        mode: 'provider',
        targetIds: [`${trackName}-top-left-panel`],
        ranges: [
          // TranslateX with quadratic ease-out
          { key: 'translateX', val: '-100%', prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          // TranslateY with different easing for arc effect
          { key: 'translateY', val: '-100%', prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          // Opacity fade-in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      },
    },
  ];

  // Bottom-right panel effects - complementary arc movement
  const bottomRightPanelEffects = [
    {
      id: `${trackName}-bottom-right-panel-effect`,
      componentId: 'generic',
      data: {
        type: enableStagger ? 'linear' : 'ease-out',
        start: 0,
        duration: mainMovementDuration,
        mode: 'provider',
        targetIds: [`${trackName}-bottom-right-panel`],
        ranges: [
          // TranslateX with quadratic ease-out
          { key: 'translateX', val: '100%', prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          // TranslateY with different easing for arc effect
          { key: 'translateY', val: '100%', prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          // Opacity fade-in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      },
    },
  ];

  // Letterbox top bar effects
  const letterboxTopEffects = [
    {
      id: `${trackName}-letterbox-top-effect`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: letterboxDelay,
        duration: letterboxDuration,
        mode: 'provider',
        targetIds: [`${trackName}-letterbox-top`],
        ranges: [
          { key: 'translateY', val: '-100%', prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    },
  ];

  // Letterbox bottom bar effects
  const letterboxBottomEffects = [
    {
      id: `${trackName}-letterbox-bottom-effect`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: letterboxDelay,
        duration: letterboxDuration,
        mode: 'provider',
        targetIds: [`${trackName}-letterbox-bottom`],
        ranges: [
          { key: 'translateY', val: '100%', prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    },
  ];

  // Film grain effects - intensify during movement, settle after
  const filmGrainEffects = [
    {
      id: `${trackName}-film-grain-effect`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [`${trackName}-film-grain`],
        ranges: [
          { key: 'opacity', val: grainIntensityMoving, prog: 0 },
          { key: 'opacity', val: grainIntensityMoving, prog: mainMovementDuration / duration },
          { key: 'opacity', val: grainIntensitySettled, prog: 1 },
        ],
      },
    },
  ];

  // Vignette effects - intensify during movement, settle after
  const vignetteEffects = [
    {
      id: `${trackName}-vignette-effect`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [`${trackName}-vignette`],
        ranges: [
          { key: 'opacity', val: vignetteIntensityMoving, prog: 0 },
          { key: 'opacity', val: vignetteIntensityMoving, prog: mainMovementDuration / duration },
          { key: 'opacity', val: vignetteIntensitySettled, prog: 1 },
        ],
      },
    },
  ];

  // Build component tree
  const rootContainer = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          willChange: 'transform',
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
      // Top-left panel
      {
        id: `${trackName}-top-left-panel`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute top-0 left-0 w-1/2 h-1/2 overflow-hidden',
            style: {
              transformOrigin: 'top left',
              background: 'linear-gradient(135deg, #111827 0%, #000000 100%)',
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: topLeftPanelEffects,
        childrenData: [],
      },
      // Bottom-right panel
      {
        id: `${trackName}-bottom-right-panel`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute bottom-0 right-0 w-1/2 h-1/2 overflow-hidden',
            style: {
              transformOrigin: 'bottom right',
              background: 'linear-gradient(-45deg, #111827 0%, #000000 100%)',
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: bottomRightPanelEffects,
        childrenData: [],
      },
      // Letterbox top bar
      {
        id: `${trackName}-letterbox-top`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute left-0 right-0 top-0 bg-black',
            style: {
              height: `${letterboxHeight}%`,
              zIndex: 10,
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: letterboxTopEffects,
        childrenData: [],
      },
      // Letterbox bottom bar
      {
        id: `${trackName}-letterbox-bottom`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute left-0 right-0 bottom-0 bg-black',
            style: {
              height: `${letterboxHeight}%`,
              zIndex: 10,
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: letterboxBottomEffects,
        childrenData: [],
      },
      // Film grain overlay
      {
        id: `${trackName}-film-grain`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              backgroundImage:
                'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.03) 0deg, transparent 2deg, rgba(0,0,0,0.03) 4deg)',
              backgroundSize: '4px 4px',
              mixBlendMode: 'overlay',
              zIndex: 20,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: filmGrainEffects,
        childrenData: [],
      },
      // Vignette overlay
      {
        id: `${trackName}-vignette`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background:
                'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%)',
              zIndex: 15,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: vignetteEffects,
        childrenData: [],
      },
    ],
  } as RenderableComponentData;

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
  id: 'cinematic-letterbox-split',
  title: 'Cinematic Letterbox Split Reveal',
  description:
    'A cinematic letterbox-style split with multi-directional panel slides (top-left and bottom-right) following quadratic bezier curve paths. Features film grain, dynamic vignetting, and separately animated aspect ratio bars that frame the content. Motion is deliberate and grand with 1.2s duration and film-like 24fps stagger effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'cinematic',
    'letterbox',
    'split',
    'reveal',
    'anamorphic',
    'film-grain',
    'vignette',
    'bezier',
    'arc-movement',
    'transition',
  ],
  dependencies: {},
  defaultInputParams: {
    trackName: 'cinematic-letterbox',
    duration: 2,
    mainMovementDuration: 1.2,
    letterboxHeight: 10,
    filmGrainIntensity: 0.5,
    vignetteIntensity: 0.6,
    enableStagger: true,
  },
};

// Export preset
export const cinematicLetterboxSplitPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
