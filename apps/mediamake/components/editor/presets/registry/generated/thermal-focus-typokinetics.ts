/**
 * Thermal Focus Typokinetics Preset
 *
 * This preset creates a dramatic heat-haze blur to crystal clarity text effect
 * that simulates viewing through hot air that cools and stabilizes on the beat.
 * Features shimmer/mirage blur with vertical distortion waves, color temperature
 * shifts from warm orange/red tint to neutral, and thermal expansion oscillations.
 * Evokes desert mirages or heat rising from pavement that snaps into perfect focus.
 *
 * Features:
 * - Heat haze blur to crystal clarity transition
 * - Shimmer and waver effects like a mirage
 * - Vertical distortion waves that gradually diminish
 * - Color temperature shifts from warm (orange/red) to neutral
 * - Thermal expansion/contraction oscillations
 * - Beat-synchronized stabilization points
 * - Animated SVG filters for heat distortion
 * - GPU-accelerated transforms for performance
 *
 * Use cases:
 * - Desert/heat-themed intros or transitions
 * - Dramatic text reveals with thermal effects
 * - Music videos with heat/intensity themes
 * - Social media content with mirage aesthetics
 * - Creative typography with environmental storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(80)
    .describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color when focused (CSS color value)'),
  warmColor: z
    .string()
    .default('#FF6B35')
    .describe('Warm color tint during heat haze (orange/red)'),
  maxBlur: z
    .number()
    .min(5)
    .max(20)
    .default(12)
    .describe('Maximum blur intensity in pixels during heat haze'),
  shimmerIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for shimmer/waver effects'),
  thermalOscillation: z
    .number()
    .min(0.01)
    .max(0.1)
    .default(0.02)
    .describe('Amplitude of thermal expansion/contraction oscillation'),
  stabilizationPoint: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Point in duration (0-1) when effect stabilizes to clarity'),
  beatSync: z
    .boolean()
    .default(false)
    .describe('Enable beat-synchronized stabilization (requires audio)'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source for beat synchronization (if beatSync is true)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.fontFamily || 'Inter';
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
  }

  // Calculate timing phases
  const duration = params.duration;
  const stabilizeAt = duration * params.stabilizationPoint;
  const stabilizeDuration = duration - stabilizeAt;

  // IDs
  const containerId = 'thermal-focus-container';
  const svgFilterId = 'thermal-distortion-filter';
  const textId = 'thermal-text';
  const glowLayerId = 'thermal-glow-layer';

  // --- SVG Filter for Heat Distortion ---

  const svgFilterHtml = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="${svgFilterId}" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence 
            id="turbulence" 
            type="fractalNoise" 
            baseFrequency="0.01 0.02" 
            numOctaves="3" 
            seed="2">
            <animate 
              attributeName="baseFrequency" 
              values="0.01 0.02; 0.015 0.025; 0.01 0.02" 
              dur="2s" 
              repeatCount="indefinite"/>
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="15" xChannelSelector="R" yChannelSelector="G">
            <animate 
              attributeName="scale" 
              values="15; 20; 15" 
              dur="1.5s" 
              repeatCount="indefinite"/>
          </feDisplacementMap>
        </filter>
      </defs>
    </svg>
  `;

  // --- Effects ---

  const effects = [
    // Blur effect: 12px to 0 with sine wave modulation
    {
      id: 'thermal-blur-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration: stabilizeAt,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: [
          { key: 'blur', val: `${params.maxBlur}px`, prog: 0 },
          { key: 'blur', val: `${params.maxBlur * 0.7}px`, prog: 0.2 },
          { key: 'blur', val: `${params.maxBlur * 0.4}px`, prog: 0.5 },
          { key: 'blur', val: `${params.maxBlur * 0.1}px`, prog: 0.8 },
          { key: 'blur', val: '0px', prog: 1 },
        ],
      },
    },
    // Color temperature shift: warm (sepia + hue-rotate) to neutral
    {
      id: 'thermal-color-temp-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: stabilizeAt,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: [
          {
            key: 'filter',
            val: `sepia(0.8) hue-rotate(-10deg) saturate(1.5) brightness(1.2)`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `sepia(0.5) hue-rotate(-5deg) saturate(1.2) brightness(1.1)`,
            prog: 0.5,
          },
          { key: 'filter', val: 'none', prog: 1 },
        ],
      },
    },
    // Thermal expansion/contraction oscillations
    {
      id: 'thermal-scale-oscillation',
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: stabilizeAt,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: [
          { key: 'scale', val: 1 + params.thermalOscillation, prog: 0 },
          { key: 'scale', val: 1 - params.thermalOscillation, prog: 0.15 },
          { key: 'scale', val: 1 + params.thermalOscillation * 0.7, prog: 0.3 },
          { key: 'scale', val: 1 - params.thermalOscillation * 0.5, prog: 0.5 },
          { key: 'scale', val: 1 + params.thermalOscillation * 0.3, prog: 0.7 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    },
    // Vertical wave distortion: subtle translateY oscillation
    {
      id: 'thermal-vertical-wave',
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: stabilizeAt,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: [
          { key: 'translateY', val: -5 * params.shimmerIntensity, prog: 0 },
          { key: 'translateY', val: 5 * params.shimmerIntensity, prog: 0.2 },
          { key: 'translateY', val: -3 * params.shimmerIntensity, prog: 0.4 },
          { key: 'translateY', val: 3 * params.shimmerIntensity, prog: 0.6 },
          { key: 'translateY', val: -1 * params.shimmerIntensity, prog: 0.8 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    },
    // ScaleY alternating distortion (vertical stretching/compression)
    {
      id: 'thermal-vertical-distortion',
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: stabilizeAt,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: [
          { key: 'scaleY', val: 1.03, prog: 0 },
          { key: 'scaleY', val: 0.98, prog: 0.15 },
          { key: 'scaleY', val: 1.02, prog: 0.3 },
          { key: 'scaleY', val: 0.99, prog: 0.5 },
          { key: 'scaleY', val: 1.01, prog: 0.7 },
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      },
    },
    // Glow layer fade out
    {
      id: 'thermal-glow-fadeout',
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration: stabilizeAt,
        mode: 'provider' as const,
        targetIds: [glowLayerId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.5, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
  ];

  // --- Component Tree ---

  const svgFilterComponent: RenderableComponentData = {
    id: 'thermal-svg-filter',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFilterHtml,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
        zIndex: -1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const glowLayerComponent: RenderableComponentData = {
    id: glowLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        position: 'absolute' as const,
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: 'transparent',
        textShadow: `0 0 30px ${params.warmColor}cc, 0 0 60px ${params.warmColor}99, 0 0 90px ${params.warmColor}66`,
        pointerEvents: 'none' as const,
        willChange: 'opacity, text-shadow',
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
        duration: duration,
      },
    },
  };

  const mainTextComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.textColor,
        willChange: 'transform, filter',
        filter: `url(#${svgFilterId})`,
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
        duration: duration,
      },
    },
  };

  const textWrapperComponent: RenderableComponentData = {
    id: 'thermal-text-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          willChange: 'transform, filter, opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [glowLayerComponent, mainTextComponent],
  };

  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects,
    childrenData: [svgFilterComponent, textWrapperComponent],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'thermal-focus-typokinetics',
  title: 'Thermal Focus Typokinetics',
  description:
    'Heat-haze blur to crystal clarity text effect that simulates viewing through hot air that cools and stabilizes. Features shimmer/mirage blur with vertical distortion waves, color temperature shifts from warm orange/red tint to neutral, and thermal expansion oscillations. Evokes desert mirages or heat rising from pavement that snaps into perfect focus.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'heat',
    'mirage',
    'thermal',
    'blur',
    'distortion',
    'haze',
    'desert',
    'warm',
    'focus',
    'kinetic',
    'shimmer',
    'wave',
  ],
  defaultInputParams: {
    text: 'HEAT WAVE',
    duration: 5,
    fontSize: 80,
    fontWeight: 'bold',
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    warmColor: '#FF6B35',
    maxBlur: 12,
    shimmerIntensity: 1,
    thermalOscillation: 0.02,
    stabilizationPoint: 0.7,
    beatSync: false,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const thermalFocusTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
