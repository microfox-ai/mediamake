/**
 * Liquid Slide Text Animation Preset
 *
 * This preset creates a fluid text animation that flows into frame like water finding its level.
 * The horizontal movement has a viscous, organic quality with multiple ease points creating a natural
 * S-curve motion path. Imagine pouring honey - fast at first, then slowing with natural deceleration.
 *
 * Features:
 * - **Organic S-Curve Motion**: Multiple keyframe points create fluid horizontal sliding (200% → 0%)
 * - **Vertical Oscillation**: Subtle wave-like motion during horizontal slide enhances liquid feeling
 * - **Smooth Rotation**: Optional rotation (-1 to 1 degree) for additional fluidity
 * - **Subpixel Antialiasing**: Ensures smooth rendering during sub-pixel movements
 * - **Complex Easing**: Custom cubic-bezier(0.45, 0.05, 0.55, 0.95) for S-curve effect
 * - **Configurable Duration**: 1.2-1.5 seconds for optimal fluid feel
 *
 * Use cases:
 * - Organic brands and nature documentaries
 * - Content requiring smooth, natural motion
 * - Titles that feel alive rather than mechanically animated
 * - Elegant, flowing text introductions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().default('Your Text Here').describe('Text content to display'),
  
  // Typography
  fontSize: z.number().min(12).max(200).default(48).describe('Font size in pixels'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z.string().default('#ffffff').describe('Text color (hex or rgba)'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  // Animation timing
  duration: z.number().min(0.8).max(3).default(1.35).describe('Animation duration in seconds (1.2-1.5 recommended for fluid feel)'),
  delay: z.number().min(0).default(0).describe('Delay before animation starts (seconds)'),
  
  // Effect intensity
  oscillationIntensity: z.number().min(0).max(2).default(1).describe('Multiplier for vertical oscillation intensity'),
  rotationIntensity: z.number().min(0).max(2).default(1).describe('Multiplier for rotation intensity'),
  
  // Advanced customization
  customEasing: z.string().optional().describe('Custom cubic-bezier easing (e.g., "0.45, 0.05, 0.55, 0.95")'),
  startFromRight: z.boolean().default(true).describe('If true, slides from right (200%); if false, slides from left (-200%)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
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
  
  // Calculate effect values
  const oscillationMult = params.oscillationIntensity ?? 1;
  const rotationMult = params.rotationIntensity ?? 1;
  const startX = params.startFromRight ? 200 : -200;
  
  // IDs
  const rootId = 'liquid-slide-root';
  const textContainerId = 'liquid-text-container';
  const textAtomId = 'liquid-text-atom';
  const effectId = 'liquid-slide-effect';
  
  // Build the generic effect with S-curve motion
  const liquidSlideEffect: GenericEffectData = {
    type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)' as any,
    start: params.delay,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      // Horizontal translation (S-curve from start to 0)
      { key: 'translateX', val: startX, prog: 0, unit: '%' },
      { key: 'translateX', val: startX * 0.5, prog: 0.2, unit: '%' },
      { key: 'translateX', val: startX * 0.1, prog: 0.5, unit: '%' },
      { key: 'translateX', val: startX * 0.025, prog: 0.8, unit: '%' },
      { key: 'translateX', val: 0, prog: 1, unit: '%' },
      
      // Vertical oscillation (wave-like motion)
      { key: 'translateY', val: 0, prog: 0, unit: '%' },
      { key: 'translateY', val: -3 * oscillationMult, prog: 0.25, unit: '%' },
      { key: 'translateY', val: 2 * oscillationMult, prog: 0.5, unit: '%' },
      { key: 'translateY', val: -1 * oscillationMult, prog: 0.75, unit: '%' },
      { key: 'translateY', val: 0, prog: 1, unit: '%' },
      
      // Subtle rotation for fluidity
      { key: 'rotate', val: -1 * rotationMult, prog: 0, unit: 'deg' },
      { key: 'rotate', val: 0.5 * rotationMult, prog: 0.5, unit: 'deg' },
      { key: 'rotate', val: 0, prog: 1, unit: 'deg' },
      
      // Opacity fade-in
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.15 },
    ],
  };
  
  // Create the effect node
  const effect = {
    id: effectId,
    componentId: 'generic',
    data: liquidSlideEffect,
  };
  
  // Create text atom with subpixel antialiasing
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight || params.fontWeight,
        fontStyle: fontStyle.fontStyle,
        color: params.textColor,
        textAlign: 'center' as const,
        willChange: 'transform, opacity',
        // Subpixel antialiasing for smooth rendering
        WebkitFontSmoothing: 'subpixel-antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.delay + params.duration + 0.5, // Extra buffer for effect completion
      },
    },
    effects: [effect],
  };
  
  // Text container (centered layout)
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.delay + params.duration + 0.5,
      },
    },
    childrenData: [textAtom],
  };
  
  // Root container with overflow-visible for oscillation
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-visible',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.delay + params.duration + 0.5,
      },
    },
    childrenData: [textContainer],
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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'liquid-slide-text',
  title: 'Liquid Slide Text Animation',
  description: 'Fluid text animation that flows into frame like water finding its level. Features organic S-curve motion with multiple ease points, subtle vertical oscillation creating a wave-like effect, and optional rotation for enhanced fluidity. Perfect for organic brands, nature documentaries, or any content requiring smooth, natural motion that feels alive rather than mechanically animated.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'animation', 'liquid', 'fluid', 'organic', 'slide', 'wave', 'honey', 'water', 'smooth', 'natural', 's-curve', 'oscillation'],
  dependencies: {},
  defaultInputParams: {
    text: 'Your Text Here',
    fontSize: 48,
    fontWeight: '700',
    textColor: '#ffffff',
    font: 'Inter:700',
    duration: 1.35,
    delay: 0,
    oscillationIntensity: 1,
    rotationIntensity: 1,
    startFromRight: true,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const liquidSlideTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
