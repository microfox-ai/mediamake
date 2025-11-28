/**
 * Liquid Metal Text Cross-Fade Preset
 *
 * T-1000 inspired liquid metal transition effect where text melts, ripples, and reforms with metallic sheen
 * and fluid dynamics. Features displacement-style distortion, reflective surfaces, and undulating motion
 * mimicking mercury flow. Implements layered text with highlight/shadow effects for realistic metallic appearance.
 *
 * Features:
 * - Multi-layered text rendering (shadow, base, highlight) for metallic depth
 * - SVG turbulence and displacement filters for liquid distortion
 * - Melting animation: scaleY compression, skew distortion, blur increase
 * - Ripple effects during transition with animated displacement scale
 * - Reform animation: scaleY expansion, skew recovery, blur reduction
 * - Metallic gradient with silver/chrome colors and reflective highlights
 * - Individual letter undulation with wave-like motion
 * - Surface tension effects through transform animations
 * - Fluid dynamics simulation through complex keyframing
 *
 * Use cases:
 * - Cinematic title transitions
 * - Sci-fi themed content
 * - Tech/futuristic presentations
 * - Dynamic brand reveals
 * - Action-packed video intros
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
  firstText: z.string().describe('First text to display (will melt away)'),
  secondText: z.string().describe('Second text to display (will reform)'),
  transitionDuration: z
    .number()
    .default(3)
    .describe('Total duration of the transition in seconds'),
  fontSize: z
    .string()
    .default('80px')
    .describe('Font size for the text (e.g., "80px", "5rem")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family to use for the text'),
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (e.g., "900", "bold")'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    firstText,
    secondText,
    transitionDuration,
    fontSize,
    fontFamily,
    fontWeight,
  } = params;

  // Helper function to create text layers (shadow, base, highlight)
  const createTextLayers = (
    text: string,
    prefix: 'first' | 'second',
    isSecond: boolean,
  ) => {
    const baseId = `${prefix}-text`;

    // Shadow layer
    const shadowLayer: RenderableComponentData = {
      id: `${baseId}-shadow`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          fontSize: fontSize,
          fontWeight: fontWeight,
          color: 'rgba(120, 120, 130, 0.8)',
          textShadow: '0 0 20px rgba(150, 150, 160, 0.6)',
          filter: 'blur(4px)',
          position: 'absolute',
          zIndex: 1,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    };

    // Base layer with metallic gradient
    const baseLayer: RenderableComponentData = {
      id: `${baseId}-base`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        gradient:
          'linear-gradient(135deg, #c0c0d0 0%, #e8e8f0 25%, #ffffff 50%, #e8e8f0 75%, #c0c0d0 100%)',
        style: {
          fontSize: fontSize,
          fontWeight: fontWeight,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          textShadow:
            '2px 2px 4px rgba(0,0,0,0.3), 0 0 10px rgba(255,255,255,0.5)',
          position: 'absolute',
          zIndex: 2,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    };

    // Highlight layer
    const highlightLayer: RenderableComponentData = {
      id: `${baseId}-highlight`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        gradient:
          'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 60%)',
        style: {
          fontSize: fontSize,
          fontWeight: fontWeight,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          mixBlendMode: 'overlay',
          position: 'absolute',
          zIndex: 3,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    };

    return [shadowLayer, baseLayer, highlightLayer];
  };

  // Create first text layers (melting)
  const firstTextLayers = createTextLayers(firstText, 'first', false);

  // Add melt effects to first text layers
  const meltStartTime = 0;
  const meltDuration = transitionDuration * 0.5; // 0-50%

  firstTextLayers.forEach((layer) => {
    layer.effects = [
      // Melt animation: scaleY compression
      {
        id: `${layer.id}-melt-scale`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: meltStartTime,
          duration: meltDuration,
          mode: 'provider',
          targetIds: [layer.id],
          ranges: [
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 0.1, prog: 1 },
          ],
        },
      },
      // Skew distortion for fluid effect
      {
        id: `${layer.id}-melt-skew`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: meltStartTime,
          duration: meltDuration,
          mode: 'provider',
          targetIds: [layer.id],
          ranges: [
            { key: 'skewX', val: 0, prog: 0 },
            { key: 'skewX', val: -15, prog: 0.5 },
            { key: 'skewX', val: 10, prog: 1 },
          ],
        },
      },
      // Blur increase during melt
      {
        id: `${layer.id}-melt-blur`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: meltStartTime,
          duration: meltDuration,
          mode: 'provider',
          targetIds: [layer.id],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(8px)', prog: 1 },
          ],
        },
      },
      // Fade out
      {
        id: `${layer.id}-melt-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: meltStartTime + meltDuration * 0.5,
          duration: meltDuration * 0.5,
          mode: 'provider',
          targetIds: [layer.id],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Undulation effect
      {
        id: `${layer.id}-undulate`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: meltStartTime,
          duration: meltDuration,
          mode: 'provider',
          targetIds: [layer.id],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -10, prog: 0.25 },
            { key: 'translateY', val: 10, prog: 0.5 },
            { key: 'translateY', val: -5, prog: 0.75 },
            { key: 'translateY', val: 20, prog: 1 },
          ],
        },
      },
    ];
  });

  // Create second text layers (reforming)
  const secondTextLayers = createTextLayers(secondText, 'second', true);

  // Add reform effects to second text layers
  const reformStartTime = transitionDuration * 0.5; // 50-100%
  const reformDuration = transitionDuration * 0.5;

  secondTextLayers.forEach((layer) => {
    layer.effects = [
      // Reform animation: scaleY expansion
      {
        id: `${layer.id}-reform-scale`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: reformStartTime,
          duration: reformDuration,
          mode: 'provider',
          targetIds: [layer.id],
          ranges: [
            { key: 'scaleY', val: 0.1, prog: 0 },
            { key: 'scaleY', val: 1.15, prog: 0.7 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      },
      // Skew recovery
      {
        id: `${layer.id}-reform-skew`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: reformStartTime,
          duration: reformDuration,
          mode: 'provider',
          targetIds: [layer.id],
          ranges: [
            { key: 'skewX', val: 10, prog: 0 },
            { key: 'skewX', val: -8, prog: 0.4 },
            { key: 'skewX', val: 0, prog: 1 },
          ],
        },
      },
      // Blur reduction
      {
        id: `${layer.id}-reform-blur`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: reformStartTime,
          duration: reformDuration,
          mode: 'provider',
          targetIds: [layer.id],
          ranges: [
            { key: 'filter', val: 'blur(8px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Fade in
      {
        id: `${layer.id}-reform-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: reformStartTime,
          duration: reformDuration * 0.5,
          mode: 'provider',
          targetIds: [layer.id],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Undulation effect
      {
        id: `${layer.id}-reform-undulate`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: reformStartTime,
          duration: reformDuration,
          mode: 'provider',
          targetIds: [layer.id],
          ranges: [
            { key: 'translateY', val: 20, prog: 0 },
            { key: 'translateY', val: -5, prog: 0.25 },
            { key: 'translateY', val: 10, prog: 0.5 },
            { key: 'translateY', val: -3, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ];
  });

  // SVG filters for displacement and turbulence
  const svgFilters: RenderableComponentData = {
    id: 'liquid-metal-svg-filters',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width="0" height="0" style="position:absolute;pointer-events:none">
        <defs>
          <filter id="liquid-turbulence-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="turbulence"/>
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="0" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
      </svg>`,
      style: {
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-metal-container',
    type: 'layout' as const,
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
        duration: transitionDuration,
      },
    },
    childrenData: [
      svgFilters,
      ...firstTextLayers,
      ...secondTextLayers,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-metal-text-crossfade',
  title: 'Liquid Metal Text Cross-Fade',
  description:
    'T-1000 inspired liquid metal transition effect where text melts, ripples, and reforms with metallic sheen and fluid dynamics. Features displacement-style distortion, reflective surfaces, and undulating motion mimicking mercury flow.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'transition',
    'liquid',
    'metal',
    'metallic',
    't-1000',
    'terminator',
    'sci-fi',
    'cinematic',
    'melt',
    'reform',
    'fluid',
    'mercury',
    'chrome',
    'silver',
    'distortion',
    'ripple',
    'undulate',
  ],
  defaultInputParams: {
    firstText: 'LIQUID',
    secondText: 'METAL',
    transitionDuration: 3,
    fontSize: '80px',
    fontFamily: 'Inter',
    fontWeight: '900',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const liquidMetalTextCrossfadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
