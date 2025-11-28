/**
 * Shadow Lift Typokinetic Preset
 *
 * An elegant typokinetic preset where text emerges from its own shadow with a sophisticated 
 * 3D lift effect. The text starts flat with its shadow directly beneath it (no offset), 
 * then gradually rises with a parallax motion where the shadow separates, blurs, and fades.
 *
 * Features:
 * - Depth-focused animation with 3D perspective context
 * - Text scales from 0.98 to 1.0 while lifting (translateZ: 0 → 40px)
 * - Shadow separates with slower parallax motion (translateY: 0 → 8px)
 * - Shadow blur increases (0px → 12px) and opacity decreases (0.8 → 0.3)
 * - Two-stage animation: emergence (0-0.4s opacity fade) + lift (0.4-1.2s depth effect)
 * - Subtle brightness filter on text (0.95 → 1.0) for illumination effect
 * - preserve-3d transform style for depth maintenance
 *
 * Perfect for:
 * - Premium brand titles
 * - Documentary credits
 * - Sophisticated text overlays requiring subtle depth
 * - Any content requiring elegant 3D text effects
 *
 * Technical Implementation:
 * - Uses BaseLayout with perspective-1000 for 3D context
 * - Separate text and shadow layers with independent animations
 * - Shadow created by duplicating text content with modified styling
 * - Effects use provider mode targeting specific layers
 * - All timing relative to parent container
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().default('PREMIUM TITLE').describe('Text content to display'),
  duration: z.number().default(1.2).describe('Total animation duration in seconds'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., "700", "bold")'),
  textColor: z.string().default('#ffffff').describe('Text color (CSS color value)'),
  shadowColor: z.string().default('rgba(0, 0, 0, 0.8)').describe('Shadow color with opacity'),
  fontFamily: z.string().default('Inter').describe('Font family (Google Font name)'),
  
  // Animation timing configuration
  emergenceDuration: z.number().default(0.4).describe('Duration of initial emergence phase in seconds'),
  liftDuration: z.number().default(0.8).describe('Duration of lift effect phase in seconds'),
  
  // Animation parameters
  textLiftDistance: z.number().default(40).describe('Z-axis lift distance for text in pixels'),
  shadowSeparation: z.number().default(8).describe('Y-axis separation for shadow in pixels'),
  initialScale: z.number().default(0.98).describe('Initial scale of text (less than 1.0)'),
  finalScale: z.number().default(1.0).describe('Final scale of text'),
  
  // Shadow animation parameters
  initialShadowBlur: z.number().default(0).describe('Initial shadow blur in pixels'),
  finalShadowBlur: z.number().default(12).describe('Final shadow blur in pixels'),
  initialShadowOpacity: z.number().default(0.8).describe('Initial shadow opacity (0-1)'),
  finalShadowOpacity: z.number().default(0.3).describe('Final shadow opacity (0-1)'),
  
  // Brightness effect
  initialBrightness: z.number().default(0.95).describe('Initial text brightness (0-2)'),
  finalBrightness: z.number().default(1.0).describe('Final text brightness (0-2)'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Component IDs
  const containerId = 'shadow-lift-container';
  const textLayerId = 'text-main-layer';
  const shadowLayerId = 'text-shadow-layer';
  
  // Timing calculations
  const emergenceDuration = params.emergenceDuration;
  const liftStart = emergenceDuration;
  const liftDuration = params.liftDuration;
  const totalDuration = emergenceDuration + liftDuration;
  
  // === TEXT LAYER EFFECTS ===
  
  // Stage 1: Emergence (opacity fade-in)
  const textEmergenceEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: emergenceDuration,
    mode: 'provider',
    targetIds: [textLayerId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };
  
  // Stage 2: Lift effect (translateZ, scale, brightness)
  const textLiftEffect: GenericEffectData = {
    type: 'ease-out',
    start: liftStart,
    duration: liftDuration,
    mode: 'provider',
    targetIds: [textLayerId],
    ranges: [
      // Z-axis lift
      { key: 'translateZ', val: 0, prog: 0 },
      { key: 'translateZ', val: params.textLiftDistance, prog: 1 },
      // Scale up
      { key: 'scale', val: params.initialScale, prog: 0 },
      { key: 'scale', val: params.finalScale, prog: 1 },
      // Brightness increase
      { key: 'brightness', val: params.initialBrightness, prog: 0 },
      { key: 'brightness', val: params.finalBrightness, prog: 1 },
    ],
  };
  
  // === SHADOW LAYER EFFECTS ===
  
  // Stage 1: Emergence (opacity fade-in)
  const shadowEmergenceEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: emergenceDuration,
    mode: 'provider',
    targetIds: [shadowLayerId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: params.initialShadowOpacity, prog: 1 },
    ],
  };
  
  // Stage 2: Shadow separation with parallax (slower motion, blur, fade)
  const shadowSeparationEffect: GenericEffectData = {
    type: 'ease-out',
    start: liftStart,
    duration: liftDuration,
    mode: 'provider',
    targetIds: [shadowLayerId],
    ranges: [
      // Y-axis separation (slower parallax)
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: params.shadowSeparation, prog: 1 },
      // Blur increase
      { key: 'blur', val: `${params.initialShadowBlur}px`, prog: 0 },
      { key: 'blur', val: `${params.finalShadowBlur}px`, prog: 1 },
      // Opacity decrease
      { key: 'opacity', val: params.initialShadowOpacity, prog: 0 },
      { key: 'opacity', val: params.finalShadowOpacity, prog: 1 },
    ],
  };
  
  // === TEXT ATOM (MAIN LAYER) ===
  const textAtom: RenderableComponentData = {
    id: textLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: params.fontWeight,
        color: params.textColor,
        textAlign: 'center',
        willChange: 'transform, filter',
        transformStyle: 'preserve-3d',
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'text-emergence',
        componentId: 'generic',
        data: textEmergenceEffect,
      },
      {
        id: 'text-lift',
        componentId: 'generic',
        data: textLiftEffect,
      },
    ],
  };
  
  // === SHADOW ATOM (SHADOW LAYER) ===
  const shadowAtom: RenderableComponentData = {
    id: shadowLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: params.fontWeight,
        color: params.shadowColor,
        textAlign: 'center',
        willChange: 'transform, filter, opacity',
        transformStyle: 'preserve-3d',
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'shadow-emergence',
        componentId: 'generic',
        data: shadowEmergenceEffect,
      },
      {
        id: 'shadow-separation',
        componentId: 'generic',
        data: shadowSeparationEffect,
      },
    ],
  };
  
  // === CONTAINER LAYOUT ===
  const container: RenderableComponentData = {
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
        duration: totalDuration,
      },
    },
    childrenData: [
      shadowAtom,  // Shadow layer first (behind)
      textAtom,    // Text layer second (in front)
    ] as RenderableComponentData[],
  };
  
  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'shadow-lift-typokinetic',
  title: 'Shadow Lift Typokinetic',
  description: 'An elegant typokinetic preset where text emerges from its own shadow with a sophisticated 3D lift effect. The text starts flat with its shadow directly beneath it, then gradually rises with a parallax motion where the shadow separates, blurs, and fades. Perfect for premium brand titles, documentary credits, or any text requiring subtle sophistication. Features depth-focused animation with scale, blur, and opacity transitions creating a realistic lifting illusion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', '3d', 'shadow', 'depth', 'parallax', 'elegant', 'premium', 'sophisticated', 'lift', 'emergence'],
  dependencies: {},
  defaultInputParams: {
    text: 'PREMIUM TITLE',
    duration: 1.2,
    fontSize: 72,
    fontWeight: '700',
    textColor: '#ffffff',
    shadowColor: 'rgba(0, 0, 0, 0.8)',
    fontFamily: 'Inter',
    emergenceDuration: 0.4,
    liftDuration: 0.8,
    textLiftDistance: 40,
    shadowSeparation: 8,
    initialScale: 0.98,
    finalScale: 1.0,
    initialShadowBlur: 0,
    finalShadowBlur: 12,
    initialShadowOpacity: 0.8,
    finalShadowOpacity: 0.3,
    initialBrightness: 0.95,
    finalBrightness: 1.0,
  },
};

// Export preset
export const shadowLiftTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
