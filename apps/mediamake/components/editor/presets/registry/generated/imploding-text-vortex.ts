/**
 * Imploding Text Vortex Effect Preset
 *
 * This preset creates a dramatic text implosion effect where text spirals inward
 * while shrinking and rotating, as if being sucked into a black hole at the center
 * of the screen. The effect combines exponential rotation acceleration, scale
 * reduction, and linear opacity fade with a slight vertical pull toward the
 * implosion point.
 *
 * Features:
 * - **Exponential Rotation**: Text rotates from 0deg to 720deg with exponential ease-in
 * - **Scale Reduction**: Text shrinks from 1 to 0 with ease-in-quad
 * - **Linear Opacity Fade**: Opacity drops from 1 to 0 linearly over the last 40% of duration
 * - **Vertical Pull**: Slight translateY from 0 to 20px toward implosion point
 * - **Dynamic Implosion Point**: Center point offset to 60% vertically for dynamic composition
 * - **Performance Optimized**: Uses single transform declaration with backface-visibility hidden
 * - **3D Depth**: Perspective: 1000px on parent for enhanced depth perception
 *
 * Use cases:
 * - Dramatic scene transitions
 * - Emphatic text exits
 * - Title card disappearances
 * - Special effect overlays
 * - Video intro/outro effects
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
  text: z.string().describe('Text content to display and implode'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(72)
    .describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (Google Font)'),
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Duration of the implosion effect in seconds'),
  speedMultiplier: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Speed multiplier for the effect (1 = normal, >1 = faster, <1 = slower)'),
  rotationIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Rotation intensity multiplier (1 = 720deg, 2 = 1440deg)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Calculate adjusted duration based on speed multiplier
  const effectDuration = params.duration / params.speedMultiplier;

  // Calculate rotation amount based on intensity
  const rotationDegrees = 720 * params.rotationIntensity;

  // Calculate opacity fade start point (60% of duration)
  const opacityFadeStart = effectDuration * 0.6;
  const opacityFadeDuration = effectDuration * 0.4;

  // Parse font family (format: "FontName:weight:style" or "FontName")
  const fontString = params.fontFamily;
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
  } else if (params.fontWeight) {
    fontStyle.fontWeight = params.fontWeight;
  }

  // Component IDs
  const containerId = 'vortex-root-container';
  const textId = 'vortex-text-element';

  // Create rotation effect (0deg to rotationDegrees, exponential ease-in)
  const rotationEffect = {
    id: 'vortex-rotation-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: 0,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: rotationDegrees, prog: 1 },
      ],
    },
  };

  // Create scale effect (1 to 0, ease-in-quad)
  const scaleEffect = {
    id: 'vortex-scale-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: 0,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 0, prog: 1 },
      ],
    },
  };

  // Create opacity fade effect (1 to 0, linear over last 40%)
  const opacityEffect = {
    id: 'vortex-opacity-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: opacityFadeStart,
      duration: opacityFadeDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Create translateY effect (0 to 20px, ease-in)
  const translateEffect = {
    id: 'vortex-translate-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: 0,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 20, prog: 1 },
      ],
    },
  };

  // Create text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        color: params.color,
        textAlign: 'center',
        transformOrigin: 'center 60%',
        backfaceVisibility: 'hidden',
        willChange: 'transform, opacity',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['400', '700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [rotationEffect, scaleEffect, opacityEffect, translateEffect],
  };

  // Create root container with perspective
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    childrenData: [textAtom],
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
  id: 'imploding-text-vortex',
  title: 'Imploding Text Vortex Effect',
  description:
    'Dramatic text implosion effect where text spirals inward while shrinking and rotating, as if being sucked into a black hole. Features exponential acceleration of rotation and scale reduction with linear opacity fade, creating a whirlpool effect perfect for dramatic scene transitions or emphatic text exits.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'effect',
    'vortex',
    'implosion',
    'spiral',
    'rotation',
    'dramatic',
    'transition',
    'exit',
    'black-hole',
    'whirlpool',
  ],
  defaultInputParams: {
    text: 'IMPLODING TEXT',
    fontSize: 72,
    fontWeight: 'bold',
    fontFamily: 'Inter',
    color: '#FFFFFF',
    duration: 2,
    speedMultiplier: 1,
    rotationIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const implodingTextVortexPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
