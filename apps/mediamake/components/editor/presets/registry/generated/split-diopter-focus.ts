/**
 * Split-Diopter Focus Effect Preset
 *
 * A cinematic split-diopter effect inspired by classic cinematography techniques used in films
 * like Citizen Kane. Creates the illusion of multiple focal planes existing simultaneously,
 * where parts of the text are sharp while others are blurred, gradually aligning into unified focus.
 *
 * Features:
 * - **Multiple Focal Planes**: Divides text into 2-3 sections with different clip-path polygons
 * - **Selective Blur**: Initial state with alternating sharp/blurred sections
 * - **Focus Pull Animation**: Staggered timing for focal planes to align (0.5s, 1.5s, 2.5s)
 * - **Dolly Zoom (Vertigo Effect)**: Combines scale (1.2→1.0) with perspective change (800px→1200px)
 * - **Light Leaks**: Animated light bleeds at plane intersections with gradient overlays
 * - **Plane Rotation**: Subtle rotation (-2deg→0deg) creates alignment effect
 * - **Film-like Motion**: Uses cubic-bezier easing for cinematic feel
 *
 * Technical Details:
 * - GPU-accelerated clip-path for performance
 * - Transform-only animations to minimize repaints
 * - 3-second total duration with staggered focal plane alignment
 * - Light leaks animate between 1s-2s for dramatic effect
 *
 * Use Cases:
 * - Dramatic title reveals with depth perception
 * - Unsettling or artistic text introductions
 * - Film-inspired opening sequences
 * - Creating disorienting then resolving visual effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameters Schema ---
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with split-diopter effect (will be split into 3 parts)'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .describe('Total duration of the effect in seconds (default: 3)'),
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "BebasNeue")'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels (default: 72)'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (default: white)'),
  initialBlur: z
    .number()
    .min(0)
    .max(40)
    .default(20)
    .describe('Initial blur amount for out-of-focus planes in pixels (default: 20)'),
  initialRotation: z
    .number()
    .min(-10)
    .max(10)
    .default(-2)
    .describe('Initial rotation of planes in degrees (default: -2)'),
  initialScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .describe('Initial scale for dolly zoom effect (default: 1.2)'),
  perspectiveStart: z
    .number()
    .min(400)
    .max(1600)
    .default(800)
    .describe('Starting perspective value in pixels (default: 800)'),
  perspectiveEnd: z
    .number()
    .min(400)
    .max(1600)
    .default(1200)
    .describe('Ending perspective value in pixels (default: 1200)'),
  lightLeakIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Opacity intensity of light leaks (default: 0.8)'),
  focusTimings: z
    .object({
      plane1: z.number().default(0.5).describe('Time when plane 1 comes into focus (seconds)'),
      plane2: z.number().default(2.5).describe('Time when plane 2 snaps into focus (seconds)'),
      plane3: z.number().default(1.5).describe('Time when plane 3 comes into focus (seconds)'),
    })
    .optional()
    .describe('Custom focus timing for each plane (defaults: 0.5s, 1.5s, 2.5s)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration ?? 3;
  const fontSize = params.fontSize ?? 72;
  const textColor = params.textColor ?? '#ffffff';
  const initialBlur = params.initialBlur ?? 20;
  const initialRotation = params.initialRotation ?? -2;
  const initialScale = params.initialScale ?? 1.2;
  const perspectiveStart = params.perspectiveStart ?? 800;
  const perspectiveEnd = params.perspectiveEnd ?? 1200;
  const lightLeakIntensity = params.lightLeakIntensity ?? 0.8;

  // Focus timings (staggered for cinematic effect)
  const focusTimings = params.focusTimings ?? {
    plane1: 0.5,
    plane2: 2.5,
    plane3: 1.5,
  };

  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 700;

  // Split text into three parts (rough thirds)
  const text = params.text || 'SPLIT DIOPTER FOCUS';
  const words = text.split(' ');
  const thirdLength = Math.ceil(words.length / 3);
  const part1 = words.slice(0, thirdLength).join(' ');
  const part2 = words.slice(thirdLength, thirdLength * 2).join(' ');
  const part3 = words.slice(thirdLength * 2).join(' ');

  // Helper: Create focus effect for a plane
  const createFocusEffect = (
    targetId: string,
    focusTime: number,
    focusDuration: number,
    initiallyBlurred: boolean,
  ) => {
    if (!initiallyBlurred) {
      // Plane 2 stays sharp, but still needs rotation/scale alignment
      return {
        id: `focus-align-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            // Rotation alignment
            { key: 'rotate', val: initialRotation, prog: 0 },
            { key: 'rotate', val: 0, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
            // Scale (dolly zoom)
            { key: 'scale', val: initialScale, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      };
    }

    // Blurred planes: animate blur → sharp + rotation + scale
    const focusProgress = focusTime / duration;
    const focusEndProgress = Math.min((focusTime + focusDuration) / duration, 1);

    return {
      id: `focus-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Blur animation
          { key: 'filter', val: `blur(${initialBlur}px)`, prog: 0 },
          { key: 'filter', val: `blur(${initialBlur}px)`, prog: focusProgress },
          { key: 'filter', val: 'blur(0px)', prog: focusEndProgress },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
          // Rotation alignment
          { key: 'rotate', val: initialRotation, prog: 0 },
          { key: 'rotate', val: initialRotation, prog: focusProgress },
          { key: 'rotate', val: 0, prog: focusEndProgress },
          { key: 'rotate', val: 0, prog: 1 },
          // Scale (dolly zoom)
          { key: 'scale', val: initialScale, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create light leak effect
  const createLightLeakEffect = (targetId: string) => {
    return {
      id: `light-leak-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Fade in at 1/3 duration
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.33 },
          { key: 'opacity', val: lightLeakIntensity, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 0.67 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create perspective animation on root container
  const createPerspectiveEffect = (targetId: string) => {
    return {
      id: `perspective-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Perspective change (dolly zoom effect)
          { key: 'perspective', val: `${perspectiveStart}px`, prog: 0 },
          { key: 'perspective', val: `${perspectiveEnd}px`, prog: 1 },
        ],
      },
    };
  };

  // --- Component Tree ---

  // Text segments with clip-path divisions
  const focalPlane1: RenderableComponentData = {
    id: 'focal-plane-1',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          clipPath: 'polygon(0 0, 33% 0, 33% 100%, 0 100%)',
          width: '100%',
          height: '100%',
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      createFocusEffect('focal-plane-1', focusTimings.plane1, 0.5, true),
    ],
    childrenData: [
      {
        id: 'text-segment-1',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: part1,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            color: textColor,
            textAlign: 'center',
            width: '100%',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
            display: 'swap',
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

  const focalPlane2: RenderableComponentData = {
    id: 'focal-plane-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          clipPath: 'polygon(33% 0, 67% 0, 67% 100%, 33% 100%)',
          width: '100%',
          height: '100%',
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      createFocusEffect('focal-plane-2', focusTimings.plane2, 0.5, false),
    ],
    childrenData: [
      {
        id: 'text-segment-2',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: part2,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            color: textColor,
            textAlign: 'center',
            width: '100%',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
            display: 'swap',
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

  const focalPlane3: RenderableComponentData = {
    id: 'focal-plane-3',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          clipPath: 'polygon(67% 0, 100% 0, 100% 100%, 67% 100%)',
          width: '100%',
          height: '100%',
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      createFocusEffect('focal-plane-3', focusTimings.plane3, 0.5, true),
    ],
    childrenData: [
      {
        id: 'text-segment-3',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: part3,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            color: textColor,
            textAlign: 'center',
            width: '100%',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
            display: 'swap',
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

  // Light leak elements at plane boundaries
  const lightLeak1: RenderableComponentData = {
    id: 'light-leak-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%;'></div>",
      style: {
        position: 'absolute',
        left: '33%',
        top: '0',
        width: '2px',
        height: '100%',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,200,100,0.6) 50%, rgba(255,255,255,0.8) 100%)',
        filter: 'blur(4px)',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [createLightLeakEffect('light-leak-1')],
  };

  const lightLeak2: RenderableComponentData = {
    id: 'light-leak-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%;'></div>",
      style: {
        position: 'absolute',
        left: '67%',
        top: '0',
        width: '2px',
        height: '100%',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,200,100,0.6) 50%, rgba(255,255,255,0.8) 100%)',
        filter: 'blur(4px)',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [createLightLeakEffect('light-leak-2')],
  };

  // Root container with perspective animation
  const rootContainer: RenderableComponentData = {
    id: 'split-diopter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [createPerspectiveEffect('split-diopter-root')],
    childrenData: [
      focalPlane1,
      focalPlane2,
      focalPlane3,
      lightLeak1,
      lightLeak2,
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

// --- Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'split-diopter-focus',
  title: 'Split-Diopter Focus Effect',
  description:
    'Cinematic split-diopter effect inspired by classic films like Citizen Kane. Text sections exist on different focal planes with blur effects, gradually aligning into unified focus. Includes dolly zoom (vertigo effect), plane rotation alignment, and light leak bleeds at intersections. Creates dramatic, unsettling, or artistic title reveals that play with perception and depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'cinematic',
    'split-diopter',
    'focus',
    'depth',
    'vintage',
    'film',
    'citizen-kane',
    'dolly-zoom',
    'vertigo',
    'blur',
    'rotation',
    'light-leak',
    'artistic',
    'dramatic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SPLIT DIOPTER FOCUS',
    duration: 3,
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#ffffff',
    initialBlur: 20,
    initialRotation: -2,
    initialScale: 1.2,
    perspectiveStart: 800,
    perspectiveEnd: 1200,
    lightLeakIntensity: 0.8,
    focusTimings: {
      plane1: 0.5,
      plane2: 2.5,
      plane3: 1.5,
    },
  },
};

// --- Export ---
export const splitDiopterFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
