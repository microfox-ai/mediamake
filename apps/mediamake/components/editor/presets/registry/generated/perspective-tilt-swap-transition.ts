/**
 * Perspective Tilt Swap Transition Preset
 *
 * A 3D transition preset where images swap places in depth space with perspective tilt.
 * The outgoing image tilts backward (rotateX increasing, translateZ decreasing into distance)
 * while fading out, and the incoming image tilts forward from above (rotateX decreasing from
 * negative, translateZ increasing toward viewer) while fading in.
 *
 * Features:
 * - 3D perspective space (1200px perspective, center origin)
 * - Outgoing: rotateX 0→45deg, translateZ 0→-300px, scale 1→0.7, opacity 1→0
 * - Incoming: rotateX -45→0deg, translateZ -300→0px, scale 0.7→1, opacity 0→1
 * - 600ms overlap duration for smooth swap effect
 * - Cubic-bezier easing (0.4, 0, 0.2, 1) for material design feel
 * - Backface-visibility hidden for clean rendering
 * - Dynamic z-index based on translateZ depth
 *
 * Use cases:
 * - Creating 3D image/video transitions
 * - Building immersive swap effects for presentations
 * - Adding depth perception to media transitions
 * - Material design inspired 3D animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingMedia: z.object({
    src: z.string().describe('Source URL of outgoing media (image or video)'),
    type: z
      .enum(['image', 'video'])
      .optional()
      .describe('Media type (auto-detected from extension if not provided)'),
    duration: z
      .number()
      .positive()
      .describe('Duration of outgoing media in seconds'),
  }),
  incomingMedia: z.object({
    src: z.string().describe('Source URL of incoming media (image or video)'),
    type: z
      .enum(['image', 'video'])
      .optional()
      .describe('Media type (auto-detected from extension if not provided)'),
    duration: z
      .number()
      .positive()
      .describe('Duration of incoming media in seconds'),
  }),
  overlapDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.6)
    .describe('Duration of overlap transition in seconds (default: 0.6s)'),
  perspective: z
    .number()
    .positive()
    .default(1200)
    .describe('Perspective depth in pixels (default: 1200px)'),
  maxRotateX: z
    .number()
    .min(0)
    .max(90)
    .default(45)
    .describe('Maximum rotateX angle in degrees (default: 45deg)'),
  maxTranslateZ: z
    .number()
    .min(0)
    .max(1000)
    .default(300)
    .describe('Maximum translateZ distance in pixels (default: 300px)'),
  minScale: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .describe('Minimum scale value (default: 0.7)'),
  easingFunction: z
    .string()
    .default('cubic-bezier(0.4, 0, 0.2, 1)')
    .describe('CSS easing function (default: cubic-bezier(0.4, 0, 0.2, 1))'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to determine component ID from source
  const getComponentId = (src: string, type?: 'image' | 'video'): string => {
    if (type === 'video') return 'VideoAtom';
    if (type === 'image') return 'ImageAtom';

    // Auto-detect from extension
    if (src.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i)) return 'VideoAtom';
    if (src.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)$/i)) return 'ImageAtom';

    return 'ImageAtom'; // Default to image
  };

  const {
    outgoingMedia,
    incomingMedia,
    overlapDuration,
    perspective,
    maxRotateX,
    maxTranslateZ,
    minScale,
    easingFunction,
  } = params;

  // Calculate total duration: sum of both durations minus overlap
  const totalDuration =
    outgoingMedia.duration + incomingMedia.duration - overlapDuration;

  // Calculate transition timing
  const outgoingFadeStart = 0.4; // Start fade at 40% of outgoing duration (relative)
  const incomingFadeEnd = 0.6; // End fade at 60% of incoming duration (relative)

  // Outgoing media: starts at 0, lasts full duration
  const outgoingStart = 0;
  const outgoingDuration = outgoingMedia.duration;

  // Incoming media: starts before outgoing ends (overlap), extended duration
  const incomingStart = outgoingMedia.duration - overlapDuration;
  const incomingDuration = incomingMedia.duration;

  // Effect timing (absolute times for effects)
  const outgoingEffectStart = outgoingFadeStart * outgoingDuration;
  const outgoingEffectDuration = outgoingDuration - outgoingEffectStart;

  const incomingEffectStart = 0; // Relative to incoming media start
  const incomingEffectDuration = incomingFadeEnd * incomingDuration;

  // Build outgoing media component
  const outgoingComponent: RenderableComponentData = {
    id: 'perspective-tilt-outgoing',
    type: 'atom',
    componentId: getComponentId(
      outgoingMedia.src,
      outgoingMedia.type,
    ) as 'VideoAtom' | 'ImageAtom',
    data: {
      src: outgoingMedia.src,
      className: 'absolute inset-0',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        backfaceVisibility: 'hidden',
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-tilt-effect',
        componentId: 'generic',
        data: {
          type: easingFunction,
          start: outgoingEffectStart,
          duration: outgoingEffectDuration,
          mode: 'provider',
          targetIds: ['perspective-tilt-outgoing'],
          ranges: [
            // RotateX: 0deg → maxRotateX (tilt backward)
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: maxRotateX, prog: 1 },
            // TranslateZ: 0px → -maxTranslateZ (move into distance)
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateZ', val: -maxTranslateZ, prog: 1 },
            // Scale: 1 → minScale (shrink for depth perception)
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: minScale, prog: 1 },
            // Opacity: 1 → 0 (fade out)
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Build incoming media component
  const incomingComponent: RenderableComponentData = {
    id: 'perspective-tilt-incoming',
    type: 'atom',
    componentId: getComponentId(
      incomingMedia.src,
      incomingMedia.type,
    ) as 'VideoAtom' | 'ImageAtom',
    data: {
      src: incomingMedia.src,
      className: 'absolute inset-0',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        backfaceVisibility: 'hidden',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    effects: [
      {
        id: 'incoming-tilt-effect',
        componentId: 'generic',
        data: {
          type: easingFunction,
          start: incomingEffectStart,
          duration: incomingEffectDuration,
          mode: 'provider',
          targetIds: ['perspective-tilt-incoming'],
          ranges: [
            // RotateX: -maxRotateX → 0deg (tilt forward from above)
            { key: 'rotateX', val: -maxRotateX, prog: 0 },
            { key: 'rotateX', val: 0, prog: 1 },
            // TranslateZ: -maxTranslateZ → 0px (move toward viewer)
            { key: 'translateZ', val: -maxTranslateZ, prog: 0 },
            { key: 'translateZ', val: 0, prog: 1 },
            // Scale: minScale → 1 (grow for depth perception)
            { key: 'scale', val: minScale, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Opacity: 0 → 1 (fade in)
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Build 3D transform container (preserve-3d)
  const transform3dContainer: RenderableComponentData = {
    id: 'perspective-transform-3d-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingComponent, incomingComponent],
  };

  // Build perspective container (root)
  const rootContainer: RenderableComponentData = {
    id: 'perspective-tilt-swap-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: 'center center',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [transform3dContainer],
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
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'perspective-tilt-swap-transition',
  title: 'Perspective Tilt Swap Transition',
  description:
    '3D transition where images swap places in depth space. Outgoing image tilts backward into distance while fading. Incoming image tilts forward from above toward viewer. Features rotateX transforms, translateZ depth translation, scale for enhanced depth perception, and cubic-bezier easing for material design feel. 600ms overlap creates smooth swap effect with 1200px perspective.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    '3d',
    'perspective',
    'tilt',
    'swap',
    'depth',
    'material-design',
    'rotatex',
    'translatez',
  ],
  defaultInputParams: {
    outgoingMedia: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 2.0,
    },
    incomingMedia: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 2.0,
    },
    overlapDuration: 0.6,
    perspective: 1200,
    maxRotateX: 45,
    maxTranslateZ: 300,
    minScale: 0.7,
    easingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const perspectiveTiltSwapTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
