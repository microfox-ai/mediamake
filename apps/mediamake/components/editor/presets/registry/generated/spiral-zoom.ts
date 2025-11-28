/**
 * Spiral Zoom Effect Preset
 *
 * This preset creates a hypnotic, vertigo-inducing effect by combining zoom with rotation.
 * It simulates the experience of falling into or being pulled toward a focal point - the kind
 * of effect used in psychological thrillers or dream sequences.
 *
 * Features:
 * - **Compound Transform**: Combines zoom (scale) with rotation in a single smooth animation
 * - **Accelerating Rotation**: Rotation speed increases as zoom intensifies (whirlpool effect)
 * - **Tunnel Vision**: Radial gradient overlay that darkens edges as the effect progresses
 * - **Color Shifting**: Subtle hue rotation that enhances the surreal, disorienting feel
 * - **Motion Blur**: Subtle blur during peak rotation for enhanced realism
 * - **Focal Point Control**: Configure off-center spiral origins for asymmetric effects
 * - **Intensity Control**: Adjust rotation count (1-3 full rotations) and zoom depth
 *
 * Use cases:
 * - Dramatic transitions between scenes
 * - Emphasis on key moments in psychological content
 * - Dream sequence or flashback effects
 * - Music video visualizations
 * - Horror/thriller mood establishment
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  image: z
    .object({
      src: z.string().describe('Image source URL'),
    })
    .describe('Image to apply the spiral zoom effect to'),
  duration: z
    .number()
    .min(0.5)
    .max(30)
    .default(5)
    .describe('Duration of the effect in seconds'),
  focalPoint: z
    .object({
      x: z
        .number()
        .min(0)
        .max(100)
        .default(50)
        .describe('Horizontal focal point position (0-100, 50 = center)'),
      y: z
        .number()
        .min(0)
        .max(100)
        .default(50)
        .describe('Vertical focal point position (0-100, 50 = center)'),
    })
    .default({ x: 50, y: 50 })
    .optional()
    .describe('Transform origin for the spiral effect'),
  spiralIntensity: z
    .number()
    .min(1)
    .max(3)
    .default(2)
    .describe('Number of full rotations during the effect (1-3)'),
  zoomDepth: z
    .number()
    .min(1.5)
    .max(5)
    .default(3)
    .describe('Maximum zoom scale factor (1.5 = 150%, 3 = 300%)'),
  tunnelVisionStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Strength of edge darkening (0 = none, 1 = full black)'),
  hueShiftAmount: z
    .number()
    .min(0)
    .max(60)
    .default(30)
    .describe('Degrees of hue rotation during effect (0-60)'),
  motionBlurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Motion blur intensity in pixels during peak rotation'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    image,
    duration,
    focalPoint = { x: 50, y: 50 },
    spiralIntensity,
    zoomDepth,
    tunnelVisionStrength,
    hueShiftAmount,
    motionBlurIntensity,
  } = params;

  // Calculate rotation in degrees (360 * spiralIntensity)
  const totalRotation = 360 * spiralIntensity;

  // Transform origin based on focal point
  const transformOrigin = `${focalPoint.x}% ${focalPoint.y}%`;

  // Image component with spiral zoom effect
  const imageLayer: RenderableComponentData = {
    id: 'spiral-zoom-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        transformOrigin,
        willChange: 'transform, filter',
        transformStyle: 'preserve-3d',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Compound transform effect: scale + rotate
      {
        id: 'spiral-zoom-transform',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['spiral-zoom-image'],
          ranges: [
            // Scale from 1 to zoomDepth
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: zoomDepth, prog: 1 },
            // Rotate from 0 to totalRotation
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: totalRotation, prog: 1 },
          ],
        },
      },
      // Hue rotation for color shifting
      {
        id: 'spiral-zoom-hue',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['spiral-zoom-image'],
          ranges: [
            {
              key: 'filter',
              val: 'hue-rotate(0deg)',
              prog: 0,
            },
            {
              key: 'filter',
              val: `hue-rotate(${hueShiftAmount}deg)`,
              prog: 1,
            },
          ],
        },
      },
      // Motion blur during peak rotation (middle 40% of animation)
      {
        id: 'spiral-zoom-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: duration * 0.3,
          duration: duration * 0.4,
          mode: 'provider',
          targetIds: ['spiral-zoom-image'],
          ranges: [
            { key: 'blur', val: '0px', prog: 0 },
            { key: 'blur', val: `${motionBlurIntensity}px`, prog: 0.5 },
            { key: 'blur', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  };

  // Tunnel vision overlay (radial gradient that darkens edges)
  const tunnelOverlay: RenderableComponentData = {
    id: 'spiral-zoom-tunnel',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        background: `radial-gradient(circle at ${focalPoint.x}% ${focalPoint.y}%, transparent 0%, transparent 30%, rgba(0,0,0,0) 30%, rgba(0,0,0,${tunnelVisionStrength}) 100%)`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Animate tunnel vision intensity
      {
        id: 'tunnel-vision-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['spiral-zoom-tunnel'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'spiral-zoom-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [imageLayer, tunnelOverlay],
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

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'spiral-zoom',
  title: 'Spiral Zoom Effect',
  description:
    'Hypnotic spiral zoom preset that creates a vertigo-inducing effect by combining accelerating zoom with rotation. Features tunnel vision fade, color shifting via hue rotation, and motion blur for psychological thriller and dream sequence aesthetics. Perfect for dramatic transitions and emphasis.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'zoom',
    'spiral',
    'rotation',
    'dramatic',
    'psychological',
    'tunnel-vision',
    'hue-shift',
    'motion-blur',
  ],
  defaultInputParams: {
    image: {
      src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
    },
    duration: 5,
    focalPoint: { x: 50, y: 50 },
    spiralIntensity: 2,
    zoomDepth: 3,
    tunnelVisionStrength: 0.8,
    hueShiftAmount: 30,
    motionBlurIntensity: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export
export const spiralZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
