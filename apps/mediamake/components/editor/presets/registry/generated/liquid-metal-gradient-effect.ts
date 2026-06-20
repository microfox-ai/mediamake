/**
 * Liquid Metal Gradient Effect Preset
 *
 * Creates a dynamic liquid metal gradient effect with reflective, metallic qualities that flow
 * like mercury or molten metal. Features multiple gradient layers with blend modes for metallic
 * sheen, ripple propagation effects, and engraved/embossed text appearance.
 *
 * Features:
 * - Base metallic gradient layer with hard stops for sharp reflections
 * - Multiple overlay layers with radial gradients that morph using blend modes
 * - Ripple effects that propagate from center at intervals
 * - Specular highlights that move across the surface
 * - Metallic text with engraved/embossed appearance
 * - Uses metallic color palettes (silver, gold, copper, bronze)
 * - High contrast highlights for T-1000 Terminator-style liquid metal effect
 *
 * Use cases:
 * - Creating futuristic title sequences
 * - Liquid metal transitions
 * - Sci-fi themed content
 * - Metallic branding effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('LIQUID METAL')
    .describe('Text to display with metallic effect'),
  duration: z.number().default(10).describe('Duration of the effect in seconds'),
  fontSize: z
    .string()
    .default('8rem')
    .describe('Font size for the text (e.g., "8rem", "128px")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text'),
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight for the text'),
  rippleInterval: z
    .number()
    .default(2)
    .describe('Interval in seconds between ripple effects'),
  rippleIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for ripple effects'),
  metallicSheen: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .describe('Contrast multiplier for metallic sheen'),
  brightness: z
    .number()
    .min(1)
    .max(2)
    .default(1.1)
    .describe('Brightness multiplier for metallic effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    rippleInterval,
    rippleIntensity,
    metallicSheen,
    brightness,
  } = params;

  // Calculate number of ripple cycles
  const numRipples = Math.floor(duration / rippleInterval);

  // Create ripple effects at intervals
  const createRippleEffects = (layerId: string, delayMultiplier: number) => {
    const effects = [];
    for (let i = 0; i < numRipples; i++) {
      const startTime = i * rippleInterval + delayMultiplier * 0.3;
      effects.push({
        id: `${layerId}-ripple-${i}`,
        componentId: 'generic' as const,
        data: {
          type: 'ease-out' as const,
          start: startTime,
          duration: rippleInterval * 0.8,
          mode: 'provider' as const,
          targetIds: [layerId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1 + 0.15 * rippleIntensity, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      });
    }
    return effects;
  };

  // Create overlay morph effects (continuous looping)
  const createOverlayMorphEffect = (
    overlayId: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ) => {
    return {
      id: `${overlayId}-morph`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [overlayId],
        ranges: [
          { key: 'translateX', val: `${startX}vw`, prog: 0 },
          { key: 'translateX', val: `${endX}vw`, prog: 0.5 },
          { key: 'translateX', val: `${startX}vw`, prog: 1 },
          { key: 'translateY', val: `${startY}vh`, prog: 0 },
          { key: 'translateY', val: `${endY}vh`, prog: 0.5 },
          { key: 'translateY', val: `${startY}vh`, prog: 1 },
        ],
      },
    };
  };

  // Create specular highlight movement effects
  const createSpecularMovement = (
    highlightId: string,
    startLeft: string,
    endLeft: string,
    startTop: string,
    endTop: string,
  ) => {
    return {
      id: `${highlightId}-move`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: 0,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [highlightId],
        ranges: [
          { key: 'left', val: startLeft, prog: 0 },
          { key: 'left', val: endLeft, prog: 1 },
          { key: 'top', val: startTop, prog: 0 },
          { key: 'top', val: endTop, prog: 1 },
        ],
      },
    };
  };

  // Create text pulse effect
  const textPulseEffect = {
    id: 'text-pulse',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: ['metallic-text'],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.02, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Base metallic layer
    {
      id: 'base-metallic-layer',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute inset-0',
        style: {
          background:
            'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 20%, #A0A0A0 40%, #D4AF37 60%, #B87333 80%, #CD7F32 100%)',
          filter: `contrast(${metallicSheen}) brightness(${brightness})`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    },

    // Overlay layer 1 (white highlight - top left)
    {
      id: 'overlay-layer-1',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute inset-0 mix-blend-overlay',
        style: {
          background:
            'radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.6) 0%, transparent 50%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [createOverlayMorphEffect('overlay-layer-1', -10, -10, 10, 10)],
    },

    // Overlay layer 2 (gold highlight - center right)
    {
      id: 'overlay-layer-2',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute inset-0 mix-blend-overlay',
        style: {
          background:
            'radial-gradient(circle at 70% 60%, rgba(212, 175, 55, 0.5) 0%, transparent 50%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [createOverlayMorphEffect('overlay-layer-2', 10, 10, -10, -10)],
    },

    // Overlay layer 3 (copper highlight - bottom center)
    {
      id: 'overlay-layer-3',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute inset-0 mix-blend-overlay',
        style: {
          background:
            'radial-gradient(circle at 50% 50%, rgba(184, 115, 51, 0.4) 0%, transparent 50%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [createOverlayMorphEffect('overlay-layer-3', 0, 10, 0, -10)],
    },

    // Ripple layer 1
    {
      id: 'ripple-layer-1',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute inset-0',
        style: {
          background:
            'radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 40%)',
          transformOrigin: 'center',
          opacity: 0.3,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: createRippleEffects('ripple-layer-1', 0),
    },

    // Ripple layer 2
    {
      id: 'ripple-layer-2',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute inset-0',
        style: {
          background:
            'radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, transparent 40%)',
          transformOrigin: 'center',
          opacity: 0.2,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: createRippleEffects('ripple-layer-2', 0.5),
    },

    // Specular highlight 1
    {
      id: 'specular-highlight-1',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute',
        style: {
          width: '100px',
          height: '100px',
          background:
            'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%)',
          top: '20%',
          left: '10%',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        createSpecularMovement('specular-highlight-1', '10%', '80%', '20%', '60%'),
      ],
    },

    // Specular highlight 2
    {
      id: 'specular-highlight-2',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute',
        style: {
          width: '80px',
          height: '80px',
          background:
            'radial-gradient(circle, rgba(255, 255, 255, 0.7) 0%, transparent 70%)',
          top: '60%',
          left: '70%',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        createSpecularMovement('specular-highlight-2', '70%', '20%', '60%', '30%'),
      ],
    },

    // Text container
    {
      id: 'text-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center z-10',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [
        {
          id: 'metallic-text',
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: text,
            className:
              'relative z-10 text-transparent bg-clip-text bg-gradient-to-b from-gray-200 to-gray-600',
            style: {
              fontSize: fontSize,
              fontWeight: fontWeight,
              textShadow:
                '0 2px 4px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
              display: 'swap' as const,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          effects: [textPulseEffect],
        } as RenderableComponentData,
      ],
    },
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-metal-gradient-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: childrenData,
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-metal-gradient-effect',
  title: 'Liquid Metal Gradient Effect',
  description:
    'A dynamic liquid metal gradient effect with reflective, metallic qualities that flow like mercury or molten metal. Features multiple gradient layers with blend modes for metallic sheen, ripple propagation effects, and engraved/embossed text appearance. Uses metallic color palettes (silver, gold, copper, bronze) with high contrast highlights.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'gradient',
    'metallic',
    'liquid-metal',
    'effects',
    'ripple',
    'reflective',
    'sheen',
    'text',
    'engraved',
    'embossed',
    'mercury',
    't-1000',
    'sci-fi',
    'futuristic',
  ],
  defaultInputParams: {
    text: 'LIQUID METAL',
    duration: 10,
    fontSize: '8rem',
    fontFamily: 'Inter',
    fontWeight: '900',
    rippleInterval: 2,
    rippleIntensity: 1,
    metallicSheen: 1.2,
    brightness: 1.1,
  },
  dependencies: {},
};

// Export preset
export const liquidMetalGradientEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
