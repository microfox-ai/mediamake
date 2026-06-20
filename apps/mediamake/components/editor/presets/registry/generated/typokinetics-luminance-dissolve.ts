/**
 * Typokinetics Luminance Dissolve Preset
 * 
 * This preset creates an analog video editing inspired text effect where text materializes
 * from overexposure (pure white with glow), stabilizes into readable form, then slowly
 * burns out through increasing brightness until it disappears into white. This mimics
 * the classic video effect of dissolving through brightness rather than opacity, creating
 * a CRT monitor phosphor persistence aesthetic.
 * 
 * Features:
 * - Three-phase animation: materialize (0-20%), stable with pulse (20-70%), burn-out (70-100%)
 * - Luminance keying crossfade effect using brightness and glow
 * - Caption metadata support for dynamic intensity modulation
 * - Keywords get stronger glow, high-impact words pulse more intensely
 * - GPU-accelerated filters for optimal performance
 * - Mix-blend-mode: 'screen' for authentic analog video compositing
 * 
 * Technical approach:
 * - Uses brightness filter (2.0 → 1.0 → 3.0) for overexposure/burn-out
 * - textShadow for phosphor glow effect with dynamic intensity
 * - Pulsing during stable phase via multiple keyframes
 * - All animations via generic effects with mode: 'provider'
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Params Schema ---
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time within caption timeline'),
        absoluteStart: z.number().describe('Absolute start time in scene timeline'),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z
              .number()
              .min(0.1)
              .max(3.0)
              .optional()
              .describe('Effect intensity multiplier (0.1-3.0)'),
            isKeyword: z
              .boolean()
              .optional()
              .describe('Whether this caption contains a keyword'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with timing and metadata'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700")'),
  
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (used as base, will be overridden by effects)'),
  
  baseImpact: z
    .number()
    .min(0.1)
    .max(3.0)
    .default(1.0)
    .optional()
    .describe('Base impact multiplier for all effects (0.1-3.0)'),
  
  glowIntensity: z
    .number()
    .min(0.5)
    .max(3.0)
    .default(1.0)
    .optional()
    .describe('Glow intensity multiplier (0.5-3.0)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { captions, font, fontSize, textColor, baseImpact, glowIntensity } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
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
    
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter:700');

  // Create caption components
  const captionComponents: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    const captionId = `typokinetics-caption-${captionIndex}`;
    const textId = `typokinetics-text-${captionIndex}`;
    
    // Calculate impact for this caption
    const captionImpact = caption.metadata?.impact ?? baseImpact ?? 1.0;
    const isKeyword = caption.metadata?.isKeyword ?? false;
    
    // Impact multipliers
    const glowMultiplier = glowIntensity ?? 1.0;
    const keywordBoost = isKeyword ? 1.3 : 1.0;
    const finalImpact = captionImpact * glowMultiplier * keywordBoost;
    
    // Calculate glow intensity based on impact
    const baseGlowSpread = 20;
    const peakGlowSpread = 60;
    const materializeGlowSpread = baseGlowSpread * finalImpact;
    const stableGlowSpread = baseGlowSpread * 0.5 * finalImpact;
    const pulseGlowSpread = baseGlowSpread * 0.7 * finalImpact;
    const burnoutGlowSpread = peakGlowSpread * finalImpact;
    
    // Create luminance effect with three phases
    const luminanceEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: caption.duration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        // PHASE 1: Materialize (0-20%) - From overexposure to readable
        // Brightness: 2.0 (overexposed) → 1.0 (normal)
        { key: 'filter', val: `brightness(2.0)`, prog: 0 },
        { key: 'filter', val: `brightness(1.0)`, prog: 0.2 },
        
        // Opacity: 0 (invisible) → 1 (visible)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
        
        // Glow: Strong white glow fading in
        { key: 'textShadow', val: `0 0 ${materializeGlowSpread}px rgba(255,255,255,1)`, prog: 0 },
        { key: 'textShadow', val: `0 0 ${stableGlowSpread}px rgba(255,255,255,0.8)`, prog: 0.2 },
        
        // PHASE 2: Stable with pulse (20-70%) - Readable with subtle pulsing
        // Brightness stays at 1.0
        { key: 'filter', val: `brightness(1.0)`, prog: 0.35 },
        { key: 'filter', val: `brightness(1.05)`, prog: 0.45 },
        { key: 'filter', val: `brightness(1.0)`, prog: 0.55 },
        { key: 'filter', val: `brightness(1.05)`, prog: 0.65 },
        { key: 'filter', val: `brightness(1.0)`, prog: 0.7 },
        
        // Opacity stays at 1
        { key: 'opacity', val: 1, prog: 0.7 },
        
        // Glow pulses subtly
        { key: 'textShadow', val: `0 0 ${stableGlowSpread}px rgba(255,255,255,0.8)`, prog: 0.35 },
        { key: 'textShadow', val: `0 0 ${pulseGlowSpread}px rgba(255,255,255,0.9)`, prog: 0.45 },
        { key: 'textShadow', val: `0 0 ${stableGlowSpread}px rgba(255,255,255,0.8)`, prog: 0.55 },
        { key: 'textShadow', val: `0 0 ${pulseGlowSpread}px rgba(255,255,255,0.9)`, prog: 0.65 },
        { key: 'textShadow', val: `0 0 ${stableGlowSpread}px rgba(255,255,255,0.8)`, prog: 0.7 },
        
        // PHASE 3: Burn-out (70-100%) - Increasing brightness to white
        // Brightness: 1.0 → 3.0 (overexposed white)
        { key: 'filter', val: `brightness(1.0)`, prog: 0.7 },
        { key: 'filter', val: `brightness(3.0)`, prog: 1.0 },
        
        // Opacity: 1 → 0 (fade to white)
        { key: 'opacity', val: 1, prog: 0.7 },
        { key: 'opacity', val: 0, prog: 1.0 },
        
        // Glow: Intense white glow expanding
        { key: 'textShadow', val: `0 0 ${stableGlowSpread}px rgba(255,255,255,0.8)`, prog: 0.7 },
        { key: 'textShadow', val: `0 0 ${burnoutGlowSpread}px rgba(255,255,255,0)`, prog: 1.0 },
      ],
    };

    const effect = {
      id: `luminance-effect-${captionIndex}`,
      componentId: 'generic',
      data: luminanceEffect,
    };

    // Text component
    const textComponent: RenderableComponentData = {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: caption.text,
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          fontWeight: fontStyle.fontWeight || 700,
          ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
    };

    // Caption container with effect
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      effects: [effect],
      childrenData: [textComponent],
    };

    return captionContainer;
  });

  // Root container with mix-blend-mode
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10, // Will be auto-calculated by system
      },
    },
    childrenData: captionComponents,
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
  id: 'typokinetics-luminance-dissolve',
  title: 'Typokinetics Luminance Dissolve',
  description:
    'Analog video editing inspired text preset where text materializes from overexposure (pure white with glow), stabilizes with pulsing phosphor glow, then burns out through increasing brightness. Mimics classic CRT monitor phosphor persistence and luminance keying crossfade effects. Typography responds to caption metadata - keywords get stronger glow, high-impact words pulse more intensely. Three-phase animation: materialize (0-20%), stable with pulse (20-70%), burn-out (70-100%). All animations via effects system with mode: provider and targetIds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'luminance',
    'dissolve',
    'analog',
    'video',
    'crt',
    'phosphor',
    'glow',
    'brightness',
    'burn-out',
    'overexposure',
    'kinetic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Luminance Dissolve',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [],
        metadata: {
          impact: 1.5,
          isKeyword: true,
        },
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#FFFFFF',
    baseImpact: 1.0,
    glowIntensity: 1.0,
  },
};

// --- Export ---
export const typokineticsLuminanceDissolvePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
