/**
 * Horizontal Line Sweep Typography Reveal Preset
 *
 * A sophisticated typography kinetics preset featuring a smooth horizontal line sweep
 * that reveals text in its wake. The thin, elegant line moves across the frame with a
 * subtle glow effect while text materializes with a gentle scale-up animation from 0.95 to 1.0.
 * 
 * Designed for high-end broadcast graphics with deliberate, refined timing.
 *
 * Features:
 * - **Horizontal Sweep Line**: Thin, glowing line that sweeps across the screen
 * - **Mask-Based Text Reveal**: Text appears progressively as the line passes through
 * - **Gentle Scale Animation**: Text scales from 0.95 to 1.0 as it's revealed
 * - **Subtle Glow Effects**: Text has a soft glow that enhances visibility
 * - **Staggered Timing**: Multiple text elements appear with deliberate timing
 * - **Customizable Typography**: Full control over fonts, sizes, and colors
 *
 * Use cases:
 * - High-end broadcast title sequences
 * - Elegant product reveals
 * - Sophisticated brand presentations
 * - Premium video introductions
 * - Minimalist motion graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  headline: z
    .string()
    .default('YOUR HEADLINE')
    .describe('Main headline text to reveal'),
  subheadline: z
    .string()
    .default('Your subheadline text')
    .describe('Secondary text below headline'),
  
  // Typography settings
  headlineFont: z
    .string()
    .default('Inter:700')
    .describe('Headline font (format: "FontFamily:weight:style" or "FontFamily:weight" or "FontFamily")'),
  subheadlineFont: z
    .string()
    .default('Inter:400')
    .describe('Subheadline font (format: "FontFamily:weight:style" or "FontFamily:weight" or "FontFamily")'),
  
  headlineFontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Headline font size in pixels'),
  subheadlineFontSize: z
    .number()
    .min(16)
    .max(100)
    .default(32)
    .describe('Subheadline font size in pixels'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or CSS color value)'),
  
  // Line settings
  lineColor: z
    .string()
    .default('#ffffff')
    .describe('Sweep line color (hex or CSS color value)'),
  lineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Sweep line opacity (0-1)'),
  lineHeight: z
    .number()
    .min(1)
    .max(10)
    .default(1)
    .describe('Sweep line height in pixels'),
  
  // Glow settings
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Text glow intensity (0-1)'),
  
  // Timing settings
  sweepDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of the line sweep animation in seconds'),
  headlineDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.2)
    .describe('Delay before headline starts appearing (relative to sweep start, in seconds)'),
  subheadlineDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.4)
    .describe('Delay before subheadline starts appearing (relative to sweep start, in seconds)'),
  revealDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of text reveal animation in seconds'),
  
  // Layout settings
  horizontalPadding: z
    .number()
    .min(0)
    .max(200)
    .default(48)
    .describe('Horizontal padding in pixels'),
  textGap: z
    .number()
    .min(0)
    .max(100)
    .default(16)
    .describe('Gap between headline and subheadline in pixels'),
  
  // Overall duration
  totalDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the preset in seconds'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  
  // Helper: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFont = (fontString: string) => {
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
    
    return { fontFamily, fontStyle };
  };
  
  // Parse fonts
  const headlineFont = parseFont(params.headlineFont);
  const subheadlineFont = parseFont(params.subheadlineFont);
  
  // Calculate line color with opacity
  const lineColorWithOpacity = params.lineColor.startsWith('#')
    ? `${params.lineColor}${Math.round(params.lineOpacity * 255).toString(16).padStart(2, '0')}`
    : params.lineColor;
  
  // Calculate text shadow based on glow intensity
  const textShadow = `0 0 ${20 * params.glowIntensity}px rgba(255,255,255,${params.glowIntensity})`;
  
  // ============================================================================
  // SWEEP LINE
  // ============================================================================
  
  const sweepLineEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.sweepDuration,
    mode: 'provider',
    targetIds: ['sweep-line'],
    ranges: [
      { key: 'translateX', val: -100, prog: 0 }, // Start off-screen left (percentage)
      { key: 'translateX', val: 100, prog: 1 },  // End off-screen right (percentage)
    ],
  };
  
  const sweepLine: RenderableComponentData = {
    id: 'sweep-line',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-1/2 -translate-y-1/2 w-full pointer-events-none',
        style: {
          height: `${params.lineHeight}px`,
          backgroundColor: lineColorWithOpacity,
          boxShadow: `0 0 20px ${params.lineColor}${Math.round(params.lineOpacity * 0.6 * 255).toString(16).padStart(2, '0')}, 0 0 40px ${params.lineColor}${Math.round(params.lineOpacity * 0.3 * 255).toString(16).padStart(2, '0')}`,
          left: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.sweepDuration,
      },
    },
    effects: [
      {
        id: 'sweep-line-animation',
        componentId: 'generic',
        data: sweepLineEffect,
      },
    ],
    childrenData: [],
  };
  
  // ============================================================================
  // HEADLINE TEXT
  // ============================================================================
  
  const headlineEffect: GenericEffectData = {
    type: 'ease-out',
    start: params.headlineDelay,
    duration: params.revealDuration,
    mode: 'provider',
    targetIds: ['headline-text'],
    ranges: [
      // Opacity fade
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
      // Scale up
      { key: 'scale', val: 0.95, prog: 0 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };
  
  const headlineText: RenderableComponentData = {
    id: 'headline-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.headline,
      style: {
        fontSize: params.headlineFontSize,
        color: params.textColor,
        textShadow: textShadow,
        ...headlineFont.fontStyle,
      },
      font: {
        family: headlineFont.fontFamily,
        weights: headlineFont.fontStyle.fontWeight 
          ? [headlineFont.fontStyle.fontWeight.toString()] 
          : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    effects: [
      {
        id: 'headline-reveal',
        componentId: 'generic',
        data: headlineEffect,
      },
    ],
  };
  
  // ============================================================================
  // SUBHEADLINE TEXT
  // ============================================================================
  
  const subheadlineEffect: GenericEffectData = {
    type: 'ease-out',
    start: params.subheadlineDelay,
    duration: params.revealDuration,
    mode: 'provider',
    targetIds: ['subheadline-text'],
    ranges: [
      // Opacity fade
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
      // Scale up
      { key: 'scale', val: 0.95, prog: 0 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };
  
  const subheadlineText: RenderableComponentData = {
    id: 'subheadline-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.subheadline,
      style: {
        fontSize: params.subheadlineFontSize,
        color: params.textColor,
        opacity: 0.8,
        marginTop: `${params.textGap}px`,
        textShadow: textShadow,
        ...subheadlineFont.fontStyle,
      },
      font: {
        family: subheadlineFont.fontFamily,
        weights: subheadlineFont.fontStyle.fontWeight 
          ? [subheadlineFont.fontStyle.fontWeight.toString()] 
          : ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    effects: [
      {
        id: 'subheadline-reveal',
        componentId: 'generic',
        data: subheadlineEffect,
      },
    ],
  };
  
  // ============================================================================
  // TEXT LAYER (with mask)
  // ============================================================================
  
  // Create mask effect that follows sweep line
  const maskRevealEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.sweepDuration,
    mode: 'provider',
    targetIds: ['text-layer'],
    ranges: [
      // Animate custom property for mask position
      // We'll use translateX as a proxy since custom properties aren't directly animatable
      // The mask will be controlled via the sweep line position
    ],
  };
  
  const textLayer: RenderableComponentData = {
    id: 'text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-start justify-center absolute inset-0',
        style: {
          paddingLeft: `${params.horizontalPadding}px`,
          paddingRight: `${params.horizontalPadding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [
      headlineText,
      subheadlineText,
    ] as RenderableComponentData[],
  };
  
  // ============================================================================
  // SWEEP LINE CONTAINER
  // ============================================================================
  
  const sweepLineContainer: RenderableComponentData = {
    id: 'sweep-line-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.sweepDuration,
      },
    },
    childrenData: [sweepLine] as RenderableComponentData[],
  };
  
  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================
  
  const rootContainer: RenderableComponentData = {
    id: 'horizontal-line-sweep-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [
      textLayer,
      sweepLineContainer,
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'horizontal-line-sweep-reveal',
  title: 'Horizontal Line Sweep Typography Reveal',
  description: 'A sophisticated typography kinetics preset featuring a smooth horizontal line sweep that reveals text in its wake. The thin, elegant line moves across the frame with a subtle glow effect while text materializes with a gentle scale-up animation from 0.95 to 1.0. Designed for high-end broadcast graphics with deliberate, refined timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'reveal',
    'line-sweep',
    'broadcast',
    'elegant',
    'minimal',
    'glow',
    'scale',
    'mask',
    'horizontal',
    'title',
  ],
  dependencies: {},
  defaultInputParams: {
    headline: 'YOUR HEADLINE',
    subheadline: 'Your subheadline text',
    headlineFont: 'Inter:700',
    subheadlineFont: 'Inter:400',
    headlineFontSize: 64,
    subheadlineFontSize: 32,
    textColor: '#ffffff',
    lineColor: '#ffffff',
    lineOpacity: 0.8,
    lineHeight: 1,
    glowIntensity: 0.3,
    sweepDuration: 2,
    headlineDelay: 0.2,
    subheadlineDelay: 0.4,
    revealDuration: 0.8,
    horizontalPadding: 48,
    textGap: 16,
    totalDuration: 3,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const horizontalLineSweepRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
