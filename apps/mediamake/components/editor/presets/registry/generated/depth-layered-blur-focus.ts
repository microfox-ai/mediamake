/**
 * Depth Layered Blur-In Focus Preset
 *
 * A three-dimensional focus pull effect where text exists at multiple focal distances.
 * Words start at varying blur levels based on z-depth and converge into unified focus on the beat.
 * Features parallax motion with closer elements moving faster, atmospheric haze that clears as focus
 * sharpens, and the sensation of focusing through multiple glass panes that align on the beat.
 *
 * Features:
 * - **Multiple Focal Planes**: Three depth layers (near, mid, far) with different blur levels
 * - **Parallax Motion**: Closer elements move faster than distant ones during focus
 * - **Atmospheric Haze**: Gradient overlay that clears as focus sharpens
 * - **Beat Synchronization**: Focus pulls complete on audio beats
 * - **3D Perspective**: Uses CSS perspective and translateZ for depth effect
 * - **Performance Optimized**: Uses transform-gpu and will-change for smooth animations
 *
 * Use cases:
 * - Creating cinematic text reveals with depth
 * - Building focus-pull effects synchronized to music beats
 * - Adding dimensional typography to videos
 * - Creating split-diopter style text effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  words: z
    .array(z.string())
    .length(3)
    .describe(
      'Array of exactly 3 words/phrases to display on near, mid, and far focal planes',
    ),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the focus pull effect in seconds'),
  audioSrc: z
    .string()
    .optional()
    .describe(
      'Optional audio source URL for beat synchronization (if not provided, uses timing-based animation)',
    ),
  focusStagger: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe(
      'Time offset between each focal plane coming into focus (0-1, where 0.2 = 20% of duration)',
    ),
  parallaxIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity of parallax motion effect (1 = normal, 2 = double)'),
  hazeIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of atmospheric haze overlay (0 = no haze, 1 = maximum)'),
  initialBlurNear: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Initial blur amount for near focal plane in pixels'),
  initialBlurMid: z
    .number()
    .min(5)
    .max(30)
    .default(20)
    .describe('Initial blur amount for mid focal plane in pixels'),
  initialBlurFar: z
    .number()
    .min(5)
    .max(30)
    .default(30)
    .describe('Initial blur amount for far focal plane in pixels'),
  font: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color for all focal planes'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    duration,
    focusStagger,
    parallaxIntensity,
    hazeIntensity,
    initialBlurNear,
    initialBlurMid,
    initialBlurFar,
    font,
    textColor,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
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

  // Calculate timing offsets for each focal plane
  const staggerTime = duration * focusStagger;
  const nearStart = 0;
  const midStart = staggerTime;
  const farStart = staggerTime * 2;

  // Calculate effect durations (each plane focuses over remaining time)
  const nearDuration = duration - nearStart;
  const midDuration = duration - midStart;
  const farDuration = duration - farStart;

  // Calculate translateZ values for depth (closer = positive Z, farther = negative Z)
  const nearZ = 100 * parallaxIntensity;
  const midZ = 0;
  const farZ = -100 * parallaxIntensity;

  // Create fog overlay
  const fogOverlay: RenderableComponentData = {
    id: 'depth-fog-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `linear-gradient(to bottom, rgba(255,255,255,${hazeIntensity * 0.4}), rgba(200,200,200,${hazeIntensity * 0.3}), rgba(255,255,255,${hazeIntensity * 0.4}))`,
          zIndex: 100,
          willChange: 'opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'fog-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['depth-fog-overlay'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Helper function to create focal plane with text and effects
  const createFocalPlane = (
    planeId: string,
    word: string,
    zIndex: number,
    initialBlur: number,
    translateZ: number,
    effectStart: number,
    effectDuration: number,
    fontSize: string,
    fontWeight: string | number,
  ): RenderableComponentData => {
    const textId = `${planeId}-text`;
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize,
          fontWeight,
          color: textColor,
          textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : { weights: ['700'] }),
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [],
    };

    const planeContainer: RenderableComponentData = {
      id: planeId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute flex items-center justify-center transform-gpu',
          style: {
            zIndex,
            willChange: 'transform, filter, opacity',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `${planeId}-focus-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: effectStart,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [planeId],
            ranges: [
              // Blur: starts high, goes to 0
              { key: 'filter', val: `blur(${initialBlur}px)`, prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
              // TranslateZ: converges to 0 (aligned focal plane)
              { key: 'translateZ', val: translateZ, prog: 0 },
              { key: 'translateZ', val: 0, prog: 1 },
              // Opacity: slightly transparent to fully opaque
              {
                key: 'opacity',
                val: 0.6 + (1 - Math.abs(translateZ) / 100) * 0.3,
                prog: 0,
              },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [textAtom],
    };

    return planeContainer;
  };

  // Create three focal planes
  const nearPlane = createFocalPlane(
    'focal-plane-near',
    words[0],
    30,
    initialBlurNear,
    nearZ,
    nearStart,
    nearDuration,
    'clamp(48px, 8vw, 120px)',
    '700',
  );

  const midPlane = createFocalPlane(
    'focal-plane-mid',
    words[1],
    20,
    initialBlurMid,
    midZ,
    midStart,
    midDuration,
    'clamp(40px, 6vw, 100px)',
    '600',
  );

  const farPlane = createFocalPlane(
    'focal-plane-far',
    words[2],
    10,
    initialBlurFar,
    farZ,
    farStart,
    farDuration,
    'clamp(32px, 5vw, 80px)',
    '500',
  );

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'depth-focus-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center transform-gpu',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          willChange: 'transform',
          contain: 'strict',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
    childrenData: [fogOverlay, nearPlane, midPlane, farPlane],
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
  id: 'depthLayeredBlurFocus',
  title: 'Depth Layered Blur-In Focus',
  description:
    'A three-dimensional focus pull effect where text exists at multiple focal distances. Words start at varying blur levels based on z-depth and converge into unified focus on the beat. Features parallax motion with closer elements moving faster, atmospheric haze that clears as focus sharpens, and the sensation of focusing through multiple glass panes that align on the beat.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'focus',
    '3d',
    'depth',
    'blur',
    'parallax',
    'perspective',
    'cinematic',
    'split-diopter',
    'focal-planes',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['DEPTH', 'FOCUS', 'EFFECT'],
    duration: 3,
    focusStagger: 0.2,
    parallaxIntensity: 1,
    hazeIntensity: 0.4,
    initialBlurNear: 10,
    initialBlurMid: 20,
    initialBlurFar: 30,
    font: 'Inter:700',
    textColor: '#ffffff',
  },
};

export const depthLayeredBlurFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
