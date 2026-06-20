/**
 * Iris Wipe Transition Preset
 *
 * A radial wipe transition where a colored circular div expands from the center point like an iris 
 * opening in a camera lens, mimicking the classic iris wipe effect used in vintage films and modern 
 * motion graphics. The colored circle starts as a tiny dot at the center and expands outward to fill 
 * the entire frame, hiding the first image, then contracts back to nothing to reveal the second image.
 *
 * Features:
 * - **Iris Opening Effect**: Circle expands from center to fill frame
 * - **Smooth Organic Animation**: Spring easing for natural motion
 * - **Pulsing Glow Edge**: Subtle animated glow around the expanding circle
 * - **Dual Phase Transition**: Expansion phase (hides first image) + contraction phase (reveals second image)
 * - **Customizable Colors**: Control wipe color and glow color
 * - **Radial Gradient Depth**: Inner gradient adds visual depth to the circle
 *
 * Use cases:
 * - Classic film-style transitions between scenes
 * - Vintage aesthetic transitions
 * - Focus transitions that draw attention to center
 * - Dramatic reveal effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  firstImage: z.object({
    src: z.string().describe('Source URL of the first image'),
  }),
  secondImage: z.object({
    src: z.string().describe('Source URL of the second image'),
  }),
  transitionDuration: z
    .number()
    .default(2.0)
    .describe('Total duration of the transition in seconds'),
  wipeColor: z
    .string()
    .default('#000000')
    .describe('Color of the expanding circle (hex or rgb)'),
  glowColor: z
    .string()
    .default('rgba(255, 255, 255, 0.6)')
    .describe('Color of the pulsing glow around the circle edge'),
  glowIntensity: z
    .number()
    .default(30)
    .describe('Intensity of the glow effect in pixels'),
  holdDuration: z
    .number()
    .default(0.2)
    .describe('Duration to hold at maximum expansion (fraction of total duration)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    firstImage,
    secondImage,
    transitionDuration,
    wipeColor,
    glowColor,
    glowIntensity,
    holdDuration,
  } = params;

  // Calculate viewport dimensions (200% for full coverage)
  const viewportWidth = props.config?.width ?? 1920;
  const viewportHeight = props.config?.height ?? 1080;
  const maxDimension = Math.max(viewportWidth, viewportHeight);
  const expandedSize = maxDimension * 2.5; // 200% viewport coverage + buffer

  // Calculate timing phases
  const expansionDuration = transitionDuration * 0.45;
  const holdStart = expansionDuration;
  const holdEnd = holdStart + holdDuration;
  const contractionStart = holdEnd;
  const contractionDuration = transitionDuration - contractionStart;

  // Wipe circle animation effect (expansion + hold + contraction)
  const wipeCircleEffect = {
    id: 'wipe-circle-animation',
    componentId: 'generic',
    data: {
      type: 'spring' as const,
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['wipe-circle'],
      ranges: [
        // Expansion phase: 0px to expandedSize
        { key: 'width', val: '0px', prog: 0 },
        { key: 'width', val: `${expandedSize}px`, prog: expansionDuration / transitionDuration },
        { key: 'height', val: '0px', prog: 0 },
        { key: 'height', val: `${expandedSize}px`, prog: expansionDuration / transitionDuration },
        
        // Hold phase: maintain expandedSize
        { key: 'width', val: `${expandedSize}px`, prog: holdStart / transitionDuration },
        { key: 'width', val: `${expandedSize}px`, prog: holdEnd / transitionDuration },
        { key: 'height', val: `${expandedSize}px`, prog: holdStart / transitionDuration },
        { key: 'height', val: `${expandedSize}px`, prog: holdEnd / transitionDuration },
        
        // Contraction phase: expandedSize back to 0px
        { key: 'width', val: `${expandedSize}px`, prog: contractionStart / transitionDuration },
        { key: 'width', val: '0px', prog: 1 },
        { key: 'height', val: `${expandedSize}px`, prog: contractionStart / transitionDuration },
        { key: 'height', val: '0px', prog: 1 },

        // Scale animation for smoother rendering
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: 1, prog: expansionDuration / transitionDuration },
        { key: 'scale', val: 1, prog: holdEnd / transitionDuration },
        { key: 'scale', val: 0, prog: 1 },

        // Opacity for smooth fade
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.05 },
        { key: 'opacity', val: 1, prog: 0.95 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Pulsing glow effect (modulate shadow intensity)
  const glowPulseEffect = {
    id: 'glow-pulse',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['wipe-circle'],
      ranges: [
        // Pulse glow during expansion
        { key: 'filter', val: `drop-shadow(0 0 ${glowIntensity * 0.5}px ${glowColor})`, prog: 0 },
        { key: 'filter', val: `drop-shadow(0 0 ${glowIntensity}px ${glowColor})`, prog: 0.15 },
        { key: 'filter', val: `drop-shadow(0 0 ${glowIntensity * 0.7}px ${glowColor})`, prog: 0.3 },
        { key: 'filter', val: `drop-shadow(0 0 ${glowIntensity}px ${glowColor})`, prog: expansionDuration / transitionDuration },
        
        // Hold at peak glow
        { key: 'filter', val: `drop-shadow(0 0 ${glowIntensity}px ${glowColor})`, prog: holdEnd / transitionDuration },
        
        // Fade glow during contraction
        { key: 'filter', val: `drop-shadow(0 0 ${glowIntensity * 0.7}px ${glowColor})`, prog: 0.7 },
        { key: 'filter', val: `drop-shadow(0 0 ${glowIntensity * 0.3}px ${glowColor})`, prog: 0.85 },
        { key: 'filter', val: `drop-shadow(0 0 0px ${glowColor})`, prog: 1 },
      ],
    },
  };

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // First image (background layer)
    {
      id: 'first-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: firstImage.src,
        className: 'absolute inset-0 w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Second image (revealed underneath)
    {
      id: 'second-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: secondImage.src,
        className: 'absolute inset-0 w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Wipe circle (expanding/contracting overlay)
    {
      id: 'wipe-circle',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full',
          style: {
            background: `radial-gradient(circle, ${wipeColor}, ${wipeColor} 70%, transparent)`,
            width: '0px',
            height: '0px',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'iris-wipe-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [wipeCircleEffect, glowPulseEffect],
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

const presetMetadata: PresetMetadata = {
  id: 'iris-wipe-transition',
  title: 'Iris Wipe Transition',
  description:
    'A radial wipe transition where a colored circular div expands from the center like an iris opening in a camera lens, mimicking classic vintage film effects. Features smooth organic expansion/contraction with pulsing glow edge effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'iris', 'wipe', 'radial', 'vintage', 'film', 'circular'],
  defaultInputParams: {
    firstImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    secondImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    },
    transitionDuration: 2.0,
    wipeColor: '#000000',
    glowColor: 'rgba(255, 255, 255, 0.6)',
    glowIntensity: 30,
    holdDuration: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const irisWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
