/**
 * Zoom Pulse Focus Preset
 *
 * Periodically zooms slightly into a focal area (e.g., face or object) to draw attention
 * with pulsing zoom effects synchronized to timing intervals.
 *
 * Features:
 * - **Pulsing Zoom Effect**: Smooth zoom in/out cycles targeting specific focal points
 * - **Customizable Focal Point**: Target specific areas like faces, objects, or custom coordinates
 * - **Adjustable Intensity**: Control zoom magnitude (e.g., 1.1 = 10% zoom, 1.2 = 20% zoom)
 * - **Timing Control**: Configure pulse duration and count for rhythm control
 * - **Smooth Easing**: Built-in easeInOut for natural motion
 *
 * Use Cases:
 * - Draw attention to faces in testimonials or interviews
 * - Highlight products or objects in promotional videos
 * - Add subtle motion to static images
 * - Create breathing effects on key visual elements
 * - Emphasize specific regions during presentations
 *
 * Technical Details:
 * - Uses alternating loop direction for smooth in/out cycles
 * - Transform origin set to focal point for precise zoom targeting
 * - Media covers entire composition duration
 * - Effect loops throughout duration based on pulse count
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  media: z
    .object({
      src: z.string().describe('URL or path to the media (image or video)'),
      type: z
        .enum(['image', 'video'])
        .default('image')
        .describe('Type of media to display'),
    })
    .describe('Media to apply zoom pulse effect to'),

  focalPoint: z
    .object({
      x: z
        .number()
        .min(0)
        .max(100)
        .default(50)
        .describe('Horizontal focal point position as percentage (0-100)'),
      y: z
        .number()
        .min(0)
        .max(100)
        .default(50)
        .describe('Vertical focal point position as percentage (0-100)'),
    })
    .default({ x: 50, y: 50 })
    .describe(
      'Focal point coordinates for zoom center (e.g., face or object position)',
    ),

  pulseIntensity: z
    .number()
    .min(1.0)
    .max(2.0)
    .default(1.15)
    .describe(
      'Zoom intensity multiplier (1.1 = 10% zoom, 1.2 = 20% zoom, 1.5 = 50% zoom)',
    ),

  pulseDuration: z
    .number()
    .min(0.3)
    .max(5.0)
    .default(1.5)
    .describe('Duration of each zoom in/out cycle in seconds'),

  pulseCount: z
    .number()
    .int()
    .min(1)
    .default(10)
    .describe('Number of zoom pulses to repeat throughout the duration'),

  duration: z
    .number()
    .default(10)
    .describe('Total duration of the effect in seconds'),

  fit: z
    .enum(['cover', 'contain', 'fill'])
    .default('cover')
    .describe('How the media should fit within the frame'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media,
    focalPoint,
    pulseIntensity,
    pulseDuration,
    pulseCount,
    duration,
    fit,
  } = params;

  const fps = props.config?.fps || 30;
  const durationInFrames = Math.round(duration * fps);

  // Calculate effect timing
  const effectDuration = pulseDuration; // Each pulse cycle duration
  const effectDurationFrames = Math.round(effectDuration * fps);

  // Generate zoom effect with alternating direction for smooth pulse
  const zoomEffect = {
    id: 'zoom-pulse-effect',
    componentId: 'zoom-pulse-media',
    data: {
      type: 'scale',
      mode: 'provider' as const,
      start: 0,
      duration: effectDuration,
      targetIds: ['zoom-pulse-media'],
      ranges: [
        // Zoom in
        { key: 'scaleX', val: 1.0, prog: 0 },
        { key: 'scaleX', val: pulseIntensity, prog: 0.5 },
        { key: 'scaleX', val: 1.0, prog: 1 },
        { key: 'scaleY', val: 1.0, prog: 0 },
        { key: 'scaleY', val: pulseIntensity, prog: 0.5 },
        { key: 'scaleY', val: 1.0, prog: 1 },
      ],
      loop: true,
      loopCount: pulseCount,
      easing: 'ease-in-out',
    },
  };

  // Media atom with zoom effect
  const mediaAtom = {
    id: 'zoom-pulse-media',
    type: 'atom' as const,
    componentId: media.type === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: media.src,
      fit: fit,
      className: 'w-full h-full object-cover',
      style: {
        transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [zoomEffect],
    childrenData: [],
  };

  // Media container
  const mediaContainer = {
    id: 'zoom-pulse-media-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [mediaAtom],
  };

  // Root container
  const rootContainer = {
    id: 'zoom-pulse-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex items-center justify-center bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [mediaContainer],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
      clip: {
        start: 0,
        duration: duration,
      },
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'zoom-pulse-focus',
  title: 'Zoom Pulse Focus',
  description:
    'Periodically zooms slightly into a focal area (e.g., face or object) to draw attention with pulsing zoom effects synchronized to timing intervals',
  type: 'predefined',
  presetType: 'children',
  tags: ['zoom', 'pulse', 'focus', 'attention', 'image', 'video', 'effect'],
  defaultInputParams: {
    media: {
      src: 'https://example.com/image.jpg',
      type: 'image',
    },
    focalPoint: {
      x: 50,
      y: 50,
    },
    pulseIntensity: 1.15,
    pulseDuration: 1.5,
    pulseCount: 10,
    duration: 10,
    fit: 'cover',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const zoomPulseFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
