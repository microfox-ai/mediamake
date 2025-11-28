/**
 * Premium Glass Morphism Typography Preset
 *
 * This preset creates an elegant glass-morphism style composition with sophisticated
 * refractive typography effects. The text materializes through a crystallization animation,
 * starting blurred and gradually becoming sharp. Prismatic lens flares split white light
 * into rainbow spectrums as they pass over the text, while subtle caustic light patterns
 * dance across the surface like light through water.
 *
 * Features:
 * - **Glass Morphism Container**: Frosted glass effect with backdrop blur and transparency
 * - **Crystallization Animation**: Text transitions from blurred to sharp with scale effect
 * - **Prismatic Lens Flares**: Animated rainbow gradient overlays that rotate and translate
 * - **Caustic Light Patterns**: Organic wave-like light patterns with soft-light blending
 * - **Parallax Zoom**: Three text layers moving at different speeds for depth
 * - **Frosted Edge Effects**: Radial gradient masks with chromatic aberration
 * - **Refractive Glow**: Multi-layered text shadows for ethereal glow effect
 *
 * Use cases:
 * - Premium brand presentations
 * - Luxury product showcases
 * - High-end title sequences
 * - Sophisticated intro/outro sequences
 * - Modern design system demonstrations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  backgroundText: z.string().default('GLASS').describe('Background layer text (largest, most transparent)'),
  middleText: z.string().default('REFRACT').describe('Middle layer text (medium size and opacity)'),
  foregroundText: z.string().default('CRYSTALLIZE').describe('Foreground layer text (smallest, sharpest, most visible)'),
  
  font: z.string().default('Inter:900').describe('Font family with optional weight (e.g., "Inter:900", "Roboto:800")'),
  
  duration: z.number().default(5).describe('Total duration of the composition in seconds'),
  
  // Glass container settings
  glassBlur: z.number().default(10).describe('Backdrop blur intensity in pixels for glass effect'),
  glassSaturation: z.number().default(1.5).describe('Saturation multiplier for glass effect'),
  glassOpacity: z.number().default(0.05).describe('Background opacity for glass container (0-1)'),
  
  // Crystallization animation settings
  crystallizationDuration: z.number().default(2).describe('Duration of crystallization animation in seconds'),
  initialBlur: z.number().default(20).describe('Initial blur amount in pixels'),
  initialScale: z.number().default(1.2).describe('Initial scale multiplier for text'),
  initialOpacity: z.number().default(0.3).describe('Initial opacity for text (0-1)'),
  
  // Prismatic flare settings
  prismIntensity: z.number().default(0.2).describe('Opacity of prismatic overlay (0-1)'),
  prismRotationSpeed: z.number().default(360).describe('Rotation degrees per duration'),
  prismTranslateDistance: z.number().default(100).describe('Translation distance in pixels'),
  
  // Caustic pattern settings
  causticIntensity: z.number().default(0.15).describe('Opacity of caustic patterns (0-1)'),
  
  // Parallax zoom settings
  backgroundZoom: z.number().default(1.05).describe('Final scale for background layer'),
  middleZoom: z.number().default(1.1).describe('Final scale for middle layer'),
  foregroundZoom: z.number().default(1.15).describe('Final scale for foreground layer'),
  
  // Text colors
  backgroundTextColor: z.string().default('rgba(255, 255, 255, 0.08)').describe('Color for background text'),
  middleTextColor: z.string().default('rgba(255, 255, 255, 0.15)').describe('Color for middle text'),
  foregroundTextColor: z.string().default('rgba(255, 255, 255, 0.9)').describe('Color for foreground text'),
  
  // Glow settings
  glowIntensity: z.number().default(1).describe('Multiplier for text shadow glow intensity'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font family and weight
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font);
  const fontWeights = fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['900'];

  // Calculate text shadows for refractive glow
  const calculateTextShadow = (intensity: number) => {
    const base = intensity * params.glowIntensity;
    return `0 0 ${30 * base}px rgba(255,255,255,${0.5 * base}), 0 0 ${60 * base}px rgba(200,220,255,${0.3 * base})`;
  };

  // ============================================================================
  // FROSTED EDGE MASK
  // ============================================================================
  
  const frostedEdgeMask: RenderableComponentData = {
    id: 'frosted-edge-mask',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0',
      style: {
        maskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)',
        boxShadow: 'inset 0 0 60px rgba(200, 220, 255, 0.1), inset 0 0 80px rgba(255, 200, 220, 0.1)',
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // ============================================================================
  // CAUSTIC BACKGROUND LAYER
  // ============================================================================
  
  const causticBackgroundLayer: RenderableComponentData = {
    id: 'caustic-background-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0',
      style: {
        background: 'radial-gradient(circle at 30% 40%, rgba(100, 200, 255, 0.3), transparent 50%), radial-gradient(circle at 70% 60%, rgba(255, 150, 200, 0.3), transparent 50%)',
        opacity: params.causticIntensity,
        mixBlendMode: 'soft-light' as const,
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'caustic-animation',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: params.duration,
          mode: 'provider' as const,
          targetIds: ['caustic-background-layer'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 20, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -15, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // PARALLAX TEXT LAYERS
  // ============================================================================
  
  // Background text (largest, most transparent, slowest zoom)
  const backgroundTextAtom: RenderableComponentData = {
    id: 'background-text-atom',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.backgroundText,
      className: 'text-center',
      style: {
        fontSize: 120,
        fontWeight: fontStyle.fontWeight || 900,
        color: params.backgroundTextColor,
        textShadow: calculateTextShadow(0.6),
        letterSpacing: '0.1em',
        ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
      },
      font: {
        family: fontFamily,
        weights: fontWeights,
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      // Crystallization effect
      {
        id: 'bg-crystallization',
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0,
          duration: params.crystallizationDuration,
          mode: 'provider' as const,
          targetIds: ['background-text-atom'],
          ranges: [
            { key: 'filter', val: `blur(${params.initialBlur}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
            { key: 'scale', val: params.initialScale, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: params.initialOpacity, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Parallax zoom
      {
        id: 'bg-parallax-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: params.duration,
          mode: 'provider' as const,
          targetIds: ['background-text-atom'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: params.backgroundZoom, prog: 1 },
          ],
        },
      },
    ],
  };

  const backgroundTextLayout: RenderableComponentData = {
    id: 'parallax-background-text',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [backgroundTextAtom],
  };

  // Middle text (medium size and opacity, medium zoom)
  const middleTextAtom: RenderableComponentData = {
    id: 'middle-text-atom',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.middleText,
      className: 'text-center',
      style: {
        fontSize: 96,
        fontWeight: fontStyle.fontWeight || 800,
        color: params.middleTextColor,
        textShadow: calculateTextShadow(0.8),
        letterSpacing: '0.08em',
        ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
      },
      font: {
        family: fontFamily,
        weights: fontWeights,
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      // Crystallization effect
      {
        id: 'mid-crystallization',
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0,
          duration: params.crystallizationDuration,
          mode: 'provider' as const,
          targetIds: ['middle-text-atom'],
          ranges: [
            { key: 'filter', val: `blur(${params.initialBlur}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
            { key: 'scale', val: params.initialScale, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: params.initialOpacity, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Parallax zoom
      {
        id: 'mid-parallax-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: params.duration,
          mode: 'provider' as const,
          targetIds: ['middle-text-atom'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: params.middleZoom, prog: 1 },
          ],
        },
      },
    ],
  };

  const middleTextLayout: RenderableComponentData = {
    id: 'parallax-middle-text',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [middleTextAtom],
  };

  // Foreground text (smallest, sharpest, fastest zoom)
  const foregroundTextAtom: RenderableComponentData = {
    id: 'foreground-text-atom',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.foregroundText,
      className: 'text-center',
      style: {
        fontSize: 72,
        fontWeight: fontStyle.fontWeight || 700,
        color: params.foregroundTextColor,
        textShadow: calculateTextShadow(1),
        letterSpacing: '0.05em',
        ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
      },
      font: {
        family: fontFamily,
        weights: fontWeights,
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      // Crystallization effect
      {
        id: 'fg-crystallization',
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0,
          duration: params.crystallizationDuration,
          mode: 'provider' as const,
          targetIds: ['foreground-text-atom'],
          ranges: [
            { key: 'filter', val: `blur(${params.initialBlur}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
            { key: 'scale', val: params.initialScale, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: params.initialOpacity, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Parallax zoom
      {
        id: 'fg-parallax-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: params.duration,
          mode: 'provider' as const,
          targetIds: ['foreground-text-atom'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: params.foregroundZoom, prog: 1 },
          ],
        },
      },
    ],
  };

  const foregroundTextLayout: RenderableComponentData = {
    id: 'parallax-foreground-text',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 3,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [foregroundTextAtom],
  };

  // ============================================================================
  // PRISMATIC FLARE OVERLAY
  // ============================================================================
  
  const prismaticFlareOverlay: RenderableComponentData = {
    id: 'prismatic-flare-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0',
      style: {
        background: 'conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ef4444)',
        opacity: params.prismIntensity,
        mixBlendMode: 'overlay' as const,
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'prism-animation',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: params.duration,
          mode: 'provider' as const,
          targetIds: ['prismatic-flare-overlay'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: params.prismRotationSpeed, prog: 1 },
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: params.prismTranslateDistance, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================
  
  const rootContainer: RenderableComponentData = {
    id: 'glass-morphism-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backdropFilter: `blur(${params.glassBlur}px) saturate(${params.glassSaturation})`,
          backgroundColor: `rgba(255, 255, 255, ${params.glassOpacity})`,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      frostedEdgeMask,
      causticBackgroundLayer,
      backgroundTextLayout,
      middleTextLayout,
      foregroundTextLayout,
      prismaticFlareOverlay,
    ] as RenderableComponentData[],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'glass-morphism-typography',
  title: 'Premium Glass Morphism Typography',
  description: 'Elegant glass-morphism preset with refractive typography, crystallization animation, prismatic lens flares, caustic light patterns, parallax zoom, and frosted glass overlays',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'glass-morphism',
    'glassmorphism',
    'premium',
    'elegant',
    'crystallization',
    'prismatic',
    'lens-flare',
    'caustic',
    'parallax',
    'frosted-glass',
    'refractive',
    'glow',
    'modern',
    'luxury',
  ],
  dependencies: {},
  defaultInputParams: {
    backgroundText: 'GLASS',
    middleText: 'REFRACT',
    foregroundText: 'CRYSTALLIZE',
    font: 'Inter:900',
    duration: 5,
    glassBlur: 10,
    glassSaturation: 1.5,
    glassOpacity: 0.05,
    crystallizationDuration: 2,
    initialBlur: 20,
    initialScale: 1.2,
    initialOpacity: 0.3,
    prismIntensity: 0.2,
    prismRotationSpeed: 360,
    prismTranslateDistance: 100,
    causticIntensity: 0.15,
    backgroundZoom: 1.05,
    middleZoom: 1.1,
    foregroundZoom: 1.15,
    backgroundTextColor: 'rgba(255, 255, 255, 0.08)',
    middleTextColor: 'rgba(255, 255, 255, 0.15)',
    foregroundTextColor: 'rgba(255, 255, 255, 0.9)',
    glowIntensity: 1,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const glassMorphismTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
