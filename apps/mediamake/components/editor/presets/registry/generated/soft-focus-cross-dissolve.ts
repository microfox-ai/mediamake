/**
 * Soft Focus Cross-Dissolve Transition Preset
 *
 * A cinematic, gentle transition ideal for mood/aesthetic content. Instead of hard cuts,
 * images cross-fade with synchronized blur effects. Outgoing image increases blur (0-8px)
 * while decreasing opacity (1-0), incoming does reverse (8px-0 blur, 0-1 opacity).
 *
 * Features:
 * - **Long 900ms overlap**: Creates dreamy, slow transitions
 * - **Synchronized blur & opacity**: Smooth visual blending
 * - **Subtle vignette**: Intensifies during transition midpoint
 * - **Gentle zoom motion**: Optional 1.0 to 1.03 scale during transition
 * - **Symmetric easing**: cubic-bezier(0.4, 0, 0.6, 1) for smooth motion
 *
 * Technical:
 * - BaseLayout duration = sum - 900ms overlap
 * - Outgoing: blur 0→8px, opacity 1→0, scale 1→1.03 (0.2rel to 1rel)
 * - Incoming: blur 8→0px, opacity 0→1, scale 1.03→1 (0rel to 0.8rel)
 * - Vignette: peaks at 0.5rel (0→0.4→0 opacity)
 * - Z-index: incoming z-20, outgoing z-10, vignette z-30
 * - Provider mode with targetIds for performance
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
  image1: z.object({
    src: z.string().describe('Source URL of first image'),
    duration: z.number().describe('Duration of first image in seconds'),
  }),
  image2: z.object({
    src: z.string().describe('Source URL of second image'),
    duration: z.number().describe('Duration of second image in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(0.9)
    .describe('Duration of transition overlap in seconds (default: 0.9s)'),
  enableZoom: z
    .boolean()
    .default(true)
    .describe('Enable gentle zoom motion during transition (1.0 to 1.03)'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Peak vignette opacity at midpoint (0-1, default: 0.4)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, transitionDuration, enableZoom, vignetteIntensity } =
    params;

  // Calculate BaseLayout duration with overlap
  const baseLayoutDuration =
    image1.duration + image2.duration - transitionDuration;

  // Timing calculations
  const outgoingStart = 0;
  const outgoingDuration = image1.duration;
  const incomingStart = image1.duration - transitionDuration;
  const incomingDuration = image2.duration + transitionDuration;

  // Effect timing (relative to component start)
  const outgoingEffectStart = outgoingDuration - transitionDuration;
  const outgoingEffectRelativeStart = 0.2; // 20% into transition
  const outgoingEffectRelativeEnd = 1.0; // 100% of transition
  const incomingEffectRelativeStart = 0; // Start immediately
  const incomingEffectRelativeEnd = 0.8; // 80% into transition

  // Vignette timing (relative to its own start)
  const vignetteStart = incomingStart;
  const vignetteDuration = transitionDuration;
  const vignetteFadeInDuration = vignetteDuration / 2;
  const vignetteFadeOutStart = vignetteDuration / 2;
  const vignetteFadeOutDuration = vignetteDuration / 2;

  // Cubic bezier easing for symmetric ease-in-out
  const cubicBezierEasing: [number, number, number, number] = [
    0.4, 0, 0.6, 1,
  ];

  // Build children data
  const childrenData: RenderableComponentData[] = [];

  // Outgoing image
  const outgoingImage: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image1.src,
      className: 'absolute inset-0',
      style: {
        objectFit: 'cover',
        zIndex: 10,
        willChange: 'filter, opacity, transform',
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    effects: [
      // Blur effect (0px to 8px)
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          easingParams: cubicBezierEasing,
          start: outgoingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            {
              key: 'filter',
              val: 'blur(0px)',
              prog: outgoingEffectRelativeStart,
            },
            {
              key: 'filter',
              val: 'blur(8px)',
              prog: outgoingEffectRelativeEnd,
            },
          ],
        },
      },
      // Opacity effect (1 to 0)
      {
        id: 'outgoing-opacity',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          easingParams: cubicBezierEasing,
          start: outgoingEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'opacity', val: 1, prog: outgoingEffectRelativeStart },
            { key: 'opacity', val: 0, prog: outgoingEffectRelativeEnd },
          ],
        },
      },
    ],
  };

  // Add zoom effect if enabled
  if (enableZoom) {
    outgoingImage.effects!.push({
      id: 'outgoing-scale',
      componentId: 'generic',
      data: {
        type: 'cubic-bezier',
        easingParams: cubicBezierEasing,
        start: outgoingEffectStart,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: ['outgoing-image'],
        ranges: [
          { key: 'scale', val: 1, prog: outgoingEffectRelativeStart },
          { key: 'scale', val: 1.03, prog: outgoingEffectRelativeEnd },
        ],
      },
    });
  }

  childrenData.push(outgoingImage);

  // Incoming image
  const incomingImage: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image2.src,
      className: 'absolute inset-0',
      style: {
        objectFit: 'cover',
        zIndex: 20,
        willChange: 'filter, opacity, transform',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    effects: [
      // Blur effect (8px to 0px)
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          easingParams: cubicBezierEasing,
          start: 0, // Relative to incoming image start
          duration: transitionDuration * incomingEffectRelativeEnd,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'filter', val: 'blur(8px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Opacity effect (0 to 1)
      {
        id: 'incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          easingParams: cubicBezierEasing,
          start: 0,
          duration: transitionDuration * incomingEffectRelativeEnd,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Add zoom effect if enabled
  if (enableZoom) {
    incomingImage.effects!.push({
      id: 'incoming-scale',
      componentId: 'generic',
      data: {
        type: 'cubic-bezier',
        easingParams: cubicBezierEasing,
        start: 0,
        duration: transitionDuration * incomingEffectRelativeEnd,
        mode: 'provider',
        targetIds: ['incoming-image'],
        ranges: [
          { key: 'scale', val: 1.03, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    });
  }

  childrenData.push(incomingImage);

  // Vignette overlay (radial gradient)
  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%);"></div>',
      className: 'absolute inset-0',
      style: {
        zIndex: 30,
        pointerEvents: 'none',
        willChange: 'opacity',
      },
    },
    context: {
      timing: {
        start: vignetteStart,
        duration: vignetteDuration,
      },
    },
    effects: [
      // Fade in (0 to peak)
      {
        id: 'vignette-fade-in',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          easingParams: cubicBezierEasing,
          start: 0,
          duration: vignetteFadeInDuration,
          mode: 'provider',
          targetIds: ['vignette-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: vignetteIntensity, prog: 1 },
          ],
        },
      },
      // Fade out (peak to 0)
      {
        id: 'vignette-fade-out',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          easingParams: cubicBezierEasing,
          start: vignetteFadeOutStart,
          duration: vignetteFadeOutDuration,
          mode: 'provider',
          targetIds: ['vignette-overlay'],
          ranges: [
            { key: 'opacity', val: vignetteIntensity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(vignetteOverlay);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'soft-focus-cross-dissolve-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'soft-focus-cross-dissolve',
  title: 'Soft Focus Cross-Dissolve Transition',
  description:
    'A cinematic, gentle transition ideal for mood/aesthetic content with cross-fade synchronized blur effects, subtle vignette, and optional gentle zoom motion. Images cross-fade with 900ms overlap creating dreamy, slow transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'cross-dissolve',
    'blur',
    'fade',
    'cinematic',
    'gentle',
    'zoom',
    'vignette',
    'aesthetic',
  ],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    transitionDuration: 0.9,
    enableZoom: true,
    vignetteIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const softFocusCrossDissolvePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
